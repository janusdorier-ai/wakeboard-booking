import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client — server-only. Bypasses RLS entirely, so every
// party_* table can stay policy-free (see 007_party_game.sql). Never
// import this from a client component.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
