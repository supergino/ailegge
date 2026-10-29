#!/usr/bin/env node
// Audit settimanale dei modelli free (Gemini, Groq, NVIDIA NIM, OpenRouter) con
// aggiornamento automatico di lib/ai-models.mjs quando un modello viene ritirato.
//
// Perché serve: i provider free mettono in fase-out i modelli senza preavviso
// (404/410) e li sostituiscono con altri. Il solo catalogo non basta — NVIDIA
// elenca modelli non abilitati all'account e OpenRouter restituisce 402 senza
// crediti — quindi ogni candidato viene provato con una generazione reale.
//
// Regole di sicurezza:
//  - un modello viene sostituito SOLO se risponde 404/410 (o 400 "model not found")
//    per più tentativi. Rate limit, quota esaurita, timeout e 5xx NON sono fasi-out:
//    in quei casi non si tocca nulla (altrimenti un picco di traffico cambierebbe
//    i modelli a caso).
//  - Gemini resta su Flash-Lite e non si scende mai sotto i limiti token attuali.
//  - le modifiche sono applicate solo con --apply; commit/push solo con --commit,
//    e solo dopo `npm run build` verde (altrimenti rollback).
//
// Uso:
//   node scripts/auto-update-models.mjs                     # audit, nessuna modifica
//   node scripts/auto-update-models.mjs --apply             # applica le sostituzioni
//   node scripts/auto-update-models.mjs --apply --commit    # + build + commit + push
//   node scripts/auto-update-models.mjs --notify=always     # notifica anche se è tutto ok
//
// Exit code: 0 = tutto ok (eventualmente corretto), 1 = modello morto non
// sostituibile, chiave non valida o build fallita.

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MODELS_FILE = path.join(ROOT, 'lib', 'ai-models.mjs')
const CHANGELOG_FILE = path.join(ROOT, 'CHANGELOG.md')
const PKG_FILE = path.join(ROOT, 'package.json')
const LOCK_FILE = path.join(ROOT, 'package-lock.json')
const PAGE_FILE = path.join(ROOT, 'app', 'page.js')

const ARGS = new Set(process.argv.slice(2))
const APPLY = ARGS.has('--apply')
const COMMIT = ARGS.has('--commit') && APPLY
const DRY = !APPLY
const NOTIFY_MODE = [...ARGS].find((a) => a.startsWith('--notify='))?.split('=')[1] || 'auto'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models'
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const NVIDIA_MODELS_URL = 'https://integrate.api.nvidia.com/v1/models'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'

// Tetti ai tentativi: ogni probe consuma quota free. Alzare solo se necessario.
const PROBE_ATTEMPTS = Number(process.env.MODELS_PROBE_ATTEMPTS || 2)
const MAX_CANDIDATES = Number(process.env.MODELS_MAX_CANDIDATES || 8)
const NVIDIA_TIMEOUT_MS = 60000
const DEFAULT_TIMEOUT_MS = 30000

// ---------------------------------------------------------------------------
// Ambiente
// ---------------------------------------------------------------------------

function loadEnv(file) {
  const p = path.join(ROOT, file)
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[m[1]]) process.env[m[1]] = v
  }
}

loadEnv('.env.local')
loadEnv('.env')

const keys = {
  gemini: process.env.GEMINI_API_KEY,
  groq: process.env.GROQ_API_KEY,
  nvidia: process.env.NVIDIA_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
}

// ---------------------------------------------------------------------------
// Rete
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function request(url, { method = 'GET', headers = {}, body, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeoutMs)
  const started = Date.now()
  try {
    const res = await fetch(url, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    const text = await res.text()
    return { status: res.status, ms: Date.now() - started, text }
  } catch (err) {
    const reason = err.name === 'AbortError' ? `timeout ${timeoutMs}ms` : err.message
    return { status: 0, ms: Date.now() - started, text: reason }
  } finally {
    clearTimeout(id)
  }
}

function jsonOrNull(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// Classifica un esito HTTP. Solo 'gone' autorizza una sostituzione automatica.
function classify(status, raw, provider) {
  const body = String(raw || '')
  if (status >= 200 && status < 300) return 'ok'
  // OpenRouter risponde 404 "No endpoints found" quando il modello esiste ma
  // nessun provider lo eroga in questo momento: è temporaneo, non un fase-out.
  if (status === 404 && provider === 'openrouter') return 'transient'
  if (status === 404 || status === 410) return 'gone'
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate_limited'
  if (status === 402) return 'no_credits'
  if (
    status === 400 &&
    /model[_ -]?not[_ -]?found|does not exist|no such model|invalid model|not a valid model|not supported|decommission|retir|deprecat/i.test(body)
  ) {
    return 'gone'
  }
  if (status >= 500 || status === 0) return 'transient'
  return 'error'
}

function short(raw, n = 120) {
  return String(raw || '').replace(/\s+/g, ' ').slice(0, n)
}

// ---------------------------------------------------------------------------
// Probe (generazione reale, non solo catalogo)
// ---------------------------------------------------------------------------

const GEMINI_SCHEMA = {
  type: 'OBJECT',
  properties: {
    text: { type: 'STRING' },
    fonti: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { nome: { type: 'STRING' }, sito: { type: 'STRING' } },
        required: ['nome', 'sito'],
      },
    },
  },
  required: ['text', 'fonti'],
}

