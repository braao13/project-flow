// Tipagem manual do schema. Quando o Supabase CLI estiver configurado localmente,
// substitua este arquivo pelo gerado via:
//   supabase gen types typescript --project-id vilpiblpjmjqoqkdlavz > src/lib/supabase/database.types.ts

export type TaskStatusDB = "andamento" | "finalizada" | "atrasada";
export type TaskPriorityDB = "maxima" | "alta" | "nenhuma" | "baixa";
export type UpdateSourceDB = "web" | "telegram" | "ai";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          telegram_chat_id: string | null;
          ai_preferences: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["projects"]["Row"]> & {
          id: string;
          owner_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
      };
      tasks: {
        Row: {
          id: string;
          owner_id: string;
          project_id: string;
          name: string;
          description: string | null;
          status: TaskStatusDB;
          priority: TaskPriorityDB;
          start_date: string;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & {
          id: string;
          owner_id: string;
          project_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
      };
      updates: {
        Row: {
          id: string;
          owner_id: string;
          task_id: string;
          title: string;
          description: string | null;
          date: string | null;
          done: boolean;
          position: number;
          source: UpdateSourceDB;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["updates"]["Row"]> & {
          id: string;
          owner_id: string;
          task_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["updates"]["Row"]>;
      };
      comments: {
        Row: {
          id: string;
          owner_id: string;
          task_id: string;
          text: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["comments"]["Row"]> & {
          id: string;
          owner_id: string;
          task_id: string;
          text: string;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Row"]>;
      };
      attachments: {
        Row: {
          id: string;
          owner_id: string;
          task_id: string;
          name: string;
          type: string;
          size: number;
          storage_path: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["attachments"]["Row"]> & {
          id: string;
          owner_id: string;
          task_id: string;
          name: string;
          type: string;
          size: number;
          storage_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["attachments"]["Row"]>;
      };
    };
  };
}
