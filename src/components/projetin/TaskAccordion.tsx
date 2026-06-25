import { useState } from "react";
import { ChevronRight, MessageSquare, Paperclip, Pencil, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Task } from "@/lib/types";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PriorityBadge, StatusBadge } from "./badges";
import { TaskTimeline } from "./TaskTimeline";
import { TaskComments } from "./TaskComments";
import { TaskAttachments } from "./TaskAttachments";
import { TaskDialog } from "./TaskDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export function TaskAccordion({ task, defaultOpen = false }: { task: Task; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const { deleteTask, toggleTaskDone, getUpdatesByTask, getCommentsByTask, getAttachmentsByTask } = useStore();

  const updates = getUpdatesByTask(task.id);
  const doneCount = updates.filter((u) => u.done).length;
  const comments = getCommentsByTask(task.id);
  const attachments = getAttachmentsByTask(task.id);

  return (
    <div className="glass rounded-xl overflow-hidden transition-all hover:border-primary/30">
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={() => toggleTaskDone(task.id)}
          className={cn(
            "size-5 rounded-md border-2 grid place-items-center shrink-0 transition",
            task.status === "finalizada" ? "bg-primary border-primary" : "border-border hover:border-primary",
          )}
          aria-label="Concluir task"
        >
          {task.status === "finalizada" && (
            <svg className="size-3 text-primary-foreground" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M2.5 6.5L5 9l4.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <button onClick={() => setOpen((o) => !o)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
          <ChevronRight className={cn("size-4 text-muted-foreground transition-transform shrink-0", open && "rotate-90")} />
          <div className="min-w-0 flex-1">
            <div className={cn("font-medium truncate", task.status === "finalizada" && "line-through text-muted-foreground")}>
              {task.name}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {task.dueDate ? (
                <span>Entrega {format(parseISO(task.dueDate), "dd MMM", { locale: ptBR })}</span>
              ) : (
                <span className="italic">Sem prazo</span>
              )}
              {updates.length > 0 && <span>{doneCount}/{updates.length} atualizações</span>}
              {comments.length > 0 && <span className="inline-flex items-center gap-1"><MessageSquare className="size-3" />{comments.length}</span>}
              {attachments.length > 0 && <span className="inline-flex items-center gap-1"><Paperclip className="size-3" />{attachments.length}</span>}
            </div>
          </div>
        </button>

        <div className="hidden md:flex items-center gap-2 shrink-0">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary">
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={() => { if (confirm(`Excluir task "${task.name}"?`)) deleteTask(task.id); }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 p-4 space-y-4 bg-background/30">
          {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}

          <Tabs defaultValue="timeline">
            <TabsList className="bg-secondary/40">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="comments">Comentários ({comments.length})</TabsTrigger>
              <TabsTrigger value="files">Anexos ({attachments.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="mt-4">
              <TaskTimeline taskId={task.id} />
            </TabsContent>
            <TabsContent value="comments" className="mt-4">
              <TaskComments taskId={task.id} />
            </TabsContent>
            <TabsContent value="files" className="mt-4">
              <TaskAttachments taskId={task.id} />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Recolher</Button>
          </div>
        </div>
      )}

      <TaskDialog open={editing} onOpenChange={setEditing} task={task} />
    </div>
  );
}
