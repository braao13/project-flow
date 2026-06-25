import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Attachment, Comment, Project, Task, TaskPriority, TaskStatus, Update } from "./types";

// Future-ready: this store layer abstracts persistence so it can be swapped
// for Supabase (Lovable Cloud) in phase 2/3 without touching components.

const STORAGE_KEY = "projetin:v1";

interface State {
  projects: Project[];
  tasks: Task[];
  updates: Update[];
  comments: Comment[];
  attachments: Attachment[];
}

const emptyState: State = { projects: [], tasks: [], updates: [], comments: [], attachments: [] };

function seed(): State {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const addDays = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return iso(d);
  };
  const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

  const p1: Project = { id: "p1", name: "Projetin Web", description: "App de gestão de projetos", color: "#a78bfa", createdAt: iso(now) };
  const p2: Project = { id: "p2", name: "Marketing Q1", description: "Campanhas e conteúdo", color: "#34d399", createdAt: iso(now) };

  const t1: Task = { id: "t1", projectId: "p1", name: "Dashboard Financeiro", description: "Construir telas e gráficos", status: "andamento", priority: "alta", startDate: iso(now), dueDate: addDays(5), createdAt: iso(now) };
  const t2: Task = { id: "t2", projectId: "p1", name: "Integração API", status: "andamento", priority: "maxima", startDate: iso(now), dueDate: addDays(-1), createdAt: iso(now) };
  const t3: Task = { id: "t3", projectId: "p2", name: "Landing page", status: "finalizada", priority: "nenhuma", startDate: iso(now), dueDate: addDays(-3), createdAt: iso(now) };
  const t4: Task = { id: "t4", projectId: "p2", name: "Posts Instagram", status: "andamento", priority: "baixa", startDate: iso(now), createdAt: iso(now) };

  const updates: Update[] = [
    { id: "u1", taskId: "t1", title: "Layout criado", done: true, createdAt: iso(now), date: dateOnly(new Date(now.getTime() - 86400000)) },
    { id: "u2", taskId: "t1", title: "API solicitada", done: true, createdAt: iso(now) },
    { id: "u3", taskId: "t1", title: "Aguardando backend", done: false, createdAt: iso(now), date: dateOnly(now) },
    { id: "u4", taskId: "t1", title: "Testes", done: false, createdAt: iso(now), date: dateOnly(new Date(now.getTime() + 2 * 86400000)) },
    { id: "u5", taskId: "t2", title: "Definir contratos", done: false, createdAt: iso(now), date: dateOnly(now) },
  ];

  return { projects: [p1, p2], tasks: [t1, t2, t3, t4], updates, comments: [], attachments: [] };
}

function load(): State {
  if (typeof window === "undefined") return emptyState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    return { ...emptyState, ...JSON.parse(raw) };
  } catch {
    return seed();
  }
}

function save(state: State) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function computeStatus(task: Task): TaskStatus {
  if (task.status === "finalizada") return "finalizada";
  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due < today) return "atrasada";
  }
  return "andamento";
}

