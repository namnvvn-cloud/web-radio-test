import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin, logAudit } from '@/lib/api-auth'
import { KB_SEED_DOCUMENTS } from '@/lib/kb-seed-content'
import { chunkText } from '@/lib/chunk-text'
import { embedTexts } from '@/lib/voyage'

/**
 * POST /api/admin/kb/seed — (re)load the built-in knowledge base content
 * (lib/kb-seed-content.ts) into kb_documents/kb_chunks with fresh
 * embeddings. Admin-only.
 *
 * Idempotent by title: a document whose title already exists in
 * kb_documents is deleted (cascades to its kb_chunks) and reinserted, so
 * re-running this after editing lib/kb-seed-content.ts refreshes it
 * rather than duplicating it. New titles are inserted fresh.
 *
 * This is the ONLY way kb_documents/kb_chunks get written in this
 * infrastructure phase -- there is no admin UI for ad-hoc KB editing yet.
 * To add content: edit lib/kb-seed-content.ts, then call this endpoint
 * again.
 *
 * Requires VOYAGE_API_KEY (already configured in Vercel). Cannot be
 * exercised from the cloud sandbox this was built in -- its network
 * egress does not reach api.voyageai.com -- so this has been verified by
 * `tsc --noEmit` + `eslint` only; it needs a real run against the
 * deployed app to confirm end-to-end.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const results: { title: string; chunks: number }[] = []

  try {
    for (const doc of KB_SEED_DOCUMENTS) {
      // Remove any previous version of this document (cascades to its chunks).
      await supabaseAdmin.from('kb_documents').delete().eq('title', doc.title)

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('kb_documents')
        .insert({ title: doc.title, content: doc.content, category: doc.category, source: doc.source })
        .select('id')
        .single()

      if (insertError || !inserted) {
        throw new Error(`Failed to insert document "${doc.title}": ${insertError?.message}`)
      }

      const pieces = chunkText(doc.content)
      const embeddings = await embedTexts(pieces, 'document')

      const rows = pieces.map((chunk_text, i) => ({
        document_id: inserted.id,
        chunk_text,
        chunk_index: i,
        embedding: embeddings[i],
      }))

      const { error: chunkError } = await supabaseAdmin.from('kb_chunks').insert(rows)
      if (chunkError) {
        throw new Error(`Failed to insert chunks for "${doc.title}": ${chunkError.message}`)
      }

      results.push({ title: doc.title, chunks: rows.length })
    }

    await logAudit(auth.user.id, 'kb_seeded', 'kb_documents', 'bulk', {
      documents: results.map((r) => r.title),
      total_chunks: results.reduce((sum, r) => sum + r.chunks, 0),
    })

    return NextResponse.json({
      success: true,
      documents: results,
      total_chunks: results.reduce((sum, r) => sum + r.chunks, 0),
    })
  } catch (error) {
    console.error('KB seed error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message, partial: results }, { status: 500 })
  }
}

/**
 * GET /api/admin/kb/seed — quick status check: how many documents/chunks
 * are currently loaded, without re-seeding anything.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data: documents, error } = await supabaseAdmin
    .from('kb_documents')
    .select('id, title, category, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch KB status' }, { status: 500 })
  }

  const { count: chunkCount } = await supabaseAdmin
    .from('kb_chunks')
    .select('id', { count: 'exact', head: true })

  return NextResponse.json({
    success: true,
    documents,
    total_documents: documents.length,
    total_chunks: chunkCount || 0,
  })
}
