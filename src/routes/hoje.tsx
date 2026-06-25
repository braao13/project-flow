import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hoje")({
  head: () => ({
    meta: [
      { title: "Hoje — Projetin" },
      { name: "description", content: "Todas as atualizações agendadas para hoje." },
    ],
  }),
  component: HojePage,
});

function HojePage() {
  const { state, toggleUpdate } = useStore();
  const today = new Date().toISOString().slice(0, 10);

  const items = useMemo(() => {
    return state.updates
      .filter((u) => u.date === today)
      .map((u) => {
        const task = state.tasks.find((t) => t.id === u.taskId);
        const project = task ? state.projects.find((p) => p.id === task.projectId) : undefined;
        return { update: u, task, project };
      })
      .filter((x) => x.task)
      .sort((a, b) => Number(a.update.done) - Number(b.update.done));
  }, [state, today]);

  const done = items.filter((i) => i.update.done).length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Hoje</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {items.length === 0 ? "Sem atualizações para hoje." : `${done}/${items.length} concluídas — sincronizadas com as tasks de origem.`}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">Aproveite o dia ✨</div>
      ) : (
        <ul className="space-y-3">
          {items.map(({ update, task, project }) => (
            <li key={update.id} className="glass rounded-xl p-4 flex items-start gap-3">
              <button
                onClick={() => toggleUpdate(update.id)}
                className={cn(
                  "size-5 mt-0.5 rounded-md border-2 grid place-items-center shrink-0 transition",
                  update.done ? "bg-primary border-primary text-primary-foreground shadow-glow" : "border-border hover:border-primary",
                )}
              >
                {update.done && <Check className="size-3" strokeWidth={3} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={cn("font-medium", update.done && "line-through text-muted-foreground")}>{update.title}</div>
                {update.description && <p className="text-sm text-muted-foreground mt-0.5">{update.description}</p>}
                <div className="mt-1.5 text-xs text-muted-foreground">
                  <Link to="/projetos/$id" params={{ id: project!.id }} className="hover:text-primary">
                    {project!.name}
                  </Link>
                  {" · "}
                  <span>{task!.name}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
