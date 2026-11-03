export const GEMINI_MODEL = 'gemini-3.5-flash-lite'
export const GEMINI_MODEL_LABEL = 'Gemini 3.5 Flash-Lite'

export const NVIDIA_MODEL = 'nvidia/nemotron-3.5-super-vl-120b-a12b'

// Groq: il validatore anti-allucinazione e il primo fallback di generazione sono
// due modelli distinti. Centralizzati qui perché li usano /api/chat, /api/status
// e il watchdog: un solo punto da aggiornare quando Groq ritira un modello.
export const GROQ_VALIDATOR_MODEL = 'qwen/qwen3.8-27b'
export const GROQ_VALIDATOR_LABEL = 'Qwen 3.8 27B'
export const GROQ_FALLBACK_MODEL = 'openai/gpt-oss-20b'
export const GROQ_FALLBACK_LABEL = 'gpt-oss-20b'

// Ordine di preferenza: prima gli endpoint fissi (modelli noti, contesto ampio),
// il router generico `openrouter/free` resta l'ultima risorsa della catena.
export const OPENROUTER_NVIDIA_MODELS = [
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3.5-super-vl:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'openrouter/free',
]
