#!/usr/bin/env node
// Pinger zero-dipendenze per il watchdog di IusMente.
//
// Esegue i controlli sui modelli free chiamando l'endpoint /api/watchdog del
// server già in esecuzione (npm run start). Se un modello free passa da
// online a offline (o viceversa), il server invia la notifica configurata
// (webhook Discord/Slack o Telegram).
//
// Uso:
//   node scripts/watchdog-ping.mjs                 # un singolo controllo
//   node scripts/watchdog-ping.mjs --daemon        # loop infinito
//   node scripts/watchdog-ping.mjs --daemon --interval=7200   # ogni 2h
//
// Variabili d'ambiente:
//   WATCHDOG_BASE_URL  (default http://localhost:3000)
//   WATCHDOG_TOKEN     (se impostato sul server, va passato qui come ?token non serve:
//                       il token è lato server; per proteggere il ping usare il token
//                       nel server e chiamare con ?token=... — vedi sotto)
//   WATCHDOG_PING_TOKEN (se il server ha WATCHDOG_TOKEN, valorizzalo per autenticare il ping)

const BASE = process.env.WATCHDOG_BASE_URL || 'http://localhost:3000'
const TOKEN = process.env.WATCHDOG_PING_TOKEN
const args = process.argv.slice(2)
const daemon = args.includes('--daemon')
const intervalArg = args.find((a) => a.startsWith('--interval='))
const interval = intervalArg
  ? parseInt(intervalArg.split('=')[1], 10) * 1000
  : 2 * 60 * 60 * 1000

const url = `${BASE}/api/watchdog?notify=1${TOKEN ? `&token=${encodeURIComponent(TOKEN)}` : ''}`

async function tick() {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`[watchdog] ${new Date().toISOString()} — errore HTTP ${res.status}`)
      return
    }
    const data = await res.json()
    const down = data.down?.length ? data.down.join(', ') : 'nessuno'
    console.log(
      `[watchdog] ${data.at} — offline: ${down}${data.notified ? ' (notifica inviata)' : ''}`
    )
  } catch (e) {
    console.error(`[watchdog] ${new Date().toISOString()} — impossibile raggiungere ${BASE}:`, e.message)
  }
}

await tick()
if (daemon) {
  console.log(`[watchdog] modalità daemon, intervallo ${interval / 1000}s — Ctrl+C per fermare`)
  setInterval(tick, interval)
}
