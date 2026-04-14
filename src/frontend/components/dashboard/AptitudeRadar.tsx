import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Target, Brain, CheckCircle2 } from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer 
} from 'recharts';

interface AptitudeRadarProps {
  categoryStats: any[];
  weakestArea: string | null;
}

export const AptitudeRadar: React.FC<AptitudeRadarProps> = ({ categoryStats, weakestArea }) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-slate-900/40 border-slate-800">
        <CardHeader className="py-3 px-4 border-b border-slate-800/50">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-blue-400" /> Radar de Aptitud
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 h-[220px]">
          {categoryStats.length >= 3 ? (
            <ResponsiveContainer width="100%" height={220} minHeight={220}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={categoryStats}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="area" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <Radar name="Aciertos" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-[10px] text-slate-500 italic px-4 text-center">Datos Insuficientes</div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/40 border-slate-800 p-5 flex flex-col justify-center">
        {weakestArea ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400"><Brain className="w-5 h-5" /></div>
              <div>
                <p className="text-[9px] font-black uppercase text-red-400">Brecha Táctica</p>
                <h3 className="text-sm font-bold text-slate-200">Reforzar {weakestArea}</h3>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">Índice de eficacia inferior al 50%. Inicie entrenamiento correctivo.</p>
            <Button 
              variant="primary" 
              className="w-full bg-red-600 hover:bg-red-500 text-xs py-2" 
              onClick={() => navigate('/poligono')}
            >
              Iniciar Correctivo
            </Button>
          </>
        ) : (
          <div className="text-center flex flex-col items-center">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 mb-3"><CheckCircle2 className="w-6 h-6" /></div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">Sin Brechas Críticas</h3>
            <p className="text-xs text-slate-400">Eficacia superior al 50% en todas las áreas.</p>
          </div>
        )}
      </Card>
    </div>
  );
};
