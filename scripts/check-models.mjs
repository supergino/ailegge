#!/usr/bin/env node
// Verifica che i modelli LLM configurati rispondano davvero.
//
// Il solo catalogo /models non basta: NVIDIA NIM elenca modelli non accessibili
// all'account (404) e OpenRouter restituisce 402 senza crediti. Questo script
// esegue vere generazioni con risposta JSON e controlla che il contenuto sia
// valido. Ogni modello viene provato più volte perché i provider free possono
// restituire 500/502 transienti.
//
// Per Gemini stampa anche i limiti di token del modello in uso e l'elenco dei
// modelli con limiti uguali o superiori, per valutare un aggiornamento.
//
// Uso:
//   node scripts/check-models.mjs
//   npm run check:models
//
// Exit code 1 se almeno un modello fallisce tutti i tentativi.

import fs from 'node:fs'
import path from 'node:path'
import {
  GEMINI_MODEL,
  GEMINI_MODEL_LABEL,
  NVIDIA_MODEL,
  OPENROUTER_NVIDIA_MODELS,
} from '../lib/ai-models.mjs'

const ATTEMPTS = Number(process.env.CHECK_MODELS_ATTEMPTS || 3)
const TIMEOUT_MS = 60000

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

function loadEnv(file) {
  const p = path.join(process.cwd(), file)
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/)
    if (!m) continue
    let val = m[2].trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[m[1]]) process.env[m[1]] = val
  }
}

loadEnv('.env.local')
loadEnv('.env')

async function withTimeout(run) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  const started = Date.now()
  try {
    return await run(ctrl.signal, started)
  } finally {
    clearTimeout(id)
  }
}

async function chat(url, key, model, json) {
  return withTimeout(async (signal, started) => {
    const body = {
      model,
      messages: [
        { role: 'system', content: 'Rispondi solo con JSON valido, nessun testo extra.' },
        { role: 'user', content: 'Restituisci un oggetto JSON con chiave ok impostata a true.' },
      ],
      max_tokens: 600,
    }
    if (json) body.response_format = { type: 'json_object' }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      })
      const raw = await res.text()
      let content = null
      try {
        content = JSON.parse(raw)?.choices?.[0]?.message?.content ?? null
      } catch {
        /* risposta non JSON */
      }
      return { status: res.status, ms: Date.now() - started, content, raw }
    } catch (e) {
      const raw = e.name === 'AbortError' ? `timeout ${TIMEOUT_MS}ms` : e.message
      return { status: 0, ms: Date.now() - started, content: null, raw }
    }
  })
}

function isJson(content) {
  if (!content) return false
  try {
    JSON.parse(content)
    return true
  } catch {
    return false
  }
}

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

async function geminiGenerate(key, model) {
  return withTimeout(async (signal, started) => {
    const body = {
      contents: [{ role: 'user', parts: [{ text: 'Genera una risposta JSON con text e fonti.' }] }],
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_SCHEMA,
      },
    }
    try {
      const res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      })
      const raw = await res.text()
      let text = null
      try {
        const j = JSON.parse(raw)
        text = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? null
      } catch {
        /* risposta non JSON */
      }
      return { status: res.status, ms: Date.now() - started, text, raw }
    } catch (e) {
      const raw = e.name === 'AbortError' ? `timeout ${TIMEOUT_MS}ms` : e.message
      return { status: 0, ms: Date.now() - started, text: null, raw }
    }
  })
}

async function geminiCatalog(key) {
  return withTimeout(async (signal) => {
    try {
      const res = await fetch(`${GEMINI_BASE}/models?key=${key}&pageSize=200`, { signal })
      if (!res.ok) return []
      const j = await res.json()
      return Array.isArray(j.models) ? j.models : []
    } catch {
      return []
    }
  })
}

function validGeminiSchema(text) {
  if (!text) return false
  try {
    const p = JSON.parse(text)
    return Boolean(p.text) && Array.isArray(p.fonti)
  } catch {
    return false
  }
}

async function verify(url, key, model, json) {
  const errors = []
  for (let i = 1; i <= ATTEMPTS; i++) {
    const r = await chat(url, key, model, json)
    const ok = r.status === 200 && (json ? isJson(r.content) : Boolean(r.content))
    if (ok) {
      const retry = i > 1 ? ` · tentativo ${i}/${ATTEMPTS}` : ''
      return { ok: true, detail: `${r.ms}ms · JSON valido${retry}` }
    }
    errors.push(`HTTP ${r.status}: ${String(r.raw).slice(0, 80)}`)
  }
  return { ok: false, detail: errors.join(' | ') }
}

const results = []
let geminiInfo = null

