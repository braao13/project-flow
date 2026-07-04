import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Attachment, Comment, Project, Task, TaskPriority, TaskStatus, Update } from "./types";

// Persistência 100% local (localStorage). Sem login, sem RLS, sem backend.
// A API pública (StoreProvider / useStore) permanece a mesma para manter os
// componentes intactos.

interface State {
  projects: Project[];
  tasks: Task[];
  updates: Update[];
  comments: Comment[];
  attachments: Attachment[];
}

const EMPTY: State = { projects: [], tasks: [], updates: [], comments: [], attachments: [] };
const STORAGE_KEY = "projetin.state.v1";

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
  loading: boolean;
  createProject: (data: Omit<Project, "id" | "createdAt">) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  createTask: (data: Omit<Task, "id" | "createdAt" | "status"> & { status?: TaskStatus }) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskDone: (id: string) => void;
  setTaskPriority: (id: string, p: TaskPriority) => void;
  createUpdate: (data: Omit<Update, "id" | "createdAt" | "done"> & { done?: boolean }) => Promise<Update>;
  updateUpdate: (id: string, data: Partial<Update>) => void;
  deleteUpdate: (id: string) => void;
  toggleUpdate: (id: string) => void;
  addComment: (taskId: string, text: string) => void;
  deleteComment: (id: string) => void;
  addAttachment: (taskId: string, file: File) => Promise<void>;
  deleteAttachment: (id: string) => void;
  getTasksByProject: (projectId: string) => Task[];
  getUpdatesByTask: (taskId: string) => Update[];
  getCommentsByTask: (taskId: string) => Comment[];
  getAttachmentsByTask: (taskId: string) => Attachment[];
}

const StoreContext = createContext<StoreApi | null>(null);

function loadState(): State {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<State>;
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const uid = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36));

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setState(loadState());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // quota / privacy mode — ignora
    }
  }, [state, loading]);

  // Detecção automática de "atrasada".
  useEffect(() => {
    setState((s) => {
      let mudou = false;
      const tasks = s.tasks.map((t) => {
        const next = computeStatus(t);
        if (next !== t.status && t.status !== "finalizada") {
          mudou = true;
          return { ...t, status: next };
        }
        return t;
      });
      return mudou ? { ...s, tasks } : s;
    });
  }, []);

  // ---------- projects ----------
  const createProject = useCallback(async (data: Omit<Project, "id" | "createdAt">) => {
    const project: Project = { id: uid(), createdAt: new Date().toISOString(), ...data };
    setState((s) => ({ ...s, projects: [...s.projects, project] }));
    return project;
  }, []);

  const updateProject = useCallback((id: string, data: Partial<Project>) => {
    setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...data } : p)) }));
  }, []);

  const deleteProject = useCallback((id: string) => {
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
  }, []);

  // ---------- tasks ----------
  const createTask = useCallback(
    async (data: Omit<Task, "id" | "createdAt" | "status"> & { status?: TaskStatus }) => {
      const base: Task = { id: uid(), createdAt: new Date().toISOString(), status: data.status ?? "andamento", ...data };
      base.status = computeStatus(base);
      setState((s) => ({ ...s, tasks: [...s.tasks, base] }));
      return base;
    },
    [],
  );

  const updateTask = useCallback((id: string, data: Partial<Task>) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const merged = { ...t, ...data };
        if (!("status" in data)) merged.status = computeStatus(merged);
        return merged;
      }),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.filter((t) => t.id !== id),
      updates: s.updates.filter((u) => u.taskId !== id),
      comments: s.comments.filter((c) => c.taskId !== id),
      attachments: s.attachments.filter((a) => a.taskId !== id),
    }));
  }, []);

  const toggleTaskDone = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const nextStatus: TaskStatus = t.status === "finalizada" ? computeStatus({ ...t, status: "andamento" }) : "finalizada";
        return { ...t, status: nextStatus };
      }),
    }));
  }, []);

  const setTaskPriority = useCallback(
    (id: string, p: TaskPriority) => updateTask(id, { priority: p }),
    [updateTask],
  );

  // ---------- updates (timeline) ----------
  const createUpdate = useCallback(
    async (data: Omit<Update, "id" | "createdAt" | "done"> & { done?: boolean }) => {
      const update: Update = { id: uid(), createdAt: new Date().toISOString(), done: data.done ?? false, ...data };
      setState((s) => ({ ...s, updates: [...s.updates, update] }));
      return update;
    },
    [],
  );

  const updateUpdate = useCallback((id: string, data: Partial<Update>) => {
    setState((s) => ({ ...s, updates: s.updates.map((u) => (u.id === id ? { ...u, ...data } : u)) }));
  }, []);

  const deleteUpdate = useCallback((id: string) => {
    setState((s) => ({ ...s, updates: s.updates.filter((u) => u.id !== id) }));
  }, []);

  const toggleUpdate = useCallback((id: string) => {
    setState((s) => ({ ...s, updates: s.updates.map((u) => (u.id === id ? { ...u, done: !u.done } : u)) }));
  }, []);

  // ---------- comments ----------
  const addComment = useCallback((taskId: string, text: string) => {
    const comment: Comment = { id: uid(), taskId, text, createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, comments: [...s.comments, comment] }));
  }, []);

  const deleteComment = useCallback((id: string) => {
    setState((s) => ({ ...s, comments: s.comments.filter((c) => c.id !== id) }));
  }, []);

  // ---------- attachments ----------
  const addAttachment = useCallback(async (taskId: string, file: File) => {
    const dataUrl = await readFileAsDataUrl(file);
    const attachment: Attachment = {
      id: uid(),
      taskId,
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl,
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({ ...s, attachments: [...s.attachments, attachment] }));
  }, []);

  const deleteAttachment = useCallback((id: string) => {
    setState((s) => ({ ...s, attachments: s.attachments.filter((a) => a.id !== id) }));
  }, []);

  // ---------- getters derivados ----------
  const getTasksByProject = useCallback((projectId: string) => state.tasks.filter((t) => t.projectId === projectId), [state.tasks]);
  const getUpdatesByTask = useCallback(
    (taskId: string) => state.updates.filter((u) => u.taskId === taskId).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)),
    [state.updates],
  );
  const getCommentsByTask = useCallback(
    (taskId: string) => state.comments.filter((c) => c.taskId === taskId).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)),
    [state.comments],
  );
  const getAttachmentsByTask = useCallback(
    (taskId: string) => state.attachments.filter((a) => a.taskId === taskId).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)),
    [state.attachments],
  );

  const api = useMemo<StoreApi>(
    () => ({
      state,
      loading,
      createProject,
      updateProject,
      deleteProject,
      createTask,
      updateTask,
      deleteTask,
      toggleTaskDone,
      setTaskPriority,
      createUpdate,
      updateUpdate,
      deleteUpdate,
      toggleUpdate,
      addComment,
      deleteComment,
      addAttachment,
      deleteAttachment,
      getTasksByProject,
      getUpdatesByTask,
      getCommentsByTask,
      getAttachmentsByTask,
    }),
    [
      state,
      loading,
      createProject,
      updateProject,
      deleteProject,
      createTask,
      updateTask,
      deleteTask,
      toggleTaskDone,
      setTaskPriority,
      createUpdate,
      updateUpdate,
      deleteUpdate,
      toggleUpdate,
      addComment,
      deleteComment,
      addAttachment,
      deleteAttachment,
      getTasksByProject,
      getUpdatesByTask,
      getCommentsByTask,
      getAttachmentsByTask,
    ],
  );

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
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }, []);
}
