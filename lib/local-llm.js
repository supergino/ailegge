const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434'
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'llama3.1:8b'

export async function generateEmbedding(text) {
  const res = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: text }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Ollama embedding error ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.embedding
}

export async function generateResponse(systemPrompt, messages, options = {}) {
  const ollamaMessages = []
  if (systemPrompt) ollamaMessages.push({ role: 'system', content: systemPrompt })
  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'assistant' : 'user'
    if (msg.text) ollamaMessages.push({ role, content: msg.text })
  }

  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model || CHAT_MODEL,
      messages: ollamaMessages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.3,
      },
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Ollama chat error ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.message?.content || ''
}

export async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return { available: false, error: `Status ${res.status}` }
    const data = await res.json()
    const models = (data.models || []).map(m => m.name)
    return {
      available: true,
      models,
      hasEmbedding: models.some(m => m.startsWith(EMBEDDING_MODEL)),
      hasChat: models.some(m => m.startsWith(CHAT_MODEL)),
      embeddingModel: EMBEDDING_MODEL,
      chatModel: CHAT_MODEL,
    }
  } catch (err) {
    return { available: false, error: err.message }
  }
}

export function getChatModel() {
  return CHAT_MODEL
}
