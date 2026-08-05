# CLAUDE.md

Guida per assistenti AI quando lavorano su questo repository.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Linguaggio:** JavaScript (no TypeScript)
- **UI:** React 18, Tailwind CSS 3, Lucide React
- **AI:** Google Gemini SDK (`@google/genai`), Groq Cloud API, NVIDIA API, OpenRouter API, Tavily Search API, Ollama (locale)
- **PDF:** `pdf-parse`
- **Indice locale:** Keyword index TF-IDF (zero dipendenze) + Vector store opzionale (Ollama embeddings)

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
│   ├── chat/route.js      # POST /api/chat — pipeline AI principale + RAG (indice locale prioritario, poi Tavily)
│   ├── chat-locale/route.js # POST /api/chat-locale — modalità locale Ollama + indice vettoriale
│   ├── setup-locale/route.js # GET /api/setup-locale — download + indicizzazione codici (SSE progress)
│   │                       # GET ?check=1 — stato indice
│   │                       # DELETE — elimina dati locali
│   ├── status/route.js    # GET /api/status — verifica stato provider (incluso Tavily)
│   └── upload/route.js    # POST /api/upload — estrazione testo PDF/TXT (limite 5 MB enforce lato server)
├── info/page.js           # Pagina documentazione statica
└── status/page.js         # Pagina实时 stato provider

middleware.js               # Matcher /api/:path* — security headers + rate limiting in-memory per IP
```

## Architettura

Il sistema si basa su una **pipeline a 3 stadi** preceduta da RAG opzionale:

0. **RAG** — Ricerca su indice keyword locale (prioritario) o Tavily su domini normativi (Normattiva, Gazzetta Ufficiale, Italgiure, EUR-Lex) per arricchire il contesto prima della generazione
1. **Generazione** — Gemini 3.1 Flash-Lite produce risposta JSON strutturata con `text` + `fonti`
2. **Validazione** — Llama 3.3 70B (Groq) verifica accuratezza giuridica e allucinazioni
3. **Rigenerazione** — Se la validazione fallisce, Gemini rigenera con le criticità come contesto
4. **Fallback** — Se Gemini ha quota esaurita: Groq (`llama-3.1-8b-instant`) → NVIDIA (`llama-3.1-70b-instruct`) → OpenRouter (5 modelli in catena)

### Risposta API

Ogni risposta include:
```json
{
  "text": "testo formattato (paragrafi, **grassetto**, - liste, 1. numerazioni)",
  "modalita": "tutor|professore",
  "fonti": [{ "nome": "...", "sito": "normattiva.it" }],
  "modelli": {
    "tavily": true,
    "indiceLocale": true,
    "generatore": "Gemini 3.1 Flash-Lite",
    "validatore": "Groq llama-3.3-70b-versatile",
    "rigenerato": false
  },
  "validazione": { "eseguita": true, "valido": true, "problemi": [], "confidenza": 0.95, "skipped": false }
}
```

- Il prompt di sistema include istruzioni di formattazione (paragrafi separati da riga vuota, `-` per liste, `1.` per numerazioni, `**grassetto**` per concetti chiave)
- Il lato client converte la formattazione in HTML semantico (`<ul>`, `<ol>`, `<strong>`, `<p>`, link cliccabili); i link markdown `[testo](url)` sono renderizzati come elementi React con `href` validato (solo `http`/`https`), **niente `dangerouslySetInnerHTML`**
- **Pannello contesto collassabile su mobile**: `contestoAperto` state + riga riepilogo + `ChevronDown` toggle; su desktop sempre espanso
- **Link fonti Normattiva**: client-side `costruisciLinkFonte()` genera URL URN (`/uri-res/N2Ls?urn=...`) per articoli specifici (c.c., c.p., Cost.)

### Sicurezza

- **Rate limiting** in `middleware.js` (matcher `/api/:path*`): finestra fissa in-memory per chiave `metodo:path:IP`, con soglie dedicate (`/api/chat` e `/api/upload` 10/min, `/api/setup-locale` 2/min, `/api/status` 60/min). Sopra soglia → `429` + header `Retry-After`; header `X-RateLimit-Limit/Remaining` esposti. È per istanza server: su un deploy multi-istanza va spostato su un backing store condiviso.
- **Security headers** impostati dal middleware solo sulle route `/api/*`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`. Non è configurata una Content-Security-Policy.
- **Upload**: il limite di 5 MB è enforce **anche lato server** (`/api/upload`) con doppio check (lunghezza base64 prima del decode, poi dimensione del buffer decodificato → `413`).
- **XSS**: i link nelle risposte AI sono renderizzati come elementi React con `href` validato solo per schema `http`/`https` (`sanitizzaUrl()` in `page.js`); URL non sicuri (`javascript:`, `data:`, ecc.) vengono mostrati come testo non cliccabile. Nessun `dangerouslySetInnerHTML` nel progetto.

### Variabili d'ambiente necessarie

| Variabile | Servizio | Ottenibile da |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini | ai.google.dev |
| `GROQ_API_KEY` | Groq (Llama validatore) | console.groq.com |
| `NVIDIA_API_KEY` | NVIDIA (fallback intermedio) | build.nvidia.com |
| `TAVILY_API_KEY` | Tavily (RAG) | tavily.com |
| `OPENROUTER_API_KEY` | OpenRouter (fallback) | openrouter.ai |
| `OLLAMA_HOST` | Ollama (locale, default `http://localhost:11434`) | — |
| `OLLAMA_CHAT_MODEL` | Modello chat Ollama (default `llama3.1:8b`) | — |
| `OLLAMA_EMBEDDING_MODEL` | Modello embedding Ollama (default `nomic-embed-text`) | — |

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
