/**
 * Simple paragraph-aware chunker for KB seeding. No tokenizer dependency --
 * chunks by character count, which is good enough for the short (a few
 * hundred to ~1500 char) seed documents in lib/kb-seed-content.ts. Splits
 * on blank lines first so a chunk boundary never falls mid-paragraph
 * unless a single paragraph alone exceeds maxChars.
 */
export function chunkText(text: string, maxChars = 700): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }
    if (current) chunks.push(current)
    current = para.length <= maxChars ? para : para
    // A single paragraph longer than maxChars is kept whole rather than
    // split mid-sentence -- these seed docs are short enough that this
    // never actually triggers, but it's a safe fallback either way.
    if (para.length > maxChars) {
      chunks.push(para)
      current = ''
    }
  }
  if (current) chunks.push(current)

  return chunks
}
