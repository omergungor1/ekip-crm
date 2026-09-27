"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Button, { Field, inputClass, textareaClass } from "@/components/ui/Button";
import UserMultiSelect from "@/components/ui/UserMultiSelect";
import TagSelect from "@/components/ui/TagSelect";
import PriorityBadge from "@/components/ui/PriorityBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import UserAvatar from "@/components/ui/UserAvatar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FileUploader from "@/components/files/FileUploader";
import { PRIORITIES, TASK_STATUSES, canManage } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { getTask, logActivity, replaceLinks } from "@/lib/data";
import { errorMessage, formatDateTime } from "@/lib/format";
import { startRequest } from "@/lib/load";

function formFrom(task, profile) {
  return {
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || "todo",
    priority: task?.priority || "normal",
    start_date: task?.start_date || "",
    due_date: task?.due_date || "",
    project_id: task?.project_id || "",
    customer_id: task?.customer_id || "",
    assigneeIds: task?.assigneeIds?.length ? task.assigneeIds : profile?.id ? [profile.id] : [],
    tagIds: task?.tagIds || [],
  };
}

export default function TaskModal({ task, profiles, projects, customers, tags, profile, onClose, onSaved, onTagCreated }) {
  const manageable = canManage(profile);
  const initialForm = useRef(formFrom(task, profile));
  const [form, setForm] = useState(initialForm.current);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [checkTitle, setCheckTitle] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!task?.id) return undefined;
    return startRequest(async () => {
      try {
        const row = await getTask(task.id);
        setDetail(row || task);
      } catch {
        setDetail(task);
      }
    });
  }, [task]);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function isDirty() {
    return (
      JSON.stringify(form) !== JSON.stringify(initialForm.current) ||
      checkTitle.trim() !== "" ||
      comment.trim() !== ""
    );
  }

  function requestClose() {
    if (confirmClose) {
      setConfirmClose(false);
      return;
    }
    if (isDirty()) {
      setConfirmClose(true);
      return;
    }
    onClose();
  }

  async function save(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error("Görev başlığı gerekli.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        project_id: manageable ? form.project_id || null : task?.project_id || null,
        customer_id: manageable ? form.customer_id || null : task?.customer_id || null,
      };
      let id = task?.id;
      if (!id) {
        const { data, error } = await supabase
          .from("tasks")
          .insert({ ...payload, created_by: profile.id, position: Date.now() })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
        await logActivity(profile.id, "task_created", "task", id, { title: payload.title });
      } else {
        const { error } = await supabase.from("tasks").update(payload).eq("id", id);
        if (error) throw error;
        if (task.status !== "done" && payload.status === "done") {
          await logActivity(profile.id, "task_completed", "task", id, { title: payload.title });
        }
      }
      if (manageable) {
        await replaceLinks("task_assignees", "task_id", id, "profile_id", form.assigneeIds);
        await replaceLinks("task_tags", "task_id", id, "tag_id", form.tagIds);
        const previous = (task?.assigneeIds || []).slice().sort().join(",");
        const next = form.assigneeIds.slice().sort().join(",");
        if (previous !== next) {
          await logActivity(profile.id, "task_assigned", "task", id, { title: payload.title });
        }
      }
      toast.success(task?.id ? "Görev güncellendi." : "Görev oluşturuldu.");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, "Görev kaydedilemedi."));
    } finally {
      setBusy(false);
    }
  }

  async function addCheck(event) {
    event.preventDefault();
    const title = checkTitle.trim();
    if (!title || !task?.id) return;
    const supabase = createClient();
    const { error } = await supabase.from("task_checklists").insert({
      task_id: task.id,
      title,
      position: (detail?.checklists || []).length,
    });
    if (error) {
      toast.error(errorMessage(error, "Madde eklenemedi."));
      return;
    }
    setCheckTitle("");
    setDetail(await getTask(task.id));
  }

  async function toggleCheck(item) {
    const supabase = createClient();
    const { error } = await supabase.from("task_checklists").update({ is_done: !item.is_done }).eq("id", item.id);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    setDetail(await getTask(task.id));
    onSaved();
  }

  async function addComment(event) {
    event.preventDefault();
    const body = comment.trim();
    if (!body || !task?.id) return;
    const supabase = createClient();
    const { error } = await supabase.from("task_comments").insert({
      task_id: task.id,
      profile_id: profile.id,
      body,
    });
    if (error) {
      toast.error(errorMessage(error, "Yorum eklenemedi."));
      return;
    }
    setComment("");
    setDetail(await getTask(task.id));
  }

  async function removeTask() {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) throw error;
    toast.success("Görev silindi.");
    onSaved();
    onClose();
  }

  const checklists = detail?.checklists || [];
  const comments = detail?.comments || [];
  const doneCount = checklists.filter((item) => item.is_done).length;

  return (
    <Modal title={task?.id ? "Görev" : "Yeni görev"} onClose={requestClose} wide>
      <form onSubmit={save} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <Field label="Başlık">
            <input className={inputClass} value={form.title} onChange={(event) => set("title", event.target.value)} required />
          </Field>
          <Field label="Açıklama">
            <textarea className={textareaClass} value={form.description} onChange={(event) => set("description", event.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Durum">
              <select className={inputClass} value={form.status} onChange={(event) => set("status", event.target.value)}>
                {TASK_STATUSES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Öncelik">
              <select className={inputClass} value={form.priority} onChange={(event) => set("priority", event.target.value)} disabled={!manageable && Boolean(task?.id)}>
                {PRIORITIES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Başlangıç">
              <input type="date" className={inputClass} value={form.start_date || ""} onChange={(event) => set("start_date", event.target.value)} />
            </Field>
            <Field label="Son tarih">
              <input type="date" className={inputClass} value={form.due_date || ""} onChange={(event) => set("due_date", event.target.value)} />
            </Field>
            <Field label="Proje">
              <select className={inputClass} value={form.project_id || ""} onChange={(event) => set("project_id", event.target.value)} disabled={!manageable}>
                <option value="">Seçilmedi</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Müşteri">
              <select className={inputClass} value={form.customer_id || ""} onChange={(event) => set("customer_id", event.target.value)} disabled={!manageable}>
                <option value="">Seçilmedi</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.company_name}</option>
                ))}
              </select>
            </Field>
          </div>
          {manageable ? (
            <Field label="Kişiler">
              <UserMultiSelect profiles={profiles} value={form.assigneeIds} onChange={(ids) => set("assigneeIds", ids)} />
            </Field>
          ) : null}
          {manageable ? (
            <Field label="Etiketler">
              <TagSelect
                tags={tags}
                value={form.tagIds}
                onChange={(ids) => set("tagIds", ids)}
                onCreated={onTagCreated}
                profileId={profile.id}
              />
            </Field>
          ) : null}
          {task?.id ? (
            <div className="space-y-3 rounded-2xl border border-line p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Kontrol listesi</h3>
                <span className="text-xs text-muted">{doneCount} / {checklists.length}</span>
              </div>
              {checklists.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={item.is_done} onChange={() => toggleCheck(item)} className="h-4 w-4" />
                  <span className={item.is_done ? "text-muted line-through" : ""}>{item.title}</span>
                </label>
              ))}
              <div className="flex gap-2">
                <input className={inputClass} value={checkTitle} onChange={(event) => setCheckTitle(event.target.value)} placeholder="Yeni madde" />
                <Button onClick={addCheck}>Ekle</Button>
              </div>
            </div>
          ) : null}
          <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 bg-white py-3 sm:flex-row sm:justify-between">
            {task?.id && manageable ? (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>Sil</Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={requestClose}>Vazgeç</Button>
              <Button type="submit" disabled={busy}>{busy ? "Kaydediliyor..." : "Kaydet"}</Button>
            </div>
          </div>
        </div>
        <aside className="space-y-4">
          {task?.id ? (
            <div className="rounded-2xl border border-line p-3 text-sm">
              <div className="mb-2 flex flex-wrap gap-2">
                <StatusBadge value={form.status} />
                <PriorityBadge value={form.priority} />
              </div>
              <div className="text-muted">Oluşturan</div>
              <div className="mt-1">{detail?.creator?.full_name || task.creator?.full_name || "—"}</div>
              <div className="mt-2 text-muted">Oluşturulma</div>
              <div>{formatDateTime(task.created_at)}</div>
            </div>
          ) : null}
          {task?.id ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Yorumlar</h3>
              <div className="space-y-3">
                {comments.map((item) => (
                  <div key={item.id} className="flex gap-2">
                    <UserAvatar name={item.profile?.full_name} url={item.profile?.avatar_url} size="sm" />
                    <div>
                      <div className="text-sm font-medium">{item.profile?.full_name}</div>
                      <div className="text-xs text-muted">{formatDateTime(item.created_at)}</div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{item.body}</p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 ? <p className="text-sm text-muted">Henüz yorum yok.</p> : null}
              </div>
              <textarea className={textareaClass} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Yorum yazın" />
              <Button onClick={addComment}>Yorum ekle</Button>
              <FileUploader entityType="task" entityId={task.id} profileId={profile.id} />
            </div>
          ) : null}
        </aside>
      </form>
      {confirmClose ? (
        <ConfirmDialog
          title="Emin misin?"
          message="Bu penceredeki bilgiler henüz kaydedilmedi. Kapatırsan girdiklerin silinir."
          confirmLabel="Kapat"
          variant="primary"
          onClose={() => setConfirmClose(false)}
          onConfirm={onClose}
        />
      ) : null}
      {confirmDelete ? (
        <ConfirmDialog
          title="Görevi sil"
          message="Bu görev ve bağlı kayıtlar silinecek."
          onClose={() => setConfirmDelete(false)}
          onConfirm={removeTask}
        />
      ) : null}
    </Modal>
  );
}
