import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client (for browser). This file is imported by
// client components, so it must only ever construct clients from
// NEXT_PUBLIC_* env vars -- anything else evaluates to undefined in the
// browser bundle and throws at module load. The service-role admin
// client lives in ./supabase-admin.ts instead.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type AppPing = {
  id: number
  device_id: string
  event: 'open' | 'login_success' | 'heartbeat'
  app_version: string | null
  user_id: string | null
  created_at: string
}
