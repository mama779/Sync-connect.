"use client"

import { useState, useRef } from 'react'
import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Trash2, 
  Loader2, 
  PlayCircle, 
  Save, 
  X, 
  HelpCircle, 
  ListChecks, 
  Video, 
  Zap, 
  Upload,
  Lock,
  FileText,
  Clock,
  Smartphone,
  Eye,
  CheckCircle2,
  Edit2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase'
import { collection, doc, getDocs, setDoc, query, where } from 'firebase/firestore'
import { cn, getYoutubeThumbnail, formatVideoTime } from '@/lib/utils'

interface Question {
  id?: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export default function AdminAcademyPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const auth = useAuth()
  
  const [isAddingModule, setIsAddingModule] = useState(false)
  const [isAddingLesson, setIsAddingLesson] = useState(false)
  const [isEditingQuiz, setIsEditingQuiz] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  
  const videoInputRef = useRef<HTMLInputElement>(null)

  const modulesQuery = useMemoFirebase(() => db ? collection(db, 'academy_modules') : null, [db]);
  const { data: modules, isLoading: loadingModules } = useCollection(modulesQuery);

  const lessonsQuery = useMemoFirebase(() => db ? collection(db, 'academy_lessons') : null, [db]);
  const { data: lessons, isLoading: loadingLessons } = useCollection(lessonsQuery);

  const [moduleData, setModuleData] = useState({ 
    title: '', 
    description: '',
    accessKey: '' 
  })

  const [lessonData, setLessonData] = useState({ 
    title: '', 
    description: '', 
    videoUrl: '', 
    moduleId: '',
    duration: '',
    accessKey: '', // "Palabra complicada" / Clave de acceso
    pdfUrl: '',
    materialUrl: ''
  })

  const [quizQuestions, setQuizQuestions] = useState<Question[]>([])

