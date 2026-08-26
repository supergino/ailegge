import { NextResponse } from 'next/server'

// Stato "configurazione" (gratuito, nessuna chiamata di rete/quota).
function envStatus(key) {
  if (!key) return { configured: false, status: 'missing', label: 'Chiave non configurata' }
  return { configured: true, status: 'configured', label: 'Configurata (non verificata live)' }
}

// --- Verifica LIVE on-demand, con cache lato server (TTL) per limitare il costo/quota ---
// Ogni chiamata reale consuma comunque una minima quota; grazie alla cache TTL, anche
// in caso di polling frequente (o molteplici utenti) viene effettuata al massimo una
// volta ogni LIVE_TTL_MS per istanza. Inoltre /api/status è protetta da APP_API_KEY
// (vedi middleware) quando configurato.
const LIVE_TTL_MS = 60_000
let liveCache = null // { at, providers, overall }

async function fetchWithTimeout(url, options, ms = 12000) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...options, signal: ctrl.signal })
  } finally {
    clearTimeout(id)
  }
}

async function checkGemini() {
  const key = process.env.GEMINI_API_KEY
  if (!key) return { configured: false, status: 'missing', label: 'Chiave non configurata' }
  try {
    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({ apiKey: key })
    const res = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: 'OK' }] }],
      config: { maxOutputTokens: 1 },
    })
    if (res?.candidates?.[0]?.content?.parts?.[0]?.text != null) {
      return { configured: true, status: 'available', label: 'Disponibile' }
    }
    return { configured: true, status: 'unknown', label: 'Risposta inattesa' }
  } catch (err) {
    const msg = String(err?.message ?? '')
    const status = err?.status ?? err?.code
    if (status === 429 || status === 8 || /quota|exceeded|RESOURCE_EXHAUSTED/i.test(msg)) {
      return { configured: true, status: 'quota_exhausted', label: 'Quota esaurita', detail: 'Limite quota giornaliera Gemini.' }
    }
    if (status === 401 || /API key|unauthenticated|PERMISSION_DENIED/i.test(msg)) {
      return { configured: true, status: 'invalid_key', label: 'Chiave non valida', detail: 'GEMINI_API_KEY errata.' }
    }
    return { configured: true, status: 'error', label: `Errore: ${msg.slice(0, 80)}` }
  }
}

async function checkGroq() {
  const key = process.env.GROQ_API_KEY
  if (!key) return { configured: false, status: 'missing', label: 'Chiave non configurata' }
  try {
    const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai/gpt-oss-20b', messages: [{ role: 'user', content: 'OK' }], max_tokens: 1 }),
    })
    const remaining = res.headers.get('x-ratelimit-remaining-requests')
    const limit = res.headers.get('x-ratelimit-limit-requests')
    if (res.ok) return { configured: true, status: 'available', label: 'Disponibile', limit: limit ? `${remaining}/${limit}` : null }
    if (res.status === 429) return { configured: true, status: 'quota_exhausted', label: 'Rate limit esaurito', detail: 'Limite richieste Groq.' }
    if (res.status === 401) return { configured: true, status: 'invalid_key', label: 'Chiave non valida', detail: 'GROQ_API_KEY errata.' }
    return { configured: true, status: 'error', label: `HTTP ${res.status}` }
  } catch (err) {
    if (err.name === 'AbortError') return { configured: true, status: 'timeout', label: 'Timeout', detail: 'Groq non risponde entro 12s.' }
    return { configured: true, status: 'error', label: err.message.slice(0, 80) }
  }
}

async function checkOpenRouter() {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return { configured: false, status: 'missing', label: 'Chiave non configurata' }
  try {
    const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openrouter/free', messages: [{ role: 'user', content: 'OK' }], max_tokens: 1 }),
    })
    if (res.ok) return { configured: true, status: 'available', label: 'Disponibile' }
    if (res.status === 429) return { configured: true, status: 'quota_exhausted', label: 'Rate limit raggiunto', detail: 'Limite richieste OpenRouter.' }
    if (res.status === 401 || res.status === 403) return { configured: true, status: 'invalid_key', label: 'Chiave non valida', detail: 'OPENROUTER_API_KEY errata.' }
    if (res.status === 402) return { configured: true, status: 'no_credits', label: 'Crediti insufficienti' }
    return { configured: true, status: 'error', label: `HTTP ${res.status}` }
  } catch (err) {
    if (err.name === 'AbortError') return { configured: true, status: 'timeout', label: 'Timeout', detail: 'OpenRouter non risponde entro 12s.' }
    return { configured: true, status: 'error', label: err.message.slice(0, 80) }
  }
}

