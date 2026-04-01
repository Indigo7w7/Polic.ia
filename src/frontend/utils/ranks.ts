export const getMilitaryRank = (points: number, school: 'EO' | 'EESTP' | null) => {
  if (points >= 1000) return school === 'EO' ? 'General de División' : 'Suboficial Superior';
  if (points >= 500) return school === 'EO' ? 'Coronel' : 'Suboficial Brigadier';
  if (points >= 250) return school === 'EO' ? 'Mayor' : 'Suboficial de 1ra';
  if (points >= 100) return school === 'EO' ? 'Teniente' : 'Suboficial de 2da';
  if (points >= 50) return school === 'EO' ? 'Alférez' : 'Suboficial de 3ra';
  if (points >= 10) return school === 'EO' ? 'Cadete' : 'Alumno';
  return 'Postulante';
};

export const getRankColor = (points: number) => {
  if (points >= 500) return 'text-amber-400 border-amber-500/30 bg-amber-500/5';
  if (points >= 100) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5';
  if (points >= 50) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5';
  return 'text-slate-400 border-slate-700 bg-slate-800/50';
};
