"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import PageHeader from "@/components/ui/PageHeader";
import Button, { Field, inputClass, textareaClass } from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { CardSkeletonGrid } from "@/components/ui/LoadingSkeleton";
import ProgressBar from "@/components/ui/ProgressBar";
import StatusBadge from "@/components/ui/StatusBadge";
import UserAvatar from "@/components/ui/UserAvatar";
import AvatarGroup, { peopleNames } from "@/components/ui/AvatarGroup";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AnchoredMenu from "@/components/ui/AnchoredMenu";
import { useProfile } from "@/components/layout/AppShell";
import { GOAL_STATUSES, canManage } from "@/lib/constants";
import { listActivities, listCustomers, listGoals, listProjects, listTasks, logActivity } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { activityText } from "@/lib/activityText";
import { errorMessage, formatDateTime, goalProgress, goalRemaining, taskTiming } from "@/lib/format";
import { startRequest } from "@/lib/load";

function StatCard({ label, value, href }) {
  return (
    <Link href={href} className="rounded-2xl border border-line bg-white p-4 hover:border-zinc-300">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{value}</div>
    </Link>
  );
}

const emptyGoal = {
  title: "",
  description: "",
  start_date: "",
  end_date: "",
  target_value: "",
  current_value: "",
  status: "in_progress",
  project_id: "",
};

