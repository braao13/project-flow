import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário — Projetin" },
      { name: "description", content: "Entregas e atualizações no calendário mensal." },
    ],
  }),
  component: CalendarioPage,
});

interface DayItem {
  type: "entrega" | "atualizacao";
  label: string;
  taskId: string;
  projectId: string;
  done?: boolean;
}

function CalendarioPage() {
  const { state } = useStore();
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Date>(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    const push = (key: string, item: DayItem) => {
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    };
    state.tasks.forEach((t) => {
      if (t.dueDate) {
        const key = t.dueDate.slice(0, 10);
        push(key, { type: "entrega", label: t.name, taskId: t.id, projectId: t.projectId, done: t.status === "finalizada" });
      }
    });
    state.updates.forEach((u) => {
      if (!u.date) return;
      const task = state.tasks.find((t) => t.id === u.taskId);
      if (!task) return;
      push(u.date, { type: "atualizacao", label: u.title, taskId: u.taskId, projectId: task.projectId, done: u.done });
    });
    return map;
  }, [state]);

  const selectedItems = itemsByDay.get(format(selected, "yyyy-MM-dd")) ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Visualização mensal</p>
          <h1 className="text-3xl font-semibold tracking-tight capitalize">{format(cursor, "MMMM yyyy", { locale: ptBR })}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(subMonths(cursor, 1))}><ChevronLeft className="size-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => { setCursor(new Date()); setSelected(new Date()); }}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight className="size-4" /></Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="glass rounded-2xl p-4">
          <div className="grid grid-cols-7 text-center text-xs uppercase tracking-widest text-muted-foreground mb-2">
            {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const items = itemsByDay.get(key) ?? [];
              const inMonth = isSameMonth(d, cursor);
              const isSel = isSameDay(d, selected);
              return (
                <button
                  key={key}
                  onClick={() => setSelected(d)}
                  className={cn(
                    "aspect-square rounded-lg p-1.5 text-left flex flex-col gap-1 border transition",
                    inMonth ? "border-border/60 bg-background/30" : "border-transparent text-muted-foreground/50",
                    isSel && "border-primary shadow-glow bg-primary/10",
                    isToday(d) && !isSel && "border-primary/40",
                  )}
                >
                  <div className={cn("text-xs font-medium", isToday(d) && "text-primary")}>{format(d, "d")}</div>
                  <div className="flex flex-wrap gap-0.5 mt-auto">
                    {items.slice(0, 4).map((it, i) => (
                      <span
                        key={i}
                        className="size-1.5 rounded-full"
                        style={{ background: it.type === "entrega" ? "var(--danger)" : "var(--primary)", opacity: it.done ? 0.4 : 1 }}
                      />
                    ))}
                    {items.length > 4 && <span className="text-[9px] text-muted-foreground">+{items.length - 4}</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: "var(--danger)" }} /> Entrega</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> Atualização</span>
          </div>
        </div>

        <aside className="glass rounded-2xl p-5 space-y-3 lg:max-h-[600px] lg:overflow-auto">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Selecionado</p>
            <h2 className="font-semibold capitalize">{format(selected, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h2>
          </div>
          {selectedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada agendado.</p>
          ) : (
            <ul className="space-y-2">
              {selectedItems.map((it, i) => (
                <li key={i} className="rounded-lg p-3 border border-border/60 bg-background/30">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: it.type === "entrega" ? "var(--danger)" : "var(--primary)" }}
                    />
                    {it.type === "entrega" ? "Entrega" : "Atualização"}
                    {it.done && <span className="text-success">· concluída</span>}
                  </div>
                  <Link to="/projetos/$id" params={{ id: it.projectId }} className="block mt-1 font-medium hover:text-primary">
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
