import { NextResponse } from 'next/server'
import { generateResponse, generateEmbedding, getChatModel } from '../../../lib/local-llm'
import { getVectorStore } from '../../../lib/vector-store'
import { getKeywordIndex } from '../../../lib/keyword-index'

const SCORE_THRESHOLD = 0.5
const TAVILY_API_KEY = process.env.TAVILY_API_KEY

const SOURCE_RULES = `
FONTI — OBBLIGATORIO per ogni risposta:
- Identifica e elenca TUTTE le fonti giuridiche effettivamente utilizzate per formulare la risposta.
- Ogni fonte deve essere specifica e verificabile (es. "Art. 2043 c.c.", "Art. 54 Cost.").
- Includi codici, leggi speciali, sentenze rilevanti o principi dottrinali consolidati quando pertinenti.
- NON inventare riferimenti normativi inesistenti.
- Il campo "fonti" deve contenere almeno una voce.
- Il testo della risposta ("text") NON deve contenere la sezione fonti.

STRUTTURA di ogni fonte (oggetto JSON):
- "nome": testo descrittivo della fonte (es. "Art. 2043 c.c.").
- "sito": "normattiva.it"

FORAMTTAZIONE DELLA RISPOSTA (campo "text"):
- Ogni paragrafo separato da UNA RIGA VUOTA (doppio a capo).
- Usa elenchi puntati con "- " per liste di concetti, elementi, requisiti.
- Usa elenchi numerati ("1. ", "2. ", ecc.) per passaggi procedurali o sequenze.
- **Testo in grassetto** per concetti chiave, termini tecnici, articoli di legge.
- NON usare titoli o intestazioni di livello (# ## ###) — usa solo paragrafi e grassetto.`

const MAX_CONTEXT_MESSAGES = 10

