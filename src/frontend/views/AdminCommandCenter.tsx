import React, { useState } from 'react';
import { trpc } from '../../shared/utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Header } from '../components/common/Header';
import { Button } from '../components/ui/Button';
import { 
  Terminal, 
  Users, 
  ShieldAlert, 
  Activity, 
  RefreshCcw,
  Search,
  LogOut,
  UserX,
  TrendingDown,
  TrendingUp,
  Upload,
  Book,
  Trash2,
  Database,
  Lock,
  Unlock,
  Megaphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '@/src/firebase';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export const AdminCommandCenter = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'exams'>('users');
  const [activeExamSchool, setActiveExamSchool] = useState<'EO' | 'EESTP'>('EO');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);

  // Stats & Users with "Real-time" polling (10s)
  const stats = trpc.admin.getAdminStats.useQuery(undefined, { refetchInterval: 10000 });
  const usersList = trpc.admin.getUsers.useQuery({ search: searchTerm }, { refetchInterval: 10000 });
  
  // Exam Management
  const examsQuery = trpc.adminExams.getExams.useQuery();
  const uploadExam = trpc.adminExams.uploadExam.useMutation();
  const deleteExam = trpc.adminExams.deleteExam.useMutation();

  const toggleRole = trpc.admin.toggleAdminRole.useMutation();
  const updateMembership = trpc.admin.updateUserStatus.useMutation();
  const deleteUser = trpc.admin.deleteUser.useMutation();
  const sendBroadcast = trpc.admin.sendBroadcast.useMutation();
  const utils = trpc.useUtils();

  const handleBroadcast = async () => {
    const title = window.prompt('Título de la Alerta (ej. MANTENIMIENTO):');
    if (!title) return;
    const message = window.prompt('Mensaje:');
    if (!message) return;
    const typeStr = window.prompt('Tipo (INFO, WARNING, EVENT):', 'WARNING');
    const type = (['INFO', 'WARNING', 'EVENT'].includes(typeStr?.toUpperCase() || '') ? typeStr?.toUpperCase() : 'WARNING') as any;

    try {
      await sendBroadcast.mutateAsync({ title, message, type });
      toast.success('¡Alerta enviada a todas las unidades!');
    } catch (e) {
      toast.error('Error al emitir alerta roja');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        if (!Array.isArray(content)) throw new Error('El JSON debe ser un array de preguntas');
        
        await uploadExam.mutateAsync({
          school: activeExamSchool,
          questions: content
        });
        
        toast.success(`Examen subido correctamente para ${activeExamSchool}`);
        examsQuery.refetch();
      } catch (err: any) {
        toast.error(`Error al procesar JSON: ${err.message}`);
      } finally {
        setUploading(false);
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteExam = async (id: number) => {
    if (!window.confirm('¿Eliminar este nivel y todas sus preguntas?')) return;
    try {
      await deleteExam.mutateAsync({ examId: id });
      toast.success('Examen eliminado');
      examsQuery.refetch();
    } catch (e) {
      toast.error('Error al eliminar examen');
    }
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

  const handleManualPremium = async (targetUid: string, membership: 'FREE' | 'PRO') => {
    try {
      await updateMembership.mutateAsync({ targetUid, membership });
      toast.success(`Rango actualizado a ${membership}`);
      utils.admin.getUsers.invalidate();
      utils.admin.getAdminStats.invalidate();
    } catch (e) {
      toast.error('Error en la gestión de membresía');
    }
  };

  const handleToggleBlock = async (targetUid: string, currentStatus: 'ACTIVE' | 'BLOCKED') => {
    const newStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      await updateMembership.mutateAsync({ targetUid, status: newStatus });
      toast.success(`Usuario marcado como ${newStatus}`);
      utils.admin.getUsers.invalidate();
    } catch (e) {
      toast.error('Error al cambiar el estado del usuario');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm('¿ESTÁ SEGURO DE ELIMINAR ESTE USUARIO?')) return;
    try {
      await deleteUser.mutateAsync({ uid });
      toast.success('Usuario eliminado');
      utils.admin.getUsers.invalidate();
    } catch (e) {
      toast.error('Error al eliminar usuario');
    }
  };

  const filteredUsers = usersList.data || [];
  const schoolExams = examsQuery.data?.filter(e => e.school === activeExamSchool) || [];

  return (
    <div className="min-h-screen bg-[#020617] text-[#94a3b8] font-mono p-4 md:p-8">
      <Header showSchoolSelector={false} />
      
      <main className="max-w-7xl mx-auto space-y-6">
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
          >
            Usuarios
          </button>
          <button 
            onClick={() => setActiveTab('exams')}
            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'exams' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
          >
            Exámenes
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Stats Bar */}
          <section className="lg:col-span-3 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6 space-y-4">
                {['totalUsers', 'proUsers', 'freeUsers', 'onlineCount'].map((key) => (
                  <div key={key}>
                    <div className="text-[10px] text-slate-500 uppercase tracking-tighter">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </div>
                    <div className={`text-2xl font-black ${key === 'proUsers' ? 'text-amber-500' : 'text-white'}`}>
                      {(stats.data as any)?.[key] || 0}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4">
                <div className="text-[10px] text-slate-500 uppercase tracking-tighter mb-2">Distribución</div>
                <div style={{height:'300px',width:'100%',minHeight:'300px'}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'FREE', value: (stats.data as any)?.freeUsers || 0 },
                      { name: 'PRO', value: (stats.data as any)?.proUsers || 0 }
                    ]}>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                      <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', border: 'none'}} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full bg-red-600/90 hover:bg-red-600 gap-2 h-12 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] border border-red-500/50" onClick={handleBroadcast}>
              <Megaphone className="w-5 h-5 animate-pulse" /> ALERTA ROJA (GLOBAL)
            </Button>

            <Button className="w-full bg-blue-600 gap-2 h-12" onClick={() => stats.refetch()}>
              <RefreshCcw className="w-4 h-4" /> REFRESCAR MANDO
            </Button>
          </section>

          {/* Main Area */}
          <section className="lg:col-span-9">
            {activeTab === 'users' ? (
              <Card className="bg-slate-900/40 border-slate-800 overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-800 flex flex-row items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2 uppercase text-sm font-black">
                    <Users className="w-4 h-4 text-blue-500" /> Base de Datos de Usuarios
                  </CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Buscar..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 py-2 text-xs text-white"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900/60 text-[10px] uppercase font-black text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Usuario</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Rango</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4">Última Conexión</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredUsers.map((user) => {
                        const isOnline = user.lastActive ? (Date.now() - new Date(user.lastActive).getTime() < 5 * 60 * 1000) : false;
                        return (
                        <tr key={user.uid} className="hover:bg-blue-500/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-slate-200">{user.name || 'Sin Nombre'}</div>
                          </td>
                          <td className="px-6 py-4 text-[10px] text-slate-500">{user.email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${user.membership === 'PRO' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                              {user.membership}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`px-2 py-0.5 rounded-full text-[9px] w-fit font-black uppercase tracking-widest border flex items-center gap-1 ${user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                {user.status}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 text-[10px]">
                              <div className={`flex items-center gap-1 ${isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                                {isOnline ? 'Online' : 'Offline'}
                              </div>
                              <div className="opacity-50 italic">
                                {user.lastActive ? new Date(user.lastActive).toLocaleString() : 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" className="h-7 text-[9px] border-amber-500/30 text-amber-500 hover:bg-amber-500/10" onClick={() => handleManualPremium(user.uid, 'PRO')}>
                                ASCENDER PRO
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-[9px] border-slate-500/30 text-slate-500" onClick={() => handleManualPremium(user.uid, 'FREE')}>
                                BAJAR FREE
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 text-[9px] border-red-500/30" onClick={() => handleToggleBlock(user.uid, user.status as any)}>
                                {user.status === 'ACTIVE' ? 'BLOQUEAR' : 'DESBLOQUEAR'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="flex gap-4">
                  {['EO', 'EESTP'].map(school => (
                    <button 
                      key={school}
                      onClick={() => setActiveExamSchool(school as any)}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all font-black text-xs uppercase tracking-widest ${activeExamSchool === school ? 'border-blue-600 bg-blue-600/10 text-white' : 'border-slate-800 bg-slate-900/40 text-slate-500'}`}
                    >
                      {school === 'EO' ? 'Oficiales (EO PNP)' : 'Técnica (EESTP PNP)'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Uploader */}
                  <Card className="bg-slate-900/40 border-slate-800 border-dashed border-2">
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mb-4">
                        <Upload className={`w-6 h-6 text-blue-500 ${uploading ? 'animate-bounce' : ''}`} />
                      </div>
                      <h3 className="text-white font-black uppercase text-sm mb-2">Subir Nuevo Nivel</h3>
                      <p className="text-xs text-slate-500 mb-6">Sube un archivo JSON con las preguntas para generar el siguiente nivel lineal automáticamente.</p>
                      
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleFileUpload}
                        className="hidden" 
                        id="json-upload"
                        disabled={uploading}
                      />
                      <label htmlFor="json-upload">
                        <Button asChild className="bg-blue-600 hover:bg-blue-500 font-extrabold px-8">
                          <span>{uploading ? 'PROCESANDO...' : 'SELECCIONAR JSON'}</span>
                        </Button>
                      </label>
                    </CardContent>
                  </Card>

                  {/* Level List */}
                  <Card className="bg-slate-900/40 border-slate-800 overflow-hidden">
                    <CardHeader className="p-4 border-b border-slate-800 bg-slate-900/20">
                      <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <Book className="w-4 h-4 text-blue-500" /> Niveles Configurados ({schoolExams.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                      {schoolExams.length === 0 ? (
                        <div className="p-8 text-center text-slate-600 text-[10px] uppercase font-bold">
                          No hay exámenes configurados
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-800/50">
                          {schoolExams.sort((a, b) => a.level - b.level).map(exam => (
                            <div key={exam.id} className="p-4 flex items-center justify-between group hover:bg-white/5">
                              <div className="flex items-center gap-3">
                                <div className="text-blue-500 font-black text-sm">#{exam.level.toString().padStart(2, '0')}</div>
                                <div>
                                  <div className="text-xs font-bold text-slate-200">{exam.title}</div>
                                  <div className="text-[9px] text-slate-500 uppercase">{new Date(exam.createdAt).toLocaleDateString()}</div>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-red-500/50 hover:text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteExam(exam.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto mt-12 p-6 rounded-xl bg-black border border-slate-800 font-mono text-[10px] text-emerald-500/50 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="animate-pulse">_</span>
          <span>OPERATIVE SYNC V2.6 // LINEAR EXAM ENGINE // POLIC.IA TERMINAL</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>CONNECTED</span>
        </div>
      </footer>
    </div>
  );
};
