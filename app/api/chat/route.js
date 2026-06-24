import { NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY mancante nelle variabili d\'ambiente')
}
const ai = new GoogleGenAI({ apiKey: apiKey || 'missing-key' })

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free'
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

// Tavily: ricerca web in tempo reale usata come RAG per ancorare le risposte
// a fonti normative italiane aggiornate (Normattiva, Gazzetta Ufficiale, Italgiure).
const TAVILY_API_KEY = process.env.TAVILY_API_KEY
const TAVILY_ENDPOINT = 'https://api.tavily.com/search'
const TAVILY_DOMINI_IT = [
  'normattiva.it',
  'gazzettaufficiale.it',
  'italgiure.giustizia.it',
]
const TAVILY_MAX_RESULTS = 4
const TAVILY_TIMEOUT_MS = 8000

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
- VIETATO usare siti diversi dai quattro elencati.`

const FORMATO_OUTPUT = `
FORMATO OUTPUT JSON — OBBLIGATORIO:
La risposta DEVE essere un oggetto JSON con questa struttura esatta:
{
  "text": "Il testo completo della risposta in italiano. Non includere qui le fonti.",
  "fonti": [
    { "nome": "Art. 2043 c.c.", "sito": "normattiva.it" },
    { "nome": "Art. 54 Cost.", "sito": "normattiva.it" }
  ]
}
- "text": stringa obbligatoria — la risposta vera e propria.
- "fonti": array obbligatorio di oggetti { "nome": string, "sito": string } — almeno 1 voce.
- "sito" deve essere uno tra: normattiva.it, gazzettaufficiale.it, italgiure.giustizia.it, eur-lex.europa.eu`

export async function POST(req) {
  try {
    const { message, messages: previousMessages, soloItalia, modalitaTutor, documentContext, documentName } = await req.json();

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

    // RAG: ricerca normativa italiana su Tavily (solo se soloItalia e messaggio significativo)
    let contestoRAG = ''
    let tavilyMeta = { eseguita: false, motivo: 'non_attivo', numRisultati: 0 }
    if (soloItalia && message.trim().length >= 20 && TAVILY_API_KEY) {
      const ricerca = await ricercaTavily(message)
      tavilyMeta = {
        eseguita: ricerca.eseguita,
        motivo: ricerca.motivo,
        numRisultati: ricerca.risultati.length,
      }
      if (ricerca.risultati.length > 0) {
        contestoRAG = contestoTavilyPerPrompt(ricerca.risultati)
        console.log(`[IusMente/Tavily] RAG attivo, ${ricerca.risultati.length} risultati iniettati nel prompt`)
      }
    } else if (soloItalia && message.trim().length < 20) {
      tavilyMeta = { eseguita: false, motivo: 'messaggio_troppo_corto', numRisultati: 0 }
    } else if (!soloItalia) {
      tavilyMeta = { eseguita: false, motivo: 'ambito_ue', numRisultati: 0 }
    } else {
      tavilyMeta = { eseguita: false, motivo: 'api_key_mancante', numRisultati: 0 }
    }

    const documentInstruction = documentContext && documentName
      ? `\n\nDOCUMENTO ALLEGATO ("${documentName}"):\nL'utente ha allegato il seguente documento. Usalo come contesto primario per rispondere alle domande che lo riguardano. Se la domanda non è pertinente al documento, rispondi comunque con le tue conoscenze giuridiche.\n\n--- INIZIO DOCUMENTO ---\n${documentContext}\n--- FINE DOCUMENTO ---`
      : ''

    const systemInstruction = `${roleInstruction}\n\n${geoInstruction}${documentInstruction}\n\n${SOURCE_RULES}${FORMATO_OUTPUT}${contestoRAG}`

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

    // Funzione che costruisce i contenuti multi-turn per Gemini e invoca il modello
    const sleep = (ms) => new Promise(r => setTimeout(r, ms))
    const buildContents = (prevMessages, currentMessage, additionalContext = '') => {
      const history = (prevMessages || []).slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }],
      }))
      const userPrompt = additionalContext
        ? `${currentMessage}\n\n---\nNOTA PER LA RIGENERAZIONE: il validatore ha rilevato i seguenti problemi nella tua prima risposta. Riscrivi la risposta tenendone conto e producendo lo stesso schema JSON richiesto.\n\n${additionalContext}`
        : currentMessage
      return [...history, { role: 'user', parts: [{ text: userPrompt }] }]
    }

    const callGemini = async (prevMessages, currentMessage, additionalContext = '') => {
      const contents = buildContents(prevMessages, currentMessage, additionalContext)
      const MAX_RETRY = 5
      let lastErr
      for (let tentativo = 0; tentativo <= MAX_RETRY; tentativo++) {
        try {
          const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: isTutor ? 0.75 : 0.15,
              topP: isTutor ? 0.95 : 0.85,
              responseMimeType: 'application/json',
              responseSchema,
            },
          })
          return { response: res, retryCount: tentativo }
        } catch (err) {
          lastErr = err
          const status = err?.status ?? err?.code
          const msg = String(err?.message ?? '')
          const isRetriable = status === 503 || (status === 429 && !/quota|exceeded|RESOURCE_EXHAUSTED/i.test(msg))
          if (!isRetriable || tentativo === MAX_RETRY) throw err
          const delay = Math.min(1000 * Math.pow(2, tentativo) + Math.random() * 1000, 15000)
          console.warn(`[IusMente/Gemini] tentativo ${tentativo + 1} fallito (status=${status}), riprovo tra ${Math.round(delay)}ms`)
          await sleep(delay)
        }
      }
      throw lastErr
    }

    const callGroq = async (prevMessages, currentMessage, additionalContext = '') => {
      const history = (prevMessages || []).slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text,
      }))
      const userPrompt = additionalContext
        ? `${currentMessage}\n\n---\nNOTA PER LA RIGENERAZIONE: il validatore ha rilevato i seguenti problemi nella tua prima risposta. Riscrivi la risposta tenendone conto e producendo lo stesso schema JSON richiesto.\n\n${additionalContext}`
        : currentMessage
      const MAX_RETRY = 2
      let lastErr
      for (let tentativo = 0; tentativo <= MAX_RETRY; tentativo++) {
        try {
          const res = await fetch(GROQ_ENDPOINT, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: GROQ_MODEL,
              messages: [
                { role: 'system', content: systemInstruction },
                ...history,
                { role: 'user', content: userPrompt },
              ],
              temperature: isTutor ? 0.75 : 0.15,
              response_format: { type: 'json_object' },
            }),
          })
          if (!res.ok) {
            const errBody = await res.text()
            throw Object.assign(new Error(`Groq ${res.status}: ${errBody.slice(0, 200)}`), { status: res.status })
          }
          const data = await res.json()
          const text = data?.choices?.[0]?.message?.content || ''
          return {
            response: {
              candidates: [{ content: { parts: [{ text }] } }],
              text,
            },
            retryCount: tentativo,
          }
        } catch (err) {
          lastErr = err
          const isRetriable = err?.status === 503
          if (!isRetriable || tentativo === MAX_RETRY) throw err
          const delay = Math.min(1000 * Math.pow(2, tentativo) + Math.random() * 500, 8000)
          console.warn(`[IusMente/Groq] tentativo ${tentativo + 1} fallito (status=${err?.status}), riprovo tra ${Math.round(delay)}ms`)
          await sleep(delay)
        }
      }
      throw lastErr
    }

    const callOpenRouter = async (prevMessages, currentMessage, additionalContext = '') => {
      const history = (prevMessages || []).slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text,
      }))
      const userPrompt = additionalContext
        ? `${currentMessage}\n\n---\nNOTA PER LA RIGENERAZIONE: il validatore ha rilevato i seguenti problemi nella tua prima risposta. Riscrivi la risposta tenendone conto e producendo lo stesso schema JSON richiesto.\n\n${additionalContext}`
        : currentMessage
      const MAX_RETRY = 2
      let lastErr
      for (let tentativo = 0; tentativo <= MAX_RETRY; tentativo++) {
        try {
          const res = await fetch(OPENROUTER_ENDPOINT, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://iusmente.app',
              'X-Title': 'IusMente',
            },
            body: JSON.stringify({
              model: OPENROUTER_MODEL,
              messages: [
                { role: 'system', content: systemInstruction },
                ...history,
                { role: 'user', content: userPrompt },
              ],
              temperature: isTutor ? 0.75 : 0.15,
              response_format: { type: 'json_object' },
            }),
          })
          if (!res.ok) {
            const errBody = await res.text()
            throw Object.assign(new Error(`OpenRouter ${res.status}: ${errBody.slice(0, 200)}`), { status: res.status })
          }
          const data = await res.json()
          const text = data?.choices?.[0]?.message?.content || ''
          return {
            response: {
              candidates: [{ content: { parts: [{ text }] } }],
              text,
            },
            retryCount: tentativo,
          }
        } catch (err) {
          lastErr = err
          const isRetriable = err?.status === 503
          if (!isRetriable || tentativo === MAX_RETRY) throw err
          const delay = Math.min(1000 * Math.pow(2, tentativo) + Math.random() * 500, 8000)
          console.warn(`[IusMente/OpenRouter] tentativo ${tentativo + 1} fallito (status=${err?.status}), riprovo tra ${Math.round(delay)}ms`)
          await sleep(delay)
        }
      }
      throw lastErr
    }

    const isQuotaError = (err) => {
      const status = err?.status ?? err?.code
      const msg = String(err?.message ?? '')
      return status === 429 || /quota|exceeded|RESOURCE_EXHAUSTED/i.test(msg)
    }

    const callModello = async (prevMessages, currentMessage, additionalContext = '') => {
      // 1. Prova Gemini
      try {
        const result = await callGemini(prevMessages, currentMessage, additionalContext)
        return { ...result, modello: 'Gemini 2.5 Flash-Lite' }
      } catch (err) {
        if (!isQuotaError(err)) throw err
      }
      // 2. Quota Gemini esaurita → prova Groq
      if (GROQ_API_KEY) {
        try {
          console.warn('[IusMente] Quota Gemini esaurita, fallback su Groq')
          const result = await callGroq(prevMessages, currentMessage, additionalContext)
          return { ...result, modello: `Groq ${GROQ_MODEL} (fallback quota Gemini)` }
        } catch (err) {
          if (!isQuotaError(err)) throw err
        }
      }
      // 3. Anche Groq esaurito → ultima spiaggia: OpenRouter
      if (OPENROUTER_API_KEY) {
        console.warn('[IusMente] Quota Gemini e Groq esaurite, fallback su OpenRouter')
        const result = await callOpenRouter(prevMessages, currentMessage, additionalContext)
        return { ...result, modello: `OpenRouter ${OPENROUTER_MODEL} (fallback estremo)` }
      }
      throw new Error('Tutti i modelli AI gratuiti hanno esaurito la quota')
    }

    // Generazione iniziale con cronologia
    const { response: geminiRes, retryCount: retryCount1, modello: modelloGeneratore } = await callModello(previousMessages, message)
    const raw = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text ?? geminiRes.text ?? ''

    // Parsing iniziale
    let parsed = null
    let text = raw
    let fonti = [{ nome: 'Fonte non specificata', sito: 'normattiva.it' }]
    try {
      parsed = JSON.parse(raw)
      if (parsed.text) text = parsed.text
      if (Array.isArray(parsed.fonti) && parsed.fonti.length > 0) {
        fonti = parsed.fonti
      }
    } catch {
      console.warn('Risposta Gemini non JSON, uso testo grezzo')
    }
    const fontiNormalizzate = normalizzaFonti(fonti)

    // Validazione con Groq (Llama 3.3 70B)
    let validazione = { valido: true, problemi: [], testo_revisionato: null, confidenza: null, skipped: false }
    if (GROQ_API_KEY) {
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
    const primaChiamataProblematica = retryCount1 > 0
    if (primaChiamataProblematica) {
      console.log(`[IusMente] prima chiamata ha ritentato ${retryCount1} volte, salto rigenerazione per non sovraccaricare`)
    }
    if (!validazione.valido && validazione.problemi?.length > 0 && !primaChiamataProblematica) {
      try {
        const contestoProblemi = validazione.problemi.map((p, i) => `${i + 1}. ${p}`).join('\n')
        const { response: response2 } = await callModello(previousMessages, message, contestoProblemi)
        const raw2 = response2.candidates?.[0]?.content?.parts?.[0]?.text ?? response2.text ?? ''
        try {
          const parsed2 = JSON.parse(raw2)
          if (parsed2.text) testoFinale = parsed2.text
          if (Array.isArray(parsed2.fonti) && parsed2.fonti.length > 0) {
            fontiFinali = normalizzaFonti(parsed2.fonti)
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
        generatore: modelloGeneratore,
        validatore: GROQ_API_KEY ? `Groq ${GROQ_MODEL}` : 'non attivo',
        rigenerato,
        tentativiGenerazione: retryCount1 + 1,
      },
      validazione: {
        eseguita: !!GROQ_API_KEY && !validazione.skipped,
        valido: validazione.valido,
        problemi: validazione.problemi || [],
        confidenza: validazione.confidenza,
        skipped: validazione.skipped,
      },
      tavily: tavilyMeta,
      documentContext: documentContext || null,
      documentName: documentName || null,
    })

  } catch (error) {
    console.error("Errore nel backend di IusMente:", error);
    const status = error?.status ?? error?.code
    const msg = String(error?.message ?? '')

    if (status === 429 || /quota|exceeded|RESOURCE_EXHAUSTED/i.test(msg)) {
      return NextResponse.json(
        {
          error: 'Quota esaurita',
          detail: 'Hai superato il limite giornaliero di richieste del piano gratuito Gemini. Riprova domani o abilita la fatturazione su ai.google.dev.',
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

// RAG: ricerca web su Tavily limitata ai domini .it normativi.
// Restituisce sempre { eseguita, motivo, risultati } — mai un throw, in modo che
// un'indisponibilità di Tavily degradi silenziosamente il flusso anziché rompere la chat.
async function ricercaTavily(query) {
  if (!TAVILY_API_KEY) {
    return { eseguita: false, motivo: 'api_key_mancante', risultati: [] }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS)

  try {
    const res = await fetch(TAVILY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        max_results: TAVILY_MAX_RESULTS,
        search_depth: 'basic', // 1 credito per query; 'advanced' ne costa 2
        topic: 'general',
        include_domains: TAVILY_DOMINI_IT,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const errBody = await res.text()
      throw new Error(`Tavily ${res.status}: ${errBody.slice(0, 200)}`)
    }
    const data = await res.json()
    const risultati = Array.isArray(data?.results) ? data.results : []
    return { eseguita: true, motivo: null, risultati }
  } catch (err) {
    clearTimeout(timeoutId)
    if (err?.name === 'AbortError') {
      console.warn('[IusMente/Tavily] timeout dopo 8s, procedo senza RAG')
      return { eseguita: false, motivo: 'timeout', risultati: [] }
    }
    console.warn('[IusMente/Tavily] errore, procedo senza RAG:', err.message)
    return { eseguita: false, motivo: 'errore', risultati: [] }
  }
}

// Formatta i risultati Tavily in un blocco di testo da appendere al systemInstruction.
// Limita la dimensione di ogni estratto per non esplodere il prompt di Gemini.
function contestoTavilyPerPrompt(risultati) {
  if (!Array.isArray(risultati) || risultati.length === 0) return ''
  const blocchi = risultati.map((r, i) => {
    const titolo = (r?.title || 'Senza titolo').slice(0, 200)
    const contenuto = (r?.content || '').slice(0, 600)
    const url = r?.url || ''
    return `[${i + 1}] ${titolo}\nURL: ${url}\nEstratto: ${contenuto}`
  })
  return `\n\nCONTESTO NORMATIVO RECUPERATO DA WEB (Tavily):
Usa i seguenti estratti come FONTE PRIMARIA per articoli di legge, commi e riferimenti normativi italiani. Cita solo ciò che trovi confermato qui sotto o che è principio consolidato. Se il contesto non copre la domanda, segnalalo onestamente.

${blocchi.join('\n\n')}`
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