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
  Database,
  LogOut,
  UserX,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '../../firebase';

export const AdminCommandCenter = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'content'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const stats = trpc.admin.getAdminStats.useQuery();
  const usersList = trpc.admin.getUsers.useQuery({ search: searchTerm });
  
  const toggleRole = trpc.admin.toggleAdminRole.useMutation();
  const updateMembership = trpc.admin.updateUserMembership.useMutation();
  const deleteUser = trpc.admin.deleteUser.useMutation();
  const utils = trpc.useUtils();

  const handleLogout = () => {
    auth.signOut();
    window.location.href = '/login';
  };

  const handleToggleRole = async (uid: string, isAdmin: boolean) => {
    try {
      await toggleRole.mutateAsync({ uid, isAdmin: !isAdmin });
      toast.success('Rol de seguridad actualizado');
      utils.admin.getUsers.invalidate();
    } catch (e) {
      toast.error('Fallo en la actualización de privilegios');
    }
  };

  const handleManualPremium = async (uid: string, target: 'PRO' | 'FREE') => {
    try {
      await updateMembership.mutateAsync({ uid, membership: target });
      toast.success(target === 'FREE' ? 'Membresía FREE' : 'Membresía PRO activada');
      utils.admin.getUsers.invalidate();
      utils.admin.getAdminStats.invalidate();
    } catch (e) {
      toast.error('Error en la gestión de membresía');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm('¿ESTÁ SEGURO DE ELIMINAR ESTE USUARIO? ESTA ACCIÓN ES IRREVERSIBLE.')) return;
    try {
      await deleteUser.mutateAsync({ uid });
      toast.success('Usuario eliminado del sistema');
      utils.admin.getUsers.invalidate();
      utils.admin.getAdminStats.invalidate();
    } catch (e) {
      toast.error('Error al eliminar usuario');
    }
  };

  const filteredUsers = usersList.data || [];

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
          <Button 
            variant="outline" 
            className="border-red-900/40 bg-red-950/10 text-red-500 hover:bg-red-500 hover:text-white font-black px-6 gap-2 h-auto"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" /> SALIR
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Tabs */}
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Gestión de Usuarios
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Statistics Rail */}
          <section className="lg:col-span-3 space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 shadow-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Database className="w-3 h-3" /> Métricas Base
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Total</div>
                  <div className="text-2xl font-black text-white">{stats.data?.totalUsers || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-amber-500 uppercase">Elite PRO</div>
                  <div className="text-2xl font-black text-amber-500">{stats.data?.premiumUsers || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Free</div>
                  <div className="text-2xl font-black text-slate-300">{stats.data?.freeUsers || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-500 uppercase">Activos (5m)</div>
                  <div className="text-2xl font-black text-emerald-500">{stats.data?.activeUsers || 0}</div>
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

          {/* Dynamic Content Area */}
          <section className="lg:col-span-9">
            {activeTab === 'users' && (
              <Card className="bg-slate-900/40 border-slate-800/60 overflow-hidden">
                <CardHeader className="border-b border-slate-800/80 bg-slate-900/20 p-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-500" /> Expedientes de Postulantes
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
                          <th className="px-6 py-4">Membresía</th>
                          <th className="px-6 py-4">Sede / Escuela</th>
                          <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {filteredUsers.map((user) => (
                          <tr key={user.uid} className="hover:bg-blue-500/5 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400 overflow-hidden">
                                  {user.photoURL ? (
                                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    user.name?.[0] || 'U'
                                  )}
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
                                {user.membership === 'FREE' ? (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 text-[10px] font-black px-3 border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-black"
                                    onClick={() => handleManualPremium(user.uid, 'PRO')}
                                  >
                                    <TrendingUp className="w-3 h-3 mr-1" /> HACER PRO
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 text-[10px] font-black px-3 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white"
                                    onClick={() => handleManualPremium(user.uid, 'FREE')}
                                  >
                                    <TrendingDown className="w-3 h-3 mr-1" /> QUITAR PRO
                                  </Button>
                                )}
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className={`h-8 w-8 p-0 ${user.role === 'admin' ? 'text-blue-500 bg-blue-500/10' : 'text-slate-600 hover:text-blue-400'}`}
                                  title="Alternar Admin"
                                  onClick={() => handleToggleRole(user.uid, user.role === 'admin')}
                                >
                                  <ShieldAlert className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0 text-red-900/40 hover:text-red-500 hover:bg-red-500/10"
                                  title="Eliminar Usuario"
                                  onClick={() => handleDeleteUser(user.uid)}
                                >
                                  <UserX className="w-4 h-4" />
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
            )}
          </section>
        </div>
      </main>

      {/* Terminal Overlay for Aesthetic */}
      <footer className="max-w-7xl mx-auto mt-12 p-6 rounded-xl bg-black border border-slate-800 font-mono text-[10px] text-emerald-500/50">
        <div className="flex items-center gap-4">
          <span className="animate-pulse">_</span>
          <span>SISTEMA DE GESTIÓN TÁCTICA V2.5 // DESPLIEGUE SEGURO // POLIC.IA PROYECTO NACIONAL</span>
        </div>
      </footer>
    </div>
  );
};
