# IusMente

Assistente virtuale intelligente per studenti di giurisprudenza, basato su una pipeline multi-modello con validazione incrociata, fallback automatico a 4 livelli e ricerca RAG su fonti normative italiane. Supporta modalità **Online** (cloud LLM + indice locale dei codici) e **Locale** (Ollama, completamente offline).

---

## Caratteristiche

- **Doppia modalità di risposta**: Assistenza studio (Tutor — empatico, spiegazioni, quiz) o Ambito ufficiale legislativo (Professore — formale, rigoroso, come in commissione d'esame)
- **Filtro giurisdizionale**: scegli se limitarti al solo diritto italiano o includere UE e internazionale (TFUE, CEDU, CGUE)
- **Pipeline anti-allucinazione**: Gemini genera la risposta JSON strutturata, Llama 3.3 70B (Groq) la valida, in caso di criticità viene rigenerata automaticamente
- **Fallback automatico a 4 livelli**: Gemini → Groq (veloce) → NVIDIA (potente) → OpenRouter (catena 4 modelli)
- **Ricerca RAG su fonti normative**: Tavily interroga Normattiva, Gazzetta Ufficiale, Italgiure (e EUR-Lex) per ancorare le risposte a fonti aggiornate — indicatore visivo nella risposta quando il RAG è attivo
- **Indice locale codici (keyword)**: scarica una volta sola il Codice Civile e il Codice Penale da Normattiva, indicizzazione keyword TF-IDF zero-dipendenze. Le risposte usano l'indice locale invece di chiamare Tavily a ogni domanda — badge "Indice locale" nella risposta
- **Modalità Online con indice locale**: cloud LLM (Gemini) + ricerca locale sui codici scaricati. Nessuna connessione a siti esterni per le domande coperte dai codici
- **Modalità Locale (Ollama)**: completamente offline. LLM locale (llama3.1:8b) + ricerca vettoriale. Scarica i codici una volta e funziona senza internet
- **Fallback automatico Ollama→Gemini**: se Ollama non è in esecuzione, la modalità Locale usa automaticamente Gemini con l'indice locale dei codici
- **Upload documenti**: allega file PDF o TXT (max 5 MB) per analizzarli con l'assistente
- **Pannello contesto collassabile su mobile**: riga di riepilogo con le 3 modalità attive, espandibile per modificare le impostazioni — più spazio per chat su schermi piccoli
- **Deep linking Normattiva**: i link alle fonti nei risultati puntano direttamente all'articolo specifico sui codici (Civile, Penale, Costituzione) via URN Normattiva
- **Design nativo Apple**: interfaccia in vetro smerigliato, supporto safe-area per dispositivi iOS, tema chiaro/scuro
- **Cronologia persistente**: conversazioni salvate in localStorage, riprendibili in qualsiasi momento
- **Zero tracker**: nessun cookie di tracciamento o analytics
- **Pagina /status**: verifica实时 della disponibilità e quota di ogni provider nella catena

---

## Architettura

```
┌───────────────────────────────────────────────────────┐
│            MODALITÀ ONLINE (cloud LLM)                │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Domanda utente                                       │
│       │                                               │
│       ▼                                               │
│  ┌──────────────┐    ┌──────────────────────┐         │
│  │ Indice locale│◄── │ Keyword Index (TF-IDF)│  ← Scaricato
│  │ (prioritario)│    │ Codice Civile/Penale  │     una volta
│  └──────┬───────┘    └──────────────────────┘         │
│         │                                              │
│    ┌────┴─────┐    Se indice vuoto                    │
│    ▼          ▼    o non pertinente                    │
│  Risultati   ┌──────────┐                             │
│    │         │ Tavily   │  ← RAG su normattiva.it     │
│    │         │ (fallback)│    gazzettaufficiale.it     │
│    │         └────┬─────┘                             │
│    └──────┬───────┘                                   │
│           ▼                                           │
│  ┌────────────────────┐                               │
│  │ Gemini 3.1 Flash   │  ← Genera risposta            │
│  │ (+ catena fallback │     con contesto RAG          │
│  │  Groq→NVIDIA→OR)   │                               │
│  └─────────┬──────────┘                               │
│            ▼                                          │
│  ┌────────────────────┐                               │
│  │ Llama 3.3 70B      │  ← Validazione (Groq)        │
│  │ + rigenerazione    │                               │
│  └─────────┬──────────┘                               │
│            ▼                                          │
│     Risposta + badge "Indice locale" / "Tavily RAG"  │
│                                                       │
├───────────────────────────────────────────────────────┤
│            MODALITÀ LOCALE (Ollama)                   │
├───────────────────────────────────────────────────────┤
│                                                       │
│  Domanda utente                                       │
│       │                                               │
│       ▼                                               │
│  ┌──────────────┐   ┌────────────────────────┐        │
│  │ Vector Store │   │ Keyword Index (TF-IDF) │        │
│  │ (Ollama)     │   │ (fallback se no Ollama)│        │
│  └──────┬───────┘   └────────────────────────┘        │
│         ▼                                             │
│  ┌──────────────┐                                     │
│  │ Ollama       │  ← Generazione locale               │
│  │ llama3.1:8b  │     (fallback→Gemini se offline)    │
│  └──────┬───────┘                                     │
│         ▼                                             │
│     Risposta + badge modello usato                    │
│                                                       │
└───────────────────────────────────────────────────────┘
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
| AI generativa (locale) | Ollama — `llama3.1:8b` (configurabile) |
| AI validatore | Llama 3.3 70B (Groq Cloud) |
| Ricerca RAG cloud | Tavily Search API |
| Ricerca locale (keyword) | Indice invertito TF-IDF (zero dipendenze) |
| Ricerca locale (vettoriale) | Cosine similarity su `.data/vector-index.json` (Ollama) |
| Estrazione PDF | `pdf-parse` |
| Database vettoriale | JSON file-based (`.data/vector-index.json`) |
| Indice keyword | JSON file-based (`.data/keyword-index.json`) |

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

### Setup indice locale

Nell'interfaccia, passa alla **Modalità elaborazione → Locale** o **Online** e clicca **"Scarica e indicizza codici"**. Il sistema scaricherà il Codice Civile e il Codice Penale da Normattiva, li chunkerà e costruirà:

1. **Indice keyword** (sempre): ricerca testuale TF-IDF, zero dipendenze, ~3-5 MB
2. **Vector store** (solo se Ollama è disponibile): embeddings vettoriali per ricerca semantica, ~5-8 MB

Una volta completato, le risposte useranno l'indice locale invece di chiamare Tavily a ogni domanda.

### Modalità Locale (Ollama)

Per la modalità completamente offline:

```bash
# Installa Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Scarica i modelli necessari
ollama pull llama3.1:8b
ollama pull nomic-embed-text

# Avvia Ollama
ollama serve
```

Poi avvia l'app:

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) e seleziona **Modalità elaborazione → Locale**.

### Eliminazione dati

Per cancellare i codici scaricati e gli indici:
- Dalle impostazioni dell'app: clicca **"Elimina dati codici"** (conferma richiesta)
- Manualmente: elimina la cartella `.data/` nella radice del progetto

---

## API

### `POST /api/chat`

Genera una risposta giuridica (modalità Online). Usa l'indice keyword locale come RAG prioritario, Tavily come fallback.

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
    "tavily": false,
    "indiceLocale": true,
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
- `"OpenRouter:..."` — catena estremo

Il campo `modelli.tavily` (`true`/`false`) indica se la ricerca Tavily è stata usata.  
Il campo `modelli.indiceLocale` (`true`/`false`) indica se l'indice keyword locale è stato usato (prioritario su Tavily).

### `POST /api/chat-locale`

Genera una risposta in modalità Locale (Ollama + indice locale). Se Ollama non è disponibile, fallback automatico a Gemini con il contesto dell'indice locale.

**Body:**

```json
{
  "message": "Spiega la responsabilità extracontrattuale",
  "messages": [],
  "modalitaTutor": true
}
```

**Risposta:** stesso formato di `/api/chat`, con `modelli.generatore` che indica il modello effettivamente usato (es. `"Locale (llama3.1:8b)"` o `"Gemini 3.1 Flash-Lite (fallback, indice locale)"`).

### `GET /api/setup-locale`

Avvia il download e l'indicizzazione dei codici (Server-Sent Events). Restituisce un flusso di eventi JSON con lo stato di avanzamento:

```
data: {"type": "status", "message": "Scarico Codice Civile..."}
data: {"type": "progress", "current": 50, "total": 500}
data: {"type": "complete", "info": {"keyword": 1200, "vector": true, "codici": ["Codice Civile", "Codice Penale"]}}
data: {"type": "error", "message": "..."}
```

### `GET /api/setup-locale?check=1`

Verifica lo stato corrente dell'indice locale:

```json
{
  "keywordIndex": { "initialized": true, "info": { "totale": 1200, "codici": ["Codice Civile", "Codice Penale"] } },
  "vectorStore": { "initialized": true, ... } | { "initialized": false },
  "ollama": { "available": true, "models": ["llama3.1:8b", "nomic-embed-text"], ... }
}
```

### `DELETE /api/setup-locale`

Elimina tutti i dati locali (keyword index + vector store). Usato dal pulsante "Elimina dati codici" nelle impostazioni.

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
- In **modalità Locale (Ollama)**, nessun dato lascia il tuo computer — LLM e indice sono interamente locali
- I codici scaricati e l'indice keyword/vector store sono salvati nella cartella `.data/` del progetto — cancellabili in qualsiasi momento dalle impostazioni
- Nessun cookie di tracciamento o analytics

---

## Licenza

Distribuito con licenza Apache 2.0. Vedi `LICENSE` per maggiori informazioni.
