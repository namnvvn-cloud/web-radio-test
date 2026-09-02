/**
 * Voyage AI embeddings client (server-only).
 *
 * Used by the Chatbot RAG pipeline (SOP §4.2): documents are embedded with
 * input_type="document" when seeded into kb_chunks, and the user's question
 * is embedded with input_type="query" at ask-time -- Voyage's models are
 * trained asymmetrically for retrieval, so matching the type to the role
 * measurably improves search quality versus embedding both the same way.
 *
 * Model: voyage-4 (current generation as of Sep 2026), 1024-dim default
 * output -- matches the `vector(1024)` column on kb_chunks.embedding.
 * Override via VOYAGE_EMBED_MODEL if the schema's dimension ever changes.
 *
 * Requires VOYAGE_API_KEY (already configured in Vercel for this project).
 */

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const DEFAULT_MODEL = process.env.VOYAGE_EMBED_MODEL || 'voyage-4'

type VoyageInputType = 'document' | 'query'

type VoyageResponse = {
  embeddings: number[][]
  total_tokens?: number
}

/**
 * Embed one or more texts. Voyage accepts a batch in one call (much
 * cheaper/faster than one request per chunk), so callers should batch
 * their chunks rather than looping.
 */
export async function embedTexts(
  texts: string[],
  inputType: VoyageInputType
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) {
    throw new Error(
      'VOYAGE_API_KEY is not configured. Add it in Vercel project settings (Voyage AI dashboard -> API keys).'
    )
  }
  if (texts.length === 0) return []

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model: DEFAULT_MODEL,
      input_type: inputType,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Voyage embeddings request failed (${response.status}): ${body.slice(0, 500)}`)
  }

  const data = (await response.json()) as VoyageResponse
  return data.embeddings
}

/** Convenience wrapper for embedding a single text. */
export async function embedText(text: string, inputType: VoyageInputType): Promise<number[]> {
  const [embedding] = await embedTexts([text], inputType)
  return embedding
}
