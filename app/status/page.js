'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Gemini 3.1 Flash-Lite',
    role: 'Generazione primaria',
    docs: 'ai.google.dev',
  },
  {
    id: 'tavily',
    name: 'Tavily',
    role: 'Ricerca RAG su domini normativi',
    docs: 'tavily.com',
  },
  {
    id: 'groq',
    name: 'Groq · Qwen 27B / GPT-OSS 20B',
    role: 'Validatore + primo fallback (veloce)',
    docs: 'console.groq.com',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA · Nemotron 3 Super 120B',
    role: 'Secondo fallback (potente)',
    docs: 'build.nvidia.com',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter · Free (auto)',
    role: 'Catena fallback estremo',
    docs: 'openrouter.ai',
  },
]

const STATUS_META = {
  available: { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  configured: { dot: 'bg-sky-500', bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
  quota_exhausted: { dot: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  invalid_key: { dot: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  no_credits: { dot: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  model_gone: { dot: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  timeout: { dot: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  error: { dot: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  missing: { dot: 'bg-gray-400', bg: 'bg-gray-400/10', text: 'text-gray-500 dark:text-gray-400' },
  unknown: { dot: 'bg-gray-400', bg: 'bg-gray-400/10', text: 'text-gray-500 dark:text-gray-400' },
}

function authHeaders() {
  if (typeof window !== 'undefined') {
    const ls = window.localStorage.getItem('iusmente_api_key')
    if (ls) return { Authorization: `Bearer ${ls}` }
  }
  if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_KEY) {
    return { Authorization: `Bearer ${process.env.NEXT_PUBLIC_API_KEY}` }
  }
  return {}
}

export default function StatusPage() {
  const [data, setData] = useState(null)
  const [watchdog, setWatchdog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)

  const load = (live = false) => {
    if (live) setChecking(true)
    else setLoading(true)
    setError(null)
    const headers = authHeaders()
    Promise.all([
      fetch(`/api/status${live ? '?live=1' : ''}`, { headers })
        .then((r) => r.json())
        .catch(() => null),
      fetch('/api/watchdog?report=1', { headers })
        .then((r) => r.json())
        .catch(() => null),
    ])
      .then(([statusData, wdData]) => {
        setData(statusData)
        setWatchdog(wdData)
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        setLoading(false)
        setChecking(false)
      })
  }

  useEffect(() => {
    load(false)
  }, [])

  return (
    <main className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] dark:bg-black dark:text-[#f5f5f7]">
      <article className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[13px] text-[#0071e3] hover:underline"
        >
          ← Torna alla chat
        </Link>

        <header className="mt-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-semibold tracking-tight sm:text-[40px]">
              Stato provider
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#6e6e73] sm:text-[17px]">
              Verifica la disponibilità di ogni modello nella catena di generazione.
            </p>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={checking}
            className="mt-2 inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0071e3] px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#0077ed] disabled:opacity-60"
          >
            {checking ? 'Verifica…' : 'Verifica ora'}
          </button>
        </header>

        {loading && (
          <div className="mt-10 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-black/[0.08] bg-white p-5 dark:border-white/10 dark:bg-[#1d1d1f]">
                <div className="mb-3 h-5 w-40 rounded bg-black/[0.06] dark:bg-white/10" />
                <div className="h-4 w-64 rounded bg-black/[0.04] dark:bg-white/5" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-10 rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-[15px] text-red-600 dark:text-red-400">
            Errore durante il controllo: {error}
          </div>
        )}

        {data && (
          <div className="mt-10 space-y-4">
            {PROVIDERS.map((p) => {
              const s = data.providers[p.id]
              const liveS = data.live?.[p.id]
              // Preferisci lo stato live (con dettaglio errori) se disponibile.
              const show = liveS || s
              const meta = STATUS_META[show?.status] || STATUS_META.unknown
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-black/[0.08] p-5 dark:border-white/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[17px] font-semibold tracking-tight">{p.name}</h2>
                        {show && (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.text}`}>
                            <span className={`inline-flex h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {show.label || show.status}
                          </span>
                        )}
                        {liveS && (
                          <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-medium text-[#86868b] dark:bg-white/10">
                            live
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] text-[#6e6e73] dark:text-[#86868b]">
                        {p.role}
                      </p>
                      {liveS?.detail && (
                        <p className="mt-1 text-[12px] text-red-500 dark:text-red-400">
                          {liveS.detail}
                        </p>
                      )}
                      {liveS?.limit && (
                        <p className="mt-1 text-[12px] text-[#86868b] dark:text-[#6e6e73]">
                          Rate limit richieste: {liveS.limit}
                        </p>
                      )}
                      {!liveS && s?.status === 'configured' && (
                        <p className="mt-1 text-[12px] text-[#86868b] dark:text-[#6e6e73]">
                          Chiave presente, stato live non verificato.
                        </p>
                      )}
                    </div>
                    <a
                      href={`https://${p.docs}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[12px] text-[#0071e3] hover:underline"
                    >
                      {p.docs} ↗
                    </a>
                  </div>
                </div>
              )
            })}

            {watchdog && (
              <div className="mt-8">
                <h2 className="text-[20px] font-semibold tracking-tight">Watchdog modelli free</h2>
                <p className="mt-1 text-[13px] text-[#6e6e73] dark:text-[#86868b]">
                  Stato dei modelli della catena di fallback/validazione, dall'ultimo controllo automatico.
                </p>
                {!watchdog.ran ? (
                  <p className="mt-4 rounded-2xl border border-black/[0.08] p-4 text-[13px] text-[#6e6e73] dark:border-white/10 dark:text-[#86868b]">
                    Watchdog non ancora avviato. Configura un canale di notifica e lancia lo script di ping
                    (es. ogni 2-3 ore) per essere avvisato quando un modello free va offline.
                  </p>
                ) : (
                  <>
                    <div className="mt-4 space-y-3">
                      {Object.entries(watchdog.results).map(([id, r]) => {
                        const wdMeta = {
                          available: STATUS_META.available,
                          down: STATUS_META.error,
                          unconfigured: STATUS_META.missing,
                          unknown: STATUS_META.unknown,
                        }
                        const meta = wdMeta[r.status] || STATUS_META.unknown
                        const labelWd =
                          r.status === 'available'
                            ? 'Online'
                            : r.status === 'down'
                              ? 'Offline'
                              : r.status === 'unconfigured'
                                ? 'Non configurata'
                                : 'Sconosciuto'
                        return (
                          <div
                            key={id}
                            className="flex items-center justify-between gap-4 rounded-xl border border-black/[0.08] p-4 dark:border-white/10"
                          >
                            <div className="min-w-0">
                              <p className="text-[14px] font-medium tracking-tight">{r.label}</p>
                              <p className="mt-0.5 truncate text-[12px] text-[#86868b] dark:text-[#6e6e73]">{r.model}</p>
                            </div>
                            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.text}`}>
                              <span className={`inline-flex h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                              {labelWd}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    {watchdog.down.length > 0 && (
                      <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-[14px] text-red-600 dark:text-red-400">
                        ⚠️ Modelli free offline: {watchdog.down.length}. Sostituisci il modello corrispondente
                        nelle variabili d'ambiente prima che la catena di fallback/validazione si interrompa.
                      </div>
                    )}
                    <p className="mt-2 text-[12px] text-[#86868b] dark:text-[#6e6e73]">
                      Ultimo controllo watchdog: {watchdog.at ? new Date(watchdog.at).toLocaleString('it-IT') : '—'}
                    </p>
                  </>
                )}
              </div>
            )}

            <div className={`rounded-2xl border p-5 ${
              (data.live ? data.liveOverall : data.overall)
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : 'border-amber-500/20 bg-amber-500/5'
            }`}>
              <p className={`text-[15px] font-medium ${
                (data.live ? data.liveOverall : data.overall)
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                {(data.live ? data.liveOverall : data.overall)
                  ? 'Tutti i provider sono disponibili.'
                  : 'Alcuni provider hanno limitazioni. La catena di fallback proverà i successivi.'}
              </p>
            </div>

            <p className="text-[12px] text-[#86868b] dark:text-[#6e6e73]">
              {data.liveCheckedAt
                ? `Ultima verifica live: ${new Date(data.liveCheckedAt).toLocaleString('it-IT')} (cache 60s).`
                : 'Stato basato sulla presenza delle chiavi. Clicca "Verifica ora" per un controllo reale dei provider (cache 60s, costo minimo).'}
            </p>
          </div>
        )}
      </article>
    </main>
  )
}
