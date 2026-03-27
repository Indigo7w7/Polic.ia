import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Brain, RotateCcw, CheckCircle2, XCircle, Loader2, Info, ArrowLeft, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { trpc } from '../../shared/utils/trpc';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';

interface Flashcard {
  id: number;
  question: string;
  options: string[];
  correctOption: number;
  level: number;
}

export const Flashcards: React.FC = () => {
  const navigate = useNavigate();
  const { uid, isPremiumActive } = useUserStore();
  const isPremium = isPremiumActive();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sessionErrors, setSessionErrors] = useState(0);

  // tRPC Hooks
  const pendingCards = trpc.leitner.getPending.useQuery({ userId: uid || '' }, { enabled: !!uid });
  const updateCardMutation = trpc.leitner.updateCard.useMutation();

  const cards = pendingCards.data || [];
  const loading = pendingCards.isLoading;

  const handleResponse = async (success: boolean) => {
    const card = cards[currentIndex];
    if (processing || !card) return;
    setProcessing(true);

    if (!success) {
      setSessionErrors(prev => prev + 1);
    }

    try {
      await updateCardMutation.mutateAsync({
        id: card.id,
        success,
      });

      // Move to next card
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setProcessing(false);
      }, 300);
    } catch (error) {
      console.error('Error updating card:', error);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  if (!isPremium && sessionErrors >= 3) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-12 border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
          <CardContent>
            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30 shadow-lg shadow-blue-900/20">
              <Brain className="w-8 h-8 text-blue-400 font-black" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-white">¡Buen intento en el Polígono!</h2>
            <p className="text-slate-400 mb-6 text-sm leading-relaxed">
              La versión gratuita te permite equivocarte hasta 3 veces para probar el poder de la repetición espaciada. 
              Para dominar el **100% de tu banco de errores** ilimitadamente y forzar tu memoria a largo plazo, desbloquea la versión PRO.
            </p>
            <div className="space-y-3">
              <Button variant="primary" className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black shadow-lg shadow-amber-900/20 border border-amber-400/50" onClick={() => navigate('/yape-checkout')}>
                Activar Repaso Ilimitado PRO
              </Button>
              <Button variant="ghost" className="w-full text-slate-500" onClick={() => navigate('/')}>
                Volver al Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] p-4 md:p-8 font-sans">
      <header className="max-w-2xl mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
              <Brain className="w-6 h-6 text-blue-500" />
              Repaso Inteligente
              {!isPremium && <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-500/30">MODO DEMO</span>}
            </h1>
            <p className="text-sm text-slate-400">Algoritmo Leitner activo</p>
          </div>
        </div>
        <div className="bg-slate-800 px-3 py-1 rounded-full text-xs font-mono">
          {currentIndex} / {cards.length} Pendientes
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {!currentCard ? (
          <Card className="bg-slate-900/50 border-slate-800 text-center py-12">
            <CardContent>
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">¡Todo al día!</h2>
              <p className="text-slate-400 mb-6">Has revisado todas tus flashcards pendientes por hoy.</p>
              <Button onClick={() => navigate('/')}>Volver al Dashboard</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Flashcard Container */}
            <div 
              className="relative h-[400px] w-full perspective-1000 cursor-pointer"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <motion.div
                className="w-full h-full relative preserve-3d transition-all duration-500"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                {/* Front */}
                <Card className="absolute inset-0 backface-hidden bg-slate-900 border-slate-800 flex items-center justify-center p-8 text-center">
                  <CardContent>
                    <div className="text-xs uppercase tracking-widest text-blue-500 font-bold mb-4">Pregunta</div>
                    <p className="text-xl md:text-2xl font-medium leading-relaxed">
                      {currentCard.question}
                    </p>
                    <div className="mt-8 text-slate-500 text-sm flex items-center justify-center gap-2">
                      <RotateCcw className="w-4 h-4" /> Toca para ver respuesta
                    </div>
                  </CardContent>
                </Card>

                {/* Back */}
                <Card 
                  className="absolute inset-0 backface-hidden bg-slate-800 border-blue-500/30 flex items-center justify-center p-8 text-center"
                  style={{ transform: 'rotateY(180deg)' }}
                >
                  <CardContent>
                    <div className="text-xs uppercase tracking-widest text-emerald-500 font-bold mb-4">Respuesta Correcta</div>
                    <p className="text-xl md:text-2xl font-medium leading-relaxed text-white">
                      {currentCard.options[currentCard.correctOption]}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Controls */}
            <AnimatePresence>
              {isFlipped && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <Button 
                    variant="destructive" 
                    className="h-16 text-lg gap-2"
                    onClick={(e) => { e.stopPropagation(); handleResponse(false); }}
                    disabled={processing}
                  >
                    <XCircle className="w-6 h-6" />
                    Aún me cuesta
                  </Button>
                  <Button 
                    variant="default" 
                    className="h-16 text-lg gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={(e) => { e.stopPropagation(); handleResponse(true); }}
                    disabled={processing}
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    Comprendido
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info Box */}
            <div className="bg-blue-950/20 border border-blue-900/30 p-4 rounded-lg flex gap-3">
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-200/70">
                <p className="font-bold text-blue-400 mb-1">¿Cómo funciona?</p>
                Si marcas "Comprendido", la pregunta subirá de nivel y aparecerá en unos días. Si marcas "Aún me cuesta", volverá al Nivel 1 para refuerzo inmediato.
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
      `}</style>
    </div>
  );
};
