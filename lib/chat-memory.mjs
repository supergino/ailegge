// Memoria conversazionale condivisa da client e route API.
//
// Prima del 2026-11-05 il contesto era una sliding window di soli 20 messaggi
// (10 scambi utente/assistente) in /api/chat e 10 messaggi (5 scambi) in
// /api/chat-locale, con un secondo troncamento identico lato client. In pratica
// l'assistente "dimenticava" la conversazione dopo poche risposte.
//
// Qui la finestra è più ampia e soprattutto è governata da un budget di
// caratteri (~4 caratteri per token in italiano): così possiamo tenere molte
// più risposte senza rischiare di sfondare il contesto dei provider, e il
// fallback gratuito (Groq/OpenRouter, TPM ridotto) usa un budget separato e
// più prudente.

export const CHAT_MEMORY = {
  // Limite di sicurezza sul payload del client: il server riapplica comunque
  // il proprio budget per provider.
  client: { maxMessages: 500, maxChars: 120000, anchorFirst: true },

  // Gemini (provider primario): contesto ampio, ~15k token di cronologia.
  online: { maxMessages: 200, maxChars: 120000, anchorFirst: true },

  // Fallback gratuiti (Groq TPM 8.000/min, OpenRouter :free): budget ridotto
  // per lasciare spazio al system prompt e ai ~3k token di output.
  fallback: { maxMessages: 80, maxChars: 16000, anchorFirst: false },

  // Ollama locale (contesto 8k token di default): prudente ma ~3x rispetto
  // alla vecchia finestra di 10 messaggi.
  local: { maxMessages: 80, maxChars: 20000, anchorFirst: true },
}

const HARD_MESSAGE_LIMIT = 1000
const MIN_USEFUL_CHARS = 200

function positiveInt(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

/**
 * Limiti contesto con override opzionali via variabili d'ambiente.
 * Da chiamare solo lato server (le route API); sul client usa CHAT_MEMORY.
 */
export function getContextLimits() {
  const env = typeof process !== 'undefined' && process.env ? process.env : {}
  return {
    client: CHAT_MEMORY.client,
    online: {
      ...CHAT_MEMORY.online,
      maxMessages: positiveInt(env.CHAT_MEMORY_MESSAGES, CHAT_MEMORY.online.maxMessages),
      maxChars: positiveInt(env.CHAT_MEMORY_CHARS, CHAT_MEMORY.online.maxChars),
    },
    fallback: {
      ...CHAT_MEMORY.fallback,
      maxMessages: positiveInt(env.CHAT_MEMORY_FALLBACK_MESSAGES, CHAT_MEMORY.fallback.maxMessages),
      maxChars: positiveInt(env.CHAT_MEMORY_FALLBACK_CHARS, CHAT_MEMORY.fallback.maxChars),
    },
    local: {
      ...CHAT_MEMORY.local,
      maxMessages: positiveInt(env.CHAT_MEMORY_LOCAL_MESSAGES, CHAT_MEMORY.local.maxMessages),
      maxChars: positiveInt(env.CHAT_MEMORY_LOCAL_CHARS, CHAT_MEMORY.local.maxChars),
    },
  }
}

/**
 * Normalizza l'input non fidato proveniente dal client: scarta messaggi vuoti,
 * troppo lunghi o con forma inattesa e limita il numero massimo di elementi.
 */
export function normalizeMessages(rawMessages, maxMessageLen = 16000) {
  if (!Array.isArray(rawMessages)) return []
  return rawMessages
    .slice(-HARD_MESSAGE_LIMIT)
    .filter((m) => m && typeof m.text === 'string' && m.text.trim().length > 0 && m.text.length <= maxMessageLen)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      text: m.text,
    }))
}

/**
 * Costruisce la finestra di contesto da inviare al modello.
 *
 * - parte dai messaggi più recenti e risale finché c'è budget di caratteri;
 * - se un singolo messaggio supera il budget residuo, lo tronca invece di
 *   perdere tutto il contesto;
 * - con anchorFirst conserva anche il primo messaggio dell'utente (l'argomento
 *   originario della chat), così una conversazione lunga non perde il tema;
 * - garantisce che la sequenza inizi con un turno "user" (requisito Gemini).
 */
export function buildContextWindow(rawMessages, options = {}) {
  const {
    maxMessages = CHAT_MEMORY.online.maxMessages,
    maxChars = CHAT_MEMORY.online.maxChars,
    anchorFirst = true,
  } = options

  const messages = normalizeMessages(rawMessages)
  if (messages.length === 0) return []

  const hardWindow = messages.slice(-Math.max(1, maxMessages))
  const selected = []
  let used = 0

  for (let i = hardWindow.length - 1; i >= 0; i--) {
    const msg = hardWindow[i]
    const cost = msg.text.length
    const room = maxChars - used

    if (cost > room) {
      // Tronca solo se resta spazio utile; altrimenti fermati qui.
      if (room < MIN_USEFUL_CHARS) break
      selected.unshift({
        ...msg,
        text: msg.text.slice(0, room).trimEnd() + '\n\n[... messaggio precedente troncato per limite di contesto]',
      })
      used = maxChars
      break
    }

    selected.unshift(msg)
    used += cost
  }

  // Ancora il primo messaggio dell'utente per non perdere l'argomento iniziale.
  if (anchorFirst) {
    const firstUser = messages.find((m) => m.role === 'user')
    const alreadyIncluded = firstUser && selected.some((m) => m.role === 'user' && m.text === firstUser.text)
    if (firstUser && !alreadyIncluded) {
      const room = maxChars - used
      if (room >= MIN_USEFUL_CHARS) {
        const anchorText = firstUser.text.length <= room
          ? firstUser.text
          : firstUser.text.slice(0, Math.max(0, room - 60)).trimEnd() + '…'

        if (selected.length > 0 && selected[0].role === 'user') {
          // Evita due turni "user" consecutivi: fondi l'ancora nel primo turno utile.
          selected[0] = {
            role: 'user',
            text: `[Argomento iniziale della conversazione]\n${anchorText}\n\n[Continuazione della conversazione]\n${selected[0].text}`,
          }
        } else {
          selected.unshift({ role: 'user', text: `[Argomento iniziale della conversazione]\n${anchorText}` })
        }
      }
    }
  }

  // Gemini richiede che la cronologia inizi con un turno utente.
  while (selected.length > 0 && selected[0].role !== 'user') selected.shift()

  return selected
}

/**
 * Stima grezza dei token (utile per log e diagnostica, non per fatturazione).
 */
export function estimateTokens(messages) {
  const chars = (messages || []).reduce((total, m) => total + (m?.text?.length || 0), 0)
  return Math.ceil(chars / 4)
}
