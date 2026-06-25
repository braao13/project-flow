export type TaskStatus = "andamento" | "finalizada" | "atrasada";
export type TaskPriority = "maxima" | "alta" | "nenhuma" | "baixa";

export interface Update {
  id: string;
  taskId: string;
  title: string;
  description?: string;
  date?: string; // ISO date (yyyy-mm-dd)
  done: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  text: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string; // local preview; future: Supabase Storage URL
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string; // ISO
  dueDate?: string; // ISO or undefined
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
}

export const PRIORITY_META: Record<TaskPriority, { label: string; icon: string; color: string }> = {
  maxima: { label: "Prioridade Máxima", icon: "‼️", color: "var(--danger)" },
  alta: { label: "Prioridade", icon: "❗", color: "var(--warning)" },
  nenhuma: { label: "Sem Prioridade", icon: "↔️", color: "var(--muted-foreground)" },
  baixa: { label: "Baixa Prioridade", icon: "⬇️", color: "var(--chart-5)" },
};

export const STATUS_META: Record<TaskStatus, { label: string; color: string; dot: string }> = {
  finalizada: { label: "Finalizada", color: "var(--success)", dot: "🟢" },
  andamento: { label: "Em andamento", color: "var(--warning)", dot: "🟡" },
  atrasada: { label: "Atrasada", color: "var(--danger)", dot: "🔴" },
};
