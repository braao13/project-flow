import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  Attachment,
  Comment,
  Profile,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  Update,
} from "./types";
import { effectiveStatus } from "./types";

// Persistência 100% local (localStorage). Sem Supabase / sem autenticação.

interface State {
  projects: Project[];
  tasks: Task[];
  updates: Update[];
  comments: Comment[];
  attachments: Attachment[];
  profiles: Profile[];
  /** Conteúdo (data URL) dos anexos, indexado por path. Vive à parte para não inchar o estado principal. */
  attachmentBlobs: Record<string, string>;
}

const STORAGE_KEY = "projetin.state.v1";

const LOCAL_USER: Profile = {
  id: "local-user",
  username: "voce",
  fullName: "Você",
  email: "voce@projetin.local",
  avatarUrl: null,
};

const EMPTY: State = {
  projects: [],
  tasks: [],
  updates: [],
  comments: [],
  attachments: [],
  profiles: [LOCAL_USER],
  attachmentBlobs: {},
};

function loadState(): State {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      projects: parsed.projects ?? [],
      tasks: parsed.tasks ?? [],
      updates: parsed.updates ?? [],
      comments: parsed.comments ?? [],
      attachments: parsed.attachments ?? [],
      profiles: parsed.profiles && parsed.profiles.length > 0 ? parsed.profiles : [LOCAL_USER],
      attachmentBlobs: parsed.attachmentBlobs ?? {},
    };
  } catch {
    return EMPTY;
  }
}

function saveState(state: State) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ---------- API pública ----------

interface StoreApi {
  state: State;
  loading: boolean;
  currentUserId: string | undefined;

  createProject: (data: { name: string; description?: string; color?: string }) => Promise<Project>;
  updateProject: (id: string, data: Partial<Pick<Project, "name" | "description" | "color">>) => void;
  deleteProject: (id: string) => void;

  createTask: (data: {
    projectId: string;
    name: string;
    description?: string;
    priority?: TaskPriority;
    startDate: string;
    dueDate?: string;
    responsibleUserId?: string | null;
  }) => Promise<Task>;
  updateTask: (
    id: string,
    data: Partial<Pick<Task, "name" | "description" | "priority" | "startDate" | "dueDate" | "status">>,
  ) => void;
  deleteTask: (id: string) => void;
  toggleTaskDone: (id: string) => void;
  setTaskPriority: (id: string, p: TaskPriority) => void;
  setTaskResponsible: (id: string, responsibleUserId: string | null) => void;

  createUpdate: (data: {
    taskId: string;
    title: string;
    description?: string;
    date?: string;
    responsibleUserId?: string | null;
  }) => Promise<Update>;
  updateUpdate: (id: string, data: Partial<Pick<Update, "title" | "description" | "date">>) => void;
  deleteUpdate: (id: string) => void;
  toggleUpdate: (id: string) => void;
  setUpdateResponsible: (id: string, responsibleUserId: string | null) => void;

  addComment: (taskId: string, text: string) => void;
  deleteComment: (id: string) => void;

  addAttachment: (taskId: string, file: File) => Promise<void>;
  deleteAttachment: (id: string) => void;
  getAttachmentUrl: (path: string) => Promise<string | null>;

