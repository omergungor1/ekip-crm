"use client";

import UserAvatar from "@/components/ui/UserAvatar";
import TaskCard from "@/components/tasks/TaskCard";

function columnTasks(tasks, columnId) {
  if (columnId === "unassigned") {
    return tasks.filter((task) => !(task.assigneeIds || []).length);
  }
  return tasks.filter((task) => (task.assigneeIds || []).includes(columnId));
}

export default function PersonBoard({ tasks, profiles, onOpen }) {
  const openTasks = tasks.filter((task) => task.status !== "done");
  const known = new Set(profiles.map((person) => person.id));
  const extras = [];
  for (const task of openTasks) {
    for (const person of task.assignees || []) {
      if (person?.id && !known.has(person.id) && !extras.some((item) => item.id === person.id)) {
        extras.push(person);
      }
    }
  }

  const columns = [
    { id: "unassigned", label: "Atanmamış", person: null },
    ...[...profiles, ...extras]
      .map((person) => ({
        id: person.id,
        label: person.full_name || person.username,
        person,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "tr")),
  ];

  return (
    <div className="flex h-full snap-x gap-3 overflow-x-auto pb-3">
      {columns.map((column) => {
        const items = columnTasks(openTasks, column.id);
        return (
          <section key={column.id} className="flex h-full w-[84vw] shrink-0 snap-start flex-col rounded-2xl bg-zinc-100 p-3 sm:w-80">
            <header className="mb-3 flex items-center justify-between gap-2 px-1">
              <div className="flex min-w-0 items-center gap-2">
                {column.person ? (
                  <UserAvatar name={column.label} url={column.person.avatar_url} size="sm" />
                ) : (
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[10px] font-semibold text-zinc-500">
                    —
                  </span>
                )}
                <h3 className="truncate text-sm font-semibold">{column.label}</h3>
              </div>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs text-muted">{items.length}</span>
            </header>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
              {items.map((task) => (
                <TaskCard key={task.id} task={task} showStatus onOpen={() => onOpen(task)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
