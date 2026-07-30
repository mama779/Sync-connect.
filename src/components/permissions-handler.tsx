
"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Camera, Bell, ShieldCheck, X, Zap, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function PermissionsHandler() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Verificar si ya tenemos permisos de forma asíncrona
    const checkPermissions = async () => {
      try {
        if ('Notification' in window) {
          const permission = Notification.permission;
          if (permission === 'default') {
            setShowPrompt(true);
          }
        }
      } catch (e) {
        console.warn("Permissions check failed:", e);
      }
    }
    
    const timeout = setTimeout(checkPermissions, 3000)
    return () => clearTimeout(timeout)
  }, [])

  const requestAllPermissions = async () => {
    setIsProcessing(true);
    try {
      // 1. Solicitar Notificaciones
      let notifyPerm = 'denied';
      if ('Notification' in window) {
        notifyPerm = await Notification.requestPermission();
      }
      
      // 2. Probar Cámara (Esto dispara el prompt del navegador)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(track => track.stop()); // Liberar de inmediato
      } catch (err) {
        console.warn("Media permissions denied or no hardware found");
      }

      if (notifyPerm === 'granted') {
        toast({ 
          title: "Infraestructura Sincronizada ✓", 
          description: "Notificaciones y Cámara habilitadas para Sync Meet." 
        });
      }
      
      setShowPrompt(false);
    } catch (err) {
      console.error("Permisos maestros fallidos:", err);
      toast({ 
        variant: "destructive", 
        title: "Acceso Limitado", 
        description: "Algunas funciones de videollamada podrían no estar disponibles." 
      });
      setShowPrompt(false);
    } finally {
      setIsProcessing(false);
    }
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-700">
      <Card className="max-w-md w-full border-none shadow-[0_0_100px_rgba(255,153,0,0.2)] rounded-[3.5rem] bg-white overflow-hidden p-2">
        <div className="bg-slate-900 rounded-[3rem] p-10 text-center space-y-8">
          <div className="relative mx-auto h-24 w-24">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
            <div className="relative h-24 w-24 bg-primary text-slate-950 rounded-[2rem] flex items-center justify-center shadow-2xl rotate-6 border-4 border-slate-800">
              <ShieldCheck className="h-12 w-12" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-2xl md:text-3xl font-headline font-black text-white uppercase italic tracking-tighter leading-none">Activar <span className="text-primary">Protocolos</span></h3>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.3em] leading-relaxed">Habilita cámara y alertas para reuniones de estrategia Platinum.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-white/5 rounded-3xl border border-white/5 flex flex-col items-center gap-3 group hover:bg-white/10 transition-all">
               <Camera className="h-7 w-7 text-primary group-hover:scale-110 transition-transform" />
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cámara Live</span>
            </div>
            <div className="p-5 bg-white/5 rounded-3xl border border-white/5 flex flex-col items-center gap-3 group hover:bg-white/10 transition-all">
               <Bell className="h-7 w-7 text-primary group-hover:scale-110 transition-transform" />
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Alertas Push</span>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <Button 
              onClick={requestAllPermissions} 
              disabled={isProcessing}
              className="w-full h-20 rounded-[2rem] bg-white text-slate-950 hover:bg-primary transition-all font-black text-sm uppercase tracking-widest shadow-3xl group active:scale-95"
            >
               {isProcessing ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                 <><Zap className="mr-3 h-5 w-5 fill-current group-hover:scale-125 transition-transform" /> DAR ACCESO MAESTRO</>
               )}
            </Button>
            <button onClick={() => setShowPrompt(false)} className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] hover:text-white transition-colors">Configurar después</button>
          </div>
        </div>
      </Card>
    </div>
  )
}
