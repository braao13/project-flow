import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase, ATTACHMENTS_BUCKET } from "./supabase/client";
import type { Database } from "./supabase/database.types";
import { useAuth } from "./auth";
import type { Attachment, Comment, Project, Task, TaskPriority, TaskStatus, Update } from "./types";

// Camada de persistência baseada em Supabase (Postgres + Storage + Realtime).
// A API pública (StoreProvider / useStore) é a mesma da versão local — quem consome
// (componentes, rotas) não muda. Isso deixa o terreno pronto para fase 2 (bot do
// Telegram escrevendo direto nas tabelas) e fase 3 (IA), já que qualquer escrita
// externa chega na UI via Realtime sem código extra.

type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
type UpdateRow = Database["public"]["Tables"]["updates"]["Row"];
type CommentRow = Database["public"]["Tables"]["comments"]["Row"];
type AttachmentRow = Database["public"]["Tables"]["attachments"]["Row"];

interface State {
  projects: Project[];
  tasks: Task[];
  updates: Update[];
  comments: Comment[];
  attachments: Attachment[];
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

// ---------- mapeamento DB (snake_case) -> app (camelCase) ----------
function mapProject(row: ProjectRow): Project {
  return { id: row.id, name: row.name, description: row.description ?? undefined, color: row.color ?? undefined, createdAt: row.created_at };
}
function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description ?? undefined,
    status: row.status,
    priority: row.priority,
    startDate: row.start_date,
    dueDate: row.due_date ?? undefined,
    createdAt: row.created_at,
  };
}
function mapUpdate(row: UpdateRow): Update {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    description: row.description ?? undefined,
    date: row.date ?? undefined,
    done: row.done,
    createdAt: row.created_at,
  };
}
function mapComment(row: CommentRow): Comment {
  return { id: row.id, taskId: row.task_id, text: row.text, createdAt: row.created_at };
}
function mapAttachment(row: AttachmentRow, url: string): Attachment {
  return { id: row.id, taskId: row.task_id, name: row.name, type: row.type, size: row.size, dataUrl: url, createdAt: row.created_at };
}

