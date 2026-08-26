import fs from 'fs'
import path from 'path'

const STATE_FILE =
  process.env.WATCHDOG_STATE_FILE ||
  path.join(process.cwd(), 'data', 'watchdog-state.json')

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    }
  } catch {
    /* stato illeggibile: ricomincia da zero */
  }
  return {}
}

function saveState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true })
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
  } catch {
    /* permessi/fs read-only: lo stato vive solo in memoria per il processo */
  }
}

async function fetchWithTimeout(url, options, ms = 15000) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...options, signal: ctrl.signal })
  } finally {
    clearTimeout(id)
  }
}

// Modelli "free" monitorati: la coda della fallback chain + il validatore Groq.
// Se uno di questi va offline, la catena di generazione/validazione degrada.
export const MONITORED = [
  {
    id: 'groq-validator',
    label: 'Groq Qwen 3.6 27B (validatore)',
    type: 'groq',
    model: 'qwen/qwen3.6-27b',
  },
  {
    id: 'openrouter-free',
    label: 'OpenRouter: openrouter/free',
    type: 'openrouter',
    model: 'openrouter/free',
  },
  {
    id: 'or-nvidia-nano',
    label: 'OpenRouter: nvidia/nemotron-3-nano-30b-a3b',
    type: 'openrouter',
    model: 'nvidia/nemotron-3-nano-30b-a3b',
  },
  {
    id: 'or-nvidia-49b',
    label: 'OpenRouter: nvidia/llama-3.3-nemotron-super-49b-v1.5',
    type: 'openrouter',
    model: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
  },
  {
    id: 'or-nvidia-120b',
    label: 'OpenRouter: nvidia/nemotron-3-super-120b-a12b',
    type: 'openrouter',
    model: 'nvidia/nemotron-3-super-120b-a12b',
  },
  {
    id: 'nvidia-nim',
    label: 'NVIDIA NIM diretto',
    type: 'nvidia',
    model: process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-super-120b-a12b',
  },
]

async function checkGroq(model) {
  const key = process.env.GROQ_API_KEY
  if (!key) return { status: 'unconfigured', label: 'Non configurata' }
  try {
    const res = await fetchWithTimeout(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'OK' }],
          max_tokens: 1,
        }),
      }
    )
    if (res.ok) return { status: 'available', label: 'Disponibile' }
    if (res.status === 429) return { status: 'down', label: 'Rate limit esaurito' }
    if (res.status === 401) return { status: 'down', label: 'Chiave non valida' }
    return { status: 'down', label: `HTTP ${res.status}` }
  } catch (e) {
    if (e.name === 'AbortError') return { status: 'down', label: 'Timeout' }
    return { status: 'down', label: e.message.slice(0, 80) }
  }
}

async function checkOpenRouter(model) {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return { status: 'unconfigured', label: 'Non configurata' }
  try {
    const res = await fetchWithTimeout(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'OK' }],
          max_tokens: 1,
        }),
      }
    )
    if (res.ok) return { status: 'available', label: 'Disponibile' }
    if (res.status === 429) return { status: 'down', label: 'Rate limit' }
    if (res.status === 401 || res.status === 403)
      return { status: 'down', label: 'Chiave non valida' }
    if (res.status === 402) return { status: 'down', label: 'Crediti esauriti' }
    if (res.status === 404 || res.status === 410)
      return { status: 'down', label: 'Modello rimosso' }
    return { status: 'down', label: `HTTP ${res.status}` }
  } catch (e) {
    if (e.name === 'AbortError') return { status: 'down', label: 'Timeout' }
    return { status: 'down', label: e.message.slice(0, 80) }
  }
}

async function checkNvidia(model) {
  const key = process.env.NVIDIA_API_KEY
  if (!key) return { status: 'unconfigured', label: 'Non configurata' }
  try {
    const res = await fetchWithTimeout(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'OK' }],
          max_tokens: 1,
        }),
      },
      30000
    )
    if (res.ok) return { status: 'available', label: 'Disponibile' }
    if (res.status === 429) return { status: 'down', label: 'Quota esaurita' }
    if (res.status === 401 || res.status === 403)
      return { status: 'down', label: 'Chiave non valida' }
    if (res.status === 404 || res.status === 410)
      return { status: 'down', label: 'Modello rimosso' }
    return { status: 'down', label: `HTTP ${res.status}` }
  } catch (e) {
    if (e.name === 'AbortError') return { status: 'down', label: 'Timeout (cold-start)' }
    return { status: 'down', label: e.message.slice(0, 80) }
  }
}

