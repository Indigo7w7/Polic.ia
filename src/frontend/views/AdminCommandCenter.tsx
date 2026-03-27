import React, { useState } from 'react';
import { trpc } from '../../shared/utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Terminal, 
  Users, 
  Settings, 
  ShieldAlert, 
  Activity, 
  RefreshCcw,
  Search,
  CheckCircle,
  XCircle,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

export const AdminCommandCenter: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const stats = trpc.admin.getAdminStats.useQuery();
  const toggleRole = trpc.admin.toggleAdminRole.useMutation();
  const activatePremium = trpc.admin.activarPremium.useMutation();
  const utils = trpc.useContext();

  const handleToggleRole = async (uid: string) => {
    try {
      await toggleRole.mutateAsync({ uid });
      toast.success('Rol de seguridad actualizado');
      utils.admin.getAdminStats.invalidate();
    } catch (e) {
      toast.error('Fallo en la actualización de privilegios');
    }
  };

  const handleManualPremium = async (uid: string) => {
    try {
      await activatePremium.mutateAsync({ uid, days: 30 });
      toast.success('Membresía PRO activada exitosamente');
      utils.admin.getAdminStats.invalidate();
    } catch (e) {
      toast.error('Error en la activación manual');
    }
  };

  const filteredUsers = (stats.data?.totalUsersList || []).filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020617] text-[#94a3b8] font-mono p-4 md:p-8 selection:bg-blue-500/30">
      {/* Tactical Header */}
      <header className="max-w-7xl mx-auto mb-8 border-b border-blue-900/40 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-blue-500 mb-2">
            <Terminal className="w-6 h-6 animate-pulse" />
            <span className="text-xs font-black tracking-[0.3em] uppercase">Comando Central de Operaciones</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">TERMINAL DE CONTROL POLIC.IA</h1>
        </div>
        
        <div className="flex gap-4">
          <Card className="bg-blue-950/20 border-blue-900/30 min-w-[140px]">
            <CardContent className="p-3 text-center">
              <div className="text-blue-400 text-[10px] font-black uppercase mb-1">Status Global</div>
              <div className="text-emerald-500 text-lg flex items-center justify-center gap-2">
                <Activity className="w-4 h-4" /> OPERATIVO
              </div>
            </CardContent>
          </Card>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Statistics Rail */}
        <section className="lg:col-span-3 space-y-6">
          <Card className="bg-slate-900/50 border-slate-800 shadow-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Database className="w-3 h-3" /> Métricas Base
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-slate-400">Total Candidatos</div>
                <div className="text-2xl font-black text-white">{stats.data?.totalUsers || 0}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400">Personal PRO</div>
                <div className="text-2xl font-black text-amber-500">{stats.data?.proUsers || 0}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400">Simulacros Ejecutados</div>
                <div className="text-2xl font-black text-blue-500">{stats.data?.totalExams || 0}</div>
              </div>
            </CardContent>
          </Card>

          <Button 
            className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-black gap-2"
            onClick={() => utils.admin.getAdminStats.invalidate()}
          >
            <RefreshCcw className="w-4 h-4" /> ACTUALIZAR DATOS
          </Button>
        </section>

        {/* User Management */}
        <section className="lg:col-span-9">
          <Card className="bg-slate-900/40 border-slate-800/60 overflow-hidden">
            <CardHeader className="border-b border-slate-800/80 bg-slate-900/20 p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" /> Gestión de Expedientes
                </CardTitle>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nombre/email..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 text-[10px] uppercase font-black tracking-widest text-slate-500 border-b border-slate-800">
                      <th className="px-6 py-4">Usuario</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4">Sede / Escuela</th>
                      <th className="px-6 py-4 text-right">Acciones Tácticas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredUsers.map((user) => (
                      <tr key={user.uid} className="hover:bg-blue-500/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400">
                              {user.name?.[0] || 'U'}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-200">{user.name || 'Sin Nombre'}</div>
                              <div className="text-[10px] text-slate-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {user.membership === 'PRO' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black border border-amber-500/20">
                              PRO ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-[10px] font-black border border-slate-700">
                              STANDARD
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold">
                          {user.school || 'PENDIENTE'} / {user.city || 'S/N'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className={`h-8 text-[10px] font-black px-3 ${user.membership === 'PRO' ? 'border-amber-500/30 text-amber-500' : 'border-slate-700'}`}
                              onClick={() => handleManualPremium(user.uid)}
                            >
                              +30 DÍAS
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className={`h-8 w-8 p-0 ${user.role === 'admin' ? 'text-red-500 bg-red-500/10' : 'text-slate-600'}`}
                              onClick={() => handleToggleRole(user.uid)}
                              title={user.role === 'admin' ? 'Revocar Admin' : 'Hacer Admin'}
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Terminal Overlay for Aesthetic */}
      <footer className="max-w-7xl mx-auto mt-12 p-6 rounded-xl bg-black border border-slate-800 font-mono text-[10px] text-emerald-500/50">
        <div className="flex items-center gap-4">
          <span className="animate-pulse">_</span>
          <span>SISTEMA DE GESTIÓN TÁCTICA V2.0 // DESPLIEGUE SEGURO // POLIC.IA PROYECTO NACIONAL</span>
        </div>
      </footer>
    </div>
  );
};
