import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../shared/utils/trpc';
import { useUserStore } from '../store/useUserStore';
import { 
  BookOpen, MessageCircle, Brain, ArrowLeft, 
  Sparkles, ChevronRight, GraduationCap, Shield,
  Lock, Zap, Search, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '../components/ui/Card';

import { useExamManager } from '../hooks/useExamManager';
import { type inferRouterOutputs } from '@trpc/server';
import { type AppRouter } from '../../backend/server/routers';

const areaIcons: Record<string, React.ReactNode> = {
  'Literatura': <BookOpen className="w-6 h-6" />,
  'Comunicación': <MessageCircle className="w-6 h-6" />,
  'Razonamiento Verbal': <Brain className="w-6 h-6" />,
  'Historia': <Shield className="w-6 h-6" />,
  'Geografía': <GraduationCap className="w-6 h-6" />,
};

type RouterOutput = inferRouterOutputs<AppRouter>;
type ContentItem = RouterOutput['learning']['getContentByArea'][number];

export const LearningGallery: React.FC = () => {
  const navigate = useNavigate();
  const { modalidad_postulacion, isPremiumActive } = useUserStore();
  const isPremium = isPremiumActive();
  
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewerContent, setViewerContent] = useState<ContentItem | null>(null);

  const areasQuery = trpc.learning.getAreas.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });
  const contentQuery = trpc.learning.getContentByArea.useQuery(
    { areaId: selectedAreaId || 0, school: modalidad_postulacion || 'BOTH' },
    { enabled: !!selectedAreaId, staleTime: 1000 * 60 * 5 }
  );
  const { startAreaPractice, startingExam } = useExamManager();
  const selectedArea = areasQuery.data?.find(a => a.id === selectedAreaId);

  const filteredAreas = areasQuery.data?.filter(area => 
    area.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#060d1a] text-white font-sans selection:bg-blue-500/30">
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `linear-gradient(#2563eb 1px, transparent 1px), linear-gradient(90deg, #2563eb 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }} />

      {/* MODAL VISOR DE CONTENIDO */}
      <AnimatePresence>
        {viewerContent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-700/50 w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800">
                <div>
                  <h3 className="text-xl font-black text-white">{viewerContent.title}</h3>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-2 mt-1">
                    <span>Nivel {viewerContent.level}</span>
                    <span>•</span>
                    <span className={viewerContent.schoolType === 'BOTH' ? 'text-blue-400' : 'text-emerald-400'}>{viewerContent.schoolType === 'BOTH' ? 'Multimodal' : viewerContent.schoolType}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setViewerContent(null)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 md:p-8 overflow-y-auto custom-scrollbar">
                <div className="prose prose-invert max-w-none">
                  {/* Since body allows markdown/html implicitly, we render it safely. For now just text with whitespace preserved. */}
                  <p className="whitespace-pre-wrap text-slate-300 leading-relaxed text-[15px]">
                    {viewerContent.body}
                  </p>
                </div>
              </div>
              <div className="p-4 border-t border-slate-800 bg-slate-900/50 text-center">
                <button 
                  onClick={() => setViewerContent(null)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold transition-colors"
                >
                  Cerrar Visor
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="space-y-2">
            <button 
              onClick={() => navigate('/')}
              className="group flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mb-4"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Volver al Dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight">Mejora tu <span className="text-blue-400">Nivel</span></h1>
                <p className="text-slate-400 text-sm font-medium">Domina cada materia con contenido estratégico especializado.</p>
              </div>
            </div>
          </div>

          <div className="relative group max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            <input 
              type="text"
              placeholder="Buscar materia o tema..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>
        </header>

        {/* Areas Grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          {areasQuery.isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-32 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse" />
            ))
          ) : (
            filteredAreas?.map((area, i) => (
              <motion.button
                key={area.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedAreaId(area.id)}
                className={`group relative p-6 rounded-3xl border transition-all duration-300 text-left overflow-hidden ${
                  selectedAreaId === area.id 
                    ? 'bg-blue-600 border-blue-400 shadow-xl shadow-blue-600/20 scale-105' 
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className={`p-3 rounded-xl mb-4 inline-block ${
                  selectedAreaId === area.id ? 'bg-white/20' : 'bg-blue-600/10 text-blue-400'
                }`}>
                  {areaIcons[area.name] || <BookOpen className="w-6 h-6" />}
                </div>
                <h3 className={`font-black text-sm uppercase tracking-wider ${
                  selectedAreaId === area.id ? 'text-white' : 'text-slate-400'
                }`}>{area.name}</h3>
                
                {selectedAreaId === area.id && (
                  <motion.div 
                    layoutId="activeGlow"
                    className="absolute inset-0 bg-white/5 pointer-events-none"
                  />
                )}
              </motion.button>
            ))
          )}
        </section>

        {/* Content Display */}
        <AnimatePresence mode="wait">
          {selectedAreaId ? (
            <motion.div
              key={selectedAreaId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <ChevronRight className="w-5 h-5 text-blue-400" />
                  Contenido Disponible
                </h2>
                <div className="flex items-center gap-3">
                  {selectedAreaId && (
                    <button
                      onClick={() => startAreaPractice(selectedAreaId, selectedArea?.name || 'Tema')}
                      disabled={!!startingExam}
                      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      {startingExam === `area-${selectedAreaId}` ? 'Cargando...' : 'Practicar este Tema'}
                    </button>
                  )}
                  {!isPremium && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full">
                      <Zap className="w-4 h-4 text-amber-400 fill-current" />
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest underline cursor-pointer" onClick={() => navigate('/yape-checkout')}>Mejorar a PRO</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contentQuery.isLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-48 bg-slate-900/20 border border-slate-800 rounded-3xl animate-pulse" />
                  ))
                ) : contentQuery.data?.length ? (
                  contentQuery.data.map((item, i) => {
                    const isLocked = !isPremium && item.level > 1;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Card className={`h-full group relative overflow-hidden transition-all duration-300 ${
                          isLocked ? 'opacity-75 grayscale bg-slate-950/50' : 'bg-slate-900/80 hover:bg-slate-800/80 hover:translate-y-[-4px] hover:border-blue-500/40 shadow-xl border-slate-800'
                        }`}>
                          <CardContent className="p-6 flex flex-col h-full">
                            <div className="flex items-start justify-between mb-4">
                              <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter ${
                                item.schoolType === 'BOTH' ? 'bg-slate-800 text-slate-400' : 
                                item.schoolType === 'EO' ? 'bg-blue-600/20 text-blue-400' : 'bg-emerald-600/20 text-emerald-400'
                              }`}>
                                {item.schoolType === 'BOTH' ? 'Multimodal' : item.schoolType}
                              </span>
                              {isLocked ? <Lock className="w-4 h-4 text-slate-600" /> : <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                            </div>

                            <h4 className="font-black text-lg mb-2 leading-tight group-hover:text-blue-400 transition-colors">
                              {item.title}
                            </h4>
                            <p className="text-sm text-slate-500 mb-6 line-clamp-3 leading-relaxed">
                              {item.body}
                            </p>

                            <div className="mt-auto flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Nivel {item.level}</span>
                              <button 
                                onClick={() => isLocked ? navigate('/yape-checkout') : setViewerContent(item as ContentItem)}
                                className={`text-xs font-black uppercase tracking-widest transition-all ${
                                  isLocked ? 'text-amber-500 hover:text-amber-400' : 'text-blue-400 hover:text-white flex items-center gap-1'
                                }`}
                              >
                                {isLocked ? 'Desbloquear' : 'Estudiar'}
                                {!isLocked && <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <BookOpen className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">No se encontró contenido en esta área todavía.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 bg-slate-900/20 rounded-[40px] border border-dashed border-slate-800"
            >
              <div className="max-w-xs mx-auto space-y-4">
                <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-xl font-black text-slate-300">Selecciona una materia</h3>
                <p className="text-slate-500 text-sm">Explora las diferentes áreas de estudio para comenzar tu entrenamiento intensivo.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
