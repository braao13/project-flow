import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient, useMutation, type QueryClient } from "@tanstack/react-query";
import { supabase, ATTACHMENTS_BUCKET } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Tables } from "@/lib/supabase/types";
import type { Attachment, Comment, Profile, Project, Task, TaskPriority, TaskStatus, Update } from "./types";

// Conectado ao Supabase. Sem localStorage, sem estado offline — RLS cuida do
// isolamento de escrita, e todo mundo do time enxerga o workspace inteiro
// (necessário para o Dashboard "Visão Geral" e para ver tasks atribuídas por
// outros). A API pública (StoreProvider / useStore) permanece a mesma para
// manter os componentes existentes intactos.

interface State {
  projects: Project[];
  tasks: Task[];
  updates: Update[];
  comments: Comment[];
  attachments: Attachment[];
  profiles: Profile[];
}

const EMPTY: State = { projects: [], tasks: [], updates: [], comments: [], attachments: [], profiles: [] };

// ---------- mapeadores DB (snake_case) -> frontend (camelCase) ----------

function mapProject(row: Tables<"projects">): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    
    createdAt: row.created_at,
    ownerId: row.owner_id,
  };
}

function mapTask(row: Tables<"tasks">): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.title,
    description: row.description ?? undefined,
    status: row.status,
    priority: row.priority,
    startDate: row.start_date ?? row.created_at,
    dueDate: row.due_date ?? undefined,
    createdAt: row.created_at,
    createdBy: row.created_by,
    responsibleUserId: row.responsible_user_id,
    previousTaskId: row.previous_task_id ?? null,
  };
}

function mapUpdate(row: Tables<"task_updates">): Update {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    description: row.description ?? undefined,
    date: row.scheduled_date ?? undefined,
    done: row.completed,
    createdAt: row.created_at,
    createdBy: row.created_by,
    responsibleUserId: row.responsible_user_id,
  };
}

function mapComment(row: Tables<"comments">): Comment {
  return { id: row.id, taskId: row.task_id, text: row.content, createdAt: row.created_at, authorId: row.author_id };
}

function mapAttachment(row: Tables<"attachments">): Attachment {
  return {
    id: row.id,
    taskId: row.task_id,
    name: row.file_name,
    type: row.mime_type ?? "application/octet-stream",
    size: row.file_size ?? 0,
    path: row.file_path,
    createdAt: row.created_at,
    uploadedBy: row.uploaded_by,
  };
}

function mapProfile(row: Tables<"profiles">): Profile {
  return { id: row.id, username: row.username, fullName: row.full_name, email: row.email, avatarUrl: row.avatar_url, role: row.role };
}

// ---------- queries ----------

const KEYS = {
  projects: ["projects"] as const,
  tasks: ["tasks"] as const,
  updates: ["task_updates"] as const,
  comments: ["comments"] as const,
  attachments: ["attachments"] as const,
  profiles: ["profiles"] as const,
};

function useProjectsQuery() {
  return useQuery({
    queryKey: KEYS.projects,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data.map(mapProject);
    },
  });
}

function useTasksQuery() {
  return useQuery({
    queryKey: KEYS.tasks,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data.map(mapTask);
    },
  });
}

function useUpdatesQuery() {
  return useQuery({
    queryKey: KEYS.updates,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_updates")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data.map(mapUpdate);
    },
  });
}

function useCommentsQuery() {
  return useQuery({
    queryKey: KEYS.comments,
    queryFn: async () => {
      const { data, error } = await supabase.from("comments").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data.map(mapComment);
    },
  });
}

function useAttachmentsQuery() {
  return useQuery({
    queryKey: KEYS.attachments,
    queryFn: async () => {
      const { data, error } = await supabase.from("attachments").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data.map(mapAttachment);
    },
  });
}

function useProfilesQuery() {
  return useQuery({
    queryKey: KEYS.profiles,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("full_name", { ascending: true });
      if (error) throw error;
      return data.map(mapProfile);
    },
  });
}

