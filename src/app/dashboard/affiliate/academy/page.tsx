"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { 
  PlayCircle, 
  Loader2, 
  GraduationCap, 
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Trophy,
  Award,
  Lock,
  Star,
  Zap,
  FileText,
  Layers,
  HelpCircle,
  ListChecks,
  Video,
  ExternalLink,
  MessageSquare,
  Paperclip,
  Send,
  Sparkles,
  Users,
  Eye,
  Info,
  Clock,
  Tv,
  Key,
  Unlock,
  Maximize2
} from 'lucide-react'
import { useFirestore, useCollection, useMemoFirebase, useUser, setDocumentNonBlocking, useDoc } from '@/firebase'
import { collection, doc, query, where, getDocs, addDoc } from 'firebase/firestore'
import { cn, getGoogleDriveDirectLink, getEmbedUrl, getVideoType, formatVideoTime } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function AffiliateAcademyPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  
  const modulesQuery = useMemoFirebase(() => collection(db, 'academy_modules'), [db]);
  const { data: modules, isLoading: modulesLoading } = useCollection(modulesQuery);

  const lessonsQuery = useMemoFirebase(() => collection(db, 'academy_lessons'), [db]);
  const { data: lessons, isLoading: lessonsLoading } = useCollection(lessonsQuery);

  const affiliateRef = useMemoFirebase(() => (user ? doc(db, 'affiliates', user.uid) : null), [db, user]);
  const { data: profile } = useDoc(affiliateRef);

  const progressRef = useMemoFirebase(() => (user ? doc(db, 'affiliate_progress', user.uid) : null), [db, user]);
  const { data: progress } = useDoc(progressRef);

  const activeLiveRef = useMemoFirebase(() => (db ? doc(db, 'site_config', 'active_live') : null), [db]);
  const { data: activeLive } = useDoc(activeLiveRef);

  const [activeIndex, setActiveIndex] = useState(0)
  const [showQuiz, setShowQuiz] = useState<string | null>(null)
  const [currentQuizQuestions, setCurrentQuizQuestions] = useState<any[]>([])
  
  const [activeTab, setActiveTab] = useState<'content' | 'comments' | 'materials'>('content')
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [playbackRate, setPlaybackRate] = useState<number>(1)

  // Password Unlocking State for "Palabras complicadas"
  const [unlockedLessons, setUnlockedLessons] = useState<string[]>([])
  const [enteredKey, setEnteredKey] = useState('')
  const [keyError, setKeyError] = useState(false)

  const sortedModules = modules ? [...modules].sort((a, b) => (a.order || 0) - (b.order || 0)) : []
  const allLessons = lessons ? [...lessons].sort((a, b) => {
    const modA = sortedModules.find(m => m.id === a.moduleId)?.order || 0;
    const modB = sortedModules.find(m => m.id === b.moduleId)?.order || 0;
    if (modA !== modB) return modA - modB;
    return (a.order || 0) - (b.order || 0);
  }) : []

  const currentLesson = allLessons[activeIndex]
  const currentModule = sortedModules.find(m => m.id === currentLesson?.moduleId)

  const completedIds = progress?.completedLessonIds || []
  const passedModuleIds = progress?.passedModuleIds || []

  const isCompleted = (id: string) => completedIds.includes(id)
  const isModulePassed = (moduleId: string) => passedModuleIds.includes(moduleId)

  // Check if current lesson is locked by access key
  const requiredKey = currentLesson?.accessKey || currentModule?.accessKey
  const isLessonUnlocked = !requiredKey || unlockedLessons.includes(currentLesson?.id) || unlockedLessons.includes(currentModule?.id)

  const handleUnlockWithKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requiredKey) return;

    if (enteredKey.trim().toLowerCase() === requiredKey.trim().toLowerCase()) {
      const newUnlocked = [...unlockedLessons, currentLesson.id];
      if (currentModule) newUnlocked.push(currentModule.id);
      setUnlockedLessons(newUnlocked);
      setEnteredKey('');
      setKeyError(false);
      toast({
        title: "¡Clase Desbloqueada! 🔓",
        description: "Acceso concedido. Disfruta de tu clase."
      });
    } else {
      setKeyError(true);
      toast({
        variant: "destructive",
        title: "Palabra clave incorrecta",
        description: "La palabra complicada ingresada no coincide. Consulta con tu instructor."
      });
    }
  };

  // Real-time comments for the current lesson
  const commentsQuery = useMemoFirebase(() => {
    if (!db || !user || !currentLesson) return null;
    return query(collection(db, 'academy_comments'), where('lessonId', '==', currentLesson.id));
  }, [db, user, currentLesson]);
  const { data: commentsRaw } = useCollection(commentsQuery);
  const comments = commentsRaw ? [...commentsRaw].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

  const toggleComplete = async (lessonId: string) => {
    if (!user || !progressRef) return;
    
    let newIds = [...completedIds];
    if (!newIds.includes(lessonId)) {
      newIds.push(lessonId);
      toast({ title: "Clase Finalizada ✓", description: "Avanzando en tu plan de formación." });
      setDocumentNonBlocking(progressRef, {
        uid: user.uid,
        completedLessonIds: newIds,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Automatically advance to next lesson if available
      if (activeIndex < allLessons.length - 1) {
        setTimeout(() => setActiveIndex(activeIndex + 1), 600);
      }
    } else {
      newIds = newIds.filter(id => id !== lessonId);
      toast({ title: "Clase desmarcada", description: "Marcada como no concluida." });
      setDocumentNonBlocking(progressRef, {
        uid: user.uid,
        completedLessonIds: newIds,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user || !currentLesson || !db) return;
    setSubmittingComment(true);
    try {
      await addDoc(collection(db, 'academy_comments'), {
        lessonId: currentLesson.id,
        userId: user.uid,
        userName: `${profile?.firstName || 'Alumno'} ${profile?.lastName || 'Sync'}`,
        userPhoto: profile?.photoUrl || '',
        text: commentText.trim(),
        createdAt: new Date().toISOString()
      });
      setCommentText('');
      toast({ title: "Pregunta Publicada", description: "El instructor o tus compañeros responderán pronto." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error de envío", description: err.message });
    } finally {
      setSubmittingComment(false);
    }
  };

  const lessonPercent = allLessons.length > 0 ? (completedIds.length / allLessons.length) * 100 : 0;

  const defaultMockComments = [
    {
      id: "mock1",
      userName: "Alejandro Rivas",
      text: "Excelente explicación en esta clase. Me quedó muy claro cómo implementar la estrategia paso a paso.",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: "mock2",
      userName: "Camila Torres",
      text: "¿Tienen la plantilla en PDF descargable? Muchas gracias.",
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    }
  ];

  if (modulesLoading || lessonsLoading) {
    return (
      <DashboardShell role="affiliate">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Cargando Plataforma de Clases Hotmart Style...</p>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell role="affiliate">
      <div className="max-w-7xl mx-auto space-y-8 pb-20 px-2 md:px-6">
        
        {/* HOTMART STYLE HEADER BAR */}
        <div className="bg-slate-900 text-white p-6 md:p-8 rounded-[2rem] shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary text-slate-950 rounded-2xl flex items-center justify-center font-black shrink-0 shadow-lg">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-headline font-black uppercase italic tracking-tight leading-none">Sync Academy & Cursos</h1>
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-1">Plataforma de Clases en Video</p>
              </div>
           </div>

           <div className="flex items-center gap-6 w-full md:w-auto">
             <div className="w-full md:w-64 space-y-2 shrink-0">
                <div className="flex justify-between text-xs font-bold">
                   <span className="text-slate-400 uppercase text-[9px] tracking-wider">Progreso del Curso</span>
                   <span className="text-primary font-mono">{Math.round(lessonPercent)}%</span>
                </div>
                <Progress value={lessonPercent} className="h-2 bg-white/10" />
             </div>

             {lessonPercent >= 100 && (
               <Badge className="bg-emerald-500 text-slate-950 font-black px-3 py-1.5 text-xs uppercase gap-1 shadow-lg">
                 <Trophy className="h-4 w-4" /> ¡Curso Completado!
               </Badge>
             )}
           </div>
        </div>

        {/* MAIN LAYOUT: PLAYER + SIDEBAR CURRICULUM */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: MAIN VIDEO PLAYER & HOTMART TABS */}
          <div className="lg:col-span-8 space-y-6">
            
            {currentLesson ? (
              <div className="space-y-6">
                
                {/* VIDEO CONTAINER / LOCKED SHIELD */}
                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-slate-950 aspect-video relative ring-1 ring-white/10 p-1 flex items-center justify-center">
                   
                   {!isLessonUnlocked ? (
                     /* LOCKED SCREEN FOR PALABRA COMPLICADA / PASSWORD */
                     <div className="w-full h-full rounded-[2rem] bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
                       <div className="h-16 w-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/30 animate-bounce">
                         <Lock className="h-8 w-8" />
                       </div>

                       <div className="space-y-1 max-w-md">
                         <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] uppercase font-mono mb-2">
                           Clase Protegida
                         </Badge>
                         <h3 className="text-2xl font-black text-white uppercase italic">Ingresa la Palabra Clave de Acceso</h3>
                         <p className="text-xs text-slate-400 font-medium">
                           Esta lección requiere la contraseña o palabra clave entregada por tu instructor para ser desbloqueada.
                         </p>
                       </div>

                       <form onSubmit={handleUnlockWithKey} className="w-full max-w-sm space-y-3">
                         <Input 
                           type="password"
                           value={enteredKey}
                           onChange={e => { setEnteredKey(e.target.value); setKeyError(false); }}
                           placeholder="Escribe la palabra clave..."
                           className={cn(
                             "h-12 text-center font-mono text-sm rounded-xl bg-slate-900 text-white border-none ring-1",
                             keyError ? "ring-2 ring-red-500" : "ring-white/20 focus:ring-primary"
                           )}
                         />
                         <Button type="submit" className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl shadow-lg gap-2">
                           <Unlock className="h-4 w-4" /> DESBLOQUEAR CLASE
                         </Button>
                       </form>
                     </div>
                   ) : currentLesson.videoUrl.startsWith('data:video') || currentLesson.videoUrl.endsWith('.mp4') || currentLesson.videoUrl.endsWith('.webm') ? (
                     /* NATIVE HTML5 VIDEO PLAYER FOR DIRECT UPLOADS */
                     <div className="relative w-full h-full flex flex-col justify-between group">
                       <video 
                         src={currentLesson.videoUrl} 
                         controls 
                         controlsList="nodownload"
                         className="w-full h-full rounded-[2rem] object-contain bg-black"
                       />
                     </div>
                   ) : (
                     /* EMBEDDED PLAYER FOR YOUTUBE / VIMEO / DRIVE */
                     <iframe 
                       src={getEmbedUrl(currentLesson.videoUrl)} 
                       className="w-full h-full border-none rounded-[2rem]"
                       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                       allowFullScreen
                     />
                   )}
                </Card>

                {/* LESSON TITLE & ACTION BAR */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                   <div className="space-y-1">
                     <div className="flex items-center gap-2">
                       <span className="text-[10px] font-mono font-bold text-primary uppercase">Clase {currentLesson.order}</span>
                       {currentLesson.duration && (
                         <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                           <Clock className="h-3 w-3" /> {currentLesson.duration}
                         </span>
                       )}
                     </div>
                     <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic leading-tight">
                       {currentLesson.title}
                     </h2>
                   </div>

                   <Button 
                    onClick={() => toggleComplete(currentLesson.id)}
                    className={cn(
                      "h-12 px-8 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 shrink-0 gap-2",
                      isCompleted(currentLesson.id) 
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                        : "bg-slate-900 dark:bg-primary text-white dark:text-slate-950 hover:bg-slate-800"
                    )}
                   >
                     <CheckCircle2 className="h-4 w-4" />
                     {isCompleted(currentLesson.id) ? "CLASE CONCLUIDA ✓" : "MARCAR COMO CONCLUIDA"}
                   </Button>
                </div>

                {/* HOTMART STYLE TABS */}
                <div className="space-y-6">
                  <div className="flex border-b border-slate-200 dark:border-white/10 pb-1 gap-2">
                    {[
                      { id: 'content', label: 'Sinopsis & Notas', icon: FileText },
                      { id: 'comments', label: 'Dudas & Comentarios', icon: MessageSquare },
                      { id: 'materials', label: 'Materiales & Archivos', icon: Paperclip }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                          "px-5 py-3 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2",
                          activeTab === tab.id 
                            ? "bg-slate-900 text-white dark:bg-primary dark:text-slate-950" 
                            : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="bg-white dark:bg-slate-950 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                    {activeTab === 'content' && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                          <Info className="h-4 w-4 text-primary" /> Explicación de la Clase
                        </h4>
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">
                          {currentLesson.description || 'No hay notas adicionales cargadas para esta lección por el instructor.'}
                        </p>
                      </div>
                    )}

                    {activeTab === 'comments' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary" /> Preguntas sobre esta clase
                          </h4>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-full text-slate-600 dark:text-slate-400">
                            {comments.length} Comentarios
                          </span>
                        </div>

                        {/* Comment Input */}
                        <form onSubmit={handleAddComment} className="flex gap-4">
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Escribe tu duda o pregunta sobre esta clase..."
                            className="flex-1 min-h-[80px] p-4 text-xs font-bold rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <Button
                            type="submit"
                            disabled={submittingComment || !commentText.trim()}
                            className="h-auto px-6 rounded-2xl bg-slate-900 dark:bg-primary text-white dark:text-slate-950 font-bold text-xs uppercase gap-2"
                          >
                            {submittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            PUBLICAR
                          </Button>
                        </form>

                        {/* List */}
                        <div className="space-y-3 pt-4">
                          {(comments.length === 0 ? defaultMockComments : comments).map((c) => (
                            <div key={c.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">{c.userName}</span>
                                <span className="text-[9px] font-mono text-slate-400">Hace un momento</span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{c.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'materials' && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-primary" /> Recursos y PDF Adjuntos
                        </h4>
                        
                        {currentLesson.pdfUrl ? (
                          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border">
                            <div className="flex items-center gap-3">
                              <FileText className="h-6 w-6 text-red-500" />
                              <div>
                                <span className="text-xs font-bold block text-slate-900 dark:text-white">Guía en PDF</span>
                                <span className="text-[10px] text-slate-400">Material de apoyo descargable</span>
                              </div>
                            </div>
                            <Button asChild size="sm" variant="outline" className="rounded-xl font-bold text-xs uppercase">
                              <a href={getGoogleDriveDirectLink(currentLesson.pdfUrl)} target="_blank" rel="noreferrer">
                                DESCARGAR PDF
                              </a>
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center py-8 border border-dashed rounded-2xl text-slate-400">
                            <Paperclip className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-xs font-bold uppercase">Sin archivos adjuntos para esta clase</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-40 bg-white dark:bg-slate-950 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-sm">
                <Video className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">No hay clases disponibles en este momento</p>
              </div>
            )}
          </div>

          {/* RIGHT: HOTMART CURRICULUM ACCORDION (TEMARIO DE CLASES) */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white dark:bg-slate-950 overflow-hidden border border-slate-200 dark:border-white/5">
              <CardHeader className="bg-slate-900 text-white p-6">
                <CardTitle className="text-lg font-headline font-black uppercase italic tracking-wider flex items-center justify-between">
                  <span>Temario del Curso</span>
                  <Badge variant="outline" className="border-white/20 text-white text-xs font-mono">
                    {allLessons.length} Clases
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                <Accordion type="single" collapsible defaultValue={currentModule?.id} className="w-full space-y-3">
                  {sortedModules.map((mod) => {
                    const modLessons = allLessons.filter(l => l.moduleId === mod.id);
                    return (
                      <AccordionItem key={mod.id} value={mod.id} className="border border-slate-100 dark:border-white/5 rounded-2xl px-4 overflow-hidden">
                        <AccordionTrigger className="font-bold text-xs hover:no-underline py-4">
                          <div className="flex items-center gap-3 text-left">
                            <span className="h-7 w-7 rounded-lg bg-slate-900 text-primary flex items-center justify-center font-black text-xs shrink-0">
                              {mod.order || 1}
                            </span>
                            <div>
                              <span className="block text-slate-900 dark:text-white font-black uppercase italic text-xs">{mod.title}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-normal">{modLessons.length} Lecciones</span>
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="space-y-2 pb-4 pt-1">
                          {modLessons.map((lesson) => {
                            const globalIdx = allLessons.findIndex(l => l.id === lesson.id);
                            const isCurrent = globalIdx === activeIndex;
                            const isDone = isCompleted(lesson.id);
                            const isLocked = (lesson.accessKey || mod.accessKey) && !unlockedLessons.includes(lesson.id);

                            return (
                              <button
                                key={lesson.id}
                                onClick={() => setActiveIndex(globalIdx)}
                                className={cn(
                                  "w-full text-left p-3 rounded-xl text-xs font-medium transition-all flex items-center justify-between gap-3 border",
                                  isCurrent 
                                    ? "bg-slate-900 text-white border-slate-900 dark:bg-primary dark:text-slate-950 font-bold shadow-md" 
                                    : "bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border-transparent"
                                )}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  {isDone ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                  ) : isLocked ? (
                                    <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                                  ) : (
                                    <PlayCircle className={cn("h-4 w-4 shrink-0", isCurrent ? "text-primary dark:text-slate-950" : "text-slate-400")} />
                                  )}
                                  <span className="truncate">{lesson.title}</span>
                                </div>

                                {lesson.duration && (
                                  <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                    {lesson.duration}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </div>

        </div>

      </div>
    </DashboardShell>
  )
}
