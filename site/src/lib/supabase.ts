/**
 * Browser-safe Supabase configuration reserved for future persisted features.
 *
 * This export currently has no database-backed feature, so no Supabase client
 * is created here. Never add a service-role key to this file or to VITE_* vars.
 */
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  isConfigured: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
} as const;