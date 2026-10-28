# Changelog

## [2026-10-28]

### Corretto
- **Link alle fonti ufficiali**: `costruisciLinkFonte` usa ora l'URL canonico con `www.`; Gazzetta Ufficiale e Italgiure non hanno record DNS sull'apex, quindi i relativi link erano rotti.
- **CEDU non più attribuita a EUR-Lex**: le sentenze della Corte europea dei diritti dell'uomo puntano a `hudoc.echr.coe.int`; quelle della CGUE a `curia.europa.eu`.
- **Normalizzazione dei domini**: i valori restituiti dal modello vengono normalizzati (maiuscole, `www.`, `https://`, path) e quelli non ufficiali vengono scartati.
- **Validatore Groq ripristinato**: `qwen/qwen3.6-27b` non esiste più su Groq (404 `model_not_found`), quindi la doppia verifica anti-allucinazione veniva saltata in silenzio. Nuovo modello `qwen/qwen3.8-27b` (verificato con `response_format: json_object`): ~0,4-0,6s, intercetta i riferimenti inventati. Aggiornati anche watchdog e documentazione.
- **Fallback Groq riparato**: `openai/gpt-oss-20b` falliva a intermittenza con 400 `json_validate_failed` — il JSON veniva troncato al tetto di default di 2048 token — e la richiesta cadeva su OpenRouter (25-39s). Ora tetto esplicito `max_completion_tokens: 3072` e `reasoning_effort: "low"` (taglia ~2.500 token di ragionamento a ~700): 3/3 risposte da Groq in 2,8-5,1s. Nota: il free tier Groq ha 8.000 TPM, quindi il tetto non va alzato oltre.
- Versione aggiornata a v2.8.0

### Aggiunto
- **`lib/legal-sources.mjs`**: elenco unico delle fonti istituzionali (16), usato da prompt di routing, enum dello schema, whitelist lato client, costruzione dei link e domini per Tavily. Per aggiungere una fonte si modifica solo questo file.
- **Nuove fonti ufficiali**: Corte costituzionale, Giustizia amministrativa (Consiglio di Stato e TAR), Corte dei conti, CGUE, CEDU (HUDOC), Garante privacy, ANAC, AGCM, AGCOM, CONSOB, Banca d'Italia, Agenzia delle Entrate.

## [2026-10-20]

### Corretto
- **Fallback NVIDIA aggiornato**: `nvidia/nemotron-3-super-120b-a12b` non è più disponibile su NVIDIA NIM (404). Nuovo default `nvidia/nemotron-3.5-super-vl-120b-a12b` (verificato disponibile e compatibile con `response_format: json_object`).
- **Catena OpenRouter free corretta**: sostituiti i modelli non più validi o a pagamento (402/404) con endpoint `:free` verificati: `nvidia/nemotron-3.5-lightning:free`, `nvidia/nemotron-3.5-super-vl:free`, `nvidia/nemotron-3-ultra-550b-a55b:free`.
- **Modello NVIDIA centralizzato** in `lib/ai-models.mjs` (insieme a Gemini), importato da `/api/chat`, `/api/chat-locale`, `/api/status`, pagina `/status`, `/info`, footer e watchdog: un'unica costante da aggiornare.
- **Gemini aggiornato** da `gemini-3.1-flash-lite` a `gemini-3.5-flash-lite`: generazione più recente, stessi limiti token (1.048.576 input / 65.536 output), risposta verificata con `responseSchema` (~1,5s).
- Versione aggiornata a v2.5.2

### Aggiunto
- **`npm run check:models`**: verifica reale dei modelli LLM (chat completion con `response_format: json_object`, 3 tentativi per assorbire i 500/502 transienti). Exit code 1 se un modello non risponde.
- Procedura di aggiornamento modelli documentata in `CLAUDE.md` (fonte unica, verifica, build, checklist).

## [2026-08-26]