async function checkOne(m) {
  if (m.type === 'groq') return checkGroq(m.model)
  if (m.type === 'openrouter') return checkOpenRouter(m.model)
  if (m.type === 'nvidia') return checkNvidia(m.model)
  return { status: 'unknown', label: 'Sconosciuto' }
}

function buildMessage({ transitions, recoveries, down }) {
  const lines = ['🔔 IusMente — Watchdog provider free']
  if (transitions.length) {
    lines.push('\n⚠️ MODELLI FREE OFFLINE:')
    for (const t of transitions)
      lines.push(`• ${t.label} (${t.model}) — ${t.detail}`)
    lines.push(
      '\n➡️ Sostituisci il modello nella catena di fallback/validazione (variabili d’ambiente) prima che la catena si interrompa.'
    )
  }
  if (recoveries.length) {
    lines.push('\n✅ TORNATI ONLINE:')
    for (const r of recoveries) lines.push(`• ${r.label}`)
  }
  if (!transitions.length && !recoveries.length) {
    lines.push(down.length ? '\nNessun cambiamento (alcuni già offline).' : '\nTutti i modelli monitorati sono online. ✅')
  }
  return lines.join('\n')
}

async function sendNotification(text) {
  const webhook = process.env.WATCHDOG_WEBHOOK_URL
  const tgToken = process.env.WATCHDOG_TELEGRAM_TOKEN
  const tgChat = process.env.WATCHDOG_TELEGRAM_CHAT_ID
  const promises = []
  if (webhook) {
    promises.push(
      fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, text }),
      }).catch((e) => console.error('[watchdog] webhook fallito:', e.message))
    )
  }
  if (tgToken && tgChat) {
    const url = `https://api.telegram.org/bot${tgToken}/sendMessage?chat_id=${encodeURIComponent(
      tgChat
    )}&text=${encodeURIComponent(text)}`
    promises.push(
      fetch(url).catch((e) => console.error('[watchdog] telegram fallito:', e.message))
    )
  }
  await Promise.all(promises)
}

export async function runWatchdog({ notify = false } = {}) {
  const prev = loadState()
  const results = {}
  const downNow = []
  const transitions = []
  const recoveries = []

  for (const m of MONITORED) {
    const r = await checkOne(m)
    results[m.id] = { ...r, label: m.label, type: m.type, model: m.model }
    if (r.status === 'down') downNow.push(m)

    const was = prev[m.id]?.status
    if (r.status === 'down' && was && was !== 'down') {
      transitions.push({
        id: m.id,
        label: m.label,
        model: m.model,
        from: was,
        to: 'down',
        detail: r.label,
      })
    } else if (r.status === 'down' && !was) {
      // Prima rilevazione: segnala comunque i modelli già offline.
      transitions.push({
        id: m.id,
        label: m.label,
        model: m.model,
        from: 'unknown',
        to: 'down',
        detail: r.label,
      })
    } else if (r.status === 'available' && was === 'down') {
      recoveries.push({ id: m.id, label: m.label })
    }
  }

  const newState = { at: Date.now() }
  for (const m of MONITORED) newState[m.id] = { status: results[m.id].status, at: Date.now() }
  saveState(newState)

  const message = buildMessage({ transitions, recoveries, down: downNow })
  const shouldNotify = notify && (transitions.length > 0 || recoveries.length > 0)
  if (shouldNotify) await sendNotification(message)

  return {
    at: new Date().toISOString(),
    results,
    down: downNow.map((m) => m.id),
    transitions,
    recoveries,
    notified: shouldNotify,
    message,
  }
}

// Report read-only dell'ultimo stato salvato su disco, SENZA eseguire nuovi
// check di rete e SENZA inviare notifiche. Usato dalla pagina /status per
// mostrare lo stato dei modelli free monitorati.
export function reportWatchdog() {
  const state = loadState()
  const results = {}
  const downNow = []
  for (const m of MONITORED) {
    const s = state[m.id]?.status || 'unknown'
    results[m.id] = { status: s, label: m.label, type: m.type, model: m.model }
    if (s === 'down') downNow.push(m.id)
  }
  return {
    at: state.at ? new Date(state.at).toISOString() : null,
    ran: !!state.at,
    results,
    down: downNow,
  }
}
