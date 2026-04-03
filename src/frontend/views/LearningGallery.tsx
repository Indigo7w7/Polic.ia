import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../shared/utils/trpc';
import { useUserStore } from '../store/useUserStore';
import {
  BookOpen, MessageCircle, Brain, ArrowLeft,
  Sparkles, ChevronRight, GraduationCap, Shield,
  Zap, Search, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DrillPlayer } from '../components/DrillPlayer';
import { MissionMap } from '../components/MissionMap';
import { type inferRouterOutputs } from '@trpc/server';
import { type AppRouter } from '../../backend/server/routers';

const areaIcons: Record<string, React.ReactNode> = {
  'LITERATURA': <BookOpen className="w-6 h-6" />,
  'COMUNICACIÓN': <MessageCircle className="w-6 h-6" />,
  'LITERATURA PERUANA': <BookOpen className="w-6 h-6" />,
  'RAZONAMIENTO VERBAL': <Brain className="w-6 h-6" />,
  'HISTORIA': <Shield className="w-6 h-6" />,
  'GEOGRAFÍA': <GraduationCap className="w-6 h-6" />,
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
  const [isPerfectionMode, setIsPerfectionMode] = useState(false);

  const areasQuery = trpc.learning.getAreas.useQuery(undefined, {
    staleTime: 1000 * 30,
  });

  const contentQuery = trpc.learning.getContentByArea.useQuery(
    { areaId: selectedAreaId || 0, school: modalidad_postulacion || 'BOTH' },
    { enabled: !!selectedAreaId, staleTime: 1000 * 30 }
  );

  // BUG-15 FIX: only fetch perfection stats when an area is selected
  const perfectionQuery = trpc.learningReview.getPerfectionStats.useQuery(undefined, {
    enabled: !!selectedAreaId,
  });

  const selectedArea = areasQuery.data?.find(a => a.id === selectedAreaId);

  const progressQuery = trpc.learningProgress.getUserProgress.useQuery(undefined, {
    enabled: !!selectedAreaId,
  });

  const completedUnits = useMemo(
    () => new Set(progressQuery.data?.map(p => p.unitId) || []),
    [progressQuery.data]
  );

  const filteredAreas = areasQuery.data?.filter(area =>
    area.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // BUG-13 FIX: memoize lock status map — avoids O(n²) sort on every render
  const lockStatusMap = useMemo(() => {
    const items = contentQuery.data || [];
    const sorted = [...items].sort((a, b) => (a.level || 0) - (b.level || 0) || a.id - b.id);
    const map = new Map<number, { locked: boolean; reason: string | null }>();
    sorted.forEach((item, idx) => {
      if (idx === 0) {
        map.set(item.id, { locked: false, reason: null });
        return;
      }
      const prev = sorted[idx - 1];
      const isPrevCompleted = completedUnits.has(prev.id);
      if (!isPrevCompleted) {
        map.set(item.id, { locked: true, reason: `Debes dominar: ${prev.title}` });
      } else {
        map.set(item.id, { locked: false, reason: null });
      }
    });
    return map;
  }, [contentQuery.data, completedUnits]);

  const openPerfectionMode = () => {
    if (!selectedAreaId) return;
    setIsPerfectionMode(true);
    setViewerContent({
      id: -1,
      areaId: selectedAreaId,
      title: `REPASO: ${selectedArea?.name || 'MATERIA'}`,
      body: 'Sesión focalizada en tus debilidades actuales para lograr la maestría total.',
      level: 1,
      schoolType: 'BOTH',
      questions: [],
    } as any);
  };

  const hasPerfectionData =
    !!perfectionQuery.data && (perfectionQuery.data as any[]).some(s => s.unitId !== null);

  return (
    <div className="min-h-screen bg-[#060d1a] text-white font-sans selection:bg-blue-500/30">
      {/* Grid background */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#2563eb 1px, transparent 1px), linear-gradient(90deg, #2563eb 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* ── CONTENT VIEWER MODAL ── */}
      <AnimatePresence>
        {viewerContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border-x-0 sm:border border-slate-700/50 w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
            >
              {viewerContent.questions &&
              ((viewerContent.questions as any[]).length > 0 || isPerfectionMode) ? (
                <DrillPlayer
                  unitId={viewerContent.id}
                  areaId={viewerContent.areaId}
                  title={viewerContent.title}
                  questions={viewerContent.questions as any[]}
                  isPerfectionMode={isPerfectionMode}
                  onClose={() => {
                    setViewerContent(null);
                    setIsPerfectionMode(false);
                    // Refresh progress after completing a drill
                    progressQuery.refetch();
                  }}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800">
                    <div>
                      <h3 className="text-xl font-black text-white">{viewerContent.title}</h3>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-2 mt-1">
                        <span>Nivel {viewerContent.level}</span>
                        <span>•</span>
                        <span className={viewerContent.schoolType === 'BOTH' ? 'text-blue-400' : 'text-emerald-400'}>
                          {viewerContent.schoolType === 'BOTH' ? 'Multimodal' : viewerContent.schoolType}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setViewerContent(null)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 md:p-8 overflow-y-auto custom-scrollbar flex-1">
                    <div className="prose prose-invert max-w-none">
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
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative p-4 md:p-8 max-w-7xl mx-auto">
        {/* ── HEADER ── */}
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
                <h1 className="text-4xl font-black tracking-tight">
                  Mejora tu <span className="text-blue-400">Nivel</span>
                </h1>
                <p className="text-slate-400 text-sm font-medium">
                  Domina cada materia con contenido estratégico especializado.
                </p>
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

        {/* ── AREAS GRID ── */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          {areasQuery.isLoading
            ? Array(5)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="h-32 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse" />
                ))
            : filteredAreas?.map((area, i) => (
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
                  <div
                    className={`p-3 rounded-xl mb-4 inline-block ${
                      selectedAreaId === area.id ? 'bg-white/20' : 'bg-blue-600/10 text-blue-400'
                    }`}
                  >
                    {areaIcons[area.name] || <BookOpen className="w-6 h-6" />}
                  </div>
                  <h3
                    className={`font-black text-sm uppercase tracking-wider ${
                      selectedAreaId === area.id ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    {area.name}
                  </h3>
                  {selectedAreaId === area.id && (
                    <motion.div
                      layoutId="activeGlow"
                      className="absolute inset-0 bg-white/5 pointer-events-none"
                    />
                  )}
                </motion.button>
              ))}
        </section>

        {/* ── CONTENT DISPLAY ── */}
        {/* BUG-01 FIX: restore the conditional ternary so the empty-state renders correctly */}
        <AnimatePresence mode="wait">
          {selectedAreaId ? (
            <motion.div
              key={selectedAreaId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col items-center"
            >
              {/* BUG-15 area-scoped: perfection banner only shows for current area */}
              {hasPerfectionData && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={openPerfectionMode}
                  className="w-full max-w-xl relative p-5 sm:p-7 bg-gradient-to-br from-red-600/30 to-blue-900/40 border border-red-500/30 rounded-[32px] overflow-hidden group shadow-2xl cursor-pointer mb-10"
                >
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                  <div className="relative z-10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-600 rounded-xl shadow-lg shadow-red-600/40">
                        <Zap className="w-6 h-6 text-white fill-current" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-lg font-black text-white uppercase tracking-tighter italic">
                          Sincronizar Repaso Intensivo_
                        </h3>
                        <p className="text-red-400/80 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                          Detectamos puntos débiles en esta materia.
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-red-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              )}

              {/* ── MISSION MAP ── */}
              {contentQuery.isLoading ? (
                <div className="p-20 text-center">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <div className="text-[10px] uppercase font-black tracking-widest text-slate-500">
                    Generando Mapa de Operaciones...
                  </div>
                </div>
              ) : (
                // BUG-02 FIX: pass isPremium so MissionMap enforces premium locks correctly
                <MissionMap
                  areaName={selectedArea?.name || ''}
                  units={contentQuery.data || []}
                  completedUnits={completedUnits}
                  isPremium={isPremium}
                  onSelectUnit={(unit) => {
                    const item = unit as ContentItem;
                    const meritLock = lockStatusMap.get(item.id);
                    const isPremiumLocked = !isPremium && (item.level || 1) > 1;
                    if (isPremiumLocked) {
                      navigate('/yape-checkout');
                      return;
                    }
                    if (meritLock?.locked) {
                      toast.error(meritLock.reason || 'Completa la misión anterior primero.');
                      return;
                    }
                    setViewerContent(item);
                  }}
                />
              )}
            </motion.div>
          ) : (
            // Empty state: no area selected
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-24 bg-slate-900/20 rounded-[40px] border border-dashed border-slate-800"
            >
              <div className="max-w-xs mx-auto space-y-4">
                <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8 text-slate-600" />
                </div>
                <h3 className="text-xl font-black text-slate-300">Selecciona una materia</h3>
                <p className="text-slate-500 text-sm">
                  Explora las diferentes áreas de estudio para comenzar tu entrenamiento intensivo.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