export default function DashboardView() {
  const profile = useProfile();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [goals, setGoals] = useState([]);
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const [activities, setActivities] = useState(null);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [goalForm, setGoalForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [taskRows, projectRows, customerRows, goalRows] = await Promise.all([
        listTasks(),
        listProjects(),
        listCustomers(),
        listGoals(),
      ]);
      setTasks(taskRows);
      setProjects(projectRows);
      setCustomers(customerRows);
      setGoals(goalRows);
    } catch (error) {
      toast.error(errorMessage(error, "Panel yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => startRequest(() => load()), []);

  const openTasks = tasks.filter((task) => task.status !== "done");
  const overdue = tasks.filter((task) => taskTiming(task)?.kind === "overdue");
  const mine = openTasks.filter((task) => task.assigneeIds.includes(profile.id));
  const groups = {
    today: mine.filter((task) => taskTiming(task)?.kind === "today"),
    upcoming: mine.filter((task) => {
      const timing = taskTiming(task);
      return timing?.kind === "upcoming" && Math.abs(timing.days) <= 7;
    }),
    overdue: mine.filter((task) => taskTiming(task)?.kind === "overdue"),
  };
  const activeProjects = projects.filter((project) => ["active", "development", "testing"].includes(project.status)).length;
  const activeCustomers = customers.filter((customer) => customer.status === "active").length;

  async function saveGoal(event) {
    event.preventDefault();
    if (!goalForm.title.trim()) {
      toast.error("Hedef başlığı gerekli.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const payload = {
        title: goalForm.title.trim(),
        description: goalForm.description.trim() || null,
        start_date: goalForm.start_date || null,
        end_date: goalForm.end_date || null,
        target_value: Number(goalForm.target_value || 0),
        current_value: Number(goalForm.current_value || 0),
        status: goalForm.status,
        project_id: goalForm.project_id || null,
      };
      if (goalForm.id) {
        const { error } = await supabase.from("goals").update(payload).eq("id", goalForm.id);
        if (error) throw error;
        toast.success("Hedef güncellendi.");
      } else {
        const { data, error } = await supabase.from("goals").insert({ ...payload, created_by: profile.id }).select("id").single();
        if (error) throw error;
        await logActivity(profile.id, "goal_created", "goal", data.id, { title: payload.title });
        toast.success("Hedef eklendi.");
      }
      setGoalForm(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Hedef kaydedilemedi."));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActivities() {
    if (activitiesOpen) {
      setActivitiesOpen(false);
      return;
    }
    setActivitiesOpen(true);
    if (activities) return;
    setActivitiesLoading(true);
    try {
      setActivities(await listActivities(12));
    } catch (error) {
      toast.error(errorMessage(error, "Aktiviteler yüklenemedi."));
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }

  async function removeGoal() {
    const supabase = createClient();
    const { error } = await supabase.from("goals").delete().eq("id", pendingDelete.id);
    if (error) throw error;
    toast.success("Hedef silindi.");
    setPendingDelete(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Ana Sayfa" description={`Merhaba ${profile.full_name || profile.username}, bugünkü operasyon özeti.`} />
      {loading ? <CardSkeletonGrid /> : (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Aktif Müşteriler" value={activeCustomers} href="/customers" />
          <StatCard label="Aktif Projeler" value={activeProjects} href="/projects" />
          <StatCard label="Açık Görevler" value={openTasks.length} href="/tasks?open=1" />
          <StatCard label="Geciken Görevler" value={overdue.length} href="/tasks?overdue=1" />
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Hedefler</h2>
          {canManage(profile) ? <Button onClick={() => setGoalForm(emptyGoal)}>Hedef ekle</Button> : null}
        </div>
        {!loading && goals.length === 0 ? (
          <EmptyState title="Henüz hedef bulunmuyor." description="Şirket hedeflerini buradan takip edebilirsiniz." action={canManage(profile) ? <Button onClick={() => setGoalForm(emptyGoal)}>İlk hedefi oluştur</Button> : null} />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {goals.map((goal) => {
              const progress = goalProgress(goal);
              return (
                <article key={goal.id} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{goal.title}</h3>
                      {goal.description ? <p className="mt-1 text-sm text-muted">{goal.description}</p> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <StatusBadge kind="goal" value={goal.status} />
                      {canManage(profile) ? (
                        <GoalCardMenu
                          onEdit={() => setGoalForm({ ...goal, target_value: goal.target_value, current_value: goal.current_value, start_date: goal.start_date || "", end_date: goal.end_date || "", project_id: goal.project_id || "", description: goal.description || "" })}
                          onDelete={() => setPendingDelete(goal)}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-zinc-600">
                    {Number(goal.current_value)} / {Number(goal.target_value)} · %{progress}
                  </div>
                  <div className="mt-2"><ProgressBar value={progress} /></div>
                  <div className="mt-3 text-xs text-muted">
                    {goal.project?.name || "Genel hedef"} · {goalRemaining(goal)}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Benim görevlerim</h2>
            <Link href="/tasks?mine=1" className="text-sm font-medium text-accent">Tümü</Link>
          </div>
          {["today", "upcoming", "overdue"].map((key) => (
            <div key={key} className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-muted">{key === "today" ? "Bugün" : key === "upcoming" ? "Yaklaşan" : "Geciken"}</h3>
              {groups[key].length === 0 ? <p className="text-sm text-muted">Kayıt yok.</p> : null}
              <div className="space-y-2">
                {groups[key].map((task) => (
                  <Link key={task.id} href="/tasks?mine=1" className="block rounded-xl border border-line px-3 py-2 text-sm hover:bg-zinc-50">
                    <div className="font-medium">{task.title}</div>
                    <div className="text-xs text-muted">{task.project?.name || "Projesiz"} · {taskTiming(task)?.label}</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Geciken görevler</h2>
          {overdue.length === 0 ? <p className="text-sm text-muted">Geciken görev yok.</p> : null}
          <div className="space-y-3">
            {overdue.map((task) => (
              <div key={task.id} className="rounded-xl border border-line p-3">
                <div className="font-medium">{task.title}</div>
                <div className="mt-1 text-sm text-rose-600">{task.project?.name ? `${task.project.name} · ` : ""}{taskTiming(task)?.label}</div>
                <div className="mt-2 flex items-center gap-2">
                  <AvatarGroup people={task.assignees} />
                  <span className="text-xs text-muted">{peopleNames(task.assignees)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
          aria-expanded={activitiesOpen}
          onClick={toggleActivities}
        >
          <h2 className="text-lg font-semibold">Son aktiviteler</h2>
          <ChevronDown className={`h-5 w-5 shrink-0 text-muted transition ${activitiesOpen ? "rotate-180" : ""}`} />
        </button>
        {activitiesOpen ? (
          <div className="space-y-3 px-4 pb-4">
            {activitiesLoading ? <p className="text-sm text-muted">Yükleniyor...</p> : null}
            {!activitiesLoading && activities?.length === 0 ? <p className="text-sm text-muted">Henüz aktivite yok.</p> : null}
            {(activities || []).map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <UserAvatar name={item.profile?.full_name} url={item.profile?.avatar_url} size="sm" />
                <div>
                  <p className="text-sm">{activityText(item)}</p>
                  <p className="text-xs text-muted">{formatDateTime(item.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {goalForm ? (
        <Modal title={goalForm.id ? "Hedefi düzenle" : "Yeni hedef"} onClose={() => setGoalForm(null)}>
          <form onSubmit={saveGoal} className="space-y-3">
            <Field label="Başlık"><input className={inputClass} value={goalForm.title} onChange={(event) => setGoalForm({ ...goalForm, title: event.target.value })} required /></Field>
            <Field label="Açıklama"><textarea className={textareaClass} value={goalForm.description || ""} onChange={(event) => setGoalForm({ ...goalForm, description: event.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Başlangıç"><input type="date" className={inputClass} value={goalForm.start_date || ""} onChange={(event) => setGoalForm({ ...goalForm, start_date: event.target.value })} /></Field>
              <Field label="Bitiş"><input type="date" className={inputClass} value={goalForm.end_date || ""} onChange={(event) => setGoalForm({ ...goalForm, end_date: event.target.value })} /></Field>
              <Field label="Hedef değer"><input type="number" min="0" className={inputClass} value={goalForm.target_value} onChange={(event) => setGoalForm({ ...goalForm, target_value: event.target.value })} /></Field>
              <Field label="Mevcut değer"><input type="number" min="0" className={inputClass} value={goalForm.current_value} onChange={(event) => setGoalForm({ ...goalForm, current_value: event.target.value })} /></Field>
            </div>
            <Field label="Durum">
              <select className={inputClass} value={goalForm.status} onChange={(event) => setGoalForm({ ...goalForm, status: event.target.value })}>
                {GOAL_STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </Field>
            <Field label="Proje">
              <select className={inputClass} value={goalForm.project_id || ""} onChange={(event) => setGoalForm({ ...goalForm, project_id: event.target.value })}>
                <option value="">İsteğe bağlı</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setGoalForm(null)}>Vazgeç</Button>
              <Button type="submit" disabled={busy}>{busy ? "Kaydediliyor..." : "Kaydet"}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
      {pendingDelete ? (
        <ConfirmDialog title="Hedefi sil" message={`${pendingDelete.title} silinsin mi?`} onClose={() => setPendingDelete(null)} onConfirm={removeGoal} />
      ) : null}
    </div>
  );
}

function GoalCardMenu({ onEdit, onDelete }) {
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
