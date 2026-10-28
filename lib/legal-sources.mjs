// Elenco unico delle fonti giuridiche UFFICIALI usate da IusMente.
//
// Un solo posto da aggiornare: prompt di routing del modello, enum dello schema,
// whitelist anti-phishing lato client, link alle fonti e domini per la ricerca Tavily.
//
// Regole:
// - `id` = dominio "logico" usato dal modello e salvato nelle risposte (senza `www`).
// - `url` = URL navigabile reale (per Gazzetta Ufficiale e Italgiure serve `www.`:
//   gli apex non hanno record DNS e non sono raggiungibili).
//   Nota: `www.italgiure.giustizia.it` invia una catena TLS incompleta; i browser la
//   accettano, ma un `fetch` server-side Node/Bun fallisce. Non usarlo per chiamate dirette.
// - Solo fonti istituzionali: parlamento, corti, autorità indipendenti, UE e Consiglio d'Europa.

export const DEFAULT_LEGAL_SOURCE = 'normattiva.it'

export const LEGAL_SOURCES = [
  // --- Normativa italiana ---
  {
    id: 'normattiva.it',
    nome: 'Normattiva',
    url: 'https://www.normattiva.it',
    ambito: 'italia',
    categoria: 'normativa',
    descrizione: 'Codici (civile, penale, procedura), Costituzione e testi normativi vigenti',
  },
  {
    id: 'gazzettaufficiale.it',
    nome: 'Gazzetta Ufficiale',
    url: 'https://www.gazzettaufficiale.it',
    ambito: 'italia',
    categoria: 'normativa',
    descrizione: 'Leggi, decreti legge, D.Lgs., D.P.R., D.M. e pubblicazione ufficiale degli atti',
  },

  // --- Giurisprudenza italiana ---
  {
    id: 'italgiure.giustizia.it',
    nome: 'Italgiure - Corte di cassazione',
    url: 'https://www.italgiure.giustizia.it',
    ambito: 'italia',
    categoria: 'giurisprudenza',
    descrizione: 'Sentenze e massime della Corte di cassazione',
  },
  {
    id: 'cortecostituzionale.it',
    nome: 'Corte costituzionale',
    url: 'https://www.cortecostituzionale.it',
    ambito: 'italia',
    categoria: 'giurisprudenza',
    descrizione: 'Sentenze e ordinanze della Corte costituzionale',
  },
  {
    id: 'giustizia-amministrativa.it',
    nome: 'Giustizia amministrativa',
    url: 'https://www.giustizia-amministrativa.it',
    ambito: 'italia',
    categoria: 'giurisprudenza',
    descrizione: 'Sentenze del Consiglio di Stato e dei TAR',
  },
  {
    id: 'corteconti.it',
    nome: 'Corte dei conti',
    url: 'https://www.corteconti.it',
    ambito: 'italia',
    categoria: 'giurisprudenza',
    descrizione: 'Sentenze e deliberazioni della Corte dei conti',
  },

  // --- Giurisprudenza europea e internazionale ---
  {
    id: 'curia.europa.eu',
    nome: 'Corte di giustizia dell\'Unione europea',
    url: 'https://curia.europa.eu',
    ambito: 'europa',
    categoria: 'giurisprudenza',
    descrizione: 'Sentenze e ordinanze della Corte di giustizia UE e del Tribunale UE',
  },
  {
    id: 'hudoc.echr.coe.int',
    nome: 'Corte europea dei diritti dell\'uomo (HUDOC)',
    url: 'https://hudoc.echr.coe.int',
    ambito: 'europa',
    categoria: 'giurisprudenza',
    descrizione: 'Sentenze e decisioni della Corte europea dei diritti dell\'uomo (CEDU)',
  },

  // --- Normativa UE ---
  {
    id: 'eur-lex.europa.eu',
    nome: 'EUR-Lex',
    url: 'https://eur-lex.europa.eu',
    ambito: 'europa',
    categoria: 'normativa',
    descrizione: 'Trattati (TFUE, TUE), regolamenti, direttive, decisioni e atti dell\'Unione europea',
  },

  // --- Autorità indipendenti ---
  {
    id: 'garanteprivacy.it',
    nome: 'Garante per la protezione dei dati personali',
    url: 'https://www.garanteprivacy.it',
    ambito: 'italia',
    categoria: 'autorita',
    descrizione: 'Provvedimenti, linee guida e sanzioni del Garante per la protezione dei dati personali',
  },
  {
    id: 'anticorruzione.it',
    nome: 'ANAC',
    url: 'https://www.anticorruzione.it',
    ambito: 'italia',
    categoria: 'autorita',
    descrizione: 'Delibere, linee guida e pareri dell\'ANAC (anticorruzione, contratti pubblici)',
  },
  {
    id: 'agcm.it',
    nome: 'AGCM',
    url: 'https://www.agcm.it',
    ambito: 'italia',
    categoria: 'autorita',
    descrizione: 'Provvedimenti dell\'AGCM (concorrenza e tutela dei consumatori)',
  },
  {
    id: 'agcom.it',
    nome: 'AGCOM',
    url: 'https://www.agcom.it',
    ambito: 'italia',
    categoria: 'autorita',
    descrizione: 'Delibere e regolamenti dell\'AGCOM (comunicazioni)',
  },
  {
    id: 'consob.it',
    nome: 'CONSOB',
    url: 'https://www.consob.it',
    ambito: 'italia',
    categoria: 'autorita',
    descrizione: 'Regolamenti e provvedimenti della CONSOB (mercati finanziari)',
  },
  {
    id: 'bancaditalia.it',
    nome: 'Banca d\'Italia',
    url: 'https://www.bancaditalia.it',
    ambito: 'italia',
    categoria: 'autorita',
    descrizione: 'Circolari, provvedimenti e orientamenti della Banca d\'Italia',
  },
  {
    id: 'agenziaentrate.gov.it',
    nome: 'Agenzia delle Entrate',
    url: 'https://www.agenziaentrate.gov.it',
    ambito: 'italia',
    categoria: 'autorita',
    descrizione: 'Circolari, risoluzioni e risposte a interpello dell\'Agenzia delle Entrate',
  },
]

