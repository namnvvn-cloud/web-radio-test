/**
 * Shared filter params for the Admin Users list + export endpoints, so
 * "what you see is what you export" — the Excel export always matches
 * whatever search/filters are currently applied on the page.
 *
 * Query params:
 *   search — matches email or full_name (ILIKE)
 *   tier   — 'free' | 'pro'
 *   status — 'active' | 'locked'
 *   from   — registered on/after this date (YYYY-MM-DD)
 *   to     — registered on/before this date (YYYY-MM-DD)
 */
export function parseUserFilters(searchParams: URLSearchParams) {
  const search = searchParams.get('search')?.trim() || undefined
  const tierRaw = searchParams.get('tier')?.trim()
  const tier = tierRaw === 'free' || tierRaw === 'pro' ? tierRaw : undefined
  const statusRaw = searchParams.get('status')?.trim()
  const status = statusRaw === 'active' || statusRaw === 'locked' ? statusRaw : undefined
  const from = searchParams.get('from')?.trim() || undefined
  const to = searchParams.get('to')?.trim() || undefined
  return { search, tier, status, from, to }
}

// Minimal shape covering just what .from('profiles').select(...) needs —
// avoids depending on the full generated Database type here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyUserFilters<Q extends { or: any; eq: any; gte: any; lte: any }>(
  query: Q,
  filters: ReturnType<typeof parseUserFilters>
): Q {
  let q = query
  if (filters.search) {
    q = q.or(`email.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%`)
  }
  if (filters.tier) {
    q = q.eq('subscription_tier', filters.tier)
  }
  if (filters.status) {
    q = q.eq('is_locked', filters.status === 'locked')
  }
  if (filters.from) {
    q = q.gte('created_at', `${filters.from}T00:00:00.000Z`)
  }
  if (filters.to) {
    q = q.lte('created_at', `${filters.to}T23:59:59.999Z`)
  }
  return q
}

export type UserFilters = ReturnType<typeof parseUserFilters>
