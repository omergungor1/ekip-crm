"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TASK_STATUSES } from "@/lib/constants";
import TaskCard from "@/components/tasks/TaskCard";

function SortableTask({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onOpen={() => onOpen(task)} />
    </div>
  );
}

function Column({ status, tasks, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status.id}` });

  return (
    <section className="flex h-full w-[84vw] shrink-0 snap-start flex-col rounded-2xl bg-zinc-100 p-3 sm:w-80">
      <header className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{status.label}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-muted">{tasks.length}</span>
      </header>
      <div ref={setNodeRef} className={`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-xl ${isOver ? "bg-white/70" : ""}`}>
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTask key={task.id} task={task} onOpen={onOpen} />
          ))}
        </SortableContext>
      </div>
    </section>
  );
}

export default function TaskBoard({ tasks, onOpen, onMove }) {
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const activeTask = tasks.find((task) => task.id === activeId);

  function onDragEnd(event) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    const nextStatus = overId.startsWith("column:")
      ? overId.slice(7)
      : tasks.find((task) => task.id === overId)?.status;
    const current = tasks.find((task) => task.id === active.id);
    if (!current || !nextStatus || current.status === nextStatus) return;
    onMove(current, nextStatus);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event) => setActiveId(event.active.id)}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full snap-x gap-3 overflow-x-auto pb-3">
        {TASK_STATUSES.map((status) => (
          <Column
            key={status.id}
            status={status}
            tasks={tasks.filter((task) => task.status === status.id)}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay>{activeTask ? <TaskCard task={activeTask} onOpen={() => {}} /> : null}</DragOverlay>
    </DndContext>
  );
}
