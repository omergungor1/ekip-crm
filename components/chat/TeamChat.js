"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CheckCheck, MessageCircle, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";
import UserAvatar from "@/components/ui/UserAvatar";
import { useProfile } from "@/components/layout/AppShell";
import { errorMessage, formatDateTime } from "@/lib/format";
import { startRequest } from "@/lib/load";
import { createClient } from "@/lib/supabase/client";

const MESSAGE_SELECT = `
  id, body, image_path, created_at, sender_id,
  sender:profiles!chat_messages_sender_id_fkey(id, full_name, username, avatar_url),
  reads:chat_reads(
    profile_id, read_at,
    reader:profiles!chat_reads_profile_id_fkey(id, full_name, username, avatar_url)
  )
`;

function displayName(person) {
  return person?.full_name || person?.username || "Kullanıcı";
}

function chatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  return formatDateTime(value);
}

function imageUrl(path) {
  if (!path) return "";
  return createClient().storage.from("chat").getPublicUrl(path).data.publicUrl;
}

function extensionFor(type) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "png";
}

const PAGE_SIZE = 20;

function byTime(a, b) {
  const time = new Date(a.created_at) - new Date(b.created_at);
  if (time) return time;
  return String(a.id).localeCompare(String(b.id));
}

function pageFrom(rows) {
  const list = rows || [];
  const hasMore = list.length > PAGE_SIZE;
  const page = (hasMore ? list.slice(0, PAGE_SIZE) : list).slice().reverse();
  return { page, hasMore };
}

function mergeMessages(current, incoming) {
  const map = new Map();
  for (const item of current) map.set(item.id, item);
  for (const item of incoming) map.set(item.id, item);
  return [...map.values()].sort(byTime);
}