function geminiText(json) {
  return json?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join('') || null
}

async function probeGemini(model) {
  const r = await request(`${GEMINI_BASE}/models/${model}:generateContent?key=${keys.gemini}`, {
    method: 'POST',
    body: {
      contents: [{ role: 'user', parts: [{ text: 'Rispondi con un oggetto JSON con text e fonti.' }] }],
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_SCHEMA,
      },
    },
  })
  const parsed = jsonOrNull(r.text)
  const text = geminiText(parsed)
  let valid = false
  if (text) {
    const p = jsonOrNull(text)
    valid = Boolean(p?.text) && Array.isArray(p?.fonti)
  }
  // Gemini segnala gli errori in JSON: il body serve a classificare 404/400.
  const kind = r.status === 200 ? (valid ? 'ok' : 'invalid') : classify(r.status, parsed?.error?.message || r.text, 'gemini')
  return { kind, ms: r.ms, detail: r.status === 200 ? (valid ? 'JSON valido' : 'JSON non conforme') : short(parsed?.error?.message || r.text) }
}

async function probeOpenAiCompatible({ url, key, model, role, provider, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const body =
    role === 'validator'
      ? {
          model,
          messages: [
            { role: 'system', content: 'Sei un validatore giuridico. Rispondi solo con JSON valido.' },
            { role: 'user', content: 'Valida questo riferimento: "Art. 2043 c.c.". Rispondi con {"valido":true,"problemi":[],"confidenza":0.9} e nient\'altro.' },
          ],
          temperature: 0,
          max_completion_tokens: 900,
          response_format: { type: 'json_object' },
        }
      : {
          model,
          messages: [
            { role: 'system', content: 'Rispondi solo con JSON valido, nessun testo extra.' },
            { role: 'user', content: 'Restituisci un oggetto JSON con chiave text e array fonti.' },
          ],
          temperature: 0.2,
          max_completion_tokens: 700,
        }
  if (role !== 'validator' && model !== 'openrouter/free') body.response_format = { type: 'json_object' }
  if (String(model).includes('gpt-oss')) body.reasoning_effort = 'low'

  const r = await request(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body,
    timeoutMs,
  })
  const parsed = jsonOrNull(r.text)
  const content = parsed?.choices?.[0]?.message?.content ?? null
  const obj = content ? jsonOrNull(content) : null
  const valid =
    role === 'validator'
      ? Boolean(obj && typeof obj.valido === 'boolean' && Array.isArray(obj.problemi))
      : Boolean(obj)
  const kind = r.status === 200 ? (valid ? 'ok' : 'invalid') : classify(r.status, r.text, provider)
  const detail =
    r.status === 200
      ? valid
        ? 'JSON valido'
        : 'JSON non conforme'
      : short(parsed?.error?.message || parsed?.error || r.text)
  return { kind, ms: r.ms, detail }
}

// Un probe "gone" viene riconfermato una volta: evita falsi positivi da 404
// transitori (già visti su provider free).
async function verifyModel(probeFn, { attempts = PROBE_ATTEMPTS } = {}) {
  let last = null
  for (let i = 1; i <= attempts; i++) {
    const r = await probeFn()
    if (r.kind === 'ok') return { ...r, attempts: i }
    last = r
    if (r.kind !== 'gone') break // transient/auth/rate limit: non insistere
    await sleep(2000)
  }
  return { ...last, attempts }
}

// ---------------------------------------------------------------------------
// Cataloghi
// ---------------------------------------------------------------------------

async function geminiCatalog() {
  const r = await request(`${GEMINI_BASE}/models?key=${keys.gemini}&pageSize=200`)
  const j = jsonOrNull(r.text)
  return Array.isArray(j?.models) ? j.models : []
}

async function groqCatalog() {
  const r = await request(GROQ_MODELS_URL, { headers: { Authorization: `Bearer ${keys.groq}` } })
  const j = jsonOrNull(r.text)
  return (j?.data || []).map((m) => m.id)
}

async function nvidiaCatalog() {
  const r = await request(NVIDIA_MODELS_URL, { headers: { Authorization: `Bearer ${keys.nvidia}` } })
  const j = jsonOrNull(r.text)
  return (j?.data || []).map((m) => m.id)
}

async function openrouterCatalog() {
  const r = await request(OPENROUTER_MODELS_URL)
  const j = jsonOrNull(r.text)
  return (j?.data || []).map((m) => ({
    id: m.id,
    context: m.context_length || 0,
    pricing: m.pricing || {},
  }))
}

