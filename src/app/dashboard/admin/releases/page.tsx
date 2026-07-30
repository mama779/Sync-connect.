"use client"

import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Smartphone, 
  Loader2, 
  Zap,
  Terminal,
  Cpu,
  History,
  Activity,
  Box,
  ExternalLink,
  Info,
  CheckCircle2,
  Trash2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase'
import { collection, doc } from 'firebase/firestore'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function AdminReleasesPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [isSaving, setIsSaving] = useState(false)

  const releasesQuery = useMemoFirebase(() => collection(db, 'app_releases'), [db]);
  const { data: releases, isLoading } = useCollection(releasesQuery);

  const [formData, setFormData] = useState({
    version: '1.0.0',
    type: 'apk',
    downloadUrl: '',
    flutterSdkVersion: '3.22.0',
    notes: 'Distribución oficial para socios comerciales.'
  })

  const handleSave = async () => {
    if (!formData.version || !formData.downloadUrl || !db) {
      toast({ variant: "destructive", title: "Faltan datos", description: "La versión y la URL son obligatorias." });
      return;
    }

    setIsSaving(true);
    try {
      await addDocumentNonBlocking(collection(db, 'app_releases'), {
        ...formData,
        createdAt: new Date().toISOString(),
        status: 'Stable'
      });

      toast({ title: "Versión Publicada", description: "La App ya está disponible para descarga." });
      setFormData({ ...formData, downloadUrl: '', version: '' });
    } catch (e) {
      toast({ variant: "destructive", title: "Fallo de Sistema" });
    } finally {
      setIsSaving(false);
    }
  }

  const handleDelete = (id: string) => {
    if(confirm("¿Remover este instalador del sistema?") && db) {
      deleteDocumentNonBlocking(doc(db, 'app_releases', id));
      toast({ title: "Recurso removido" });
    }
  }

  return (
    <DashboardShell role="admin">
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Hub de Distribución Nativa</span>
            </div>
            <h1 className="text-4xl font-headline font-black text-slate-900 tracking-tight leading-none uppercase italic">Build <span className="text-primary">Center</span></h1>
            <p className="text-slate-500 font-medium max-w-xl">Gestiona los instaladores oficiales de la aplicación para Windows y Android.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
           <div className="lg:col-span-7 space-y-8">
              <Card className="border-none shadow-2xl rounded-[3rem] bg-slate-950 text-white overflow-hidden relative">
                 <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><Cpu className="h-48 w-48 text-primary" /></div>
                 <CardHeader className="p-10 border-b border-white/5 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                         <Box className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-headline font-black uppercase italic">Nuevo <span className="text-primary">Lanzamiento</span></CardTitle>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Sincronización de Versión</p>
                      </div>
                    </div>
                 </CardHeader>
                 <CardContent className="p-10 space-y-8 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Código de Versión</Label>
                            <Input value={formData.version} onChange={e => setFormData({...formData, version: e.target.value})} className="bg-white/5 border-none ring-1 ring-white/10 h-14 rounded-2xl text-white font-black px-6" placeholder="Ej: 1.0.5" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Tecnología Base</Label>
                            <Input value={formData.flutterSdkVersion} onChange={e => setFormData({...formData, flutterSdkVersion: e.target.value})} className="bg-white/5 border-none ring-1 ring-white/10 h-14 rounded-2xl text-white px-6 font-bold" />
                          </div>
                       </div>
                       <div className="space-y-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Enlace de Descarga</Label>
                            <Input placeholder="https://..." value={formData.downloadUrl} onChange={e => setFormData({...formData, downloadUrl: e.target.value})} className="bg-white/5 border-none ring-1 ring-white/10 h-14 rounded-2xl text-white font-bold px-6" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Plataforma Destino</Label>
                            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full h-14 rounded-2xl bg-white/5 border-none ring-1 ring-white/10 px-6 font-black text-sm text-white">
                              <option value="apk" className="bg-slate-900">Android Package (APK)</option>
                              <option value="exe" className="bg-slate-900">Windows Executable (EXE)</option>
                            </select>
                          </div>
                       </div>
                       <div className="md:col-span-2 pt-4">
                          <Button onClick={handleSave} disabled={isSaving} className="w-full h-18 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest gap-2 shadow-2xl shadow-primary/20">
                             {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Zap className="h-5 w-5 fill-current" />}
                             DESPLEGAR BINARIO AL SISTEMA
                          </Button>
                       </div>
                    </div>
                 </CardContent>
              </Card>

              <Alert className="bg-blue-50 border-blue-100 rounded-[2.5rem] p-8">
                 <Info className="h-6 w-6 text-blue-600" />
                 <AlertTitle className="text-blue-900 font-black text-xs uppercase tracking-widest mb-2">Protocolo de Carga</AlertTitle>
                 <AlertDescription className="text-blue-700 text-sm font-medium leading-relaxed">
                   Asegúrate de que el enlace sea de acceso público para que los socios puedan descargar la aplicación sin restricciones de autenticación.
                 </AlertDescription>
              </Alert>
           </div>

           <div className="lg:col-span-5 space-y-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3 px-2">
                <History className="h-4 w-4" /> Historial de Versiones
              </h3>

              {isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary opacity-20" /></div>
              ) : !releases || releases.length === 0 ? (
                <div className="text-center py-32 bg-white/50 rounded-[4rem] border-2 border-dashed border-slate-200">
                   <Box className="h-16 w-16 mx-auto mb-4 text-slate-200" />
                   <p className="text-[10px] font-black uppercase text-slate-400">Sin lanzamientos registrados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {releases.map((rel) => (
                    <Card key={rel.id} className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden ring-1 ring-slate-100">
                      <div className="p-8 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner", rel.type === 'apk' ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600")}>
                            <Smartphone className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 uppercase text-xs">v{rel.version}</h4>
                            <p className="text-[8px] font-black text-slate-400 uppercase">TECNOLOGÍA: {rel.flutterSdkVersion || 'STABLE'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                           <Button asChild variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-100"><a href={rel.downloadUrl} target="_blank"><ExternalLink className="h-4 w-4" /></a></Button>
                           <Button variant="ghost" size="icon" className="h-10 w-10 text-red-200 hover:text-red-600 rounded-xl" onClick={() => handleDelete(rel.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
           </div>
        </div>
      </div>
    </DashboardShell>
  )
}
