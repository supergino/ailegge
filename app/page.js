'use client';
import { useState, useEffect } from 'react';
import './globals.css';

export default function Home() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [soloItalia, setSoloItalia] = useState(true);
  const [modalitaTutor, setModalitaTutor] = useState(true);
  const [cronologia, setCronologia] = useState([]);
  const [sidebarAperta, setSidebarAperta] = useState(false);
  const [copiatoId, setCopiatoId] = useState(null);
  
  const [infoTecniche, setInfoTecniche] = useState({
    generatore: 'Gemini 1.5 Flash',
    validatore: 'Gemini 1.5 Flash',
    fonti: []
  });

  useEffect(() => {
    const cronologiaSalvata = localStorage.getItem('iusmente_cronologia');
    if (cronologiaSalvata) {
      setCronologia(JSON.parse(cronologiaSalvata));
    }
  }, []);

  const copiaNegliAppunti = (testo, idx) => {
    navigator.clipboard.writeText(testo).then(() => {
      setCopiatoId(idx);
      setTimeout(() => setCopiatoId(null), 2000);
    });
  };

  const salvaInCronologia = (nuoviMessaggi) => {
    if (nuoviMessaggi.length === 0) return;
    const primoMessaggio = nuoviMessaggi.find(m => m.role === 'user')?.text || 'Nuova consultazione';
    const titoloTroncato = primoMessaggio.length > 30 ? primoMessaggio.substring(0, 30) + '...' : primoMessaggio;
    
    const nuovaSessione = {
      id: Date.now(),
      titolo: titoloTroncato,
      data: new Date().toLocaleDateString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      chat: nuoviMessaggi
    };

    const aggiornata = [nuovaSessione, ...cronologia.filter(s => s.chat !== nuoviMessaggi)];
    setCronologia(aggiornata);
    localStorage.setItem('iusmente_cronologia', JSON.stringify(aggiornata));
  };

  const caricaSessione = (sessione) => {
    setMessages(sessione.chat);
    if (window.innerWidth < 768) setSidebarAperta(false);
  };

  const handleInvia = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    const nuoviMessaggi = [...messages, { role: 'user', text: userMessage }];
    setMessages(nuoviMessaggi);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          soloItalia,
          modalitaTutor 
        })
      });
      
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      const messaggiAggiornati = [...nuoviMessaggi, { role: 'assistant', text: data.text }];
      setMessages(messaggiAggiornati);
      salvaInCronologia(messaggiAggiornati);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', text: "❌ Errore: " + err.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'bg-black text-white' : 'bg-gray-100 text-black'}`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r transition-transform ${sidebarAperta ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${isDarkMode ? 'bg-[#161617] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="p-4 border-b flex justify-between">
          <span className="text-xs font-bold uppercase opacity-50">Cronologia</span>
          <button onClick={() => setSidebarAperta(false)} className="md:hidden">✕</button>
        </div>
        <div className="p-2 space-y-2">
          {cronologia.map(s => (
            <button key={s.id} onClick={() => caricaSessione(s)} className="w-full text-left p-2 text-xs truncate hover:bg-gray-700/20 rounded">
              {s.titolo}
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col h-screen">
        <header className="p-4 border-b flex items-center gap-4">
          <button onClick={() => setSidebarAperta(!sidebarAperta)} className="md:hidden p-2">☰</button>
          <h1 className="font-bold">IusMente</h1>
          <div className="ml-auto flex gap-2 text-xs">
            <button onClick={() => setSoloItalia(!soloItalia)} className="px-2 py-1 rounded bg-blue-600 text-white">{soloItalia ? "🇮🇹 Italia" : "🇪🇺 UE"}</button>
            <button onClick={() => setModalitaTutor(!modalitaTutor)} className="px-2 py-1 rounded bg-green-600 text-white">{modalitaTutor ? "🎓 Tutor" : "🏛️ Professore"}</button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`p-4 rounded-lg ${m.role === 'user' ? 'bg-blue-600 text-white ml-auto max-w-md' : 'bg-gray-800 text-gray-200 mr-auto max-w-xl'}`}>
              {m.text}
            </div>
          ))}
          {loading && <div className="text-sm opacity-50 animate-pulse">IusMente sta elaborando...</div>}
        </main>

        <footer className="p-4 border-t">
          <form onSubmit={handleInvia} className="flex gap-2">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              className="flex-1 p-2 rounded border bg-transparent" 
              placeholder="Chiedi aiuto..."
            />
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Invia</button>
          </form>
        </footer>
      </div>
    </div>
  );
}