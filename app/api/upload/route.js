import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { fileContent, fileName } = await req.json()

    if (!fileContent) {
      return NextResponse.json({ error: 'Nessun file fornito' }, { status: 400 })
    }

    const buffer = Buffer.from(fileContent, 'base64')
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
      const pdf = (await import('pdf-parse')).default
      const data = await pdf(buffer)
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