// ---------------------------------------------------------------------------
// Etichette e versioni
// ---------------------------------------------------------------------------

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

// gemini-3.5-flash-lite -> "Gemini 3.5 Flash-Lite"
// gemini-3.8-flash -> "Gemini 3.8 Flash"
function deriveGeminiLabel(id) {
  const parts = String(id).replace(/^models\//, '').replace(/^gemini-/, '').split('-')
  const [version, ...rest] = parts
  const tail = rest.map(cap).join('-')
  return `Gemini ${version}${tail ? ` ${tail}` : ''}`
}

// qwen/qwen3.8-27b -> "Qwen 3.8 27B"; openai/gpt-oss-20b -> "gpt-oss-20b"
function deriveModelLabel(id) {
  const raw = String(id).split('/').pop()
  if (/^gpt-oss/i.test(raw)) return raw
  const spaced = raw.replace(/([a-z])(\d)/gi, '$1 $2').replace(/[-_]+/g, ' ').trim()
  return spaced
    .split(/\s+/)
    .map((t) => (/^\d+(\.\d+)?[bm]$/i.test(t) ? t.toUpperCase() : cap(t)))
    .join(' ')
}

function versionParts(id) {
  const m = String(id).match(/(\d+(?:\.\d+)*)/g)
  return m ? m.map(Number) : [0]
}

function compareVersionsDesc(a, b) {
  const va = versionParts(a)
  const vb = versionParts(b)
  for (let i = 0; i < Math.max(va.length, vb.length); i++) {
    const d = (vb[i] || 0) - (va[i] || 0)
    if (d) return d
  }
  return String(b).localeCompare(String(a))
}

function bumpPatch(v) {
  const m = String(v).match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!m) throw new Error(`versione non semver: ${v}`)
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`
}

// ---------------------------------------------------------------------------
// Scelta dei sostituti
// ---------------------------------------------------------------------------

const GEMINI_EXCLUDE = /(image|imagen|tts|embedding|embed|live|audio|native-audio|omni|banana|veo|robotics|computer-use|transcribe|aqa)/i

async function findGeminiReplacement(current, currentLimits) {
  const catalog = await geminiCatalog()
  if (!catalog.length) return null

  const usable = catalog.filter((m) => {
    const id = String(m.name).replace(/^models\//, '')
    if (id === current) return false
    if (!(m.supportedGenerationMethods || []).includes('generateContent')) return false
    if (!/^gemini-/.test(id) || GEMINI_EXCLUDE.test(id)) return false
    // Policy: solo Flash-Lite (variante free con quota più alta).
    if (!/flash-lite/.test(id)) return false
    if (currentLimits.input && m.inputTokenLimit < currentLimits.input) return false
    if (currentLimits.output && m.outputTokenLimit < currentLimits.output) return false
    return true
  })

  // Preferenza: versione stabile più recente, poi alias "-latest", poi preview.
  const stable = usable
    .filter((m) => !/-(preview|exp)/.test(m.name))
    .sort((a, b) => compareVersionsDesc(a.name, b.name))
  const ordered = [
    ...stable,
    ...usable.filter((m) => /flash-lite-latest$/.test(m.name)),
    ...usable.filter((m) => /-(preview|exp)/.test(m.name)),
  ]
  const seen = new Set()
  const candidates = ordered
    .map((m) => String(m.name).replace(/^models\//, ''))
    .filter((id) => (seen.has(id) ? false : seen.add(id)))

  for (const id of candidates.slice(0, MAX_CANDIDATES)) {
    const r = await verifyModel(() => probeGemini(id))
    if (r.kind === 'ok') return { model: id, label: deriveGeminiLabel(id), detail: `${r.ms}ms` }
    if (r.kind !== 'gone') console.log(`  · Gemini ${id}: ${r.kind} (${r.detail})`)
  }
  return null
}

async function findGroqReplacement({ current, role, exclude = [] }) {
  const catalog = await groqCatalog()
  if (!catalog.length) return null

  const blocked = /(whisper|tts|orpheus|guard|safety|safeguard|embed|rerank|moderation)/i
  const usable = catalog
    .filter((id) => !blocked.test(id))
    .filter((id) => id !== current && !exclude.includes(id))

  // Preferenza: famiglie note per JSON affidabile, poi il resto.
  const score = (id) => (/qwen/i.test(id) ? 0 : /gpt-oss/i.test(id) ? 1 : /llama|gemma|mistral/i.test(id) ? 2 : 3)
  const ordered = [...usable].sort((a, b) => score(a) - score(b) || compareVersionsDesc(a, b))

  for (const id of ordered.slice(0, MAX_CANDIDATES)) {
    const r = await verifyModel(() =>
      probeOpenAiCompatible({ url: GROQ_URL, key: keys.groq, model: id, role, provider: 'groq' })
    )
    if (r.kind === 'ok') return { model: id, label: deriveModelLabel(id), detail: `${r.ms}ms` }
    if (r.kind !== 'gone') console.log(`  · Groq ${id}: ${r.kind} (${r.detail})`)
    await sleep(400) // rispetto del TPM free tier
  }
  return null
}

const NVIDIA_BLOCKED = /(embed|rerank|parse|safety|guard|reward|ocr|deplot|kosmos|fuyu|neva|clip|segformer|video|image|tts|audio|asr|moderation|nemoretriever)/i
const NVIDIA_PREFERENCE = [
  /^nvidia\/nemotron-3\.5-super/i,
  /^nvidia\/nemotron-3\.5-lightning/i,
  /^nvidia\/nemotron-3-super/i,
  /^nvidia\/nemotron-3-ultra/i,
  /^nvidia\/nemotron-3-nano/i,
  /^nvidia\/nemotron-4/i,
  /^nvidia\/llama-3\.3-nemotron/i,
  /^nvidia\/llama-3\.1-nemotron-ultra/i,
  /^openai\/gpt-oss/i,
  /^qwen\//i,
  /^meta\/llama-3\.3/i,
  /^meta\/llama-3\.1/i,
]

async function findNvidiaReplacement(current) {
  const catalog = await nvidiaCatalog()
  if (!catalog.length) return null
  const usable = catalog.filter((id) => id !== current && !NVIDIA_BLOCKED.test(id))
  const score = (id) => {
    const i = NVIDIA_PREFERENCE.findIndex((re) => re.test(id))
    return i === -1 ? NVIDIA_PREFERENCE.length : i
  }
  const ordered = [...usable].sort((a, b) => score(a) - score(b) || compareVersionsDesc(a, b))

  for (const id of ordered.slice(0, MAX_CANDIDATES)) {
    const r = await verifyModel(
      () => probeOpenAiCompatible({ url: NVIDIA_URL, key: keys.nvidia, model: id, role: 'generator', provider: 'nvidia', timeoutMs: NVIDIA_TIMEOUT_MS }),
      { attempts: 1 }
    )
    if (r.kind === 'ok') return { model: id, detail: `${r.ms}ms` }
    if (r.kind === 'gone') console.log(`  · NVIDIA ${id}: non abilitato all'account`)
  }
  return null
}

