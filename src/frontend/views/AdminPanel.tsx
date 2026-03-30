import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  ShieldCheck, Search, Check, X, Loader2, ExternalLink, Database,
  UploadCloud, FileJson, Users as UsersIcon, BookOpen, HelpCircle,
  Plus, Trash2, Edit3, Save, Filter, GraduationCap, Video, FileText, Link as LinkIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../shared/utils/trpc';
import { storage } from '@/src/firebase';
import { ref, deleteObject, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { Header } from '../components/common/Header';

type AdminTab = 'vouchers' | 'users' | 'content' | 'questions' | 'ingest' | 'courses';

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('vouchers');
  const [processingId, setProcessingId] = useState<number | string | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'ALL' | 'FREE' | 'PRO'>('ALL');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // ─── Queries ───
  const vouchersQuery = trpc.admin.getVouchers.useQuery();
  const usersQuery = trpc.admin.getUsers.useQuery({ search: userSearch || undefined, membership: userFilter });
  const statsQuery = trpc.admin.getAdminStats.useQuery();
  const areasQuery = trpc.admin.getAreas.useQuery();
  const contentQuery = trpc.admin.getContent.useQuery();
  const questionsQuery = trpc.admin.getQuestions.useQuery();

  // ─── Mutations ───
  const updateStatusMutation = trpc.admin.updateVoucherStatus.useMutation();
  const updateMembershipMutation = trpc.admin.updateUserMembership.useMutation();
  const updateSchoolMutation = trpc.admin.updateUserSchool.useMutation();
  const ingestMutation = trpc.admin.bulkIngestQuestions.useMutation();
  const createAreaMutation = trpc.admin.createArea.useMutation();
  const createContentMutation = trpc.admin.createContent.useMutation();
  const deleteContentMutation = trpc.admin.deleteContent.useMutation();
  const createQuestionMutation = trpc.admin.createQuestion.useMutation();
  const deleteQuestionMutation = trpc.admin.deleteQuestion.useMutation();

  // ─── Courses Queries & Mutations ───
  const coursesQuery = trpc.adminCourses.getCourses.useQuery(undefined, { enabled: activeTab === 'courses' });
  const createCourseMutation = trpc.adminCourses.createCourse.useMutation();
  const deleteCourseMutation = trpc.adminCourses.deleteCourse.useMutation();

  const [selectedCourseForMaterials, setSelectedCourseForMaterials] = useState<number | null>(null);
  const materialsQuery = trpc.adminCourses.getCourseMaterials.useQuery(
    { courseId: selectedCourseForMaterials! }, 
    { enabled: !!selectedCourseForMaterials }
  );
  const addMaterialMutation = trpc.adminCourses.addMaterialToCourse.useMutation();
  const deleteMaterialMutation = trpc.adminCourses.deleteCourseMaterial.useMutation();
  const [newMaterial, setNewMaterial] = useState({ title: '', type: 'PDF' as 'PDF'|'VIDEO'|'EXAM'|'LINK'|'TEXT', contentUrl: '', file: null as File | null });
  const [uploadProgress, setUploadProgress] = useState(0);

  // ─── Content form state ───
  const [newContent, setNewContent] = useState({ areaId: 0, title: '', body: '', level: 1, schoolType: 'BOTH' as 'EO' | 'EESTP' | 'BOTH' });
  const [newArea, setNewArea] = useState({ name: '', icon: '' });
  
  // ─── Question form state ───
  const [newQuestion, setNewQuestion] = useState({
    areaId: 0, question: '', options: ['', '', '', ''], correctOption: 0,
    difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD', schoolType: 'BOTH' as 'EO' | 'EESTP' | 'BOTH'
  });

  // ─── Courses form state ───
  const [newCourse, setNewCourse] = useState({ title: '', description: '', level: 'BASICO' as 'BASICO'|'INTERMEDIO'|'AVANZADO', schoolType: 'BOTH' as 'EO' | 'EESTP' | 'BOTH' });

  const handleApprove = async (voucherId: number, userId: string, url: string) => {
    setProcessingId(voucherId);
    try {
      await updateStatusMutation.mutateAsync({ id: voucherId, status: 'APROBADO' });
      const imageRef = ref(storage, url);
      await deleteObject(imageRef).catch(() => {});
      toast.success('Voucher aprobado correctamente.');
      vouchersQuery.refetch();
      statsQuery.refetch();
      usersQuery.refetch();
    } catch { toast.error('Error al aprobar.'); }
    finally { setProcessingId(null); }
  };

  const handleReject = async (voucherId: number) => {
    setProcessingId(voucherId);
    try {
      await updateStatusMutation.mutateAsync({ id: voucherId, status: 'RECHAZADO', reason: 'Voucher no válido' });
      toast.success('Voucher rechazado.');
      vouchersQuery.refetch();
    } catch { toast.error('Error al rechazar.'); }
    finally { setProcessingId(null); }
  };

  const handleToggleMembership = async (uid: string, current: string) => {
    setProcessingId(uid);
    try {
      const newStatus = current === 'PRO' ? 'FREE' : 'PRO';
      await updateMembershipMutation.mutateAsync({ uid, membership: newStatus });
      toast.success(`Usuario actualizado a ${newStatus}`);
      usersQuery.refetch();
      statsQuery.refetch();
    } catch { toast.error('Error al actualizar usuario.'); }
    finally { setProcessingId(null); }
  };

  const handleChangeSchool = async (uid: string, school: 'EO' | 'EESTP') => {
    setProcessingId(uid);
    try {
      await updateSchoolMutation.mutateAsync({ uid, school });
      toast.success(`Escuela actualizada a ${school}`);
      usersQuery.refetch();
    } catch { toast.error('Error al cambiar escuela.'); }
    finally { setProcessingId(null); }
  };

  const handleCreateContent = async () => {
    if (!newContent.areaId || !newContent.title || !newContent.body) { toast.error('Completa todos los campos.'); return; }
    try {
      await createContentMutation.mutateAsync(newContent);
      toast.success('Contenido creado.');
      setNewContent({ areaId: 0, title: '', body: '', level: 1, schoolType: 'BOTH' });
      contentQuery.refetch();
    } catch { toast.error('Error al crear contenido.'); }
  };

  const handleCreateCourse = async () => {
    if (!newCourse.title) { toast.error('El título del curso es obligatorio.'); return; }
    try {
      await createCourseMutation.mutateAsync(newCourse);
      toast.success('Curso creado.');
      setNewCourse({ title: '', description: '', level: 'BASICO', schoolType: 'BOTH' });
      coursesQuery.refetch();
    } catch { toast.error('Error al crear curso.'); }
  };

  const handleCreateMaterial = async () => {
    if (!newMaterial.title || !selectedCourseForMaterials) { toast.error('Falta título o curso seleccionado.'); return; }
    
    let finalUrl = newMaterial.contentUrl;

    if (newMaterial.file) {
      const storageRef = ref(storage, `courses/${selectedCourseForMaterials}/${Date.now()}_${newMaterial.file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, newMaterial.file);
      
      try {
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
            (error) => { toast.error('Error subiendo archivo'); reject(error); },
            async () => {
              finalUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      } catch { setUploadProgress(0); return; }
    }

    if (!finalUrl && newMaterial.type !== 'TEXT') {
      toast.error('Debes proporcionar un enlace o subir un archivo.');
      return;
    }

    try {
      await addMaterialMutation.mutateAsync({
        courseId: selectedCourseForMaterials,
        title: newMaterial.title,
        type: newMaterial.type as any,
        contentUrl: finalUrl
      });
      toast.success('Material enlazado correctamente.');
      setNewMaterial({ title: '', type: 'PDF', contentUrl: '', file: null });
      setUploadProgress(0);
      materialsQuery.refetch();
    } catch { toast.error('Error al enlazar material.'); }
  };

  const handleCreateQuestion = async () => {
    if (!newQuestion.areaId || !newQuestion.question || newQuestion.options.some(o => !o.trim())) {
      toast.error('Completa todos los campos y opciones.'); return;
    }
    try {
      await createQuestionMutation.mutateAsync(newQuestion);
      toast.success('Pregunta creada.');
      setNewQuestion({ areaId: 0, question: '', options: ['', '', '', ''], correctOption: 0, difficulty: 'MEDIUM', schoolType: 'BOTH' });
      questionsQuery.refetch();
    } catch { toast.error('Error al crear pregunta.'); }
  };

  const validateAndInject = async () => {
    try {
      const data = JSON.parse(jsonInput);
      await ingestMutation.mutateAsync(data);
      toast.success(`Inyección exitosa: ${data.length} preguntas.`);
      setJsonInput('');
      questionsQuery.refetch();
    } catch { toast.error('Error en inyección. Verifica el formato JSON.'); }
  };

  const vouchers = vouchersQuery.data || [];
  const usersList = usersQuery.data || [];
  const areas = areasQuery.data || [];
  const contentList = contentQuery.data || [];
  const questions = questionsQuery.data || [];
  const stats = statsQuery.data || { totalUsers: 0, premiumUsers: 0, dailyRevenue: 0, totalQuestions: 0, totalContent: 0 };

  const tabs: { id: AdminTab; label: string; count?: number; icon: React.ReactNode }[] = [
    { id: 'vouchers', label: 'Vouchers', count: vouchers.length, icon: <Database className="w-3.5 h-3.5" /> },
    { id: 'users', label: 'Usuarios', count: usersList.length, icon: <UsersIcon className="w-3.5 h-3.5" /> },
    { id: 'content', label: 'Contenido', count: contentList.length, icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'questions', label: 'Preguntas', count: questions.length, icon: <HelpCircle className="w-3.5 h-3.5" /> },
    { id: 'ingest', label: 'Inyección', icon: <UploadCloud className="w-3.5 h-3.5" /> },
    { id: 'courses', label: 'Cursos', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] p-4 md:p-8 font-sans">
      <Header showSchoolSelector={false} />
      
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <nav className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800 flex-wrap gap-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && <span className="text-[9px] opacity-70">({tab.count})</span>}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { value: `S/ ${stats.dailyRevenue}`, label: 'Ingresos Hoy', color: 'text-emerald-400' },
          { value: stats.totalUsers, label: 'Usuarios', color: 'text-purple-400' },
          { value: stats.premiumUsers, label: 'Premium', color: 'text-amber-400' },
          { value: stats.totalQuestions, label: 'Preguntas', color: 'text-blue-400' },
          { value: stats.totalContent, label: 'Contenido', color: 'text-pink-400' },
        ].map((s) => (
          <Card key={s.label} className="bg-slate-900/60 border-slate-800">
            <CardContent className="pt-5 pb-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <main>
        {/* ─── VOUCHERS TAB ─── */}
        {activeTab === 'vouchers' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" /> Auditoría Yape
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vouchersQuery.isLoading ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
              ) : vouchers.length === 0 ? (
                <div className="py-12 text-center text-slate-500">No hay vouchers pendientes.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                      <tr><th className="pb-3">UserId</th><th className="pb-3">Monto</th><th className="pb-3">Estado</th><th className="pb-3">Acciones</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {vouchers.map((v) => (
                        <tr key={v.id} className="text-sm">
                          <td className="py-4 font-mono text-xs text-slate-400">{v.userId}</td>
                          <td className="py-4 font-mono text-emerald-400">S/ {v.amount}.00</td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              v.status === 'APROBADO' ? 'bg-emerald-500/10 text-emerald-400' :
                              v.status === 'RECHAZADO' ? 'bg-red-500/10 text-red-400' :
                              'bg-amber-500/10 text-amber-400'
                            }`}>{v.status}</span>
                          </td>
                          <td className="py-4 space-x-2">
                            <button onClick={() => setLightboxUrl(v.voucherUrl)} className="inline-flex items-center gap-1 text-blue-400 hover:underline"><ExternalLink size={14}/></button>
                            {v.status === 'PENDIENTE' && (
                              <>
                                <button onClick={() => handleApprove(v.id, v.userId || '', v.voucherUrl)} className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/40">
                                  {processingId === v.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check size={14}/>}
                                </button>
                                <button onClick={() => handleReject(v.id)} className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40">
                                  <X size={14}/>
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── USERS TAB ─── */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-blue-400" /> Directorio de Usuarios
              </CardTitle>
              <div className="flex gap-3 mt-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text" placeholder="Buscar por nombre, UID o email..."
                    value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-blue-500 outline-none"
                  />
                </div>
                <select
                  value={userFilter} onChange={(e) => setUserFilter(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                >
                  <option value="ALL">Todos</option>
                  <option value="FREE">FREE</option>
                  <option value="PRO">PRO</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-800 text-slate-500 text-xs uppercase">
                    <tr><th className="pb-3">Nombre</th><th className="pb-3">Estado</th><th className="pb-3">Escuela</th><th className="pb-3 text-right">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {usersList.map((u) => (
                      <tr key={u.uid} className="text-sm">
                        <td className="py-4">
                          <div className="font-bold text-white">{u.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{u.uid}</div>
                          {u.email && <div className="text-[10px] text-slate-600">{u.email}</div>}
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            u.membership === 'PRO' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                          }`}>{u.membership}</span>
                        </td>
                        <td className="py-4">
                          <select
                            value={u.school || ''} 
                            onChange={(e) => handleChangeSchool(u.uid, e.target.value as 'EO' | 'EESTP')}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          >
                            <option value="">N/A</option>
                            <option value="EO">EO</option>
                            <option value="EESTP">EESTP</option>
                          </select>
                        </td>
                        <td className="py-4 text-right">
                          <button 
                            disabled={!!processingId}
                            onClick={() => handleToggleMembership(u.uid, u.membership || 'FREE')}
                            className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
                              u.membership === 'PRO' ? 'bg-red-500/20 text-red-400' : 'bg-blue-600 text-white'
                            }`}
                          >
                            {processingId === u.uid ? <Loader2 className="w-3 h-3 animate-spin mx-auto"/> : u.membership === 'PRO' ? 'Bajar a FREE' : 'Subir a PRO'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── CONTENT TAB ─── */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Create Area */}
            <Card className="border-blue-900/30">
              <CardHeader><CardTitle className="text-sm">Nueva Área de Aprendizaje</CardTitle></CardHeader>
              <CardContent className="flex gap-3">
                <input placeholder="Nombre del área" value={newArea.name} onChange={(e) => setNewArea(p => ({ ...p, name: e.target.value }))}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-600 focus:border-blue-500 outline-none" />
                <input placeholder="Icono (ej: Calculator)" value={newArea.icon} onChange={(e) => setNewArea(p => ({ ...p, icon: e.target.value }))}
                  className="w-40 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-600 focus:border-blue-500 outline-none" />
                <Button onClick={async () => {
                  if (!newArea.name) return;
                  await createAreaMutation.mutateAsync(newArea);
                  toast.success('Área creada.');
                  setNewArea({ name: '', icon: '' });
                  areasQuery.refetch();
                }} disabled={createAreaMutation.isPending}><Plus className="w-4 h-4 mr-1" /> Crear</Button>
              </CardContent>
            </Card>

            {/* Create Content */}
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-400" /> Crear Contenido</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select value={newContent.areaId} onChange={(e) => setNewContent(p => ({ ...p, areaId: Number(e.target.value) }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 outline-none">
                    <option value={0}>Seleccionar área...</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <select value={newContent.schoolType} onChange={(e) => setNewContent(p => ({ ...p, schoolType: e.target.value as any }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 outline-none">
                    <option value="BOTH">Ambas escuelas</option>
                    <option value="EO">Solo EO</option>
                    <option value="EESTP">Solo EESTP</option>
                  </select>
                  <select value={newContent.level} onChange={(e) => setNewContent(p => ({ ...p, level: Number(e.target.value) }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 outline-none">
                    {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>Nivel {l}</option>)}
                  </select>
                </div>
                <input placeholder="Título del contenido" value={newContent.title} onChange={(e) => setNewContent(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-blue-500 outline-none" />
                <textarea placeholder="Cuerpo del contenido..." value={newContent.body} onChange={(e) => setNewContent(p => ({ ...p, body: e.target.value }))}
                  className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder-slate-600 resize-none focus:border-blue-500 outline-none" />
                <Button fullWidth onClick={handleCreateContent} disabled={createContentMutation.isPending}>
                  {createContentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Publicar Contenido</>}
                </Button>
              </CardContent>
            </Card>

            {/* Content list */}
            <Card>
              <CardHeader><CardTitle className="text-sm text-slate-400 uppercase tracking-widest">Contenido Existente ({contentList.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {contentList.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                      <div>
                        <div className="font-bold text-sm text-white">{item.title}</div>
                        <div className="text-[10px] text-slate-500">Área: {areas.find(a => a.id === item.areaId)?.name || item.areaId} · {item.schoolType} · Nivel {item.level}</div>
                      </div>
                      <button onClick={async () => {
                        await deleteContentMutation.mutateAsync({ id: item.id });
                        toast.success('Eliminado.'); contentQuery.refetch();
                      }} className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── QUESTIONS TAB ─── */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><HelpCircle className="w-5 h-5 text-blue-400" /> Crear Pregunta de Examen</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select value={newQuestion.areaId} onChange={(e) => setNewQuestion(p => ({ ...p, areaId: Number(e.target.value) }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 outline-none">
                    <option value={0}>Seleccionar área...</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <select value={newQuestion.difficulty} onChange={(e) => setNewQuestion(p => ({ ...p, difficulty: e.target.value as any }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 outline-none">
                    <option value="EASY">Fácil</option>
                    <option value="MEDIUM">Medio</option>
                    <option value="HARD">Difícil</option>
                  </select>
                  <select value={newQuestion.schoolType} onChange={(e) => setNewQuestion(p => ({ ...p, schoolType: e.target.value as any }))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 outline-none">
                    <option value="BOTH">Ambas escuelas</option>
                    <option value="EO">Solo EO</option>
                    <option value="EESTP">Solo EESTP</option>
                  </select>
                </div>
                <textarea placeholder="Enunciado de la pregunta..." value={newQuestion.question} onChange={(e) => setNewQuestion(p => ({ ...p, question: e.target.value }))}
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder-slate-600 resize-none focus:border-blue-500 outline-none" />
                
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Opciones (marca la correcta)</p>
                  {newQuestion.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        onClick={() => setNewQuestion(p => ({ ...p, correctOption: idx }))}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black transition-all ${
                          newQuestion.correctOption === idx ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        }`}
                      >{String.fromCharCode(65 + idx)}</button>
                      <input
                        value={opt}
                        onChange={(e) => {
                          const opts = [...newQuestion.options];
                          opts[idx] = e.target.value;
                          setNewQuestion(p => ({ ...p, options: opts }));
                        }}
                        placeholder={`Opción ${String.fromCharCode(65 + idx)}`}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-600 focus:border-blue-500 outline-none"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={() => setNewQuestion(p => ({ ...p, options: [...p.options, ''] }))}
                      className="text-xs text-blue-400 hover:underline">+ Añadir opción</button>
                    {newQuestion.options.length > 2 && (
                      <button onClick={() => setNewQuestion(p => ({ ...p, options: p.options.slice(0, -1), correctOption: Math.min(p.correctOption, p.options.length - 2) }))}
                        className="text-xs text-red-400 hover:underline">- Quitar última</button>
                    )}
                  </div>
                </div>

                <Button fullWidth onClick={handleCreateQuestion} disabled={createQuestionMutation.isPending}>
                  {createQuestionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Crear Pregunta</>}
                </Button>
              </CardContent>
            </Card>

            {/* Questions list */}
            <Card>
              <CardHeader><CardTitle className="text-sm text-slate-400 uppercase tracking-widest">Preguntas en BD ({questions.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {questions.map(q => (
                    <div key={q.id} className="flex items-start justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{q.question}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-bold">{q.difficulty}</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-bold">{q.schoolType || 'BOTH'}</span>
                          <span className="text-[9px] text-slate-600">#{q.id}</span>
                        </div>
                      </div>
                      <button onClick={async () => {
                        await deleteQuestionMutation.mutateAsync({ id: q.id });
                        toast.success('Pregunta eliminada.'); questionsQuery.refetch();
                      }} className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors shrink-0"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── INGEST TAB ─── */}
        {activeTab === 'ingest' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><FileJson className="w-5 h-5 text-blue-400" /> Ingesta Masiva JSON</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-950/20 border border-blue-900/30 p-3 rounded-lg text-xs text-blue-300">
                Formato: <code className="bg-slate-900 px-1 rounded">[{`{ "areaId": 1, "question": "...", "options": ["A","B","C","D"], "correctOption": 0, "difficulty": "MEDIUM", "schoolType": "BOTH" }`}]</code>
              </div>
              <textarea 
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='[{"areaId": 1, "question": "¿Pregunta?", "options": ["A", "B", "C", "D"], "correctOption": 0, "difficulty": "MEDIUM", "schoolType": "BOTH"}]'
                className="w-full h-80 bg-slate-900 border border-slate-700 rounded-xl p-4 font-mono text-xs text-blue-300 resize-none focus:border-blue-500 outline-none"
              />
              <Button fullWidth onClick={validateAndInject} disabled={ingestMutation.isPending || !jsonInput.trim()}>
                {ingestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UploadCloud className="w-4 h-4 mr-1" /> Inyectar Reactivos</>}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ─── COURSES TAB ─── */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><GraduationCap className="w-5 h-5 text-blue-400" /> Crear Nuevo Curso</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input placeholder="Título del curso" value={newCourse.title} onChange={(e) => setNewCourse(p => ({...p, title: e.target.value}))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                  <select value={newCourse.level} onChange={(e) => setNewCourse(p => ({...p, level: e.target.value as any}))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 outline-none">
                    <option value="BASICO">BÁSICO</option>
                    <option value="INTERMEDIO">INTERMEDIO</option>
                    <option value="AVANZADO">AVANZADO</option>
                  </select>
                </div>
                <textarea placeholder="Descripción detallada..." value={newCourse.description} onChange={(e) => setNewCourse(p => ({...p, description: e.target.value}))}
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder-slate-600 resize-none focus:border-blue-500 outline-none" />
                <Button fullWidth onClick={handleCreateCourse} disabled={createCourseMutation.isPending}>
                  {createCourseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Crear Curso</>}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm text-slate-400 uppercase tracking-widest">Cursos ({coursesQuery.data?.length || 0})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(coursesQuery.data || []).map(course => (
                    <div key={course.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                      <div>
                        <div className="font-bold text-sm text-white">{course.title}</div>
                        <div className="text-[10px] text-slate-500">{course.level} · {course.schoolType}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${course.isPublished ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                          {course.isPublished ? 'PUBLICADO' : 'BORRADOR'}
                        </span>
                        <button onClick={async () => {
                          await deleteCourseMutation.mutateAsync({ courseId: course.id });
                          toast.success('Curso eliminado.'); coursesQuery.refetch();
                        }} className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                        <button onClick={() => setSelectedCourseForMaterials(course.id)} className="p-2 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"><FileJson className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Materials Modal */}
      {selectedCourseForMaterials && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-700 bg-slate-800/50">
              <h3 className="font-bold text-white flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-400" /> Gestionar Materiales del Curso</h3>
              <button onClick={() => setSelectedCourseForMaterials(null)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Nuevo Material */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-4">
                <h4 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-2">Añadir Recurso</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input placeholder="Título del Material" value={newMaterial.title} onChange={e => setNewMaterial(p => ({...p, title: e.target.value}))} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                  <select value={newMaterial.type} onChange={e => setNewMaterial(p => ({...p, type: e.target.value as any}))} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 outline-none">
                    <option value="PDF">Documento PDF</option>
                    <option value="VIDEO">Enlace de Video</option>
                    <option value="LINK">Enlace Externo</option>
                    <option value="EXAM">Simulacro / Examen</option>
                  </select>
                </div>
                
                {newMaterial.type === 'PDF' ? (
                  <div className="border border-dashed border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center gap-2 relative bg-slate-900/50 hover:bg-slate-900 transition-colors">
                    <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setNewMaterial(p => ({...p, file: e.target.files?.[0] || null}))} />
                    <UploadCloud className="w-6 h-6 text-slate-400" />
                    <p className="text-xs font-bold text-slate-300">{newMaterial.file ? newMaterial.file.name : 'Subir archivo PDF (.pdf)'}</p>
                    {uploadProgress > 0 && <div className="w-full bg-slate-800 rounded-full h-1 mt-2.5 overflow-hidden"><div className="bg-blue-500 h-1 transition-all" style={{width: `${uploadProgress}%`}} /></div>}
                  </div>
                ) : (
                  <input placeholder="URL del contenido (ej: YouTube, Drive...)" value={newMaterial.contentUrl} onChange={e => setNewMaterial(p => ({...p, contentUrl: e.target.value}))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white focus:border-blue-500 outline-none" />
                )}

                <Button fullWidth onClick={handleCreateMaterial} disabled={addMaterialMutation.isPending || uploadProgress > 0}>
                  {(addMaterialMutation.isPending || (uploadProgress > 0 && uploadProgress < 100)) ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Adjuntar a Curso</>}
                </Button>
              </div>

              {/* Lista Materiales */}
              <div className="space-y-2">
                {materialsQuery.isLoading ? (
                  <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>
                ) : materialsQuery.data?.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-4">No hay materiales en este curso.</p>
                ) : (
                  materialsQuery.data?.map(mat => (
                    <div key={mat.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800 group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                          {mat.type === 'PDF' && <FileText className="w-4 h-4 text-red-400" />}
                          {mat.type === 'VIDEO' && <Video className="w-4 h-4 text-blue-400" />}
                          {mat.type === 'LINK' && <LinkIcon className="w-4 h-4 text-emerald-400" />}
                          {mat.type === 'EXAM' && <HelpCircle className="w-4 h-4 text-amber-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{mat.title}</p>
                          <a href={mat.contentUrl!} target="_blank" rel="noreferrer" className="text-[9px] text-blue-400 hover:underline max-w-[200px] truncate block">Ver Recurso</a>
                        </div>
                      </div>
                      <button onClick={async () => {
                        await deleteMaterialMutation.mutateAsync({ materialId: mat.id });
                        toast.success('Eliminado.'); materialsQuery.refetch();
                      }} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="Comprobante" className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl object-contain border-4 border-slate-800" />
          <button 
            className="absolute top-4 right-4 p-3 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors shadow-xl"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};
