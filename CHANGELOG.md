# Changelog

## [2026-07-21]

### Aggiunto
- Implementata ricerca RAG su Tavily: query su domini normativi (Normattiva, Gazzetta Ufficiale, Italgiure, EUR-Lex) con iniezione risultati nel system prompt
- Badge "Tavily RAG" nelle risposte chat quando la ricerca ha prodotto risultati
- Pagina `/status` e API `/api/status`: controllo stato e quota anche per Tavily
- Formattazione automatica risposte: elenchi puntati (`<ul>`), numerati (`<ol>`), grassetto (`<strong>`), link cliccabili
- Istruzioni di formattazione nel system prompt per guidare l'AI a strutturare le risposte con paragrafi, liste e a capo
- Bandierine stilizzate "ITALIA" e "UE" nei tab del Contesto Giuridico

### Modificato
- Allineamento e stile dei tab "Contesto Giuridico" con badge flag integrati
- Versione aggiornata a v1.6.0

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
Versione: v1.6.0