import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { MonthCalendar, type CalendarDayItem } from "@/components/projetin/MonthCalendar";

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

  const items = useMemo<CalendarDayItem[]>(() => {
    const list: CalendarDayItem[] = [];
    state.tasks.forEach((t) => {
      if (t.dueDate) {
        list.push({
          type: "entrega",
          label: t.name,
          taskId: t.id,
          projectId: t.projectId,
          date: t.dueDate.slice(0, 10),
          done: t.status === "finalizada",
        });
      }
    });
    state.updates.forEach((u) => {
      if (!u.date) return;
      const task = state.tasks.find((t) => t.id === u.taskId);
      if (!task) return;
      list.push({ type: "atualizacao", label: u.title, taskId: u.taskId, projectId: task.projectId, date: u.date, done: u.done });
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
    </div>
  );
}
