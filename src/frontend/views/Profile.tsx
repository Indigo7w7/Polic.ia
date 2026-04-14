import React, { useState } from 'react';
import { trpc } from '../../shared/utils/trpc';
import { auth } from '@/src/firebase';
import { useUserStore } from '../store/useUserStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Sparkles, AlertCircle, Medal, Target, Shield, Trophy } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { usePlayerRank } from '../hooks/usePlayerRank';
import { RankShield } from '../components/RankShield';

const AVATAR_SEEDS = ['Alpha', 'Bravo', 'Delta', 'Echo', 'Falcon', 'Ghost', 'Hunter', 'Iron', 'Justice', 'Knight', 'Major', 'Nova', 'Oscar', 'Patriot', 'Ranger', 'Strike', 'Titan', 'Vanguard', 'Wolf', 'Xavier'];

export const Profile: React.FC = () => {
  const { uid, name, photoURL, age, city, profileEdited, setUserData, isPremiumActive, honorPoints, meritPoints } = useUserStore();
  const navigate = useNavigate();
  const isPremium = isPremiumActive();
  const { rankName, rankIcon, rankColor, totalPoints, nextRankPoints, progressToNext } = usePlayerRank();
  
  const [newName, setNewName] = useState(name === 'Invitado' ? '' : name);
  const [newAge, setNewAge] = useState(age ? String(age) : '');
  const [newCity, setNewCity] = useState(city || '');
  const [selectedAvatar, setSelectedAvatar] = useState(
    photoURL || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Postulante&backgroundColor=0f172a`
  );
  const [isSaving, setIsSaving] = useState(false);

  const updateProfileMutation = trpc.user.updateProfile.useMutation();
  const utils = trpc.useUtils();

  // Load fresh profile data from backend on mount to avoid stale Zustand state
  const profileQuery = trpc.user.getProfile.useQuery(
    { uid: uid || '' },
    { enabled: !!uid, refetchOnWindowFocus: false }
  );

  const achievementsQuery = trpc.gamification.getAchievements.useQuery(undefined, {
    enabled: !!uid,
  });

  // Hydrate form from backend data (source of truth)
  React.useEffect(() => {
    const data = profileQuery.data;
    if (!data) return;
    setNewName(data.name && data.name !== 'Invitado' ? data.name : '');
    setNewAge(data.age ? String(data.age) : '');
    setNewCity(data.city || '');
    if (data.photoURL) setSelectedAvatar(data.photoURL);
  }, [profileQuery.data]);

  // canEdit comes from backend — prevents localStorage manipulation
  const canEdit = profileQuery.data ? !profileQuery.data.profileEdited : !profileEdited;

  const generateRandomAvatar = () => {
    if (!canEdit) return;
    const seed = AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)] + Math.floor(Math.random() * 100);
    const colors = ['0f172a', '1e293b', '334155', '064e3b', '450a0a', '1e1b4b'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    setSelectedAvatar(`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&backgroundColor=${color}`);
  };

  const handleSave = async () => {
    if (!canEdit) return;
    if (!newName.trim()) { toast.error('El nombre no puede estar vacío.'); return; }
    setIsSaving(true);
    try {
      await updateProfileMutation.mutateAsync({
        uid: uid!,
        name: newName,
        photoURL: selectedAvatar,
        age: newAge ? parseInt(newAge) : undefined,
        city: newCity || undefined,
      });
      await utils.user.getProfile.invalidate();
      setUserData({ name: newName, photoURL: selectedAvatar, age: newAge ? parseInt(newAge) : null, city: newCity || null, profileEdited: true });
      toast.success('Perfil actualizado correctamente.');
      navigate('/');
    } catch {
      toast.error('Error al guardar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header compacto */}
      <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-black text-white">Mi Perfil</h1>
          <p className="text-xs text-slate-500">Información de tu cuenta</p>
        </div>
        {isPremium && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-black text-amber-400 uppercase">PRO</span>
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4 pb-28">

        {!canEdit && (
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex items-center gap-3 text-amber-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-xs font-semibold leading-relaxed">
              El perfil solo puede editarse una vez para garantizar la integridad de los datos académicos.
            </p>
          </div>
        )}

        {/* Avatar + Rango */}
        <Card className="bg-slate-900/50 border-slate-800 overflow-hidden">
          <div className="h-14 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/80" />
          </div>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="flex items-end gap-4 -mt-8 mb-4">
              <div className="relative">
                <div className={`w-16 h-16 rounded-2xl border-4 border-slate-900 shadow-xl overflow-hidden bg-slate-800 ${!canEdit ? 'grayscale' : ''}`}>
                  <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                {canEdit && (
                  <button
                    onClick={generateRandomAvatar}
                    className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg transition-all active:scale-95 border-2 border-slate-900"
                  >
                    <Sparkles className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex-1 pb-1">
                <p className="font-black text-white text-base truncate">{name || 'Postulante'}</p>
                <p className="text-xs text-slate-500">{city || 'Sin ciudad registrada'}</p>
              </div>
            </div>

            {/* Rango */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <RankShield rankName={rankName} rankIcon={rankIcon} rankColor={rankColor} size={28} />
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>{totalPoints} puntos</span>
                    {nextRankPoints && <span>Siguiente: {nextRankPoints}</span>}
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${rankColor.replace('text', 'bg')}`}
                      style={{ width: `${progressToNext}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Medal className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold text-slate-400">Honor</span>
                  </div>
                  <span className="text-xs font-black text-emerald-400">{honorPoints || 0}</span>
                </div>
                <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-bold text-slate-400">Mérito</span>
                  </div>
                  <span className="text-xs font-black text-blue-400">{meritPoints || 0}</span>
                </div>
              </div>
              {!isPremium && (
                <Button onClick={() => navigate('/yape-checkout')} className="w-full py-2 bg-blue-900/40 hover:bg-blue-800/60 text-blue-400 border border-blue-800/50 text-[10px] font-black tracking-wider uppercase rounded-xl">
                  Obtener membresía PRO
                </Button>
              )}
            </div>

            {/* Achievements Section */}
            <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Trophy className="w-3 h-3 text-amber-500" /> Medallas y Logros
                </h3>
                <button 
                  onClick={() => navigate('/medallas')}
                  className="text-[9px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors"
                >
                  Ver Todo
                </button>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar min-h-[48px]">
                {achievementsQuery.isLoading ? (
                   [1, 2, 3].map(i => <div key={i} className="w-10 h-10 rounded-lg bg-slate-800 animate-pulse shrink-0" />)
                ) : achievementsQuery.data?.filter(a => !!a.isUnlocked).length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic py-2">Ningún logro desbloqueado aún.</p>
                ) : (
                  achievementsQuery.data?.filter(a => !!a.isUnlocked).map((ach) => (
                    <div key={ach.id} className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 group relative">
                       <Medal className="w-5 h-5 text-amber-500" />
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 text-[8px] px-2 py-1 rounded border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                          {ach.title}
                       </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datos personales */}
        <Card className={`bg-slate-900/50 border-slate-800 ${!canEdit ? 'opacity-75' : ''}`}>
          <CardContent className="p-4 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Datos personales</h3>

            <div>
              <label htmlFor="displayName" className="block text-xs font-bold text-slate-400 mb-1.5">
                Nombre para el ranking
              </label>
              <input
                id="displayName"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={!canEdit}
                placeholder="Ej: Torres Mendez"
                maxLength={20}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="age" className="block text-xs font-bold text-slate-400 mb-1.5">Edad</label>
                <input
                  id="age"
                  type="number"
                  value={newAge}
                  onChange={(e) => setNewAge(e.target.value)}
                  disabled={!canEdit}
                  placeholder="20"
                  min="15" max="40"
                  className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-xs font-bold text-slate-400 mb-1.5">Ciudad</label>
                <input
                  id="city"
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Lima"
                  className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botón guardar — sticky para no quedar detrás del teclado virtual en Android */}
        <div className="sticky bottom-4 left-0 right-0 z-40 pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving || !canEdit}
            className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-2xl ${
              !canEdit
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white shadow-blue-500/20'
            }`}
          >
            {isSaving ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
            ) : !canEdit ? (
              'Perfil verificado — edición no disponible'
            ) : (
              <><Save className="w-5 h-5" /> Guardar cambios</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
