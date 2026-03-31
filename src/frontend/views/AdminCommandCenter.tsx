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
  UserX,
  TrendingUp,
  Upload,
  Book,
  Trash2,
  Database,
  Lock,
  Unlock,
  Megaphone,
  AlertTriangle,
  X,
  CheckCircle,
  Zap,
  FileText,
  Plus,
  ExternalLink,
  GraduationCap,
  BookOpen,
  HelpCircle,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { auth, storage } from '@/src/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

// ─── ALERTA ROJA MODAL ────────────────────────────────────────
const BroadcastModal = ({ broadcast, onClose }: { broadcast: any; onClose: () => void }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div className="relative w-full max-w-lg bg-black border-2 border-red-500 rounded-xl shadow-[0_0_60px_rgba(239,68,68,0.5)] overflow-hidden">
      <div className="absolute inset-0 bg-red-950/20 animate-pulse pointer-events-none" />
      <div className="relative p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-[9px] text-red-400 font-black tracking-[0.5em] uppercase">ALERTA GLOBAL ACTIVA</div>
            <div className="text-lg font-black text-red-400 tracking-wider font-mono">{broadcast.title}</div>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-red-950/40 border border-red-900 rounded-lg p-4 mb-4">
          <p className="text-red-200 text-sm font-mono leading-relaxed">{broadcast.message}</p>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-red-500 uppercase tracking-wider">
            TIPO: <span className="text-red-300 font-black">{broadcast.type}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] tracking-widest uppercase rounded transition-colors"
          >
            ACUSADO RECIBO
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─── MATERIAL MANAGER ─────────────────────────────────────────
const MaterialManager = ({ examId, onClose }: { examId: number; onClose: () => void }) => {
  const [uploading, setUploading] = useState(false);
  const materials = trpc.adminExams.getMaterials.useQuery({ examId });
  const addMaterial = trpc.adminExams.addMaterial.useMutation();
  const deleteMaterial = trpc.adminExams.deleteMaterial.useMutation();
  const utils = trpc.useUtils();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `exams_materials/${examId}/${fileName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addMaterial.mutateAsync({
        examId,
        title: file.name,
        url,
      });

      toast.success('Material cargado correctamente');
      utils.adminExams.getMaterials.invalidate({ examId });
    } catch (error) {
      console.error(error);
      toast.error('Error al subir material');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿ELIMINAR ESTE MATERIAL?')) return;
    try {
      await deleteMaterial.mutateAsync({ id });
      toast.success('Material eliminado');
      utils.adminExams.getMaterials.invalidate({ examId });
    } catch {
      toast.error('Error al eliminar material');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-black border border-cyan-900 rounded-xl shadow-[0_0_40px_rgba(34,211,238,0.1)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-900/40">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-500" />
            <span className="text-[11px] font-black uppercase tracking-widest text-cyan-500 font-mono">GESTIÓN DE MATERIALES [NIVEL_ID: {examId}]</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Upload Section */}
          <div className="flex items-center justify-between gap-4 p-4 border border-cyan-900/30 bg-cyan-950/10 rounded-lg">
            <div className="text-[10px] text-cyan-700 font-mono italic">
              {uploading ? '> SUBIENDO_ARCHIVO...' : '> SELECCIONE PDF/DOCX PARA ESTE NIVEL'}
            </div>
            <input
              type="file"
              id="material-upload"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <label
              htmlFor="material-upload"
              className="px-4 py-1.5 bg-cyan-900/40 border border-cyan-700 text-cyan-300 font-black text-[9px] uppercase tracking-widest rounded hover:bg-cyan-800 transition-colors cursor-pointer"
            >
              {uploading ? 'PROCESANDO' : 'SUBIR_NUEVO'}
            </label>
          </div>

          {/* List Section */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {materials.data?.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 border border-cyan-900/20 bg-black/50 rounded-lg group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-950/30 rounded border border-cyan-900/40">
                    <FileText className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-cyan-400 font-mono truncate max-w-[250px]">{m.title}</div>
                    <div className="text-[9px] text-cyan-900 font-mono">{new Date(m.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-cyan-700 hover:text-cyan-400 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 text-red-900 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {materials.data?.length === 0 && !uploading && (
              <div className="text-center py-12 text-cyan-900 text-[10px] font-mono italic uppercase tracking-widest">
                {'> SIN_MATERIALES_ADJUNTOS'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────
const StatItem = ({ label, value, accent }: { label: string; value: number; accent?: string }) => (
  <div className="border border-cyan-900/40 rounded p-3 space-y-1 bg-black/50">
    <div className="text-[9px] text-cyan-700 uppercase tracking-[0.3em] font-mono">{label}</div>
    <div className={`text-2xl font-black font-mono ${accent || 'text-cyan-400'}`}>{value}</div>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────
export const AdminCommandCenter = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'exams' | 'vouchers' | 'courses' | 'content'>('users');
  const [activeExamSchool, setActiveExamSchool] = useState<'EO' | 'EESTP'>('EO');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissedBroadcast, setDismissedBroadcast] = useState<number | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Vouchers state
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Queries
  const stats = trpc.admin.getAdminStats.useQuery(undefined, { refetchInterval: 10000 });
  const dashStats = trpc.admin.getDashboardStats.useQuery(undefined, { refetchInterval: 10000 });
  const usersList = trpc.admin.getUsers.useQuery({ search: searchTerm }, { refetchInterval: 10000 });
  const broadcastQuery = trpc.admin.getActiveBroadcast.useQuery(undefined, { refetchInterval: 10000 });
  const examsQuery = trpc.adminExams.getExams.useQuery();
  const vouchersQuery = trpc.admin.getVouchers.useQuery();
  const coursesQuery = trpc.adminCourses.getCourses.useQuery();
  const areasQuery = trpc.admin.getAreas.useQuery();
  const contentQuery = trpc.admin.getContent.useQuery();

  const updateVoucherStatus = trpc.admin.updateVoucherStatus.useMutation();
  const uploadExam = trpc.adminExams.uploadExam.useMutation();
  const deleteExam = trpc.adminExams.deleteExam.useMutation();
  const toggleRole = trpc.admin.toggleAdminRole.useMutation();
  const updateMembership = trpc.admin.updateUserStatus.useMutation();
  const deleteUser = trpc.admin.deleteUser.useMutation();
  const sendBroadcast = trpc.admin.sendBroadcast.useMutation();
  const utils = trpc.useUtils();

  // Active broadcast (not yet dismissed)
  const activeBroadcast = broadcastQuery.data && broadcastQuery.data.id !== dismissedBroadcast
    ? broadcastQuery.data
    : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    await utils.admin.invalidate();
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handleBroadcast = async () => {
    const title = window.prompt('TÍTULO DE ALERTA (ej. MANTENIMIENTO CRÍTICO):');
    if (!title) return;
    const message = window.prompt('MENSAJE COMPLETO:');
    if (!message) return;
    const typeStr = window.prompt('TIPO (INFO / WARNING / EVENT):', 'WARNING');
    const type = (['INFO', 'WARNING', 'EVENT'].includes(typeStr?.toUpperCase() || '')
      ? typeStr?.toUpperCase()
      : 'WARNING') as any;
    const hours = parseInt(window.prompt('DURACIÓN EN HORAS:', '2') || '2', 10);

    try {
      await sendBroadcast.mutateAsync({ title, message, type, durationHours: hours });
      toast.success('¡Alerta emitida a todas las unidades!');
      utils.admin.getActiveBroadcast.invalidate();
    } catch {
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
        await uploadExam.mutateAsync({ school: activeExamSchool, questions: content });
        toast.success(`Nivel subido para ${activeExamSchool}`);
        examsQuery.refetch();
      } catch (err: any) {
        toast.error(`Error: ${err.message}`);
      } finally {
        setUploading(false);
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteExam = async (id: number) => {
    if (!window.confirm('¿ELIMINAR ESTE NIVEL Y TODAS SUS PREGUNTAS?')) return;
    try {
      await deleteExam.mutateAsync({ examId: id });
      toast.success('Nivel eliminado');
      examsQuery.refetch();
    } catch {
      toast.error('Error al eliminar examen');
    }
  };

  const handleManualPremium = async (targetUid: string, membership: 'FREE' | 'PRO') => {
    try {
      await updateMembership.mutateAsync({ targetUid, membership });
      toast.success(`Rango actualizado → ${membership}`);
      utils.admin.getUsers.invalidate();
      utils.admin.getAdminStats.invalidate();
    } catch {
      toast.error('Error en la gestión de membresía');
    }
  };

  const handleVoucherAction = async (voucherId: number, status: 'APROBADO' | 'RECHAZADO') => {
    setProcessingId(voucherId);
    try {
      await updateVoucherStatus.mutateAsync({ id: voucherId, status });
      toast.success(`Voucher ${status.toLowerCase()} correctamente`);
      vouchersQuery.refetch();
      utils.admin.getAdminStats.invalidate();
    } catch {
      toast.error('Error al procesar voucher');
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleBlock = async (targetUid: string, currentStatus: 'ACTIVE' | 'BLOCKED') => {
    const newStatus = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    try {
      await updateMembership.mutateAsync({ targetUid, status: newStatus });
      toast.success(`Usuario → ${newStatus}`);
      utils.admin.getUsers.invalidate();
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm('CONFIRMAR BORRADO FÍSICO DE USUARIO')) return;
    try {
      await deleteUser.mutateAsync({ uid });
      toast.success('Unidad eliminada del registro');
      utils.admin.getUsers.invalidate();
    } catch {
      toast.error('Error al eliminar usuario');
    }
  };

  const filteredUsers = usersList.data || [];
  const schoolExams = examsQuery.data?.filter(e => e.school === activeExamSchool) || [];
  const s = stats.data as any;

  return (
    <div className="min-h-screen bg-black text-cyan-400 font-mono">
      {/* Broadcast Modal */}
      {activeBroadcast && (
        <BroadcastModal
          broadcast={activeBroadcast}
          onClose={() => setDismissedBroadcast(activeBroadcast.id)}
        />
      )}

      {/* Material Manager Modal */}
      {selectedExamId && (
        <MaterialManager
          examId={selectedExamId}
          onClose={() => setSelectedExamId(null)}
        />
      )}

      <Header showSchoolSelector={false} />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 border border-cyan-900 bg-black rounded-xl px-5 py-3">
          <div className="flex items-center gap-2 flex-1">
            <Terminal className="w-4 h-4 text-cyan-500 animate-pulse" />
            <span className="text-[11px] text-cyan-600 uppercase tracking-[0.4em]">MANDO CENTRAL OPERATIVO</span>
          </div>
          <div className="text-[10px] text-slate-600 font-mono">
            [ID_OPERADOR: <span className="text-cyan-500 font-black">ADMIN_ROOT</span>]
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
            <span className="text-[9px] text-cyan-700 uppercase tracking-widest">SYNC ACTIVO</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatItem label="Total Usuarios" value={s?.totalUsers || 0} />
          <StatItem label="PRO Activos" value={s?.proUsers || 0} accent="text-amber-400" />
          <StatItem label="Cuentas FREE" value={s?.freeUsers || 0} />
          <StatItem label="En Línea (5m)" value={s?.onlineCount || 0} accent="text-emerald-400" />
        </div>

        {/* Chart + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 border border-cyan-900/50 bg-black rounded-xl p-4">
            <div className="text-[9px] text-cyan-700 uppercase tracking-[0.4em] mb-3">DISTRIBUCIÓN FREE / PRO</div>
            <div className="h-[220px] w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'FREE', value: s?.freeUsers || 0 },
                  { name: 'PRO', value: s?.proUsers || 0 },
                  { name: 'ONLINE', value: s?.onlineCount || 0 },
                ]}>
                  <XAxis dataKey="name" stroke="#164e63" fontSize={10} fontFamily="monospace" />
                  <Tooltip
                    cursor={{ fill: '#0a0f1a' }}
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #164e63', fontFamily: 'monospace', fontSize: 11 }}
                    labelStyle={{ color: '#22d3ee' }}
                  />
                  <Bar dataKey="value" fill="#0e7490" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleBroadcast}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-950 border border-red-700 hover:bg-red-900 text-red-400 hover:text-red-300 font-black text-[11px] uppercase tracking-[0.3em] rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]"
            >
              <Megaphone className="w-4 h-4 animate-pulse" /> EMITIR ALERTA ROJA
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-cyan-950 border border-cyan-800 hover:bg-cyan-900 text-cyan-400 font-black text-[11px] uppercase tracking-[0.3em] rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? '> RECALCULANDO_DATOS...' : 'REFRESCAR MANDO'}
            </button>

            <div className="border border-cyan-900/40 bg-black/50 rounded-xl p-4 space-y-2 flex-1">
              <div className="text-[9px] text-cyan-700 uppercase tracking-[0.3em] mb-2">ESTADO DB</div>
              {[
                { label: 'Usuarios activos', val: dashStats.data?.activeUsers || 0, accent: 'text-emerald-400' },
                { label: 'Bloqueados', val: dashStats.data?.blockedUsers || 0, accent: 'text-red-400' },
                { label: 'Online ahora', val: dashStats.data?.onlineNow || 0, accent: 'text-cyan-300' },
              ].map(({ label, val, accent }) => (
                <div key={label} className="flex justify-between text-[10px]">
                  <span className="text-slate-600">{label}</span>
                  <span className={`font-black ${accent}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-black border border-cyan-900 rounded-xl p-1 w-full overflow-x-auto no-scrollbar">
          {([
            { id: 'users', label: 'USUARIOS', icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'exams', label: 'EXÁMENES', icon: <Book className="w-3.5 h-3.5" /> },
            { id: 'vouchers', label: 'VOUCHERS', icon: <Database className="w-3.5 h-3.5" /> },
            { id: 'courses', label: 'CURSOS', icon: <GraduationCap className="w-3.5 h-3.5" /> },
            { id: 'content', label: 'BIBLIOTECA', icon: <BookOpen className="w-3.5 h-3.5" /> },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all font-mono whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                  : 'text-cyan-800 hover:text-cyan-600'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'users' ? (
          <div className="border border-cyan-900/50 bg-black rounded-xl overflow-hidden">
            {/* ... users table content ... */}
          </div>
        ) : activeTab === 'exams' ? (
          <div className="space-y-4">
            {/* ... exams content ... */}
          </div>
        ) : activeTab === 'vouchers' ? (
          <div className="border border-cyan-900/50 bg-black rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-cyan-900/40">
              <Database className="w-4 h-4 text-amber-500" />
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-500">AUDITORÍA DE VOUCHERS (YAPE)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-amber-950/20 text-[9px] uppercase tracking-widest text-amber-700 font-mono">
                  <tr>
                    <th className="px-6 py-3">Unidad</th>
                    <th className="px-6 py-3">Monto</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3">Fecha</th>
                    <th className="px-6 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-900/20">
                  {vouchersQuery.data?.map((v) => (
                    <tr key={v.id} className="hover:bg-amber-950/5 transition-colors">
                      <td className="px-6 py-3 font-mono text-[10px] text-amber-200/60">{v.userId}</td>
                      <td className="px-6 py-3 text-[11px] font-black text-emerald-400">S/ {v.amount}.00</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border font-mono ${
                          v.status === 'APROBADO' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                          v.status === 'RECHAZADO' ? 'bg-red-950 text-red-400 border-red-900' :
                          'bg-amber-500/10 text-amber-400 border-amber-900/50'
                        }`}>{v.status}</span>
                      </td>
                      <td className="px-6 py-3 text-[10px] text-slate-600 font-mono">{new Date(v.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setLightboxUrl(v.voucherUrl)}
                            className="p-1.5 bg-black border border-cyan-900 text-cyan-500 hover:text-cyan-300 rounded"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                          {v.status === 'PENDIENTE' && (
                            <>
                              <button 
                                onClick={() => handleVoucherAction(v.id, 'APROBADO')}
                                disabled={processingId === v.id}
                                className="p-1.5 bg-emerald-950 border border-emerald-800 text-emerald-400 hover:bg-emerald-900 rounded"
                              >
                                {processingId === v.id ? <RefreshCcw className="w-3.5 h-3.5 animate-spin"/> : <Check className="w-3.5 h-3.5"/>}
                              </button>
                              <button 
                                onClick={() => handleVoucherAction(v.id, 'RECHAZADO')}
                                disabled={processingId === v.id}
                                className="p-1.5 bg-red-950 border border-red-900 text-red-400 hover:bg-red-900 rounded"
                              >
                                <X className="w-3.5 h-3.5"/>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {vouchersQuery.data?.length === 0 && (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-600 text-[10px] uppercase font-mono italic">SIN_PAGOS_PENDIENTES</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'courses' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-cyan-900 bg-black rounded-xl p-6 flex flex-col items-center justify-center text-center">
                <GraduationCap className="w-8 h-8 text-cyan-600 mb-2" />
                <div className="text-[11px] font-black uppercase tracking-widest text-cyan-400 mb-1">GESTIÓN DE CURSOS</div>
                <p className="text-[9px] text-cyan-900 mb-4 max-w-[200px]">Cursos teóricos y materiales de estudio Pro.</p>
                <div className="flex gap-2">
                  <button className="px-4 py-1.5 bg-cyan-950 border border-cyan-700 text-cyan-300 font-black text-[9px] uppercase rounded">CREAR_CURSO</button>
                </div>
              </div>
              <div className="border border-cyan-900/50 bg-black rounded-xl p-6">
                <div className="text-[10px] text-cyan-700 font-mono italic uppercase mb-2">CURSOS_ACTUALES</div>
                <div className="space-y-2">
                  {coursesQuery.data?.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 border border-cyan-900/10 bg-black/50 rounded-lg group">
                      <div>
                        <div className="text-[11px] font-bold text-cyan-300 font-mono">{c.title}</div>
                        <div className="text-[9px] text-cyan-800 font-mono uppercase">{c.level} · {c.schoolType}</div>
                      </div>
                      <button className="p-1.5 text-cyan-800 hover:text-cyan-400"><ExternalLink size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-cyan-900/50 bg-black rounded-xl p-8 text-center">
            <BookOpen className="w-8 h-8 text-cyan-900 mx-auto mb-2" />
            <div className="text-[10px] text-cyan-900 uppercase font-mono italic">BIBLIOTECA_EN_SINCRO...</div>
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="Comprobante" className="max-h-[90vh] max-w-full rounded border-2 border-cyan-900 shadow-[0_0_50px_rgba(34,211,238,0.2)]" />
          <button className="absolute top-6 right-6 p-2 bg-red-600 text-white rounded hover:bg-red-500"><X size={24}/></button>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto mt-8 mx-4 md:mx-8 p-4 border border-cyan-900/30 rounded-xl bg-black font-mono text-[10px]">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3 text-cyan-900">
            <span className="animate-pulse text-cyan-700">$</span>
            <span>polic.ia@admin-terminal:~#</span>
            <span className="text-cyan-700">_</span>
          </div>
          <div className="flex items-center gap-4 text-[9px] text-cyan-900">
            <span>USUARIOS: <span className="text-cyan-600">{s?.totalUsers || 0}</span></span>
            <span>PRO: <span className="text-amber-600">{s?.proUsers || 0}</span></span>
            <span>SIST: <span className="text-emerald-600">ONLINE</span></span>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-emerald-700">CONNECTED</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
