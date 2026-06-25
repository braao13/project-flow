import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useProject, useStore } from "@/lib/store";
import { TaskAccordion } from "@/components/projetin/TaskAccordion";
import { TaskDialog } from "@/components/projetin/TaskDialog";
import { ProjectDialog } from "@/components/projetin/ProjectDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/projetos/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Projeto — Projetin` },
      { name: "description", content: `Tasks e timeline do projeto ${params.id}.` },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const project = useProject(id);
  const { getTasksByProject, deleteProject } = useStore();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState<"todas" | "andamento" | "finalizada" | "atrasada">("todas");

  const tasks = useMemo(() => {
    if (!project) return [];
    const list = getTasksByProject(project.id);
    const filtered = filter === "todas" ? list : list.filter((t) => t.status === filter);
    const priorityOrder = { maxima: 0, alta: 1, nenhuma: 2, baixa: 3 };
    return [...filtered].sort((a, b) => {
      if (a.status === "finalizada" && b.status !== "finalizada") return 1;
      if (b.status === "finalizada" && a.status !== "finalizada") return -1;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [project, getTasksByProject, filter]);

  if (!project) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-muted-foreground">Projeto não encontrado.</p>
        <Link to="/projetos" className="text-primary hover:underline mt-2 inline-block">Voltar</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/projetos" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="size-3.5" /> Projetos
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight truncate">{project.name}</h1>
          {project.description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{project.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-4 mr-1.5" /> Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm(`Excluir projeto "${project.name}"?`)) {
                deleteProject(project.id);
                navigate({ to: "/projetos" });
              }
            }}
          >
            <Trash2 className="size-4 mr-1.5" /> Excluir
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4 mr-1.5" /> Nova task
          </Button>
        </div>
      </header>

      <div className="flex items-center justify-between gap-3">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as tasks</SelectItem>
            <SelectItem value="andamento">🟡 Em andamento</SelectItem>
            <SelectItem value="finalizada">🟢 Finalizadas</SelectItem>
            <SelectItem value="atrasada">🔴 Atrasadas</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{tasks.length} task(s)</span>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center text-muted-foreground">Nenhuma task neste filtro.</div>
        ) : (
          tasks.map((t) => <TaskAccordion key={t.id} task={t} />)
        )}
      </div>

      <TaskDialog open={creating} onOpenChange={setCreating} defaultProjectId={project.id} />
      <ProjectDialog open={editing} onOpenChange={setEditing} project={project} />
    </div>
  );
}