async function checkGemini() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    results.push({ provider: 'Gemini', model: GEMINI_MODEL, status: 'skip', detail: 'GEMINI_API_KEY assente' })
    return
  }

  const catalog = await geminiCatalog(key)
  const current = catalog.find((m) => m.name === `models/${GEMINI_MODEL}`) || null
  const inputLimit = current?.inputTokenLimit ?? null
  const outputLimit = current?.outputTokenLimit ?? null

  const errors = []
  let ok = false
  let detail = ''
  for (let i = 1; i <= ATTEMPTS; i++) {
    const r = await geminiGenerate(key, GEMINI_MODEL)
    if (r.status === 200 && validGeminiSchema(r.text)) {
      ok = true
      const retry = i > 1 ? ` · tentativo ${i}/${ATTEMPTS}` : ''
      detail = `${r.ms}ms · JSON valido${inputLimit ? ` · limiti ${inputLimit}/${outputLimit} token` : ''}${retry}`
      break
    }
    errors.push(`HTTP ${r.status}: ${String(r.raw).slice(0, 80)}`)
  }
  if (!ok) detail = errors.join(' | ')

  results.push({ provider: 'Gemini', model: GEMINI_MODEL, status: ok ? 'ok' : 'fail', detail })

  const alternatives = catalog
    .filter((m) => {
      const name = String(m.name || '').replace(/^models\//, '')
      if (name === GEMINI_MODEL) return false
      if (!name.startsWith('gemini')) return false
      if (!(m.supportedGenerationMethods || []).includes('generateContent')) return false
      if (/(image|tts|embedding|live|transcribe|robotics|computer-use|native-audio|omni|banana|veo|audio)/.test(name)) return false
      if (inputLimit && m.inputTokenLimit < inputLimit) return false
      if (outputLimit && m.outputTokenLimit < outputLimit) return false
      return true
    })
    .map((m) => ({
      name: String(m.name).replace(/^models\//, ''),
      input: m.inputTokenLimit,
      output: m.outputTokenLimit,
    }))
    .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }))

  geminiInfo = { inputLimit, outputLimit, alternatives }
}

async function checkNvidia() {
  const key = process.env.NVIDIA_API_KEY
  const model = process.env.NVIDIA_MODEL || NVIDIA_MODEL
  if (!key) {
    results.push({ provider: 'NVIDIA NIM', model, status: 'skip', detail: 'NVIDIA_API_KEY assente' })
    return
  }
  const v = await verify(NVIDIA_URL, key, model, true)
  results.push({ provider: 'NVIDIA NIM', model, status: v.ok ? 'ok' : 'fail', detail: v.detail })
}

async function checkOpenRouter() {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) {
    results.push({ provider: 'OpenRouter', model: '-', status: 'skip', detail: 'OPENROUTER_API_KEY assente' })
    return
  }
  for (const model of OPENROUTER_NVIDIA_MODELS) {
    const v = await verify(OPENROUTER_URL, key, model, model !== 'openrouter/free')
    results.push({ provider: 'OpenRouter', model, status: v.ok ? 'ok' : 'fail', detail: v.detail })
  }
}

await checkGemini()
await checkNvidia()
await checkOpenRouter()

const pad = (s, n) => String(s).padEnd(n)
console.log('\nVerifica modelli LLM\n')
for (const r of results) {
  const badge = r.status === 'ok' ? 'OK  ' : r.status === 'skip' ? 'SKIP' : 'FAIL'
  console.log(`${badge}  ${pad(r.provider, 12)} ${pad(r.model, 48)} ${r.detail}`)
}

if (geminiInfo) {
  console.log(`\nGemini attuale: ${GEMINI_MODEL} (${GEMINI_MODEL_LABEL})`)
  if (geminiInfo.inputLimit) {
    console.log(`Limiti token: ${geminiInfo.inputLimit} input / ${geminiInfo.outputLimit} output`)
  }
  if (geminiInfo.alternatives.length) {
    console.log('\nModelli con limiti >= attuali da valutare (devono essere free-tier):')
    for (const a of geminiInfo.alternatives.slice(0, 12)) {
      console.log(`  - ${pad(a.name, 40)} ${a.input}/${a.output}`)
    }
  } else {
    console.log('Nessun modello testuale con limiti >= attuali trovato nel catalogo.')
  }
}

const failed = results.filter((r) => r.status === 'fail')
console.log(`\n${results.length - failed.length}/${results.length} ok · ${failed.length} falliti`)
if (failed.length) {
  console.log('\nAzione: aggiorna lib/ai-models.mjs con un modello attivo, poi riesegui lo script.')
  process.exit(1)
}
