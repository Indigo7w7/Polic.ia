import React, { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { trpc } from '../../../shared/utils/trpc';
import { useUserStore } from '../../store/useUserStore';
import ReactMarkdown from 'react-markdown';

export default function ScenarioChat() {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const state = location.state as { initialEvent: string; history?: any[] } | null;
  const initialEvent = state?.initialEvent || "Incidencia iniciada. Proceda según manual.";
  const existingHistory = state?.history || [];

  const [history, setHistory] = useState<any[]>(existingHistory);
  const [input, setInput] = useState('');
  
  const endRef = useRef<HTMLDivElement>(null);
  const interactMutation = trpc.scenarios.interact.useMutation();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, interactMutation.isPending]);

  const handleSend = async () => {
    if (!input.trim() || interactMutation.isPending) return;
    
    const userMsg = input.trim();
    setInput('');
    setHistory(prev => [...prev, { role: 'user', parts: [{ text: userMsg }] }]);

    try {
      const res = await interactMutation.mutateAsync({
        attemptId: Number(attemptId),
        message: userMsg,
        history: history.length > 0 ? history : [],
      });

      setHistory(prev => [...prev, { role: 'model', parts: [{ text: res.response }] }]);
      
      if (res.achievementsUnlocked && res.achievementsUnlocked.length > 0) {
        res.achievementsUnlocked.forEach((ach: any) => {
          useUserStore.getState().pushAchievement(ach);
        });
      }

      if (res.isEnded) {
         setHistory(prev => [...prev, { 
             role: 'system', 
             parts: [{ text: '### 🚨 REPORTE DE EVALUACIÓN OFICIAL\n\n**Puntaje:** ' + res.score + '/100\n**Resultado:** ' + (res.passed ? '✅ ACREDITADO' : '❌ DESAPROBADO') + '\n\n**Observaciones:**\n' + res.feedback }] 
         }]);
      }
    } catch (e: any) {
      alert("Comunicaciones bloqueadas. Central no responde: " + e.message);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto bg-slate-900 border-x border-slate-800 shadow-2xl relative overflow-hidden">
      {/* Header Radial */}
      <header className="p-4 bg-slate-800 border-b border-blue-500/30 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard/scenarios')}
              className="p-2 hover:bg-slate-700 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                FRECUENCIA 105
              </h2>
              <p className="text-xs text-blue-400 monospace">ENCRIPTACIÓN SEC 4 // GRABACIÓN ACTIVA</p>
            </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-[url('/noise.png')] bg-repeat opacity-95">
        
        {/* Initial Prompt Bubble */}
        <div className="flex justify-start">
          <div className="max-w-[90%] md:max-w-[75%] rounded-2xl rounded-tl-sm p-4 bg-blue-900/40 border border-blue-500/30 text-slate-300 shadow-sm relative">
             <div className="text-[10px] uppercase text-blue-400 font-bold mb-1 tracking-wider">🚔 CENTRAL DE EMERGENCIAS (CEPOL)</div>
             <div className="prose prose-invert prose-sm leading-relaxed">
               <ReactMarkdown>{initialEvent}</ReactMarkdown>
             </div>
          </div>
        </div>

        {/* History Bubbles */}
        {history.map((msg, i) => {
          const isUser = msg.role === 'user';
          if (msg.role === 'system') {
                return (
                    <div key={i} className="flex justify-center my-8">
                       <div className="max-w-[95%] p-6 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
                          <div className="prose prose-invert max-w-none prose-h3:text-yellow-400 prose-h3:mt-0 prose-h3:mb-4 prose-p:text-slate-300 prose-strong:text-white">
                            <ReactMarkdown>{msg.parts[0].text}</ReactMarkdown>
                          </div>
                          <div className="mt-6 flex justify-center">
                             <button onClick={() => navigate('/dashboard/scenarios')} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded shadow transition-colors">Volver a los Archivos</button>
                          </div>
                       </div>
                    </div>
                );
          }

          const wrapClassUser = "max-w-[90%] md:max-w-[75%] rounded-2xl p-4 shadow-sm relative bg-blue-600 text-white rounded-tr-sm";
          const wrapClassAI = "max-w-[90%] md:max-w-[75%] rounded-2xl p-4 shadow-sm relative bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm";

          return (
            <div key={i} className={isUser ? 'flex justify-end' : 'flex justify-start'}>
              <div className={isUser ? wrapClassUser : wrapClassAI}>
                <div className={"text-[10px] uppercase font-bold mb-1 tracking-wider " + (isUser ? 'text-blue-200' : 'text-slate-400')}>
                  {isUser ? '🕵️‍♂️ TÚ (UNIDAD INTERVINIENTE)' : '🗣️ ENTORNO DEL CASO'}
                </div>
                <div className={"prose prose-sm leading-relaxed " + (isUser ? 'prose-invert' : 'prose-invert prose-p:text-slate-200')}>
                  <ReactMarkdown>{msg.parts[0].text}</ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}

        {interactMutation.isPending && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-2xl rounded-tl-sm p-4 bg-slate-800 border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2 max-w-4xl mx-auto relative relative rounded-xl bg-slate-800 p-1 border border-slate-700 focus-within:border-blue-500/50 shadow-inner"
        >
          <input
            type="text"
            className="flex-1 bg-transparent border-none text-white focus:ring-0 px-4 py-3 text-sm placeholder-slate-500"
            placeholder="Ej: Levanto las manos y digo '¡Alto Policía!'"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={interactMutation.isPending || history.some(m => m.role === 'system')}
          />
          <button
            type="submit"
            disabled={!input.trim() || interactMutation.isPending || history.some(m => m.role === 'system')}
            className={"p-3 rounded-lg flex items-center justify-center transition-colors " + 
              (input.trim() && !interactMutation.isPending
                ? 'bg-blue-600 text-white hover:bg-blue-500' 
                : 'bg-slate-700 text-slate-500 cursor-not-allowed')
            }
          >
             <svg className="w-5 h-5 translate-x-px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-600 mt-2">
            La IA evaluará si tu accionar amerita culminar la intervención. Escribe tus acciones o diálogos claros.
        </p>
      </div>

    </div>
  );
}
