import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AssigneeBadge } from "./badges";

const UNASSIGNED = "__unassigned__";

export function TaskTimeline({ taskId }: { taskId: string }) {
  const { state, currentUserId, getUpdatesByTask, createUpdate, toggleUpdate, deleteUpdate, setUpdateResponsible } = useStore();
  const updates = getUpdatesByTask(taskId);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState<string>(currentUserId ?? UNASSIGNED);

  const submit = () => {
    if (!title.trim()) return;
    createUpdate({
      taskId,
      title: title.trim(),
      description: description.trim() || undefined,
      date: date || undefined,
      responsibleUserId: responsibleUserId === UNASSIGNED ? null : responsibleUserId,
    });
    setTitle("");
    setDescription("");
    setDate("");
    setResponsibleUserId(currentUserId ?? UNASSIGNED);
    setAdding(false);
  };

  return (
    <div className="relative pl-6">
      {updates.length > 0 && (
        <div className="absolute left-[10px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/60 via-border to-transparent" />
      )}
      <ul className="space-y-3">
        {updates.map((u) => {
          const assignee = state.profiles.find((p) => p.id === u.responsibleUserId);
          return (
            <li key={u.id} className="relative group">
              <button
                onClick={() => toggleUpdate(u.id)}
                className={cn(
                  "absolute -left-6 top-1.5 size-4 rounded-full border-2 grid place-items-center transition-all",
                  u.done
                    ? "bg-primary border-primary text-primary-foreground shadow-glow"
                    : "border-border bg-background hover:border-primary",
                )}
                aria-label={u.done ? "Desmarcar" : "Concluir"}
              >
                {u.done && <Check className="size-2.5" strokeWidth={3} />}
              </button>
              <div className="glass rounded-lg p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className={cn("text-sm font-medium", u.done && "line-through text-muted-foreground")}>{u.title}</div>
                  {u.description && <div className="text-xs text-muted-foreground mt-0.5">{u.description}</div>}
                  <div className="flex items-center gap-2 mt-1.5">
                    {u.date && (
                      <span className="text-[11px] text-muted-foreground">
                        {format(parseISO(u.date), "dd 'de' MMM", { locale: ptBR })}
                      </span>
                    )}
                    <Select
                      value={u.responsibleUserId ?? UNASSIGNED}
                      onValueChange={(v) => setUpdateResponsible(u.id, v === UNASSIGNED ? null : v)}
                    >
                      <SelectTrigger className="h-6 w-auto gap-1.5 border-none bg-transparent px-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/60">
                        <AssigneeBadge profile={assignee} size="xs" />
                        <SelectValue placeholder="Sem responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED}>Sem responsável</SelectItem>
                        {state.profiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <button
                  onClick={() => deleteUpdate(u.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          );
        })}
        {updates.length === 0 && !adding && (
          <li className="text-xs text-muted-foreground italic">Nenhuma atualização ainda.</li>
        )}
      </ul>

      {adding ? (
        <div className="mt-3 glass rounded-lg p-3 space-y-2">
          <Input placeholder="Título da atualização" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <Textarea placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Select value={responsibleUserId} onValueChange={setResponsibleUserId}>
              <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Sem responsável</SelectItem>
                {state.profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button size="sm" onClick={submit}>Adicionar</Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition"
        >
          <Plus className="size-3.5" /> Nova atualização
        </button>
      )}
    </div>
  );
}
