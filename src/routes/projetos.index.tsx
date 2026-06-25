import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { STATUS_META } from "@/lib/types";
import type { Project, Task, TaskStatus } from "@/lib/types";
import { ProjectDialog } from "@/components/projetin/ProjectDialog";
import { TaskDialog } from "@/components/projetin/TaskDialog";
import { TaskAccordion } from "@/components/projetin/TaskAccordion";
import { BalloonField, type BalloonItem } from "@/components/projetin/BalloonField";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/projetos/")({
  head: () => ({
    meta: [
      { title: "Projetos — Projetin" },
      { name: "description", content: "Seus projetos flutuando lado a lado — clique para entrar." },
    ],
  }),
  component: ProjectsList,
});

const EMPTY_PROJECT_COLOR = "var(--chart-5)";

function dominantStatus(tasks: Task[]): TaskStatus | null {
  if (tasks.length === 0) return null;
  if (tasks.some((t) => t.status === "atrasada")) return "atrasada";
  if (tasks.some((t) => t.status === "andamento")) return "andamento";
  return "finalizada";
}

function ProjectsList() {
  const { state, deleteProject } = useStore();
  const [creating, setCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [creatingTaskFor, setCreatingTaskFor] = useState<string | null>(null);

  const projectItems: BalloonItem[] = state.projects.map((p) => {
    const tasks = state.tasks.filter((t) => t.projectId === p.id);
    const status = dominantStatus(tasks);
    return {
      id: p.id,
      title: p.name,
      subtitle: `${tasks.length} task${tasks.length === 1 ? "" : "s"}`,
      borderColor: status ? STATUS_META[status].color : EMPTY_PROJECT_COLOR,
      sizeScale: Math.min(1.3, 0.9 + tasks.length * 0.04),
      dots: tasks.slice(0, 8).map((t) => ({ color: STATUS_META[t.status].color })),
    };
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-xs text-muted-foreground mt-1">Clique em um balão para entrar no projeto.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4 mr-1.5" /> Novo projeto
        </Button>
      </header>

      <BalloonField
        items={projectItems}
        emptyLabel="Nenhum projeto ainda. Crie o primeiro."
        renderExpanded={(item, close) => {
          const project = state.projects.find((p) => p.id === item.id);
          if (!project) return null;
          const tasks = state.tasks.filter((t) => t.projectId === project.id);

          const taskItems: BalloonItem[] = tasks.map((t) => {
            const updates = state.updates.filter((u) => u.taskId === t.id);
            return {
              id: t.id,
              title: t.name,
              subtitle: STATUS_META[t.status].label,
              borderColor: STATUS_META[t.status].color,
              dots: updates.slice(0, 8).map((u) => ({ color: u.done ? "var(--success)" : "var(--muted-foreground)" })),
            };
          });

          return (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3 pr-10">
                <div className="min-w-0">
                  <h2 className="text-2xl font-semibold truncate">{project.name}</h2>
                  {project.description && <p className="text-sm text-muted-foreground mt-1">{project.description}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setEditingProject(project)}>
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Excluir projeto "${project.name}" e todas as tasks?`)) {
                        deleteProject(project.id);
                        close();
                      }
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </div>

              <BalloonField
                items={taskItems}
                emptyLabel="Nenhuma task ainda."
                onAdd={() => setCreatingTaskFor(project.id)}
                addLabel="Nova task"
                renderExpanded={(taskItem) => {
                  const task = tasks.find((t) => t.id === taskItem.id);
                  if (!task) return null;
                  return <TaskAccordion task={task} defaultOpen />;
                }}
              />
            </div>
          );
        }}
      />

      <ProjectDialog open={creating} onOpenChange={setCreating} />
      <ProjectDialog open={!!editingProject} onOpenChange={(o) => !o && setEditingProject(undefined)} project={editingProject} />
      <TaskDialog
        open={!!creatingTaskFor}
        onOpenChange={(o) => !o && setCreatingTaskFor(null)}
        defaultProjectId={creatingTaskFor ?? undefined}
      />
    </div>
  );
}
