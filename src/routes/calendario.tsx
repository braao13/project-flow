import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import { MonthCalendar, type CalendarDayItem } from "@/components/projetin/MonthCalendar";
import { TaskDialog } from "@/components/projetin/TaskDialog";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário — Projetin" },
      { name: "description", content: "Entregas e atualizações no calendário mensal." },
    ],
  }),
  component: CalendarioPage,
});

function CalendarioPage() {
  const { state } = useStore();
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const items = useMemo<CalendarDayItem[]>(() => {
    const list: CalendarDayItem[] = [];
    state.tasks.forEach((t) => {
      if (!t.dueDate) return;
      const project = state.projects.find((p) => p.id === t.projectId);
      list.push({
        type: "entrega",
        label: t.name,
        taskId: t.id,
        projectId: t.projectId,
        projectName: project?.name ?? "Sem projeto",
        projectColor: project?.color ?? undefined,
        status: t.status,
        date: t.dueDate.slice(0, 10),
        done: t.status === "finalizada",
        onOpenTask: () => setEditingTask(t),
      });
    });
    state.updates.forEach((u) => {
      if (!u.date) return;
      const task = state.tasks.find((t) => t.id === u.taskId);
      if (!task) return;
      const project = state.projects.find((p) => p.id === task.projectId);
      list.push({
        type: "atualizacao",
        label: u.title,
        taskId: u.taskId,
        projectId: task.projectId,
        projectName: project?.name ?? "Sem projeto",
        date: u.date,
        done: u.done,
        onOpenTask: () => setEditingTask(task),
      });
    });
    return list;
  }, [state]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Visualização mensal</p>
        <h1 className="text-3xl font-semibold tracking-tight">Calendário</h1>
      </header>

      <MonthCalendar items={items} />

      <TaskDialog open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(undefined)} task={editingTask} />
    </div>
  );
}