  getTasksByProject: (projectId: string) => Task[];
  getUpdatesByTask: (taskId: string) => Update[];
  getCommentsByTask: (taskId: string) => Comment[];
  getAttachmentsByTask: (taskId: string) => Attachment[];
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setState(loadState());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    saveState(state);
  }, [state, loading]);

  const currentUserId = LOCAL_USER.id;

  const api = useMemo<StoreApi>(() => {
    const update = (fn: (s: State) => State) => setState((prev) => fn(prev));

    return {
      state,
      loading,
      currentUserId,

      // ---------- projects ----------
      createProject: async ({ name, description, color }) => {
        const project: Project = {
          id: newId(),
          name,
          description,
          color,
          createdAt: nowIso(),
          ownerId: currentUserId,
        };
        update((s) => ({ ...s, projects: [...s.projects, project] }));
        return project;
      },
      updateProject: (id, data) => {
        update((s) => ({
          ...s,
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...data } : p)),
        }));
      },
      deleteProject: (id) => {
        update((s) => {
          const taskIds = new Set(s.tasks.filter((t) => t.projectId === id).map((t) => t.id));
          return {
            ...s,
            projects: s.projects.filter((p) => p.id !== id),
            tasks: s.tasks.filter((t) => t.projectId !== id),
            updates: s.updates.filter((u) => !taskIds.has(u.taskId)),
            comments: s.comments.filter((c) => !taskIds.has(c.taskId)),
            attachments: s.attachments.filter((a) => !taskIds.has(a.taskId)),
          };
        });
      },

      // ---------- tasks ----------
      createTask: async ({ projectId, name, description, priority, startDate, dueDate, responsibleUserId }) => {
        const task: Task = {
          id: newId(),
          projectId,
          name,
          description,
          status: "andamento",
          priority: priority ?? "nenhuma",
          startDate,
          dueDate,
          createdAt: nowIso(),
          createdBy: currentUserId,
          responsibleUserId: responsibleUserId ?? currentUserId,
        };
        update((s) => ({ ...s, tasks: [...s.tasks, task] }));
        return task;
      },
      updateTask: (id, data) => {
        update((s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
        }));
      },
      deleteTask: (id) => {
        update((s) => ({
          ...s,
          tasks: s.tasks.filter((t) => t.id !== id),
          updates: s.updates.filter((u) => u.taskId !== id),
          comments: s.comments.filter((c) => c.taskId !== id),
          attachments: s.attachments.filter((a) => a.taskId !== id),
        }));
      },
      toggleTaskDone: (id) => {
        update((s) => ({
          ...s,
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const newStatus: TaskStatus = t.status === "finalizada" ? effectiveStatus({ status: "andamento", dueDate: t.dueDate }) : "finalizada";
            return { ...t, status: newStatus };
          }),
        }));
      },
      setTaskPriority: (id, p) => {
        update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, priority: p } : t)) }));
      },
      setTaskResponsible: (id, responsibleUserId) => {
        update((s) => ({
          ...s,
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, responsibleUserId } : t)),
        }));
      },

      // ---------- updates ----------
      createUpdate: async ({ taskId, title, description, date, responsibleUserId }) => {
        const upd: Update = {
          id: newId(),
          taskId,
          title,
          description,
          date,
          done: false,
          createdAt: nowIso(),
          createdBy: currentUserId,
          responsibleUserId: responsibleUserId ?? null,
        };
        update((s) => ({ ...s, updates: [...s.updates, upd] }));
        return upd;
      },
      updateUpdate: (id, data) => {
        update((s) => ({
          ...s,
          updates: s.updates.map((u) => (u.id === id ? { ...u, ...data } : u)),
        }));
      },
      deleteUpdate: (id) => {
        update((s) => ({ ...s, updates: s.updates.filter((u) => u.id !== id) }));
      },
      toggleUpdate: (id) => {
        update((s) => ({
          ...s,
          updates: s.updates.map((u) => (u.id === id ? { ...u, done: !u.done } : u)),
        }));
      },
      setUpdateResponsible: (id, responsibleUserId) => {
        update((s) => ({
          ...s,
          updates: s.updates.map((u) => (u.id === id ? { ...u, responsibleUserId } : u)),
        }));
      },

      // ---------- comments ----------
      addComment: (taskId, text) => {
        const c: Comment = {
          id: newId(),
          taskId,
          text,
          createdAt: nowIso(),
          authorId: currentUserId,
        };
        update((s) => ({ ...s, comments: [...s.comments, c] }));
      },
      deleteComment: (id) => {
        update((s) => ({ ...s, comments: s.comments.filter((c) => c.id !== id) }));
      },

      // ---------- attachments ----------
      addAttachment: async (taskId, file) => {
        const dataUrl = await readFileAsDataUrl(file);
        const path = `${taskId}/${newId()}-${file.name}`;
        const att: Attachment = {
          id: newId(),
          taskId,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          path,
          createdAt: nowIso(),
          uploadedBy: currentUserId,
        };
        update((s) => ({
          ...s,
          attachments: [...s.attachments, att],
          attachmentBlobs: { ...s.attachmentBlobs, [path]: dataUrl },
        }));
      },
      deleteAttachment: (id) => {
        update((s) => {
          const att = s.attachments.find((a) => a.id === id);
          const blobs = { ...s.attachmentBlobs };
          if (att) delete blobs[att.path];
          return {
            ...s,
            attachments: s.attachments.filter((a) => a.id !== id),
            attachmentBlobs: blobs,
          };
        });
      },
      getAttachmentUrl: async (path) => state.attachmentBlobs[path] ?? null,

      // ---------- selectors ----------
      getTasksByProject: (projectId) => state.tasks.filter((t) => t.projectId === projectId),
      getUpdatesByTask: (taskId) => state.updates.filter((u) => u.taskId === taskId),
      getCommentsByTask: (taskId) => state.comments.filter((c) => c.taskId === taskId),
      getAttachmentsByTask: (taskId) => state.attachments.filter((a) => a.taskId === taskId),
    };
  }, [state, loading, currentUserId]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
