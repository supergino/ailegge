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

---
Versione: v1.2.0
