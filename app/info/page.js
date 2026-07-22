import pkg from '../../package.json'
import Link from 'next/link'

export const metadata = {
  title: 'Informazioni — IusMente',
  description: 'Scopri cos\'è IusMente, a chi è rivolto e come usare ogni funzionalità dell\'assistente per lo studio del diritto.',
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
            IusMente è un assistente virtuale pensato per studenti di giurisprudenza.
            Il suo scopo è aiutarti a studiare il diritto in modo più interattivo:
            puoi fare domande, chiedere spiegazioni, esercitarti con quiz o
            simulazioni d'esame, e persino caricare documenti da analizzare insieme.
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#6e6e73] sm:text-[17px]">
            IusMente funziona in <strong>due modalità</strong>: <strong>Online</strong> usa modelli cloud
            (Gemini, Groq) con un indice locale dei codici scaricati; <strong>Locale (Ollama)</strong> è
            completamente offline, LLM e indice girano sul tuo computer.
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#6e6e73] sm:text-[17px]">
            Non è un consulente legale. Le risposte hanno finalità didattica e
            non sostituiscono la consultazione delle fonti ufficiali, del tuo
            docente o di un professionista legale.
          </p>
        </header>

        {/* ==================== A CHI SERVE ==================== */}
        <Section title="A chi è rivolto">
          <p>
            IusMente è stato progettato principalmente per:
          </p>
          <ul className="list-disc pl-5">
            <li><strong>Studenti universitari di giurisprudenza</strong> — per preparare esami, ripassare istituti, chiarire dubbi su articoli di legge.</li>
            <li><strong>Studentesse e studenti di scuole superiori</strong> — per approcciare il diritto con spiegazioni semplici e interattive.</li>
            <li><strong>Chiunque studi per un concorso pubblico</strong> — per verificare rapidamente nozioni di diritto italiano o europeo.</li>
          </ul>
          <p className="mt-3">
            L'applicazione è pensata per accompagnarti nello studio quotidiano,
            adattandosi al tuo livello e al tuo obiettivo del momento.
          </p>
        </Section>

        {/* ==================== MODALITÀ ELABORAZIONE ==================== */}
        <Section id="elaborazione" title="Modalità di elaborazione">
          <p>
            Nelle impostazioni trovi il selettore <strong>Modalità elaborazione</strong>:
          </p>

          <h3 className="text-[16px] font-semibold">Online (cloud LLM + indice locale)</h3>
          <p>
            Usa i modelli cloud (Gemini 3.1 Flash-Lite, con catena di fallback
            Groq → NVIDIA → OpenRouter) per generare le risposte. Se hai
            scaricato i codici, l'indice keyword locale viene usato come
            sorgente RAG — niente connessione a Normattiva/Tavily a ogni
            domanda per il diritto civile e penale.
          </p>

          <h3 className="mt-4 text-[16px] font-semibold">Locale (Ollama)</h3>
          <p>
            Modalità completamente offline. Richiede{' '}
            <a href="https://ollama.com" className="text-[#0071e3] hover:underline" target="_blank" rel="noopener noreferrer">Ollama</a>{' '}
            con i modelli <Code>llama3.1:8b</Code> e <Code>nomic-embed-text</Code>.
            Tutto gira sul tuo computer: generazione, embedding e ricerca
            vettoriale. Se Ollama non è in esecuzione, IusMente fallbacka
            automaticamente a Gemini usando l'indice locale dei codici.
          </p>

          <h3 className="mt-4 text-[16px] font-semibold">Scaricare i codici</h3>
          <p>
            Clicca <strong>"Scarica e indicizza codici"</strong> nelle
            impostazioni. IusMente scarica il Codice Civile e il Codice Penale
            da Normattiva, li divide in chunk e costruisce:
          </p>
          <ul className="list-disc pl-5">
            <li><strong>Indice keyword</strong> (sempre) — ricerca testuale TF-IDF, ~3-5 MB, zero dipendenze</li>
            <li><strong>Vector store</strong> (solo se Ollama è presente) — embeddings vettoriali, ~5-8 MB</li>
          </ul>
          <p className="mt-2 text-[13px] text-[#86868b]">
            Puoi eliminare tutto con il pulsante "Elimina dati codici" nelle
            impostazioni o cancellando la cartella <Code>.data/</Code>.
          </p>
        </Section>

        {/* ==================== MODALITÀ ==================== */}
        <Section title="Scegli come studiare">
          <p>
            Subito sopra la chat trovi due selettori che ti permettono di
            personalizzare l'esperienza in base alle tue esigenze.
          </p>

          <h3 id="risposta" className="text-[16px] font-semibold">Modalità di risposta</h3>
          <p>
            Scegli il tono con cui l'assistente ti risponde:
          </p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Assistenza studio</strong> — è la modalità predefinita.
              L'assistente si rivolge con il "tu", spiega i concetti in modo
              semplice e amichevole, fa esempi pratici e può proporti quiz o
              simulazioni per metterti alla prova. Ideale per lo studio di
              tutti i giorni.
            </li>
            <li>
              <strong>Ambito ufficiale legislativo</strong> — il tono diventa
              formale e accademico, come in sede d'esame. L'assistente usa un
              linguaggio tecnico e risponde con rigore, senza semplificazioni.
              Utile per prepararsi a interrogazioni o prove scritte.
            </li>
          </ul>

          <h3 id="contesto" className="mt-5 text-[16px] font-semibold">Contesto giuridico</h3>
          <p>
            Decidi quali fonti di diritto considerare:
          </p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Solo leggi italiane 🇮🇹</strong> — l'assistente si
              concentra sul diritto italiano: Codice Civile, Codice Penale,
              Costituzione e leggi speciali. Non include fonti europee o
              internazionali.
            </li>
            <li>
              <strong>Includi UE e internazionale 🇪🇺</strong> — vengono
              integrate anche le fonti dell'Unione Europea (TFUE, regolamenti,
              direttive) e le giurisprudenze della Corte di Giustizia UE e
              della Corte Europea dei Diritti dell'Uomo (CEDU).
            </li>
          </ul>
          <p className="mt-2 text-[13px] text-[#86868b]">
            Puoi cambiare queste impostazioni in qualsiasi momento, anche
            durante una conversazione.
          </p>
        </Section>

        {/* ==================== COME USARLO ==================== */}
        <Section title="Come si usa">
          <p>
            Usare IusMente è semplice: scrivi una domanda nel campo di testo
            in fondo alla pagina e premi invio. Ecco qualche idea per iniziare:
          </p>
          <ul className="list-disc pl-5">
            <li>"Spiega la differenza tra un reato e una contravvenzione"</li>
            <li>"Fammi un quiz sul Diritto Privato"</li>
            <li>"Cos'è la responsabilità extracontrattuale?"</li>
            <li>"Quali sono i principi fondamentali della Costituzione?"</li>
          </ul>

          <h3 className="mt-5 text-[16px] font-semibold">Caricare un documento</h3>
          <p>
            Puoi allegare un file (PDF o TXT) cliccando sull'icona della
            graffetta accanto al campo di input. Una volta caricato, puoi
            fare domande sul suo contenuto: IusMente lo userà come riferimento
            per rispondere. Il documento resta allegato finché non lo rimuovi,
            così puoi fare tutte le domande che vuoi senza ricaricarlo.
          </p>
          <p className="mt-2 text-[13px] text-[#86868b]">
            Il file non viene salvato sul server: il testo viene estratto al
            momento e utilizzato solo per la conversazione in corso.
          </p>

          <h3 className="mt-5 text-[16px] font-semibold">Cronologia</h3>
          <p>
            Le conversazioni vengono salvate automaticamente nel tuo browser.
            Puoi riprenderle in qualsiasi momento:
          </p>
          <ul className="list-disc pl-5">
            <li><strong>Desktop</strong> — la cronologia è visibile nella barra laterale sinistra, sotto "Recenti".</li>
            <li><strong>Mobile</strong> — tocca l'icona dell'orologio in alto a destra per aprire il pannello.</li>
          </ul>
          <p>
            Clicca su una conversazione per riprenderla, usa la <Code>✕</Code> rossa per eliminarla,
            oppure premi <Code>Nuova chat</Code> per ricominciare da capo.
          </p>

          <h3 className="mt-5 text-[16px] font-semibold">Tema chiaro e scuro</h3>
          <p>
            Puoi passare dal tema scuro a quello chiaro in qualsiasi momento:
            su desktop il pulsante si trova in fondo alla barra laterale,
            su mobile nell'angolo in alto a destra.
          </p>
        </Section>

        {/* ==================== RISPOSTE E FONTI ==================== */}
        <Section title="Come vengono generate le risposte">
          <p>
            Ogni risposta che ricevi è il risultato di un processo progettato
            per essere il più accurato possibile. In sintesi:
          </p>
          <ol className="list-decimal pl-5">
            <li>
              <strong>Generazione</strong> — l'assistente formula una risposta
              basata sulle tue impostazioni (modalità e contesto giuridico) e
              sulle fonti a disposizione.
            </li>
            <li>
              <strong>Verifica</strong> — un secondo modello controlla che la
              risposta sia corretta, che le fonti citate esistano davvero e
              che non ci siano affermazioni inventate.
            </li>
            <li>
              <strong>Correzione</strong> — se la verifica trova problemi,
              la risposta viene rigenerata automaticamente tenendone conto.
            </li>
          </ol>
          <p className="mt-2">
            In **modalità Online**, IusMente cerca prima nell'indice locale
            dei codici scaricati (keyword index TF-IDF del Codice Civile e
            Penale). Se l'indice non ha risultati, interroga Tavily su
            portali normativi (Normattiva, Gazzetta Ufficiale). In **modalità
            Locale (Ollama)**, tutto avviene sul tuo computer: nessuna
            connessione internet necessaria.
          </p>
          <p className="mt-2">
            Alla fine di ogni risposta trovi l'elenco delle fonti consultate,
            con il nome del riferimento (es. "Art. 2043 c.c.") e il portale
            di riferimento. Cliccando su una fonte puoi approfondire.
          </p>
        </Section>

        {/* ==================== PRIVACY ==================== */}
        <Section title="Privacy">
          <ul className="list-disc pl-5">
            <li>
              <strong>Cronologia</strong> — salvata solo nel tuo browser.
              Nessun dato di cronologia lascia il tuo dispositivo.
            </li>
            <li>
              <strong>Documenti</strong> — i file che carichi vengono elaborati
              al momento e non vengono conservati sul server.
            </li>
            <li>
              <strong>Domande</strong> — in modalità Online vengono inviate
              ai servizi AI (Google Gemini, Groq Cloud) e a Tavily per la
              ricerca web. In modalità Locale (Ollama) <strong>nessun dato
              lascia il tuo computer</strong>.
            </li>
            <li>
              <strong>Cookie</strong> — IusMente non utilizza cookie di
              tracciamento o analytics.
            </li>
          </ul>
        </Section>

        {/* ==================== LIMITI ==================== */}
        <Section title="Cose da sapere">
          <ul className="list-disc pl-5">
            <li>IusMente è uno <strong>strumento didattico</strong>, non una fonte di diritto. Verifica sempre le informazioni sulle fonti ufficiali.</li>
            <li>Le sentenze citate sono plausibili ma potrebbero non corrispondere a sentenze reali. Usale come spunto di studio, non come riferimento.</li>
            <li>La legge cambia nel tempo: un articolo citato potrebbe essere stato modificato o abrogato.</li>
            <li>I PDF con scansioni (immagini, non testo selezionabile) non possono essere letti.</li>
            <li>Il servizio gratuito di Gemini ha un limite giornaliero di richieste. Se lo raggiungi, passa alla modalità Locale (Ollama) o riprova il giorno dopo.</li>
          </ul>
        </Section>

        {/* ==================== CREDITI ==================== */}
        <Section title="Crediti">
          <p>
            IusMente è un progetto personale di <strong>Andrea</strong> · v{pkg.version}.
          </p>
          <p>
            Si basa sui modelli Gemini di Google AI, Llama di Meta via Groq Cloud,
            Ollama per la modalità locale, e sulla ricerca web di Tavily.
            Le icone sono di{' '}
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

function Section({ id, title, children }) {
  return (
    <section id={id} className="mt-10">
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
