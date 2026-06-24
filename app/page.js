'use client'

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
} from 'lucide-react'

const APP_VERSION = '1.0.0'

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

    if (file.size > 10 * 1024 * 1024) {
      alert('File troppo grande (max 10 MB).')
      return
    }

    setUploadingFile(true)
    try {
      if (ext === 'txt') {
        const text = await file.text()
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

  const handleInvia = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input
    setInput('')
    const nuoviMessaggi = [...messages, { role: 'user', text: userMessage }]
    setMessages(nuoviMessaggi)
    setLoading(true)

    let data
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          messages: messages,
          soloItalia,
          modalitaTutor,
          documentContext: documentContext || undefined,
          documentName: documentName || undefined,
        }),
      })

      data = await res.json()
      if (data.error) throw new Error(data.error)

      // Clear document after first message using it (context already passed)
      const messaggiAggiornati = [...nuoviMessaggi, {
        role: 'assistant',
        text: data.text,
        fonti: data.fonti ?? [],
      }]
      setMessages(messaggiAggiornati)
      salvaInCronologia(messaggiAggiornati)
    } catch (err) {
      console.error(err)
      const messaggioErrore = data?.detail
        ? `${data.error}. ${data.detail}`
        : (data?.error || 'Si è verificato un errore. Riprova tra qualche istante.')
      setMessages(prev => [...prev, { role: 'assistant', text: messaggioErrore }])
    } finally {
      setLoading(false)
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

  return (
    <div className={`flex h-[100dvh] overflow-hidden ${bg}`}>

      {/* Sidebar desktop — sottile, stile Apple */}
      <aside className={`hidden md:flex md:w-[220px] md:shrink-0 md:flex-col border-r ${border} ${isDarkMode ? 'bg-[#1d1d1f]' : 'bg-[#f5f5f7]'}`}>
        <div className={`flex items-center gap-2 border-b px-4 py-4 ${border}`}>
          <Scale className="h-5 w-5 text-[#0071e3]" strokeWidth={1.75} />
          <span className="text-[15px] font-semibold tracking-tight">IusMente</span>
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
            {isDarkMode ? 'Chiaro' : 'Scuro'}
          </button>
        </div>
      </aside>

      {/* Area principale */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Header — vetro smerigliato, compatto su mobile */}
        <header className={`glass safe-top z-30 flex shrink-0 items-center gap-2 border-b px-3 py-2.5 sm:px-5 sm:py-3 ${surface} ${border}`}>
          <div className="flex items-center gap-2 md:hidden">
            <Scale className="h-[18px] w-[18px] text-[#0071e3]" strokeWidth={1.75} />
            <span className="text-[15px] font-semibold tracking-tight">IusMente</span>
          </div>

          {/* Pill modello AI — solo desktop, discreta */}
          <div
            className={`hidden items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium md:flex ${border} ${
              isDarkMode ? 'bg-white/5 text-[#a1a1a6]' : 'bg-black/[0.03] text-[#6e6e73]'
            }`}
            title="Gemini 2.5 Flash-Lite genera la risposta · Groq Llama 3.3 70B la valida per ridurre le allucinazioni"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span><span className="font-semibold">Gemini 2.5 Flash-Lite</span> <span className={isDarkMode ? 'text-white/50' : 'text-black/40'}>· genera</span></span>
            <span className={`mx-0.5 ${isDarkMode ? 'text-white/20' : 'text-black/20'}`}>·</span>
            <span><span className="font-semibold">Llama 3.3 70B</span> <span className={isDarkMode ? 'text-white/50' : 'text-black/40'}>· valida</span></span>
            <a
              href="/info"
              className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
                isDarkMode ? 'text-white/40 hover:bg-white/10 hover:text-white/80' : 'text-black/40 hover:bg-black/[0.06] hover:text-black/70'
              }`}
              aria-label="Informazioni sull'applicazione"
              title="Maggiori informazioni sull'architettura e i modelli usati"
            >
              <Info className="h-3 w-3" strokeWidth={2} />
            </a>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Cronologia: icona compatta su mobile, niente sidebar */}
            <button
              type="button"
              onClick={() => setCronologiaAperta(true)}
              className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors md:hidden ${
                isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/[0.06]'
              }`}
              aria-label="Apri cronologia"
            >
              <Clock className="h-[17px] w-[17px]" strokeWidth={1.75} />
              {cronologia.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#0071e3] text-[9px] font-bold text-white">
                  {cronologia.length > 9 ? '9+' : cronologia.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`hidden h-8 w-8 items-center justify-center rounded-full transition-colors md:flex ${
                isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/[0.06]'
              }`}
              aria-label={isDarkMode ? 'Modalità chiara' : 'Modalità scura'}
            >
              {isDarkMode ? <Sun className="h-[17px] w-[17px]" strokeWidth={1.75} /> : <Moon className="h-[17px] w-[17px]" strokeWidth={1.75} />}
            </button>

            <button
              type="button"
              onClick={nuovaChat}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors md:hidden ${
                isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/[0.06]'
              }`}
              aria-label="Nuova chat"
            >
              <Plus className="h-[17px] w-[17px]" strokeWidth={2} />
            </button>
          </div>
        </header>

        {/* Pannello contesto: scope giuridico + modalità di risposta */}
        <div className={`shrink-0 border-b ${border} ${surface}`}>
          <div className="mx-auto grid max-w-2xl gap-3 px-3 py-3 sm:px-5 sm:py-4 md:grid-cols-2">
            {/* Gruppo 1: scope giuridico */}
            <div className={`rounded-2xl border p-3 sm:p-3.5 ${border} ${isDarkMode ? 'bg-black/30' : 'bg-white/60'}`}>
              <div className="mb-2 flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-[#0071e3]" strokeWidth={1.75} />
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${muted}`}>
                  Contesto giuridico
                </span>
              </div>
              <div className={`inline-flex w-full rounded-lg p-0.5 ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-black/[0.06]'}`}>
                <button
                  type="button"
                  onClick={() => setSoloItalia(true)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-left text-[12px] font-medium transition-all sm:text-[13px] ${
                    soloItalia
                      ? 'bg-[#0071e3] text-white shadow-sm'
                      : muted
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-base leading-none" role="img" aria-label="Italia">🇮🇹</span>
                    Solo leggi italiane
                  </span>
                  <span className={`mt-0.5 block text-[10.5px] font-normal leading-snug sm:text-[11px] ${soloItalia ? 'text-white/80' : muted}`}>
                    No UE, no CEDU
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSoloItalia(false)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-left text-[12px] font-medium transition-all sm:text-[13px] ${
                    !soloItalia
                      ? 'bg-[#0071e3] text-white shadow-sm'
                      : muted
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-base leading-none" role="img" aria-label="Unione Europea">🇪🇺</span>
                    Includi UE e internazionale
                  </span>
                  <span className={`mt-0.5 block text-[10.5px] font-normal leading-snug sm:text-[11px] ${!soloItalia ? 'text-white/80' : muted}`}>
                    Trattati, CGUE, CEDU
                  </span>
                </button>
              </div>
            </div>

            {/* Gruppo 2: modalità di risposta */}
            <div className={`rounded-2xl border p-3 sm:p-3.5 ${border} ${isDarkMode ? 'bg-black/30' : 'bg-white/60'}`}>
              <div className="mb-2 flex items-center gap-2">
                <Gavel className="h-3.5 w-3.5 text-[#0071e3]" strokeWidth={1.75} />
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${muted}`}>
                  Modalità di risposta
                </span>
              </div>
              <div className={`inline-flex w-full rounded-lg p-0.5 ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-black/[0.06]'}`}>
                <button
                  type="button"
                  onClick={() => setModalitaTutor(true)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-left text-[12px] font-medium transition-all sm:text-[13px] ${
                    modalitaTutor
                      ? 'bg-[#0071e3] text-white shadow-sm'
                      : muted
                  }`}
                >
                  Assistenza studio
                  <span className={`mt-0.5 block text-[10.5px] font-normal leading-snug sm:text-[11px] ${modalitaTutor ? 'text-white/80' : muted}`}>
                    Spiegazioni, quiz, simulazioni
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalitaTutor(false)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-left text-[12px] font-medium transition-all sm:text-[13px] ${
                    !modalitaTutor
                      ? 'bg-[#0071e3] text-white shadow-sm'
                      : muted
                  }`}
                >
                  Ambito ufficiale legislativo
                  <span className={`mt-0.5 block text-[10.5px] font-normal leading-snug sm:text-[11px] ${!modalitaTutor ? 'text-white/80' : muted}`}>
                    Come in commissione d'esame
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat */}
        <main className="flex-1 overflow-y-auto overscroll-contain">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 pb-8 pt-4 text-center animate-fade-in">
              <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] ${
                isDarkMode ? 'bg-[#1d1d1f]' : 'bg-white shadow-lg shadow-black/[0.06]'
              }`}>
                <Scale className="h-8 w-8 text-[#0071e3]" strokeWidth={1.5} />
              </div>
              <h2 className="text-[28px] font-semibold tracking-tight sm:text-[32px]">
                {modalitaTutor ? 'Assistenza studio.' : 'Ambito ufficiale legislativo.'}
              </h2>
              <p className={`mt-2 max-w-sm text-[15px] leading-relaxed sm:text-[17px] ${muted}`}>
                {modalitaTutor
                  ? 'Spiegazioni, quiz e simulazioni per prepararti agli esami.'
                  : 'Risposte formali e rigorose, come davanti alla commissione.'}
              </p>
              <div className={`mt-8 flex flex-wrap justify-center gap-2`}>
                {['Spiega la responsabilità extracontrattuale', 'Quiz su Diritto Privato', 'Differenza tra reato e contravvenzione'].map(suggerimento => (
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
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{m.text}</p>
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
                                    href={`https://${sito}`}
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
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${
                    isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/[0.06]'
                  } disabled:opacity-30`}
                  aria-label="Allega file"
                  title="Allega file .txt o .pdf"
                >
                  {uploadingFile ? (
                    <span className="flex gap-0.5">
                      {[0, 1, 2].map(n => (
                        <span key={n} className="h-1 w-1 rounded-full bg-current animate-pulse" style={{ animationDelay: `${n * 150}ms` }} />
                      ))}
                    </span>
                  ) : (
                    <Paperclip className="h-4 w-4" strokeWidth={1.75} />
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
                disabled={!input.trim() || loading || uploadingFile}
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#0071e3] text-white transition-all hover:bg-[#0077ed] disabled:opacity-30 disabled:hover:bg-[#0071e3]"
                aria-label="Invia messaggio"
              >
                <Send className="h-[17px] w-[17px]" strokeWidth={2} />
              </button>
            </div>
          </form>
          {/* Credit */}
          <div className={`mx-auto mt-2 flex max-w-2xl items-center justify-center gap-1.5 text-[11px] ${muted}`}>
            <span>Realizzato da</span>
            <span className="inline-flex items-center gap-1 font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
              Andrea
              <span aria-hidden="true">🐻</span>
            </span>
            <span className={`${isDarkMode ? 'text-white/20' : 'text-black/20'}`}>·</span>
            <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${isDarkMode ? 'bg-white/5' : 'bg-black/[0.04]'}`}>
              v{APP_VERSION}
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
