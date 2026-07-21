# IusMente

Assistente virtuale intelligente per studenti di giurisprudenza, basato su una pipeline multi-modello con validazione incrociata, fallback automatico a 4 livelli e ricerca RAG su fonti normative italiane.

---

## Caratteristiche

- **Doppia modalità di risposta**: Assistenza studio (Tutor — empatico, spiegazioni, quiz) o Ambito ufficiale legislativo (Professore — formale, rigoroso, come in commissione d'esame)
- **Filtro giurisdizionale**: scegli se limitarti al solo diritto italiano o includere UE e internazionale (TFUE, CEDU, CGUE)
- **Pipeline anti-allucinazione**: Gemini genera la risposta JSON strutturata, Llama 3.3 70B (Groq) la valida, in caso di criticità viene rigenerata automaticamente
- **Fallback automatico a 4 livelli**: Gemini → Groq (veloce) → NVIDIA (potente) → OpenRouter (catena 4 modelli)
- **Ricerca RAG su fonti normative**: Tavily interroga Normattiva, Gazzetta Ufficiale, Italgiure (e EUR-Lex) per ancorare le risposte a fonti aggiornate — indicatore visivo nella risposta quando il RAG è attivo
- **Upload documenti**: allega file PDF o TXT (max 5 MB) per analizzarli con l'assistente
- **Design nativo Apple**: interfaccia in vetro smerigliato, supporto safe-area per dispositivi iOS, tema chiaro/scuro
- **Cronologia persistente**: conversazioni salvate in localStorage, riprendibili in qualsiasi momento
- **Zero tracker**: nessun cookie di tracciamento o analytics
- **Pagina /status**: verifica实时 della disponibilità e quota di ogni provider nella catena

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
│  Gemini 3.1         │  ← Genera risposta JSON strutturata
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
    │    │  Groq            │  ← Fallback veloce
    │    │  Llama 3.1 8B    │     stesso formato JSON
    │    │  (tentativo n.2) │
    │    └────────┬────────┘
    │        ┌────┴──────┐
    │        ▼           ▼
    │    Successo    Quota esaurita
    │        │           │
    │        │           ▼
    │        │    ┌─────────────────┐
    │        │    │  NVIDIA          │  ← Fallback potente
    │        │    │  Llama 3.1 70B   │     inferenza GPU
    │        │    │  (tentativo n.3) │
    │        │    └────────┬─────────┘
    │        │        ┌────┴──────┐
    │        │        ▼           ▼
    │        │    Successo    Quota esaurita
    │        │        │           │
    │        │        │           ▼
    │        │        │    ┌─────────────────┐
    │        │        │    │  OpenRouter      │  ← Catena 4 modelli
    │        │        │    │  4 modelli       │     ultima spiaggia
    │        │        │    │  (tentativo n.4) │
    │        │        │    └────────┬─────────┘
    │        │        │            ▼
    │        │        │        Successo / errore
    │        │        │
    └────┬───┴────────┘
         ▼
┌─────────────────────┐
│  Llama 3.3 70B      │  ← Valuta accuratezza giuridica (solo se
│  via Groq            │     la risposta NON proviene da fallback)
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
  Valido     Non valido
    │           │
    │           ▼
    │    ┌─────────────────┐
    │    │  Rigenerazione  │  ← Con lo stesso modello che ha
    │    │  automatica     │     generato, criticità come contesto
    │    └────────┬────────┘
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
| AI generativa (primario) | Google Gemini 3.1 Flash-Lite (`@google/genai`) |
| AI generativa (fallback veloce) | Llama 3.1 8B (Groq Cloud) |
| AI generativa (fallback potente) | Llama 3.1 70B (NVIDIA API) |
| AI generativa (fallback estremo) | OpenRouter (4 modelli in catena) |
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
| `GROQ_API_KEY` | ❌* | Groq (validatore + fallback) | [console.groq.com](https://console.groq.com) |
| `NVIDIA_API_KEY` | ❌* | NVIDIA (fallback intermedio) | [build.nvidia.com](https://build.nvidia.com) |
| `OPENROUTER_API_KEY` | ❌* | OpenRouter (fallback estremo) | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `TAVILY_API_KEY` | ❌* | Tavily (RAG) | [tavily.com](https://tavily.com) |

\* *Tutte tranne GEMINI_API_KEY sono opzionali: senza di esse il sistema funziona comunque saltando i rispettivi step.*

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
  "messages": [],
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
    "tavily": true,
    "generatore": "Gemini 3.1 Flash-Lite",
    "validatore": "Groq llama-3.3-70b-versatile",
    "rigenerato": false
  },
  "validazione": {
    "eseguita": true,
    "valido": true,
    "problemi": [],
    "confidenza": 0.95,
    "skipped": false
  }
}
```

Il campo `modelli.generatore` cambia in base al modello effettivamente usato:
- `"Gemini 3.1 Flash-Lite"` — generatore primario
- `"Groq"` — fallback veloce
- `"NVIDIA"` — fallback potente
- `"OpenRouter:meta-llama/llama-3.1-8b-instruct"` — catena estremo

Il campo `modelli.tavily` (`true`/`false`) indica se la ricerca RAG ha prodotto risultati e ha arricchito il contesto della risposta.

### `GET /api/status`

Verifica disponibilità e quota di tutti i provider. Usata dalla pagina `/status`.

### `POST /api/upload`

Estrae il testo da un file PDF o TXT (codificato in base64).

---

## Pagina /status

Navigabile su `/status`, mostra in tempo reale lo stato di ogni provider nella catena:
- ✅ Disponibile
- ⚠️ Quota esaurita / timeout / crediti insufficienti
- ❌ Chiave non valida / errore
- ⚪ Chiave non configurata

---

## Privacy

- La cronologia è salvata esclusivamente nel **localStorage del browser** — nessun dato lascia il dispositivo
- I documenti caricati vengono elaborati in tempo reale e **non memorizzati** sul server
- I messaggi vengono processati da Google AI, Groq Cloud, NVIDIA, OpenRouter e Tavily secondo i termini di servizio di ciascun fornitore
- Nessun cookie di tracciamento o analytics

---

## Licenza

Distribuito con licenza Apache 2.0. Vedi `LICENSE` per maggiori informazioni.
