import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Nomes de variável PRÓPRIOS (não VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) —
// de propósito, para não colidir com o que o Lovable Cloud injeta/sobrescreve
// automaticamente no build enquanto o recurso "Cloud" estiver ativo no projeto.
const supabaseUrl = import.meta.env.VITE_PROJETIN_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_PROJETIN_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "VITE_PROJETIN_SUPABASE_URL / VITE_PROJETIN_SUPABASE_ANON_KEY não configuradas. Confira o arquivo .env na " +
      "raiz do projeto.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/** Bucket privado usado para anexos de tasks (Step 1 do plano — preparado, upload liberado aqui). */
export const ATTACHMENTS_BUCKET = "attachments";
