import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

const DATA_DIR = join(process.cwd(), '.data')
const INDEX_PATH = join(DATA_DIR, 'vector-index.json')

let instance = null

export class VectorStore {
  constructor() {
    this.documents = []
  }

  addDocument(text, metadata = {}, embedding) {
    const id = this.documents.length
    this.documents.push({ id, text, metadata, embedding })
    return id
  }

  search(queryEmbedding, k = 5) {
    if (this.documents.length === 0) return []
    const scores = this.documents.map(doc => ({
      id: doc.id,
      text: doc.text,
      metadata: doc.metadata,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }))
    scores.sort((a, b) => b.score - a.score)
    return scores.slice(0, k)
  }

  save() {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(INDEX_PATH, JSON.stringify(this.documents), 'utf-8')
  }

  load() {
    if (existsSync(INDEX_PATH)) {
      this.documents = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'))
      return true
    }
    return false
  }

  clear() {
    this.documents = []
  }

  get size() {
    return this.documents.length
  }

  get info() {
    if (this.documents.length === 0) return { totale: 0, codici: [] }
    const codici = [...new Set(this.documents.map(d => d.metadata?.codice).filter(Boolean))]
    return { totale: this.documents.length, codici }
  }
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb))
}

export function getVectorStore() {
  if (!instance) {
    instance = new VectorStore()
    instance.load()
  }
  return instance
}

export function deleteVectorStore() {
  instance = null
  if (existsSync(INDEX_PATH)) unlinkSync(INDEX_PATH)
}
