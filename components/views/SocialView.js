"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Bookmark, Heart, MessageCircle, MoreHorizontal, Send } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import { useProfile } from "@/components/layout/AppShell";
import { useSocialProject } from "@/components/layout/SocialProjectContext";
import ModeSelector, { ChipRow } from "@/components/social/ModeSelector";
import PromptComposer from "@/components/social/PromptComposer";
import CarouselPlan from "@/components/social/CarouselPlan";
import GenerationResult from "@/components/social/GenerationResult";
import { canManage } from "@/lib/constants";
import { listSocialContents } from "@/lib/data";
import { errorMessage, formatDateTime } from "@/lib/format";
import { startRequest } from "@/lib/load";
import { createClient } from "@/lib/supabase/client";
import { AD_FORMATS, CONTENT_MODES, SLIDE_COUNTS, resolveSize } from "@/lib/social-media/contentModes";
import { createGenerationQueue } from "@/lib/social-media/generationQueue";

function publicUrl(path) {
  if (!path) return "";
  return createClient().storage.from("social").getPublicUrl(path).data.publicUrl;
}

function patchSlide(plan, id, patch) {
  if (!plan) return plan;
  return { ...plan, slides: plan.slides.map((slide) => (slide.id === id ? { ...slide, ...patch } : slide)) };
}

function ProjectMark({ project }) {
  const name = project?.name || "Proje";
  if (project?.logo_url) {
    return <img src={project.logo_url} alt="" className="h-9 w-9 rounded-full object-cover" />;
  }
  return (
    <span
      className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold text-white"
      style={{ background: project?.color || "#1c1d21" }}
    >
      {name.slice(0, 1).toLocaleUpperCase("tr-TR")}
    </span>
  );
}

function InstagramPost({ item, project }) {
  const name = project?.name || "Proje";
  const caption = item.kind === "image" ? item.body || item.prompt : "";
  const note = item.kind === "image" ? (item.body && item.prompt && item.body !== item.prompt ? item.prompt : "") : item.prompt;

  return (
    <article className="overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_16px_40px_rgba(28,29,33,0.08)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <ProjectMark project={project} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-semibold">{name}</p>
            <BadgeCheck className="h-4 w-4 shrink-0 fill-[#0095f6] text-white" aria-hidden="true" />
          </div>
          <p className="text-xs text-muted">{formatDateTime(item.created_at)}</p>
        </div>
        <MoreHorizontal className="h-5 w-5 shrink-0 text-ink" aria-hidden="true" />
      </div>
      {item.kind === "image" ? (
        <img src={publicUrl(item.storage_path)} alt={item.prompt || name} className="aspect-square w-full bg-zinc-50 object-contain" />
      ) : (
        <div className="flex min-h-56 items-center bg-zinc-50 px-5 py-8">
          <p className="whitespace-pre-wrap text-[15px] leading-6">{item.body}</p>
        </div>
      )}
      <div className="flex items-center gap-3 px-4 py-3 text-ink" aria-hidden="true">
        <Heart className="h-6 w-6" />
        <MessageCircle className="h-6 w-6" />
        <Send className="h-6 w-6" />
        <span className="flex flex-1 items-center justify-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#0095f6]" />
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
        </span>
        <Bookmark className="h-6 w-6" />
      </div>
      {caption ? (
        <p className="px-4 pb-4 text-sm leading-5">
          <span className="font-semibold">{name}</span>{" "}
          <span className="whitespace-pre-wrap">{caption}</span>
        </p>
      ) : null}
      {note ? <p className="px-4 pb-4 text-xs leading-5 text-muted">{note}</p> : null}
    </article>
  );
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Görsel okunamadı."));
    reader.readAsDataURL(file);
  });
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "İstek başarısız.");
  return data;
}

