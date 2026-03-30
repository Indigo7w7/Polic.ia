import React, { useState } from 'react';
import { trpc } from '../../shared/utils/trpc';
import { auth } from '@/src/firebase';
import { updateProfile as firebaseUpdateProfile } from 'firebase/auth';
import { useUserStore } from '../store/useUserStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Save, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const MILITARY_SEEDS = ['Alpha', 'Bravo', 'Delta', 'Echo', 'Falcon', 'Ghost', 'Hunter', 'Iron', 'Justice', 'Knight', 'Major', 'Nova', 'Oscar', 'Patriot', 'Ranger', 'Strike', 'Titan', 'Vanguard', 'Wolf', 'X-ray'];

export const Profile: React.FC = () => {
  const { uid, name, photoURL, age, city, profileEdited, setUserData, isPremiumActive } = useUserStore();
  const navigate = useNavigate();
  const isPremium = isPremiumActive();
  
  const [newName, setNewName] = useState(name === 'Invitado' ? '' : name);
  const [newAge, setNewAge] = useState(age ? String(age) : '');
  const [newCity, setNewCity] = useState(city || '');
  const [selectedAvatar, setSelectedAvatar] = useState(photoURL || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Tactical&backgroundColor=0f172a`);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = !profileEdited;

  const updateProfileMutation = trpc.user.updateProfile.useMutation();

  const generateRandomAvatar = () => {
    if (!canEdit) return;
    const randomSeed = MILITARY_SEEDS[Math.floor(Math.random() * MILITARY_SEEDS.length)] + Math.floor(Math.random() * 100);
    // Darker, tactical backgrounds
    const colors = ['0f172a', '1e293b', '334155', '064e3b', '450a0a', '3f2b05'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setSelectedAvatar(`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${randomSeed}&backgroundColor=${randomColor}`);
  };

  const profileQuery = trpc.user.getProfile.useQuery({ uid: uid || '' }, { enabled: !!uid });
  const utils = trpc.useUtils();

  const handleSave = async () => {
    if (!canEdit) return;
    if (!newName.trim()) {
      toast.error('El alias no puede estar vacío.');
      return;
    }
    
    setIsSaving(true);
    try {
      const profileData = {
        uid: uid!,
        name: newName,
        photoURL: selectedAvatar,
        age: newAge ? parseInt(newAge) : undefined,
        city: newCity || undefined,
      };

      // 1. Update MySQL (Source of Truth)
      await updateProfileMutation.mutateAsync(profileData);

      // 2. Invalidate tRPC Cache to force App.tsx to reload fresh data
      await utils.user.getProfile.invalidate();

      // 3. Update Local Store for immediate feedback
      setUserData({ 
        name: newName, 
        photoURL: selectedAvatar,
        age: newAge ? parseInt(newAge) : null,
        city: newCity || null,
        profileEdited: true
      });

      toast.success('Expediente actualizado exitosamente.');
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar el expediente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-8 text-white font-mono">
      <header className="max-w-2xl mx-auto flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => navigate('/')} className="shrink-0 bg-slate-900 border-slate-700">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Button>
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <User className="w-6 h-6 text-cyan-500" />
            Expediente de Servicio
          </h1>
          <p className="text-xs text-cyan-500/70 uppercase tracking-widest font-bold mt-1">
            Revisión o actualización de identidad
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto space-y-6">
        {!canEdit && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-4 text-red-400">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <div className="text-xs font-black uppercase tracking-widest leading-relaxed">
              Expediente Bloqueado: Los datos solo pueden editarse una vez para garantizar la integridad institucional.
            </div>
          </div>
        )}

        <Card className={`bg-slate-900/50 border-cyan-900/40 shadow-2xl overflow-hidden transition-opacity ${!canEdit ? 'opacity-80' : ''}`}>
          <div className="h-24 bg-gradient-to-r from-cyan-950 to-blue-950 relative">
             <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#020617]/80 to-transparent" />
          </div>
          
          <CardContent className="pt-0 relative">
            <div className="flex flex-col items-center -mt-12 mb-8">
              <div className="relative group">
                <div className={`w-24 h-24 rounded-2xl border-4 border-[#060d1a] shadow-xl overflow-hidden bg-slate-800 ${!canEdit ? 'grayscale' : ''}`}>
                  <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                {canEdit && (
                  <button 
                    onClick={generateRandomAvatar}
                    className="absolute -bottom-2 -right-2 p-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-xl shadow-lg shadow-cyan-500/50 transition-transform hover:scale-110 active:scale-95 border-2 border-[#020617]"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-cyan-500/70 mt-3 uppercase tracking-widest font-bold">
                {canEdit ? 'Generar nuevo Avatar' : 'Avatar Identificado'}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">
                  Rango Táctico
                </label>
                <div className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl font-bold flex items-center justify-between shadow-inner">
                  <span>{isPremium ? 'Agente Élite PRO' : 'Postulante Base'}</span>
                  {isPremium 
                    ? <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded font-black tracking-widest uppercase border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]">Rango Confirmado</span>
                    : <button onClick={() => navigate('/yape-checkout')} className="text-[10px] bg-cyan-900/30 hover:bg-cyan-800 border border-cyan-800/50 text-cyan-400 px-2 py-1 rounded tracking-widest uppercase transition-colors">Solicitar Ascenso</button>
                  }
                </div>
              </div>

              <div>
                <label htmlFor="displayName" className="block text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">
                  Alias en el Panel (Ranking)
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Ej: Cadete Torres"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  maxLength={20}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="age" className="block text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">
                    Edad
                  </label>
                  <input
                    id="age"
                    type="number"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    disabled={!canEdit}
                    placeholder="20"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-xs uppercase tracking-widest font-bold text-slate-400 mb-2">
                    Ciudad / Sede
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Lima"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || !canEdit}
                  className={`w-full py-4 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 ${!canEdit ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Procesando
                    </>
                  ) : !canEdit ? (
                    <>
                      IDENTIDAD VERIFICADA
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" /> Confirmar Identidad
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
