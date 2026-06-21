# IusMente - Assistente Virtuale Intelligente per lo Studio del Diritto

IusMente è un'applicazione web avanzata basata su Next.js, concepita specificamente per affiancare gli studenti di giurisprudenza nella preparazione degli esami universitari. L'applicazione non si limita a rispondere a quesiti legali, ma si adatta attivamente allo stato psicologico e agli obiettivi di studio dell'utente attraverso un sistema a doppia personalità e filtri di giurisdizione in tempo reale.

Il progetto nasce per colmare il divario tra la fredda consultazione dei codici normativi e la necessità di un apprendimento interattivo, stimolante e personalizzato.

---

## 🌟 Funzionalità Principali ed Esperienza Utente

L'esperienza di utilizzo all'interno di IusMente si sviluppa attorno a tre pilastri fondamentali:

### 1. Dualità del Profilo (Tutor vs Rigore)
*   **Modalità Tutor Didattico**: È il mentore virtuale e l'alleato nello studio quotidiano. Concepito con un approccio empatico, caloroso e cordiale, si rivolge direttamente all'utente (chiamandolo per nome), utilizza un linguaggio d'incoraggiamento e fa uso di elementi grafici ed emoji per alleggerire il carico dello studio. Se sollecitato, progetta attivamente sessioni interattive di ripasso, quiz a risposta multipla, schemi di domande e risposte o simulazioni d'esame (ad esempio sui moduli complessi di Diritto Privato), correggendo lo studente passo dopo passo e spiegando gli errori con pazienza scientifica.
*   **Modalità Rigore d'Esame**: Simula la commissione d'esame in sede d'appello o un rigoroso comitato scientifico. Il tono diventa formale, asettico, distaccato e accademico. In questa modalità, l'assistente rifiuta categoricamente di avviare simulazioni interattive o giochi a quiz, rimandando tali attività al profilo Tutor. Il suo scopo è fornire convalide testuali asciutte, interpretazioni letterali della norma e riscontri dogmatici puramente teorici, preparando lo studente a sostenere il linguaggio tecnico e formale richiesto nelle aule universitarie.

### 2. Controllo della Giurisdizione (Filtro Geografico)
*   **Solo Diritto Italiano**: Attivando questa opzione, l'assistente circoscrive l'analisi esclusivamente alle fonti interne dell'ordinamento italiano (Codice Civile, Codice Penale, Costituzione e leggi speciali), escludendo o riducendo al minimo i riferimenti esterni per non generare confusione durante i ripassi di diritto nazionale.
*   **Orizzonte Internazionale ed Europeo**: Disattivando il filtro, il sistema integra sistematicamente l'analisi del diritto dell'Unione Europea, i trattati internazionali e le sentenze delle corti sovranazionali (come la Corte di Giustizia dell'UE o la Corte Europea dei Diritti dell'Uomo - CEDU).

### 3. Trasparenza Architetturale e Fonti
Per ogni risposta generata, l'interfaccia utente mostra chiaramente i metadati dell'operazione: i modelli di intelligenza artificiale coinvolti nella filiera e l'elenco delle fonti normative e codicistiche consultate, garantendo l'affidabilità scientifica del dato esposto.

---

## 🛠️ Requisiti di Sistema e Prerequisiti

L'applicazione richiede l'ambiente di runtime **Node.js** per l'esecuzione del server locale e la gestione dei pacchetti.

### Installazione di Node.js e npm

#### Su macOS (tramite Homebrew)
Se utilizzi un Mac con il gestore di pacchetti Homebrew installato, apri il terminale e digita:
```bash
brew install node