/** Realtime: qualquer INSERT/UPDATE/DELETE nas tabelas invalida a query correspondente. */
function useRealtimeSync(queryClient: QueryClient) {
  useEffect(() => {
    const channel = supabase
      .channel("projetin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () =>
        queryClient.invalidateQueries({ queryKey: KEYS.projects }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () =>
        queryClient.invalidateQueries({ queryKey: KEYS.tasks }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "task_updates" }, () =>
        queryClient.invalidateQueries({ queryKey: KEYS.updates }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () =>
        queryClient.invalidateQueries({ queryKey: KEYS.comments }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "attachments" }, () =>
        queryClient.invalidateQueries({ queryKey: KEYS.attachments }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

// ---------- API pública ----------

interface StoreApi {
  state: State;
  loading: boolean;
  currentUserId: string | undefined;

  createProject: (data: { name: string; description?: string }) => Promise<Project>;
  updateProject: (id: string, data: Partial<Pick<Project, "name" | "description">>) => void;
  deleteProject: (id: string) => void;

  createTask: (data: {
    projectId: string;
    name: string;
    description?: string;
    priority?: TaskPriority;
    startDate: string;
    dueDate?: string;
    responsibleUserId: string;
    previousTaskId?: string | null;
  }) => Promise<Task>;
  updateTask: (
    id: string,
    data: Partial<Pick<Task, "name" | "description" | "priority" | "startDate" | "dueDate" | "status" | "previousTaskId">>,
  ) => void;
  deleteTask: (id: string) => void;
  toggleTaskDone: (id: string) => void;
  setTaskPriority: (id: string, p: TaskPriority) => void;
  /** Step 6 — reatribuir o responsável de uma task. Toda task deve ter um responsável. */
  setTaskResponsible: (id: string, responsibleUserId: string) => void;

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
  /** Step 7 — atribuir responsável a uma atualização específica da timeline. */
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
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const currentUserId = profile?.id;

  useRealtimeSync(queryClient);

  const projectsQ = useProjectsQuery();
  const tasksQ = useTasksQuery();
  const updatesQ = useUpdatesQuery();
  const commentsQ = useCommentsQuery();
  const attachmentsQ = useAttachmentsQuery();
  const profilesQ = useProfilesQuery();

  const loading =
    projectsQ.isLoading || tasksQ.isLoading || updatesQ.isLoading || commentsQ.isLoading || attachmentsQ.isLoading;

  const state: State = {
    projects: projectsQ.data ?? [],
    tasks: tasksQ.data ?? [],
    updates: updatesQ.data ?? [],
    comments: commentsQ.data ?? [],
    attachments: attachmentsQ.data ?? [],
    profiles: profilesQ.data ?? [],
  };

  // ---------- projects ----------

  const createProjectMut = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      if (!currentUserId) throw new Error("Usuário não autenticado.");
      const { data: row, error } = await supabase
        .from("projects")
        .insert({ name: data.name, description: data.description, owner_id: currentUserId })
        .select("*")
        .single();
      if (error) throw error;
      return mapProject(row);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.projects }),
  });

  const updateProjectMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<Project, "name" | "description">> }) => {
      const { error } = await supabase.from("projects").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.projects }),
  });

  const deleteProjectMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.projects });
      queryClient.invalidateQueries({ queryKey: KEYS.tasks });
    },
  });

  // ---------- tasks ----------

  const createTaskMut = useMutation({
    mutationFn: async (data: {
      projectId: string;
      name: string;
      description?: string;
      priority?: TaskPriority;
      startDate: string;
      dueDate?: string;
      responsibleUserId: string;
      previousTaskId?: string | null;
    }) => {
      if (!currentUserId) throw new Error("Usuário não autenticado.");
      const { data: row, error } = await supabase
        .from("tasks")
        .insert({
          project_id: data.projectId,
          title: data.name,
          description: data.description,
          priority: data.priority ?? "nenhuma",
          start_date: data.startDate,
          due_date: data.dueDate,
          created_by: currentUserId,
          responsible_user_id: data.responsibleUserId,
          previous_task_id: data.previousTaskId ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return mapTask(row);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.tasks }),
  });

  const updateTaskMut = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Pick<Task, "name" | "description" | "priority" | "startDate" | "dueDate" | "status" | "previousTaskId">>;
    }) => {
      const payload: import("@/lib/supabase/types").TablesUpdate<"tasks"> = {};
      if (data.name !== undefined) payload.title = data.name;
      if (data.description !== undefined) payload.description = data.description;
      if (data.priority !== undefined) payload.priority = data.priority;
      if (data.startDate !== undefined) payload.start_date = data.startDate;
      if (data.dueDate !== undefined) payload.due_date = data.dueDate;
      if (data.status !== undefined) payload.status = data.status;
      if (data.previousTaskId !== undefined) payload.previous_task_id = data.previousTaskId;
      const { error } = await supabase.from("tasks").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.tasks }),
  });

  const deleteTaskMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.tasks });
      queryClient.invalidateQueries({ queryKey: KEYS.updates });
      queryClient.invalidateQueries({ queryKey: KEYS.comments });
      queryClient.invalidateQueries({ queryKey: KEYS.attachments });
    },
  });

  const setTaskResponsibleMut = useMutation({
    mutationFn: async ({ id, responsibleUserId }: { id: string; responsibleUserId: string }) => {
      const { error } = await supabase.from("tasks").update({ responsible_user_id: responsibleUserId }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.tasks }),
  });

  // ---------- updates (timeline) ----------

  const createUpdateMut = useMutation({
    mutationFn: async (data: {
      taskId: string;
      title: string;
      description?: string;
      date?: string;
      responsibleUserId?: string | null;
    }) => {
      if (!currentUserId) throw new Error("Usuário não autenticado.");
      const { data: row, error } = await supabase
        .from("task_updates")
        .insert({
          task_id: data.taskId,
          title: data.title,
          description: data.description,
          scheduled_date: data.date,
          responsible_user_id: data.responsibleUserId,
          created_by: currentUserId,
        })
        .select("*")
        .single();
      if (error) throw error;
      return mapUpdate(row);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.updates }),
  });

  const updateUpdateMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<Update, "title" | "description" | "date">> }) => {
      const payload: import("@/lib/supabase/types").TablesUpdate<"task_updates"> = {};
      if (data.title !== undefined) payload.title = data.title;
      if (data.description !== undefined) payload.description = data.description;
      if (data.date !== undefined) payload.scheduled_date = data.date;
      const { error } = await supabase.from("task_updates").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.updates }),
  });

  const deleteUpdateMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("task_updates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.updates }),
  });

  const toggleUpdateMut = useMutation({
    mutationFn: async (id: string) => {
      const current = state.updates.find((u) => u.id === id);
      if (!current) return;
      const { error } = await supabase.from("task_updates").update({ completed: !current.done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.updates }),
  });

  const setUpdateResponsibleMut = useMutation({
    mutationFn: async ({ id, responsibleUserId }: { id: string; responsibleUserId: string | null }) => {
      const { error } = await supabase
        .from("task_updates")
        .update({ responsible_user_id: responsibleUserId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.updates }),
  });

  // ---------- comments ----------

  const addCommentMut = useMutation({
    mutationFn: async ({ taskId, text }: { taskId: string; text: string }) => {
      if (!currentUserId) throw new Error("Usuário não autenticado.");
      const { error } = await supabase
        .from("comments")
        .insert({ task_id: taskId, content: text, author_id: currentUserId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.comments }),
  });

  const deleteCommentMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.comments }),
  });

  // ---------- attachments ----------

  const addAttachmentMut = useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      if (!currentUserId) throw new Error("Usuário não autenticado.");
      const path = `${taskId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file);
      if (uploadError) throw uploadError;

      const { error } = await supabase.from("attachments").insert({
        task_id: taskId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: currentUserId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.attachments }),
  });

  const deleteAttachmentMut = useMutation({
    mutationFn: async (id: string) => {
      const attachment = state.attachments.find((a) => a.id === id);
      if (attachment) {
        await supabase.storage.from(ATTACHMENTS_BUCKET).remove([attachment.path]);
      }
      const { error } = await supabase.from("attachments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.attachments }),
  });

  async function getAttachmentUrl(path: string) {
    const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).createSignedUrl(path, 60 * 10);
    if (error) return null;
    return data.signedUrl;
  }

  // ---------- getters derivados ----------

  const getTasksByProject = (projectId: string) => state.tasks.filter((t) => t.projectId === projectId);
  const getUpdatesByTask = (taskId: string) =>
    state.updates.filter((u) => u.taskId === taskId).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  const getCommentsByTask = (taskId: string) =>
    state.comments.filter((c) => c.taskId === taskId).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  const getAttachmentsByTask = (taskId: string) =>
    state.attachments.filter((a) => a.taskId === taskId).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));

  const api = useMemo<StoreApi>(
    () => ({
      state,
      loading,
      currentUserId,
      createProject: (data) => createProjectMut.mutateAsync(data),
      updateProject: (id, data) => updateProjectMut.mutate({ id, data }),
      deleteProject: (id) => deleteProjectMut.mutate(id),
      createTask: (data) => createTaskMut.mutateAsync(data),
      updateTask: (id, data) => updateTaskMut.mutate({ id, data }),
      deleteTask: (id) => deleteTaskMut.mutate(id),
      toggleTaskDone: (id) => {
        const task = state.tasks.find((t) => t.id === id);
        if (!task) return;
        updateTaskMut.mutate({ id, data: { status: task.status === "finalizada" ? "andamento" : "finalizada" } });
      },
      setTaskPriority: (id, p) => updateTaskMut.mutate({ id, data: { priority: p } }),
      setTaskResponsible: (id, responsibleUserId) => setTaskResponsibleMut.mutate({ id, responsibleUserId }),
      createUpdate: (data) => createUpdateMut.mutateAsync(data),
      updateUpdate: (id, data) => updateUpdateMut.mutate({ id, data }),
      deleteUpdate: (id) => deleteUpdateMut.mutate(id),
      toggleUpdate: (id) => toggleUpdateMut.mutate(id),
      setUpdateResponsible: (id, responsibleUserId) => setUpdateResponsibleMut.mutate({ id, responsibleUserId }),
      addComment: (taskId, text) => addCommentMut.mutate({ taskId, text }),
      deleteComment: (id) => deleteCommentMut.mutate(id),
      addAttachment: (taskId, file) => addAttachmentMut.mutateAsync({ taskId, file }),
      deleteAttachment: (id) => deleteAttachmentMut.mutate(id),
      getAttachmentUrl,
      getTasksByProject,
      getUpdatesByTask,
      getCommentsByTask,
      getAttachmentsByTask,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, loading, currentUserId],
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
