<div align="center">

# ⚖️ AI Legge

### Assistente Legale basato su Intelligenza Artificiale per le leggi e i regolamenti italiani

Consulta la normativa italiana utilizzando l'Intelligenza Artificiale.

<p>

<a href="https://ailegge.vercel.app">
<img src="https://img.shields.io/badge/🚀-Live%20Demo-22c55e?style=for-the-badge">
</a>

<a href="https://github.com/supergino/ailegge/stargazers">
<img src="https://img.shields.io/github/stars/supergino/ailegge?style=for-the-badge">
</a>

<a href="https://github.com/supergino/ailegge/network/members">
<img src="https://img.shields.io/github/forks/supergino/ailegge?style=for-the-badge">
</a>

<a href="https://github.com/supergino/ailegge/issues">
<img src="https://img.shields.io/github/issues/supergino/ailegge?style=for-the-badge">
</a>

<a href="https://github.com/supergino/ailegge/blob/main/LICENSE">
<img src="https://img.shields.io/github/license/supergino/ailegge?style=for-the-badge">
</a>

</p>

### 🌍 Demo live

## https://ailegge.vercel.app

</div>

---

## Indice
- [AI Legge](#ai-legge)
- [Dimostrazione](#dimostrazione)
- [Cos'è AI Legge](#cosè-ai-legge)
- [Caratteristiche](#caratteristiche)
- [Caratteristiche dettagliate](#caratteristiche-dettagliate)
- [Perché AI Legge?](#perché-ai-legge)
- [Schermate](#schermate)
- [Architettura](#architettura)
- [Avvio rapido](#avvio-rapido)
- [Configurazione](#configurazione)
- [Demo dal vivo](#demo-dal-vivo)
- [Stack tecnologico](#stack-tecnologico)
- [Riferimento API](#riferimento-api)
- [Pagina di stato](#pagina-di-stato)
- [Roadmap](#roadmap)
- [Contribuire](#contribuire)
- [Sostieni il progetto](#sostieni-il-progetto)
- [Stato del progetto](#stato-del-progetto)
- [Privacy](#privacy)
- [Licenza](#licenza)

---

# 🎬 Dimostrazione

<p align="center">

<img src="docs/demo.gif" width="1000">

</p>

---

# 📖 Cos'è AI Legge?

AI Legge è una piattaforma Legale AI open-source progettata per **studenti di giurisprudenza**, professionisti legali e chiunque abbia bisogno di cercare, comprendere ed esplorare la **legislazione italiana** utilizzando il linguaggio naturale.

È stata pensata pensando agli **studenti di giurisprudenza** — un assistente virtuale che spiega i concetti giuridici, aiuta nella preparazione degli esami e fornisce riferimenti accurati ai codici e alle leggi italiane.

Invece di cercare manualmente nelle leggi, basta chiedere:

> *"Quali sono gli obblighi del datore di lavoro secondo il D.Lgs. 81/2008?"*

oppure

> *"Riassumi l'articolo 2087 del Codice Civile."*

e si ottiene una risposta generata dall'AI con riferimenti legali.

---

# ✨ Caratteristiche

✅ Ricerca in linguaggio naturale  
✅ Supporto alla legislazione italiana  
✅ Risposte generate dall'AI  
✅ Citazioni legali  
✅ Interfaccia web veloce  
✅ Design responsive  
✅ Open Source  
✅ Facile distribuzione  

---

# 🔬 Caratteristiche dettagliate

| Caratteristica | Descrizione |
|--------|-------------|
| **Modalità di risposta doppia** | Scegli tra **Tutor** (empatico, spiegazioni, quiz) o **Professore** (formale, rigoroso, livello d'esame) |
| **Filtro giurisdizionale** | Limita alla legge italiana sola o include UE e internazionale (TFEU, CEDU, CGUE) |
| **Pipeline anti-allucinazioni** | Gemini genera JSON strutturato → Qwen 3.6 27B (Groq) valida (valida anche il fallback Groq) → rigenerazione automatica se vengono trovati problemi |
| **Catena di fallback automatica** | Gemini → Groq gpt-oss-20b (veloce) → OpenRouter `openrouter/free` (sempre disponibile, senza crediti) → NVIDIA Llama 3.1 70B (potente, ultima risorsa). Si attiva su **qualsiasi** errore di Gemini, non solo su quota esaurita |
| **RAG su fonti giuridiche** | Tavily cerca su Normattiva, Gazzetta Ufficiale, Italgiure (e EUR-Lex) per fondare le risposte su fonti aggiornate |
| **Indice locale di codici (keyword)** | Scarica una volta il Codice Civile e Penale da Normattiva — indice TF-IDF per ricerca per parole chiave, zero dipendenze |
| **Modalità online + indice locale** | LLM cloud (Gemini) + ricerca locale sui codici scaricati. Nessuna chiamata esterna per domande coperti dai codici |
| **Modalità totalmente offline (Ollama)** | LLM locale (llama3.1:8b) + ricerca vettoriale. Scarica i codici una volta, funziona senza internet |
| **Fallback automatico Ollama→Gemini** | Se Ollama non è in esecuzione, la modalità locale utilizza automaticamente Gemini con l'indice locale dei codici |
| **Upload di documenti** | Allega file PDF o TXT (max 5 MB) per analisi potenziata dall'AI |
| **Pannello di contesto comprimibile** | Barra di riepilogo con le modalità attive, espandibile su mobile — più spazio per la chat su schermi piccoli |
| **Link profondi a Normattiva** | I link alle fonti puntano direttamente agli articoli specifici tramite URN (Codice Civile, Codice Penale, Costituzione) |
| **Design ispirato ad Apple** | UI con glassmorphism, supporto safe-area per iOS, tema chiaro/scuro |
| **Cronologia chat persistente** | Le conversazioni vengono salvate in localStorage, ripristinabili in qualsiasi momento |
| **Zero tracciamento** | Nessun cookie, nessun analytics, nessun tracker |
| **Pagina di stato** | Disponibilità e quota dei provider in tempo reale alla pagina `/status` |

---

# 🚀 Perché AI Legge?

| Ricerca tradizionale | AI Legge |
|----------------------|----------|
| Ricerca per parole chiave | ✅ Linguaggio naturale |
| Centinaia di pagine | ✅ Risposta istantanea |
| Ricerca manuale | ✅ Assistenza AI |
| Navigazione difficile | ✅ Interfaccia moderna |
| Consultazione statica | ✅ Dialogo interattivo |

---

# 🖥 Schermate

| Home | Risultati |
|------|-----------|
| ![](docs/home.png) | ![](docs/result.png) |

---

# 🏗 Architettura

Il sistema si basa su una **pipeline a più stadi** con RAG locale-first:

**Generatori e fallback.** Gemini 3.1 Flash-Lite è il generatore primario. Se Gemini fallisce per *qualsiasi* motivo (quota esaurita, modello inesistente, errore 5xx, problema di rete), si attiva automaticamente la catena di fallback, in ordine di velocità/disponibilità:
1. **Groq `openai/gpt-oss-20b`** — veloce (LPU), esegue anche la validazione anti-allucinazioni.
2. **OpenRouter `openrouter/free`** — router automatico che seleziona un modello *gratuito* dal pool sempre disponibile, **senza consumare crediti** (per questo motivo il `response_format` JSON viene omesso, per compatibilità con tutti i modelli del pool).
3. **NVIDIA `meta/llama-3.1-70b-instruct`** — modello 70B potente, ma con cold-start di 30-60s su NIM free: usato solo come extrema ratio. Ogni richiesta di fallback ha un timeout di 30s per evitare hang.

La risposta del fallback Groq viene a sua volta validata da Qwen 3.6 27B (Groq); la rigenerazione automatica resta riservata a Gemini.

```
                     ┌─────────────────────────────────────┐
                     │          MODALITÀ ONLINE (cloud)         │
                     ├─────────────────────────────────────┤
                     │  Domanda dell'utente                       │
                     │     │                                │
                     │     ▼                                │
                     │  ┌──────────┐  ┌──────────────────┐  │
                     │  │ Indice  │◄─│ Indice TF-IDF     │  │
                     │  │ Keyword │  │ Civile/Penale     │  │
                     │  │ (prio)  │  │ (scaricato una volta)│  │
                     │  └────┬─────┘  └──────────────────┘  │
                     │       │                               │
                     │  ┌────┴────┐  Se nessuna corrispondenza locale │
                     │  ▼         ▼                          │
                     │  Risultati ┌────────┐                   │
                     │       │     │ Tavily │  RAG su fonti     │
                     │       │     │ (RAG)  │  giuridiche           │
                     │       └──┬──┘        │                   │
                     │          │           │                   │
                     │          ▼           ▼                   │
                     │  ┌──────────────────────┐             │
                     │  │ Gemini 3.1 Flash-Lite│ ← Genera      │
                     │  │ (catena di fallback: │    risposta   │
                     │  │  Groq→OpenRouter→NV) │             │
                     │  └─────────┬────────────┘             │
                     │            ▼                          │
                     │  ┌──────────────────────┐             │
                     │  │ Qwen 3.6 27B (Groq)  │ ← Valida      │
                     │  │ + auto-rigenerazione │             │
                     │  └─────────┬────────────┘             │
                     │            ▼                          │
                     │     Risposta + badge delle fonti          │
                     ├─────────────────────────────────────┤
                     │          MODALITÀ LOCALE (Ollama)          │
                     ├─────────────────────────────────────┤
                     │  Domanda dell'utente                       │
                     │     │                                │
                     │     ▼                                │
                     │  ┌──────────┐  ┌───────────────┐     │
                     │  │ Store   │  │ Indice Keyword │     │
                     │  │ Vettoriale│  │ (TF-IDF)      │     │
                     │  │ (Ollama) │  │ (fallback)     │     │
                     │  └────┬─────┘  └───────────────┘     │
                     │       ▼                               │
                     │  ┌──────────────┐                     │
                     │  │ Ollama       │ ← Generazione locale  │
                     │  │ llama3.1:8b  │   (→Gemini fallback   │
                     │  │              │    se Ollama down)  │
                     │  └──────┬───────┘                     │
                     │         ▼                             │
                     │     Risposta + badge del modello        │
                     └─────────────────────────────────────┘
```

---

# ⚡ Avvio rapido

Clona il repository

```bash
git clone https://github.com/supergino/ailegge.git
```

Installa le dipendenze

```bash
npm install
```

Esegui in locale

```bash
npm run dev
```

Apri

```
http://localhost:3000
```

---

# 🔧 Configurazione

### Chiavi API

Copia il file di esempio e aggiungi le tue chiavi:

```bash
cp .env.example .env.local
```

| Variabile | Obbligatorio | Servizio | Ottenibile da |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google Gemini (generatore primario) | [ai.google.dev](https://ai.google.dev) |
| `GROQ_API_KEY` | ❌* | Groq (validatore Qwen 3.6 27B + fallback gpt-oss-20b) | [console.groq.com](https://console.groq.com) |
| `NVIDIA_API_KEY` | ❌* | NVIDIA (fallback intermedio) | [build.nvidia.com](https://build.nvidia.com) |
| `OPENROUTER_API_KEY` | ❌* | OpenRouter (fallback estremo) | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `TAVILY_API_KEY` | ❌* | Tavily (RAG search) | [tavily.com](https://tavily.com) |

\* *Solo `GEMINI_API_KEY` è obbligatorio; le altre sono facoltative — il sistema salta il passaggio corrispondente se mancante.*

### Configurazione dell'indice locale dei codici

Nell'app, vai su **Modalità di elaborazione → Online** o **Locale** e clicca su **"Scarica e indicizza i codici"**. Il sistema scarica il Codice Civile e Penale da Normattiva, li suddivide in blocchi e crea:

1. **Indice per parole chiave** (sempre): ricerca TF-IDF senza dipendenze, ~3-5 MB
2. **Archivio vettoriale** (solo se Ollama è disponibile): ricerca semantica con embeddings, ~5-8 MB

Una volta completato, le risposte utilizzano l'indice locale invece di chiamare Tavili per ogni domanda.

### Modalità totalmente offline (Ollama)

```bash
# Installa Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Scarica i modelli richiesti
ollama pull llama3.1:8b
ollama pull nomic-embed-text

# Avvia Ollama
ollama serve
```

Quindi riavvia l'app e seleziona **Modalità di elaborazione → Locale**.

### Eliminazione dei dati locali

Per rimuovere i codici scaricati e gli indici:
- dalle impostazioni dell'app: clicca su **"Elimina dati dei codici"** (è richiesta conferma)
- manualmente: elimina la cartella `.data/` nella radice del progetto

---

# 🌐 Demo dal vivo

## 🚀 https://ailegge.vercel.app

Nessuna installazione richiesta.

---

# 🏗 Stack tecnologico

| Categoria | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Linguaggio | JavaScript (nessun TypeScript) |
| UI | React 18, Tailwind CSS 3, Lucide React |
| AI primaria | Google Gemini 3.1 Flash-Lite (`@google/genai`) |
| AI di fallback veloce | OpenAI gpt-oss-20b (Groq Cloud) |
| Fallback sempre disponibile | OpenRouter `openrouter/free` (router automatico, nessun credito) |
| AI potente (ultima risorsa) | Llama 3.1 70B (NVIDIA API, cold-start 30-60s) |
| AI locale | Ollama — `llama3.1:8b` (configurabile) |
| Validatore AI | Qwen 3.6 27B (Groq Cloud) |
| Ricerca RAG su cloud | Tavily Search API |
| Ricerca locale per parole chiave | Indice TF-IDF invertito (zero dipendenze) |
| Ricerca vettoriale locale | Similarità coseno su `.data/vector-index.json` (Ollama) |
| Estrattore PDF | `pdf-parse` |
| Database vettoriale | File JSON (`.data/vector-index.json`) |
| Indice per parole chiave | File JSON (`.data/keyword-index.json`) |
| Deploy | Vercel |

---

# 📡 Riferimento API

### `POST /api/chat`

Genera una risposta legale (modalità online). Utilizza l'indice locale per parole chiave come RAG primario, Tavily come fallback.

**Corpo:**
```json
{
  "message": "Spiega la responsabilità extracontrattuale",
  "messages": [],
  "soloItalia": true,
  "modalitaTutor": true,
  "documentContext": "testo estratto (opzionale)",
  "documentName": "filename.pdf (opzionale)"
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
    "validatore": "Groq qwen/qwen3.6-27b",
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

### `POST /api/chat-locale`

Genera una risposta in modalità locale (Ollama + indice locale). Esegue automaticamente il fallback a Gemini se Ollama non è disponibile.

### `GET /api/setup-locale`

Scarica e indicizza i codici tramite flusso Server-Sent Events:
```
data: {"type": "status", "message": "Sto scaricando il Codice Civile..."}
data: {"type": "progress", "current": 50, "total": 500}
data: {"type": "complete", "info": {"keyword": 1200, "vector": true}}
```

### `GET /api/setup-locale?check=1`

Restituisce lo stato corrente dell'indice locale.

### `DELETE /api/setup-locale`

Elimina tutti i dati locali (indice per parole chiave + archivio vettoriale).

### `GET /api/status`

Restituisce la disponibilità e la quota di tutti i provider. Alimenta la pagina `/status`.

### `POST /api/upload`

Estrae il testo da un file PDF o TXT (codificato in base64).

---

# 📊 Pagina di stato

Visita `/status` per verificare in tempo reale la disponibilità dei provider:

| Stato | Significato |
|-------|-------------|
| ✅ Disponibile | Il provider è operativo |
| ⚠️ Quota esaurita / timeout | È stato raggiunto il limite di frequenza o nessuna risposta |
| ❌ Chiave non valida / errore | Errore di autenticazione o API |
| ⚪ Non configurato | Mancanza della chiave API in `.env.local` |

---

# 🎯 Roadmap

- [x] Demo online
- [x] UI responsive
- [x] Ricerca AI
- [ ] Retrieval Augmented Generation (RAG)
- [ ] Supporto multi-modello
- [ ] Upload PDF
- [ ] Sintesi di documenti legali
- [ ] Cronologia chat
- [ ] Autenticazione
- [ ] API
- [ ] Immagine Docker
- [ ] Interfaccia multilingue

---

# 🤝 Contribuire

I contributi sono benvenuti!

Se hai idee o migliorie:
- Apri una Issue
- Invia una Pull Request
- Suggerisci nuove funzionalità

Ogni contributo è apprezzato.

---

# ⭐ Sostieni il progetto

Se AI Legge ti è utile...

ti chiediamo gentilmente di dargli una ⭐ su GitHub.

Aiuta davvero il progetto a crescere.

---

# 📊 Stato del progetto

![GitHub last commit](https://img.shields.io/github/last-commit/supergino/ailegge)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/supergino/ailegge)
![GitHub repo size](https://img.shields.io/github/repo-size/supergino/ailegge)
![GitHub language count](https://img.shields.io/github/languages/count/supergino/ailegge)
![GitHub top language](https://img.shields.io/github/languages/top/supergino/ailegge)

---

# 🔒 Privacy

- La cronologia delle chat è memorizzata esclusivamente nel **localStorage** del browser — nessun dato lascia il tuo dispositivo
- I documenti caricati vengono elaborati in tempo reale e **non vengono memorizzati** sul server
- I messaggi vengono elaborati da Google AI, Groq Cloud, NVIDIA, OpenRouter e Tavily secondo i termini di servizio di ciascun provider
- Nella **modalità locale (Ollama)**, nessun dato lascia il tuo computer — il modello LLM e l'indice sono totalmente locali
- I codici e gli indici scaricati sono memorizzati nella cartella `.data/` del progetto — eliminabili in qualsiasi momento dalle impostazioni
- **Nessun cookie di tracciamento, analytics o tracker di terze parti**

---

# 📄 Licenza

Distribuito sotto la **Licenza Apache 2.0**. Consulta il file [LICENSE](LICENSE) per i dettagli.

---

<div align="center">

## ⭐ Cronologia delle stelle

[![Star History Chart](https://api.star-history.com/svg?repos=supergino/ailegge&type=Date)](https://star-history.com/#supergino/ailegge&Date)

</div>

---

---

<div align="center">

Realizzato con ❤️ per la comunità Open Source italiana.

</div>

---

## Versione inglese (English version)

<div align="center">

# ⚖️ AI Legge

### AI-powered Legal Assistant for Italian Laws and Regulations

Consult Italian legislation using Artificial Intelligence.

<p>

<a href="https://ailegge.vercel.app">
<img src="https://img.shields.io/badge/🚀-Live%20Demo-22c55e?style=for-the-badge">
</a>

<a href="https://github.com/supergino/ailegge/stargazers">
<img src="https://img.shields.io/github/stars/supergino/ailegge?style=for-the-badge">
</a>

<a href="https://github.com/supergino/ailegge/network/members">
<img src="https://img.shields.io/github/forks/supergino/ailegge?style=for-the-badge">
</a>

<a href="https://github.com/supergino/ailegge/issues">
<img src="https://img.shields.io/github/issues/supergino/ailegge?style=for-the-badge">
</a>

<a href="https://github.com/supergino/ailegge/blob/main/LICENSE">
<img src="https://img.shields.io/github/license/supergino/ailegge?style=for-the-badge">
</a>

</p>

### 🌍 Live Demo

## https://ailegge.vercel.app

</div>

---

# 🎬 Demo

<p align="center">

<img src="docs/demo.gif" width="1000">

</p>

---

# 📖 What is AI Legge?

AI Legge is an open-source Legal AI platform designed for **law students**, legal professionals, and anyone who needs to search, understand and explore **Italian legislation** using natural language.

It was built with **jurisprudence students** in mind — a virtual assistant that explains legal concepts, helps with exam preparation, and provides accurate references to Italian codes and laws.

Instead of manually searching through laws, simply ask:

> *"What are the employer's obligations under D.Lgs. 81/2008?"*

or

> *"Summarize article 2087 of the Civil Code."*

and receive an AI-generated answer with legal references.

---

# ✨ Features

✅ Natural language search  
✅ Italian legislation support  
✅ AI-generated answers  
✅ Legal citations  
✅ Fast web interface  
✅ Responsive design  
✅ Open Source  
✅ Easy deployment  

---

# 🔬 Detailed Features

| Feature | Description |
|---------|-------------|
| **Dual response mode** | Choose between **Tutor** (empathetic, explanations, quizzes) or **Professore** (formal, rigorous, exam-level) |
| **Jurisdictional filter** | Limit to Italian law only or include EU and international (TFEU, ECHR, CJEU) |
| **Anti-hallucination pipeline** | Gemini generates structured JSON → Qwen 3.6 27B (Groq) validates (validates also the Groq fallback) → automatic regeneration if issues found |
| **Automatic fallback chain** | Gemini → Groq gpt-oss-20b (fast) → OpenRouter `openrouter/free` (always available, no credits) → NVIDIA Llama 3.1 70B (powerful, last-resort). Triggers on **any** Gemini error, not only quota |
| **RAG on legal sources** | Tavily searches Normattiva, Gazzetta Ufficiale, Italgiure (and EUR-Lex) to ground answers in updated sources |
| **Local code index (keyword)** | Download the Civil Code and Penal Code once from Normattiva — TF-IDF keyword index, zero dependencies |
| **Online + local index mode** | Cloud LLM (Gemini) + local search on downloaded codes. No external calls for code-covered questions |
| **Fully offline mode (Ollama)** | Local LLM (llama3.1:8b) + vector search. Download codes once, works without internet |
| **Automatic Ollama→Gemini fallback** | If Ollama is not running, Local mode automatically uses Gemini with the local code index |
| **Document upload** | Attach PDF or TXT files (max 5 MB) for AI-powered analysis |
| **Collapsible context panel** | Summary bar with active modes, expandable on mobile — more chat space on small screens |
| **Deep linking to Normattiva** | Source links point directly to specific articles via URN (Civil Code, Penal Code, Constitution) |
| **Apple-native design** | Glassmorphism UI, safe-area support for iOS, light/dark theme |
| **Persistent chat history** | Conversations saved in localStorage, resumable anytime |
| **Zero tracking** | No cookies, no analytics, no trackers |
| **Status page** | Real-time provider availability and quota at `/status` |

---

# 🚀 Why AI Legge?

| Traditional Search | AI Legge |
|--------------------|----------|
| Keyword search | ✅ Natural language |
| Hundreds of pages | ✅ Instant answer |
| Manual research | ✅ AI assistance |
| Difficult navigation | ✅ Modern interface |
| Static consultation | ✅ Interactive dialogue |

---

# 🖥 Screenshots

| Home | Results |
|------|---------|
| ![](docs/home.png) | ![](docs/result.png) |

---

# 🏗 Architecture

The system is built on a **multi-stage pipeline** with local-first RAG:

**Generators and fallback.** Gemini 3.1 Flash-Lite is the primary generator. If Gemini fails for *any* reason (quota exhausted, model nonexistent, 5xx error, network issue), the fallback chain triggers automatically, in order of speed/availability:
1. **Groq `openai/gpt-oss-20b`** — fast (LPU), also performs anti-hallucination validation.
2. **OpenRouter `openrouter/free`** — automatic router that picks a *free* model from the always‑available pool, **no credits consumed** (hence `response_format` JSON is omitted for compatibility with all models in the pool).
3. **NVIDIA `meta/llama-3.1-70b-instruct`** — powerful 70B model, but with 30‑60s cold‑start on NIM free → used only as last resort. Each fallback request has a 30s timeout to avoid hanging.

The Groq fallback response is itself validated by Qwen 3.6 27B (Groq); automatic regeneration is reserved for Gemini.

```
                     ┌─────────────────────────────────────┐
                     │          ONLINE MODE (cloud)         │
                     ├─────────────────────────────────────┤
                     │  User question                       │
                     │     │                                │
                     │     ▼                                │
                     │  ┌──────────┐  ┌──────────────────┐  │
                     │  │ Keyword  │◄─│ TF-IDF Index     │  │
                     │  │ Index    │  │ Civil/Penal Code │  │
                     │  │ (prio)   │  │ (downloaded once)│  │
                     │  └────┬─────┘  └──────────────────┘  │
                     │       │                               │
                     │  ┌────┴────┐  If no local match       │
                     │  ▼         ▼                          │
                     │  Results  ┌────────┐                   │
                     │    │     │ Tavily │  RAG on legal     │
                     │    │     │ (RAG)  │  sources           │
                     │    └──┬──┘        │                   │
                     │       │           │                   │
                     │       ▼           ▼                   │
                     │  ┌──────────────────────┐             │
                     │  │ Gemini 3.1 Flash-Lite│ ← Generate  │
                     │  │ (fallback chain:     │    response  │
                     │  │  Groq→OpenRouter→NV) │             │
                     │  └─────────┬────────────┘             │
                     │            ▼                          │
                     │  ┌──────────────────────┐             │
                     │  │ Qwen 3.6 27B (Groq)  │ ← Validate  │
                     │  │ + auto-regeneration  │             │
                     │  └─────────┬────────────┘             │
                     │            ▼                          │
                     │     Response + source badges          │
                     ├─────────────────────────────────────┤
                     │          LOCAL MODE (Ollama)          │
                     ├─────────────────────────────────────┤
                     │  User question                       │
                     │     │                                │
                     │     ▼                                │
                     │  ┌──────────┐  ┌───────────────┐     │
                     │  │ Vector   │  │ Keyword Index │     │
                     │  │ Store    │  │ (TF-IDF)      │     │
                     │  │ (Ollama) │  │ (fallback)     │     │
                     │  └────┬─────┘  └───────────────┘     │
                     │       ▼                               │
                     │  ┌──────────────┐                     │
                     │  │ Ollama       │ ← Local generation  │
                     │  │ llama3.1:8b  │   (→Gemini fallback │
                     │  │              │    if Ollama down)  │
                     │  └──────┬───────┘                     │
                     │         ▼                             │
                     │     Response + model badge            │
                     └─────────────────────────────────────┘
```

---

# ⚡ Quick Start

Clone the repository

```bash
git clone https://github.com/supergino/ailegge.git
```

Install dependencies

```bash
npm install
```

Run locally

```bash
npm run dev
```

Open

```
http://localhost:3000
```

---

# 🔧 Configuration

### API Keys

Copy the example file and add your keys:

```bash
cp .env.example .env.local
```

| Variable | Required | Service | Get it at |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google Gemini (primary generator) | [ai.google.dev](https://ai.google.dev) |
| `GROQ_API_KEY` | ❌* | Groq (validatore Qwen 3.6 27B + fallback gpt-oss-20b) | [console.groq.com](https://console.groq.com) |
| `NVIDIA_API_KEY` | ❌* | NVIDIA (intermediate fallback) | [build.nvidia.com](https://build.nvidia.com) |
| `OPENROUTER_API_KEY` | ❌* | OpenRouter (extreme fallback) | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `TAVILY_API_KEY` | ❌* | Tavily (RAG search) | [tavily.com](https://tavily.com) |

\* *Only `GEMINI_API_KEY` is required; the rest are optional — the system skips the respective step if missing.*

### Local Code Index Setup

In the app, go to **Processing Mode → Online** or **Locale** and click **"Download and index codes"**. The system downloads the Civil Code and Penal Code from Normattiva, chunks them, and builds:

1. **Keyword index** (always): TF-IDF text search, zero dependencies, ~3-5 MB
2. **Vector store** (only if Ollama is available): semantic search embeddings, ~5-8 MB

Once complete, answers use the local index instead of calling Tavily for every question.

### Fully Offline Mode (Ollama)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Download required models
ollama pull llama3.1:8b
ollama pull nomic-embed-text

# Start Ollama
ollama serve
```

Then restart the app and select **Processing Mode → Locale**.

### Delete Local Data

To remove downloaded codes and indexes:
- From the app settings: click **"Delete code data"** (confirmation required)
- Manually: delete the `.data/` folder in the project root

---

# 🌐 Live Demo

## 🚀 https://ailegge.vercel.app

No installation required.

---

# 🏗 Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | JavaScript (no TypeScript) |
| UI | React 18, Tailwind CSS 3, Lucide React |
| Primary AI | Google Gemini 3.1 Flash-Lite (`@google/genai`) |
| Fast fallback AI | OpenAI gpt-oss-20b (Groq Cloud) |
| Always-available fallback | OpenRouter `openrouter/free` (auto-router, no credits) |
| Powerful fallback AI (last-resort) | Llama 3.1 70B (NVIDIA API, cold-start 30-60s) |
| Local AI | Ollama — `llama3.1:8b` (configurable) |
| AI Validator | Qwen 3.6 27B (Groq Cloud) |
| Cloud RAG search | Tavily Search API |
| Local keyword search | TF-IDF inverted index (zero dependencies) |
| Local vector search | Cosine similarity on `.data/vector-index.json` (Ollama) |
| PDF extraction | `pdf-parse` |
| Vector database | JSON file-based (`.data/vector-index.json`) |
| Keyword index | JSON file-based (`.data/keyword-index.json`) |
| Deployment | Vercel |

---

# 📡 API Reference

### `POST /api/chat`

Generates a legal response (Online mode). Uses local keyword index as primary RAG, Tavily as fallback.

**Body:**
```json
{
  "message": "Explain extracontractual liability",
  "messages": [],
  "soloItalia": true,
  "modalitaTutor": true,
  "documentContext": "extracted text (optional)",
  "documentName": "filename.pdf (optional)"
}
```

**Response:**
```json
{
  "text": "Extracontractual liability is governed by art. 2043 c.c....",
  "modalita": "tutor",
  "fonti": [{ "nome": "Art. 2043 c.c.", "sito": "normattiva.it" }],
  "modelli": {
    "tavily": false,
    "indiceLocale": true,
    "generatore": "Gemini 3.1 Flash-Lite",
    "validatore": "Groq qwen/qwen3.6-27b",
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

### `POST /api/chat-locale`

Generates a response in Local mode (Ollama + local index). Auto-fallback to Gemini if Ollama is unavailable.

### `GET /api/setup-locale`

Downloads and indexes codes via Server-Sent Events stream:
```
data: {"type": "status", "message": "Downloading Civil Code..."}
data: {"type": "progress", "current": 50, "total": 500}
data: {"type": "complete", "info": {"keyword": 1200, "vector": true}}
```

### `GET /api/setup-locale?check=1`

Returns the current status of the local index.

### `DELETE /api/setup-locale`

Deletes all local data (keyword index + vector store).

### `GET /api/status`

Returns the availability and quota of all providers. Powers the `/status` page.

### `POST /api/upload`

Extracts text from a PDF or TXT file (base64-encoded).

---

# 📊 Status Page

Navigate to `/status` to check real-time provider availability:

| Status | Meaning |
|--------|---------|
| ✅ Available | Provider is operational |
| ⚠️ Quota exhausted / timeout | Rate limit hit or no response |
| ❌ Invalid key / error | Authentication or API error |
| ⚪ Not configured | API key missing in `.env.local` |

---

# 🎯 Roadmap

- [x] Online Demo
- [x] Responsive UI
- [x] AI Search
- [ ] Retrieval Augmented Generation (RAG)
- [ ] Multi-model support
- [ ] PDF upload
- [ ] Legal document summarization
- [ ] Chat history
- [ ] Authentication
- [ ] API
- [ ] Docker image
- [ ] Multi-language interface

---

# 🤝 Contributing

Contributions are welcome!

If you have ideas or improvements:
- Open an Issue
- Submit a Pull Request
- Suggest new features

Every contribution is appreciated.

---

# ⭐ Support the Project

If AI Legge helps you...

please consider giving it a ⭐ on GitHub.

It really helps the project grow.

---

# 📊 Project Status

![GitHub last commit](https://img.shields.io/github/last-commit/supergino/ailegge)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/supergino/ailegge)
![GitHub repo size](https://img.shields.io/github/repo-size/supergino/ailegge)
![GitHub language count](https://img.shields.io/github/languages/count/supergino/ailegge)
![GitHub top language](https://img.shields.io/github/languages/top/supergino/ailegge)

---

# 🔒 Privacy

- Chat history is stored exclusively in **browser localStorage** — no data leaves your device
- Uploaded documents are processed in real-time and **not stored** on the server
- Messages are processed by Google AI, Groq Cloud, NVIDIA, OpenRouter, and Tavily according to each provider's terms of service
- In **Local mode (Ollama)**, no data leaves your computer — the LLM and index are entirely local
- Downloaded codes and indexes are stored in the `.data/` project folder — deletable anytime from settings
- **No tracking cookies, analytics, or third-party trackers**

---

# 📄 License

Distributed under the **Apache 2.0 License**. See [LICENSE](LICENSE) for details.

---

<div align="center">

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=supergino/ailegge&type=Date)](https://star-history.com/#supergino/ailegge&Date)

</div>

---

<div align="center">

Made with ❤️ for the Italian Open Source community.

</div>