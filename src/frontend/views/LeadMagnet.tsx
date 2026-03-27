import React from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { FileText, Download, Shield, ChevronRight, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { toast } from 'sonner';

export const LeadMagnet: React.FC = () => {
  const navigate = useNavigate();

  const handleDownload = () => {
    toast.success('Descargando Guía Exclusiva...', {
      description: 'El PDF se guardará en tu dispositivo en breve.'
    });
    // In a real app, this would trigger a real PDF download
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] p-4 md:p-8 font-sans flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full space-y-8">
        {/* Branding */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">POLIC.ia</h1>
        </div>

        <Card className="bg-slate-900 border-slate-800 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-emerald-500" />
          
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-48 h-64 bg-slate-800 rounded-lg border-2 border-slate-700 shadow-2xl flex flex-col items-center justify-center p-4 text-center relative group">
                <FileText className="w-16 h-16 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Guía Exclusiva</div>
                <div className="text-sm font-bold text-white mt-1">50 PREGUNTAS TRAMPA</div>
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">GRATIS</div>
              </div>

              <div className="flex-1 space-y-6 text-center md:text-left">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    Domina el Examen de Conocimientos
                  </h2>
                  <p className="text-slate-400 leading-relaxed">
                    Hemos analizado los últimos 5 años de exámenes EO y EESTP para identificar los patrones que causan el 70% de los errores. Descarga esta guía y no caigas en las trampas doctrinales.
                  </p>
                </div>

                <div className="space-y-4">
                  <Button 
                    variant="primary" 
                    className="w-full h-14 text-lg gap-2 shadow-xl shadow-blue-900/20"
                    onClick={handleDownload}
                  >
                    <Download className="w-5 h-5" />
                    Descargar Guía PDF
                  </Button>
                  
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-12 gap-2 border-slate-700 text-slate-300"
                      onClick={() => navigate('/')}
                    >
                      Ir al Simulador
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-12 h-12 p-0 border-slate-700 text-slate-300"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: 'POLIC.ia - Guía de Preguntas Trampa',
                            text: 'Descarga gratis la guía de las 50 preguntas trampa para el examen PNP.',
                            url: window.location.href
                          });
                        }
                      }}
                    >
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Proof / Trust */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4">
            <div className="text-2xl font-bold text-white mb-1">+5,000</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Descargas</div>
          </div>
          <div className="text-center p-4 border-x border-slate-800">
            <div className="text-2xl font-bold text-white mb-1">98%</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Efectividad</div>
          </div>
          <div className="text-center p-4">
            <div className="text-2xl font-bold text-white mb-1">Actualizado</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Proceso 2026</div>
          </div>
        </div>

        <footer className="text-center text-slate-600 text-xs">
          <p>Únete a nuestra comunidad de preparación táctica.</p>
          <div className="flex justify-center gap-4 mt-4">
            <span className="hover:text-blue-400 cursor-pointer transition-colors">WhatsApp</span>
            <span className="hover:text-blue-400 cursor-pointer transition-colors">Telegram</span>
            <span className="hover:text-blue-400 cursor-pointer transition-colors">TikTok</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
