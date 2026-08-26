import { NextResponse } from 'next/server'
import { runWatchdog, reportWatchdog } from '../../../lib/watchdog'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const notify = searchParams.get('notify') === '1' || searchParams.get('notify') === 'true'
  const report = searchParams.get('report') === '1'

  // Il report read-only non consuma quota né invia notifiche: non richiede token.
  if (report) {
    return NextResponse.json(reportWatchdog())
  }

  // Protezione opzionale: se WATCHDOG_TOKEN è impostato, la chiamata che esegue
  // i check (e le notifiche) deve presentarlo via ?token=... o header
  // x-watchdog-token (evita ping casuali che consumerebbero quota).
  const token = process.env.WATCHDOG_TOKEN
  if (token) {
    const ok =
      searchParams.get('token') === token ||
      req.headers.get('x-watchdog-token') === token
    if (!ok) {
      return NextResponse.json({ error: 'Token mancante o non valido' }, { status: 401 })
    }
  }

  try {
    const result = await runWatchdog({ notify })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: 'Watchdog fallito', detail: err.message },
      { status: 500 }
    )
  }
}
