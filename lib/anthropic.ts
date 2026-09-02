/**
 * Claude API client (server-only), used for the Chatbot RAG answer-
 * generation step (SOP §4.2: "đưa vào Claude API kèm câu hỏi -> trả lời
 * có trích nguồn").
 *
 * Requires ANTHROPIC_API_KEY. As of this writing that variable is NOT set
 * in Vercel for this project -- askChatbot() throws a clear, catchable
 * error in that case (see app/api/chat/route.ts) rather than a raw fetch
 * failure, so the route can return a specific message instead of a
 * generic 500.
 *
 * Model default is claude-sonnet-5 (current flagship-tier model as of
 * Sep 2026 per platform.claude.com/docs/en/models/overview) -- override
 * with ANTHROPIC_CHAT_MODEL if the project should use a different model.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const DEFAULT_MODEL = process.env.ANTHROPIC_CHAT_MODEL || 'claude-sonnet-5'

export class AnthropicNotConfiguredError extends Error {
  constructor() {
    super('ANTHROPIC_API_KEY is not configured in this environment.')
    this.name = 'AnthropicNotConfiguredError'
  }
}

/**
 * Ask Claude a question, grounded strictly in the provided context
 * passages. Returns the assistant's plain-text answer.
 */
export async function askChatbot(params: {
  question: string
  contextPassages: { title: string; text: string; source?: string | null }[]
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new AnthropicNotConfiguredError()
  }

  const contextBlock = params.contextPassages.length
    ? params.contextPassages
        .map(
          (p, i) =>
            `[${i + 1}] ${p.title}${p.source ? ` (${p.source})` : ''}\n${p.text}`
        )
        .join('\n\n')
    : '(Không tìm thấy tài liệu liên quan trong kho tri thức.)'

  const systemPrompt = `Bạn là trợ lý kỹ thuật của "Web Radio Test" -- nền tảng đo kiểm chất lượng sóng di động.
Chỉ trả lời dựa trên các đoạn tài liệu tham khảo được cung cấp dưới đây. Nếu tài liệu không đủ để trả lời, hãy nói rõ là chưa có thông tin, không tự suy đoán hay bịa đặt.
Khi dùng thông tin từ một đoạn, trích dẫn số thứ tự đoạn đó (ví dụ: [1]) ngay sau câu liên quan.
Trả lời ngắn gọn, đúng trọng tâm, bằng tiếng Việt, dùng thuật ngữ kỹ thuật (RSRP, RSRQ, SINR, 3GPP...) khi phù hợp.

Tài liệu tham khảo:
${contextBlock}`

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: params.question }],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Claude API request failed (${response.status}): ${body.slice(0, 500)}`)
  }

  const data = await response.json()
  const textBlock = (data.content || []).find((b: { type: string }) => b.type === 'text')
  return textBlock?.text?.trim() || ''
}
