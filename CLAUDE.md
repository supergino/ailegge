# CLAUDE.md

Guida per assistenti AI quando lavorano su questo repository.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Linguaggio:** JavaScript (no TypeScript)
- **UI:** React 18, Tailwind CSS 3, Lucide React
- **AI:** Google Gemini SDK (`@google/genai`), Groq Cloud API, NVIDIA API, OpenRouter API, Tavily Search API
- **PDF:** `pdf-parse`

## Comandi

```bash
npm run dev      # Avvia in sviluppo (localhost:3000)
npm run build    # Build di produzione
npm run start    # Avvia il server di produzione
```

Non ci sono script di linting o test configurati al momento.

## Struttura

```
app/
├── layout.js              # Root layout (metadata, viewport, font)
├── page.js                # Client component — chat UI completa
├── globals.css            # Stili globali (scrollbar, glass, safe-area)
├── api/
│   ├── chat/route.js      # POST /api/chat — pipeline AI principale
│   ├── status/route.js    # GET /api/status — verifica stato provider
│   └── upload/route.js    # POST /api/upload — estrazione testo PDF/TXT
├── info/page.js           # Pagina documentazione statica
└── status/page.js         # Pagina实时 stato provider
```

## Architettura

Il sistema si basa su una **pipeline a 3 stadi**:

1. **Generazione** — Gemini 2.5 Flash-Lite produce risposta JSON strutturata con `text` + `fonti`
2. **Validazione** — Llama 3.3 70B (Groq) verifica accuratezza giuridica e allucinazioni
3. **Rigenerazione** — Se la validazione fallisce, Gemini rigenera con le criticità come contesto
4. **Fallback** — Se Gemini ha quota esaurita: Groq (`llama-3.1-8b-instant`) → NVIDIA (`llama-3.1-70b-instruct`) → OpenRouter (5 modelli in catena)

Opzionalmente, una ricerca RAG via Tavily su domini normativi italiani (Normattiva, Gazzetta Ufficiale, Italgiure) arricchisce il contesto prima della generazione.

### Variabili d'ambiente necessarie

| Variabile | Servizio | Ottenibile da |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini | ai.google.dev |
| `GROQ_API_KEY` | Groq (Llama validatore) | console.groq.com |
| `NVIDIA_API_KEY` | NVIDIA (fallback intermedio) | build.nvidia.com |
| `TAVILY_API_KEY` | Tavily (RAG) | tavily.com |
| `OPENROUTER_API_KEY` | OpenRouter (fallback) | openrouter.ai |

## Convenzioni di codice

- **No TypeScript** — tutto in `.js`
- **Stile:** Tailwind utility-first, pattern Apple (glassmorphism, rounded-2xl, SF font)
- **API routes:** restituiscono `NextResponse.json()` con errori strutturati
- **Cronologia:** salvata in `localStorage` chiave `iusmente_cronologia`
- **Export functions** nei file route (non default export per POST)

## Cose da non fare

- Non installare TypeScript o aggiungere `tsconfig.json`
- Non creare directory `components/`, `lib/`, `utils/` a meno che non servano realmente
- Non aggiungere dipendenze inutili — il progetto è volutamente minimal