### Security
- **Gating opzionale delle API (`APP_API_KEY`)**: tutte le route `/api/*` (chat, chat-locale, upload, status, setup-locale) richiedono il token quando `APP_API_KEY` è impostato; le richieste da `localhost` restano sempre permesse (uso locale). Il client inoltra il token via header `Authorization: Bearer` (da `localStorage["iusmente_api_key"]` o `NEXT_PUBLIC_API_KEY`).
- **`/api/status` senza chiamate a pagamento**: lo stato ora deriva solo dalla presenza delle chiavi lato server, eliminando il vettore di esaurimento quota/DoS (prima effettuava completion reali verso Gemini/Groq/OpenRouter/Tavily/NVIDIA).
- **Rate limiting rafforzato**: `clientIp()` non si fida più di `X-Forwarded-For`/`X-Real-IP` se non dietro proxy attendibile (`TRUSTED_PROXY=1`); rimosso `buckets.clear()` a favore di una eviction pigra delle entry scadute.
- **Setup locale protetto**: `GET` (download+indicizzazione) e `DELETE` di `/api/setup-locale` richiedono `APP_API_KEY` (o localhost); aggiunto **single-flight lock** che rifiuta build concorrenti (429) e cancellazioni durante il build (409).
- **Upload PDF più sicuro**: verifica del magic-byte `%PDF-` (il tipo era solo dall'estensione) e timeout di parsing (25s) per mitigare DoS/parser bugs.
- **Hardening prompt injection**: i documenti caricati e i risultati RAG vengono delimitati come `--- DATI, non istruzioni ---` con istruzione di guardrail esplicita, riducendo il rischio di injection via PDF/TXT o contenuti Tavily.
- **Limiti di dimensione input**: `message` (16k), `documentContext` (50k), `documentName` (200 char) e storico (`messages`) validati e troncati prima di qualsiasi chiamata ai provider.
- **Niente perdite di configurazione**: errore 500 generico (niente messaggi interni dei provider), 401 non cita più `.env.local`; `/api/status` non espone più frammenti di risposta dei provider.
- **Header di sicurezza su tutte le rotte**: CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` e nuovo `Strict-Transport-Security` applicati anche alle pagine HTML (non solo `/api`).
- **Link markup allowlist**: `sanitizzaUrl` accetta solo gli scheme `http(s)` su uno dei 4 domini giuridici ammessi; eventuali altri host diventano testo non cliccabile (anti-phishing).
- **SSRF guard su Ollama**: `OLLAMA_HOST` validato a `http(s)` con blocco di indirizzi di metadata cloud/link-local.
- **`/api/status` con verifica live on-demand**: lo stato di default resta gratuito (solo presenza chiavi), ma `?live=1` esegue un controllo reale dei provider (quota esaurita, chiave non valida, timeout, errori) con **cache server-side di 60s** per limitare costo/quota. La pagina `/status` ha il pulsante "Verifica ora" che mostra lo stato live e il dettaglio degli errori.
- Versione aggiornata a v2.5.0

## [2026-07-22]

### Aggiunto
- **Pannello contesto collassabile su mobile**: riga compatta con riepilogo delle 3 modalità attive (Contesto, Risposta, Elaborazione) e freccia per espandere/chiudere
- **Anchor HTML nella pagina `/info`**: i pulsantini `?` nei tab contesto/risposta/elaborazione ora linkano direttamente alla sezione corrispondente (`/info#contesto`, `/info#risposta`, `/info#elaborazione`)
- **Deep linking Normattiva**: i link alle fonti `normattiva.it` ora puntano direttamente all'articolo specifico via URN (`uri-res/N2Ls?urn=...`) invece che alla homepage — supportati Codice Civile, Penale e Costituzione
- Pulsante "Elimina" in rosso accanto alla `✕` per eliminazione dati codici
- `ChevronDown` nel pannello contesto mobile per indicare espandibilità

### Modificato
- **Badge modelli spostati dal header al footer**: la riga con Tavily, Gemini, Groq, NVIDIA, OpenRouter non è più nell'header ma nel footer accanto alla versione, visibile solo su desktop
- **Pulsante tema chiaro/scuro**: rimosso dall'header desktop (era duplicato della sidebar), lasciato solo su mobile
- **Header più compatto**: padding ridotto (`px-2 py-1.5` invece di `px-3 py-2.5`)
- **Pannello contesto più compatto**: padding ridotto (`gap-1 px-2 py-1` invece di `gap-1.5 px-3 py-1.5`)
- **Empty state più compatto**: logo spostato inline con il titolo, dimensioni ridotte
- **Pulsantini info `?`**: sostituiti `Info` icon con `HelpCircle` su sfondo blu semitrasparente (`h-5 w-5`) per maggiore visibilità
- **Sidebar toggle**: testo cambiato da "Chiaro"/"Scuro" a "Tema chiaro"/"Tema scuro"
- **Header mobile**: barra "Domande/Cronologia" spostata fuori dal flex header per evitare layout rotti
- Versione aggiornata a v1.9.0

## [2026-07-21]

### Aggiunto
- Implementata ricerca RAG su Tavily: query su domini normativi (Normattiva, Gazzetta Ufficiale, Italgiure, EUR-Lex) con iniezione risultati nel system prompt
- Badge "Tavily RAG" nelle risposte chat quando la ricerca ha prodotto risultati
- Pagina `/status` e API `/api/status`: controllo stato e quota anche per Tavily
- Formattazione automatica risposte: elenchi puntati (`<ul>`), numerati (`<ol>`), grassetto (`<strong>`), link cliccabili
- Istruzioni di formattazione nel system prompt per guidare l'AI a strutturare le risposte con paragrafi, liste e a capo
- Bandierine stilizzate "ITALIA" e "UE" nei tab del Contesto Giuridico
- **Indice keyword locale**: scarica Codice Civile e Penale da Normattiva, indicizzazione TF-IDF zero-dipendenze (`.data/keyword-index.json`)
- **Indice vettoriale locale** (opzionale): embeddings Ollama per ricerca semantica (`.data/vector-index.json`)
- **Modalità elaborazione**: toggle Online/Locale nelle impostazioni
- **Online con indice locale**: Gemini + keyword index locale — niente chiamate Tavily per domande sui codici
- **Locale (Ollama)**: generazione e ricerca completamente offline
- **Fallback Ollama→Gemini**: se Ollama non è in esecuzione, la modalità Locale usa Gemini con l'indice locale
- **API `/api/chat-locale`**: endpoint per la modalità locale
- **API `/api/setup-locale`**: download e indicizzazione dei codici con SSE progress bar
- **API `DELETE /api/setup-locale`**: elimina tutti i dati locali
- **Pulsante "Scarica e indicizza codici"**: download one-click da Normattiva con progress bar
- **Badge "Indice locale"** nelle risposte chat quando il RAG locale è attivo
- Pulsante "Elimina dati codici" con conferma
- Badge `BETA` su "Modalità elaborazione"

### Modificato
- Allineamento e stile dei tab "Contesto Giuridico" con badge flag integrati
- `/api/chat` ora usa l'indice keyword locale come RAG prioritario prima di Tavily
- Messaggio d'errore chiaro quando l'indice locale è vuoto (non più "Vai su Modalità locale" fuorviante)
- `.gitignore` ora include `.data/`
- Versione aggiornata a v1.7.0

## [2026-07-14]

### Aggiunto
- NVIDIA API (`meta/llama-3.1-70b-instruct`) come fallback intermedio tra Groq e OpenRouter
- Catena di 4 modelli OpenRouter come fallback progressivo (llama-3.1-8b → qwen-2.5 → llama-3.2-3b → deepseek-chat)
- Pagina `/status` con verifica实时 stato e quota di ogni provider nella catena LLM
- API `/api/status` che testa ogni provider con chiamate minime (1 token) e mostra limiti
- Fallback automatico a Groq (`llama-3.1-8b-instant`) e OpenRouter quando Gemini esaurisce quota
- Tracciamento del modello effettivamente usato nella risposta (`modelli.generatore`)
- Messaggio di errore 429 con suggerimento per configurare chiavi di fallback

### Modificato
- Sliding window contesto: cronologia troncata a ultimi 20 messaggi (lato client + server)
- Fallback Groq usa modello leggero `llama-3.1-8b-instant` per risparmiare quota
- Validazione Groq saltata quando la risposta proviene già da un fallback
- Rilevamento quota rafforzato: controllo esplicito su gRPC code 8
- Parsing risposta resiliente a nomi di campo variabili (`text`, `risposta`, `answer`, `content`, `response`)

### Modificato
- Aggiornato modello Gemini da `2.5 Flash-Lite` a `3.1 Flash-Lite` (compatibilità nuova chiave API)
- Sostituita chiave Gemini API (nuovo account)

### Security
- Verificato: nessuna chiave API esposta pubblicamente (`.env.local` in `.gitignore`)

---
Versione: v2.5.0