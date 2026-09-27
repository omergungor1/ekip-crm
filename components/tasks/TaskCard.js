"use client";

import PriorityBadge from "@/components/ui/PriorityBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import AvatarGroup from "@/components/ui/AvatarGroup";
import { taskTiming } from "@/lib/format";

export default function TaskCard({ task, onOpen, showStatus = false }) {
  const timing = taskTiming(task);
  const doneCount = (task.checklists || []).filter((item) => item.is_done).length;
  const total = (task.checklists || []).length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-line bg-white p-3 text-left shadow-sm hover:border-zinc-300"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium leading-5">{task.title}</span>
        <PriorityBadge value={task.priority} />
      </div>
      {task.project || showStatus ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {task.project ? (
            <>
              <span className="h-2 w-2 rounded-full" style={{ background: task.project.color || "#3b5bfd" }} />
              {task.project.name}
            </>
          ) : null}
          {showStatus ? <StatusBadge value={task.status} /> : null}
        </div>
      ) : null}
      <div className="mt-3 flex items-end justify-between gap-2">
        <AvatarGroup people={task.assignees || []} />
        <div className="text-right text-xs">
          {total > 0 ? (
            <div className="text-muted">
              {doneCount} / {total}
            </div>
          ) : null}
          {timing ? (
            <div className={timing.kind === "overdue" ? "font-medium text-rose-600" : "text-muted"}>{timing.label}</div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
