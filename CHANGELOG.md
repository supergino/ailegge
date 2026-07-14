# Changelog

## [2026-07-14]

### Aggiunto
- Fallback automatico a Groq (`llama-3.3-70b-versatile`) e OpenRouter (`google/gemini-2.0-flash-lite-001`) quando Gemini 2.5 Flash-Lite esaurisce la quota giornaliera
- Tracciamento del modello effettivamente usato nella risposta (`modelli.generatore`)
- Messaggio di errore 429 con suggerimento per configurare chiavi di fallback

### Modificato
- Sliding window contesto: cronologia troncata a ultimi 20 messaggi (lato client + server)
- Fallback Groq usa modello leggero `llama-3.1-8b-instant` per risparmiare quota
- Validazione Groq saltata quando la risposta proviene già da un fallback
- Rilevamento quota rafforzato: controllo esplicito su gRPC code 8
- Parsing risposta resiliente a nomi di campo variabili (`text`, `risposta`, `answer`, `content`, `response`)
- Catena di 5 modelli OpenRouter come fallback progressivo (gemini-2.0-flash-lite → mistral-7b → phi-3 → qwen-2.5 → llama-3.2-3b)
- Nuova pagina /status con verifica实时 dello stato di ogni provider nella catena LLM
- Nuova API /api/status che testa ogni provider con chiamate minime (1 token) e mostra quota/limiti

---
Versione: v1.2.0
