import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // Intentionally not throwing here: this file is imported at build time
  // (including static analysis of API routes), so it must stay import-safe
  // even when .env.local hasn't been created yet. Actual data calls fail
  // loudly instead — see receiptRepository.js.
  console.warn(
    "[Patungin] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi. " +
      "Salin .env.local.example ke .env.local dan isi kredensial Supabase kamu."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
