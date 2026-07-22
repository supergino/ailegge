'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import {
  Clock,
  Copy,
  Check,
  Moon,
  Sun,
  Plus,
  Send,
  X,
  Scale,
  BookOpen,
  ExternalLink,
  Globe,
  Gavel,
  Info,
  Paperclip,
  FileText,
  Cpu,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  ChevronDown,
} from 'lucide-react'

const APP_VERSION = '1.9.0'

const DOMANDE_SUGGERITE = [
  'Spiega la responsabilità extracontrattuale',
  'Quiz su Diritto Privato',
  'Differenza tra reato e contravvenzione',
  'Cos\'è la capacità giuridica?',
  'Spiega l\'art. 2043 c.c.',
  'Differenza tra obbligazione e contratto',
  'Cos\'è il dolo contrattuale?',
  'Principio di legalità nel diritto penale',
  'Spiega la prescrizione nel diritto civile',
  'Differenza tra nullità e annullabilità',
  'Cos\'è la successione legittima?',
  'Elementi costitutivi del reato',
  'Spiega la responsabilità precontrattuale',
  'Cos\'è l\'usucapione?',
  'Differenza tra diritto reale e diritto di credito',
  'Spiega il principio di uguaglianza (art. 3 Cost.)',
  'Cos\'è il giusto processo?',
  'Differenza tra dolo e colpa',
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Home() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [soloItalia, setSoloItalia] = useState(true)
  const [modalitaTutor, setModalitaTutor] = useState(true)
  const [cronologia, setCronologia] = useState([])
  const [cronologiaAperta, setCronologiaAperta] = useState(false)
  const [copiatoId, setCopiatoId] = useState(null)
  const [documentContext, setDocumentContext] = useState('')
  const [documentName, setDocumentName] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [cooldown, setCooldown] = useState(false)
  const [suggerite, setSuggerite] = useState([])
  const [isOffline, setIsOffline] = useState(false)
  const [setupStatus, setSetupStatus] = useState('idle')
  const [setupProgress, setSetupProgress] = useState({ current: 0, total: 0 })
  const [setupMessage, setSetupMessage] = useState('')
  const [keywordInfo, setKeywordInfo] = useState(null)
  const [vectorInfo, setVectorInfo] = useState(null)
  const [ollamaStatus, setOllamaStatus] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [contestoAperto, setContestoAperto] = useState(false)
  const [showIntro, setShowIntro] = useState(true)

  useEffect(() => {
    setSuggerite(shuffle(DOMANDE_SUGGERITE).slice(0, 3))
    const visto = sessionStorage.getItem('iusmente_intro_visto')
    if (visto) setShowIntro(false)
  }, [])

  useEffect(() => {
    if (messages.length > 0 && showIntro) {
      setShowIntro(false)
      sessionStorage.setItem('iusmente_intro_visto', '1')
    }
  }, [messages, showIntro])

  useEffect(() => {
    fetch('/api/setup-locale?check=1')
      .then(r => r.json())
      .then(data => {
        setKeywordInfo(data.keywordIndex?.initialized ? data.keywordIndex.info : null)
        setVectorInfo(data.vectorStore?.initialized ? data.vectorStore.info : null)
        setOllamaStatus(data.ollama)
      })
      .catch(() => {})
  }, [])

  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const cronologiaSalvata = localStorage.getItem('iusmente_cronologia')
    if (cronologiaSalvata) {
      setCronologia(JSON.parse(cronologiaSalvata))
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    document.body.style.overflow = cronologiaAperta && window.innerWidth < 768 ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [cronologiaAperta])

  const copiaNegliAppunti = (testo, idx) => {
    navigator.clipboard.writeText(testo).then(() => {
      setCopiatoId(idx)
      setTimeout(() => setCopiatoId(null), 2000)
    })
  }

  const salvaInCronologia = (nuoviMessaggi) => {
    if (nuoviMessaggi.length === 0) return
    const primoMessaggio = nuoviMessaggi.find(m => m.role === 'user')?.text || 'Nuova consultazione'
    const titoloTroncato = primoMessaggio.length > 40 ? primoMessaggio.substring(0, 40) + '…' : primoMessaggio

    const nuovaSessione = {
      id: currentSessionId || Date.now(),
      titolo: titoloTroncato,
      data: new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      chat: nuoviMessaggi,
    }

    const aggiornata = [nuovaSessione, ...cronologia.filter(s => s.id !== nuovaSessione.id)]
    setCronologia(aggiornata)
    setCurrentSessionId(nuovaSessione.id)
    localStorage.setItem('iusmente_cronologia', JSON.stringify(aggiornata))
  }

  const caricaSessione = (sessione) => {
    setMessages(sessione.chat)
    setCurrentSessionId(sessione.id)
    setCronologiaAperta(false)
  }

  const eliminaSessione = (id) => {
    const aggiornata = cronologia.filter(s => s.id !== id)
    setCronologia(aggiornata)
    localStorage.setItem('iusmente_cronologia', JSON.stringify(aggiornata))
  }

  const nuovaChat = () => {
    setMessages([])
    setInput('')
    setCronologiaAperta(false)
    setDocumentContext('')
    setDocumentName('')
    setCurrentSessionId(null)
    setCooldown(false)
    inputRef.current?.focus()
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['txt', 'pdf'].includes(ext)) {
      alert('Formato non supportato. Carica file .txt o .pdf.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File troppo grande (max 5 MB).')
      return
    }

    setUploadingFile(true)
    try {
      if (ext === 'txt') {
        let text = await file.text()
        if (text.length > 50000) {
          text = text.slice(0, 50000) + '\n\n[... Documento troncato per lunghezza eccessiva]'
        }
        setDocumentContext(text)
        setDocumentName(file.name)
      } else {
        const arrayBuffer = await file.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        const base64 = btoa(binary)
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileContent: base64, fileName: file.name }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setDocumentContext(data.text)
        setDocumentName(data.fileName)
      }
    } catch (err) {
      console.error('Errore caricamento file:', err)
      alert('Errore durante la lettura del file. Riprova.')
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const rimuoviDocumento = () => {
    setDocumentContext('')
    setDocumentName('')
  }

  const handleSetup = async () => {
    setSetupStatus('downloading')
    setSetupProgress({ current: 0, total: 0 })
    setSetupMessage('Avvio setup...')
    try {
      const res = await fetch('/api/setup-locale')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'status') {
              setSetupMessage(data.message)
            } else if (data.type === 'progress') {
              setSetupProgress({ current: data.current, total: data.total })
            } else if (data.type === 'complete') {
              setSetupStatus('complete')
              if (data.info.keyword) {
                setKeywordInfo({ totale: data.info.keyword, codici: data.info.codici })
              }
              if (data.info.vector) {
                fetch('/api/setup-locale?check=1').then(r => r.json()).then(d => {
                  if (d.vectorStore?.initialized) setVectorInfo(d.vectorStore.info)
                  if (d.keywordIndex?.initialized) setKeywordInfo(d.keywordIndex.info)
                }).catch(() => {})
              }
              setSetupMessage(`Indicizzati ${data.info.keyword} chunk (${data.info.codici.join(', ')})`)
            } else if (data.type === 'error') {
              setSetupStatus('error')
              setSetupMessage(data.message)
            }
          } catch {}
        }
      }
    } catch (err) {
      setSetupStatus('error')
      setSetupMessage(err.message)
    }
  }

  const handleDelete = async () => {
    try {
      const res = await fetch('/api/setup-locale', { method: 'DELETE' })
      const data = await res.json()
      if (data.deleted) {
        setKeywordInfo(null)
        setVectorInfo(null)
        setConfirmDelete(false)
      }
    } catch (err) {
      console.error('Errore cancellazione dati:', err)
    }
  }

  const fetchWithRetry = async (body, maxRetries = 3, endpoint = '/api/chat') => {
    for (let tentativo = 0; tentativo <= maxRetries; tentativo++) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!data.error) return data

      const isOverload = res.status === 503 || /sovraccarico|UNAVAILABLE/i.test(data.error)
      if (!isOverload || tentativo === maxRetries) {
        throw { data, status: res.status }
      }

      const delay = Math.min(1000 * Math.pow(2, tentativo) + Math.random() * 500, 8000)
      console.warn(`[IusMente/Client] tentativo ${tentativo + 1} fallito (503), riprovo tra ${Math.round(delay)}ms`)
      await new Promise(r => setTimeout(r, delay))
    }
  }

  const handleInvia = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading || cooldown) return

    const userMessage = input
    setInput('')
    const nuoviMessaggi = [...messages, { role: 'user', text: userMessage }]
    setMessages(nuoviMessaggi)
    setLoading(true)

    try {
      const historyContext = messages.length > 20 ? messages.slice(-20) : messages
      const endpoint = isOffline ? '/api/chat-locale' : '/api/chat'
      const body = isOffline
        ? { message: userMessage, messages: historyContext, modalitaTutor }
        : { message: userMessage, messages: historyContext, soloItalia, modalitaTutor, documentContext: documentContext || undefined, documentName: documentName || undefined }
      const data = await fetchWithRetry(body, 3, endpoint)

      const messaggiAggiornati = [...nuoviMessaggi, {
        role: 'assistant',
        text: data.text,
        fonti: data.fonti ?? [],
        modelli: data.modelli,
        validazione: data.validazione,
      }]
      setMessages(messaggiAggiornati)
      salvaInCronologia(messaggiAggiornati)
    } catch (err) {
      console.error(err)
      const detail = err?.data?.detail
      const errorText = err?.data?.error
      const messaggioErrore = detail
        ? `${errorText}. ${detail}`
        : (errorText || 'Si è verificato un errore. Riprova tra qualche istante.')
      setMessages(prev => [...prev, { role: 'assistant', text: messaggioErrore }])
    } finally {
      setLoading(false)
      setCooldown(true)
      setTimeout(() => setCooldown(false), 3000)
    }
  }

  const bg = isDarkMode ? 'bg-black text-[#f5f5f7]' : 'bg-[#fbfbfd] text-[#1d1d1f]'
  const surface = isDarkMode ? 'bg-[#1d1d1f]/80' : 'bg-white/72'
  const border = isDarkMode ? 'border-white/10' : 'border-black/[0.08]'
  const muted = isDarkMode ? 'text-[#86868b]' : 'text-[#6e6e73]'
  const bubbleUser = isDarkMode ? 'bg-[#0071e3] text-white' : 'bg-[#0071e3] text-white'
  const bubbleAi = isDarkMode ? 'bg-[#2c2c2e] text-[#f5f5f7]' : 'bg-white text-[#1d1d1f] shadow-sm border border-black/[0.06]'

  const CronologiaList = ({ compact = false }) => (
    <div className={`${compact ? 'max-h-[38vh] overflow-y-auto' : 'flex-1 overflow-y-auto'} px-2 py-1`}>
      {cronologia.length === 0 ? (
        <p className={`px-3 py-6 text-center text-sm ${muted}`}>Nessuna conversazione</p>
      ) : (
        cronologia.map(s => (
          <div key={s.id} className="group relative">
            <button
              type="button"
              onClick={() => caricaSessione(s)}
              className={`w-full rounded-xl px-3 py-2.5 pr-9 text-left transition-colors ${
                isDarkMode ? 'hover:bg-white/8 active:bg-white/12' : 'hover:bg-black/[0.04] active:bg-black/[0.06]'
              }`}
            >
              <p className="truncate text-[13px] font-medium leading-snug">{s.titolo}</p>
              <p className={`mt-0.5 text-[11px] ${muted}`}>{s.data}</p>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                eliminaSessione(s.id)
              }}
              aria-label="Elimina dalla cronologia"
              title="Elimina dalla cronologia"
              className={`absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-red-500 opacity-70 transition-all hover:opacity-100 ${
                isDarkMode
                  ? 'hover:bg-red-500/15 active:bg-red-500/25'
                  : 'hover:bg-red-500/10 active:bg-red-500/20'
              }`}
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        ))
      )}
    </div>
  )

  const inlineFormat = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    const out = []
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      if (p.startsWith('**') && p.endsWith('**')) {
        out.push(<strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>)
      } else if (/\[([^\]]+)\]\(([^)]+)\)/.test(p)) {
        const html = p.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#0071e3] hover:underline">$1</a>')
        out.push(<span key={i} dangerouslySetInnerHTML={{ __html: html }} />)
      } else {
        out.push(p)
      }
    }
    return out.length === 1 ? out[0] : out
  }

  const FormattaTesto = ({ testo }) => {
    if (!testo) return null
    const lines = testo.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
    const blocks = []
    let i = 0

    while (i < lines.length) {
      const line = lines[i]

      // Blank line
      if (line.trim() === '') {
        i++
        continue
      }

      // Bullet list
      if (/^[-*]\s/.test(line)) {
        const items = []
        while (i < lines.length && /^[-*]\s/.test(lines[i])) {
          items.push(lines[i].replace(/^[-*]\s/, ''))
          i++
        }
        blocks.push(<ul key={blocks.length} className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{items.map((item, j) => <li key={j} className="text-[15px] leading-relaxed">{inlineFormat(item)}</li>)}</ul>)
        continue
      }

      // Numbered list
      if (/^\d+[.)]\s/.test(line)) {
        const items = []
        while (i < lines.length && /^\d+[.)]\s/.test(lines[i])) {
          items.push(lines[i].replace(/^\d+[.)]\s/, ''))
          i++
        }
        blocks.push(<ol key={blocks.length} className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{items.map((item, j) => <li key={j} className="text-[15px] leading-relaxed">{inlineFormat(item)}</li>)}</ol>)
        continue
      }

      // Paragraph
      const para = []
      while (i < lines.length && lines[i].trim() !== '' && !/^[-*]\s/.test(lines[i]) && !/^\d+[.)]\s/.test(lines[i])) {
        para.push(lines[i])
        i++
      }

      const testoParagrafo = para.join(' ')

      // Se il paragrafo è molto lungo e contiene punti, dividi in sotto-paragrafi
      if (testoParagrafo.length > 300 && /[.;:!?]\s+[A-Z"«(]/.test(testoParagrafo)) {
        const frasi = testoParagrafo.split(/(?<=[.;:!?])\s+(?=[A-Z"«(])/).filter(Boolean)
        for (const frase of frasi) {
          blocks.push(<p key={`${blocks.length}`} className="mb-2 text-[15px] leading-relaxed last:mb-0">{inlineFormat(frase)}</p>)
        }
      } else {
        blocks.push(<p key={blocks.length} className="mb-2 text-[15px] leading-relaxed last:mb-0">{inlineFormat(testoParagrafo)}</p>)
      }
    }

    return blocks.length ? <div className="space-y-2">{blocks}</div> : <p className="text-[15px] leading-relaxed">{testo}</p>
  }

  const SegmentedControl = ({ options, value, onChange }) => (
    <div className={`inline-flex rounded-lg p-0.5 ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-black/[0.06]'}`}>
      {options.map(opt => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all sm:px-3 sm:text-xs ${
            value === opt.id
              ? isDarkMode
                ? 'bg-[#636366] text-white shadow-sm'
                : 'bg-white text-[#1d1d1f] shadow-sm'
              : muted
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )

  const costruisciLinkFonte = (sito, nome) => {
    if (sito === 'normattiva.it' || sito === 'www.normattiva.it') {
      const a = nome.match(/art\.?\s*(\d+)([-.\s]*(bis|ter|quater|quinquies|sexies|septies|octies|novies|decies))?\s*(c\.c\.|c\.p\.|cost\.|codice\s*civile|codice\s*penale|costituzione)?\b/i)
      if (a) {
        const art = a[1] + (a[2] ? a[2].replace(/[\s.]+/g, '-') : '')
        const code = (a[4] || '').toLowerCase().replace(/[^a-z]/g, '')
        let urn
        if (/cp|codice\s*penale/.test(code)) {
          urn = `urn:nir:stato:regio.decreto:1930-10-19;1398~art${art}`
        } else if (/cost|costituzione/.test(code)) {
          urn = `urn:nir:stato:costituzione:1947-12-27;1~art${art}`
        } else {
          urn = `urn:nir:stato:regio.decreto:1942-03-16;262~art${art}`
        }
        return `https://www.normattiva.it/uri-res/N2Ls?urn=${urn}!vig=`
      }
      return 'https://www.normattiva.it'
    }
    return `https://${sito.replace(/^www\./, '')}`
  }

  const formatDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const isOlderThan = (iso, days) => {
    if (!iso) return false
    const d = new Date(iso)
    const soglia = new Date()
    soglia.setDate(soglia.getDate() - days)
    return d < soglia
  }

  return (
    <div className={`flex h-[100dvh] overflow-hidden ${bg}`}>

      {/* Sidebar desktop — sottile, stile Apple */}
      <aside className={`hidden md:flex md:w-[220px] md:shrink-0 md:flex-col border-r ${border} ${isDarkMode ? 'bg-[#1d1d1f]' : 'bg-[#f5f5f7]'}`}>
        <div className={`flex items-center gap-2 border-b px-4 py-4 ${border}`}>
          <Link href="/status" className="hover:opacity-80 transition-opacity">
            <Scale className="h-5 w-5 text-[#0071e3]" strokeWidth={1.75} />
          </Link>
          <Link href="/info" className="hover:opacity-80 transition-opacity">
            <span className="text-[15px] font-semibold tracking-tight">IusMente</span>
          </Link>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={nuovaChat}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-medium transition-colors ${
              isDarkMode
                ? 'bg-[#0071e3] hover:bg-[#0077ed] text-white'
                : 'bg-[#0071e3] hover:bg-[#0077ed] text-white'
            }`}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Nuova chat
          </button>
        </div>

        <p className={`px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider ${muted}`}>Recenti</p>
        <CronologiaList />

        <div className={`mt-auto border-t p-3 ${border}`}>
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[13px] transition-colors ${
              isDarkMode ? 'hover:bg-white/8' : 'hover:bg-black/[0.04]'
            }`}
            aria-label={isDarkMode ? 'Modalità chiara' : 'Modalità scura'}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDarkMode ? 'Tema chiaro' : 'Tema scuro'}
          </button>
        </div>
      </aside>

      {/* Area principale */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Header — vetro smerigliato, compatto su mobile */}
        <header className={`glass safe-top z-30 flex shrink-0 items-center gap-1.5 border-b px-2 py-1 sm:px-3 sm:py-2 ${surface} ${border}`}>
          <div className="flex items-center gap-1.5 md:hidden shrink-0">
            <Link href="/status" className="hover:opacity-80 transition-opacity">
              <Scale className="h-[20px] w-[20px] text-[#0071e3]" strokeWidth={1.75} />
            </Link>
            <Link href="/info" className="hover:opacity-80 transition-opacity">
              <span className="text-[14px] font-semibold tracking-tight">IusMente</span>
            </Link>
          </div>

          {/* Mobile: mode pills compatti nella header */}
          <button
            type="button"
            onClick={() => setContestoAperto(!contestoAperto)}
            className={`ml-1 flex items-center gap-1 overflow-hidden md:hidden ${
              isDarkMode ? 'active:opacity-60' : 'active:opacity-60'
            }`}
            aria-label="Apri impostazioni"
          >
            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold leading-tight ${
              soloItalia
                ? isDarkMode ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                : isDarkMode ? 'border-blue-500/30 bg-blue-500/15 text-blue-400' : 'border-blue-500/20 bg-blue-500/10 text-blue-600'
            }`}>
              {soloItalia ? '🇮🇹' : '🇪🇺'}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold leading-tight ${
              modalitaTutor
                ? isDarkMode ? 'border-violet-500/30 bg-violet-500/15 text-violet-400' : 'border-violet-500/20 bg-violet-500/10 text-violet-600'
                : isDarkMode ? 'border-amber-500/30 bg-amber-500/15 text-amber-400' : 'border-amber-500/20 bg-amber-500/10 text-amber-600'
            }`}>
              {modalitaTutor ? '📚' : '🎓'}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold leading-tight ${
              !isOffline
                ? isDarkMode ? 'border-sky-500/30 bg-sky-500/15 text-sky-400' : 'border-sky-500/20 bg-sky-500/10 text-sky-600'
                : isDarkMode ? 'border-teal-500/30 bg-teal-500/15 text-teal-400' : 'border-teal-500/20 bg-teal-500/10 text-teal-600'
            }`}>
              {isOffline ? '💻' : '☁️'}
            </span>
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Cronologia: icona compatta su mobile, niente sidebar */}
            <button
              type="button"
              onClick={() => setCronologiaAperta(true)}
              className={`relative flex h-8 w-8 items-center justify-center rounded-xl transition-colors md:hidden ${
                isDarkMode ? 'bg-white/8 hover:bg-white/15' : 'bg-black/[0.06] hover:bg-black/[0.1]'
              }`}
              aria-label="Apri cronologia"
            >
              <Clock className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {cronologia.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#0071e3] text-[9px] font-bold text-white">
                  {cronologia.length > 9 ? '9+' : cronologia.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors md:hidden ${
                isDarkMode ? 'bg-white/8 hover:bg-white/15' : 'bg-black/[0.06] hover:bg-black/[0.1]'
              }`}
              aria-label={isDarkMode ? 'Modalità chiara' : 'Modalità scura'}
            >
              {isDarkMode ? <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />}
            </button>

            <button
              type="button"
              onClick={nuovaChat}
              className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors md:hidden ${
                isDarkMode ? 'bg-white/8 hover:bg-white/15' : 'bg-black/[0.06] hover:bg-black/[0.1]'
              }`}
              aria-label="Nuova chat"
            >
              <Plus className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* Pannello contesto: scope giuridico + modalità */}
        <div className={`shrink-0 border-b ${border} ${surface}`}>

          <div className={`${contestoAperto || 'hidden'} md:block`}>
            <div className="mx-auto grid max-w-5xl gap-1 px-2 py-1 sm:px-3 sm:py-1.5 md:grid-cols-3">
              {/* Gruppo 1: contesto giuridico */}
              <div className={`rounded-xl border px-2.5 py-2 ${border} ${isDarkMode ? 'bg-black/30' : 'bg-white/60'}`}>
                <div className="mb-0.5 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-[#0071e3]" strokeWidth={1.75} />
                  <span className={`text-[12px] font-semibold uppercase tracking-wider ${muted}`}>Contesto</span>
                    <a href="/info#contesto" className={`ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${isDarkMode ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25' : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'}`} aria-label="Info contesto" title="Ambito normativo di riferimento"><HelpCircle className="h-3.5 w-3.5" strokeWidth={2.5} /></a>
                </div>
                <div className={`inline-flex w-full rounded-lg p-0.5 ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-black/[0.06]'}`}>
                  <button
                    type="button"
                    onClick={() => setSoloItalia(true)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-left text-[13px] font-medium transition-all ${soloItalia ? 'bg-[#0071e3] text-white shadow-sm' : muted}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wider ${soloItalia ? 'bg-white/20 text-white' : 'bg-[#0071e3]/10 text-[#0071e3]'}`}>🇮🇹 ITALIA</span>
                      <span>Solo leggi italiane</span>
                    </span>
                    <span className={`mt-0.5 block text-[11px] font-normal leading-snug ${soloItalia ? 'text-white/80' : muted}`}>No UE, no CEDU</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSoloItalia(false)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-left text-[13px] font-medium transition-all ${!soloItalia ? 'bg-[#0071e3] text-white shadow-sm' : muted}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wider ${!soloItalia ? 'bg-white/20 text-white' : 'bg-[#0071e3]/10 text-[#0071e3]'}`}>🇪🇺 UE</span>
                      <span>Includi UE e internazionale</span>
                    </span>
                    <span className={`mt-0.5 block text-[11px] font-normal leading-snug ${!soloItalia ? 'text-white/80' : muted}`}>Trattati, CGUE, CEDU</span>
                  </button>
                </div>
              </div>

              {/* Gruppo 2: modalità risposta */}
              <div className={`rounded-xl border px-2.5 py-2 ${border} ${isDarkMode ? 'bg-black/30' : 'bg-white/60'}`}>
                <div className="mb-0.5 flex items-center gap-1.5">
                  <Gavel className="h-3.5 w-3.5 text-[#0071e3]" strokeWidth={1.75} />
                  <span className={`text-[12px] font-semibold uppercase tracking-wider ${muted}`}>Risposta</span>
                  <a href="/info#risposta" className={`ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${isDarkMode ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25' : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'}`} aria-label="Info risposta" title="Modalità di spiegazione delle risposte"><HelpCircle className="h-3.5 w-3.5" strokeWidth={2.5} /></a>
                </div>
                <div className={`inline-flex w-full rounded-lg p-0.5 ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-black/[0.06]'}`}>
                  <button
                    type="button"
                    onClick={() => setModalitaTutor(true)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-left text-[13px] font-medium transition-all ${modalitaTutor ? 'bg-[#0071e3] text-white shadow-sm' : muted}`}
                  >
                    Assistenza studio
                    <span className={`mt-0.5 block text-[11px] font-normal leading-snug ${modalitaTutor ? 'text-white/80' : muted}`}>Spiegazioni, quiz, simulazioni</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalitaTutor(false)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-left text-[13px] font-medium transition-all ${!modalitaTutor ? 'bg-[#0071e3] text-white shadow-sm' : muted}`}
                  >
                    Ambito ufficiale legislativo
                    <span className={`mt-0.5 block text-[11px] font-normal leading-snug ${!modalitaTutor ? 'text-white/80' : muted}`}>Come in commissione d'esame</span>
                  </button>
                </div>
              </div>

              {/* Gruppo 3: elaborazione */}
              <div className={`rounded-xl border px-2.5 py-2 ${border} ${isDarkMode ? 'bg-black/30' : 'bg-white/60'}`}>
                <div className="mb-0.5 flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-[#0071e3]" strokeWidth={1.75} />
                  <span className={`text-[12px] font-semibold uppercase tracking-wider ${muted}`}>
                    Elaborazione <span className="ml-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">BETA</span>
                  </span>
                  <a href="/info#elaborazione" className={`ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${isDarkMode ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25' : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'}`}
                    aria-label="Info modalità" title="Confronto Online vs Locale">
                    <HelpCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </a>
                </div>
                <div className={`inline-flex w-full rounded-lg p-0.5 ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-black/[0.06]'}`}>
                  <button
                    type="button"
                    onClick={() => setIsOffline(false)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-left text-[13px] font-medium transition-all ${!isOffline ? 'bg-[#0071e3] text-white shadow-sm' : muted}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                      <span>Online</span>
                    </span>
                    <span className={`mt-0.5 block text-[11px] font-normal leading-snug ${!isOffline ? 'text-white/80' : muted}`}>{keywordInfo ? 'Indice locale + Gemini' : 'API cloud (Gemini, Tavily)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOffline(true)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-left text-[13px] font-medium transition-all ${isOffline ? 'bg-[#0071e3] text-white shadow-sm' : muted}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                      <span>Locale</span>
                    </span>
                    <span className={`mt-0.5 block text-[11px] font-normal leading-snug ${isOffline ? 'text-white/80' : muted}`}>{vectorInfo ? 'Ollama + DB vettoriale' : 'Ollama offline'}</span>
                  </button>
                </div>
                {setupStatus === 'downloading' ? (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[12px]"><span className={`truncate ${muted}`}>{setupMessage}</span>{setupProgress.total > 0 && <span className={`shrink-0 font-medium ${isDarkMode ? 'text-white/70' : 'text-black/60'}`}>{setupProgress.current}/{setupProgress.total}</span>}</div>
                    <div className={`mt-0.5 h-0.5 w-full overflow-hidden rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-black/[0.06]'}`}><div className="h-full rounded-full bg-[#0071e3] transition-all duration-300" style={{ width: setupProgress.total > 0 ? `${(setupProgress.current / setupProgress.total) * 100}%` : '5%' }} /></div>
                  </div>
                ) : setupStatus === 'error' ? (
                  <div className="mt-2 flex items-center gap-1.5 text-[12px] text-red-500"><AlertCircle className="h-3 w-3 shrink-0" strokeWidth={2} /><span className="truncate leading-tight">{setupMessage}</span><button type="button" onClick={handleSetup} className="ml-auto shrink-0 rounded-md bg-red-500/15 px-2 py-1 text-[12px] font-medium text-red-500 hover:bg-red-500/25">Riprova</button></div>
                ) : keywordInfo || vectorInfo ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                      <span className={muted}>📖 {keywordInfo?.totale || vectorInfo?.totale} chunk</span>
                      {keywordInfo?.downloadedAt && <span className={muted}>{formatDate(keywordInfo.downloadedAt)}</span>}
                      {keywordInfo?.downloadedAt && isOlderThan(keywordInfo.downloadedAt, 90) && <span className="text-amber-500">⚠️</span>}
                      {confirmDelete ? (
                        <span className="ml-auto flex gap-1">
                          <button type="button" onClick={handleDelete} className="rounded bg-red-500 px-2 py-1 text-[12px] font-medium text-white hover:bg-red-600">Conferma</button>
                          <button type="button" onClick={() => setConfirmDelete(false)} className={`rounded px-2 py-1 text-[12px] font-medium ${isDarkMode ? 'border border-white/20 text-white/70 hover:bg-white/10' : 'border border-black/[0.12] text-black/60 hover:bg-black/[0.04]'}`}>No</button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto inline-flex items-center gap-1 text-red-400 hover:text-red-500"><span>Elimina</span>✕</button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={handleSetup} className="mt-2 w-full rounded-lg bg-[#0071e3] py-2 text-[13px] font-medium text-white hover:bg-[#0077ed]">Scarica codici</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chat */}
        <main className="flex-1 overflow-y-auto overscroll-contain">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col px-5 pb-8 pt-4 animate-fade-in sm:items-center sm:justify-center sm:px-6 sm:pt-8">
              <div className="sm:text-center">
                {showIntro && modalitaTutor && (
                  <div className="mb-4 space-y-2">
                    <p className="text-[15px] font-semibold leading-snug sm:text-[17px]">
                      Chiedi. Comprendi. Impara il diritto con l'AI.
                    </p>
                    <p className={`text-[13px] leading-relaxed sm:text-[15px] ${muted}`}>
                      AI Legge è un assistente open source che aiuta studenti, professionisti e cittadini a comprendere leggi e codici attraverso domande in linguaggio naturale. Fornisce risposte chiare, riferimenti alla normativa italiana e particolare attenzione alla precisione, limitando il rischio di informazioni non pertinenti.
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-3 sm:justify-center">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] sm:h-10 sm:w-10 sm:rounded-[14px] ${
                    isDarkMode ? 'bg-[#1d1d1f]' : 'bg-white shadow-lg shadow-black/[0.06]'
                  }`}>
                    <Scale className="h-[18px] w-[18px] text-[#0071e3] sm:h-5 sm:w-5" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-[20px] font-semibold tracking-tight sm:text-[26px]">
                    {modalitaTutor ? 'Assistenza studio' : 'Ambito ufficiale legislativo'}
                  </h2>
                </div>
                <p className={`mt-2 max-w-sm text-[13px] leading-relaxed sm:mx-auto sm:text-[15px] ${muted}`}>
                  {modalitaTutor
                    ? 'Spiegazioni, quiz e simulazioni per prepararti agli esami.'
                    : 'Risposte formali e rigorose, come davanti alla commissione.'}
                </p>
              </div>
              {suggerite.length > 0 && (
                <p className={`mt-6 text-[13px] font-medium sm:text-center ${muted}`}>Ad esempio chiedi:</p>
              )}
              <div className={`mt-3 flex flex-wrap gap-2 sm:justify-center`}>
                {suggerite.map(suggerimento => (
                  <button
                    key={suggerimento}
                    type="button"
                    onClick={() => setInput(suggerimento)}
                    className={`rounded-full px-4 py-2 text-[13px] transition-colors ${
                      isDarkMode
                        ? 'bg-[#1d1d1f] hover:bg-[#2c2c2e] border border-white/10'
                        : 'bg-white hover:bg-[#f5f5f7] border border-black/[0.08] shadow-sm'
                    }`}
                  >
                    {suggerimento}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`animate-fade-in flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`group relative max-w-[88%] sm:max-w-[80%] ${m.role === 'user' ? bubbleUser : bubbleAi} rounded-[20px] px-4 py-3`}>
                    <FormattaTesto testo={m.text} />
                    {m.role === 'assistant' && m.fonti?.length > 0 && (
                      <div className={`mt-3 border-t pt-3 ${isDarkMode ? 'border-white/10' : 'border-black/[0.06]'}`}>
                        <div className={`mb-1.5 flex items-center gap-1.5 ${muted}`}>
                          <BookOpen className="h-3 w-3 shrink-0" strokeWidth={2} />
                          <span className="text-[11px] font-semibold uppercase tracking-wide">Fonti</span>
                        </div>
                        <ul className="space-y-1.5">
                          {m.fonti.map((fonte, j) => {
                            // Retrocompatibilità: la cronologia salvata col vecchio formato è array di stringhe
                            const isString = typeof fonte === 'string'
                            const nome = isString ? fonte : fonte.nome
                            const sito = isString ? null : fonte.sito
                            return (
                              <li key={j} className="text-[12px] leading-snug">
                                {sito ? (
                                  <a
                                    href={costruisciLinkFonte(sito, nome)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex max-w-full items-baseline gap-1.5 underline decoration-dotted underline-offset-2 transition-colors ${
                                      isDarkMode ? 'text-[#a1a1a6] hover:text-white' : 'text-[#6e6e73] hover:text-[#0071e3]'
                                    }`}
                                  >
                                    <span className="break-words">{nome}</span>
                                    <ExternalLink className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
                                    <span className={`shrink-0 ${muted} no-underline`}>· {sito}</span>
                                  </a>
                                ) : (
                                  <span className={isDarkMode ? 'text-[#a1a1a6]' : 'text-[#6e6e73]'}>· {nome}</span>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                    {m.role === 'assistant' && m.modelli?.generatore && (
                      <div className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 ${muted}`}>
                        {/* Tavily RAG */}
                        {m.modelli.tavily && (
                          <span className="inline-flex items-center gap-1 text-[10px] leading-tight">
                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-violet-500" />
                            Tavily RAG
                          </span>
                        )}
                        {/* Indice locale */}
                        {m.modelli.indiceLocale && (
                          <span className="inline-flex items-center gap-1 text-[10px] leading-tight">
                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
                            Indice locale
                          </span>
                        )}
                        {/* Generatore */}
                        {m.modelli.generatore.includes('fallback') ? (
                          <span className="inline-flex items-center gap-1 text-[10px] leading-tight">
                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                            {m.modelli.generatore}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] leading-tight">
                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {m.modelli.generatore}
                          </span>
                        )}
                        {/* Validatore */}
                        {m.validazione && m.modelli.validatore && m.modelli.validatore !== 'non attivo' && (
                          <span className="inline-flex items-center gap-1 text-[10px] leading-tight">
                            <span className={`inline-flex h-1.5 w-1.5 rounded-full ${m.validazione.valido ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            {m.validazione.skipped ? `${m.modelli.validatore} · saltato` : m.validazione.valido ? `${m.modelli.validatore} · OK` : `${m.modelli.validatore} · ${m.validazione.problemi?.length || 0} criticità`}
                          </span>
                        )}
                      </div>
                    )}
                    {m.role === 'assistant' && (
                      <button
                        type="button"
                        onClick={() => copiaNegliAppunti(m.text, i)}
                        className={`absolute -bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full opacity-0 transition-all group-hover:opacity-100 ${
                          isDarkMode ? 'bg-[#3a3a3c] hover:bg-[#48484a]' : 'bg-[#f5f5f7] hover:bg-[#e8e8ed] shadow-sm'
                        }`}
                        aria-label="Copia risposta"
                      >
                        {copiatoId === i
                          ? <Check className="h-3.5 w-3.5 text-green-500" />
                          : <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                        }
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start animate-fade-in">
                  <div className={`flex items-center gap-2 rounded-[20px] px-4 py-3 ${bubbleAi}`}>
                    <span className="flex gap-1">
                      {[0, 1, 2].map(n => (
                        <span
                          key={n}
                          className={`h-1.5 w-1.5 rounded-full ${isDarkMode ? 'bg-[#86868b]' : 'bg-[#6e6e73]'} animate-pulse`}
                          style={{ animationDelay: `${n * 150}ms` }}
                        />
                      ))}
                    </span>
                    <span className={`text-[13px] ${muted}`}>Elaborazione…</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </main>

        {/* Input — pill stile iMessage */}
        <footer className={`safe-bottom shrink-0 border-t px-3 py-2.5 sm:px-5 sm:py-4 ${border} ${surface} glass`}>
          <form onSubmit={handleInvia} className="mx-auto flex max-w-2xl flex-col gap-2">
            {documentName && (
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${border} ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-white'}`}>
                <FileText className="h-4 w-4 shrink-0 text-[#0071e3]" strokeWidth={1.75} />
                <span className="truncate text-[13px] font-medium">{documentName}</span>
                <button
                  type="button"
                  onClick={rimuoviDocumento}
                  className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100"
                  aria-label="Rimuovi file"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className={`flex flex-1 items-center rounded-[22px] border px-3 py-2 ${
                isDarkMode ? 'border-white/10 bg-[#1d1d1f]' : 'border-black/[0.08] bg-white'
              }`}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || uploadingFile}
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium transition-colors ${
                    isDarkMode ? 'text-[#86868b] hover:bg-white/10' : 'text-[#6e6e73] hover:bg-black/[0.06]'
                  } disabled:opacity-30`}
                  aria-label="Allega file"
                  title="Allega file .txt o .pdf (max 5 MB)"
                >
                  {uploadingFile ? (
                    <span className="flex gap-0.5">
                      {[0, 1, 2].map(n => (
                        <span key={n} className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: `${n * 150}ms` }} />
                      ))}
                    </span>
                  ) : (
                    <>
                      <Paperclip className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      <span className="hidden sm:inline">Allega</span>
                      <span className={`hidden text-[10px] sm:inline ${muted}`}>solo PDF o TXT</span>
                    </>
                  )}
                </button>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  className={`w-full bg-transparent text-[15px] outline-none placeholder:opacity-50 ${
                    isDarkMode ? 'placeholder:text-[#86868b]' : 'placeholder:text-[#6e6e73]'
                  }`}
                  placeholder={documentName ? 'Poni una domanda sul documento…' : 'Scrivi la tua domanda…'}
                  aria-label="Messaggio"
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || loading || uploadingFile || cooldown}
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#0071e3] text-white transition-all hover:bg-[#0077ed] disabled:opacity-30 disabled:hover:bg-[#0071e3]"
                aria-label="Invia messaggio"
              >
                <Send className="h-[17px] w-[17px]" strokeWidth={2} />
              </button>
            </div>
          </form>
          {/* Credit + modelli — solo su desktop */}
          <div className={`mx-auto mt-2 hidden md:inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-full px-3 py-1 text-[11px] ${isDarkMode ? 'bg-[#1d1d1f]/60' : 'bg-white/80 shadow-sm shadow-black/[0.03]'}`}>
            <span className={isDarkMode ? 'text-[#a1a1a6]' : 'text-[#6e6e73]'}>Realizzato da</span>
            <span
              className="inline-flex items-center gap-1 font-semibold"
              style={{ color: isDarkMode ? '#f5f5f7' : '#1d1d1f' }}
            >
              Andrea
              <span aria-hidden="true">🐻</span>
            </span>
            <span className={`${isDarkMode ? 'text-white/20' : 'text-black/20'}`}>·</span>
            <a
              href="/info"
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] leading-none transition-colors ${
                isDarkMode ? 'bg-white/10 text-[#a1a1a6] hover:bg-white/15' : 'bg-black/[0.06] text-[#6e6e73] hover:bg-black/[0.1]'
              }`}
              title="Maggiori informazioni sull'architettura e i modelli usati"
            >
              v{APP_VERSION}
              <Info className="h-2.5 w-2.5" strokeWidth={2} />
            </a>
            <span className={`hidden sm:inline ${isDarkMode ? 'text-white/20' : 'text-black/20'}`}>·</span>
            <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] leading-tight ${muted}`}>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Gemini 3.1 Flash-Lite
            </span>
            <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] leading-tight ${muted}`}>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-violet-500" />
              Tavily RAG
            </span>
            <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] leading-tight ${muted}`}>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
              Groq · NVIDIA · OpenRouter
            </span>
          </div>
        </footer>
      </div>

      {/* Mobile: bottom sheet cronologia — non sidebar a tutto schermo */}
      {cronologiaAperta && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setCronologiaAperta(false)}
            aria-label="Chiudi cronologia"
          />
          <div
            className={`absolute bottom-0 left-0 right-0 animate-slide-up rounded-t-[20px] border-t shadow-2xl ${
              isDarkMode ? 'bg-[#1d1d1f] border-white/10' : 'bg-[#f5f5f7] border-black/[0.08]'
            } safe-bottom`}
          >
            <div className="flex justify-center pt-2 pb-1">
              <span className={`h-1 w-9 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-black/15'}`} />
            </div>
            <div className={`flex items-center justify-between px-4 pb-2 pt-1`}>
              <h3 className="text-[15px] font-semibold">Cronologia</h3>
              <button
                type="button"
                onClick={() => setCronologiaAperta(false)}
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  isDarkMode ? 'bg-white/10' : 'bg-black/[0.06]'
                }`}
                aria-label="Chiudi"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <CronologiaList compact />
          </div>
        </div>
      )}
    </div>
  )
}
