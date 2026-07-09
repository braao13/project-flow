import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, PackageCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { STATUS_META } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hoje")({
  head: () => ({
    meta: [
      { title: "Hoje — Projetin" },
      { name: "description", content: "Entregas e atualizações agendadas para hoje." },
    ],
  }),
  component: HojePage,
});

function HojePage() {
  const { state, toggleUpdate, toggleTaskDone } = useStore();
  const today = new Date().toISOString().slice(0, 10);

  // Entregas do dia — tasks com data de entrega igual a hoje.
  const deliveries = useMemo(() => {
    return state.tasks
      .filter((t) => t.dueDate && t.dueDate.slice(0, 10) === today)
      .map((t) => ({ task: t, project: state.projects.find((p) => p.id === t.projectId) }))
      .sort((a, b) => Number(a.task.status === "finalizada") - Number(b.task.status === "finalizada"));
  }, [state.tasks, state.projects, today]);

  // Atualizações agendadas explicitamente para hoje.
  const updates = useMemo(() => {
    return state.updates
      .filter((u) => u.date === today)
      .map((u) => {
        const task = state.tasks.find((t) => t.id === u.taskId);
        const project = task ? state.projects.find((p) => p.id === task.projectId) : undefined;
        return { update: u, task, project };
      })
      .filter((x) => x.task)
      .sort((a, b) => Number(a.update.done) - Number(b.update.done));
  }, [state.updates, state.tasks, state.projects, today]);

  const deliveriesDone = deliveries.filter((d) => d.task.status === "finalizada").length;
  const updatesDone = updates.filter((u) => u.update.done).length;
  const totalItems = deliveries.length + updates.length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Hoje</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {totalItems === 0
            ? "Nada agendado para hoje."
            : `${deliveriesDone}/${deliveries.length} entregas · ${updatesDone}/${updates.length} atualizações.`}
        </p>
      </header>

      {totalItems === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">Aproveite o dia ✨</div>
      ) : (
        <div className="space-y-6">
          {deliveries.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Entregas de hoje</h2>
              <ul className="space-y-3">
                {deliveries.map(({ task, project }) => {
                  const done = task.status === "finalizada";
                  return (
                    <li key={task.id} className="glass rounded-xl p-4 flex items-start gap-3 border-l-2" style={{ borderColor: STATUS_META[task.status].color }}>
                      <button
                        onClick={() => toggleTaskDone(task.id)}
                        className={cn(
                          "size-5 mt-0.5 rounded-md border-2 grid place-items-center shrink-0 transition",
                          done ? "bg-primary border-primary text-primary-foreground shadow-glow" : "border-border hover:border-primary",
                        )}
                        aria-label="Concluir task"
                      >
                        {done && <Check className="size-3" strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={cn("font-medium flex items-center gap-1.5", done && "line-through text-muted-foreground")}>
                          <PackageCheck className="size-3.5 text-muted-foreground shrink-0" />
                          {task.name}
                        </div>
                        <div className="mt-1.5 text-xs text-muted-foreground">
                          {project && (
                            <Link to="/projetos/$id" params={{ id: project.id }} className="hover:text-primary">
                              {project.name}
                            </Link>
                          )}
                          {" · "}
                          <span>{STATUS_META[task.status].label}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {updates.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Atualizações de hoje</h2>
              <ul className="space-y-3">
                {updates.map(({ update, task, project }) => (
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
            </section>
          )}
        </div>
      )}
    </div>
  );
}
