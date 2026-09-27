"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { LayoutList, SlidersHorizontal, SquareKanban, Users } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import EmptyState from "@/components/ui/EmptyState";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import PriorityBadge from "@/components/ui/PriorityBadge";
import AvatarGroup, { peopleNames } from "@/components/ui/AvatarGroup";
import TaskBoard from "@/components/tasks/TaskBoard";
import PersonBoard from "@/components/tasks/PersonBoard";
import TaskModal from "@/components/tasks/TaskModal";
import { useProfile } from "@/components/layout/AppShell";
import { PRIORITIES, TASK_STATUSES, canManage } from "@/lib/constants";
import { listCustomers, listProfiles, listProjects, listTags, listTasks, logActivity } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { errorMessage, formatDate, taskTiming } from "@/lib/format";
import { startRequest } from "@/lib/load";

export default function TasksView() {
  const profile = useProfile();
  const params = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("kanban");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [mine, setMine] = useState(params.get("mine") === "1");
  const [openOnly, setOpenOnly] = useState(params.get("open") === "1");
  const [overdueOnly, setOverdueOnly] = useState(params.get("overdue") === "1");
  const [userId, setUserId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [tagId, setTagId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [taskRows, profileRows, projectRows, customerRows, tagRows] = await Promise.all([
        listTasks(),
        listProfiles(),
        listProjects(),
        listCustomers(),
        listTags(),
      ]);
      setTasks(taskRows);
      setProfiles(profileRows);
      setProjects(projectRows);
      setCustomers(customerRows);
      setTags(tagRows);
    } catch (error) {
      toast.error(errorMessage(error, "Görevler yüklenemedi."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    return startRequest(async () => {
      const stored = window.localStorage.getItem("ekip-task-view");
      if (stored === "list" || stored === "kanban" || stored === "people") setView(stored);
      await load();
    });
  }, []);

  function changeView(next) {
    setView(next);
    window.localStorage.setItem("ekip-task-view", next);
  }

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (search && !`${task.title} ${task.description || ""}`.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR"))) return false;
      if (mine && !task.assigneeIds.includes(profile.id)) return false;
      if (userId && !task.assigneeIds.includes(userId)) return false;
      if (projectId && task.project_id !== projectId) return false;
      if (customerId && task.customer_id !== customerId) return false;
      if (status && task.status !== status) return false;
      if (openOnly && task.status === "done") return false;
      if (priority && task.priority !== priority) return false;
      if (tagId && !task.tagIds.includes(tagId)) return false;
      if ((from || to) && !task.due_date) return false;
      if (from && task.due_date < from) return false;
      if (to && task.due_date > to) return false;
      if (overdueOnly && taskTiming(task)?.kind !== "overdue") return false;
      return true;
    });
  }, [tasks, search, mine, userId, projectId, customerId, status, priority, tagId, from, to, openOnly, overdueOnly, profile.id]);

  async function move(task, nextStatus) {
    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item)));
    try {
      const supabase = createClient();
      const { error } = await supabase.from("tasks").update({ status: nextStatus, position: Date.now() }).eq("id", task.id);
      if (error) throw error;
      if (task.status !== "done" && nextStatus === "done") {
        await logActivity(profile.id, "task_completed", "task", task.id, { title: task.title });
      }
    } catch (error) {
      toast.error(errorMessage(error, "Durum kaydedilemedi."));
      load();
    }
  }

  const selectClass = "h-11 rounded-xl border border-line bg-white px-3 text-sm";

  return (
    <div className="flex h-[calc(100dvh-4rem-2.5rem)] min-h-0 flex-col">
      <PageHeader
        title="İşler"
        description="Görevleri pano, kişi veya liste olarak yönetin."
        action={canManage(profile) ? <Button onClick={() => setEditing({})}>Yeni görev</Button> : null}
      />
      <div className="mb-4 space-y-3 rounded-2xl border border-line bg-white p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Görev ara" />
          <div className="flex flex-wrap gap-2">
            <Button variant={view === "kanban" ? "primary" : "secondary"} onClick={() => changeView("kanban")}>
              <SquareKanban className="h-4 w-4" /> Kanban
            </Button>
            <Button variant={view === "list" ? "primary" : "secondary"} onClick={() => changeView("list")}>
              <LayoutList className="h-4 w-4" /> Liste
            </Button>
            <Button variant={view === "people" ? "primary" : "secondary"} onClick={() => changeView("people")}>
              <Users className="h-4 w-4" /> Kişi Kanban
            </Button>
            <Button
              variant={filtersOpen ? "primary" : "secondary"}
              onClick={() => setFiltersOpen((value) => !value)}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal className="h-4 w-4" /> Filtre
            </Button>
          </div>
        </div>
        {filtersOpen ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" className={`${selectClass} ${mine ? "border-accent text-accent" : ""}`} onClick={() => setMine((value) => !value)}>
            Bana atananlar
          </button>
          <select className={selectClass} value={userId} onChange={(event) => setUserId(event.target.value)}>
            <option value="">Tüm kullanıcılar</option>
            {profiles.map((item) => <option key={item.id} value={item.id}>{item.full_name || item.username}</option>)}
          </select>
          <select className={selectClass} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">Tüm projeler</option>
            {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select className={selectClass} value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            <option value="">Tüm müşteriler</option>
            {customers.map((item) => <option key={item.id} value={item.id}>{item.company_name}</option>)}
          </select>
          <select className={selectClass} value={status} onChange={(event) => { setStatus(event.target.value); setOpenOnly(false); }}>
            <option value="">Tüm durumlar</option>
            {TASK_STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <select className={selectClass} value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="">Tüm öncelikler</option>
            {PRIORITIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <select className={selectClass} value={tagId} onChange={(event) => setTagId(event.target.value)}>
            <option value="">Tüm etiketler</option>
            {tags.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button type="button" className={`${selectClass} ${overdueOnly ? "border-rose-400 text-rose-600" : ""}`} onClick={() => setOverdueOnly((value) => !value)}>
            Gecikenler
          </button>
          <input type="date" className={selectClass} value={from} onChange={(event) => setFrom(event.target.value)} />
          <input type="date" className={selectClass} value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">
      {loading ? <LoadingSkeleton lines={5} /> : null}
      {!loading && filtered.length === 0 ? (
        <EmptyState
          title="Henüz görev bulunmuyor."
          description="Filtreleri gevşetin veya yeni bir görev oluşturun."
          action={canManage(profile) ? <Button onClick={() => setEditing({})}>İlk görevini oluştur</Button> : null}
        />
      ) : null}
      {!loading && filtered.length > 0 && view === "kanban" ? (
        <div className="h-full">
          <TaskBoard tasks={filtered} onOpen={setEditing} onMove={move} />
        </div>
      ) : null}
      {!loading && filtered.length > 0 && view === "people" ? (
        <div className="h-full">
          <PersonBoard tasks={filtered} profiles={profiles} onOpen={setEditing} />
        </div>
      ) : null}
      {!loading && filtered.length > 0 && view === "list" ? (
        <div className="h-full space-y-2 overflow-y-auto">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_140px_110px_160px_140px] gap-3 px-3 text-xs font-medium text-muted lg:grid">
            <span>Görev</span><span>Durum</span><span>Öncelik</span><span>Kişiler</span><span>Son tarih</span>
          </div>
          {filtered.map((task) => {
            const timing = taskTiming(task);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => setEditing(task)}
                className="grid w-full gap-2 rounded-2xl border border-line bg-white p-3 text-left lg:grid-cols-[minmax(0,1.4fr)_140px_110px_160px_140px] lg:items-center"
              >
                <div>
                  <div className="font-medium">{task.title}</div>
                  <div className="text-xs text-muted">{task.project?.name || task.customer?.company_name || ""}</div>
                </div>
                <StatusBadge value={task.status} />
                <PriorityBadge value={task.priority} />
                <div className="flex items-center gap-2">
                  <AvatarGroup people={task.assignees} />
                  <span className="text-xs text-muted lg:hidden">{peopleNames(task.assignees)}</span>
                </div>
                <div className={`text-sm ${timing?.kind === "overdue" ? "font-medium text-rose-600" : "text-zinc-600"}`}>
                  {task.due_date ? formatDate(task.due_date) : "—"}
                  {timing?.kind === "overdue" ? ` · ${timing.label}` : ""}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
      </div>
      {editing ? (
        <TaskModal
          key={editing.id || "new"}
          task={editing.id ? editing : null}
          profiles={profiles}
          projects={projects}
          customers={customers}
          tags={tags}
          profile={profile}
          onClose={() => setEditing(null)}
          onSaved={load}
          onTagCreated={(tag) => setTags((current) => [...current, tag].sort((a, b) => a.name.localeCompare(b.name, "tr")))}
        />
      ) : null}
    </div>
  );
}
