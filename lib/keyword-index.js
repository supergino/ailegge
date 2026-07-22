import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

function resolveDataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR
  const local = join(process.cwd(), '.data')
  try {
    mkdirSync(local, { recursive: true })
    return local
  } catch {
    return join(tmpdir(), 'ailegge-data')
  }
}

const DATA_DIR = resolveDataDir()
const INDEX_PATH = join(DATA_DIR, 'keyword-index.json')

let instance = null

export class KeywordIndex {
  constructor() {
    this.chunks = []
    this.invertedIndex = {}
    this.docCount = 0
    this.downloadedAt = null
  }

  addDocument(text, metadata = {}) {
    const id = this.chunks.length
    this.chunks.push({ id, text, metadata })
    const words = this.tokenize(text)
    const uniqueWords = new Set(words)
    for (const word of uniqueWords) {
      if (!this.invertedIndex[word]) this.invertedIndex[word] = new Set()
      this.invertedIndex[word].add(id)
    }
    this.docCount = id + 1
    return id
  }

  search(query, k = 8) {
    if (this.docCount === 0) return []
    const queryWords = [...new Set(this.tokenize(query))]
    const scores = {}

    for (const word of queryWords) {
      const matching = this.invertedIndex[word]
      if (!matching) continue
      const idf = Math.log((this.docCount + 1) / (matching.size + 1)) + 1
      for (const chunkId of matching) {
        scores[chunkId] = (scores[chunkId] || 0) + idf
      }
    }

    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(([id, score]) => ({
        id: parseInt(id),
        text: this.chunks[parseInt(id)].text,
        metadata: this.chunks[parseInt(id)].metadata,
        score,
      }))
  }

  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^a-zà-ùèéìòù0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  }

  save() {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    const data = {
      chunks: this.chunks,
      docCount: this.docCount,
      downloadedAt: this.downloadedAt || new Date().toISOString(),
      invertedIndex: Object.fromEntries(
        Object.entries(this.invertedIndex).map(([k, v]) => [k, [...v]])
      ),
    }
    writeFileSync(INDEX_PATH, JSON.stringify(data), 'utf-8')
  }

  load() {
    if (existsSync(INDEX_PATH)) {
      const data = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'))
      this.chunks = data.chunks
      this.docCount = data.docCount
      this.downloadedAt = data.downloadedAt || null
      this.invertedIndex = Object.fromEntries(
        Object.entries(data.invertedIndex).map(([k, v]) => [k, new Set(v)])
      )
      return true
    }
    return false
  }

  clear() {
    this.chunks = []
    this.invertedIndex = {}
    this.docCount = 0
    this.downloadedAt = null
  }

  get size() {
    return this.chunks.length
  }

  get info() {
    if (this.chunks.length === 0) return { totale: 0, codici: [] }
    const codici = [...new Set(this.chunks.map(d => d.metadata?.codice).filter(Boolean))]
    return { totale: this.chunks.length, codici, downloadedAt: this.downloadedAt }
  }
}

const STOP_WORDS = new Set([
  'che', 'con', 'della', 'delle', 'degli', 'dei', 'agli', 'alle', 'nella', 'negli',
  'nelle', 'sulla', 'sulle', 'dagli', 'dalle', 'dai', 'dal', 'dallo', 'nell',
  'all', 'dell', 'sull', 'questo', 'questa', 'questi', 'queste', 'quello', 'quella',
  'quelli', 'quelle', 'quale', 'quali', 'quando', 'dove', 'come', 'perché', 'anche',
  'più', 'meno', 'molto', 'molta', 'molti', 'molte', 'tutto', 'tutta', 'tutti',
  'tutte', 'parte', 'essere', 'avere', 'può', 'possono', 'sono', 'era', 'stato',
  'stata', 'stati', 'state', 'altro', 'altra', 'altri', 'oltre', 'primo', 'prima',
  'ogni', 'loro', 'lui', 'lei', 'cosa', 'cose', 'fatto', 'fatta', 'fatti',
])

export function getKeywordIndex() {
  if (!instance) {
    instance = new KeywordIndex()
    instance.load()
  }
  return instance
}

export function deleteKeywordIndex() {
  instance = null
  if (existsSync(INDEX_PATH)) unlinkSync(INDEX_PATH)
}
