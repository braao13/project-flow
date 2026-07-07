import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { Task, TaskPriority } from "@/lib/types";
import { PRIORITY_META } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AssigneeBadge } from "./badges";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultProjectId?: string;
  task?: Task;
}

const UNASSIGNED = "__unassigned__";

export function TaskDialog({ open, onOpenChange, defaultProjectId, task }: Props) {
  const { state, currentUserId, createTask, updateTask, setTaskResponsible } = useStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? state.projects[0]?.id ?? "");
  const [priority, setPriority] = useState<TaskPriority>("nenhuma");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState<string>(currentUserId ?? UNASSIGNED);

  useEffect(() => {
    if (open) {
      setName(task?.name ?? "");
      setDescription(task?.description ?? "");
      setProjectId(task?.projectId ?? defaultProjectId ?? state.projects[0]?.id ?? "");
      setPriority(task?.priority ?? "nenhuma");
      setStartDate(task?.startDate ? task.startDate.slice(0, 10) : "");
      setDueDate(task?.dueDate ? task.dueDate.slice(0, 10) : "");
      setResponsibleUserId(task ? (task.responsibleUserId ?? UNASSIGNED) : (currentUserId ?? UNASSIGNED));
    }
  }, [open, task, defaultProjectId, state.projects, currentUserId]);

  const submit = () => {
    if (!name.trim() || !projectId) return;
    const start = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
    const due = dueDate ? new Date(dueDate).toISOString() : undefined;
    const resolvedResponsible = responsibleUserId === UNASSIGNED ? null : responsibleUserId;

    if (task) {
      updateTask(task.id, { name: name.trim(), description: description.trim() || undefined, priority, startDate: start, dueDate: due });
      if (resolvedResponsible !== (task.responsibleUserId ?? null)) {
        setTaskResponsible(task.id, resolvedResponsible);
      }
    } else {
      createTask({
        name: name.trim(),
        description: description.trim() || undefined,
        projectId,
        priority,
        startDate: start,
        dueDate: due,
        responsibleUserId: resolvedResponsible,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Editar task" : "Nova task"}</DialogTitle>
          <DialogDescription>Defina os detalhes. As atualizações da timeline ficam dentro da task.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex: Dashboard Financeiro" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Projeto</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Projeto" /></SelectTrigger>
                <SelectContent>
                  {state.projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_META).map(([k, m]) => (
                    <SelectItem key={k} value={k}>{m.icon} {m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select value={responsibleUserId} onValueChange={setResponsibleUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Sem responsável</SelectItem>
                {state.profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="inline-flex items-center gap-2">
                      <AssigneeBadge profile={p} size="xs" />
                      {p.fullName}
                      {p.id === currentUserId && <span className="text-muted-foreground">(você)</span>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Quem for atribuído aqui vê esta task em "Minhas Atribuições" no Dashboard.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Vazio = hoje</p>
            </div>
            <div className="space-y-1.5">
              <Label>Data entrega</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Vazio = sem prazo</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>{task ? "Salvar" : "Criar task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
