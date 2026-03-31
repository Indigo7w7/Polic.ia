import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { QrCode, CheckCircle2, ArrowLeft } from 'lucide-react';

export const YapeCheckout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] p-4 md:p-8 font-sans flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Inicio
        </button>

        <Card className="bg-slate-900 border-slate-700 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30">
              <QrCode className="w-8 h-8 text-blue-400" />
            </div>
            <CardTitle className="text-2xl">Premium POLIC.ia</CardTitle>
            <p className="text-slate-400 mt-2 text-sm italic">
              "La diferencia entre un civil y un Oficial no es la suerte, es la doctrina."
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-xl text-center">
              <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-2">Propuesta de Valor</p>
              <p className="text-sm text-slate-300 leading-relaxed">
                Desbloquea el <span className="text-white font-bold">Polígono de Tiro Cognitivo</span> y asegura que tu nombre aparezca en el diario El Peruano. S/ 15.00 para asegurar tu carrera de por vida.
              </p>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
              <p className="text-sm text-slate-400 mb-1">Yapea al número:</p>
              <p className="text-2xl font-mono font-bold text-white tracking-wider">933 299 043</p>
              <p className="text-sm text-slate-400 mt-1">A nombre de: POLIC.IA SAC</p>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-slate-200">Pasos para activar:</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /> Realiza el pago de S/ 15.00 vía Yape.</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /> Toma captura de pantalla del voucher.</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /> Envía la captura por WhatsApp para activación inmediata.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <Button 
                fullWidth 
                className="bg-green-600 hover:bg-green-700 text-white gap-2 py-6 text-lg"
                onClick={() => window.open('https://wa.me/51933299043?text=Hola,%20adjunto%20mi%20voucher%20para%20activar%20POLIC.ia%20Premium', '_blank')}
              >
                Enviar Voucher por WhatsApp
              </Button>
              <p className="text-[10px] text-center text-slate-500">
                Atención inmediata: Lu-Do 8am a 11pm
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