export default function SocialView() {
  const profile = useProfile();
  const { projectId, projects } = useSocialProject();
  const project = projects.find((item) => item.id === projectId);
  const [modeId, setModeId] = useState("free");
  const [prompt, setPrompt] = useState("");
  const [references, setReferences] = useState([]);
  const [slideCount, setSlideCount] = useState("auto");
  const [adFormat, setAdFormat] = useState("post");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [resultItem, setResultItem] = useState(null);
  const [resultSize, setResultSize] = useState("1024x1024");
  const [carousel, setCarousel] = useState(null);
  const writable = canManage(profile);
  const mode = CONTENT_MODES[modeId] || CONTENT_MODES.free;
  const sessionRef = useRef(0);
  const lastPromptRef = useRef("");
  const carouselRef = useRef(null);
  const referencesRef = useRef([]);
  const queueRef = useRef(null);
  const queuedRef = useRef(new Set());
  if (!queueRef.current) queueRef.current = createGenerationQueue();
  carouselRef.current = carousel;
  referencesRef.current = references;

  const carouselRunning = (carousel?.slides || []).some((slide) => slide.status === "generating" || slide.status === "waiting");
  const busy = phase !== "idle";

  useEffect(() => {
    if (!projectId) return undefined;
    return startRequest(async (isActive) => {
      sessionRef.current += 1;
      queuedRef.current.clear();
      setLoading(true);
      setItems([]);
      setCarousel(null);
      setResultItem(null);
      setPrompt("");
      setReferences([]);
      setPhase("idle");
      try {
        const rows = await listSocialContents(projectId);
        if (isActive()) setItems(rows);
      } catch (error) {
        if (isActive()) toast.error(errorMessage(error, "İçerikler yüklenemedi."));
      } finally {
        if (isActive()) setLoading(false);
      }
    });
  }, [projectId]);

  async function addReferences(event) {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    const next = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error("Sadece görsel eklenebilir.");
        continue;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Her görsel en fazla 2 MB olabilir.");
        continue;
      }
      try {
        next.push({ id: crypto.randomUUID(), url: await readFile(file) });
      } catch (error) {
        toast.error(error.message || "Görsel okunamadı.");
      }
    }
    setReferences((current) => [...current, ...next].slice(0, 8));
  }

  async function refreshItems(targetProject) {
    const rows = await listSocialContents(targetProject);
    if (targetProject === projectId) setItems(rows);
  }

  function stillHere(session) {
    return session === sessionRef.current;
  }

  async function sendFree(value, session, targetProject, refs) {
    const data = await postJson("/api/sosyal-medya", {
      prompt: value,
      projectId: targetProject,
      referenceImages: refs,
    });
    if (!stillHere(session)) return;
    setResultItem(data.item);
    setResultSize("1024x1024");
    setPrompt("");
    setReferences([]);
    await refreshItems(targetProject);
    toast.success(data.item?.kind === "image" ? "Görsel kaydedildi." : "Metin kaydedildi.");
  }

  async function sendPlanned(value, session, targetProject, refs) {
    const planned = await postJson("/api/sosyal-medya/plan", {
      mode: mode.id,
      prompt: value,
      projectId: targetProject,
      adFormat,
      hasReferences: refs.length > 0,
    });
    if (!stillHere(session)) return;
    setPhase("generating");
    const generated = await postJson("/api/sosyal-medya/generate", {
      mode: mode.id,
      projectId: targetProject,
      adFormat,
      imagePrompt: planned.plan.imagePrompt,
      size: planned.size,
      referenceImages: refs,
      recordPrompt: value,
      recordBody: planned.plan.caption || value,
    });
    if (!stillHere(session)) return;
    setResultItem(generated.item);
    setResultSize(generated.size || resolveSize(mode.id, adFormat));
    await refreshItems(targetProject);
    toast.success("Görsel kaydedildi.");
  }

  async function sendCarousel(value, session, targetProject, refs) {
    const planned = await postJson("/api/sosyal-medya/plan", {
      mode: "carousel",
      prompt: value,
      projectId: targetProject,
      slideCount: slideCount === "auto" ? "auto" : Number(slideCount),
      hasReferences: refs.length > 0,
    });
    if (!stillHere(session)) return;
    setCarousel(planned.plan);
    setResultItem(null);
    toast.success("Carousel planı hazır.");
  }

  async function submit(overridePrompt) {
    const value = String(overridePrompt ?? prompt).trim();
    if (!projectId) {
      toast.error("Önce bir proje seçin.");
      return;
    }
    if (!value) {
      toast.error("Önce bir istek yazın.");
      return;
    }
    const session = sessionRef.current;
    const targetProject = projectId;
    const refs = references.map((item) => item.url);
    lastPromptRef.current = value;
    setPhase(mode.imageGeneration === "direct" ? "generating" : "planning");
    try {
      if (mode.imageGeneration === "direct") await sendFree(value, session, targetProject, refs);
      else if (mode.imageGeneration === "slides") await sendCarousel(value, session, targetProject, refs);
      else await sendPlanned(value, session, targetProject, refs);
    } catch (error) {
      if (stillHere(session)) toast.error(error.message || "Üretim başarısız.");
    } finally {
      if (stillHere(session)) setPhase("idle");
    }
  }

  function generateSlides(ids) {
    const fresh = ids.filter((id) => !queuedRef.current.has(id));
    if (!fresh.length) return;
    fresh.forEach((id) => queuedRef.current.add(id));
    const session = sessionRef.current;
    const targetProject = projectId;
    setCarousel((current) => {
      if (!current) return current;
      return {
        ...current,
        slides: current.slides.map((slide) => (fresh.includes(slide.id) ? { ...slide, status: "waiting", error: "" } : slide)),
      };
    });
    fresh.forEach((id) => {
      queueRef.current.enqueue(async () => {
        try {
          if (session !== sessionRef.current) return;
          setCarousel((current) => patchSlide(current, id, { status: "generating" }));
          const plan = carouselRef.current;
          const slide = plan?.slides.find((item) => item.id === id);
          if (!plan || !slide) return;
          const generated = await postJson("/api/sosyal-medya/generate", {
            mode: "carousel",
            projectId: targetProject,
            plan: { title: plan.title, concept: plan.concept, designSystem: plan.designSystem },
            slide: {
              index: slide.index,
              type: slide.type,
              headline: slide.headline,
              body: slide.body,
              visualIdea: slide.visualIdea,
            },
            slideCount: plan.slides.length,
            referenceImages: referencesRef.current.map((item) => item.url),
            recordPrompt: slide.headline,
            recordBody: slide.body || slide.headline,
          });
          if (session !== sessionRef.current) return;
          setCarousel((current) => patchSlide(current, id, {
            status: "completed",
            imageUrl: publicUrl(generated.item.storage_path),
            contentId: generated.item.id,
            error: "",
          }));
          const rows = await listSocialContents(targetProject);
          if (session === sessionRef.current) setItems(rows);
        } catch (error) {
          if (session !== sessionRef.current) return;
          setCarousel((current) => patchSlide(current, id, { status: "error", error: error.message || "Görsel üretilemedi." }));
        } finally {
          queuedRef.current.delete(id);
        }
      });
    });
  }

  function generateAll() {
    const ids = (carousel?.slides || [])
      .filter((slide) => slide.status === "idle" || slide.status === "error")
      .map((slide) => slide.id);
    if (ids.length) generateSlides(ids);
  }

  const hiddenIds = new Set();
  if (resultItem?.id) hiddenIds.add(resultItem.id);
  for (const slide of carousel?.slides || []) {
    if (slide.contentId) hiddenIds.add(slide.contentId);
  }
  const archive = items.filter((item) => !hiddenIds.has(item.id));
  const composerMode = phase === "planning"
    ? { ...mode, busyLabel: "Planlanıyor..." }
    : phase === "generating"
      ? { ...mode, busyLabel: mode.imageGeneration === "direct" ? "Gönderiliyor..." : "Görsel oluşturuluyor..." }
      : mode;

  return (
    <div>
      <PageHeader title="Sosyal Medya" description="Modu seç, ne istediğini yaz. Kayıtlar seçili projede kalır." />
      {!projectId ? (
        <EmptyState title="Proje seçin." description="Üstteki listeden bir proje seçince o işletmenin içerikleri açılır." />
      ) : (
        <>
          {writable ? (
            <>
              <ModeSelector value={mode.id} onChange={setModeId} disabled={busy || carouselRunning} />
              <PromptComposer
                mode={composerMode}
                prompt={prompt}
                onPrompt={setPrompt}
                references={references}
                onAddFiles={addReferences}
                onRemove={(id) => setReferences((current) => current.filter((item) => item.id !== id))}
                busy={busy}
                onSubmit={() => submit()}
                extra={mode.id === "carousel" ? (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium">Slayt sayısı</p>
                    <ChipRow options={SLIDE_COUNTS} value={slideCount} onChange={setSlideCount} disabled={busy} />
                  </div>
                ) : mode.id === "ad_creative" ? (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium">Format</p>
                    <ChipRow options={AD_FORMATS} value={adFormat} onChange={setAdFormat} disabled={busy} />
                  </div>
                ) : null}
              />
            </>
          ) : null}
          {mode.id === "carousel" && carousel ? (
            <CarouselPlan
              plan={carousel}
              busy={busy}
              onEdit={(id, fields) => setCarousel((current) => patchSlide(current, id, fields))}
              onGenerate={(id) => generateSlides([id])}
              onGenerateAll={generateAll}
            />
          ) : null}
          {resultItem && mode.id !== "carousel" ? (
            <GenerationResult
              item={resultItem}
              imageSrc={publicUrl(resultItem.storage_path)}
              size={resultSize}
              busy={busy}
              onRetry={() => submit(lastPromptRef.current)}
              onEdit={() => document.getElementById("social-prompt")?.focus()}
            />
          ) : null}
          {loading ? <div className="mt-4"><LoadingSkeleton /></div> : null}
          {!loading && archive.length === 0 && !resultItem && !(mode.id === "carousel" && carousel) ? (
            <div className="mt-4">
              <EmptyState title="Bu projede henüz içerik yok." description="İstek gönderince metin veya görsel burada kalır." />
            </div>
          ) : null}
          {archive.length > 0 ? (
            <>
              <h2 className="mb-3 mt-6 text-sm font-medium text-muted">Kayıtlı içerikler</h2>
              <div className="grid items-start gap-4 md:grid-cols-2">
                {archive.map((item) => (
                  <InstagramPost key={item.id} item={item} project={project} />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
