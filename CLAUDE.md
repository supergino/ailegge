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
npm run dev           # Avvia in sviluppo (localhost:3000)
npm run build         # Build di produzione
npm run start         # Avvia il server di produzione
npm run check:models  # Verifica REALE dei modelli LLM configurati (chiama le API)
```

Non ci sono script di linting configurati. `check:models` non è una test suite: interroga davvero NVIDIA/OpenRouter e fallisce (exit 1) se un modello non risponde.

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

proxy.js                    # Matcher /:path* — security headers (CSP in prod) + rate limiting in-memory per IP sulle /api
```

## Architettura

Il sistema si basa su una **pipeline a 3 stadi** preceduta da RAG opzionale:

0. **RAG** — Ricerca su indice keyword locale (prioritario) o Tavily su domini normativi (Normattiva, Gazzetta Ufficiale, Italgiure, EUR-Lex) per arricchire il contesto prima della generazione
1. **Generazione** — Gemini 3.5 Flash-Lite produce risposta JSON strutturata con `text` + `fonti`
2. **Validazione** — Qwen 3.8 27B (Groq, `qwen/qwen3.8-27b`) verifica accuratezza giuridica e allucinazioni. **Anche la risposta del fallback Groq viene validata** (stesso provider, bassa latenza); la rigenerazione resta riservata a Gemini.
3. **Rigenerazione** — Se la validazione fallisce, Gemini rigenera con le criticità come contesto (solo se la risposta originaria veniva da Gemini; su fallback Gemini è down e ri-chiuderlo rischierebbe loop).
4. **Fallback** — Se Gemini fallisce per **qualsiasi** motivo (quota esaurita, modello inesistente, errore 5xx, rete), catena in ordine:
   - **Groq** `openai/gpt-oss-20b` (veloce, LPU) — generazione + validazione
   - **OpenRouter** modelli NVIDIA "open" come **free endpoint** (solo `OPENROUTER_API_KEY`, **senza crediti**); ordine: `openrouter/free` → `nvidia/nemotron-3.5-lightning:free` → `nvidia/nemotron-3.5-super-vl:free` → `nvidia/nemotron-3-ultra-550b-a55b:free`. `response_format` JSON omesso solo per `openrouter/free`, applicato agli altri (graceful 400 → passa al modello successivo).
   - **NVIDIA** NIM diretto `nvidia/nemotron-3.5-super-vl-120b-a12b` (configurabile via `NVIDIA_MODEL`, default aggiornato; cold-start 30-60s su NIM free → extrema ratio). Modello centralizzato in `lib/ai-models.mjs`.
   - Ogni `fetch` del fallback ha timeout **30s** (`AbortController`) per evitare hang.

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
    "generatore": "Gemini 3.5 Flash-Lite",
    "validatore": "Groq qwen/qwen3.8-27b",
    "rigenerato": false
  },
  "validazione": { "eseguita": true, "valido": true, "problemi": [], "confidenza": 0.95, "skipped": false }
}
```

- Il prompt di sistema include istruzioni di formattazione (paragrafi separati da riga vuota, `-` per liste, `1.` per numerazioni, `**grassetto**` per concetti chiave)
- Il lato client converte la formattazione in HTML semantico (`<ul>`, `<ol>`, `<strong>`, `<p>`, link cliccabili); i link markdown `[testo](url)` sono renderizzati come elementi React con `href` validato (solo `http`/`https`), **niente `dangerouslySetInnerHTML`**
- **Pannello contesto collassabile su mobile**: `contestoAperto` state + riga riepilogo + `ChevronDown` toggle; su desktop sempre espanso
- **Link fonti Normattiva**: client-side `costruisciLinkFonte()` genera URL URN (`/uri-res/N2Ls?urn=...`) per articoli specifici (c.c., c.p., Cost.)
- **Fonti ufficiali centralizzate**: `lib/legal-sources.mjs` è l'unica fonte per domini, URL canonici (con `www.` dove richiesto), tabella di routing del prompt, enum dello schema Gemini e whitelist anti-phishing lato client. Per aggiungere o rimuovere una fonte si modifica solo quel file; gli id senza `www` restano i valori salvati nelle risposte.

### Sicurezza

- **Rate limiting** in `proxy.js` (ex `middleware.js`, Next.js 16; matcher `/:path*`): finestra fissa in-memory per chiave `metodo:path:IP`, con soglie dedicate (`/api/chat` e `/api/upload` 10/min, `/api/setup-locale` 2/min, `/api/status` 60/min). Sopra soglia → `429` + header `Retry-After`; header `X-RateLimit-Limit/Remaining` esposti. È per istanza server: su un deploy multi-istanza va spostato su un backing store condiviso.
- **Security headers** impostati dal proxy su **tutte** le route: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`. In produzione viene aggiunta una **Content-Security-Policy** (`frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `connect-src 'self'`), omessa in development perché React/Fast Refresh richiedono `eval`.
- **Upload**: il limite di 5 MB è enforce **anche lato server** (`/api/upload`) con doppio check (lunghezza base64 prima del decode, poi dimensione del buffer decodificato → `413`).
- **XSS**: i link nelle risposte AI sono renderizzati come elementi React con `href` validato solo per schema `http`/`https` (`sanitizzaUrl()` in `page.js`); URL non sicuri (`javascript:`, `data:`, ecc.) vengono mostrati come testo non cliccabile. Nessun `dangerouslySetInnerHTML` nel progetto.

### Variabili d'ambiente necessarie

| Variabile | Servizio | Ottenibile da |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini | ai.google.dev |
| `GROQ_API_KEY` | Groq (validatore Qwen 3.8 27B + fallback gpt-oss-20b) | console.groq.com |
| `NVIDIA_API_KEY` | NVIDIA (fallback intermedio) | build.nvidia.com |
| `TAVILY_API_KEY` | Tavily (RAG) | tavily.com |
| `OPENROUTER_API_KEY` | OpenRouter (fallback) | openrouter.ai |
| `OLLAMA_HOST` | Ollama (locale, default `http://localhost:11434`) | — |
| `OLLAMA_CHAT_MODEL` | Modello chat Ollama (default `llama3.1:8b`) | — |
| `OLLAMA_EMBEDDING_MODEL` | Modello embedding Ollama (default `nomic-embed-text`) | — |

## Aggiornamento modelli LLM

**Trigger automatico:** ogni lunedì 06:00 UTC il workflow `.github/workflows/weekly-models.yml` esegue `scripts/auto-update-models.mjs --apply --commit`: verifica i modelli con generazioni reali, se uno è stato ritirato sceglie un sostituto verificato, aggiorna `lib/ai-models.mjs` (+ CHANGELOG e versione), esegue `npm run build` e pusha su `main` (Vercel ridistribuisce). Se il build fallisce fa rollback e non committa.

**Trigger manuale:** errore "Modello rimosso", HTTP 404/410/402, "modello non disponibile", oppure richiesta di aggiornare/cambiare un modello LLM.

**Fonte unica di verità:** `lib/ai-models.mjs` (esporta `GEMINI_MODEL`, `GEMINI_MODEL_LABEL`, `NVIDIA_MODEL`, `OPENROUTER_NVIDIA_MODELS` e i due modelli Groq: `GROQ_VALIDATOR_MODEL` + `GROQ_FALLBACK_MODEL` con le rispettive label). **Non modificare a mano le pagine**: le etichette sono derivate da qui.

Consumatori, aggiornati automaticamente via import:
- `app/api/chat/route.js` — generazione Gemini + catena di fallback
- `app/api/chat-locale/route.js` — fallback Gemini della modalità locale
- `app/api/status/route.js` — check live dei provider
- `app/status/page.js` — etichette `Gemini · <modello>` e `NVIDIA · <modello>`
- `app/page.js` — badge modello nel footer
- `app/info/page.js` — documentazione
- `lib/watchdog.js` — monitoraggio dei modelli free

### Audit e aggiornamento automatico

```bash
npm run models:update                 # audit completo, nessuna modifica (sicuro)
npm run models:update -- --apply      # applica le sostituzioni + build di verifica
npm run models:update -- --apply --commit   # + commit e push (quello che fa la CI)
```

Comportamento (`scripts/auto-update-models.mjs`):
- verifica **il modello in uso**, non il catalogo: generazione reale con JSON (validator per il validatore Groq);
- sostituisce **solo** su `404/410` o `400 model not found` riconfermato; `429`, `402`, timeout, `5xx` e JSON non conforme **non** sono fase-out e non cambiano nulla (a parte una notifica);
- Gemini resta su **Flash-Lite** e non scende mai sotto i limiti token attuali;
- NVIDIA: il catalogo include modelli non abilitati all'account, quindi ogni candidato viene provato davvero;
- OpenRouter: solo `openrouter/free` e endpoint `:free`; un `429`/`5xx` settimanale non rimuove un endpoint dalla catena;
- se un ruolo resta senza sostituto: exit code 1, build/commit saltati e notifica (il job GitHub diventa rosso).

### Passi manuali (solo se l'automazione non basta)

1. **Diagnostica reale:**
   ```bash
   npm run check:models     # verifica puntuale dei modelli in uso
   npm run models:update    # audit + proposta di sostituti senza modificare nulla
   ```
2. Se serve un sostituto, verificalo **prima** di toccare il codice:
   - Catalogo NVIDIA NIM: `GET https://integrate.api.nvidia.com/v1/models` — **attenzione**: elenca anche modelli non abilitati all'account, che in `POST /v1/chat/completions` rispondono `404 Not found for account`.
   - Catalogo OpenRouter: `GET https://openrouter.ai/api/v1/models`.
   - **L'account OpenRouter non ha crediti**: funzionano solo `openrouter/free` e gli endpoint `:free`; gli altri rispondono `402`.
3. Modifica **solo** `lib/ai-models.mjs` (oppure `npm run models:update -- --apply`).
4. `npm run check:models` finché tutti risultano `OK`; `npm run build` senza errori.
5. Aggiorna `CHANGELOG.md` + versione (`package.json`, `package-lock.json`, `APP_VERSION` in `app/page.js`).
6. Commit e push su `main`.

### Modello primario Gemini (policy)
- Policy: resta sulla variante **Flash-Lite** (fascia gratuita con quota più alta). Se una Flash-Lite sparisce, l'automazione cerca la Flash-Lite stabile più recente con limiti token `>=` agli attuali (oggi 1.048.576 input / 65.536 output); l'alias `gemini-flash-lite-latest` è la ruota di scorta.
- Un candidato è valido solo se `generateContent` funziona con la chiave attuale (HTTP 200) e risponde entro tempi ragionevoli.

### Vincoli noti
- Il fallback ha **timeout 30s** per chiamata: preferisci modelli che rispondono entro 30s (in caso di cold start, usa un modello più piccolo).
- `response_format: { type: 'json_object' }` è inviato a tutti tranne `openrouter/free`; il sostituto deve supportarlo (verificato da audit e `check:models`).
- `NVIDIA_MODEL` come variabile d'ambiente (es. su Vercel) **ha precedenza** sul default: se è impostata, una sostituzione in `lib/ai-models.mjs` non ha effetto (l'audit lo segnala).
- I 500/502 dei provider free sono spesso transienti: non cambiare modello al primo errore, usa i retry.

### Secrets del workflow
Repository → Settings → Secrets and variables → Actions: `GEMINI_API_KEY`, `GROQ_API_KEY`, `NVIDIA_API_KEY`, `OPENROUTER_API_KEY` (necessari); `WATCHDOG_WEBHOOK_URL`, `WATCHDOG_TELEGRAM_TOKEN`, `WATCHDOG_TELEGRAM_CHAT_ID` (opzionali, per il riepilogo settimanale).

### Checklist rapida
- [ ] `npm run models:update` → tutti `ok`/`fixed`, exit 0
- [ ] `lib/ai-models.mjs` aggiornato (se necessario)
- [ ] `npm run check:models` → tutto `OK`
- [ ] `npm run build` → successo
- [ ] README + CHANGELOG + versione aggiornati
- [ ] commit + push

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
