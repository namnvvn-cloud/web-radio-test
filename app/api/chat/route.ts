import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAuth } from '@/lib/api-auth'
import { embedText } from '@/lib/voyage'
import { askChatbot, AnthropicNotConfiguredError } from '@/lib/anthropic'

const MATCH_COUNT = 5
const MATCH_THRESHOLD = 0.3

type MatchedChunk = {
  chunk_id: string
  document_id: string
  chunk_text: string
  chunk_index: number
  title: string
  category: string | null
  source: string | null
  similarity: number
}

/**
 * POST /api/chat — ask the RAG chatbot a question (SOP §4.2).
 * Auth required (any signed-in user, not admin-only).
 *
 * Flow: embed the question (Voyage, input_type="query") -> top-k nearest
 * kb_chunks via the match_kb_chunks RPC (pgvector cosine search) -> ask
 * Claude, grounded strictly in those chunks -> store both messages in
 * chat_messages with the matched chunks as `sources`.
 *
 * Deliberately scoped to kb_chunks only, per SOP §4.2's explicit
 * constraint: "Không cho chatbot truy vấn trực tiếp benchmark_aggregates
 * hay dữ liệu đo của user khác." This route never reads cellfiles/
 * measurements/benchmark_aggregates. Answering questions about the
 * caller's own measurement data is listed in the SOP as an optional
 * future Phase 2 extension, not built here.
 *
 * Cannot be exercised end-to-end from the cloud sandbox this was built in
 * (no network path to api.voyageai.com / api.anthropic.com, and
 * ANTHROPIC_API_KEY is not yet set in Vercel) -- verified via `tsc
 * --noEmit` + `eslint` and careful review only. Needs a live test after
 * deploy + adding ANTHROPIC_API_KEY.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: { message?: unknown; session_id?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: 'message is too long (max 2000 characters)' }, { status: 400 })
  }

  // Resolve or create the chat session, verifying ownership if one was passed.
  let sessionId: string
  if (typeof body.session_id === 'string' && body.session_id) {
    const { data: session } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, user_id')
      .eq('id', body.session_id)
      .single()

    if (!session || session.user_id !== auth.user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    sessionId = session.id
  } else {
    const { data: newSession, error: sessionError } = await supabaseAdmin
      .from('chat_sessions')
      .insert({ user_id: auth.user.id })
      .select('id')
      .single()

    if (sessionError || !newSession) {
      console.error('Chat session create error:', sessionError)
      return NextResponse.json({ error: 'Failed to start chat session' }, { status: 500 })
    }
    sessionId = newSession.id
  }

  try {
    const queryEmbedding = await embedText(message, 'query')

    const { data: matches, error: matchError } = await supabaseAdmin.rpc('match_kb_chunks', {
      query_embedding: queryEmbedding,
      match_count: MATCH_COUNT,
      match_threshold: MATCH_THRESHOLD,
    })

    if (matchError) {
      console.error('match_kb_chunks error:', matchError)
      return NextResponse.json({ error: 'Knowledge base search failed' }, { status: 500 })
    }

    const chunks = (matches || []) as MatchedChunk[]

    const answer = await askChatbot({
      question: message,
      contextPassages: chunks.map((c) => ({ title: c.title, text: c.chunk_text, source: c.source })),
    })

    const sources = chunks.map((c) => ({
      title: c.title,
      source: c.source,
      category: c.category,
      similarity: c.similarity,
    }))

    await supabaseAdmin.from('chat_messages').insert([
      { session_id: sessionId, user_id: auth.user.id, message_text: message, message_role: 'user' },
      {
        session_id: sessionId,
        user_id: auth.user.id,
        message_text: answer,
        message_role: 'assistant',
        sources: sources.length ? sources : null,
      },
    ])

    return NextResponse.json({ success: true, session_id: sessionId, answer, sources })
  } catch (error) {
    if (error instanceof AnthropicNotConfiguredError) {
      return NextResponse.json(
        { error: 'Chatbot chưa sẵn sàng: thiếu cấu hình ANTHROPIC_API_KEY trên Vercel.' },
        { status: 503 }
      )
    }
    console.error('Chat error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/chat — without ?session_id: list the caller's chat sessions.
 * With ?session_id=<id>: list that session's messages (ownership-checked;
 * admins may also read any session, for support, mirroring the pattern
 * used elsewhere for admin oversight of user data).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const sessionId = request.nextUrl.searchParams.get('session_id')

  if (!sessionId) {
    const { data: sessions, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, session_start, session_end')
      .eq('user_id', auth.user.id)
      .order('session_start', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch chat sessions' }, { status: 500 })
    }
    return NextResponse.json({ success: true, sessions })
  }

  const { data: session } = await supabaseAdmin
    .from('chat_sessions')
    .select('id, user_id')
    .eq('id', sessionId)
    .single()

  if (!session || (session.user_id !== auth.user.id && !auth.isAdmin)) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const { data: messages, error } = await supabaseAdmin
    .from('chat_messages')
    .select('id, message_text, message_role, sources, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }

  return NextResponse.json({ success: true, session_id: sessionId, messages })
}
