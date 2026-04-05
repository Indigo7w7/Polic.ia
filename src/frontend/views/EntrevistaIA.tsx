import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../shared/utils/trpc';
import { useUserStore } from '../store/useUserStore';
import { 
  ChevronLeft, 
  Send, 
  Shield, 
  AlertTriangle, 
  Terminal as TerminalIcon,
  User,
  Zap,
  CheckCircle2,
  XCircle,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playUIClick } from '../utils/sounds';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const EntrevistaIA: React.FC = () => {
  const navigate = useNavigate();
  const { name, isPremiumActive } = useUserStore();
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isEnding, setIsEnding] = useState(false);
  const [verdict, setVerdict] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isPremium = isPremiumActive();
  const chatMutation = trpc.ai.chat.useMutation();

  useEffect(() => {
    if (!isPremium) {
      toast.error('Acceso Restringido. El simulador de entrevista requiere rango PRO.');
      navigate('/yape-checkout');
    }
  }, [isPremium, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Primera interacción automática
  useEffect(() => {
    if (history.length === 0 && !chatMutation.isPending) {
        handleSend("Presentarse a la entrevista.");
    }
  }, []);

  const handleSend = async (messageText: string) => {
    if (!messageText.trim() || chatMutation.isPending || isEnding) return;
    
    playUIClick();
    const newUserMsg: Message = { role: 'user', parts: [{ text: messageText }] };
    setHistory(prev => [...prev, newUserMsg]);
    setInput('');

    try {
      const { response } = await chatMutation.mutateAsync({
        history: history,
        message: messageText
      });

      const newAIReply: Message = { role: 'model', parts: [{ text: response }] };
      setHistory(prev => [...prev, newAIReply]);

      // Detectar veredicto o fin de entrevista
      if (response.includes('BAJA DESHONROSA') || response.includes('ELIMINADO')) {
        setVerdict('REJECTED');
        setIsEnding(true);
      } else if (response.includes('VEREDICTO') || response.includes('DIAGNÓSTICO FINAL')) {
        setVerdict('APPROVED'); // O lo que la IA decida, pero mostramos pantalla final
        setIsEnding(true);
      }
    } catch (err) {
      toast.error('Error de comunicación táctica.');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-cyan-400 font-mono selection:bg-cyan-500/30 overflow-hidden flex flex-col relative">
      {/* Tactical Overlays */}
      <div className="fixed inset-0 pointer-events-none z-[60] opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
      <div className="fixed inset-0 pointer-events-none z-[60] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,0,0.02))] bg-[length:100%_2px,3px_100%]" />

      <header className="p-4 md:p-6 pb-2">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-slate-900/40 border border-cyan-500/20 rounded-[2.5rem] relative overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/[0.03] rounded-full blur-[80px]" />
          
          <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
            <button 
              onClick={() => navigate('/')}
              className="p-3 bg-slate-950 border border-cyan-500/10 rounded-2xl text-cyan-600 hover:text-cyan-400 transition-all hover:scale-105"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="text-[10px] font-black text-cyan-600 uppercase tracking-[0.3em] mb-1">Evaluación Psicotáctica_</div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Entrevista IA</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="flex flex-col items-end mr-4">
              <div className="text-[8px] font-black text-cyan-900 uppercase tracking-[0.2em] mb-1">Enlace Activo</div>
              <div className="text-xs font-black text-emerald-500 uppercase tracking-widest font-mono">GENERAL_S_X</div>
            </div>
            <div className="p-4 bg-slate-950 border border-cyan-500/10 rounded-2xl text-amber-500">
              <Shield className="w-8 h-8 animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar relative">
        <div className="max-w-3xl mx-auto space-y-6">
          <AnimatePresence>
            {history.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-8 h-8 rounded border flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-cyan-900/30 border-cyan-800 text-cyan-400' : 'bg-red-950/30 border-red-900 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                </div>
                <div className={`max-w-[80%] p-4 rounded-xl border ${
                  msg.role === 'user' 
                    ? 'bg-cyan-950/20 border-cyan-800 text-cyan-100 rounded-tr-none' 
                    : 'bg-slate-900/40 border-slate-800 text-slate-100 rounded-tl-none leading-relaxed'
                }`}>
                  <div className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-50">
                    {msg.role === 'user' ? 'Postulante' : 'General Inspector'}
                  </div>
                  <p className="text-sm md:text-base whitespace-pre-wrap">{msg.parts[0].text}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {chatMutation.isPending && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
               <div className="w-8 h-8 rounded border bg-red-950/30 border-red-900 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-red-500 animate-pulse" />
               </div>
               <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-red-500/50 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />)}
                  </div>
               </div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="p-4 bg-black/90 border-t border-cyan-900 relative z-50">
        <div className="max-w-3xl mx-auto">
          {!isEnding ? (
            <div className="relative group">
              <input
                autoFocus
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend(input)}
                placeholder="Escriba su respuesta clara y concisa..."
                className="w-full bg-cyan-950/10 border border-cyan-900 rounded-xl px-12 py-4 text-sm focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all placeholder:text-cyan-900"
              />
              <Brain className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-900 group-focus-within:text-cyan-500 transition-colors" />
              <button
                onClick={() => handleSend(input)}
                disabled={chatMutation.isPending || !input.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-cyan-600 hover:bg-cyan-500 text-slate-900 rounded-lg transition-all disabled:opacity-30 disabled:grayscale"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`p-6 rounded-2xl border-2 text-center space-y-4 ${
               verdict === 'APPROVED' ? 'bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-red-950/30 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
            }`}>
               <div className="flex items-center justify-center gap-3">
                 {verdict === 'APPROVED' ? <CheckCircle2 className="w-8 h-8 text-emerald-500" /> : <XCircle className="w-8 h-8 text-red-500" />}
                 <h3 className="text-xl font-black uppercase tracking-[0.2em]">Fin de la Evaluación</h3>
               </div>
               <p className="text-sm text-slate-300 font-bold uppercase tracking-widest">{verdict === 'APPROVED' ? 'Veredicto emitido. Operación completada.' : 'Baja deshonrosa emitida de inmediato.'}</p>
               <button 
                onClick={() => navigate('/')} 
                className={`px-8 py-3 rounded-xl font-black text-xs tracking-widest uppercase transition-all ${
                  verdict === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-500 text-black' : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
               >
                 Regresar al Cuartel
               </button>
            </motion.div>
          )}
          <div className="mt-3 flex justify-between text-[8px] font-black text-cyan-900 uppercase tracking-widest">
            <span>CONECTADO AL NÚCLEO DE IA GEMINI</span>
            <span>ENCRIPTACIÓN TÁCTICA ACTIVA</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
