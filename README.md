# IusMente

Assistente virtuale intelligente per studenti di giurisprudenza, basato su una pipeline a due modelli AI con validazione incrociata e ricerca RAG su fonti normative italiane.

---

## Caratteristiche

- **Doppia modalità di risposta**: Assistenza studio (Tutor — empatico, spiegazioni, quiz) o Ambito ufficiale legislativo (Professore — formale, rigoroso, come in commissione d'esame)
- **Filtro giurisdizionale**: scegli se limitarti al solo diritto italiano o includere UE e internazionale (TFUE, CEDU, CGUE)
- **Pipeline anti-allucinazione**: Gemini 2.5 Flash-Lite genera la risposta, Llama 3.3 70B (Groq) la valida, in caso di criticità viene rigenerata automaticamente
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
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Llama 3.3 70B      │  ← Valuta accuratezza giuridica
│  (Groq)             │     { valido, problemi[] }
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
  Valido     Non valido
    │           │
    │           ▼
    │    ┌─────────────────┐
    │    │  Gemini          │  ← Rigenera con le criticità
    │    │  (rigenerazione) │     come contesto aggiuntivo
    │    └─────────┬───────┘
    │              │
    └──────┬───────┘
           ▼
    Risposta finale + fonti
```

---

## Stack tecnologico

| Categoria | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Linguaggio | JavaScript (no TypeScript) |
| UI | React 18, Tailwind CSS 3, Lucide React |
| AI generativa | Google Gemini 2.5 Flash-Lite (`@google/genai`) |
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
| `GEMINI_API_KEY` | ✅ | Google Gemini | [ai.google.dev](https://ai.google.dev) |
| `GROQ_API_KEY` | ❌* | Groq (Llama validatore) | [console.groq.com](https://console.groq.com) |
| `TAVILY_API_KEY` | ❌* | Tavily (RAG) | [tavily.com](https://tavily.com) |

\* *GROQ_API_KEY e TAVILY_API_KEY sono opzionali: senza di esse il sistema funziona comunque, ma saltano rispettivamente la validazione e la ricerca RAG.*

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
    "rigenerato": false
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

### `POST /api/upload`

Estrae il testo da un file PDF o TXT (codificato in base64).

---

## Privacy

- La cronologia è salvata esclusivamente nel **localStorage del browser** — nessun dato lascia il dispositivo
- I documenti caricati vengono elaborati in tempo reale e **non memorizzati** sul server
- I messaggi vengono processati da Google AI, Groq Cloud e Tavily secondo i termini di servizio di ciascun fornitore
- Nessun cookie di tracciamento o analytics

---

## Licenza

Distribuito con licenza MIT. Vedi `LICENSE` per maggiori informazioni.
