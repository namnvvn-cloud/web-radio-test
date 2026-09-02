import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client-side Supabase client (for browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (for API routes and server components)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export type AppPing = {
  id: number
  device_id: string
  event: 'open' | 'login_success' | 'heartbeat'
  app_version: string | null
  user_id: string | null
  created_at: string
}