async function checkNvidia() {
  const key = process.env.NVIDIA_API_KEY
  if (!key) return { configured: false, status: 'missing', label: 'Chiave non configurata' }
  try {
    const res = await fetchWithTimeout('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'meta/llama-3.1-70b-instruct', messages: [{ role: 'user', content: 'OK' }], max_tokens: 1 }),
    }, 30000)
    if (res.ok) return { configured: true, status: 'available', label: 'Disponibile' }
    if (res.status === 429) return { configured: true, status: 'quota_exhausted', label: 'Quota esaurita', detail: 'Limite NVIDIA.' }
    if (res.status === 401 || res.status === 403) return { configured: true, status: 'invalid_key', label: 'Chiave non valida', detail: 'NVIDIA_API_KEY errata.' }
    return { configured: true, status: 'error', label: `HTTP ${res.status}` }
  } catch (err) {
    if (err.name === 'AbortError') return { configured: true, status: 'timeout', label: 'Timeout (cold-start)', detail: 'NVIDIA NIM può impiegare 30-60s al primo avvio.' }
    return { configured: true, status: 'error', label: err.message.slice(0, 80) }
  }
}

async function checkTavily() {
  const key = process.env.TAVILY_API_KEY
  if (!key) return { configured: false, status: 'missing', label: 'Chiave non configurata' }
  try {
    const res = await fetchWithTimeout('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, query: 'OK', search_depth: 'basic', max_results: 1 }),
    })
    if (res.ok) return { configured: true, status: 'available', label: 'Disponibile' }
    if (res.status === 429) return { configured: true, status: 'quota_exhausted', label: 'Quota esaurita', detail: 'Limite Tavily.' }
    if (res.status === 401) return { configured: true, status: 'invalid_key', label: 'Chiave non valida', detail: 'TAVILY_API_KEY errata.' }
    return { configured: true, status: 'error', label: `HTTP ${res.status}` }
  } catch (err) {
    if (err.name === 'AbortError') return { configured: true, status: 'timeout', label: 'Timeout', detail: 'Tavily non risponde entro 12s.' }
    return { configured: true, status: 'error', label: err.message.slice(0, 80) }
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const wantLive = searchParams.get('live') === '1'

  const providers = {
    gemini: envStatus(process.env.GEMINI_API_KEY),
    groq: envStatus(process.env.GROQ_API_KEY),
    nvidia: envStatus(process.env.NVIDIA_API_KEY),
    openrouter: envStatus(process.env.OPENROUTER_API_KEY),
    tavily: envStatus(process.env.TAVILY_API_KEY),
  }
  const overallConfigured = providers.gemini.configured && providers.groq.configured

  let live = null
  if (wantLive) {
    const now = Date.now()
    if (liveCache && now - liveCache.at < LIVE_TTL_MS) {
      live = liveCache
    } else {
      const [gemini, groq, nvidia, openrouter, tavily] = await Promise.all([
        checkGemini(),
        checkGroq(),
        checkNvidia(),
        checkOpenRouter(),
        checkTavily(),
      ])
      const providersLive = { gemini, groq, nvidia, openrouter, tavily }
      const overallLive = [gemini, groq, nvidia, openrouter].every((p) => p.status === 'available')
      live = { at: now, providers: providersLive, overall: overallLive }
      liveCache = live
    }
  }

  return NextResponse.json({
    overall: overallConfigured,
    providers,
    live: live ? live.providers : null,
    liveCheckedAt: live ? new Date(live.at).toISOString() : null,
    note: wantLive
      ? 'Verifica live eseguita (cache 60s, costo minimo).'
      : 'Stato basato sulla presenza delle chiavi. Clicca "Verifica ora" per un controllo reale dei provider (cache 60s).',
  })
}
