<div align="center">

# ⚖️ AI Legge

### AI-powered Legal Assistant for Italian Laws and Regulations

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

> *"Quali sono gli obblighi del datore di lavoro secondo il D.Lgs. 81/2008?"*

or

> *"Riassumi l'articolo 2087 del Codice Civile."*

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
| **Anti-hallucination pipeline** | Gemini generates structured JSON → Llama 3.3 70B validates → automatic regeneration if issues found |
| **4-level automatic fallback** | Gemini → Groq (fast) → NVIDIA (powerful) → OpenRouter (4 models chain) |
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
|--------------------|-----------|
| Keyword search | ✅ Natural language |
| Hundreds of pages | ✅ Instant answer |
| Manual research | ✅ AI assistance |
| Difficult navigation | ✅ Modern interface |
| Static consultation | ✅ Interactive dialogue |

---

# 🖥 Screenshots

| Home | Results |
|------|----------|
| ![](docs/home.png) | ![](docs/result.png) |

---

# 🏗 Architecture

The system is built on a **multi-stage pipeline** with local-first RAG:

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
                    │ Results  ┌────────┐                   │
                    │    │     │ Tavily │  RAG on legal     │
                    │    │     │ (RAG)  │  sources           │
                    │    └──┬──┘        │                   │
                    │       │           │                   │
                    │       ▼           ▼                   │
                    │  ┌──────────────────────┐             │
                    │  │ Gemini 3.1 Flash-Lite│ ← Generate  │
                    │  │ (fallback chain:     │    response  │
                    │  │  Groq→NVIDIA→OR)     │             │
                    │  └─────────┬────────────┘             │
                    │            ▼                          │
                    │  ┌──────────────────────┐             │
                    │  │ Llama 3.3 70B (Groq) │ ← Validate  │
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
| `GROQ_API_KEY` | ❌* | Groq (validator + fallback) | [console.groq.com](https://console.groq.com) |
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
| Fast fallback AI | Llama 3.1 8B (Groq Cloud) |
| Powerful fallback AI | Llama 3.1 70B (NVIDIA API) |
| Extreme fallback AI | OpenRouter (4 models in chain) |
| Local AI | Ollama — `llama3.1:8b` (configurable) |
| AI Validator | Llama 3.3 70B (Groq Cloud) |
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
  "message": "Spiega la responsabilità extracontrattuale",
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

### `POST /api/chat-locale`

Generates a response in Local mode (Ollama + local index). Auto-fallback to Gemini if Ollama is unavailable.

### `GET /api/setup-locale`

Downloads and indexes codes via Server-Sent Events stream:
```
data: {"type": "status", "message": "Scarico Codice Civile..."}
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