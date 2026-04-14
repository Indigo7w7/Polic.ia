import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, BrainCircuit, RotateCcw, Target, X, LayoutGrid, Shield, Sliders, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (p: string) => location.pathname === p;

  const navItems = [
    { path: '/',          icon: Home,     label: 'Inicio'   },
    { path: '/galeria',   icon: BookOpen, label: 'Galería'  },
    { path: '/progreso',  icon: Target,   label: 'Radar'    },
    { path: '/poligono',  icon: BrainCircuit, label: 'Polígono' },
    { path: '/dashboard/scenarios', icon: Shield, label: 'Central 105' },
    { path: '/generator', icon: Sliders, label: 'Generador' },
    { path: '/medallas',    icon: Trophy,  label: 'Medallas'  },
  ];

  return (
    <>
      {/* ─── DESKTOP SIDEBAR ─────────────────────────────────── */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 z-[100] hidden lg:flex flex-col items-center gap-3">
        {navItems.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            title={label}
            className="relative group w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200"
          >
            {isActive(path) && (
              <motion.div
                layoutId="desktop-active"
                className="absolute inset-0 bg-blue-500/10 border border-blue-600/50 rounded-full shadow-[0_0_16px_rgba(37,99,235,0.15)]"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <Icon
              strokeWidth={1.5}
              className={`w-5 h-5 relative z-10 transition-colors ${
                isActive(path)
                  ? 'text-blue-400'
                  : 'text-slate-500 group-hover:text-slate-200'
              }`}
            />
          </button>
        ))}
        <div className="w-5 h-px bg-slate-800 rounded-full" />
        <button
          onClick={() => navigate('/reentrenamiento')}
          title="Anti-Caída"
          className="relative group w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200"
        >
          {isActive('/reentrenamiento') && (
            <motion.div
              layoutId="desktop-active"
              className="absolute inset-0 bg-red-500/10 border border-red-500/40 rounded-full"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          )}
          <RotateCcw
            strokeWidth={1.5}
            className={`w-5 h-5 relative z-10 transition-colors ${
              isActive('/reentrenamiento') ? 'text-red-400' : 'text-slate-500 group-hover:text-red-300'
            }`}
          />
        </button>
      </div>

      {/* ─── MOBILE BOTTOM BAR ───────────────────────────────── */}
      <div className="fixed bottom-4 left-4 right-4 z-[100] lg:hidden">
        <div className="relative bg-[#0b101f]/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-700/50 px-3 py-3 flex items-center justify-between">

          {/* Izquierda */}
          <div className="flex flex-1 justify-around items-center pr-8">
            <button onClick={() => navigate('/')} className="flex flex-col items-center p-1">
              <Home strokeWidth={1.5} className={`w-5 h-5 mb-0.5 ${isActive('/') ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className={`text-[9px] font-black uppercase ${isActive('/') ? 'text-blue-400' : 'text-slate-500'}`}>Inicio</span>
            </button>
            <button onClick={() => navigate('/galeria')} className="flex flex-col items-center p-1">
              <BookOpen strokeWidth={1.5} className={`w-5 h-5 mb-0.5 ${isActive('/galeria') ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className={`text-[9px] font-black uppercase ${isActive('/galeria') ? 'text-blue-400' : 'text-slate-500'}`}>Galería</span>
            </button>
          </div>

          {/* Centro elevado — Polígono */}
          <div className="absolute left-1/2 -top-7 -translate-x-1/2">
            <button
              onClick={() => navigate('/poligono')}
              className="w-[4.5rem] h-[4.5rem] bg-blue-600 rounded-[2rem] flex items-center justify-center border-[8px] border-[#020617] shadow-[0_0_30px_rgba(37,99,235,0.5)] rotate-3 hover:rotate-0 transition-transform duration-300 relative group"
            >
              <div className="absolute inset-0 bg-white/20 rounded-[1.5rem] opacity-0 group-hover:opacity-100 transition-opacity" />
              <BrainCircuit className="w-8 h-8 text-white relative z-10" />
            </button>
          </div>

          {/* Derecha */}
          <div className="flex flex-1 justify-around items-center pl-8">
            <button onClick={() => navigate('/progreso')} className="flex flex-col items-center p-1">
              <Target strokeWidth={1.5} className={`w-5 h-5 mb-0.5 ${isActive('/progreso') ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className={`text-[9px] font-black uppercase ${isActive('/progreso') ? 'text-blue-400' : 'text-slate-500'}`}>Radar</span>
            </button>
            <button onClick={() => setIsMenuOpen(true)} className="flex flex-col items-center p-1 group">
              <RotateCcw strokeWidth={1.5} className="w-5 h-5 mb-0.5 text-slate-400 group-hover:text-red-400 transition-colors" />
              <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-red-400 transition-colors">Anti-Caída</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── MOBILE MENU SHEET ───────────────────────────────── */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[140] lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 w-full bg-[#0a0f1e] border-t border-slate-700/50 rounded-t-[2.5rem] z-[150] shadow-[0_-20px_50px_rgba(0,0,0,0.7)] lg:hidden"
            >
              <div className="p-8 pb-14">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-white font-black text-lg">Anti-Caída</h2>
                    <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Refuerzo de errores</p>
                  </div>
                  <button onClick={() => setIsMenuOpen(false)} className="p-3 bg-white/5 rounded-2xl">
                    <X className="w-5 h-5 text-slate-300" />
                  </button>
                </div>
                <button
                  onClick={() => { navigate('/reentrenamiento'); setIsMenuOpen(false); }}
                  className="w-full p-5 bg-red-500/10 border border-red-500/30 rounded-3xl flex flex-col items-center gap-3 hover:bg-red-500/20 transition-colors"
                >
                  <div className="p-4 rounded-full bg-red-500/20 text-red-400">
                    <RotateCcw className="w-7 h-7" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-white">Entrenamiento Anti-Caída</p>
                    <p className="text-xs text-slate-400 mt-0.5">Practica tus preguntas con más errores</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