export async function POST(req) {
  try {
    const { message, messages = [], modalitaTutor } = await req.json()
    if (!message) {
      return NextResponse.json({ error: 'Messaggio vuoto' }, { status: 400 })
    }

    const store = getVectorStore()
    const kw = getKeywordIndex()

    // Se non c'è né vector store né keyword index, mostra errore
    if (store.size === 0 && kw.size === 0) {
      return NextResponse.json({
        text: 'Nessun indice locale trovato. Vai su **Impostazioni → Modalità elaborazione** e clicca **"Scarica e indicizza codici"** per scaricare il Codice Civile e il Codice Penale.',
        modalita: modalitaTutor !== false ? 'tutor' : 'professore',
        fonti: [],
        modelli: { generatore: 'Locale (nessun indice)', validatore: 'non attivo', tavily: false, rigenerato: false },
        validazione: { eseguita: false, valido: true, problemi: [], confidenza: null, skipped: true },
      })
    }

    const isTutor = modalitaTutor !== false
    const useVector = store.size > 0

    // Ricerca unica nell'indice locale
    const searchResults = useVector
      ? store.search(await generateEmbedding(message), 8)
      : kw.search(message, 8)

    const localePertinente = searchResults.length > 0 && searchResults[0].score >= SCORE_THRESHOLD
    let contesto, fontiLocali
    if (localePertinente) {
      contesto = searchResults
        .map((r, i) => `[FONTE ${i + 1}] ${r.metadata?.codice ? `(${r.metadata.codice}` : ''}${r.metadata?.articolo ? `, ${r.metadata.articolo})` : ')'}\n${r.text}`)
        .join('\n\n')
      fontiLocali = [{ nome: useVector ? 'Ricerca vettoriale locale' : 'Ricerca keyword locale', sito: 'normattiva.it' }]
    }

    const roleInstruction = isTutor
      ? `Sei "IusMente Tutor", un mentore giuridico dedicato agli studenti universitari. Rispondi SEMPRE in modalità Tutor — amichevole, empatica e orientata all'apprendimento. Usa il "tu", spiega in modo chiaro, fai esempi.`
      : `Sei "IusMente Professore", un docente universitario in sede d'esame. Rispondi SEMPRE in modalità Professore — massima formalità, rigore e precisione tecnica. Usa il "Lei" o formule impersonali.`

    let systemPrompt
    if (localePertinente) {
      systemPrompt = `${roleInstruction}\n\n${SOURCE_RULES}\n\nSei in modalità OFFLINE. Hai a disposizione i seguenti estratti dal Codice Civile e dal Codice Penale italiani per rispondere alla domanda dello studente. Usa SOLO queste informazioni per formulare la risposta. Se le informazioni disponibili non sono sufficienti per rispondere in modo completo, dillo onestamente allo studente.\n\nCONTESTO NORMATIVO:\n${contesto}`
    }

    const recentMessages = (messages || []).slice(-MAX_CONTEXT_MESSAGES)
    const ollamaMessages = recentMessages.concat([{ role: 'user', text: message }])

    let responseText
    let generatoreUsato

    if (localePertinente) {
      // Indice locale ha risultati → prova Ollama, fallback Gemini con contesto
      try {
        responseText = await generateResponse(systemPrompt, ollamaMessages, { temperature: isTutor ? 0.5 : 0.15 })
        generatoreUsato = `Locale (${getChatModel()})`
      } catch (ollamaErr) {
        console.error('[IusMente/Locale] Ollama non raggiungibile:', ollamaErr.message)
        const geminiKey = process.env.GEMINI_API_KEY
        if (!geminiKey) {
          return NextResponse.json({
            text: 'Ollama non raggiungibile e nessuna chiave Gemini configurata per il fallback. Avvia Ollama con `ollama serve` o passa alla modalità Online.',
            modalita: isTutor ? 'tutor' : 'professore',
            fonti: fontiLocali,
            modelli: { tavily: false, generatore: 'Non disponibile', validatore: 'non attivo', rigenerato: false },
            validazione: { eseguita: false, valido: true, problemi: [], confidenza: null, skipped: true },
          })
        }
        try {
          const { GoogleGenAI, Type } = await import('@google/genai')
          const ai = new GoogleGenAI({ apiKey: geminiKey })
          const res = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: [{ role: 'user', parts: [{ text: message }] }],
            config: {
              systemInstruction: systemPrompt,
              temperature: isTutor ? 0.5 : 0.15,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  fonti: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { nome: { type: Type.STRING }, sito: { type: Type.STRING } }, required: ['nome', 'sito'] } },
                },
                required: ['text', 'fonti'],
              },
            },
          })
          responseText = res.candidates?.[0]?.content?.parts?.[0]?.text || ''
          generatoreUsato = 'Gemini 3.1 Flash-Lite (fallback, indice locale)'
        } catch (geminiErr) {
          console.error('[IusMente/Locale] Ollama+Gemini fallito:', geminiErr.message)
          return NextResponse.json({
            text: 'Ollama non raggiungibile e fallback Gemini fallito. Verifica le chiavi API o riprova più tardi.',
            modalita: isTutor ? 'tutor' : 'professore',
            fonti: fontiLocali,
            modelli: { tavily: false, generatore: 'Non disponibile', validatore: 'non attivo', rigenerato: false },
            validazione: { eseguita: false, valido: true, problemi: [], confidenza: null, skipped: true },
          })
        }
      }
    } else {
      // Indice locale non pertinente → usa Gemini cloud con ricerca Tavily
      const geminiKey = process.env.GEMINI_API_KEY
      if (!geminiKey) {
        return NextResponse.json({
          text: `La domanda non riguarda il Codice Civile o Penale (nessun risultato nell'indice locale) e non c'è una chiave Gemini configurata per il fallback cloud. Passa alla modalità **Online** o configura GEMINI_API_KEY.`,
          modalita: isTutor ? 'tutor' : 'professore',
          fonti: [],
          modelli: { tavily: false, generatore: 'Non disponibile', validatore: 'non attivo', rigenerato: false },
          validazione: { eseguita: false, valido: true, problemi: [], confidenza: null, skipped: true },
        })
      }

      // Prova a cercare su Tavily per arricchire il contesto cloud
      let tavilyContext = ''
      if (TAVILY_API_KEY) {
        try {
          const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: TAVILY_API_KEY, query: message, search_depth: 'advanced', include_domains: ['normattiva.it', 'gazzettaufficiale.it', 'italgiure.giustizia.it'], max_results: 5 }),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.results?.length > 0) {
              tavilyContext = '\n\nRISULTATI RICERCA NORMATIVA:\n' + data.results.map((r, i) => `${i + 1}. "${r.title}" — ${r.content.slice(0, 1500)} (fonte: ${r.url})`).join('\n\n')
            }
          }
        } catch {}
      }

      const systemPromptCloud = `${roleInstruction}\n\n${SOURCE_RULES}\n\nLa domanda dello studente esula dal Codice Civile e Penale scaricato localmente. Rispondi usando le tue conoscenze giuridiche generali.${tavilyContext}`

      try {
        const { GoogleGenAI, Type } = await import('@google/genai')
        const ai = new GoogleGenAI({ apiKey: geminiKey })
        const res = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: [{ role: 'user', parts: [{ text: message }] }],
          config: {
            systemInstruction: systemPromptCloud,
            temperature: isTutor ? 0.5 : 0.15,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                fonti: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { nome: { type: Type.STRING }, sito: { type: Type.STRING } }, required: ['nome', 'sito'] } },
              },
              required: ['text', 'fonti'],
            },
          },
        })
        responseText = res.candidates?.[0]?.content?.parts?.[0]?.text || ''
        generatoreUsato = tavilyContext ? 'Gemini 3.1 Flash-Lite + Tavily (switch automatico da Locale)' : 'Gemini 3.1 Flash-Lite (switch automatico da Locale)'
        fontiLocali = [{ nome: 'Ricerca cloud (domanda fuori dall\'indice locale)', sito: 'normattiva.it' }]
      } catch (geminiErr) {
        console.error('[IusMente/Locale] Fallback cloud fallito:', geminiErr.message)
        return NextResponse.json({
          text: 'La domanda non riguarda il Codice Civile o Penale e il fallback cloud Gemini è fallito. Verifica la connessione o riprova più tardi.',
          modalita: isTutor ? 'tutor' : 'professore',
          fonti: [],
          modelli: { tavily: false, generatore: 'Non disponibile', validatore: 'non attivo', rigenerato: false },
          validazione: { eseguita: false, valido: true, problemi: [], confidenza: null, skipped: true },
        })
      }
    }

    let parsed = null
    let text = responseText
    let fonti = [{ nome: 'Fonte non specificata', sito: 'normattiva.it' }]
    try {
      parsed = JSON.parse(responseText)
      text = parsed.text || parsed.risposta || parsed.answer || parsed.content || JSON.stringify(parsed)
      const fontiRaw = parsed.fonti || parsed.sorgenti || parsed.sources || []
      if (Array.isArray(fontiRaw) && fontiRaw.length > 0) {
        fonti = fontiRaw.map(f => {
          if (typeof f === 'string') return { nome: f.trim(), sito: 'normattiva.it' }
          if (f && typeof f === 'object' && f.nome) return { nome: f.nome.trim(), sito: f.sito || 'normattiva.it' }
          return null
        }).filter(Boolean)
      }
    } catch {
      // Response is plain text, use it as-is
    }

    if (!fonti || fonti.length === 0) {
      fonti = fontiLocali
    }

    const fontiNormalizzate = fonti.map(f => ({
      nome: f.nome || 'Fonte non specificata',
      sito: ['normattiva.it', 'gazzettaufficiale.it', 'italgiure.giustizia.it', 'eur-lex.europa.eu'].includes(f.sito) ? f.sito : 'normattiva.it',
    }))

    return NextResponse.json({
      text,
      modalita: isTutor ? 'tutor' : 'professore',
      fonti: fontiNormalizzate,
      modelli: {
        tavily: false,
        generatore: generatoreUsato,
        validatore: 'non attivo',
        rigenerato: false,
      },
      validazione: {
        eseguita: false,
        valido: true,
        problemi: [],
        confidenza: null,
        skipped: true,
      },
    })

  } catch (error) {
    console.error('[IusMente/Locale] errore:', error)
    return NextResponse.json(
      { error: 'Errore nella modalità locale', detail: 'Errore interno del server. Controlla i log per maggiori dettagli.' },
      { status: 500 }
    )
  }
}