export default function TeamChat() {
  const profile = useProfile();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [readersFor, setReadersFor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const listRef = useRef(null);
  const fileRef = useRef(null);
  const openRef = useRef(false);
  const peopleRef = useRef([]);
  const messagesRef = useRef([]);
  const hasMoreRef = useRef(false);
  const loadingOlderRef = useRef(false);
  const stickToBottomRef = useRef(true);
  const scrollAnchorRef = useRef(null);
  const listReadyRef = useRef(false);
  const topRef = useRef(null);
  openRef.current = open;
  messagesRef.current = messages;
  hasMoreRef.current = hasMore;

  useEffect(() => {
    if (!profile?.id) return undefined;
    const supabase = createClient();
    return startRequest(async (isActive) => {
      const [{ data: rows, error }, { data: count, error: countError }, { data: people }] = await Promise.all([
        supabase.from("chat_messages").select(MESSAGE_SELECT).order("created_at", { ascending: false }).limit(PAGE_SIZE + 1),
        supabase.rpc("unread_chat_count"),
        supabase.from("profiles").select("id, full_name, username, avatar_url").eq("is_active", true),
      ]);
      if (!isActive()) return;
      if (error || countError) {
        toast.error(errorMessage(error || countError, "Sohbet yüklenemedi."));
        return;
      }
      peopleRef.current = people || [];
      const firstPage = pageFrom(rows);
      setMessages(firstPage.page);
      setHasMore(firstPage.hasMore);
      setUnread(Number(count) || 0);
    });
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return undefined;
    const supabase = createClient();

    async function refresh() {
      const [{ data: rows }, { data: count }] = await Promise.all([
        supabase.from("chat_messages").select(MESSAGE_SELECT).order("created_at", { ascending: false }).limit(PAGE_SIZE + 1),
        supabase.rpc("unread_chat_count"),
      ]);
      if (rows) {
        const latest = pageFrom(rows);
        setMessages((current) => mergeMessages(current, latest.page));
      }
      if (openRef.current) {
        await supabase.rpc("mark_chat_read");
        setUnread(0);
        return;
      }
      setUnread(Number(count) || 0);
    }

    const channel = supabase
      .channel("ekip-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, async (payload) => {
        const id = payload?.new?.id;
        if (!id) {
          await refresh();
          return;
        }
        const { data } = await supabase.from("chat_messages").select(MESSAGE_SELECT).eq("id", id).maybeSingle();
        if (!data) return;
        setMessages((current) => (current.some((item) => item.id === data.id) ? current : [...current, data]));
        if (openRef.current) {
          await supabase.rpc("mark_chat_read");
          setUnread(0);
          return;
        }
        if (data.sender_id !== profile.id) setUnread((count) => count + 1);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_reads" }, async (payload) => {
        const row = payload?.new;
        if (!row?.message_id || !row?.profile_id) {
          await refresh();
          return;
        }
        setMessages((current) => current.map((item) => {
          if (item.id !== row.message_id) return item;
          if ((item.reads || []).some((read) => read.profile_id === row.profile_id)) return item;
          const reader = peopleRef.current.find((person) => person.id === row.profile_id) || null;
          return {
            ...item,
            reads: [...(item.reads || []), { profile_id: row.profile_id, read_at: row.read_at, reader }],
          };
        }));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  useLayoutEffect(() => {
    if (!open) {
      listReadyRef.current = false;
      return;
    }
    const node = listRef.current;
    if (!node) return;
    const anchor = scrollAnchorRef.current;
    if (anchor) {
      scrollAnchorRef.current = null;
      node.scrollTop = anchor.top + (node.scrollHeight - anchor.height);
    } else if (stickToBottomRef.current) {
      node.scrollTop = node.scrollHeight;
    }
    listReadyRef.current = true;
  }, [open, messages]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current || !hasMoreRef.current) return;
    const oldest = messagesRef.current[0];
    const node = listRef.current;
    if (!oldest || !node || node.scrollHeight <= node.clientHeight + 8) return;
    loadingOlderRef.current = true;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("chat_messages")
      .select(MESSAGE_SELECT)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE + 1);
    loadingOlderRef.current = false;
    if (error) {
      toast.error(errorMessage(error, "Eski mesajlar yüklenemedi."));
      return;
    }
    const olderPage = pageFrom(data);
    const known = new Set(messagesRef.current.map((item) => item.id));
    const older = olderPage.page.filter((item) => !known.has(item.id));
    if (!older.length) {
      if (!olderPage.hasMore) setHasMore(false);
      return;
    }
    setHasMore(olderPage.hasMore);
    scrollAnchorRef.current = { height: node.scrollHeight, top: node.scrollTop };
    setMessages((current) => {
      const ids = new Set(current.map((item) => item.id));
      const next = older.filter((item) => !ids.has(item.id));
      return next.length ? [...next, ...current] : current;
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const root = listRef.current;
    if (!root) return undefined;
    function onNativeScroll() {
      if (!listReadyRef.current) return;
      const distance = root.scrollHeight - root.scrollTop - root.clientHeight;
      stickToBottomRef.current = distance < 64;
      if (root.scrollTop < 80) loadOlder();
    }
    root.addEventListener("scroll", onNativeScroll, { passive: true });
    const target = topRef.current;
    let observer;
    if (hasMore && target) {
      observer = new IntersectionObserver((entries) => {
        if (!listReadyRef.current) return;
        if (entries.some((entry) => entry.isIntersecting)) loadOlder();
      }, { root, rootMargin: "80px 0px 0px 0px", threshold: 0 });
      observer.observe(target);
    }
    return () => {
      root.removeEventListener("scroll", onNativeScroll);
      observer?.disconnect();
    };
  }, [open, hasMore, messages.length, loadOlder]);

  function onListScroll() {
    const node = listRef.current;
    if (!node || !listReadyRef.current) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 64;
    if (node.scrollTop < 64) loadOlder();
  }

  function keepBottom() {
    if (!stickToBottomRef.current) return;
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }

  async function toggle() {
    const next = !open;
    if (next) stickToBottomRef.current = true;
    setOpen(next);
    setReadersFor(null);
    if (!next) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("mark_chat_read");
    if (error) toast.error(errorMessage(error, "Okundu bilgisi kaydedilemedi."));
    else setUnread(0);
  }

  function pickFile(event) {
    const next = event.target.files?.[0];
    event.target.value = "";
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      toast.error("Sadece görsel eklenebilir.");
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      toast.error("Görsel en fazla 5 MB olabilir.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
  }

  async function send() {
    const text = draft.trim();
    if ((!text && !file) || busy) return;
    if (text.length > 2000) {
      toast.error("Mesaj en fazla 2000 karakter olabilir.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    let imagePath = "";
    try {
      if (file) {
        imagePath = `${profile.id}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
        const { error: uploadError } = await supabase.storage.from("chat").upload(imagePath, file, {
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw uploadError;
      }
      const { data, error } = await supabase
        .from("chat_messages")
        .insert({ sender_id: profile.id, body: text || null, image_path: imagePath || null })
        .select(MESSAGE_SELECT)
        .single();
      if (error) throw error;
      stickToBottomRef.current = true;
      setMessages((current) => (current.some((item) => item.id === data.id) ? current : [...current, data]));
      setDraft("");
      clearFile();
    } catch (error) {
      if (imagePath) await supabase.storage.from("chat").remove([imagePath]);
      toast.error(errorMessage(error, "Mesaj gönderilemedi."));
    } finally {
      setBusy(false);
    }
  }

  const readerMessage = messages.find((item) => item.id === readersFor);

  return (
    <>
      {open ? (
        <section className="fixed bottom-20 right-4 z-[45] flex h-[min(32rem,calc(100dvh-8rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_16px_50px_rgba(28,29,33,0.18)] sm:right-5">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
            <div>
              <p className="text-sm font-semibold">Ekip sohbeti</p>
              <p className="text-xs text-muted">Herkes buradan yazışır</p>
            </div>
            <button type="button" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-zinc-100" aria-label="Sohbeti kapat" onClick={toggle}>
              <X className="h-5 w-5" />
            </button>
          </header>
          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3" onScroll={onListScroll}>
            {hasMore ? <div ref={topRef} className="h-px" /> : null}
            {messages.length === 0 ? (
              <p className="px-2 pt-8 text-center text-sm text-muted">Henüz mesaj yok. Ekibe bir şey yaz.</p>
            ) : null}
            {messages.map((item) => {
              const mine = item.sender_id === profile.id;
              const reads = item.reads || [];
              return (
                <div key={item.id} className={`flex items-end gap-2 ${mine ? "justify-end" : ""}`}>
                  {mine ? null : <UserAvatar name={displayName(item.sender)} url={item.sender?.avatar_url} size="sm" />}
                  <div className={`max-w-[80%] ${mine ? "items-end" : ""} flex flex-col`}>
                    {mine ? null : <p className="mb-1 px-1 text-xs font-medium text-muted">{displayName(item.sender)}</p>}
                    <div className={`rounded-2xl px-3 py-2 ${mine ? "rounded-br-md bg-accent text-white" : "rounded-bl-md bg-zinc-100 text-ink"}`}>
                      {item.image_path ? (
                        <img src={imageUrl(item.image_path)} alt="" className="mb-1 max-h-52 w-full rounded-xl object-cover" onLoad={keepBottom} />
                      ) : null}
                      {item.body ? <p className="whitespace-pre-wrap text-sm leading-5">{item.body}</p> : null}
                      <p className={`mt-1 text-[11px] ${mine ? "text-white/75" : "text-muted"}`}>{chatTime(item.created_at)}</p>
                    </div>
                    {mine ? (
                      <button
                        type="button"
                        className="mt-1 inline-flex items-center gap-1 self-end px-1 text-[11px] font-medium text-accent"
                        onClick={() => setReadersFor(item.id)}
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        {reads.length ? `Okundu · ${reads.length}` : "İletildi"}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {preview ? (
            <div className="relative mx-3 mb-2 w-fit">
              <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover" />
              <button type="button" aria-label="Görseli kaldır" className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-white" onClick={clearFile}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : null}
          <form
            className="flex items-end gap-2 border-t border-line p-3"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line hover:bg-zinc-50" aria-label="Görsel ekle" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Plus className="h-5 w-5" />
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={pickFile} />
            <textarea
              value={draft}
              rows={1}
              placeholder="Mesaj yaz"
              className="max-h-24 min-h-11 flex-1 resize-none rounded-xl border border-line px-3 py-2.5 text-sm outline-none ring-accent/15 focus:border-accent focus:ring-4"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
            />
            <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-white disabled:opacity-60" aria-label="Gönder" disabled={busy || (!draft.trim() && !file)}>
              <Send className="h-4 w-4" />
            </button>
          </form>
          {readerMessage ? (
            <div className="absolute inset-0 flex flex-col bg-white">
              <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3">
                <button type="button" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-zinc-100" aria-label="Mesaja dön" onClick={() => setReadersFor(null)}>
                  <X className="h-5 w-5" />
                </button>
                <p className="text-sm font-semibold">Okundu</p>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {(readerMessage.reads || []).length === 0 ? (
                  <p className="pt-8 text-center text-sm text-muted">Henüz kimse okumadı.</p>
                ) : (
                  <ul className="space-y-3">
                    {(readerMessage.reads || [])
                      .slice()
                      .sort((a, b) => new Date(b.read_at) - new Date(a.read_at))
                      .map((read) => (
                        <li key={read.profile_id} className="flex items-center gap-3">
                          <UserAvatar name={displayName(read.reader)} url={read.reader?.avatar_url} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{displayName(read.reader)}</p>
                            <p className="text-xs text-muted">{formatDateTime(read.read_at)}</p>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
      <button
        type="button"
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[45] grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-[0_10px_30px_rgba(59,91,253,0.35)] sm:right-5"
        aria-label="Sohbet"
        aria-expanded={open}
        onClick={toggle}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 ? <span className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-white bg-rose-500" /> : null}
      </button>
    </>
  );
}
