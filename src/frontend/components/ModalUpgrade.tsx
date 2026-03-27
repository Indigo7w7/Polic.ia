import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { X, QrCode, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ModalUpgradeProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalUpgrade: React.FC<ModalUpgradeProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
        <Card className="bg-slate-900 border-slate-700 shadow-2xl relative overflow-hidden">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mb-4 border border-blue-500/30">
              <QrCode className="w-8 h-8 text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">¡Pásate a Premium!</CardTitle>
            <p className="text-slate-400 mt-2 text-sm">
              Acceso ilimitado a simulacros predictivos y el Polígono Cognitivo.
            </p>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Monto de Suscripción</p>
              <p className="text-4xl font-bold text-white mb-4">S/ 15.00</p>
              
              <div className="bg-white p-3 rounded-lg inline-block mb-4">
                {/* Placeholder for real QR */}
                <div className="w-32 h-32 bg-slate-200 flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-slate-800" />
                </div>
              </div>
              
              <p className="text-sm text-slate-300 font-medium">Yapea al: 999 999 999</p>
              <p className="text-xs text-slate-500 mt-1">A nombre de: POLIC.IA SAC</p>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Beneficios:</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-3 text-sm text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Simulacros ilimitados (EO/EESTP)
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Algoritmo Leitner de repetición espaciada
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  Cuadro de mérito en tiempo real
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                fullWidth 
                variant="primary"
                onClick={() => navigate('/yape-checkout')}
              >
                Ya realicé el pago
              </Button>
              <p className="text-[10px] text-center text-slate-500">
                La activación es manual y puede tardar hasta 12 horas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
