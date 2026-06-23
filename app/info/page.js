import pkg from '../../package.json'
import Link from 'next/link'

export const metadata = {
  title: 'Informazioni — IusMente',
  description: 'Documentazione completa di IusMente: architettura, modelli AI, RAG su normativa italiana, upload documenti, modalità di risposta, gestione errori e privacy.',
}

export default function InfoPage() {
  return (
    <main className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] dark:bg-black dark:text-[#f5f5f7]">
      <article className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-14">

        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[13px] text-[#0071e3] hover:underline"
        >
          ← Torna alla chat
        </Link>

        <header className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b]">
            IusMente · v{pkg.version}
          </p>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight sm:text-[40px]">
            Cos'è IusMente
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#6e6e73] sm:text-[17px]">
            IusMente è un assistente virtuale basato su intelligenza artificiale,
            progettato specificamente per studenti di giurisprudenza. Il suo scopo
            è affiancare lo studio del diritto italiano ed europeo, offrendo
            spiegazioni, quiz, simulazioni d'esame e analisi di documenti giuridici.
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#6e6e73] sm:text-[17px]">
            Non è un consulente legale: le risposte che fornisce hanno finalità
            esclusivamente didattica e non sostituiscono la consultazione diretta
            delle fonti ufficiali, del tuo docente o di un professionista legale.
          </p>
        </header>

        {/* ==================== INTERFACCIA ==================== */}
        <Section title="Interfaccia utente">
          <p>
            L'interfaccia di IusMente è una chat a messaggi in stile Apple, con
            design vetro smerigliato, bordi arrotondati, tipografia San Francisco
            e supporto completo per i dispositivi iOS (safe-area per notch e home
            indicator). Di seguito tutti gli elementi che compongono l'interfaccia.
          </p>

          <h3 className="text-[16px] font-semibold">Header superiore</h3>
          <p>
            L'header contiene, da sinistra a destra:
          </p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Logo e nome</strong> — visibili solo su mobile (schermi &lt;768px),
              con icona <Code>Scale</Code> (bilancia della giustizia) in{' '}
              <Code>#0071e3</Code> e scritta "IusMente".
            </li>
            <li>
              <strong>Pillola dei modelli</strong> — visibile solo su desktop, mostra
              un pallino verde animato (<Code>animate-ping</Code>) e la dicitura
              "Gemini 2.5 Flash-Lite · genera · Llama 3.3 70B · valida". Al passaggio
              del mouse mostra il tooltip: "Gemini 2.5 Flash-Lite genera la risposta ·
              Groq Llama 3.3 70B la valida per ridurre le allucinazioni". All'interno
              della pillola c'è un link a questa pagina (<Code>Info</Code> icona).
            </li>
            <li>
              <strong>Pulsanti destra</strong> — su mobile: cronologia (icona orologio
              con badge numerico, limitato a "9+"), cambio tema (sole/luna), nuova chat
              (<Code>+</Code>). Su desktop questi controlli sono nella barra laterale.
            </li>
          </ul>

          <h3 className="text-[16px] font-semibold">Barra laterale (desktop)</h3>
          <ul className="list-disc pl-5">
            <li>Larghezza <Code>220px</Code>, sfondo scuro/chiaro, bordo destro.</li>
            <li>Logo "IusMente" con icona della bilancia.</li>
            <li>Pulsante "Nuova chat" (<Code>Plus</Code>) a tutta larghezza, colore blue <Code>#0071e3</Code>.</li>
            <li>Sezione "Recenti" con l'elenco delle conversazioni salvate.</li>
            <li>In fondo: pulsante cambio tema con etichetta "Chiaro"/"Scuro" e icona sole/luna.</li>
          </ul>

          <h3 className="text-[16px] font-semibold">Pannello di controllo</h3>
          <p>
            Sotto l'header si trovano due schede affiancate (griglia a 2 colonne su
            desktop, singola colonna su mobile), ciascuna con bordo arrotondato
            (<Code>rounded-2xl</Code>) e sfondo semitrasparente:
          </p>
          <ul className="list-disc pl-5">
            <li>
              <strong>CONTESTO GIURIDICO</strong> — selettore a due opzioni con
              bandiere (Italia 🇮🇹 e UE 🇪🇺 in emoji Unicode):
              "Solo leggi italiane" (sottotitolo: "No UE, no CEDU") e "Includi UE
              e internazionale" (sottotitolo: "Trattati, CGUE, CEDU").
            </li>
            <li>
              <strong>MODALITÀ DI RISPOSTA</strong> — selettore a due opzioni:
              "Assistenza studio" (sottotitolo: "Spiegazioni, quiz, simulazioni")
              e "Ambito ufficiale legislativo" (sottotitolo: "Come in commissione d'esame").
            </li>
          </ul>
          <p>
            Entrambi i selettori usano il pattern <Code>SegmentedControl</Code>:
            l'opzione attiva ha sfondo blu <Code>#0071e3</Code> con testo bianco
            e ombra; l'opzione inattiva ha colore muted.
          </p>

          <h3 className="text-[16px] font-semibold">Stato vuoto (nessun messaggio)</h3>
          <p>
            Quando non ci sono ancora messaggi, viene mostrata una schermata
            iniziale con:
          </p>
          <ul className="list-disc pl-5">
            <li>Icona grande della bilancia (64x64 px, contenitore con angoli <Code>rounded-[22px]</Code>).</li>
            <li>Titolo dinamico in base alla modalità selezionata.</li>
            <li>Testo descrittivo (es. "Spiegazioni, quiz e simulazioni per prepararti agli esami.").</li>
            <li>Tre chip suggeriti, cliccabili per popolare il campo input:
              <ol className="list-decimal pl-5 mt-1">
                <li>"Spiega la responsabilità extracontrattuale"</li>
                <li>"Quiz su Diritto Privato"</li>
                <li>"Differenza tra reato e contravvenzione"</li>
              </ol>
            </li>
          </ul>

          <h3 className="text-[16px] font-semibold">Area chat</h3>
          <p>
            I messaggi vengono visualizzati in bolle con larghezza massima del
            88% su mobile e 80% su desktop:
          </p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Messaggi utente</strong>: allineati a destra, sfondo blu
              (<Code>bg-[#0071e3] text-white</Code>), angoli <Code>rounded-[20px]</Code>.
            </li>
            <li>
              <strong>Messaggi assistente</strong>: allineati a sinistra, sfondo
              scopo/chiaro con bordo e ombra, angoli <Code>rounded-[20px]</Code>.
            </li>
            <li>
              <strong>Pulsante copia</strong>: appare al passaggio del mouse
              (<Code>group-hover:opacity-100</Code>) sotto ogni risposta dell'assistente,
              angolo in basso a destra. Dopo il click mostra un segno di spunta
              verde per 2 secondi, poi torna all'icona di copia.
            </li>
            <li>
              <strong>Sezione fonti</strong>: sotto ogni risposta assistente che
              include fonti, separata da un bordo superiore, con icona <Code>BookOpen</Code>
              e intestazione "FONTI". Ogni fonte è un link esterno al portale normativo,
              con dominio mostrato. Supporta retrocompatibilità: fonti salvate in
              formato vecchio (stringa semplice) o nuovo (oggetto <Code>{'{ nome, sito }'}</Code>).
            </li>
            <li>
              <strong>Indicatore di caricamento</strong>: tre pallini animati con
              <Code>animate-pulse</Code> e <Code>animationDelay</Code> sfalsato di
              150ms, accompagnati dalla scritta "Elaborazione…".
            </li>
            <li>
              <strong>Auto-scroll</strong>: la chat scorre automaticamente verso il
              basso a ogni nuovo messaggio con <Code>scrollIntoView({'{ behavior: "smooth" }'})</Code>.
            </li>
          </ul>

          <h3 className="text-[16px] font-semibold">Area input</h3>
          <p>
            Il footer contiene il form di input, in stile iMessage:
          </p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Barra file allegato</strong> — se un documento è stato caricato,
              appare sopra l'input una pillola con icona <Code>FileText</Code> in blu,
              il nome del file (troncato) e un pulsante <Code>✕</Code> per rimuoverlo.
            </li>
            <li>
              <strong>Pulsante allega file</strong> — icona <Code>Paperclip</Code>
              (o tre pallini animati durante il caricamento), apre un selettore file
              nativo nascosto (<Code>&lt;input type="file" accept=".txt,.pdf" /&gt;</Code>).
              Disabilitato durante l'invio o il caricamento.
            </li>
            <li>
              <strong>Campo testo</strong> — input trasparente, font 15px, placeholder
              adattivo: "Scrivi la tua domanda…" normalmente, "Poni una domanda sul documento…"
              quando un file è allegato.
            </li>
            <li>
              <strong>Pulsante invia</strong> — cerchio blu 42px, disabilitato se
              input vuoto, in caricamento o in upload. Mostra l'icona <Code>Send</Code>.
            </li>
          </ul>

          <h3 className="text-[16px] font-semibold">Cronologia mobile (bottom sheet)</h3>
          <p>
            Su mobile (&lt;768px), la cronologia si apre come pannello dal basso:
          </p>
          <ul className="list-disc pl-5">
            <li>Sfondo scuro semitrasparente (<Code>bg-black/40</Code>) con <Code>backdrop-blur</Code>.</li>
            <li>Pannello con animazione <Code>animate-slide-up</Code>, angoli <Code>rounded-t-[20px]</Code>.</li>
            <li>Maniglia di trascinamento in alto (barra orizzontale 9x4px arrotondata).</li>
            <li>Elenco conversazioni in formato compatto (<Code>max-h-[38vh]</Code> scrollabile).</li>
            <li>Si chiude toccando lo sfondo o il pulsante <Code>✕</Code>.</li>
            <li>
              Quando aperto, il body ha <Code>overflow: hidden</Code> per evitare
              lo scroll di sfondo.
            </li>
          </ul>

          <h3 className="text-[16px] font-semibold">Footer</h3>
          <p>
            Sotto l'area input, un footer minimalista mostra: "Realizzato da Andrea 🐻"
            (l'emoji ha <Code>aria-hidden="true"</Code>), un separatore <Code>·</Code>,
            e la versione dell'app in stile monospace (es. <Code>v{pkg.version}</Code>).
          </p>
        </Section>

        {/* ==================== CRONOLOGIA ==================== */}
        <Section title="Cronologia delle conversazioni">
          <p>
            IusMente salva automaticamente ogni conversazione nel{' '}
            <em>localStorage</em> del browser, sotto la chiave{' '}
            <Code>iusmente_cronologia</Code>. Le conversazioni persistono anche
            dopo aver chiuso e riaperto il browser.
          </p>

          <h3 className="text-[16px] font-semibold">Formato di salvataggio</h3>
          <p>
            Ogni sessione salvata è un oggetto JSON con:
          </p>
          <ul className="list-disc pl-5">
            <li><Code>id</Code> — timestamp <Code>Date.now()</Code> come identificatore univoco.</li>
            <li><Code>titolo</Code> — prima domanda dell'utente, troncata a 40 caratteri (con ellissi se più lunga). Se non ci sono messaggi utente, viene usato "Nuova consultazione".</li>
            <li><Code>data</Code> — data formattata in locale italiano (es. "15 giu, 14:30").</li>
            <li><Code>chat</Code> — array dei messaggi con <Code>role</Code>, <Code>text</Code> e opzionalmente <Code>fonti</Code>.</li>
          </ul>

          <h3 className="text-[16px] font-semibold">Operazioni disponibili</h3>
          <ul className="list-disc pl-5">
            <li><strong>Caricare</strong> una conversazione: clicca sul suo titolo nella cronologia.</li>
            <li><strong>Eliminare</strong>: clicca sul pulsante <Code>✕</Code> rosso a destra dell'elemento.</li>
            <li><strong>Nuova chat</strong>: resetta messaggi, input, documento allegato e chiude la cronologia.</li>
          </ul>
          <p className="text-[13px] text-[#86868b]">
            La deduplicazione evita duplicati: quando riprendi una conversazione
            e invii un nuovo messaggio, la vecchia entry viene aggiornata
            sfruttando l'ID univoco della sessione (<Code>currentSessionId</Code>).
          </p>
        </Section>

        {/* ==================== ARCHITETTURA ==================== */}
        <Section title="Architettura: pipeline a due modelli">
          <p>
            Ogni risposta è il risultato di una pipeline a tre stadi, progettata
            per massimizzare l'accuratezza giuridica e ridurre le allucinazioni
            (affermazioni inventate ma plausibili) tipiche dei modelli linguistici
            in domini specialistici.
          </p>

          <h3 className="text-[16px] font-semibold">1. Generazione — Gemini 2.5 Flash-Lite</h3>
          <p>
            La domanda viene inviata a <Code>gemini-2.5-flash-lite</Code> di Google
            AI Studio tramite l'SDK <Code>@google/genai</Code>. Il prompt di sistema
            è composto da questi blocchi:
          </p>
          <ol className="list-decimal pl-5">
            <li>
              <strong>Istruzioni di ruolo</strong> (Tutor o Professore) — definiscono
              tono, stile, comportamento didattico o formale.
            </li>
            <li>
              <strong>Istruzioni giurisdizionali</strong> — specificano se limitarsi
              al diritto italiano o includere UE/internazionale.
            </li>
            <li>
              <strong>Documento allegato</strong> (opzionale) — il testo del file
              caricato, incapsulato tra marcatori "INIZIO DOCUMENTO" / "FINE DOCUMENTO".
            </li>
            <li>
              <strong>Regole sulle fonti</strong> (<Code>SOURCE_RULES</Code>) —
              obbligano il modello a citare solo fonti reali, con dominio specifico.
            </li>
            <li>
              <strong>Contesto RAG</strong> (opzionale) — risultati della ricerca
              Tavily, formattati come "CONTESTO NORMATIVO RECUPERATO DA WEB".
            </li>
          </ol>
          <p>
            Gemini risponde in formato JSON strutturato, con schema vincolato:
          </p>
          <ul className="list-disc pl-5">
            <li><Code>text</Code> (stringa) — il testo della risposta, senza elenco fonti.</li>
            <li><Code>fonti</Code> (array di oggetti) — ogni fonte ha <Code>nome</Code> (stringa descrittiva) e <Code>sito</Code> (uno dei quattro domini ammessi).</li>
          </ul>
          <p>
            Se la risposta di Gemini non è JSON valido, il sistema usa il testo
            grezzo e assegna una fonte di default: "{'{'}nome: 'Fonte non specificata', sito: 'normattiva.it'{'}'}".
          </p>

          <h3 className="text-[16px] font-semibold">2. Validazione — Llama 3.3 70B su Groq</h3>
          <p>
            La risposta generata viene inviata a <Code>llama-3.3-70b-versatile</Code>{' '}
            su Groq Cloud, con temperatura 0.1 (minima creatività) e formato
            risposta <Code>json_object</Code>. Il validatore riceve:
          </p>
          <ul className="list-disc pl-5">
            <li>La domanda originale dell'utente.</li>
            <li>Il testo della risposta generata.</li>
            <li>L'elenco delle fonti citate.</li>
            <li>Il contesto (modalità e ambito giurisdizionale).</li>
          </ul>
          <p>
            Llama verifica che le fonti esistano, che le affermazioni giuridiche
            corrispondano al contenuto noto delle fonti, che non ci siano
            riferimenti inventati e che la risposta sia coerente con l'ambito.
            Restituisce un JSON con:
          </p>
          <ul className="list-disc pl-5">
            <li><Code>valido</Code> (boolean) — se la risposta supera la verifica.</li>
            <li><Code>problemi</Code> (array di stringhe) — descrizione degli eventuali problemi rilevati.</li>
            <li><Code>confidenza</Code> (0.0–1.0) — livello di confidenza nella valutazione.</li>
          </ul>

          <h3 className="text-[16px] font-semibold">3. Rigenerazione condizionale</h3>
          <p>
            Se Llama segnala problemi (<Code>valido: false</Code> e{' '}
            <Code>problemi.length &gt; 0</Code>), il sistema reinvoca Gemini
            passando le criticità come nota di rigenerazione. Il secondo prompt
            include la nota: "Il validatore ha rilevato i seguenti problemi nella
            tua prima risposta. Riscrivi la risposta tenendone conto." La risposta
            revisionata sostituisce la precedente, con flag <Code>rigenerato: true</Code>.
          </p>
          <p className="text-[13px] text-[#86868b]">
            Se Groq non è configurato (GROQ_API_KEY mancante) o non risponde,
            la validazione viene saltata (flag <Code>skipped: true</Code>).
          </p>
        </Section>

        {/* ==================== RETRY LOGIC ==================== */}
        <Section title="Meccanismo di retry (Gemini)">
          <p>
            Il sistema tenta automaticamente di recuperare errori temporanei di
            Gemini con un meccanismo di retry con back-off esponenziale:
          </p>
          <ul className="list-disc pl-5">
            <li><strong>Retry massimi:</strong> 2 (3 tentativi totali).</li>
            <li><strong>Casi ritentabili:</strong> errore 503 (servizio non disponibile) e 429 (rate limit) — MA solo se il messaggio d'errore NON contiene "quota", "exceeded" o "RESOURCE_EXHAUSTED".</li>
            <li><strong>Casi NON ritentabili:</strong> tutti gli altri errori; 429 con superamento quota.</li>
            <li><strong>Back-off:</strong> <Code>800ms * 2^tentativo</Code> (800ms, 1.6s).</li>
            <li>Ogni tentativo viene loggato come <Code>[IusMente/Gemini] tentativo N fallito (status=X), riprovo tra Yms</Code>.</li>
          </ul>
        </Section>

        {/* ==================== RAG ==================== */}
        <Section title="RAG — Ricerca normativa in tempo reale (Tavily)">
          <p>
            Quando il contesto giuridico è impostato su "Solo leggi italiane" e
            il messaggio è di almeno 20 caratteri, IusMente esegue una ricerca
            web tramite l'API di Tavily, limitata ai domini normativi italiani.
          </p>

          <h3 className="text-[16px] font-semibold">Configurazione Tavily</h3>
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                <th className="py-2 pr-3 font-semibold">Parametro</th>
                <th className="py-2 pr-3 font-semibold">Valore</th>
              </tr>
            </thead>
            <tbody className="text-[#6e6e73] dark:text-[#a1a1a6]">
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">Endpoint</td>
                <td className="py-2 pr-3 font-mono text-[13px]">https://api.tavily.com/search</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">Metodo</td>
                <td className="py-2 pr-3 font-mono text-[13px]">POST</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">max_results</td>
                <td className="py-2 pr-3 font-mono text-[13px]">4</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">search_depth</td>
                <td className="py-2 pr-3 font-mono text-[13px]">basic (1 credito)</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">topic</td>
                <td className="py-2 pr-3 font-mono text-[13px]">general</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">Timeout</td>
                <td className="py-2 pr-3 font-mono text-[13px]">8000 ms (AbortController)</td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-[16px] font-semibold">Domini inclusi nella ricerca</h3>
          <ul className="list-disc pl-5">
            <li><Code>normattiva.it</Code> — Codice Civile, Codice Penale, Costituzione, codici di procedura, leggi vigenti.</li>
            <li><Code>gazzettaufficiale.it</Code> — leggi ordinarie, decreti legislativi, decreti legge, D.P.R., D.M., regolamenti.</li>
            <li><Code>italgiure.giustizia.it</Code> — sentenze, massime e orientamenti della Corte di Cassazione.</li>
          </ul>

          <h3 className="text-[16px] font-semibold">Condizioni di attivazione</h3>
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                <th className="py-2 pr-3 font-semibold">Condizione</th>
                <th className="py-2 pr-3 font-semibold">Comportamento</th>
              </tr>
            </thead>
            <tbody className="text-[#6e6e73] dark:text-[#a1a1a6]">
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3"><Code>soloItalia = true</Code>, messaggio ≥ 20 caratteri, API key presente</td>
                <td className="py-2 pr-3">Ricerca eseguita normalmente</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">Messaggio &lt; 20 caratteri</td>
                <td className="py-2 pr-3"><Code>motivo: 'messaggio_troppo_corto'</Code></td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3"><Code>soloItalia = false</Code></td>
                <td className="py-2 pr-3"><Code>motivo: 'ambito_ue'</Code></td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">Chiave API mancante</td>
                <td className="py-2 pr-3"><Code>motivo: 'api_key_mancante'</Code></td>
              </tr>
              <tr>
                <td className="py-2 pr-3">Timeout (8s) o errore API</td>
                <td className="py-2 pr-3"><Code>motivo: 'timeout'</Code> o <Code>'errore'</Code>, nessun throw</td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-[16px] font-semibold">Formattazione nel prompt</h3>
          <p>
            Ogni risultato viene formattato come blocco <Code>[N] Titolo \n URL: ... \n Estratto: ...</Code>.
            Il titolo è troncato a 200 caratteri, il contenuto a 600 caratteri.
            I risultati sono preceduti dall'istruzione: "Usa i seguenti estratti come
            FONTE PRIMARIA per articoli di legge, commi e riferimenti normativi italiani."
          </p>
          <p className="text-[13px] text-[#86868b]">
            Tavily non viene interrogato in ambito UE perché la configurazione
            dei domini include solo portali italiani. L'errore o il timeout di
            Tavily non bloccano mai la chat: il sistema degrada silenziosamente
            e procede senza contesto RAG.
          </p>
        </Section>

        {/* ==================== UPLOAD ==================== */}
        <Section title="Caricamento documenti (.txt e .pdf)">
          <p>
            Puoi allegare un file di testo o un PDF per analizzarlo con l'assistente.
            Il pulsante <Code>📎</Code> accanto al campo di input apre il selettore
            file nativo del browser.
          </p>

          <h3 className="text-[16px] font-semibold">Flusso di elaborazione</h3>
          <ol className="list-decimal pl-5">
            <li>
              <strong>Selezione</strong>: scegli un file <Code>.txt</Code> o{' '}
              <Code>.pdf</Code> (max 10 MB). Altri formati vengono rifiutati
              con un alert.
            </li>
            <li>
              <strong>Lettura</strong>:
              <ul className="list-disc pl-5 mt-1">
                <li><Code>.txt</Code>: letto direttamente nel browser come UTF-8 via <Code>file.text()</Code>.</li>
                <li><Code>.pdf</Code>: letto come <Code>ArrayBuffer</Code>, convertito in stringa binaria con ciclo <Code>for</Code> su <Code>Uint8Array</Code>, codificato in base64 con <Code>btoa()</Code>, inviato a <Code>POST /api/upload</Code>.</li>
              </ul>
            </li>
            <li>
              <strong>Estrazione lato server</strong> (<Code>/api/upload</Code>):
              <ul className="list-disc pl-5 mt-1">
                <li>Decodifica base64 → Buffer Node.js.</li>
                <li><Code>.txt</Code>: decodifica UTF-8 diretta.</li>
                <li><Code>.pdf</Code>: estrazione testo con la libreria <Code>pdf-parse</Code> (import dinamico).</li>
                <li>Se il testo supera 50.000 caratteri, viene troncato con nota "[... Documento troncato per lunghezza eccessiva]".</li>
              </ul>
            </li>
            <li>
              <strong>Restituzione</strong>: il server restituisce <Code>{'{ text, fileName }'}</Code>.
            </li>
            <li>
              <strong>Contestualizzazione</strong>: il testo estratto viene iniettato
              nel prompt di sistema di Gemini come "DOCUMENTO ALLEGATO", tra i marcatori
              "INIZIO DOCUMENTO" e "FINE DOCUMENTO". Il modello è istruito a usarlo
              come contesto primario per le domande pertinenti.
            </li>
          </ol>

          <h3 className="text-[16px] font-semibold">Persistenza e rimozione</h3>
          <p>
            Il documento resta allegato alla conversazione finché non lo rimuovi
            manualmente con il pulsante <Code>✕</Code> nella barra sopra l'input.
            Puoi fare tutte le domande che vuoi sul suo contenuto senza dover
            ricaricare il file. Il documento viene inviato con ogni messaggio
            al backend.
          </p>

          <h3 className="text-[16px] font-semibold">Limiti</h3>
          <ul className="list-disc pl-5">
            <li>Dimensione massima: 10 MB.</li>
            <li>Testo massimo elaborabile: 50.000 caratteri (troncamento).</li>
            <li>PDF con scansioni (immagini) non supportati: il testo deve essere selezionabile.</li>
            <li>Il file non viene memorizzato sul server: il testo estratto è restituito al browser e inviato al modello solo al momento dell'invio del messaggio.</li>
            <li>Errori di elaborazione: loggati come <Code>[IusMente/Upload] errore:</Code>, con alert all'utente.</li>
          </ul>
        </Section>

        {/* ==================== MODALITÀ ==================== */}
        <Section title="Le due modalità di risposta">
          <p>
            Il selettore "Modalità di risposta" cambia completamente il prompt
            di sistema, non solo il tono. Ogni modalità ha parametri di
            generazione dedicati e regole comportamentali distinte.
          </p>

          <h3 className="text-[16px] font-semibold">Assistenza studio (Tutor)</h3>
          <p>
            Persona: "IusMente Tutor", un mentore giuridico per studenti universitari.
            Modalità predefinita, ottimizzata per lo studio quotidiano.
          </p>
          <ul className="list-disc pl-5">
            <li>Si rivolge con il "tu", in modo caloroso e incoraggiante.</li>
            <li>Spiega concetti difficili con parole semplici, esempi e analogie.</li>
            <li>Può proporre quiz, schemi riassuntivi e simulazioni d'esame (3-4 domande).</li>
            <li>Può usare emoji pertinenti come 📚 ✅ con moderazione.</li>
            <li>Corregge errori con gentilezza, spiegando il perché.</li>
            <li>Conclude con suggerimenti pratici per il prossimo passo di studio.</li>
            <li><strong>Temperatura:</strong> 0.75 (maggiore creatività nelle spiegazioni).</li>
            <li><strong>Top-p:</strong> 0.95 (campionamento più diversificato).</li>
          </ul>

          <h3 className="text-[16px] font-semibold">Ambito ufficiale legislativo (Professore)</h3>
          <p>
            Persona: "IusMente Professore", un docente universitario in sede
            d'esame. Ottimizzata per verifiche e simulazioni d'esame formali.
          </p>
          <ul className="list-disc pl-5">
            <li>Usa il "Lei" o forme impersonali ("si osserva", "va rilevato").</li>
            <li>Registro accademico elevato, asettico e distaccato.</li>
            <li>Terminologia giuridica corretta ("fattispecie", "sussunzione", "ratio legis").</li>
            <li>Vietato: emoji, tono colloquiale, incoraggiamenti, linguaggio semplificato.</li>
            <li>Cita articoli e commi con rigore letterale.</li>
            <li>Struttura dottrinale: premessa, in diritto, profili critici, conclusione.</li>
            <li>Non genera quiz o simulazioni interattive (rimanda alla modalità Tutor).</li>
            <li><strong>Temperatura:</strong> 0.15 (massima precisione e ripetibilità).</li>
            <li><strong>Top-p:</strong> 0.85 (campionamento più stretto e deterministico).</li>
          </ul>
        </Section>

        {/* ==================== GIURISDIZIONE ==================== */}
        <Section title="Filtro giurisdizionale">
          <p>
            Il selettore "Contesto giuridico" determina l'ambito delle fonti che
            il modello può citare, con bandiere identificative (Italia 🇮🇹 e
            Unione Europea 🇪🇺 in emoji Unicode):
          </p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Solo leggi italiane</strong> — il modello è limitato al
              diritto interno italiano. Attiva anche la ricerca RAG su Tavily
              per ancorare le risposte a fonti aggiornate.
            </li>
            <li>
              <strong>Includi UE e internazionale</strong> — integra diritto UE
              (TFUE, TUE, regolamenti, direttive), giurisprudenza CGUE e CEDU.
            </li>
          </ul>
          <p>
            Il filtro agisce esclusivamente come istruzione testuale nel prompt
            di sistema. Non esiste un filtro tecnico a livello di database:
            è il metodo più trasparente per un LLM, perché evita di promettere
            un'esclusione che non può garantire architetturalmente.
          </p>
        </Section>

        {/* ==================== FONTI ==================== */}
        <Section title="Gestione delle fonti giuridiche">
          <p>
            Il prompt di sistema (<Code>SOURCE_RULES</Code>) impone regole
            tassative per la citazione delle fonti. Ogni risposta deve includere
            almeno una fonte; la sezione fonti non deve comparire nel testo
            della risposta ma esclusivamente nel campo JSON dedicato.
          </p>

          <h3 className="text-[16px] font-semibold">Tabella di routing (hardcoded nel prompt)</h3>
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                <th className="py-2 pr-3 font-semibold">Tipo di fonte</th>
                <th className="py-2 pr-3 font-semibold">Dominio</th>
              </tr>
            </thead>
            <tbody className="text-[#6e6e73] dark:text-[#a1a1a6]">
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">Codice Civile, Codice Penale, Costituzione, altri codici</td>
                <td className="py-2 pr-3 font-mono text-[13px]">normattiva.it</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">Leggi speciali, D.Lgs., D.L., D.P.R., D.M., leggi ordinarie</td>
                <td className="py-2 pr-3 font-mono text-[13px]">gazzettaufficiale.it</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">Sentenze Corte di Cassazione, massime</td>
                <td className="py-2 pr-3 font-mono text-[13px]">italgiure.giustizia.it</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">Trattati UE, TFUE, TUE, regolamenti/direttive UE, CGUE, CEDU</td>
                <td className="py-2 pr-3 font-mono text-[13px]">eur-lex.europa.eu</td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-[16px] font-semibold">Normalizzazione lato server</h3>
          <p>
            La funzione <Code>normalizzaFonti()</Code> processa le fonti ricevute
            da Gemini prima di restituirle al frontend:
          </p>
          <ul className="list-disc pl-5">
            <li>Le fonti in formato stringa vengono convertite in oggetti con <Code>sito: 'normattiva.it'</Code> come default.</li>
            <li>Le fonti in formato oggetto vengono validate: <Code>nome</Code> deve essere una stringa non vuota, <Code>sito</Code> deve essere uno dei quattro domini ammessi (insieme <Code>SITES_AMMESSI</Code>).</li>
            <li>Se <Code>sito</Code> non è valido, viene sostituito con <Code>'normattiva.it'</Code>.</li>
            <li>Elementi nulli o non validi vengono filtrati.</li>
          </ul>

          <h3 className="text-[16px] font-semibold">Visualizzazione nella chat</h3>
          <p>
            Le fonti sono mostrate sotto ogni risposta in una sezione separata
            da bordo, con icona <Code>BookOpen</Code> e intestazione "FONTI".
            Ogni fonte è un link che apre <Code>https://{'{sito}'}</Code> in una
            nuova scheda (<Code>target="_blank" rel="noopener noreferrer"</Code>).
            Il sistema non genera deep-link perché i modelli generativi producono
            URL specifici inaffidabili.
          </p>
        </Section>

        {/* ==================== TEMA ==================== */}
        <Section title="Tema chiaro e scuro">
          <p>
            IusMente supporta due temi: scuro (predefinito, sfondo nero
            <Code>#000</Code> e testo <Code>#f5f5f7</Code>) e chiaro (sfondo
            <Code>#fbfbfd</Code> e testo <Code>#1d1d1f</Code>). Il cambio tema
            è disponibile:
          </p>
          <ul className="list-disc pl-5">
            <li><strong>Desktop:</strong> pulsante in fondo alla barra laterale sinistra, con icona sole/luna ed etichetta "Chiaro"/"Scuro".</li>
            <li><strong>Mobile:</strong> pulsante nell'header superiore, icona sola.</li>
          </ul>
          <p>
            Il design segue lo stile Apple: sfondi in vetro smerigliato
            (<Code>backdrop-filter: saturate(180%) blur(20px)</Code>),
            angoli arrotondati generosi, scrollbar sottile (6px) e selezione
            testo in blue Apple (<Code>rgba(0, 113, 227, 0.25)</Code>).
          </p>
        </Section>

        {/* ==================== API ==================== */}
        <Section title="API e configurazioni tecniche">
          <h3 className="text-[16px] font-semibold">Endpoint</h3>
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                <th className="py-2 pr-3 font-semibold">Endpoint</th>
                <th className="py-2 pr-3 font-semibold">Metodo</th>
                <th className="py-2 pr-3 font-semibold">Input</th>
                <th className="py-2 pr-3 font-semibold">Output</th>
              </tr>
            </thead>
            <tbody className="text-[#6e6e73] dark:text-[#a1a1a6]">
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">/api/chat</td>
                <td className="py-2 pr-3">POST</td>
                <td className="py-2 pr-3"><Code>{'{ message, soloItalia, modalitaTutor, documentContext?, documentName? }'}</Code></td>
                <td className="py-2 pr-3">JSON con <Code>text</Code>, <Code>fonti</Code>, <Code>modalita</Code>, <Code>modelli</Code>, <Code>validazione</Code>, <Code>tavily</Code>, <Code>documentContext</Code>, <Code>documentName</Code></td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-mono text-[13px]">/api/upload</td>
                <td className="py-2 pr-3">POST</td>
                <td className="py-2 pr-3"><Code>{'{ fileContent (base64), fileName }'}</Code></td>
                <td className="py-2 pr-3"><Code>{'{ text, fileName }'}</Code></td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-[16px] font-semibold">Struttura completa della risposta di /api/chat</h3>
          <pre className={`overflow-x-auto rounded-lg p-4 text-[13px] leading-relaxed ${'bg-black/[0.06] dark:bg-white/10'}`}>{`{
  "text": "stringa — testo della risposta",
  "modalita": "tutor" | "professore",
  "fonti": [
    { "nome": "Art. 2043 c.c.", "sito": "normattiva.it" }
  ],
  "modelli": {
    "generatore": "Gemini 2.5 Flash-Lite",
    "validatore": "Groq llama-3.3-70b-versatile" | "non attivo",
    "rigenerato": true | false
  },
  "validazione": {
    "eseguita": true | false,
    "valido": true | false,
    "problemi": ["stringa", ...],
    "confidenza": 0.0-1.0 | null,
    "skipped": true | false
  },
  "tavily": {
    "eseguita": true | false,
    "motivo": "timeout" | "api_key_mancante"
              | "messaggio_troppo_corto" | "ambito_ue" | null,
    "numRisultati": 0-4
  },
  "documentContext": "stringa | null",
  "documentName": "stringa | null"
}`}</pre>

          <h3 className="text-[16px] font-semibold">Codici di errore HTTP</h3>
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Causa</th>
                <th className="py-2 pr-3 font-semibold">Dettaglio mostrato all'utente</th>
              </tr>
            </thead>
            <tbody className="text-[#6e6e73] dark:text-[#a1a1a6]">
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">400</td>
                <td className="py-2 pr-3">Messaggio vuoto o richiesta bloccata dai filtri di sicurezza</td>
                <td className="py-2 pr-3">"Messaggio vuoto" / "Richiesta rifiutata. La richiesta è stata bloccata dai filtri di sicurezza o non è valida."</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">401</td>
                <td className="py-2 pr-3">Chiave API Gemini mancante o non valida</td>
                <td className="py-2 pr-3">"Chiave API non valida. GEMINI_API_KEY mancante o errata."</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">429</td>
                <td className="py-2 pr-3">Quota giornaliera gratuita di Gemini esaurita (20 richieste/giorno/modello)</td>
                <td className="py-2 pr-3">"Quota esaurita. Hai superato il limite giornaliero. Riprova domani o abilita la fatturazione."</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">503</td>
                <td className="py-2 pr-3">Servizio Gemini temporaneamente sovraccarico</td>
                <td className="py-2 pr-3">"Servizio temporaneamente sovraccarico. Il modello sta ricevendo molte richieste."</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-mono text-[13px]">500</td>
                <td className="py-2 pr-3">Errore generico</td>
                <td className="py-2 pr-3">"Errore durante la generazione della risposta." (dettaglio tecnico troncato a 200 caratteri)</td>
              </tr>
            </tbody>
          </table>
        </Section>

        {/* ==================== ERRORI ==================== */}
        <Section title="Gestione errori nel frontend">
          <p>
            Il frontend intercetta errori di rete e risposte di errore dal backend,
            mostrandoli come messaggi dell'assistente nella chat. La variabile{' '}
            <Code>data</Code> è dichiarata fuori dal blocco <Code>try</Code> per
            essere accessibile nel <Code>catch</Code> — questo garantisce che il
            messaggio di errore specifico (es. "Quota esaurita. Hai superato il
            limite giornaliero...") venga mostrato all'utente invece di un generico
            "Si è verificato un errore".
          </p>
          <p>
            Il formato dell'errore mostrato è: se <Code>data.detail</Code> esiste,
            viene concatenato <Code>{'"{data.error}. {data.detail}"'}</Code>;
            altrimenti viene usato <Code>data?.error</Code> con fallback a un
            messaggio generico.
          </p>
        </Section>

        {/* ==================== PRIVACY ==================== */}
        <Section title="Privacy e dati">
          <ul className="list-disc pl-5">
            <li>
              <strong>Cronologia</strong>: salvata esclusivamente nel{' '}
              <Code>localStorage</Code> del browser (chiave{' '}
              <Code>iusmente_cronologia</Code>). Nessun dato di cronologia
              lascia il dispositivo.
            </li>
            <li>
              <strong>Domande</strong>: ogni messaggio viene inviato al backend
              e processato da Google AI (Gemini), Groq Cloud (Llama 3.3 70B)
              e Tavily (ricerca web), secondo i termini di servizio di ciascun
              fornitore.
            </li>
            <li>
              <strong>Documenti</strong>: i file caricati vengono elaborati in
              tempo reale (estrazione testo) e non vengono memorizzati sul
              server. Il testo estratto è inviato al modello solo al momento
              dell'invio del messaggio.
            </li>
            <li><strong>Cookie</strong>: IusMente non utilizza cookie di tracciamento o analytics.</li>
          </ul>
        </Section>

        {/* ==================== STACK ==================== */}
        <Section title="Stack tecnologico completo">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                <th className="py-2 pr-3 font-semibold">Categoria</th>
                <th className="py-2 pr-3 font-semibold">Tecnologia</th>
                <th className="py-2 pr-3 font-semibold">Versione / Dettaglio</th>
              </tr>
            </thead>
            <tbody className="text-[#6e6e73] dark:text-[#a1a1a6]">
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">Framework</td>
                <td className="py-2 pr-3">Next.js</td>
                <td className="py-2 pr-3 font-mono text-[13px]">^16.2.9 (Turbopack)</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">UI Library</td>
                <td className="py-2 pr-3">React</td>
                <td className="py-2 pr-3 font-mono text-[13px]">^18.3.0</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">Stile</td>
                <td className="py-2 pr-3">Tailwind CSS</td>
                <td className="py-2 pr-3 font-mono text-[13px]">^3.4.0</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">Icone</td>
                <td className="py-2 pr-3">Lucide React</td>
                <td className="py-2 pr-3 font-mono text-[13px]">^0.300.0 (16 icone usate)</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">AI (generazione)</td>
                <td className="py-2 pr-3">Gemini 2.5 Flash-Lite</td>
                <td className="py-2 pr-3 font-mono text-[13px]">SDK @google/genai ^2.9.0</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">AI (validazione)</td>
                <td className="py-2 pr-3">Llama 3.3 70B</td>
                <td className="py-2 pr-3 font-mono text-[13px]">Groq API (llama-3.3-70b-versatile)</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">Ricerca web RAG</td>
                <td className="py-2 pr-3">Tavily Search API</td>
                <td className="py-2 pr-3 font-mono text-[13px]">max_results=4, timeout=8s</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">Estrazione PDF</td>
                <td className="py-2 pr-3">pdf-parse</td>
                <td className="py-2 pr-3 font-mono text-[13px]">libreria open source</td>
              </tr>
            </tbody>
          </table>
        </Section>

        {/* ==================== TABELLA COSTANTI ==================== */}
        <Section title="Costanti, soglie e limiti">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                <th className="py-2 pr-3 font-semibold">Nome</th>
                <th className="py-2 pr-3 font-semibold">Valore</th>
                <th className="py-2 pr-3 font-semibold">Contesto</th>
              </tr>
            </thead>
            <tbody className="text-[#6e6e73] dark:text-[#a1a1a6]">
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">MAX_RETRY</td>
                <td className="py-2 pr-3">2</td>
                <td className="py-2 pr-3">Tentativi massimi di retry per Gemini</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">Backoff base</td>
                <td className="py-2 pr-3">800 ms</td>
                <td className="py-2 pr-3"><Code>800 * 2^tentativo</Code> (800, 1600 ms)</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">TAVILY_TIMEOUT_MS</td>
                <td className="py-2 pr-3">8000 ms</td>
                <td className="py-2 pr-3">Timeout della ricerca Tavily</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">TAVILY_MAX_RESULTS</td>
                <td className="py-2 pr-3">4</td>
                <td className="py-2 pr-3">Numero massimo di risultati Tavily</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">Titolo Tavily</td>
                <td className="py-2 pr-3">200 caratteri</td>
                <td className="py-2 pr-3">Troncamento titolo risultati Tavily</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">Contenuto Tavily</td>
                <td className="py-2 pr-3">600 caratteri</td>
                <td className="py-2 pr-3">Troncamento estratto risultati Tavily</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">Groq temperatura</td>
                <td className="py-2 pr-3">0.1</td>
                <td className="py-2 pr-3">Validatore Llama (bassa creatività)</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">Min messaggio RAG</td>
                <td className="py-2 pr-3">20 caratteri</td>
                <td className="py-2 pr-3">Soglia minima per attivare ricerca Tavily</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">File max size</td>
                <td className="py-2 pr-3">10 MB</td>
                <td className="py-2 pr-3">Dimensione massima file caricabile</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">PDF max caratteri</td>
                <td className="py-2 pr-3">50.000</td>
                <td className="py-2 pr-3">Troncamento testo PDF estratto</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">Titolo cronologia</td>
                <td className="py-2 pr-3">40 caratteri</td>
                <td className="py-2 pr-3">Troncamento titolo conversazione</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">Badge cronologia</td>
                <td className="py-2 pr-3">9+</td>
                <td className="py-2 pr-3">Cap display per il badge della cronologia</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">Copy feedback</td>
                <td className="py-2 pr-3">2000 ms</td>
                <td className="py-2 pr-3">Durata spunta verde dopo copia</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">Delay animazione</td>
                <td className="py-2 pr-3">150 ms</td>
                <td className="py-2 pr-3">Stagger tra i pallini di caricamento</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3 font-mono text-[13px]">Cronologia compatta</td>
                <td className="py-2 pr-3">38vh</td>
                <td className="py-2 pr-3">Altezza massima lista cronologia mobile</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-mono text-[13px]">Errore API troncato</td>
                <td className="py-2 pr-3">200 caratteri</td>
                <td className="py-2 pr-3">Troncamento dettaglio errore nelle risposte 500</td>
              </tr>
            </tbody>
          </table>
        </Section>

        {/* ==================== LIMITI ==================== */}
        <Section title="Limiti e cautele">
          <p>
            Nonostante la pipeline a doppio modello, il RAG e la rigenerazione
            condizionale, IusMente <strong>non è una fonte di diritto</strong>{' '}
            e le sue risposte non sostituiscono la consultazione diretta delle
            fonti ufficiali, del tuo docente o di un professionista legale.
          </p>
          <ul className="list-disc pl-5">
            <li>Le sentenze citate sono plausibili ma non sempre verificabili automaticamente.</li>
            <li>Gli articoli di legge possono contenere imprecisioni, specie se soggetti a riforme recenti.</li>
            <li>La giurisprudenza è in continua evoluzione: una sentenza citata potrebbe essere superata.</li>
            <li>Se il validatore Llama non è disponibile, la risposta viene mostrata senza validazione.</li>
            <li>I PDF con scansioni (immagini) non possono essere letti: serve OCR preventivo.</li>
            <li>La ricerca RAG è attiva solo per l'ambito italiano e richiede la chiave API Tavily.</li>
            <li>Il tier gratuito di Gemini ha un limite di 20 richieste al giorno per modello.</li>
          </ul>
        </Section>

        {/* ==================== CREDITI ==================== */}
        <Section title="Licenza e crediti">
          <p>
            IusMente è un progetto personale di <strong>Andrea 🐻</strong>.
            Versione corrente: <Code>v{pkg.version}</Code>.
          </p>
          <p>
            I modelli AI (Gemini, Llama) e i servizi (Groq Cloud, Tavily)
            appartengono ai rispettivi proprietari. Le bandiere sono in emoji
            Unicode. Le icone sono di{' '}
            <a href="https://lucide.dev" className="text-[#0071e3] hover:underline" target="_blank" rel="noopener noreferrer">Lucide</a>.
          </p>
        </Section>

        <footer className="mt-12 border-t border-black/10 pt-6 text-[12px] text-[#86868b] dark:border-white/10">
          <Link href="/" className="text-[#0071e3] hover:underline">
            ← Torna alla chat
          </Link>
        </footer>
      </article>
    </main>
  )
}

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="text-[20px] font-semibold tracking-tight sm:text-[22px]">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[#3a3a3c] dark:text-[#d2d2d7]">
        {children}
      </div>
    </section>
  )
}

function Code({ children }) {
  return (
    <code className="rounded bg-black/[0.06] px-1.5 py-0.5 font-mono text-[13px] text-[#1d1d1f] dark:bg-white/10 dark:text-[#f5f5f7]">
      {children}
    </code>
  )
}
