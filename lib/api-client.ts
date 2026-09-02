import { supabase } from './supabase'

/**
 * Fetch wrapper that attaches the current Supabase session's access
 * token as a Bearer header. All /api/* routes (except /api/auth/* and
 * /api/pings) expect this.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  try {
    const response = await fetch(path, { ...options, headers })
    const json = await response.json().catch(() => null)

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: (json && json.error) || `Request failed with status ${response.status}`,
      }
    }

    return { ok: true, status: response.status, data: json as T, error: null }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}
