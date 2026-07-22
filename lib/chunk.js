export function chunkText(text, options = {}) {
  const maxSize = options.maxSize || 800
  const overlap = options.overlap || 100
  const codeName = options.codeName || ''

  const articleRegex = /(Art\.\s*\d+[^\n]*)/gi
  const matches = [...text.matchAll(articleRegex)]

  if (matches.length > 5) {
    const chunks = []
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index
      const end = i < matches.length - 1 ? matches[i + 1].index : text.length
      const rawArticle = matches[i][0].trim()
      let chunkText = text.slice(start, end).trim()
      if (chunkText.length > maxSize) {
        const paragraphs = chunkText.split(/\n\n+/)
        let current = ''
        for (const p of paragraphs) {
          if ((current + '\n\n' + p).length > maxSize && current) {
            chunks.push({ text: current, metadata: { codice: codeName, articolo: rawArticle } })
            current = p
          } else {
            current = current ? current + '\n\n' + p : p
          }
        }
        if (current) chunks.push({ text: current, metadata: { codice: codeName, articolo: rawArticle } })
      } else {
        chunks.push({ text: chunkText, metadata: { codice: codeName, articolo: rawArticle } })
      }
    }
    return chunks
  }

  const chunks = []
  let start = 0
  while (start < text.length) {
    const end = Math.min(start + maxSize, text.length)
    const seg = text.slice(start, end).trim()
    if (seg.length > 50) {
      chunks.push({ text: seg, metadata: { codice: codeName } })
    }
    start += maxSize - overlap
  }
  return chunks
}