function reportError(action: string, error: unknown) {
  console.error(error);
  toast.error(`Não foi possível ${action}.`);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ["projects", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("owner_id", userId!).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapProject);
    },
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("owner_id", userId!).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapTask);
    },
  });

  const updatesQuery = useQuery({
    queryKey: ["updates", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("updates").select("*").eq("owner_id", userId!).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapUpdate);
    },
  });

  const commentsQuery = useQuery({
    queryKey: ["comments", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("comments").select("*").eq("owner_id", userId!).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapComment);
    },
  });

  const attachmentsQuery = useQuery({
    queryKey: ["attachments", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("attachments").select("*").eq("owner_id", userId!).order("created_at", { ascending: true });
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const { data: signed, error: signError } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .createSignedUrls(rows.map((r) => r.storage_path), 60 * 60);
      if (signError) throw signError;
      const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl ?? ""]));
      return rows.map((r) => mapAttachment(r, urlByPath.get(r.storage_path) ?? ""));
    },
  });

  // Realtime: qualquer escrita (web, e futuramente Telegram/IA) refaz o fetch da tabela afetada.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`store-${userId}`);
    (["projects", "tasks", "updates", "comments", "attachments"] as const).forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `owner_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: [table, userId] }),
      );
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  // Detecção automática de "atrasada" (mesma regra do client, persistida no servidor).
  useEffect(() => {
    const tasks = tasksQuery.data;
    if (!tasks) return;
    tasks.forEach((t) => {
      const next = computeStatus(t);
      if (next !== t.status && t.status !== "finalizada") {
        void supabase.from("tasks").update({ status: next }).eq("id", t.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasksQuery.data]);

  const state: State = useMemo(
    () => ({
      projects: projectsQuery.data ?? [],
      tasks: tasksQuery.data ?? [],
      updates: updatesQuery.data ?? [],
      comments: commentsQuery.data ?? [],
      attachments: attachmentsQuery.data ?? [],
    }),
    [projectsQuery.data, tasksQuery.data, updatesQuery.data, commentsQuery.data, attachmentsQuery.data],
  );

  const loading =
    !!userId &&
    (projectsQuery.isPending || tasksQuery.isPending || updatesQuery.isPending || commentsQuery.isPending || attachmentsQuery.isPending);

  // ---------- helpers de cache otimista ----------
  const optimisticAdd = useCallback(
    <T,>(key: string, item: T) => queryClient.setQueryData<T[]>([key, userId], (prev) => [...(prev ?? []), item]),
    [queryClient, userId],
  );
  const optimisticPatch = useCallback(
    <T extends { id: string }>(key: string, id: string, patch: Partial<T>) =>
      queryClient.setQueryData<T[]>([key, userId], (prev) => (prev ?? []).map((i) => (i.id === id ? { ...i, ...patch } : i))),
    [queryClient, userId],
  );
  const optimisticRemove = useCallback(
    <T extends { id: string }>(key: string, id: string) =>
      queryClient.setQueryData<T[]>([key, userId], (prev) => (prev ?? []).filter((i) => i.id !== id)),
    [queryClient, userId],
  );
  const rollback = useCallback((key: string) => queryClient.invalidateQueries({ queryKey: [key, userId] }), [queryClient, userId]);

  // ---------- projects ----------
  const createProject = useCallback(
    async (data: Omit<Project, "id" | "createdAt">) => {
      if (!userId) {
        toast.error("Você precisa estar autenticado.");
        throw new Error("not authenticated");
      }
      const project: Project = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...data };
      optimisticAdd<Project>("projects", project);
      const { error } = await supabase.from("projects").insert({
        id: project.id,
        owner_id: userId,
        name: project.name,
        description: project.description ?? null,
        color: project.color ?? null,
      });
      if (error) {
        rollback("projects");
        reportError("criar o projeto", error);
        throw error;
      }
      return project;
    },
    [userId, optimisticAdd, rollback],
  );

  const updateProject = useCallback(
    (id: string, data: Partial<Project>) => {
      const patch: Record<string, unknown> = {};
      if ("name" in data) patch.name = data.name;
      if ("description" in data) patch.description = data.description ?? null;
      if ("color" in data) patch.color = data.color ?? null;
      optimisticPatch<Project>("projects", id, data);
      void supabase
        .from("projects")
        .update(patch)
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            rollback("projects");
            reportError("atualizar o projeto", error);
          }
        });
    },
    [optimisticPatch, rollback],
  );

  const deleteProject = useCallback(
    (id: string) => {
      const taskIds = (queryClient.getQueryData<Task[]>(["tasks", userId]) ?? []).filter((t) => t.projectId === id).map((t) => t.id);
      optimisticRemove<Project>("projects", id);
      queryClient.setQueryData<Task[]>(["tasks", userId], (prev) => (prev ?? []).filter((t) => t.projectId !== id));
      queryClient.setQueryData<Update[]>(["updates", userId], (prev) => (prev ?? []).filter((u) => !taskIds.includes(u.taskId)));
      queryClient.setQueryData<Comment[]>(["comments", userId], (prev) => (prev ?? []).filter((c) => !taskIds.includes(c.taskId)));
      queryClient.setQueryData<Attachment[]>(["attachments", userId], (prev) => (prev ?? []).filter((a) => !taskIds.includes(a.taskId)));
      void supabase
        .from("projects")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            reportError("excluir o projeto", error);
            (["projects", "tasks", "updates", "comments", "attachments"] as const).forEach(rollback);
          }
        });
    },
    [queryClient, userId, optimisticRemove, rollback],
  );

  // ---------- tasks ----------
  const updateTask = useCallback(
    (id: string, data: Partial<Task>) => {
      const current = (queryClient.getQueryData<Task[]>(["tasks", userId]) ?? []).find((t) => t.id === id);
      const status = "status" in data ? data.status : current ? computeStatus({ ...current, ...data }) : undefined;

      const patch: Record<string, unknown> = {};
      if ("name" in data) patch.name = data.name;
      if ("description" in data) patch.description = data.description ?? null;
      if ("projectId" in data) patch.project_id = data.projectId;
      if ("priority" in data) patch.priority = data.priority;
      if ("startDate" in data) patch.start_date = data.startDate;
      if ("dueDate" in data) patch.due_date = data.dueDate ?? null;
      if (status !== undefined) patch.status = status;

      optimisticPatch<Task>("tasks", id, { ...data, ...(status !== undefined ? { status } : {}) });
      void supabase
        .from("tasks")
        .update(patch)
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            rollback("tasks");
            reportError("atualizar a task", error);
          }
        });
    },
    [queryClient, userId, optimisticPatch, rollback],
  );

  const createTask = useCallback(
    async (data: Omit<Task, "id" | "createdAt" | "status"> & { status?: TaskStatus }) => {
      if (!userId) {
        toast.error("Você precisa estar autenticado.");
        throw new Error("not authenticated");
      }
      const base: Task = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: data.status ?? "andamento", ...data };
      base.status = computeStatus(base);
      optimisticAdd<Task>("tasks", base);
      const { error } = await supabase.from("tasks").insert({
        id: base.id,
        owner_id: userId,
        project_id: base.projectId,
        name: base.name,
        description: base.description ?? null,
        status: base.status,
        priority: base.priority,
        start_date: base.startDate,
        due_date: base.dueDate ?? null,
      });
      if (error) {
        rollback("tasks");
        reportError("criar a task", error);
        throw error;
      }
      return base;
    },
    [userId, optimisticAdd, rollback],
  );

  const deleteTask = useCallback(
    (id: string) => {
      optimisticRemove<Task>("tasks", id);
      queryClient.setQueryData<Update[]>(["updates", userId], (prev) => (prev ?? []).filter((u) => u.taskId !== id));
      queryClient.setQueryData<Comment[]>(["comments", userId], (prev) => (prev ?? []).filter((c) => c.taskId !== id));
      queryClient.setQueryData<Attachment[]>(["attachments", userId], (prev) => (prev ?? []).filter((a) => a.taskId !== id));
      void supabase
        .from("tasks")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            reportError("excluir a task", error);
            (["tasks", "updates", "comments", "attachments"] as const).forEach(rollback);
          }
        });
    },
    [queryClient, userId, optimisticRemove, rollback],
  );

  const toggleTaskDone = useCallback(
    (id: string) => {
      const current = (queryClient.getQueryData<Task[]>(["tasks", userId]) ?? []).find((t) => t.id === id);
      if (!current) return;
      const nextStatus: TaskStatus =
        current.status === "finalizada" ? computeStatus({ ...current, status: "andamento" }) : "finalizada";
      updateTask(id, { status: nextStatus });
    },
    [queryClient, userId, updateTask],
  );

  const setTaskPriority = useCallback((id: string, p: TaskPriority) => updateTask(id, { priority: p }), [updateTask]);

  // ---------- updates (timeline) ----------
  const createUpdate = useCallback(
    async (data: Omit<Update, "id" | "createdAt" | "done"> & { done?: boolean }) => {
      if (!userId) {
        toast.error("Você precisa estar autenticado.");
        throw new Error("not authenticated");
      }
      const update: Update = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), done: data.done ?? false, ...data };
      optimisticAdd<Update>("updates", update);
      const { error } = await supabase.from("updates").insert({
        id: update.id,
        owner_id: userId,
        task_id: update.taskId,
        title: update.title,
        description: update.description ?? null,
        date: update.date ?? null,
        done: update.done,
      });
      if (error) {
        rollback("updates");
        reportError("criar a atualização", error);
        throw error;
      }
      return update;
    },
    [userId, optimisticAdd, rollback],
  );

  const updateUpdate = useCallback(
    (id: string, data: Partial<Update>) => {
      const patch: Record<string, unknown> = {};
      if ("title" in data) patch.title = data.title;
      if ("description" in data) patch.description = data.description ?? null;
      if ("date" in data) patch.date = data.date ?? null;
      if ("done" in data) patch.done = data.done;
      optimisticPatch<Update>("updates", id, data);
      void supabase
        .from("updates")
        .update(patch)
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            rollback("updates");
            reportError("atualizar o item da timeline", error);
          }
        });
    },
    [optimisticPatch, rollback],
  );

  const deleteUpdate = useCallback(
    (id: string) => {
      optimisticRemove<Update>("updates", id);
      void supabase
        .from("updates")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            reportError("excluir o item da timeline", error);
            rollback("updates");
          }
        });
    },
    [optimisticRemove, rollback],
  );

  const toggleUpdate = useCallback(
    (id: string) => {
      const current = (queryClient.getQueryData<Update[]>(["updates", userId]) ?? []).find((u) => u.id === id);
      if (!current) return;
      updateUpdate(id, { done: !current.done });
    },
    [queryClient, userId, updateUpdate],
  );

  // ---------- comments ----------
  const addComment = useCallback(
    (taskId: string, text: string) => {
      if (!userId) {
        toast.error("Você precisa estar autenticado.");
        return;
      }
      const comment: Comment = { id: crypto.randomUUID(), taskId, text, createdAt: new Date().toISOString() };
      optimisticAdd<Comment>("comments", comment);
      void supabase
        .from("comments")
        .insert({ id: comment.id, owner_id: userId, task_id: taskId, text })
        .then(({ error }) => {
          if (error) {
            rollback("comments");
            reportError("adicionar o comentário", error);
          }
        });
    },
    [userId, optimisticAdd, rollback],
  );

  const deleteComment = useCallback(
    (id: string) => {
      optimisticRemove<Comment>("comments", id);
      void supabase
        .from("comments")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            reportError("excluir o comentário", error);
            rollback("comments");
          }
        });
    },
    [optimisticRemove, rollback],
  );

  // ---------- attachments ----------
  const addAttachment = useCallback(
    async (taskId: string, file: File) => {
      if (!userId) {
        toast.error("Você precisa estar autenticado.");
        return;
      }
      const id = crypto.randomUUID();
      const path = `${userId}/${taskId}/${id}-${file.name}`;

      const { error: uploadError } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) {
        reportError("enviar o anexo", uploadError);
        return;
      }

      const { data: signed } = await supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrl(path, 60 * 60);
      const attachment: Attachment = {
        id,
        taskId,
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: signed?.signedUrl ?? "",
        createdAt: new Date().toISOString(),
      };
      optimisticAdd<Attachment>("attachments", attachment);

      const { error } = await supabase.from("attachments").insert({
        id,
        owner_id: userId,
        task_id: taskId,
        name: file.name,
        type: file.type,
        size: file.size,
        storage_path: path,
      });
      if (error) {
        rollback("attachments");
        reportError("registrar o anexo", error);
      }
    },
    [userId, optimisticAdd, rollback],
  );

  const deleteAttachment = useCallback(
    (id: string) => {
      optimisticRemove<Attachment>("attachments", id);
      void supabase
        .from("attachments")
        .select("storage_path")
        .eq("id", id)
        .maybeSingle()
        .then(async ({ data: row }) => {
          const { error } = await supabase.from("attachments").delete().eq("id", id);
          if (error) {
            reportError("excluir o anexo", error);
            rollback("attachments");
            return;
          }
          if (row?.storage_path) {
            await supabase.storage.from(ATTACHMENTS_BUCKET).remove([row.storage_path]);
          }
        });
    },
    [optimisticRemove, rollback],
  );

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

// Antes limpava o localStorage; agora os dados vivem no Supabase, então só força
// um refetch de tudo (não é destrutivo).
export function useReset() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useCallback(() => {
    (["projects", "tasks", "updates", "comments", "attachments"] as const).forEach((key) =>
      queryClient.invalidateQueries({ queryKey: [key, user?.id] }),
    );
  }, [queryClient, user?.id]);
}