export const LEGAL_DOMAINS = LEGAL_SOURCES.map((s) => s.id)
export const LEGAL_DOMAIN_SET = new Set(LEGAL_DOMAINS)

const BY_ID = new Map(LEGAL_SOURCES.map((s) => [s.id, s]))

// Normalizza un valore restituito dal modello ("WWW.Normattiva.it", "https://...") nell'id canonico.
// Restituisce null se il dominio non è nell'elenco ufficiale.
export function normalizzaSito(value) {
  if (typeof value !== 'string') return null
  const raw = value.trim().toLowerCase()
  if (!raw) return null
  const host = raw
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')
    .replace(/\.$/, '')
  return LEGAL_DOMAIN_SET.has(host) ? host : null
}

export function isLegalSource(value) {
  return normalizzaSito(value) !== null
}

export function getLegalSource(value) {
  const id = normalizzaSito(value)
  return id ? BY_ID.get(id) : undefined
}

// URL navigabile della fonte (null se il dominio non è ufficiale).
export function legalSourceUrl(value) {
  return getLegalSource(value)?.url ?? null
}

// Righe della tabella di routing da inserire nel system prompt.
export function legalSourcesPromptRows() {
  return LEGAL_SOURCES.map((s) => `  | ${s.descrizione} | "${s.id}" |`).join('\n')
}

// Domini per `include_domains` di Tavily; in modalità "solo Italia" esclude UE e CEDU.
export function tavilyDomains(soloItalia) {
  return LEGAL_SOURCES.filter((s) => !soloItalia || s.ambito === 'italia').map((s) => s.id)
}
