# IusMente

Assistente virtuale intelligente per studenti di giurisprudenza, basato su una pipeline a tre modelli AI con validazione incrociata, fallback automatico e ricerca RAG su fonti normative italiane.

---

## Caratteristiche

- **Doppia modalità di risposta**: Assistenza studio (Tutor — empatico, spiegazioni, quiz) o Ambito ufficiale legislativo (Professore — formale, rigoroso, come in commissione d'esame)
- **Filtro giurisdizionale**: scegli se limitarti al solo diritto italiano o includere UE e internazionale (TFUE, CEDU, CGUE)
- **Pipeline anti-allucinazione a 3 livelli**: Gemini 2.5 Flash-Lite genera la risposta, Llama 3.3 70B (Groq) la valida, in caso di criticità viene rigenerata automaticamente
- **Fallback automatico su sovraccarico**: se Gemini è saturo passa a Groq, se anche Groq è saturo passa a OpenRouter come ultima spiaggia
- **Ricerca RAG in tempo reale**: Tavily interroga Normattiva, Gazzetta Ufficiale e Italgiure per ancorare le risposte a fonti aggiornate
- **Upload documenti**: allega file PDF o TXT (max 10 MB) per analizzarli con l'assistente
- **Design nativo Apple**: interfaccia in vetro smerigliato, supporto safe-area per dispositivi iOS, tema chiaro/scuro
- **Cronologia persistente**: conversazioni salvate in localStorage, riprendibili in qualsiasi momento
- **Zero tracker**: nessun cookie di tracciamento o analytics

---

## Architettura

```
Domanda utente
      │
      ▼
┌─────────────────────┐
│   Ricerca RAG       │  ← Tavily su normattiva.it, gazzettaufficiale.it,
│   (opzionale)       │     italgiure.giustizia.it
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Gemini 2.5         │  ← Genera risposta JSON strutturata
│  Flash-Lite         │     { text, fonti[] }
│  (tentativo n. 1)   │
└─────────┬───────────┘
          │
    ┌─────┴──────┐
    ▼            ▼
  Successo    Quota esaurita
    │            │
    │            ▼
    │    ┌─────────────────┐
    │    │  Llama 3.3 70B  │  ← Fallback: genera risposta
    │    │  via Groq       │     stesso formato JSON
    │    │  (tentativo n.2)│
    │    └────────┬────────┘
    │        ┌────┴──────┐
    │        ▼           ▼
    │    Successo    Quota esaurita
    │        │           │
    │        │           ▼
    │        │    ┌─────────────────┐
    │        │    │  Modello free   │  ← Fallback estremo:
    │        │    │  via OpenRouter │     via OpenRouter
    │        │    │  (tentativo n.3)│
    │        │    └────────┬────────┘
    │        │            ▼
    │        │        Successo / errore
    │        │
    └────┬───┘
         ▼
┌─────────────────────┐
│  Llama 3.3 70B      │  ← Valuta accuratezza giuridica
│  via Groq            │     { valido, problemi[] }
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
  Valido     Non valido
    │           │
    │           ▼
    │    ┌─────────────────┐
    │    │  Gemini / Groq /│  ← Rigenerazione con lo stesso
    │    │  OpenRouter     │     modello che ha generato
    │    │  (rigenerazione)│     le criticità come contesto
    │    └────────┬───────┘
    │              │
    └──────┬───────┘
           ▼
    Risposta finale + fonti
    + indicatore modello usato
```

---

## Stack tecnologico

| Categoria | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Linguaggio | JavaScript (no TypeScript) |
| UI | React 18, Tailwind CSS 3, Lucide React |
| AI generativa (primario) | Google Gemini 2.5 Flash-Lite (`@google/genai`) |
| AI generativa (fallback) | Llama 3.3 70B (Groq Cloud) |
| AI generativa (fallback estremo) | OpenRouter (modello `:free` configurabile) |
| AI validatore | Llama 3.3 70B (Groq Cloud) |
| Ricerca RAG | Tavily Search API |
| Estrazione PDF | `pdf-parse` |

---

## Per iniziare

### Prerequisiti

- Node.js 18+
- npm

### Installazione

```bash
git clone https://github.com/tuo-utente/iusmente.git
cd iusmente
npm install
```

### Configurazione API key

Copia il file di esempio e inserisci le tue chiavi:

```bash
cp .env.example .env.local
```

| Variabile | Obbligatoria | Servizio | Dove ottenerla |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google Gemini (generatore primario) | [ai.google.dev](https://ai.google.dev) |
| `GROQ_API_KEY` | ❌* | Groq (validatore + fallback generazione) | [console.groq.com](https://console.groq.com) |
| `OPENROUTER_API_KEY` | ❌* | OpenRouter (fallback estremo) | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `TAVILY_API_KEY` | ❌* | Tavily (RAG) | [tavily.com](https://tavily.com) |

\* *GROQ_API_KEY, OPENROUTER_API_KEY e TAVILY_API_KEY sono opzionali: senza di esse il sistema funziona comunque, ma saltano rispettivamente la validazione/fallback, il fallback estremo e la ricerca RAG.*

### Avvio

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

---

## API

### `POST /api/chat`

Genera una risposta giuridica.

**Body:**

```json
{
  "message": "Spiega la responsabilità extracontrattuale",
  "soloItalia": true,
  "modalitaTutor": true,
  "documentContext": "testo estratto (opzionale)",
  "documentName": "nome-file.pdf (opzionale)"
}
```

**Risposta:**

```json
{
  "text": "La responsabilità extracontrattuale è disciplinata dall'art. 2043 c.c....",
  "modalita": "tutor",
  "fonti": [{ "nome": "Art. 2043 c.c.", "sito": "normattiva.it" }],
  "modelli": {
    "generatore": "Gemini 2.5 Flash-Lite",
    "validatore": "Groq llama-3.3-70b-versatile",
    "rigenerato": false,
    "tentativiGenerazione": 1
  },
  "validazione": {
    "eseguita": true,
    "valido": true,
    "problemi": [],
    "confidenza": 0.95
  },
  "tavily": {
    "eseguita": true,
    "motivo": null,
    "numRisultati": 3
  }
}
```

Il campo `modelli.generatore` cambia in base al modello effettivamente usato:
- `"Gemini 2.5 Flash-Lite"` — generatore primario
- `"Groq llama-3.3-70b-versatile (fallback quota Gemini)"` — Gemini esaurito
- `"OpenRouter google/gemma-3-27b-it:free (fallback estremo)"` — anche Groq esaurito

### `POST /api/upload`

Estrae il testo da un file PDF o TXT (codificato in base64).

---

## Privacy

- La cronologia è salvata esclusivamente nel **localStorage del browser** — nessun dato lascia il dispositivo
- I documenti caricati vengono elaborati in tempo reale e **non memorizzati** sul server
- I messaggi vengono processati da Google AI, Groq Cloud, OpenRouter e Tavily secondo i termini di servizio di ciascun fornitore
- Nessun cookie di tracciamento o analytics

---

## Licenza

Distribuito con licenza Apache 2.0. Vedi `LICENSE` per maggiori informazioni.
