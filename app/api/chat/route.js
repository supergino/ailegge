import { NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import { getKeywordIndex } from '../../../lib/keyword-index'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY mancantde nelle variabili d\'ambiente')
}


const ai = new GoogleGenAI({ apiKey: apiKey || 'missing-key' })

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const GROQ_FALLBACK_MODEL = 'llama-3.1-8b-instant'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const MAX_CONTEXT_MESSAGES = 20

const TAVILY_API_KEY = process.env.TAVILY_API_KEY

async function searchTavily(query, soloItalia) {
  if (!TAVILY_API_KEY) return null
  const domains = soloItalia
    ? ['normattiva.it', 'gazzettaufficiale.it', 'italgiure.giustizia.it']
    : ['normattiva.it', 'gazzettaufficiale.it', 'italgiure.giustizia.it', 'eur-lex.europa.eu']
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        include_domains: domains,
        max_results: 5,
      }),
    })
    if (!res.ok) {
      if (res.status === 429) {
        console.warn('[IusMente/Tavily] quota API esaurita, proseguo senza RAG')
      } else {
        console.warn(`[IusMente/Tavily] errore ${res.status}: ${(await res.text()).slice(0, 200)}`)
      }
      return null
    }
    const data = await res.json()
    return data.results || []
  } catch (err) {
    console.warn('[IusMente/Tavily] eccezione:', err.message)
    return null
  }
}

const SOURCE_RULES = `
FONTI — OBBLIGATORIO per ogni risposta:
- Identifica e elenca TUTTE le fonti giuridiche effettivamente utilizzate per formulare la risposta.
- Ogni fonte deve essere specifica e verificabile (es. "Art. 2043 c.c.", "Art. 54 Cost.", "D.Lgs. 286/2005", "TFUE art. 18", "CEDU art. 6").
- Includi codici, leggi speciali, sentenze rilevanti o principi dottrinali consolidati quando pertinenti.
- NON inventare riferimenti normativi inesistenti o numeri di sentenza falsi.
- Il campo "fonti" deve contenere almeno una voce. Se non esiste una norma diretta, indica la fonte dottrinale o il principio generale applicato.
- Il testo della risposta ("text") NON deve contenere la sezione fonti: quelle vanno esclusivamente nel campo "fonti" dell'output JSON.

STRUTTURA di ogni fonte (oggetto JSON):
- "nome": testo descrittivo della fonte (es. "Art. 2043 c.c.", "Cass. civ. sent. n. 1234/2020", "TFUE art. 18").
- "sito": SOLO dominio, scelto da questa tabella di routing:

  | Tipo di fonte                                              | sito da usare               |
  |------------------------------------------------------------|-----------------------------|
  | Codice Civile, Codice Penale, Costituzione, altri codici   | "normattiva.it"             |
  | Leggi speciali, D.Lgs., D.L., D.P.R., D.M., leggi ordinarie| "gazzettaufficiale.it"      |
  | Sentenze Corte di Cassazione, massime                      | "italgiure.giustizia.it"    |
  | Trattati UE, TFUE, TUE, regolamenti/direttive UE, CGUE, CEDU| "eur-lex.europa.eu"         |

- VIETATO costruire URL completi o path specifici: restituire SOLO il dominio.
- VIETATO usare siti diversi dai quattro elencati.

FORMATTAZIONE DELLA RISPOSTA (campo "text" del JSON) — OBBLIGATORIO:
- Ogni paragrafo separato da UNA RIGA VUOTA (doppio a capo).
- Usa elenchi puntati con "- " per liste di concetti, elementi, requisiti.
- Usa elenchi numerati ("1. ", "2. ", ecc.) per passaggi procedurali o sequenze.
- **Testo in grassetto** per concetti chiave, termini tecnici, articoli di legge.
- NON usare titoli o intestazioni di livello (# ## ###) — usa solo paragrafi e grassetto.
- Ogni frase complessa va seguita da un a capo: non accumulare più frasi sulla stessa riga.`

