import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  project?: Project;
}

export function ProjectDialog({ open, onOpenChange, project }: Props) {
  const { createProject, updateProject } = useStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setName(project?.name ?? "");
      setDescription(project?.description ?? "");
    }
  }, [open, project]);

  const submit = () => {
    if (!name.trim()) return;
    if (project) updateProject(project.id, { name: name.trim(), description: description.trim() || undefined });
    else createProject({ name: name.trim(), description: description.trim() || undefined });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle>{project ? "Editar projeto" : "Novo projeto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex: Projetin Web" />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição (opcional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>{project ? "Salvar" : "Criar projeto"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
