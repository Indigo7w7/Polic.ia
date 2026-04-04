import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FileText, Plus, Trash2, X, Save, BookOpen, AlertTriangle, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { trpc } from '../../../shared/utils/trpc';

type UnitData = {
  title: string;
  body: string;
  schoolType?: 'EO' | 'EESTP' | 'BOTH';
  questions?: any[];
};

type TopicData = {
  name: string;
  units: UnitData[];
};

export const VisualSyllabusEditor = ({ 
  areaId, 
  onConfirm, 
  onClose 
}: { 
  areaId?: number | null; 
  onConfirm: (data: any) => void; 
  onClose: () => void; 
}) => {
  const [areaName, setAreaName] = useState('');
  const [topics, setTopics] = useState<TopicData[]>([]);
  
  // For editing a specific unit
  const [editingTopicIdx, setEditingTopicIdx] = useState<number | null>(null);
  const [editingUnitIdx, setEditingUnitIdx] = useState<number | null>(null);
  const [unitForm, setUnitForm] = useState<UnitData | null>(null);

  // If editing an existing area, fetch current JSON
  const currentJson = trpc.adminCourses.getAreaJSON.useQuery(
    { areaId: areaId as number },
    { enabled: !!areaId, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (currentJson.data) {
      setAreaName(currentJson.data.areaName);
      setTopics(currentJson.data.topics || []);
    }
  }, [currentJson.data]);

  const handleAddTopic = () => {
    setTopics([...topics, { name: 'NUEVA CARPETA', units: [] }]);
  };

  const handleDeleteTopic = (tIdx: number) => {
    if (window.confirm('¿Borrar carpeta y TODO su contenido?')) {
      const newTopics = [...topics];
      newTopics.splice(tIdx, 1);
      setTopics(newTopics);
    }
  };

  const handleUpdateTopicName = (tIdx: number, newName: string) => {
    const newTopics = [...topics];
    newTopics[tIdx].name = newName;
    setTopics(newTopics);
  };

  const handleAddUnit = (tIdx: number) => {
    setEditingTopicIdx(tIdx);
    setEditingUnitIdx(-1); // -1 means new
    setUnitForm({ title: '', body: '', schoolType: 'BOTH', questions: [] });
  };

  const handleEditUnit = (tIdx: number, uIdx: number) => {
    setEditingTopicIdx(tIdx);
    setEditingUnitIdx(uIdx);
    setUnitForm({ ...topics[tIdx].units[uIdx] });
  };

  const handleDeleteUnit = (tIdx: number, uIdx: number) => {
    if (window.confirm('¿Eliminar esta lección?')) {
      const newTopics = [...topics];
      newTopics[tIdx].units.splice(uIdx, 1);
      setTopics(newTopics);
    }
  };

  const saveUnitForm = () => {
    if (!unitForm || editingTopicIdx === null) return;
    if (!unitForm.title.trim() || !unitForm.body.trim()) {
      alert("El título y el contenido son obligatorios");
      return;
    }

    const newTopics = [...topics];
    if (editingUnitIdx === -1) {
      // Create
      newTopics[editingTopicIdx].units.push(unitForm);
    } else if (editingUnitIdx !== null) {
      // Update
      newTopics[editingTopicIdx].units[editingUnitIdx] = unitForm;
    }
    
    setTopics(newTopics);
    setUnitForm(null);
    setEditingTopicIdx(null);
    setEditingUnitIdx(null);
  };

  const handleProcess = () => {
    if (!areaName.trim()) return alert("Debe darle un nombre a la Materia (ej. COMUNICACIÓN)");
    if (topics.length === 0) return alert("Debe agregar al menos una Carpeta (Tema)");
    
    const payload = {
      areaName: areaName.toUpperCase(),
      topics: topics
    };
    onConfirm(payload);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl font-mono">
      {/* Unit Form Modal Level 2 */}
      {unitForm && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90">
          <div className="w-full max-w-2xl bg-cyan-950/20 border border-cyan-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-cyan-950/50 border-b border-cyan-500/30 flex justify-between items-center">
              <span className="text-cyan-300 font-bold tracking-widest text-sm text-shadow">
                {editingUnitIdx === -1 ? 'NUEVA LECCIÓN (ARCHIVO)' : 'EDITAR LECCIÓN'}
              </span>
              <button onClick={() => setUnitForm(null)} className="text-cyan-700 hover:text-cyan-400">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-[10px] text-cyan-600 block mb-1">TÍTULO DEL ARCHIVO (Ej: EL SUSTANTIVO)</label>
                <input 
                  type="text" 
                  value={unitForm.title} 
                  onChange={e => setUnitForm({...unitForm, title: e.target.value.toUpperCase()})}
                  className="w-full bg-black/50 border border-cyan-900 rounded p-3 text-cyan-300 text-sm outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex gap-4">
                 <div className="flex-1">
                   <label className="text-[10px] text-cyan-600 block mb-1">TIPO DE ESCUELA (Público)</label>
                   <select 
                     value={unitForm.schoolType} 
                     onChange={e => setUnitForm({...unitForm, schoolType: e.target.value as any})}
                     className="w-full bg-black/50 border border-cyan-900 rounded p-3 text-cyan-300 text-sm outline-none focus:border-cyan-500"
                   >
                     <option value="BOTH">AMBOS (EO y EESTP)</option>
                     <option value="EO">SOLO OFICIALES (EO)</option>
                     <option value="EESTP">SOLO TÉCNICOS (EESTP)</option>
                   </select>
                 </div>
              </div>
              <div>
                <label className="text-[10px] text-cyan-600 block mb-1">CONTENIDO TEÓRICO (Cuerpo de la lección)</label>
                <textarea 
                  value={unitForm.body} 
                  onChange={e => setUnitForm({...unitForm, body: e.target.value})}
                  className="w-full h-[250px] bg-black/50 border border-cyan-900 rounded p-3 text-cyan-300 text-sm outline-none focus:border-cyan-500 resize-none font-sans"
                  placeholder="Escribe aquí el contenido teórico. Puedes usar saltos de línea normales."
                />
              </div>
            </div>
            <div className="p-4 border-t border-cyan-900/50 bg-black/50 flex justify-end gap-3">
               <button onClick={() => setUnitForm(null)} className="px-4 py-2 border border-red-900/50 text-red-500 rounded hover:bg-red-900/20 text-xs font-bold tracking-widest">CANCELAR</button>
               <button onClick={saveUnitForm} className="px-6 py-2 bg-cyan-600 text-black hover:bg-cyan-500 font-black rounded text-xs tracking-widest">GUARDAR ARCHIVO</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Eagle Eye Editor Modal */}
      <div className="w-full max-w-5xl bg-black border border-cyan-700/50 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(34,211,238,0.2)] flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-8 py-5 border-b border-cyan-900/50 bg-cyan-950/20 shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-cyan-400" />
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-white">EAGLE EYE EXPLORER</span>
              <p className="text-[9px] text-cyan-700 uppercase tracking-widest mt-0.5">Gestor Visual de Carpetas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-900 rounded-xl text-slate-500 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6">
          
          {/* Materia Name */}
          <div className="space-y-2 relative">
             <label className="text-[10px] text-cyan-600 font-bold tracking-widest">NOMBRE DE LA MATERIA (RAÍZ)</label>
             <input 
                type="text"
                placeholder="Ej. MATEMÁTICA BÁSICA"
                value={areaName}
                onChange={e => setAreaName(e.target.value.toUpperCase())}
                className="w-full bg-cyan-950/10 border-2 border-cyan-900/50 rounded-xl p-4 text-cyan-300 font-black text-xl tracking-widest outline-none focus:border-cyan-500 shadow-inner"
             />
             {areaId && (
              <span className="absolute right-4 top-[50%] px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-[9px] font-black text-cyan-400">
                EDITANDO_ID: #{areaId}
              </span>
             )}
          </div>

          <div className="h-px w-full bg-cyan-900/30" />

          {/* Topics Array */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-[10px] text-cyan-500 tracking-widest leading-none">ESTRUCTURA DE CARPETAS (Temas determinarán los NIVELES automáticamente)</span>
             </div>

             {topics.map((topic, tIdx) => (
                <div key={tIdx} className="bg-cyan-950/10 border border-cyan-900/40 rounded-xl overflow-hidden group">
                   {/* Folder Header */}
                   <div className="flex items-center gap-2 p-3 bg-cyan-950/40 border-b border-cyan-900/50">
                      <Folder className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="currentColor" />
                      <input 
                         type="text" 
                         value={topic.name}
                         onChange={(e) => handleUpdateTopicName(tIdx, e.target.value.toUpperCase())}
                         placeholder="NOMBRE DE LA CARPETA (Ej. GRAMÁTICA)"
                         className="flex-1 bg-transparent text-amber-300 font-bold min-w-0 outline-none text-sm placeholder:text-amber-800/50"
                      />
                      <span className="text-[9px] text-cyan-700 bg-black/50 px-2 py-1 rounded hidden md:block">NIVEL {tIdx + 1} AUTOMÁTICO</span>
                      <button onClick={() => handleDeleteTopic(tIdx)} className="p-1.5 text-red-900 hover:text-red-500 bg-black/40 rounded" title="Borrar Carpeta">
                         <Trash2 size={16} />
                      </button>
                   </div>
                   
                   {/* Unit List */}
                   <div className="p-3 bg-black/20">
                      {topic.units.length === 0 ? (
                         <div className="text-center py-6 text-cyan-900/50 font-sans italic text-xs">
                           No hay archivos en esta carpeta.
                         </div>
                      ) : (
                         <div className="space-y-2">
                            {topic.units.map((unit, uIdx) => (
                               <div key={uIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-black/60 border border-cyan-900/30 rounded-lg hover:border-cyan-700/50 transition-colors">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                     <FileText className="w-4 h-4 text-cyan-500 shrink-0" />
                                     <div className="truncate">
                                        <div className="text-xs text-cyan-300 font-bold truncate">{unit.title || 'SIN TÍTULO'}</div>
                                        <div className="text-[9px] text-cyan-700">TIPO: {unit.schoolType || 'BOTH'}</div>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                     <button onClick={() => handleEditUnit(tIdx, uIdx)} className="p-1 text-cyan-700 hover:text-cyan-400 bg-cyan-950/50 rounded" title="Editar Archivo">
                                        <Edit3 size={14} />
                                     </button>
                                     <button onClick={() => handleDeleteUnit(tIdx, uIdx)} className="p-1 text-red-900 hover:text-red-500 bg-red-950/20 rounded" title="Borrar Archivo">
                                        <Trash2 size={14} />
                                     </button>
                                  </div>
                               </div>
                            ))}
                         </div>
                      )}

                      <button 
                         onClick={() => handleAddUnit(tIdx)}
                         className="mt-3 flex items-center gap-2 px-3 py-1.5 border border-dashed border-cyan-800 text-cyan-600 hover:bg-cyan-900/20 hover:text-cyan-400 hover:border-cyan-500 rounded-lg transition-colors w-full sm:w-auto text-[10px] tracking-widest font-bold"
                      >
                         <Plus size={14} /> AGREGAR ARCHIVO (LECCIÓN)
                      </button>
                   </div>
                </div>
             ))}

             <button 
                onClick={handleAddTopic}
                className="w-full py-4 border-2 border-dashed border-amber-900/50 bg-amber-950/10 hover:bg-amber-950/30 hover:border-amber-700 text-amber-500/70 hover:text-amber-400 font-black tracking-widest text-xs rounded-xl flex items-center justify-center gap-3 transition-colors"
             >
                <Folder className="w-5 h-5" /> CREAR NUEVA CARPETA
             </button>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-cyan-900/50 bg-black/80 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-2 text-[9px] text-cyan-800">
              <AlertTriangle className="w-3.5 h-3.5 text-cyan-700" />
              <span>AL GUARDAR, SE REEMPLAZARÁ EL CONTENIDO EXACTAMENTE COMO SE VE AQUÍ.</span>
           </div>
           <div className="flex gap-4">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-950 text-slate-500 border border-slate-900 rounded-xl hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
              >
                CANCELAR
              </button>
              <button
                disabled={currentJson.isLoading}
                onClick={handleProcess}
                className="px-6 py-2.5 bg-cyan-600 border border-cyan-400 text-black hover:bg-cyan-500 transition-all text-xs font-black uppercase tracking-widest shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:scale-105 active:scale-95 flex items-center gap-2 rounded-xl"
              >
                <Save className="w-4 h-4 fill-current" />
                {currentJson.isLoading ? 'CARGANDO...' : 'GUARDAR Y SINCRONIZAR A NUBE'}
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};
