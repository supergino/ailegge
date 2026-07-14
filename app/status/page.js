'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Gemini 2.5 Flash-Lite',
    role: 'Generazione primaria',
    docs: 'ai.google.dev',
  },
  {
    id: 'groq',
    name: 'Groq · Llama 3.1 8B',
    role: 'Fallback generazione',
    docs: 'console.groq.com',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter · 5 modelli',
    role: 'Catena fallback estremo',
    docs: 'openrouter.ai',
  },
]

const STATUS_META = {
  available: { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  quota_exhausted: { dot: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  invalid_key: { dot: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  timeout: { dot: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  error: { dot: 'bg-red-500', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  missing: { dot: 'bg-gray-400', bg: 'bg-gray-400/10', text: 'text-gray-500 dark:text-gray-400' },
  unknown: { dot: 'bg-gray-400', bg: 'bg-gray-400/10', text: 'text-gray-500 dark:text-gray-400' },
}

export default function StatusPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch('/api/status')
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
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

        <header className="mt-6">
          <h1 className="text-[32px] font-semibold tracking-tight sm:text-[40px]">
            Stato provider
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#6e6e73] sm:text-[17px]">
            Verifica in tempo reale la disponibilità di ogni modello nella catena di generazione.
          </p>
        </header>

        {loading && (
          <div className="mt-10 space-y-4">
            {[1, 2, 3].map(i => (
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
            {PROVIDERS.map(p => {
              const s = data.providers[p.id]
              const meta = STATUS_META[s?.status] || STATUS_META.unknown
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border border-black/[0.08] p-5 dark:border-white/10 ${
                    s?.status === 'available' ? 'bg-white dark:bg-[#1d1d1f]' : 'bg-white dark:bg-[#1d1d1f]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[17px] font-semibold tracking-tight">{p.name}</h2>
                        {s && (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.text}`}>
                            <span className={`inline-flex h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {s.label || s.status}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] text-[#6e6e73] dark:text-[#86868b]">
                        {p.role}
                      </p>
                      {s?.limit && (
                        <p className="mt-1 text-[12px] text-[#86868b] dark:text-[#6e6e73]">
                          Rate limit richieste: {s.limit}
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

            <div className={`rounded-2xl border p-5 ${
              data.overall
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : 'border-amber-500/20 bg-amber-500/5'
            }`}>
              <p className={`text-[15px] font-medium ${
                data.overall ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {data.overall
                  ? 'Tutti i provider sono disponibili.'
                  : 'Alcuni provider hanno limitazioni. La catena di fallback proverà i successivi.'}
              </p>
            </div>

            <p className="text-[12px] text-[#86868b] dark:text-[#6e6e73]">
              I controlli vengono eseguiti in tempo reale ad ogni caricamento della pagina.
              Il consumo di quota per ciascun test è trascurabile (1 token di output per provider).
            </p>
          </div>
        )}
      </article>
    </main>
  )
}