  // Handle local video file selection from phone or computer
  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024 * 1024) { // 200MB limit for local browser upload
      toast({
        variant: "destructive",
        title: "Archivo muy pesado",
        description: "Para videos mayores a 200MB recomendamos usar YouTube, Vimeo o Google Drive."
      });
    }

    setIsUploadingVideo(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setLessonData(prev => ({
        ...prev,
        videoUrl: result,
        duration: prev.duration || "10:00"
      }));
      setIsUploadingVideo(false);
      toast({
        title: "Video Cargado ✓",
        description: `Video "${file.name}" cargado exitosamente desde tu dispositivo.`
      });
    };
    reader.onerror = () => {
      setIsUploadingVideo(false);
      toast({ variant: "destructive", title: "Error al leer el video." });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveModule = async () => {
    if (!moduleData.title.trim() || !db) {
      toast({ variant: "destructive", title: "Título Requerido", description: "Ingresa el nombre del módulo." });
      return;
    }
    setIsProcessing(true);
    try {
      await addDocumentNonBlocking(collection(db, 'academy_modules'), {
        title: moduleData.title.trim(),
        description: moduleData.description.trim(),
        accessKey: moduleData.accessKey.trim() || undefined,
        createdAt: new Date().toISOString(),
        order: (modules?.length || 0) + 1
      });
      setIsAddingModule(false);
      setModuleData({ title: '', description: '', accessKey: '' });
      toast({ title: "Módulo Creado ✓" });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleSaveLesson = async () => {
    if (!lessonData.title.trim() || !lessonData.videoUrl.trim() || !lessonData.moduleId || !db) {
      toast({ 
        variant: "destructive", 
        title: "Campos incompletos", 
        description: "Debes elegir un módulo, título y cargar un video o pegar una URL." 
      });
      return;
    }
    setIsProcessing(true);
    try {
      await addDocumentNonBlocking(collection(db, 'academy_lessons'), {
        title: lessonData.title.trim(),
        description: lessonData.description.trim(),
        videoUrl: lessonData.videoUrl.trim(),
        moduleId: lessonData.moduleId,
        duration: lessonData.duration.trim() || '08:00',
        accessKey: lessonData.accessKey.trim() || undefined,
        pdfUrl: lessonData.pdfUrl.trim() || undefined,
        materialUrl: lessonData.materialUrl.trim() || undefined,
        createdAt: new Date().toISOString(),
        order: (lessons?.filter(l => l.moduleId === lessonData.moduleId).length || 0) + 1
      });
      setIsAddingLesson(false);
      setLessonData({ title: '', description: '', videoUrl: '', moduleId: '', duration: '', accessKey: '', pdfUrl: '', materialUrl: '' });
      toast({ title: "Clase Publicada ✓", description: "Disponible de inmediato en la academia de los alumnos." });
    } finally {
      setIsProcessing(false);
    }
  }

  const openQuizEditor = async (moduleId: string) => {
    setIsEditingQuiz(moduleId);
    setIsProcessing(true);
    try {
      const q = query(collection(db, 'academy_questions'), where('moduleId', '==', moduleId));
      const snap = await getDocs(q);
      const existing = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
      setQuizQuestions(existing.length > 0 ? existing : [{ text: '', options: ['', '', ''], correctIndex: 0 }]);
    } finally {
      setIsProcessing(false);
    }
  }

  const handleSaveQuiz = async () => {
    if (!isEditingQuiz || !db) return;
    setIsProcessing(true);
    try {
      for (const q of quizQuestions) {
        const qRef = q.id ? doc(db, 'academy_questions', q.id) : doc(collection(db, 'academy_questions'));
        await setDoc(qRef, { ...q, moduleId: isEditingQuiz, updatedAt: new Date().toISOString() });
      }
      toast({ title: "Examen Guardado ✓" });
      setIsEditingQuiz(null);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <DashboardShell role="admin">
      <div className="space-y-12 pb-20">
        
        {/* HEADER AREA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 text-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2 text-primary font-mono text-xs font-black uppercase tracking-widest">
              <Video className="h-4 w-4" /> Hotmart-Style Course Management
            </div>
            <h1 className="text-3xl md:text-5xl font-headline font-black uppercase italic tracking-tight">
              Gestión de <span className="text-primary">Cursos y Clases</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-xl font-medium">
              Sube tus videos desde tu teléfono o computadora, organiza módulos y protege tus lecciones con palabras clave de acceso.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 relative z-10">
            <Button onClick={() => setIsAddingModule(true)} variant="outline" className="h-14 px-6 border-white/20 text-white hover:bg-white/10 rounded-2xl font-black text-xs uppercase tracking-widest gap-2">
              <Plus className="h-4 w-4" /> NUEVO MÓDULO
            </Button>
            <Button onClick={() => setIsAddingLesson(true)} className="h-14 px-8 bg-primary text-slate-950 hover:bg-primary/90 rounded-2xl font-black text-xs uppercase tracking-widest gap-2 shadow-xl">
              <Upload className="h-4 w-4" /> CARGAR CLASE / VIDEO
            </Button>
          </div>
        </div>

        {/* CONTENT AREA */}
        {loadingModules || loadingLessons ? (
          <div className="flex justify-center py-40"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>
        ) : (
          <div className="space-y-16">
            {modules?.sort((a, b) => (a.order || 0) - (b.order || 0)).map((mod) => {
              const moduleLessons = lessons?.filter(l => l.moduleId === mod.id).sort((a, b) => (a.order || 0) - (b.order || 0)) || [];
              return (
                <div key={mod.id} className="space-y-8 bg-white dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm">
                  
                  {/* Module Header Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-slate-900 text-primary flex items-center justify-center font-black text-lg italic shadow-inner">
                        {mod.order || 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{mod.title}</h2>
                          {mod.accessKey && (
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono text-[10px] gap-1">
                              <Lock className="h-3 w-3" /> Protegido
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-1">{mod.description || 'Sin descripción'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs font-mono py-1 px-3">
                        {moduleLessons.length} Clases
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => openQuizEditor(mod.id)} className="h-10 px-4 rounded-xl font-bold text-xs uppercase gap-2 border-primary text-primary hover:bg-primary/5">
                        <ListChecks className="h-4 w-4" /> Examen
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-red-400 hover:text-red-600 rounded-xl" onClick={() => { if(confirm("¿Eliminar este módulo y sus clases?")) deleteDocumentNonBlocking(doc(db, 'academy_modules', mod.id)) }}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Class Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {moduleLessons.map(lesson => (
                      <Card key={lesson.id} className="border-none shadow-md rounded-[2rem] bg-slate-50 dark:bg-slate-900 overflow-hidden group ring-1 ring-slate-200 dark:ring-white/10 flex flex-col justify-between">
                        <div>
                          <div className="relative h-44 bg-slate-950 overflow-hidden">
                            <img 
                              src={getYoutubeThumbnail(lesson.videoUrl)} 
                              className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-all duration-500" 
                              alt="" 
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                              <PlayCircle className="h-12 w-12 text-white opacity-90 group-hover:scale-110 transition-transform" />
                            </div>
                            
                            <div className="absolute top-3 left-3 flex gap-2">
                              <span className="bg-slate-900/90 text-white rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest backdrop-blur-md">
                                Clase {lesson.order}
                              </span>
                              {lesson.accessKey && (
                                <span className="bg-amber-600 text-white rounded-full px-2.5 py-1 text-[9px] font-mono font-bold flex items-center gap-1 shadow-md">
                                  <Lock className="h-3 w-3" /> {lesson.accessKey}
                                </span>
                              )}
                            </div>

                            {lesson.duration && (
                              <div className="absolute bottom-3 right-3 bg-black/80 text-white text-[9px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Clock className="h-3 w-3 text-primary" /> {lesson.duration}
                              </div>
                            )}
                          </div>

                          <CardContent className="p-5 space-y-2">
                            <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white leading-snug line-clamp-2">
                              {lesson.title}
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-2 font-medium">
                              {lesson.description || 'Sin sinopsis cargada.'}
                            </p>
                          </CardContent>
                        </div>

                        <div className="px-5 pb-5 pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-400 truncate max-w-[180px]">
                            {lesson.videoUrl.startsWith('data:') ? '📹 Video Subido desde Dispositivo' : lesson.videoUrl}
                          </span>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => { if(confirm("¿Borrar lección?")) deleteDocumentNonBlocking(doc(db, 'academy_lessons', lesson.id)) }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DIALOG 1: CREATE MODULE */}
        <Dialog open={isAddingModule} onOpenChange={setIsAddingModule}>
          <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl bg-white dark:bg-slate-950">
            <div className="bg-slate-900 p-8 text-white text-center">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-black uppercase italic tracking-tight">
                  Nuevo <span className="text-primary">Módulo</span>
                </DialogTitle>
              </DialogHeader>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nombre del Módulo</Label>
                <Input value={moduleData.title} onChange={e => setModuleData({...moduleData, title: e.target.value})} placeholder="Ej: Módulo 1 — Fundamentos y Primeros Pasos" className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-white/10 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Descripción</Label>
                <Textarea value={moduleData.description} onChange={e => setModuleData({...moduleData, description: e.target.value})} placeholder="Breve introducción de los temas del módulo..." className="rounded-xl min-h-[90px] bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-white/10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-500" /> Palabra Clave de Acceso (Opcional)
                </Label>
                <Input value={moduleData.accessKey} onChange={e => setModuleData({...moduleData, accessKey: e.target.value})} placeholder="Ej: SYNC2026_VIP" className="h-12 font-mono text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-white/10" />
                <p className="text-[10px] text-slate-400">Si asignas una contraseña, los alumnos deberán ingresarla para desbloquear el módulo.</p>
              </div>
              <Button onClick={handleSaveModule} disabled={isProcessing} className="w-full h-14 bg-slate-900 dark:bg-primary text-white dark:text-slate-950 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl">
                GUARDAR MÓDULO
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG 2: UPLOAD CLASS / VIDEO */}
        <Dialog open={isAddingLesson} onOpenChange={setIsAddingLesson}>
          <DialogContent className="max-w-lg rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl bg-white dark:bg-slate-950">
            <div className="bg-slate-900 p-8 text-white text-center">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-black uppercase italic tracking-tight">
                  Publicar <span className="text-primary">Clase / Video</span>
                </DialogTitle>
              </DialogHeader>
            </div>
            
            <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* Select Module */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Módulo Destino</Label>
                <Select value={lessonData.moduleId} onValueChange={v => setLessonData({...lessonData, moduleId: v})}>
                  <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-white/10 rounded-xl font-bold">
                    <SelectValue placeholder="Elige un Módulo..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {modules?.map(m => <SelectItem key={m.id} value={m.id} className="font-bold">{m.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Título de la Clase</Label>
                <Input value={lessonData.title} onChange={e => setLessonData({...lessonData, title: e.target.value})} placeholder="Ej: Clase 1 — Configuración del Embudos" className="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-white/10" />
              </div>

              {/* VIDEO SOURCE: Direct File Upload from Mobile/PC OR URL */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-white/10">
                <Label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Carga de Video</span>
                  <span className="text-[10px] text-emerald-500 font-mono">📱 Teléfono o PC</span>
                </Label>

                {/* File picker button */}
                <input 
                  type="file" 
                  accept="video/*" 
                  ref={videoInputRef} 
                  onChange={handleVideoFileSelect} 
                  className="hidden" 
                />

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isUploadingVideo}
                    className="flex-1 h-12 rounded-xl border-dashed border-2 border-primary text-primary hover:bg-primary/10 font-bold text-xs gap-2"
                  >
                    {isUploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                    SELECCIONAR VIDEO DESDE TELÉFONO / ARCHIVO
                  </Button>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase">o pega un enlace de video</span>
                  <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
                </div>

                <Input 
                  value={lessonData.videoUrl} 
                  onChange={e => setLessonData({...lessonData, videoUrl: e.target.value})} 
                  placeholder="URL de YouTube, Vimeo, Google Drive o MP4..." 
                  className="h-12 rounded-xl font-mono text-xs bg-white dark:bg-slate-950 border-none ring-1 ring-slate-200 dark:ring-white/10" 
                />

                {lessonData.videoUrl && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Video listo para previsualización
                  </p>
                )}
              </div>

              {/* PASSWORD / PALABRA COMPLICADA */}
              <div className="space-y-2 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-500/20">
                <Label className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-amber-500" /> Palabra Clave de Acceso Complicada (Contraseña de desbloqueo)
                </Label>
                <Input 
                  value={lessonData.accessKey} 
                  onChange={e => setLessonData({...lessonData, accessKey: e.target.value})} 
                  placeholder="Ej: CLAVE_SECRETA_2026" 
                  className="h-12 font-mono text-xs rounded-xl bg-white dark:bg-slate-950 border-none ring-1 ring-amber-300 dark:ring-amber-500/40" 
                />
                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                  Si escribes una clave aquí, el alumno deberá escribir esta palabra clave exacta para ver el video de la clase.
                </p>
              </div>

              {/* Description & Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Duración Estimada</Label>
                  <Input value={lessonData.duration} onChange={e => setLessonData({...lessonData, duration: e.target.value})} placeholder="Ej: 14:30 min" className="h-12 rounded-xl font-mono text-xs bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-white/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">PDF Adjunto (URL)</Label>
                  <Input value={lessonData.pdfUrl} onChange={e => setLessonData({...lessonData, pdfUrl: e.target.value})} placeholder="Enlace Google Drive o PDF..." className="h-12 rounded-xl font-mono text-xs bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-white/10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Notas / Sinopsis de la Clase</Label>
                <Textarea value={lessonData.description} onChange={e => setLessonData({...lessonData, description: e.target.value})} placeholder="Explicación detallada, pasos a seguir, instrucciones..." className="rounded-xl min-h-[90px] bg-slate-50 dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-white/10" />
              </div>

              <Button onClick={handleSaveLesson} disabled={isProcessing || isUploadingVideo} className="w-full h-14 bg-slate-900 dark:bg-primary text-white dark:text-slate-950 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl gap-2">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                PUBLICAR CLASE EN LA ACADEMIA
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG 3: QUIZ EDITOR */}
        <Dialog open={!!isEditingQuiz} onOpenChange={(v) => !v && setIsEditingQuiz(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-0 border-none shadow-3xl bg-white dark:bg-slate-950">
            <div className="bg-primary p-8 text-slate-950 flex justify-between items-center sticky top-0 z-50">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-7 w-7" />
                <DialogTitle className="text-2xl font-headline font-black uppercase italic tracking-tight">Editor de Exámenes</DialogTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsEditingQuiz(null)} className="text-slate-950/60 hover:text-slate-950"><X className="h-6 w-6" /></Button>
            </div>
            <div className="p-8 space-y-8">
              {quizQuestions.map((q, qIdx) => (
                <div key={qIdx} className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-slate-400">Pregunta {qIdx + 1}</span>
                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 h-8 w-8" onClick={() => setQuizQuestions(quizQuestions.filter((_, i) => i !== qIdx))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Enunciado</Label>
                    <Input value={q.text} onChange={e => {const updated = [...quizQuestions]; updated[qIdx].text = e.target.value; setQuizQuestions(updated); }} className="h-12 bg-white dark:bg-slate-950 border-none ring-1 ring-slate-200 dark:ring-white/10 rounded-xl font-bold" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Opciones</Label>
                    <RadioGroup value={q.correctIndex.toString()} onValueChange={v => {const updated = [...quizQuestions]; updated[qIdx].correctIndex = parseInt(v); setQuizQuestions(updated); }}>
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex gap-3 items-center">
                          <RadioGroupItem value={oIdx.toString()} id={`q${qIdx}-o${oIdx}`} className="h-5 w-5" />
                          <Input value={opt} onChange={e => {const updated = [...quizQuestions]; updated[qIdx].options[oIdx] = e.target.value; setQuizQuestions(updated); }} className={cn("flex-1 h-11 bg-white dark:bg-slate-950 rounded-xl border-none ring-1 ring-slate-200 dark:ring-white/10 text-xs font-medium", q.correctIndex === oIdx ? "ring-2 ring-primary" : "")} />
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              ))}
              
              <Button variant="outline" onClick={() => setQuizQuestions([...quizQuestions, { text: '', options: ['', '', ''], correctIndex: 0 }])} className="w-full h-14 rounded-2xl border-dashed border-2 font-bold text-xs uppercase tracking-wider gap-2">
                <Plus className="h-4 w-4" /> AÑADIR PREGUNTA
              </Button>

              <div className="pt-4 border-t">
                <Button className="w-full h-16 rounded-2xl bg-slate-900 dark:bg-primary text-white dark:text-slate-950 font-black text-xs uppercase tracking-widest gap-2 shadow-2xl" onClick={handleSaveQuiz} disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                  GUARDAR EXAMEN
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  )
}
