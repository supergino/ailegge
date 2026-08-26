import { NextResponse } from 'next/server'

// Limite di dimensione del file, enforce lato server (il check 5MB è solo client-side).
const MAX_FILE_BYTES = 5 * 1024 * 1024                 // 5 MB dopo decodifica base64
const MAX_BASE64_LENGTH = 8 * 1024 * 1024               // check rapido prima del decode (~6 MB)

export async function POST(req) {
  try {
    const { fileContent, fileName } = await req.json()

    if (!fileContent) {
      return NextResponse.json({ error: 'Nessun file fornito' }, { status: 400 })
    }

    // Protezione da payload arbitrariamente grandi: check sia su base64 che su buffer decodificato.
    if (typeof fileContent !== 'string' || fileContent.length > MAX_BASE64_LENGTH) {
      return NextResponse.json({ error: 'File troppo grande (max 5 MB)' }, { status: 413 })
    }

    const buffer = Buffer.from(fileContent, 'base64')
    if (buffer.length > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File troppo grande (max 5 MB)' }, { status: 413 })
    }

    const ext = fileName?.split('.').pop()?.toLowerCase()

    if (ext === 'txt') {
      let text = buffer.toString('utf-8')
      const maxChars = 50000
      if (text.length > maxChars) {
        text = text.slice(0, maxChars) + '\n\n[... Documento troncato per lunghezza eccessiva]'
      }
      return NextResponse.json({ text, fileName })
    }

    if (ext === 'pdf') {
      // HIGH 4: verifica magic-byte %PDF- (il tipo era solo dall'estensione del
      // nome file, controllato dal client). Senza questo controllo un payload
      // arbitrario verrebbe passato al parser.
      if (buffer.length < 5 || buffer.slice(0, 5).toString('latin1') !== '%PDF-') {
        return NextResponse.json({ error: 'File PDF non valido (intestazione mancante).' }, { status: 400 })
      }
      const pdf = (await import('pdf-parse')).default
      // Timeout sul parsing per evitare che un PDF malformato blocchi il processo.
      const PARSE_TIMEOUT_MS = 25000
      const parseWithTimeout = Promise.race([
        pdf(buffer),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout parsing PDF')), PARSE_TIMEOUT_MS)),
      ])
      const data = await parseWithTimeout
      let text = data.text || ''
      const maxChars = 50000
      if (text.length > maxChars) {
        text = text.slice(0, maxChars) + '\n\n[... Documento troncato per lunghezza eccessiva]'
      }
      return NextResponse.json({ text, fileName })
    }

    return NextResponse.json({ error: 'Formato non supportato. Usa .txt o .pdf' }, { status: 400 })
  } catch (error) {
    console.error('[IusMente/Upload] errore:', error)
    return NextResponse.json({ error: 'Errore durante la lettura del file' }, { status: 500 })
  }
}