const OPENROUTER_BLOCKED = /(content-safety|embed|guard|safety|parse|rerank|moderation)/i

async function findOpenRouterReplacements({ current, have, slots }) {
  if (slots <= 0) return []
  const catalog = await openrouterCatalog()
  const free = catalog.filter(
    (m) => m.id !== 'openrouter/free' && String(m.id).endsWith(':free') && !OPENROUTER_BLOCKED.test(m.id)
  )
  const usable = free.filter((m) => m.id !== current && !have.includes(m.id))
  // Preferenza: famiglia NVIDIA (stessa qualità del resto della catena), poi contesto.
  const ordered = [...usable].sort((a, b) => {
    const na = /^nvidia\//.test(a.id) ? 0 : 1
    const nb = /^nvidia\//.test(b.id) ? 0 : 1
    return na - nb || b.context - a.context
  })

  const found = []
  for (const m of ordered.slice(0, MAX_CANDIDATES)) {
    if (found.length >= slots) break
    const r = await verifyModel(() =>
      probeOpenAiCompatible({ url: OPENROUTER_URL, key: keys.openrouter, model: m.id, role: 'generator', provider: 'openrouter' })
    )
    if (r.kind === 'ok') found.push({ model: m.id, detail: `${r.ms}ms` })
    else if (r.kind !== 'gone') console.log(`  · OpenRouter ${m.id}: ${r.kind} (${r.detail})`)
  }
  return found.slice(0, slots)
}

// ---------------------------------------------------------------------------
// Lettura/scrittura lib/ai-models.mjs
// ---------------------------------------------------------------------------

async function loadModelsConfig() {
  const url = `${pathToFileURL(MODELS_FILE).href}?v=${Date.now()}`
  return import(url)
}

function setConst(src, name, value) {
  const re = new RegExp(`export const ${name} = '[^']*'`)
  if (!re.test(src)) throw new Error(`export ${name} non trovato in lib/ai-models.mjs`)
  return src.replace(re, `export const ${name} = '${value}'`)
}

function setArray(src, name, values) {
  const re = new RegExp(`export const ${name} = \\[[\\s\\S]*?\\]`)
  if (!re.test(src)) throw new Error(`export ${name} non trovato in lib/ai-models.mjs`)
  const body = values.map((v) => `  '${v}',`).join('\n')
  return src.replace(re, `export const ${name} = [\n${body}\n]`)
}

// ---------------------------------------------------------------------------
// Metadati delle "ruoli" (modelli configurati)
// ---------------------------------------------------------------------------

