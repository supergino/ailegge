import pkg from '../../package.json'
import Link from 'next/link'

export const metadata = {
  title: 'Informazioni — IusMente',
  description: 'Architettura, modelli AI e logica di IusMente, l\'assistente virtuale per lo studio del diritto.',
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
            Cosa fa questa applicazione
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#6e6e73] sm:text-[17px]">
            IusMente è un assistente virtuale pensato per affiancare gli studenti di
            giurisprudenza nello studio del diritto italiano ed europeo. Non è un
            consulente legale e le risposte che fornisce hanno finalità esclusivamente
            didattica.
          </p>
        </header>

        <Section title="Architettura a doppio modello">
          <p>
            Ogni risposta che leggi è il risultato di una pipeline a due stadi, pensata
            per ridurre il rischio di allucinazioni che affligge i modelli generativi
            quando operano su domini specialistici come il diritto.
          </p>
          <ol className="list-decimal pl-5">
            <li>
              <strong>Generazione</strong>: la tua domanda viene inviata a{' '}
              <Code>gemini-2.5-flash-lite</Code> (Google Gemini), che produce la
              risposta strutturata in JSON, comprensiva di testo, fonti citate e
              sito di provenienza di ciascuna fonte.
            </li>
            <li>
              <strong>Validazione</strong>: la risposta di Gemini viene quindi passata
              a <Code>llama-3.3-70b-versatile</Code> (Groq) come revisore indipendente.
              Llama riceve la domanda originale, la risposta generata e le fonti
              citate. Deve verificare che le fonti siano plausibili, che le
              affermazioni giuridiche corrispondano al contenuto noto delle fonti,
              che non ci siano riferimenti inventati, e che la risposta rispetti
              l'ambito giurisdizionale richiesto.
            </li>
            <li>
              <strong>Rigenerazione condizionale</strong>: se Llama segnala problemi
              con confidenza adeguata, il sistema reinvoca Gemini passando le
              criticità rilevate come contesto aggiuntivo. La risposta revisionata
              viene mostrata all'utente, con un flag <Code>rigenerato: true</Code>{' '}
              esposto nella risposta JSON dell'API.
            </li>
          </ol>
        </Section>

        <Section title="Modelli in uso">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                <th className="py-2 pr-3 font-semibold">Ruolo</th>
                <th className="py-2 pr-3 font-semibold">Modello</th>
                <th className="py-2 pr-3 font-semibold">Provider</th>
              </tr>
            </thead>
            <tbody className="text-[#6e6e73] dark:text-[#a1a1a6]">
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">Generazione</td>
                <td className="py-2 pr-3 font-mono text-[13px]">gemini-2.5-flash-lite</td>
                <td className="py-2 pr-3">Google AI Studio</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">Validazione</td>
                <td className="py-2 pr-3 font-mono text-[13px]">llama-3.3-70b-versatile</td>
                <td className="py-2 pr-3">Groq Cloud</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-[13px] text-[#86868b]">
            Il modello Gemini è stato scelto nel tier <em>Flash-Lite</em> per
            bilanciare qualità, latenza e costo. Il validatore Llama 3.3 70B gira su
            Groq perché l'inferenza Llama su Groq è attualmente una delle più
            veloci disponibili, permettendo un secondo passaggio senza penalizzare
            l'esperienza utente.
          </p>
        </Section>

        <Section title="Le due modalità di risposta">
          <p>
            In qualsiasi momento puoi passare da una modalità all'altra usando il
            selettore in cima alla pagina. Le due modalità non sono semplici preset
            di tono: usano prompt di sistema distinti.
          </p>
          <ul className="list-disc pl-5">
            <li>
              <strong>Assistenza studio</strong>: il sistema agisce come un mentore
              didattico, empatico e incoraggiante. Risponde con "tu", può proporre
              quiz, schemi riassuntivi e simulazioni d'esame, ed è autorizzato a
              usare emoji pertinenti. La temperatura del modello è più alta (0.75)
              per favorire spiegazioni creative.
            </li>
            <li>
              <strong>Ambito ufficiale legislativo</strong>: il sistema adotta il
              registro di un docente in commissione d'esame. Risponde in forma
              impersonale ("si osserva", "va rilevato"), cita articoli e commi,
              rifiuta esplicitamente quiz e simulazioni rimandando alla modalità
              Tutor, e usa terminologia giuridica tecnica. La temperatura è
              abbassata (0.15) per massimizzare la precisione e la ripetibilità.
            </li>
          </ul>
        </Section>

        <Section title="Il filtro giurisdizionale">
          <p>
            Il selettore "Contesto giuridico" in testa alla pagina determina se
            Gemini deve limitare la propria analisi al solo ordinamento italiano o
            includere anche il diritto dell'Unione Europea, i trattati
            internazionali e la giurisprudenza sovranazionale (CGUE, CEDU).
          </p>
          <p>
            Questo filtro agisce come istruzione di sistema: non è un filtro
            tecnico sul database, ma una guida esplicita data al modello su
            quali fonti può citare. È il metodo più onesto per un LLM, perché
            evita di "promettere" un'esclusione che non può garantire a livello
            architetturale.
          </p>
        </Section>

        <Section title="Le fonti citate">
          <p>
            Per ogni risposta, Gemini deve elencare le fonti giuridiche che ha
            effettivamente utilizzato. Ogni fonte è un oggetto con due campi:
          </p>
          <ul className="list-disc pl-5">
            <li>
              <Code>nome</Code>: descrizione sintetica (es. "Art. 2043 c.c.",
              "Cass. civ. sent. n. 28987/2019", "TFUE art. 18").
            </li>
            <li>
              <Code>sito</Code>: il dominio del portale canonico da cui la fonte
              può essere verificata. I valori ammessi sono solo quattro, definiti
              da una tabella di routing nel prompt di sistema:
            </li>
          </ul>
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-black/10 dark:border-white/10">
                <th className="py-2 pr-3 font-semibold">Tipo di fonte</th>
                <th className="py-2 pr-3 font-semibold">Sito</th>
              </tr>
            </thead>
            <tbody className="text-[#6e6e73] dark:text-[#a1a1a6]">
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">Codici e Costituzione</td>
                <td className="py-2 pr-3 font-mono text-[13px]">normattiva.it</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">Leggi e decreti</td>
                <td className="py-2 pr-3 font-mono text-[13px]">gazzettaufficiale.it</td>
              </tr>
              <tr className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-3">Sentenze di Cassazione</td>
                <td className="py-2 pr-3 font-mono text-[13px]">italgiure.giustizia.it</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">Diritto UE, CGUE, CEDU</td>
                <td className="py-2 pr-3 font-mono text-[13px]">eur-lex.europa.eu</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-[13px] text-[#86868b]">
            I link puntano al portale, non a un articolo specifico: i deep-link
            generati automaticamente dai modelli generativi sono inaffidabili
            (abbiamo verificato che alcuni pattern diffusi online non risolvono).
            Rimandiamo al portale autorevole perché l'utente possa fare una ricerca
            guidata a partire dal riferimento fornito.
          </p>
        </Section>

        <Section title="Limiti e cautele">
          <p>
            Nonostante la pipeline a doppio modello, IusMente <strong>non è una
            fonte di diritto</strong> e le sue risposte non sostituiscono la
            consultazione diretta delle fonti ufficiali, del tuo docente o di un
            professionista legale. In particolare:
          </p>
          <ul className="list-disc pl-5">
            <li>
              Le sentenze citate sono plausibili ma non sempre verificabili
              automaticamente: verifica sempre numero, anno e massima sul portale
              Italgiure.
            </li>
            <li>
              Gli articoli di legge citati sono quasi sempre corretti, ma la
              descrizione del loro contenuto può contenere imprecisioni, soprattutto
              per gli articoli soggetti a frequenti riforme.
            </li>
            <li>
              La giurisprudenza è in continua evoluzione: una sentenza citata come
              "valida" potrebbe essere superata da pronunce più recenti.
            </li>
            <li>
              Se Llama (il validatore) non è disponibile, la risposta viene comunque
              mostrata, ma con il flag <Code>skipped: true</Code>: in quel caso la
              validazione non è stata eseguita.
            </li>
          </ul>
        </Section>

        <Section title="Privacy e dati">
          <p>
            Le conversazioni sono salvate esclusivamente nel <em>localStorage</em>{' '}
            del tuo browser, sotto la chiave <Code>iusmente_cronologia</Code>.
            Nessun dato lascia il tuo dispositivo se non la singola domanda che
            invii al backend, che viene processata da Google (Gemini) e Groq
            secondo i loro termini di servizio.
          </p>
        </Section>

        <Section title="Crediti e versione">
          <p>
            IusMente è un progetto personale di <strong>Andrea 🐻</strong>.
            Versione corrente: <Code>v{pkg.version}</Code>.
          </p>
        </Section>

        <footer className="mt-12 border-t border-black/10 pt-6 text-[12px] text-[#86868b] dark:border-white/10">
          <Link href="/" className="text-[#0071e3] hover:underline">
            Torna alla chat →
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
