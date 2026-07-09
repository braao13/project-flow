export type TaskStatus = "andamento" | "finalizada" | "atrasada";
export type TaskPriority = "maxima" | "alta" | "nenhuma" | "baixa";

export interface Profile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
}

export interface Update {
  id: string;
  taskId: string;
  title: string;
  description?: string;
  date?: string; // ISO date (yyyy-mm-dd)
  done: boolean;
  createdAt: string;
  createdBy: string; // profile.id de quem criou a atualização
  responsibleUserId?: string | null; // Step 7 — responsável da atualização (opcional)
}

export interface Comment {
  id: string;
  taskId: string;
  text: string;
  createdAt: string;
  authorId: string;
}

export interface Attachment {
  id: string;
  taskId: string;
  name: string;
  type: string;
  size: number;
  /** Caminho do objeto no bucket "attachments" do Supabase Storage. */
  path: string;
  createdAt: string;
  uploadedBy: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string; // ISO
  dueDate?: string; // ISO ou undefined
  createdAt: string;
  createdBy: string; // Step 6 — quem criou a task
  responsibleUserId?: string | null; // Step 6 — responsável atual (pode ser reatribuído)
  /** Task anterior na sequência (cadeia simples A → B → C). Null = início de cadeia ou task isolada. */
  previousTaskId?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  ownerId: string;
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

/** Uma task é considerada atrasada se ainda não foi finalizada e a data de entrega já passou. */
export function isOverdue(task: Pick<Task, "status" | "dueDate">): boolean {
  if (task.status === "finalizada" || !task.dueDate) return false;
  const due = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

/** Status "efetivo" para exibição: iguala ao computeStatus antigo, mas sem mutar o servidor. */
export function effectiveStatus(task: Pick<Task, "status" | "dueDate">): TaskStatus {
  if (task.status === "finalizada") return "finalizada";
  return isOverdue(task) ? "atrasada" : "andamento";
}

/**
 * Ordena tasks respeitando a cadeia sequencial (previousTaskId).
 * Cada cadeia é colocada em sequência (início → fim); tasks sem vínculo
 * ficam ao final, na ordem original. Retorna também, para cada task, se ela
 * está diretamente conectada à PRÓXIMA task do array resultante — usado para
 * desenhar a seta de conexão entre balões.
 */
export function orderTasksByChain<T extends Pick<Task, "id" | "previousTaskId">>(
  tasks: T[],
): { task: T; connectedToNext: boolean }[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const nextOf = new Map<string, T>(); // previousTaskId -> task que o segue
  for (const t of tasks) {
    if (t.previousTaskId && byId.has(t.previousTaskId)) {
      nextOf.set(t.previousTaskId, t);
    }
  }

  const visited = new Set<string>();
  const ordered: T[] = [];

  // Início de cadeia = task sem previousTaskId válido, mas que é predecessora de alguma outra,
  // OU task isolada (sem previousTaskId e sem sucessora) — tratada depois.
  const heads = tasks.filter((t) => (!t.previousTaskId || !byId.has(t.previousTaskId)) && nextOf.has(t.id));

  for (const head of heads) {
    let cur: T | undefined = head;
    while (cur && !visited.has(cur.id)) {
      visited.add(cur.id);
      ordered.push(cur);
      cur = nextOf.get(cur.id);
    }
  }

  // Tasks isoladas (sem cadeia nenhuma) na ordem original, ao final.
  for (const t of tasks) {
    if (!visited.has(t.id)) {
      visited.add(t.id);
      ordered.push(t);
    }
  }

  return ordered.map((task, i) => {
    const next = ordered[i + 1];
    const connectedToNext = !!next && next.previousTaskId === task.id;
    return { task, connectedToNext };
  });
}