interface StoreApi {
  state: State;
  // projects
  createProject: (data: Omit<Project, "id" | "createdAt">) => Project;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  // tasks
  createTask: (data: Omit<Task, "id" | "createdAt" | "status"> & { status?: TaskStatus }) => Task;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskDone: (id: string) => void;
  setTaskPriority: (id: string, p: TaskPriority) => void;
  // updates
  createUpdate: (data: Omit<Update, "id" | "createdAt" | "done"> & { done?: boolean }) => Update;
  updateUpdate: (id: string, data: Partial<Update>) => void;
  deleteUpdate: (id: string) => void;
  toggleUpdate: (id: string) => void;
  // comments
  addComment: (taskId: string, text: string) => void;
  deleteComment: (id: string) => void;
  // attachments
  addAttachment: (taskId: string, file: File) => Promise<void>;
  deleteAttachment: (id: string) => void;
  // derived helpers
  getTasksByProject: (projectId: string) => Task[];
  getUpdatesByTask: (taskId: string) => Update[];
  getCommentsByTask: (taskId: string) => Comment[];
  getAttachmentsByTask: (taskId: string) => Attachment[];
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(emptyState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  // auto-recompute status on hydration / every change (atrasada detection)
  useEffect(() => {
    if (!hydrated) return;
    setState((s) => {
      let changed = false;
      const tasks = s.tasks.map((t) => {
        const ns = computeStatus(t);
        if (ns !== t.status && t.status !== "finalizada") {
          changed = true;
          return { ...t, status: ns };
        }
        return t;
      });
      return changed ? { ...s, tasks } : s;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (hydrated) save(state);
  }, [state, hydrated]);

  const api = useMemo<StoreApi>(() => {
    const now = () => new Date().toISOString();

    return {
      state,
      createProject: (data) => {
        const project: Project = { id: uid(), createdAt: now(), ...data };
        setState((s) => ({ ...s, projects: [...s.projects, project] }));
        return project;
      },
      updateProject: (id, data) => {
        setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...data } : p)) }));
      },
      deleteProject: (id) => {
        setState((s) => {
          const taskIds = s.tasks.filter((t) => t.projectId === id).map((t) => t.id);
          return {
            ...s,
            projects: s.projects.filter((p) => p.id !== id),
            tasks: s.tasks.filter((t) => t.projectId !== id),
            updates: s.updates.filter((u) => !taskIds.includes(u.taskId)),
            comments: s.comments.filter((c) => !taskIds.includes(c.taskId)),
            attachments: s.attachments.filter((a) => !taskIds.includes(a.taskId)),
          };
        });
      },
      createTask: (data) => {
        const task: Task = { id: uid(), createdAt: now(), status: data.status ?? "andamento", ...data };
        task.status = computeStatus(task);
        setState((s) => ({ ...s, tasks: [...s.tasks, task] }));
        return task;
      },
      updateTask: (id, data) => {
        setState((s) => ({
          ...s,
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const merged = { ...t, ...data } as Task;
            merged.status = data.status ?? computeStatus(merged);
            return merged;
          }),
        }));
      },
      deleteTask: (id) => {
        setState((s) => ({
          ...s,
          tasks: s.tasks.filter((t) => t.id !== id),
          updates: s.updates.filter((u) => u.taskId !== id),
          comments: s.comments.filter((c) => c.taskId !== id),
          attachments: s.attachments.filter((a) => a.taskId !== id),
        }));
      },
      toggleTaskDone: (id) => {
        setState((s) => ({
          ...s,
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            if (t.status === "finalizada") {
              const next = { ...t, status: "andamento" as TaskStatus };
              next.status = computeStatus(next);
              return next;
            }
            return { ...t, status: "finalizada" as TaskStatus };
          }),
        }));
      },
      setTaskPriority: (id, p) => {
        setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, priority: p } : t)) }));
      },
      createUpdate: (data) => {
        const upd: Update = { id: uid(), createdAt: now(), done: data.done ?? false, ...data };
        setState((s) => ({ ...s, updates: [...s.updates, upd] }));
        return upd;
      },
      updateUpdate: (id, data) => {
        setState((s) => ({ ...s, updates: s.updates.map((u) => (u.id === id ? { ...u, ...data } : u)) }));
      },
      deleteUpdate: (id) => {
        setState((s) => ({ ...s, updates: s.updates.filter((u) => u.id !== id) }));
      },
      toggleUpdate: (id) => {
        setState((s) => ({ ...s, updates: s.updates.map((u) => (u.id === id ? { ...u, done: !u.done } : u)) }));
      },
      addComment: (taskId, text) => {
        const c: Comment = { id: uid(), taskId, text, createdAt: now() };
        setState((s) => ({ ...s, comments: [...s.comments, c] }));
      },
      deleteComment: (id) => {
        setState((s) => ({ ...s, comments: s.comments.filter((c) => c.id !== id) }));
      },
      addAttachment: async (taskId, file) => {
        // Local-only for now. Phase X: upload to Supabase Storage and store URL.
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(file);
        });
        const a: Attachment = {
          id: uid(),
          taskId,
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl,
          createdAt: now(),
        };
        setState((s) => ({ ...s, attachments: [...s.attachments, a] }));
      },
      deleteAttachment: (id) => {
        setState((s) => ({ ...s, attachments: s.attachments.filter((a) => a.id !== id) }));
      },
      getTasksByProject: (projectId) => state.tasks.filter((t) => t.projectId === projectId),
      getUpdatesByTask: (taskId) =>
        state.updates
          .filter((u) => u.taskId === taskId)
          .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)),
      getCommentsByTask: (taskId) =>
        state.comments.filter((c) => c.taskId === taskId).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)),
      getAttachmentsByTask: (taskId) =>
        state.attachments.filter((a) => a.taskId === taskId).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)),
    };
  }, [state]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function useProject(id: string | undefined) {
  const { state } = useStore();
  return useMemo(() => state.projects.find((p) => p.id === id), [state.projects, id]);
}

export function useTask(id: string | undefined) {
  const { state } = useStore();
  return useMemo(() => state.tasks.find((t) => t.id === id), [state.tasks, id]);
}

export function useReset() {
  return useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }, []);
}
