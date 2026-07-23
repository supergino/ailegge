# Changelog

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
Versione: v2.1.0