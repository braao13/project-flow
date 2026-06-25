import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ProjectDialog } from "@/components/projetin/ProjectDialog";
import type { Project } from "@/lib/types";

export const Route = createFileRoute("/projetos/")({
  head: () => ({
    meta: [
      { title: "Projetos — Projetin" },
      { name: "description", content: "Liste, crie e gerencie seus projetos." },
    ],
  }),
  component: ProjectsList,
});

function ProjectsList() {
  const { state, deleteProject } = useStore();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Project | undefined>();

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight">Projetos</h1>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4 mr-1.5" /> Novo projeto
        </Button>
      </header>

      {state.projects.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">Nenhum projeto ainda. Crie o primeiro!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.projects.map((p) => {
            const tasks = state.tasks.filter((t) => t.projectId === p.id);
            const done = tasks.filter((t) => t.status === "finalizada").length;
            const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
            return (
              <div key={p.id} className="group glass rounded-2xl p-5 hover:border-primary/40 transition relative">
                <div className="flex items-start justify-between gap-2">
                  <Link to="/projetos/$id" params={{ id: p.id }} className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate group-hover:text-primary transition">{p.name}</h3>
                    {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                  </Link>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => setEditing(p)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary">
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Excluir projeto "${p.name}" e todas as tasks?`)) deleteProject(p.id); }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{tasks.length} tasks · {done} finalizadas</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full transition-all" style={{ width: `${pct}%`, background: "var(--gradient-primary)" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProjectDialog open={creating} onOpenChange={setCreating} />
      <ProjectDialog open={!!editing} onOpenChange={(o) => !o && setEditing(undefined)} project={editing} />
    </div>
  );
}
