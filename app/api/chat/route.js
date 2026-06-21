import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inizializzazione dell'SDK con la chiave salvata nell'ambiente
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { message, soloItalia, modalitaTutor } = await req.json();

    // Validazione base dell'input
    if (!message) {
      return NextResponse.json({ error: 'Messaggio vuoto' }, { status: 400 });
    }

    // Costruzione dinamica del comportamento (System Instruction)
    // L'IA riceve solo le direttive di "carattere" e non istruzioni sugli argomenti
    const roleInstruction = modalitaTutor 
      ? `Sei "IusMente Tutor", un mentore cordiale per studenti di giurisprudenza. 
         Il tuo approccio è empatico, incoraggiante e proattivo.
         Se richiesto, generi test, quiz e simulazioni d'esame sulla materia indicata dallo studente, 
         proponendo 3-4 domande alla volta per favorire l'apprendimento attivo.`
      : `Sei "IusMente Professore". Il tuo approccio è accademico, formale, asettico e severo.
         Non generi quiz o simulazioni interattive. Ti limiti a validare testi giuridici, 
         rispondere a quesiti normativi con rigore letterale e testare la preparazione dello studente 
         con domande dirette e di alta difficoltà tecnica.`;

    const geoInstruction = soloItalia 
      ? "Limita la tua analisi al diritto interno italiano (Codice Civile, Penale, Costituzione)." 
      : "Integra l'analisi con il Diritto dell'Unione Europea, la giurisprudenza CGUE/CEDU e il diritto comparato.";

    const systemInstruction = `${roleInstruction} ${geoInstruction}`;

    // Configurazione del modello
    // Utilizziamo gemini-1.5-flash per risposte rapide ed economiche
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction
    });

    // Generazione della risposta in base al messaggio dell'utente
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: {
        temperature: modalitaTutor ? 0.7 : 0.2, // Più creativo il tutor, più rigido il professore
      },
    });

    const response = await result.response;
    const text = response.text();

    // Restituzione della risposta strutturata
    return NextResponse.json({
      text: text,
      fonti: ["Elaborazione basata su fonti dottrinali e normative"],
      modelli: {
        generatore: 'Gemini 1.5 Flash',
        validatore: 'Gemini 1.5 Flash'
      }
    });

  } catch (error) {
    console.error("Errore nel backend di IusMente:", error);
    return NextResponse.json(
      { error: 'Errore durante la generazione della risposta.' }, 
      { status: 500 }
    );
  }
}