function rolesFrom(cfg) {
  return [
    { id: 'gemini', provider: 'gemini', model: cfg.GEMINI_MODEL, label: cfg.GEMINI_MODEL_LABEL, probe: () => probeGemini(cfg.GEMINI_MODEL) },
    { id: 'groq-validator', provider: 'groq', role: 'validator', model: cfg.GROQ_VALIDATOR_MODEL, label: cfg.GROQ_VALIDATOR_LABEL },
    { id: 'groq-fallback', provider: 'groq', role: 'generator', model: cfg.GROQ_FALLBACK_MODEL, label: cfg.GROQ_FALLBACK_LABEL },
    { id: 'nvidia', provider: 'nvidia', role: 'generator', model: process.env.NVIDIA_MODEL || cfg.NVIDIA_MODEL },
    { id: 'openrouter', provider: 'openrouter', role: 'generator', model: cfg.OPENROUTER_NVIDIA_MODELS },
  ]
}

// ---------------------------------------------------------------------------
// Notifiche (riusa le stesse env del watchdog)
// ---------------------------------------------------------------------------

async function notify(text) {
  const webhook = process.env.WATCHDOG_WEBHOOK_URL
  const tgToken = process.env.WATCHDOG_TELEGRAM_TOKEN
  const tgChat = process.env.WATCHDOG_TELEGRAM_CHAT_ID
  const jobs = []
  if (webhook) {
    jobs.push(
      fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, text }),
      }).catch((e) => console.error('[models] webhook fallito:', e.message))
    )
  }
  if (tgToken && tgChat) {
    const url = `https://api.telegram.org/bot${tgToken}/sendMessage?chat_id=${encodeURIComponent(tgChat)}&text=${encodeURIComponent(text)}`
    jobs.push(fetch(url).catch((e) => console.error('[models] telegram fallito:', e.message)))
  }
  if (!jobs.length) console.log('[models] nessuna notifica configurata (WATCHDOG_WEBHOOK_URL / Telegram assente)')
  await Promise.all(jobs)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const run = { at: new Date().toISOString(), roles: [], changes: [], notes: [], failed: false }

function configuredProviders() {
  return Object.entries(keys).filter(([, v]) => Boolean(v)).map(([k]) => k)
}

