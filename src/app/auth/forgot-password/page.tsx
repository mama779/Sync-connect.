"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Loader2, MailCheck, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { adminGenerateResetLink } from '@/lib/auth-actions'
import { sendPasswordResetEmailCustom } from '@/lib/email'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/firebase'
import { sendPasswordResetEmail } from 'firebase/auth'

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const auth = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
        toast({ variant: "destructive", title: "Correo requerido" });
        return;
    }

    setLoading(true);
    try {
      // 1. Intentar generar enlace mediante Admin SDK para obtener el enlace premium INTERNO
      const result = await adminGenerateResetLink(cleanEmail);
      
      if (!result.success) {
        // FALLBACK: Si no hay permisos administrativos, usamos el método estándar
        console.warn("Usando fallback de recuperación estándar:", result.error);
        await sendPasswordResetEmail(auth, cleanEmail);
        toast({ title: "🔑 Enlace Enviado", description: "Revisa tu Gmail. Hemos enviado las instrucciones de acceso." });
        setSuccess(true);
        return;
      }

      // 2. Enviar el correo con ENLACE premium que apunta a nuestra propia página
      const emailRes = await sendPasswordResetEmailCustom({
        to: cleanEmail,
        link: result.link as string
      });

      if (emailRes.success) {
        toast({ title: "🛡️ Enlace Enviado", description: "Revisa tu Gmail y haz clic en el botón de recuperación." });
        setSuccess(true);
      } else {
        // Segundo fallback por error de Nodemailer
        await sendPasswordResetEmail(auth, cleanEmail);
        toast({ title: "🔑 Enlace Enviado", description: "Se ha enviado un enlace de recuperación estándar." });
        setSuccess(true);
      }
    } catch (error: any) {
      console.error("Forgot Password Error:", error);
      toast({ variant: "destructive", title: "Error de Conexión", description: "Asegúrate de estar conectado a internet e intenta de nuevo." });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#131921] flex flex-col justify-center items-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-none rounded-[4rem] overflow-hidden bg-white p-2">
          <div className="bg-slate-50/50 rounded-[3.5rem] p-10 md:p-14 text-center space-y-8">
            <div className="relative mx-auto h-24 w-24">
              <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse" />
              <div className="relative h-24 w-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center shadow-2xl animate-bounce">
                <MailCheck className="h-12 w-12" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 uppercase italic">¡Revisa tu Gmail!</h2>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                Hemos enviado un <b>Enlace de Acceso</b> a tu correo. Haz clic en el botón del mensaje para restaurar tu contraseña dentro de nuestra plataforma.
              </p>
            </div>
            <div className="pt-4 flex flex-col gap-3">
              <Button asChild className="w-full h-18 rounded-2xl bg-[#131921] text-white font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] transition-transform">
                <Link href="/auth/login">VOLVER AL LOGIN</Link>
              </Button>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center justify-center gap-2">
                <ShieldCheck className="h-3 w-3 text-green-500" /> Protección Sync Active
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white md:bg-[#EAEDED] flex flex-col items-center pt-8 pb-12 px-4">
      <Link href="/auth/login" className="mb-6 flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold uppercase text-[10px] tracking-widest group">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        <span>Volver al login</span>
      </Link>

      <Card className="w-full max-w-[350px] border border-[#ddd] shadow-none md:shadow-sm rounded-[4px] bg-white p-6 md:p-8">
        <h1 className="text-[28px] font-normal text-[#111] mb-5 leading-tight">Asistencia</h1>
        
        <CardContent className="p-0 space-y-4">
          <p className="text-[13px] text-[#111] leading-relaxed">
            Escribe tu correo asociado a tu cuenta de Sync. Recibirás un <b>Enlace Premium</b> para validar tu identidad y cambiar tu clave de forma interna.
          </p>

          <form onSubmit={handleResetRequest} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[13px] font-bold text-[#111]">Dirección de e-mail</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="amazon-input h-10" 
              />
            </div>
            <Button type="submit" className="amazon-btn-primary w-full h-10 flex items-center justify-center gap-2" disabled={loading}>
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Enviar Enlace"}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <footer className="mt-auto pt-10 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
        Seguridad de Acceso • Sync Connect Nicaragua
      </footer>
    </div>
  )
}