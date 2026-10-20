#!/usr/bin/env node
// Verifica che i modelli LLM configurati rispondano davvero.
//
// Il solo catalogo /v1/models non basta: NVIDIA NIM elenca modelli non
// accessibili all'account (404) e OpenRouter restituisce 402 senza crediti.
// Questo script esegue una vera chat completion con response_format JSON e
// controlla che il contenuto sia JSON valido. Ogni modello viene provato più
// volte perché i provider free possono restituire 500/502 transitori.
//
// Uso:
//   node scripts/check-models.mjs
//   npm run check:models
//
// Exit code 1 se almeno un modello fallisce tutti i tentativi.

import fs from 'node:fs'
import path from 'node:path'
import { NVIDIA_MODEL, OPENROUTER_NVIDIA_MODELS } from '../lib/nvidia-models.mjs'

const ATTEMPTS = Number(process.env.CHECK_MODELS_ATTEMPTS || 3)

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

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const TIMEOUT_MS = 60000

async function chat(url, key, model, json) {
  const body = {
    model,
    messages: [
      { role: 'system', content: 'Rispondi solo con JSON valido, nessun testo extra.' },
      { role: 'user', content: 'Restituisci un oggetto JSON con chiave ok impostata a true.' },
    ],
    max_tokens: 600,
  }
  if (json) body.response_format = { type: 'json_object' }

  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  const started = Date.now()
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
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
  } finally {
    clearTimeout(id)
  }
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

await checkNvidia()
await checkOpenRouter()

const pad = (s, n) => String(s).padEnd(n)
console.log('\nVerifica modelli LLM\n')
for (const r of results) {
  const badge = r.status === 'ok' ? 'OK  ' : r.status === 'skip' ? 'SKIP' : 'FAIL'
  console.log(`${badge}  ${pad(r.provider, 12)} ${pad(r.model, 48)} ${r.detail}`)
}

const failed = results.filter((r) => r.status === 'fail')
console.log(`\n${results.length - failed.length}/${results.length} ok · ${failed.length} falliti`)
if (failed.length) {
  console.log('\nAzione: aggiorna lib/nvidia-models.mjs con un modello attivo, poi riesegui lo script.')
  process.exit(1)
}