async function audit() {
  const providers = configuredProviders()
  console.log(`\nAudit modelli free — ${run.at}`)
  console.log(`Provider configurati: ${providers.length ? providers.join(', ') : 'nessuno'}\n`)

  if (!providers.length) {
    run.notes.push('Nessuna API key configurata: impossibile verificare i modelli.')
    return
  }

  const cfg = await loadModelsConfig()
  const roles = rolesFrom(cfg)

  if (process.env.NVIDIA_MODEL && process.env.NVIDIA_MODEL !== cfg.NVIDIA_MODEL) {
    run.notes.push(
      `NVIDIA_MODEL è impostata nell'ambiente (${process.env.NVIDIA_MODEL}) e ha precedenza sul default: un'eventuale sostituzione in lib/ai-models.mjs non avrà effetto finché la variabile resta attiva.`
    )
  }

  // 1) Verifica dei modelli in uso.
  for (const r of roles) {
    if (!keys[r.provider]) {
      run.roles.push({ ...r, status: 'skipped', detail: 'provider non configurato' })
      continue
    }

    if (r.id === 'openrouter') {
      const results = []
      for (const model of r.model) {
        if (!keys.openrouter) {
          results.push({ model, status: 'skipped', detail: 'provider non configurato' })
          continue
        }
        const p = await verifyModel(() =>
          probeOpenAiCompatible({ url: OPENROUTER_URL, key: keys.openrouter, model, role: 'generator', provider: 'openrouter' })
        )
        results.push({ model, status: p.kind, detail: p.detail, attempts: p.attempts })
      }
      const ko = results.filter((x) => x.status !== 'ok')
      run.roles.push({
        ...r,
        status: results.some((x) => x.status === 'gone') ? 'gone' : ko.length ? 'degraded' : 'ok',
        results,
        detail: ko.map((x) => `${x.model}: ${x.status}`).join('; ') || '',
      })
      continue
    }

    const probe = r.probe || (() => probeOpenAiCompatible({ url: r.provider === 'groq' ? GROQ_URL : NVIDIA_URL, key: keys[r.provider], model: r.model, role: r.role, provider: r.provider, timeoutMs: r.provider === 'nvidia' ? NVIDIA_TIMEOUT_MS : DEFAULT_TIMEOUT_MS }))
    const p = await verifyModel(probe, { attempts: PROBE_ATTEMPTS })
    run.roles.push({ ...r, status: p.kind, detail: p.detail, ms: p.ms })
  }

  for (const r of run.roles) {
    if (r.status === 'ok') console.log(`OK        ${r.id.padEnd(15)} ${Array.isArray(r.model) ? r.model.join(', ') : r.model}`)
    else if (r.status === 'skipped') console.log(`SKIP      ${r.id.padEnd(15)} provider non configurato`)
    else console.log(`${r.status.toUpperCase().padEnd(9)} ${r.id.padEnd(15)} ${Array.isArray(r.model) ? r.model.join(', ') : r.model} → ${r.detail}`)
  }

  // 2) Sostituzioni per i modelli ritirati (solo 'gone').
  const patches = []

  for (const r of run.roles) {
    if (r.status !== 'gone') continue
    console.log(`\nCerco un sostituto per ${r.id}...`)

    if (r.id === 'gemini') {
      const limits = await currentGeminiLimits(cfg.GEMINI_MODEL)
      const found = await findGeminiReplacement(cfg.GEMINI_MODEL, limits)
      if (found) {
        patches.push({ kind: 'const', name: 'GEMINI_MODEL', value: found.model, labelName: 'GEMINI_MODEL_LABEL', labelValue: found.label, role: r.id, from: cfg.GEMINI_MODEL, to: found.model, detail: found.detail })
        console.log(`  → ${found.model} (${found.detail})`)
      } else {
        r.unfixable = true
        console.log('  → nessun sostituto Flash-Lite valido')
      }
    }

    if (r.id === 'groq-validator' || r.id === 'groq-fallback') {
      const isValidator = r.id === 'groq-validator'
      const other = isValidator ? cfg.GROQ_FALLBACK_MODEL : cfg.GROQ_VALIDATOR_MODEL
      const found = await findGroqReplacement({ current: r.model, role: isValidator ? 'validator' : 'generator', exclude: [other] })
      if (found) {
        const name = isValidator ? 'GROQ_VALIDATOR_MODEL' : 'GROQ_FALLBACK_MODEL'
        const labelName = isValidator ? 'GROQ_VALIDATOR_LABEL' : 'GROQ_FALLBACK_LABEL'
        patches.push({ kind: 'const', name, value: found.model, labelName, labelValue: found.label, role: r.id, from: r.model, to: found.model, detail: found.detail })
        console.log(`  → ${found.model} (${found.detail})`)
      } else {
        r.unfixable = true
        console.log('  → nessun sostituto Groq valido')
      }
    }

    if (r.id === 'nvidia') {
      const found = await findNvidiaReplacement(r.model)
      if (found) {
        patches.push({ kind: 'const', name: 'NVIDIA_MODEL', value: found.model, role: r.id, from: r.model, to: found.model, detail: found.detail })
        console.log(`  → ${found.model} (${found.detail})`)
      } else {
        r.unfixable = true
        console.log('  → nessun sostituto NVIDIA valido (catalogo include modelli non abilitati)')
      }
    }

    if (r.id === 'openrouter') {
      const results = r.results || []
      const gone = results.filter((x) => x.status === 'gone').map((x) => x.model)
      // Si rimuovono SOLO i modelli sicuramente ritirati: un 429/5xx/timeout
      // settimanale non deve far sparire dalla catena un endpoint sano.
      // `openrouter/free` è un router: resta salvo 404/410.
      const kept = r.model.filter((m) => !gone.includes(m))
      const hasRouter = kept.includes('openrouter/free')
      const target = hasRouter ? 3 : 4
      const fixedChain = kept.filter((m) => m !== 'openrouter/free')
      const needed = Math.max(0, target - fixedChain.length)
      const found = needed
        ? await findOpenRouterReplacements({ current: null, have: kept, slots: needed })
        : []
      const next = [...kept, ...found.map((f) => f.model)]
      if (next.length && (gone.length || next.length !== r.model.length)) {
        patches.push({
          kind: 'array',
          name: 'OPENROUTER_NVIDIA_MODELS',
          value: next,
          role: r.id,
          from: r.model,
          to: next,
          detail: `rimossi ${gone.length}, aggiunti ${found.length}`,
        })
        console.log(`  → ${next.join(', ')}`)
      } else if (!next.length) {
        r.unfixable = true
        console.log('  → nessun endpoint :free valido')
      }
    }
  }

  // 3) Report finale + applicazione.
  for (const p of patches) {
    const r = run.roles.find((x) => x.id === p.role)
    if (r) {
      r.model = p.to
      r.detail = 'sostituito'
    }
  }
  for (const r of run.roles) {
    if (r.status === 'gone' && !r.unfixable) r.status = 'fixed'
    if (r.unfixable) run.failed = true
    if (['auth', 'no_credits'].includes(r.status)) run.failed = true
  }

  if (patches.length) {
    run.changes = patches
    if (DRY) {
      run.notes.push('Modalità dry-run: nessuna modifica scritta (usa --apply).')
      console.log('\n[dry-run] Sostituzioni proposte:')
      for (const p of patches) console.log(`  - ${p.name}: ${Array.isArray(p.from) ? p.from.join(' | ') : p.from} → ${Array.isArray(p.to) ? p.to.join(' | ') : p.to}`)
    } else {
      applyPatches(patches)
    }
  } else {
    console.log('\nNessuna sostituzione necessaria.')
  }
}

