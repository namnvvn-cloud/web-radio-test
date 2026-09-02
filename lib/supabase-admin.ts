import { createClient } from '@supabase/supabase-js'

// Server-only Supabase client (uses the service role key, bypasses RLS).
// Deliberately kept in its own file, separate from lib/supabase.ts: that
// file also exports the browser client and is imported by client
// components, so anything in it -- including this constructor -- gets
// bundled into the client JS. SUPABASE_SERVICE_ROLE_KEY has no
// NEXT_PUBLIC_ prefix and is never sent to the browser, so evaluating
// `createClient(url, undefined)` there threw "supabaseKey is required."
// and crashed every page on load.
//
// IMPORTANT: only import this file from server-side code (API routes
// under app/api/*, server components, server actions) -- never from a
// 'use client' component. Importing it client-side reintroduces the
// same crash, since the service key is always undefined in the browser.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
