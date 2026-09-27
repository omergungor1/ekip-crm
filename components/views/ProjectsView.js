"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import Button, { Field, inputClass, textareaClass } from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import AvatarGroup from "@/components/ui/AvatarGroup";
import UserMultiSelect from "@/components/ui/UserMultiSelect";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AnchoredMenu from "@/components/ui/AnchoredMenu";
import { useProfile } from "@/components/layout/AppShell";
import { PROJECT_COLORS, PROJECT_STATUSES, canManage } from "@/lib/constants";
import { listCustomers, listProfiles, listProjects, listTasks, logActivity, replaceLinks } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/format";
import { startRequest } from "@/lib/load";

const emptyProject = {
  name: "",
  description: "",
  color: PROJECT_COLORS[0],
  status: "planning",
  start_date: "",
  manager_id: "",
  memberIds: [],
};

export default function ProjectsView() {
  const profile = useProfile();
  const [projects, setProjects] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [projectRows, profileRows, taskRows, customerRows] = await Promise.all([
        listProjects(),
        listProfiles(),
        listTasks(),
        listCustomers(),
      ]);
      setProjects(projectRows);
      setProfiles(profileRows);
      setTasks(taskRows);
      setCustomers(customerRows);
    } catch (error) {
      toast.error(errorMessage(error, "Projeler yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => startRequest(() => load()), []);

  function openCreate() {
    setLogoFile(null);
    setForm({ ...emptyProject, manager_id: profile.id, memberIds: [profile.id] });
  }

  async function save(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Proje adı gerekli.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        color: form.color,
        status: form.status,
        start_date: form.start_date || null,
        manager_id: form.manager_id || profile.id,
      };
      let id = form.id;
      if (!id) {
        const { data, error } = await supabase.from("projects").insert({ ...payload, created_by: profile.id }).select("id").single();
        if (error) throw error;
        id = data.id;
        await logActivity(profile.id, "project_created", "project", id, { title: payload.name });
      } else {
        const { error } = await supabase.from("projects").update(payload).eq("id", id);
        if (error) throw error;
      }
      const memberIds = Array.from(new Set([payload.manager_id, profile.id, ...form.memberIds].filter(Boolean)));
      await replaceLinks("project_members", "project_id", id, "profile_id", memberIds);
      if (logoFile) {
        const safeName = logoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `projects/${id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, logoFile);
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
        const { error } = await supabase.from("projects").update({ logo_url: publicUrl.publicUrl }).eq("id", id);
        if (error) throw error;
      }
      toast.success(form.id ? "Proje güncellendi." : "Proje oluşturuldu.");
      setForm(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Proje kaydedilemedi."));
    } finally {
      setBusy(false);
    }
  }

  async function removeProject() {
    const supabase = createClient();
    const { error } = await supabase.from("projects").delete().eq("id", pendingDelete.id);
    if (error) throw error;
    toast.success("Proje silindi.");
    setPendingDelete(null);
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Projeler"
        description="Ürün ve müşteri projelerini tek yerden izleyin."
        action={canManage(profile) ? <Button onClick={openCreate}>Yeni proje</Button> : null}
      />
      {loading ? <LoadingSkeleton /> : null}
      {!loading && projects.length === 0 ? (
        <EmptyState title="Henüz proje bulunmuyor." description="Ekibin üzerinde çalıştığı ilk projeyi oluşturun." action={canManage(profile) ? <Button onClick={openCreate}>İlk projeni oluştur</Button> : null} />
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => {
          const members = (project.members || []).map((item) => item.profile).filter(Boolean);
          const openTasks = tasks.filter((task) => task.project_id === project.id && task.status !== "done").length;
          const customerCount = customers.filter((customer) => (customer.projects || []).some((link) => link.project_id === project.id)).length;
          return (
            <article key={project.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex items-start gap-3">
                {project.logo_url ? (
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl">
                    <Image src={project.logo_url} alt="" fill className="object-cover" sizes="44px" />
                  </span>
                ) : (
                  <span className="grid h-11 w-11 place-items-center rounded-xl text-sm font-semibold text-white" style={{ background: project.color }}>
                    {project.name.slice(0, 1).toLocaleUpperCase("tr-TR")}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/projects/${project.id}`} className="block truncate font-semibold hover:text-accent">{project.name}</Link>
                  <div className="mt-2"><StatusBadge kind="project" value={project.status} /></div>
                </div>
                {canManage(profile) ? (
                  <ProjectCardMenu
                    onEdit={() => {
                      setLogoFile(null);
                      setForm({
                        ...project,
                        description: project.description || "",
                        start_date: project.start_date || "",
                        manager_id: project.manager_id || profile.id,
                        memberIds: members.map((item) => item.id),
                      });
                    }}
                    onDelete={() => setPendingDelete(project)}
                  />
                ) : null}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-muted">
                <AvatarGroup people={members} />
                <span>{customerCount} müşteri · {openTasks} açık görev</span>
              </div>
            </article>
          );
        })}
      </div>
      {form ? (
        <Modal title={form.id ? "Projeyi düzenle" : "Yeni proje"} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Proje adı"><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
            <Field label="Açıklama"><textarea className={textareaClass} value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
            <Field label="Renk">
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((color) => (
                  <button key={color} type="button" className={`h-9 w-9 rounded-full ${form.color === color ? "ring-2 ring-offset-2 ring-ink" : ""}`} style={{ background: color }} onClick={() => setForm({ ...form, color })} />
                ))}
              </div>
            </Field>
            <Field label="Logo">
              <input type="file" accept="image/*" className="block w-full text-sm" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Durum">
                <select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                  {PROJECT_STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </Field>
              <Field label="Başlangıç"><input type="date" className={inputClass} value={form.start_date || ""} onChange={(event) => setForm({ ...form, start_date: event.target.value })} /></Field>
            </div>
            <Field label="Proje yöneticisi">
              <select className={inputClass} value={form.manager_id || ""} onChange={(event) => setForm({ ...form, manager_id: event.target.value })}>
                {profiles.map((item) => <option key={item.id} value={item.id}>{item.full_name || item.username}</option>)}
              </select>
            </Field>
            <Field label="Ekip üyeleri">
              <UserMultiSelect profiles={profiles} value={form.memberIds} onChange={(memberIds) => setForm({ ...form, memberIds })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setForm(null)}>Vazgeç</Button>
              <Button type="submit" disabled={busy}>{busy ? "Kaydediliyor..." : "Kaydet"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
      {pendingDelete ? <ConfirmDialog title="Projeyi sil" message={`${pendingDelete.name} ve bağlı üyelikler silinecek. Görevler projeden ayrılır.`} onClose={() => setPendingDelete(null)} onConfirm={removeProject} /> : null}
    </div>
  );
}

function ProjectCardMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  return (
    <div className="shrink-0">
      <button
        ref={anchorRef}
        type="button"
        aria-label="Diğer işlemler"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 hover:bg-zinc-100"
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      <AnchoredMenu open={open} anchorRef={anchorRef} onClose={() => setOpen(false)} align="end" width={168}>
        <button
          type="button"
          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-50"
          onClick={() => {
            setOpen(false);
            onEdit();
          }}
        >
          Düzenle
        </button>
        <button
          type="button"
          className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
          onClick={() => {
            setOpen(false);
            onDelete();
          }}
        >
          Sil
        </button>
      </AnchoredMenu>
    </div>
  );
}