async function currentGeminiLimits(model) {
  const catalog = await geminiCatalog()
  const m = catalog.find((x) => String(x.name).replace(/^models\//, '') === model)
  return { input: m?.inputTokenLimit || 0, output: m?.outputTokenLimit || 0 }
}

function applyPatches(patches) {
  let src = fs.readFileSync(MODELS_FILE, 'utf8')
  const before = src
  for (const p of patches) {
    if (p.kind === 'const') {
      src = setConst(src, p.name, p.value)
      if (p.labelName) src = setConst(src, p.labelName, p.labelValue)
    } else if (p.kind === 'array') {
      src = setArray(src, p.name, p.value)
    }
  }
  if (src === before) {
    console.log('\nNessuna differenza da scrivere.')
    return
  }
  fs.writeFileSync(MODELS_FILE, src)
  console.log('\nlib/ai-models.mjs aggiornato.')

  // Il file appena scritto deve contenere i valori attesi (il controllo di
  // compilazione vero e proprio lo fa il build, se --commit è attivo).
  const check = readExportedValues()
  for (const p of patches) {
    if (p.kind === 'const' && check[p.name] !== p.value) {
      throw new Error(`verifica post-scrittura fallita: ${p.name} = ${check[p.name]}`)
    }
    if (p.kind === 'array' && JSON.stringify(check[p.name]) !== JSON.stringify(p.value)) {
      throw new Error(`verifica post-scrittura fallita: ${p.name} diverso dal previsto`)
    }
  }

  const version = bumpVersionAndChangelog(patches)
  console.log(`Versione aggiornata a ${version}, CHANGELOG aggiornato.`)
}

// Rilegge le export dal file scritto senza importarlo (l'import sarebbe in cache).
function readExportedValues() {
  const src = fs.readFileSync(MODELS_FILE, 'utf8')
  const out = {}
  for (const m of src.matchAll(/export const (\w+) = '([^']*)'/g)) out[m[1]] = m[2]
  for (const m of src.matchAll(/export const (\w+) = \[([\s\S]*?)\]/g)) {
    out[m[1]] = [...m[2].matchAll(/'([^']*)'/g)].map((x) => x[1])
  }
  return out
}

function descriptionsForChanges(patches) {
  const lines = []
  for (const p of patches) {
    const from = Array.isArray(p.from) ? p.from.join(', ') : p.from
    const to = Array.isArray(p.to) ? p.to.join(', ') : p.to
    const ruoli = {
      gemini: 'generatore primario',
      'groq-validator': 'validatore anti-allucinazione',
      'groq-fallback': 'primo fallback',
      nvidia: 'fallback NVIDIA NIM',
      openrouter: 'catena OpenRouter free',
    }
    lines.push(`- **${ruoli[p.role] || p.role}**: \`${from}\` → \`${to}\` (${p.detail || 'verificato con generazione reale'}).`)
  }
  return lines
}

function bumpVersionAndChangelog(patches) {
  const pkg = JSON.parse(fs.readFileSync(PKG_FILE, 'utf8'))
  const oldVersion = pkg.version
  const version = bumpPatch(oldVersion)
  pkg.version = version
  fs.writeFileSync(PKG_FILE, `${JSON.stringify(pkg, null, 2)}\n`)

  const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'))
  lock.version = version
  if (lock.packages?.['']) lock.packages[''].version = version
  fs.writeFileSync(LOCK_FILE, `${JSON.stringify(lock, null, 2)}\n`)

  const page = fs.readFileSync(PAGE_FILE, 'utf8')
  if (/const APP_VERSION = '[^']*'/.test(page)) {
    fs.writeFileSync(PAGE_FILE, page.replace(/const APP_VERSION = '[^']*'/, `const APP_VERSION = '${version}'`))
  }

  const today = new Date().toISOString().slice(0, 10)
  const bullets = [
    '- **Sostituzione automatica dei modelli free ritirati** (audit settimanale, `.github/workflows/weekly-models.yml`). Ogni modello è stato verificato con una generazione reale prima e dopo il cambio:',
    ...descriptionsForChanges(patches),
    `- Versione aggiornata a v${version}`,
  ]

  const changelog = fs.readFileSync(CHANGELOG_FILE, 'utf8')
  if (!changelog.startsWith('# Changelog')) throw new Error('CHANGELOG.md in formato inatteso')

  const header = `## [${today}]`
  const idx = changelog.indexOf(header)
  let next
  if (idx === -1) {
    // Nessuna voce per oggi: nuova sezione in cima.
    const entry = [header, '', '### Aggiornato', ...bullets, '', ''].join('\n')
    next = changelog.replace('# Changelog\n\n', `# Changelog\n\n${entry}`)
  } else {
    // Voce di oggi già presente: si aggiungono i bullet senza duplicare la data.
    const afterDate = idx + header.length
    const bodyStart = changelog.indexOf('### Aggiornato', afterDate)
    const sectionEnd = changelog.indexOf('\n## [', afterDate)
    const nextSection = sectionEnd === -1 ? changelog.length : sectionEnd
    if (bodyStart !== -1 && bodyStart < nextSection) {
      // Esiste già "### Aggiornato" nella sezione di oggi: accoda i bullet.
      const insertAt = changelog.indexOf('\n\n', bodyStart)
      const pos = insertAt === -1 || insertAt > nextSection ? nextSection : insertAt
      next = `${changelog.slice(0, pos)}\n${bullets.join('\n')}${changelog.slice(pos)}`
    } else {
      next = `${changelog.slice(0, afterDate)}\n\n### Aggiornato\n${bullets.join('\n')}${changelog.slice(afterDate)}`
    }
  }

  fs.writeFileSync(CHANGELOG_FILE, next)
  return version
}

function buildProject() {
  console.log('\nBuild di verifica...')
  execFileSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit', env: process.env })
}

function rollback() {
  console.log('Rollback delle modifiche...')
  try {
    execFileSync('git', ['checkout', '--', 'lib/ai-models.mjs', 'CHANGELOG.md', 'package.json', 'package-lock.json', 'app/page.js'], { cwd: ROOT, stdio: 'inherit' })
  } catch (e) {
    console.error('Rollback fallito:', e.message)
  }
}

function commitAndPush() {
  const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim()
  // In CI il checkout può essere in detached HEAD: il ramo di destinazione è
  // quello della ref del workflow (main su schedule).
  const target = process.env.GITHUB_REF_NAME || branch
  const msg = `chore(models): aggiorna modelli free ritirati (${run.changes.map((c) => c.role).join(', ')})`
  execFileSync('git', ['add', 'lib/ai-models.mjs', 'CHANGELOG.md', 'package.json', 'package-lock.json', 'app/page.js'], { cwd: ROOT, stdio: 'inherit' })
  execFileSync(
    'git',
    ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'commit', '-m', msg],
    { cwd: ROOT, stdio: 'inherit' }
  )
  execFileSync('git', ['push', 'origin', `HEAD:${target}`], { cwd: ROOT, stdio: 'inherit' })
  console.log(`Commit e push su ${target}.`)
}

function buildSummary() {
  const icon = (s) => (s === 'ok' ? '✅' : s === 'fixed' ? '🔧' : s === 'skipped' ? '⏭️' : '⚠️')
  const lines = ['🤖 IusMente — audit settimanale modelli free', `\n${run.at}`, '']
  for (const r of run.roles) {
    const model = Array.isArray(r.model) ? r.model.join(', ') : r.model
    lines.push(`${icon(r.status)} ${r.id}: ${model} — ${r.status}${r.detail ? ` (${r.detail})` : ''}`)
  }
  for (const c of run.changes) {
    const from = Array.isArray(c.from) ? c.from.join(', ') : c.from
    const to = Array.isArray(c.to) ? c.to.join(', ') : c.to
    lines.push(`\n♻️ ${c.role}: ${from} → ${to}`)
  }
  if (run.notes.length) lines.push('', ...run.notes.map((n) => `ℹ️ ${n}`))
  if (!run.roles.length) {
    lines.push('\n⏭️ Nessun provider configurato: audit non eseguito.')
  } else if (run.failed) {
    lines.push('\n❌ Intervento manuale necessario.')
  } else {
    lines.push('\n✅ Tutti i modelli configurati rispondono.')
  }
  return lines.join('\n')
}

let exitCode = 0
try {
  await audit()

  // Con modifiche applicate si esegue SEMPRE il build prima di lasciare il repo
  // in quello stato: se il build fallisce si torna indietro (e non si committa).
  if (run.changes.length && !DRY) {
    try {
      buildProject()
      if (COMMIT) {
        commitAndPush()
        run.notes.push('Modifiche committate e pushate: Vercel ridistribuirà con i nuovi modelli.')
      } else {
        run.notes.push('Modifiche applicate in locale ma non committate (usa --commit).')
      }
    } catch (err) {
      console.error('\nBuild/commit fallito:', err.message)
      rollback()
      run.failed = true
      run.notes.push('Build fallita: modifiche annullate, nessun commit.')
    }
  }

  if (run.failed) exitCode = 1
  const summary = buildSummary()
  console.log(`\n${summary}\n`)
  if (NOTIFY_MODE === 'always' || run.changes.length || run.failed) await notify(summary)
} catch (err) {
  console.error('\nErrore inatteso:', err)
  run.failed = true
  exitCode = 1
  await notify(`❌ IusMente — audit modelli fallito\n${err.message}`).catch(() => {})
}

process.exit(exitCode)
