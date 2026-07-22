import { NextResponse } from 'next/server'
import { checkOllama, generateEmbedding } from '../../../lib/local-llm'
import { getVectorStore, deleteVectorStore } from '../../../lib/vector-store'
import { getKeywordIndex, deleteKeywordIndex } from '../../../lib/keyword-index'
import { chunkText } from '../../../lib/chunk'

const NORMATTIVA_BASE = 'https://www.normattiva.it/uri-res/N2Ls'

const CODICI = [
  {
    id: 'codice-civile',
    nome: 'Codice Civile',
    urn: 'urn:nir:stato:regio.decreto:1942-03-16;262',
  },
  {
    id: 'codice-penale',
    nome: 'Codice Penale',
    urn: 'urn:nir:stato:regio.decreto:1930-10-19;1398',
  },
]

function htmlToText(html) {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
  return text
}

async function fetchCodice(codice) {
  const url = `${NORMATTIVA_BASE}?urn=${codice.urn}!vig=`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IusMente/1.0)' },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} scaricando ${codice.nome}`)
  const html = await res.text()
  if (html.length < 1000) throw new Error(`Risposta troppo corta (${html.length} byte) per ${codice.nome}`)
  return htmlToText(html)
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('check') === '1') {
    const kw = getKeywordIndex()
    const store = getVectorStore()
    const ollama = await checkOllama().catch(() => ({ available: false, error: 'Ollama non raggiungibile' }))
    return NextResponse.json({
      keywordIndex: kw.size > 0 ? { initialized: true, info: kw.info } : { initialized: false },
      vectorStore: store.size > 0 ? { initialized: true, info: store.info } : { initialized: false },
      ollama,
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      try {
        // Fase 1: scarica i codici
        const allChunks = []
        for (const codice of CODICI) {
          send({ type: 'status', message: `Scarico ${codice.nome} da Normattiva...` })
          const text = await fetchCodice(codice)
          const lines = text.split('\n').length
          send({ type: 'status', message: `${codice.nome} scaricato (${text.length} caratteri, ${lines} righe)` })
          const chunks = chunkText(text, { codeName: codice.nome })
          allChunks.push({ codice: codice.nome, chunks })
          send({ type: 'status', message: `${codice.nome}: ${chunks.length} chunk generati` })
        }

        // Fase 2: costruisci keyword index (sempre)
        send({ type: 'status', message: 'Costruisco indice keyword...' })
        const kw = getKeywordIndex()
        kw.clear()
        let totalChunks = 0
        for (const { codice, chunks } of allChunks) {
          for (const chunk of chunks) {
            kw.addDocument(chunk.text, chunk.metadata)
            totalChunks++
          }
        }
        kw.downloadedAt = new Date().toISOString()
        kw.save()
        send({ type: 'status', message: `Indice keyword creato: ${totalChunks} chunk` })

        // Fase 3: costruisci vector store (solo se Ollama disponibile)
        const ollama = await checkOllama()
        let vectorBuilt = false
        if (ollama.available && ollama.hasEmbedding) {
          send({ type: 'status', message: 'Ollama disponibile, generazione embedding per ricerca vettoriale...' })
          const store = getVectorStore()
          store.clear()
          let processed = 0
          for (const { codice, chunks } of allChunks) {
            for (const chunk of chunks) {
              const embedding = await generateEmbedding(chunk.text)
              store.addDocument(chunk.text, chunk.metadata, embedding)
              processed++
              if (processed % 20 === 0 || processed === totalChunks) {
                send({ type: 'progress', current: processed, total: totalChunks, message: `Embedding: ${processed}/${totalChunks}` })
              }
            }
          }
          store.save()
          vectorBuilt = true
          send({ type: 'status', message: `Vector store creato: ${store.size} chunk` })
        } else {
          send({ type: 'status', message: 'Ollama non disponibile, skippo vector store (usa solo indice keyword)' })
        }

        send({ type: 'complete', info: { keyword: totalChunks, vector: vectorBuilt, codici: CODICI.map(c => c.nome) } })
      } catch (err) {
        send({ type: 'error', message: `Errore: ${err.message}` })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function DELETE() {
  try {
    deleteKeywordIndex()
    deleteVectorStore()
    return NextResponse.json({ deleted: true })
  } catch (err) {
    return NextResponse.json({ deleted: false, error: err.message }, { status: 500 })
  }
}
