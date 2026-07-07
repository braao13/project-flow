import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { TaskPriority } from "@/lib/types";
import { PRIORITY_META } from "@/lib/types";
import { TaskAccordion } from "@/components/projetin/TaskAccordion";
import { TaskDialog } from "@/components/projetin/TaskDialog";
import { ProjectDialog } from "@/components/projetin/ProjectDialog";
import { AssigneeBadge } from "@/components/projetin/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const ALL = "todas";

function ProjectDetail() {
  const { id } = Route.useParams();
  const { state, getTasksByProject, deleteProject } = useStore();
  const project = state.projects.find((p) => p.id === id);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);

  // Step 9 — filtros: status (já existia), responsável, prioridade e busca por nome.
  const [statusFilter, setStatusFilter] = useState<"todas" | "andamento" | "finalizada" | "atrasada">("todas");
  const [responsibleFilter, setResponsibleFilter] = useState<string>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "todas">("todas");
  const [search, setSearch] = useState("");

  const tasks = useMemo(() => {
    if (!project) return [];
    let list = getTasksByProject(project.id);

    if (statusFilter !== "todas") list = list.filter((t) => t.status === statusFilter);
    if (responsibleFilter !== ALL) list = list.filter((t) => t.responsibleUserId === responsibleFilter);
    if (priorityFilter !== "todas") list = list.filter((t) => t.priority === priorityFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }

    const priorityOrder = { maxima: 0, alta: 1, nenhuma: 2, baixa: 3 };
    return [...list].sort((a, b) => {
      if (a.status === "finalizada" && b.status !== "finalizada") return 1;
      if (b.status === "finalizada" && a.status !== "finalizada") return -1;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [project, getTasksByProject, statusFilter, responsibleFilter, priorityFilter, search]);

  const hasActiveFilters = statusFilter !== "todas" || responsibleFilter !== ALL || priorityFilter !== "todas" || search.trim() !== "";

  const clearFilters = () => {
    setStatusFilter("todas");
    setResponsibleFilter(ALL);
    setPriorityFilter("todas");
    setSearch("");
  };

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

      {/* ===== Filtros (Step 9) ===== */}
      <div className="glass rounded-xl p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou descrição..."
            className="pl-8 h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos os status</SelectItem>
            <SelectItem value="andamento">🟡 Em andamento</SelectItem>
            <SelectItem value="finalizada">🟢 Finalizadas</SelectItem>
            <SelectItem value="atrasada">🔴 Atrasadas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as prioridades</SelectItem>
            {Object.entries(PRIORITY_META).map(([k, m]) => (
              <SelectItem key={k} value={k}>{m.icon} {m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os responsáveis</SelectItem>
            {state.profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="inline-flex items-center gap-2">
                  <AssigneeBadge profile={p} size="xs" />
                  {p.fullName}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
            <X className="size-3.5 mr-1" /> Limpar
          </Button>
        )}

        <span className="text-sm text-muted-foreground ml-auto shrink-0">{tasks.length} task(s)</span>
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
