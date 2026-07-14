# Changelog

## [2026-07-14]

### Aggiunto
- Fallback automatico a Groq (`llama-3.3-70b-versatile`) e OpenRouter (`google/gemini-2.0-flash-lite-001`) quando Gemini 2.5 Flash-Lite esaurisce la quota giornaliera
- Tracciamento del modello effettivamente usato nella risposta (`modelli.generatore`)
- Messaggio di errore 429 con suggerimento per configurare chiavi di fallback

---
Versione: v1.2.0
