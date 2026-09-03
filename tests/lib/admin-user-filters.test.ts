import { describe, it, expect } from 'vitest'
import { parseUserFilters, applyUserFilters } from '@/lib/admin-user-filters'

describe('parseUserFilters', () => {
  it('returns all-undefined for an empty query', () => {
    const filters = parseUserFilters(new URLSearchParams(''))
    expect(filters).toEqual({
      search: undefined,
      tier: undefined,
      status: undefined,
      from: undefined,
      to: undefined,
    })
  })

  it('trims search and passes through valid enum values', () => {
    const filters = parseUserFilters(new URLSearchParams('search=  nam  &tier=pro&status=locked'))
    expect(filters.search).toBe('nam')
    expect(filters.tier).toBe('pro')
    expect(filters.status).toBe('locked')
  })

  it('drops invalid tier/status values instead of passing them through', () => {
    const filters = parseUserFilters(new URLSearchParams('tier=enterprise&status=deleted'))
    expect(filters.tier).toBeUndefined()
    expect(filters.status).toBeUndefined()
  })

  it('passes through from/to date strings unchanged', () => {
    const filters = parseUserFilters(new URLSearchParams('from=2026-01-01&to=2026-01-31'))
    expect(filters.from).toBe('2026-01-01')
    expect(filters.to).toBe('2026-01-31')
  })
})

describe('applyUserFilters', () => {
  // Minimal chainable query stub that records calls instead of hitting a DB.
  function makeQueryStub() {
    const calls: { method: string; args: unknown[] }[] = []
    const stub = {
      or: (...args: unknown[]) => {
        calls.push({ method: 'or', args })
        return stub
      },
      eq: (...args: unknown[]) => {
        calls.push({ method: 'eq', args })
        return stub
      },
      gte: (...args: unknown[]) => {
        calls.push({ method: 'gte', args })
        return stub
      },
      lte: (...args: unknown[]) => {
        calls.push({ method: 'lte', args })
        return stub
      },
    }
    return { stub, calls }
  }

  it('applies no filter calls when nothing is set', () => {
    const { stub, calls } = makeQueryStub()
    applyUserFilters(stub, parseUserFilters(new URLSearchParams('')))
    expect(calls).toHaveLength(0)
  })

  it('chains or/eq/eq/gte/lte in order when all filters are set', () => {
    const { stub, calls } = makeQueryStub()
    const filters = parseUserFilters(
      new URLSearchParams('search=nam&tier=pro&status=locked&from=2026-01-01&to=2026-01-31')
    )
    applyUserFilters(stub, filters)

    expect(calls.map((c) => c.method)).toEqual(['or', 'eq', 'eq', 'gte', 'lte'])
    expect(calls[0].args[0]).toContain('nam')
    expect(calls[1].args).toEqual(['subscription_tier', 'pro'])
    expect(calls[2].args).toEqual(['is_locked', true])
    expect(calls[3].args).toEqual(['created_at', '2026-01-01T00:00:00.000Z'])
    expect(calls[4].args).toEqual(['created_at', '2026-01-31T23:59:59.999Z'])
  })

  it('status=active maps to is_locked=false, not just "not locked"', () => {
    const { stub, calls } = makeQueryStub()
    applyUserFilters(stub, parseUserFilters(new URLSearchParams('status=active')))
    expect(calls).toEqual([{ method: 'eq', args: ['is_locked', false] }])
  })
})
