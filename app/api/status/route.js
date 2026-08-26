import { NextResponse } from 'next/server'

// HIGH 1: /api/status NON deve effettuare chiamate a pagamento (completion) verso i
// provider, altrimenti diventa un vettore di esaurimento quota/DoS. Restituiamo solo
// lo stato di configurazione derivato dalla presenza delle chiavi, senza alcuna
// richiesta di rete e senza esporre frammenti di risposta dei provider (MEDIUM 7).

function envStatus(key) {
  if (!key) return { configured: false, status: 'missing', label: 'Chiave non configurata' }
  return { configured: true, status: 'configured', label: 'Configurata (non verificata live)' }
}

export async function GET() {
  const providers = {
    gemini: envStatus(process.env.GEMINI_API_KEY),
    groq: envStatus(process.env.GROQ_API_KEY),
    nvidia: envStatus(process.env.NVIDIA_API_KEY),
    openrouter: envStatus(process.env.OPENROUTER_API_KEY),
    tavily: envStatus(process.env.TAVILY_API_KEY),
  }

  // "overall" indica solo che tutte le chiavi necessarie sono presenti; non implica
  // che i provider rispondano (nessun ping a pagamento effettuato).
  const overall = providers.gemini.configured && providers.groq.configured

  return NextResponse.json({
    overall,
    providers,
    note: 'Stato basato sulla presenza delle chiavi lato server. Nessuna chiamata di rete/quota effettuata.',
  })
}
