import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const OR_ENDPOINT = 'https://openrouter.ai/api/v1'

const TIMEOUT_MS = 8000

const fetchWithTimeout = async (url, options, ms = TIMEOUT_MS) => {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

async function checkGemini() {
  const key = process.env.GEMINI_API_KEY
  if (!key) return { configured: false, status: 'missing', label: 'Chiave non configurata' }
  try {
    const ai = new GoogleGenAI({ apiKey: key })
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
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
      return { configured: true, status: 'quota_exhausted', label: 'Quota giornaliera esaurita' }
    }
    if (status === 401 || /API key|unauthenticated|PERMISSION_DENIED/i.test(msg)) {
      return { configured: true, status: 'invalid_key', label: 'Chiave non valida' }
    }
    return { configured: true, status: 'error', label: `Errore: ${msg.slice(0, 80)}` }
  }
}

async function checkGroq() {
  const key = process.env.GROQ_API_KEY
  if (!key) return { configured: false, status: 'missing', label: 'Chiave non configurata' }
  try {
    const res = await fetchWithTimeout(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'OK' }],
        max_tokens: 1,
      }),
    })

    const remaining = res.headers.get('x-ratelimit-remaining-requests')
    const limit = res.headers.get('x-ratelimit-limit-requests')

    if (res.ok) {
      return {
        configured: true,
        status: 'available',
        label: `Disponibile`,
        limit: limit ? `${remaining}/${limit}` : null,
      }
    }

    if (res.status === 429) {
      return { configured: true, status: 'quota_exhausted', label: 'Rate limit esaurito', limit: limit ? `0/${limit}` : null }
    }
    if (res.status === 401) {
      return { configured: true, status: 'invalid_key', label: 'Chiave non valida' }
    }
    const body = await res.text()
    return { configured: true, status: 'error', label: `HTTP ${res.status}: ${body.slice(0, 80)}` }
  } catch (err) {
    if (err.name === 'AbortError') return { configured: true, status: 'timeout', label: 'Timeout (8s)' }
    return { configured: true, status: 'error', label: err.message.slice(0, 80) }
  }
}

async function checkOpenRouter() {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return { configured: false, status: 'missing', label: 'Chiave non configurata' }
  try {
    // Auth/key endpoint gives usage stats
    const authRes = await fetchWithTimeout(`${OR_ENDPOINT}/auth/key`, {
      headers: { 'Authorization': `Bearer ${key}` },
    })

    let usage = null
    let limit = null
    if (authRes.ok) {
      const authData = await authRes.json()
      if (authData?.data) {
        usage = authData.data.usage
        limit = authData.data.limit
        // If limit is null, it's a free key with unspecified limits
      }
    }

    // Test completion
    const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-lite-001',
        messages: [{ role: 'user', content: 'OK' }],
        max_tokens: 1,
      }),
    })

    const remaining = res.headers.get('x-ratelimit-remaining-requests')
    const rateLimit = res.headers.get('x-ratelimit-limit-requests')

    if (res.ok) {
      return {
        configured: true,
        status: 'available',
        label: limit != null ? `Usati ${usage}/${limit} crediti` : 'Disponibile (crediti illimitati)',
        limit: remaining ? `${remaining}/${rateLimit}` : null,
      }
    }

    if (res.status === 429) {
      return {
        configured: true,
        status: 'quota_exhausted',
        label: limit != null ? `Quota esaurita (${usage}/${limit})` : 'Rate limit raggiunto',
        limit: remaining ? `0/${rateLimit}` : null,
      }
    }
    if (res.status === 401 || res.status === 403) {
      return { configured: true, status: 'invalid_key', label: 'Chiave non valida o senza permessi' }
    }
    const body = await res.text()
    return { configured: true, status: 'error', label: `HTTP ${res.status}: ${body.slice(0, 80)}` }
  } catch (err) {
    if (err.name === 'AbortError') return { configured: true, status: 'timeout', label: 'Timeout (8s)' }
    return { configured: true, status: 'error', label: err.message.slice(0, 80) }
  }
}

export async function GET() {
  const [gemini, groq, openrouter] = await Promise.all([
    checkGemini(),
    checkGroq(),
    checkOpenRouter(),
  ])

  const overall = [gemini, groq, openrouter].every(p => p.status === 'available')

  return NextResponse.json({
    overall,
    providers: {
      gemini,
      groq,
      openrouter,
    },
  })
}