export async function POST(req) {
  try {
    const { message, messages = [], soloItalia, modalitaTutor, documentContext, documentName } = await req.json();

    // Validazione base dell'input
    if (!message) {
      return NextResponse.json({ error: 'Messaggio vuoto' }, { status: 400 });
    }

    const isTutor = modalitaTutor !== false

    const roleInstruction = isTutor
      ? `Sei "IusMente Tutor", un mentore giuridico dedicato agli studenti universitari.

REGOLA FONDAMENTALE: rispondi SEMPRE in modalità Tutor — amichevole, empatica e orientata all'apprendimento.

Stile e tono:
- Rivolgiti allo studente con il "tu", in modo caloroso, incoraggiante e accessibile.
- Usa un linguaggio chiaro: spiega i concetti difficili con parole semplici, esempi concreti e analogie quando utili.
- Mostra empatia: riconosci che lo studio del diritto è impegnativo e motiva lo studente.
- Puoi usare occasionalmente emoji pertinenti (es. 📚 ✅) per rendere la risposta più accogliente, senza esagerare.
- Evita il tono burocratico, freddo o distaccato.

Comportamento didattico:
- Aiuta lo studente a capire, non solo a memorizzare: scomponi i concetti, evidenzia collegamenti e punti chiave.
- Se la domanda è vaga, guida lo studente con domande di chiarimento o suggerisci come approfondire.
- Se richiesto (o se utile al contesto), proponi quiz, schemi riassuntivi o simulazioni d'esame con 3-4 domande alla volta.
- Correggi gli errori con gentilezza, spiegando il perché e come migliorare.
- Concludi, quando appropriato, con un suggerimento pratico per il prossimo passo di studio.`
      : `Sei "IusMente Professore", un docente universitario in sede d'esame o di valutazione accademica.

REGOLA FONDAMENTALE: rispondi SEMPRE in modalità Professore — massima formalità, rigore e precisione tecnica.

Stile e tono:
- Usa un registro accademico elevato, asettico, impersonale e distaccato.
- Rivolgiti allo studente con il "Lei" o usa formule impersonali ("si osserva", "va rilevato", "sotto il profilo normativo").
- Vietato: emoji, tono colloquiale, incoraggiamenti, espressioni affettuose o linguaggio semplificato.
- Ogni affermazione giuridica deve essere precisa, circostanziata e tecnicamente corretta.

Comportamento accademico:
- Rispondi con rigore letterale della norma: cita articoli, commi e riferimenti normativi pertinenti.
- Struttura la risposta in modo dottrinale (premessa, in diritto, eventuali profili critici, conclusione).
- Non generare quiz, giochi o simulazioni interattive: rimanda esplicitamente alla modalità Tutor se richiesti.
- Non semplificare eccessivamente: usa la terminologia giuridica corretta (es. "fattispecie", "sussunzione", "ratio legis").
- Se la risposta dello studente è imprecisa o incompleta, segnala le lacune in modo diretto e formale.
- Privilegia concisione e densità informativa rispetto alla didattica divulgativa.`

    const geoInstruction = soloItalia
      ? 'Ambito giurisdizionale: limita l\'analisi esclusivamente al diritto interno italiano (Codice Civile, Codice Penale, Costituzione e leggi speciali).'
      : 'Ambito giurisdizionale: integra l\'analisi con il diritto dell\'Unione Europea, i trattati internazionali e la giurisprudenza sovranazionale (CGUE, CEDU).'

    let systemInstruction = `${roleInstruction}\n\n${geoInstruction}\n\n${SOURCE_RULES}`

    // Context: documento caricato dall'utente (se presente)
    let documentContextStr = ''
    if (documentContext && documentName) {
      const troncato = documentContext.length > 25000
        ? documentContext.slice(0, 25000) + '\n\n[... Documento troncato per lunghezza eccessiva]'
        : documentContext
      documentContextStr = `\n\nDocumento di riferimento caricato dall'utente — "${documentName}":\n"""${troncato}"""`
      systemInstruction += documentContextStr
    }

    // RAG: indice keyword locale (se disponibile) → altrimenti Tavily
    let tavilyUsato = false
    let indiceLocaleUsato = false
    const kw = getKeywordIndex()
    if (kw.size > 0) {
      const results = kw.search(message, 8)
      if (results.length > 0) {
        const contestoRag = results
          .map((r, i) => `${i + 1}. ${r.metadata?.codice ? `[${r.metadata.codice}` : ''}${r.metadata?.articolo ? `, ${r.metadata.articolo}]` : ']'} ${r.text}`)
          .join('\n\n')
        systemInstruction += `\n\nRISULTATI RICERCA NORMATIVA (Indice locale — Codice Civile e Penale):\n${contestoRag}`
        indiceLocaleUsato = true
      }
    }
    if (!indiceLocaleUsato && TAVILY_API_KEY) {
      const tavilyResults = await searchTavily(message, soloItalia)
      if (tavilyResults && tavilyResults.length > 0) {
        const contestoRag = tavilyResults
          .map((r, i) => `${i + 1}. "${r.title}" — ${r.content.slice(0, 1500)}${r.content.length > 1500 ? '…' : ''} (fonte: ${r.url})`)
          .join('\n\n')
        systemInstruction += `\n\nRISULTATI RICERCA NORMATIVA:\n${contestoRag}`
        tavilyUsato = true
      }
    }

    // Schema condiviso per le risposte Gemini (generazione e rigenerazione)
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description: 'Testo completo della risposta, senza elenco fonti',
        },
        fonti: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nome: {
                type: Type.STRING,
                description: 'Descrizione sintetica della fonte (es. "Art. 2043 c.c.", "Cass. civ. sent. n. 1234/2019", "TFUE art. 18")',
              },
              sito: {
                type: Type.STRING,
                enum: ['normattiva.it', 'gazzettaufficiale.it', 'italgiure.giustizia.it', 'eur-lex.europa.eu'],
                description: 'Dominio del portale da cui la fonte proviene, scelto dalla tabella di routing nel system prompt',
              },
            },
            required: ['nome', 'sito'],
          },
          description: 'Fonti normative, giurisprudenziali o dottrinali utilizzate',
        },
      },
      required: ['text', 'fonti'],
    }

    // Funzione che genera una risposta con Gemini (riusata per generazione e rigenerazione)
    const sleep = (ms) => new Promise(r => setTimeout(r, ms))

    // Fallback a provider alternativi (Groq → OpenRouter) quando Gemini ha quota esaurita
    const tryFallback = async (userText, historyMessages = [], additionalContext = '') => {
      const recentMessages = historyMessages.slice(-MAX_CONTEXT_MESSAGES)
      const endpoints = []
      if (GROQ_API_KEY) endpoints.push({ name: 'Groq', url: GROQ_ENDPOINT, key: GROQ_API_KEY, model: GROQ_FALLBACK_MODEL })
      if (process.env.NVIDIA_API_KEY) endpoints.push({ name: 'NVIDIA', url: 'https://integrate.api.nvidia.com/v1/chat/completions', key: process.env.NVIDIA_API_KEY, model: 'meta/llama-3.1-70b-instruct' })
      if (process.env.OPENROUTER_API_KEY) {
        const OR_BASE = { url: 'https://openrouter.ai/api/v1/chat/completions', key: process.env.OPENROUTER_API_KEY }
        const OR_MODELS = [
          'meta-llama/llama-3.1-8b-instruct',
          'qwen/qwen-2.5-7b-instruct',
          'meta-llama/llama-3.2-3b-instruct',
          'deepseek/deepseek-chat',
        ]
        for (const model of OR_MODELS) {
          endpoints.push({ name: `OpenRouter:${model}`, ...OR_BASE, model })
        }
      }

      if (endpoints.length === 0) return null

      const msgs = [{ role: 'system', content: systemInstruction }]
      for (const msg of recentMessages) {
        const role = msg.role === 'assistant' ? 'assistant' : 'user'
        if (msg.text) msgs.push({ role, content: msg.text })
      }
      const userPrompt = additionalContext
        ? `${userText}\n\n---\nNOTA PER LA RIGENERAZIONE: il validatore ha rilevato i seguenti problemi nella tua prima risposta. Riscrivi la risposta tenendone conto e producendo lo stesso schema JSON richiesto.\n\n${additionalContext}`
        : userText
      msgs.push({ role: 'user', content: userPrompt })

      for (const ep of endpoints) {
        try {
          console.log(`[IusMente/Fallback] provo ${ep.name} con ${ep.model}`)
          const res = await fetch(ep.url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${ep.key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: ep.model,
              messages: msgs,
              temperature: isTutor ? 0.75 : 0.15,
              response_format: { type: 'json_object' },
            }),
          })
          if (res.ok) {
            const data = await res.json()
            const content = data?.choices?.[0]?.message?.content
            if (content) {
              console.log(`[IusMente/Fallback] ${ep.name} ha risposto`)
              return { text: content, _fallbackModel: ep.name }
            }
          } else {
            const errBody = await res.text()
            console.warn(`[IusMente/Fallback] ${ep.name} errore ${res.status}: ${errBody.slice(0, 200)}`)
          }
        } catch (err) {
          console.warn(`[IusMente/Fallback] ${ep.name} eccezione:`, err.message)
        }
      }
      return null
    }

    const callGemini = async (userText, historyMessages = [], additionalContext = '') => {
      const recentMessages = historyMessages.slice(-MAX_CONTEXT_MESSAGES)

      // Build full conversation history for Gemini
      const contents = []

      // Add previous messages (conversation history)
      for (const msg of recentMessages) {
        const role = msg.role === 'assistant' ? 'model' : 'user'
        if (msg.text) {
          contents.push({
            role,
            parts: [{ text: msg.text }],
          })
        }
      }

      // Add current user message (with optional regeneration context)
      const userPrompt = additionalContext
        ? `${userText}\n\n---\nNOTA PER LA RIGENERAZIONE: il validatore ha rilevato i seguenti problemi nella tua prima risposta. Riscrivi la risposta tenendone conto e producendo lo stesso schema JSON richiesto.\n\n${additionalContext}`
        : userText

      contents.push({
        role: 'user',
        parts: [{ text: userPrompt }],
      })

      const MAX_RETRY = 2
      for (let tentativo = 0; tentativo <= MAX_RETRY; tentativo++) {
        try {
          const res = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: isTutor ? 0.75 : 0.15,
              topP: isTutor ? 0.95 : 0.85,
              responseMimeType: 'application/json',
              responseSchema,
            },
          })
          return res
        } catch (err) {
          const status = err?.status ?? err?.code
          const msg = String(err?.message ?? '')
          const isQuotaExhausted = status === 429 || status === 8 || err?.code === 8 || /quota|exceeded|RESOURCE_EXHAUSTED/i.test(msg)
          const isRetriable = status === 503 || (status === 429 && !isQuotaExhausted)
          if (isRetriable && tentativo < MAX_RETRY) {
            const delay = 800 * Math.pow(2, tentativo)
            console.warn(`[IusMente/Gemini] tentativo ${tentativo + 1} fallito (status=${status}), riprovo tra ${delay}ms`)
            await sleep(delay)
            continue
          }
          // Quota esaurita → tenta fallback
          const isQuota = isQuotaExhausted
          if (isQuota) {
            const fallbackResult = await tryFallback(userText, historyMessages, additionalContext)
            if (fallbackResult) return fallbackResult
          }
          throw err
        }
      }
    }

    // Generazione iniziale
    const response = await callGemini(message, messages)
    const modelloGeneratore = response._fallbackModel || 'Gemini 3.1 Flash-Lite'
    const raw = response.candidates?.[0]?.content?.parts?.[0]?.text ?? response.text ?? ''

    // Parsing iniziale — resiliente a campi con nomi diversi (Gemini vs fallback Groq/OpenRouter)
    let parsed = null
    let text = raw
    let fonti = [{ nome: 'Fonte non specificata', sito: 'normattiva.it' }]
    try {
      parsed = JSON.parse(raw)
      text = parsed.text || parsed.risposta || parsed.answer || parsed.content || parsed.response || JSON.stringify(parsed)
      const fontiRaw = parsed.fonti || parsed.sorgenti || parsed.sources || parsed.riferimenti || []
      if (Array.isArray(fontiRaw) && fontiRaw.length > 0) {
        fonti = fontiRaw
      }
    } catch {
      console.warn('Risposta non JSON, uso testo grezzo')
    }
    const fontiNormalizzate = normalizzaFonti(fonti)

    // Validazione con Groq (Llama 3.3 70B) — saltata se la risposta viene già da fallback
    let validazione = { valido: true, problemi: [], testo_revisionato: null, confidenza: null, skipped: false }
    if (response._fallbackModel) {
      console.log(`[IusMente/Groq] validazione saltata: risposta generata da ${response._fallbackModel}`)
      validazione = { valido: true, problemi: [], testo_revisionato: null, confidenza: null, skipped: true }
    } else if (GROQ_API_KEY) {
      try {
        validazione = await validaConGroq({ message, text, fonti: fontiNormalizzate, soloItalia, isTutor })
        console.log(`[IusMente/Groq] valido=${validazione.valido}, problemi=${validazione.problemi?.length || 0}, confidenza=${validazione.confidenza}`)
      } catch (err) {
        console.error('[IusMente/Groq] validatore fallito, procedo senza:', err.message)
        validazione = { valido: true, problemi: [], testo_revisionato: null, confidenza: null, skipped: true }
      }
    } else {
      console.warn('[IusMente/Groq] GROQ_API_KEY mancante, validazione disabilitata')
    }

    // Se la validazione ha rilevato problemi, rigenera con Gemini passando le note
    let rigenerato = false
    let testoFinale = text
    let fontiFinali = fontiNormalizzate
    if (!validazione.valido && validazione.problemi?.length > 0) {
      try {
        const contestoProblemi = validazione.problemi.map((p, i) => `${i + 1}. ${p}`).join('\n')
        const response2 = await callGemini(message, messages, contestoProblemi)
        const raw2 = response2.candidates?.[0]?.content?.parts?.[0]?.text ?? response2.text ?? ''
        try {
          const parsed2 = JSON.parse(raw2)
          testoFinale = parsed2.text || parsed2.risposta || parsed2.answer || parsed2.content || parsed2.response || JSON.stringify(parsed2)
          const fontiRaw2 = parsed2.fonti || parsed2.sorgenti || parsed2.sources || parsed2.riferimenti || []
          if (Array.isArray(fontiRaw2) && fontiRaw2.length > 0) {
            fontiFinali = normalizzaFonti(fontiRaw2)
          }
          rigenerato = true
          console.log('[IusMente] risposta rigenerata dopo feedback validatore')
        } catch {
          console.warn('[IusMente] rigenerazione non JSON, mantengo risposta originale')
        }
      } catch (err) {
        console.error('[IusMente] rigenerazione fallita:', err.message)
      }
    }

    return NextResponse.json({
      text: testoFinale,
      modalita: isTutor ? 'tutor' : 'professore',
      fonti: fontiFinali,
      modelli: {
        tavily: tavilyUsato,
        indiceLocale: indiceLocaleUsato,
        generatore: modelloGeneratore,
        validatore: GROQ_API_KEY ? `Groq ${GROQ_MODEL}` : 'non attivo',
        rigenerato,
      },
      validazione: {
        eseguita: !!GROQ_API_KEY && !validazione.skipped,
        valido: validazione.valido,
        problemi: validazione.problemi || [],
        confidenza: validazione.confidenza,
        skipped: validazione.skipped,
      },
    })

  } catch (error) {
    console.error("Errore nel backend di IusMente:", error);
    const status = error?.status ?? error?.code
    const msg = String(error?.message ?? '')

    if (status === 429 || status === 8 || /quota|exceeded|RESOURCE_EXHAUSTED/i.test(msg)) {
      const haFallback = !!(GROQ_API_KEY || process.env.OPENROUTER_API_KEY)
      return NextResponse.json(
        {
          error: 'Quota esaurita',
          detail: haFallback
            ? 'Tutti i provider di generazione hanno esaurito la quota. Riprova domani o verifica le chiavi API.'
            : 'Hai superato il limite giornaliero di richieste del piano gratuito Gemini. Configura GROQ_API_KEY e/o OPENROUTER_API_KEY nel file .env.local per abilitare il fallback automatico, oppure riprova domani.',
        },
        { status: 429 }
      )
    }
    if (status === 503 || /UNAVAILABLE|high demand/i.test(msg)) {
      return NextResponse.json(
        {
          error: 'Servizio temporaneamente sovraccarico',
          detail: 'Il modello sta ricevendo molte richieste. Riprova tra qualche secondo.',
        },
        { status: 503 }
      )
    }
    if (status === 401 || /API key|unauthenticated|PERMISSION_DENIED/i.test(msg)) {
      return NextResponse.json(
        {
          error: 'Chiave API non valida',
          detail: 'GEMINI_API_KEY mancante o errata. Controlla il file .env.local.',
        },
        { status: 401 }
      )
    }
    if (status === 400 || /safety|blocked|invalid/i.test(msg)) {
      return NextResponse.json(
        {
          error: 'Richiesta rifiutata',
          detail: 'La richiesta è stata bloccata dai filtri di sicurezza o non è valida. Prova a riformulare.',
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Errore durante la generazione della risposta.', detail: msg.slice(0, 200) },
      { status: 500 }
    )
  }
}

// --- Helper functions (fuori dal try/catch del POST) ---

const SITES_AMMESSI = new Set(['normattiva.it', 'gazzettaufficiale.it', 'italgiure.giustizia.it', 'eur-lex.europa.eu'])

function normalizzaFonti(fonti) {
  if (!Array.isArray(fonti) || fonti.length === 0) return []
  return fonti
    .map((f) => {
      if (typeof f === 'string' && f.trim()) {
        return { nome: f.trim(), sito: 'normattiva.it' }
      }
      if (f && typeof f === 'object' && typeof f.nome === 'string' && f.nome.trim()) {
        const sito = SITES_AMMESSI.has(f.sito) ? f.sito : 'normattiva.it'
        return { nome: f.nome.trim(), sito }
      }
      return null
    })
    .filter(Boolean)
}

// Validatore: Groq (Llama 3.3 70B) verifica la risposta di Gemini per ridurre allucinazioni.
// Restituisce { valido, problemi, confidenza, testo_revisionato }.
async function validaConGroq({ message, text, fonti, soloItalia, isTutor }) {
  const promptValidatore = `Sei un revisore esperto di diritto italiano ed europeo. Il tuo compito è verificare se la risposta generata di seguito è accurata, coerente con le fonti citate e priva di affermazioni inventate (allucinazioni).

DOMANDA ORIGINALE DELLO STUDENTE:
"""${message}"""

RISPOSTA GENERATA:
"""${text}"""

FONTI CITATE NELLA RISPOSTA:
${fonti.map(f => `- ${f.nome} (${f.sito})`).join('\n')}

CONTESTO: modalità ${isTutor ? 'Tutor (didattica)' : 'Professore (formale)'}, ambito ${soloItalia ? 'solo Italia' : 'Italia + UE/internazionale'}.

Controlla in particolare:
1. Le fonti citate esistono davvero (articoli di legge con numero corretto, sentenze con numero/anno plausibili).
2. Le affermazioni giuridiche corrispondono al contenuto noto delle fonti.
3. Non ci sono riferimenti normativi inventati o numeri palesemente falsi.
4. La risposta è coerente con l'ambito giurisdizionale (${soloItalia ? 'no diritto UE' : 'include diritto UE'}).

Rispondi SOLO con un JSON valido in questo formato:
{
  "valido": true | false,
  "problemi": ["...eventuali problemi rilevati, in italiano, una stringa per problema..."],
  "confidenza": 0.0-1.0
}

Se la risposta è corretta e ben fondata, "valido": true e "problemi": [].
Se rilevi problemi, "valido": false e descrivi ciascun problema in "problemi" in modo sintetico e azionabile (es. "Art. 1453 c.c. citato ma il contenuto descritto è quello dell'art. 1455", oppure "Sentenza Cass. n. 1234/2019 inesistente: il formato non corrisponde a una sentenza reale").`

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Sei un revisore giuridico rigoroso. Rispondi solo con JSON valido.',
        },
        { role: 'user', content: promptValidatore },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Groq API ${res.status}: ${errBody.slice(0, 200)}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('Groq risposta vuota')

  const parsed = JSON.parse(content)
  return {
    valido: parsed.valido === true,
    problemi: Array.isArray(parsed.problemi) ? parsed.problemi : [],
    confidenza: typeof parsed.confidenza === 'number' ? parsed.confidenza : null,
  }
}