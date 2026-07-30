"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ShieldAlert, ArrowLeft, Loader2, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/firebase'
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth'
import { sendEmail } from '@/lib/email'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function AdminLoginPage() {
  const { toast } = useToast()
  const auth = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('affiliatesync0@gmail.com')
  const [password, setPassword] = useState('')
  const [keepLoggedIn, setKeepLoggedIn] = useState(true)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetail(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) return;

    const ADMIN_EMAIL = 'affiliatesync0@gmail.com';
    if (cleanEmail !== ADMIN_EMAIL) {
      toast({ variant: "destructive", title: "Acceso Denegado", description: "Este formulario es exclusivo para administradores autorizados." });
      return;
    }

    setLoading(true);
    try {
      // Configurar persistencia administrativa
      await setPersistence(auth, keepLoggedIn ? browserLocalPersistence : browserSessionPersistence);

      await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      
      sendEmail({
        to: cleanEmail,
        subject: '🛡️ Alerta: Acceso Maestro Detectado',
        text: `Se ha iniciado sesión correctamente en el Panel Administrativo de Sync Connect.\n\nFecha y Hora: ${new Date().toLocaleString()}\n\nSi no reconoces este acceso, cambia la contraseña administrativa de inmediato.`
      }).catch(err => console.error("Error enviando alerta admin:", err));

      toast({ title: "Acceso Maestro", description: "Iniciando centro de control..." });
      router.push('/dashboard/admin');
    } catch (error: any) {
      console.error("Admin Login Error:", error.code);
      let msg = "Credenciales administrativas inválidas.";
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        msg = "Usuario no encontrado o contraseña incorrecta.";
        setErrorDetail("Asegúrate de que el usuario 'affiliatesync0@gmail.com' exista en la Consola de Firebase. Si acabas de cambiar la contraseña en la consola, espera 30 segundos e intenta de nuevo.");
      } else if (error.code === 'auth/too-many-requests') {
        msg = "Cuenta bloqueada temporalmente.";
        setErrorDetail("Demasiados intentos fallidos. Por favor, espera unos minutos antes de intentar de nuevo.");
      }

      toast({ variant: "destructive", title: "Error", description: msg });
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <Link href="/" className="mb-10 flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold uppercase text-[10px] tracking-widest group">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        <span>Salir de Administración</span>
      </Link>

      <Card className="w-full max-w-md shadow-2xl border-none rounded-[3.5rem] overflow-hidden bg-white p-2">
        <div className="bg-slate-50/50 rounded-[3rem] p-10 md:p-14 text-center">
          <CardHeader className="p-0 mb-12 space-y-4">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-[2.2rem] bg-slate-900 flex items-center justify-center text-primary shadow-2xl rotate-3">
                <ShieldAlert className="h-10 w-10" />
              </div>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-headline font-black text-slate-900 tracking-tight">Sync Admin</CardTitle>
              <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Panel de Control Maestro</CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {errorDetail && (
              <Alert variant="destructive" className="mb-6 rounded-2xl bg-red-50 border-red-100 text-left">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-[10px] font-black uppercase">Nota Técnica</AlertTitle>
                <AlertDescription className="text-[11px] font-medium leading-relaxed">
                  {errorDetail}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-5 text-left">
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500 ml-1">Email Administrativo</Label>
                <Input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="h-14 rounded-2xl bg-white border-none ring-1 ring-slate-200 focus:ring-4 focus:ring-primary/10 transition-all font-bold px-6" 
                  placeholder="admin@sync.com" 
                />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-500 ml-1">Contraseña Maestro</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    className="h-14 rounded-2xl bg-white border-none ring-1 ring-slate-200 focus:ring-4 focus:ring-primary/10 transition-all font-bold px-6" 
                    placeholder="••••••••" 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 px-1">
                <Checkbox 
                  id="keepLoggedInAdmin" 
                  checked={keepLoggedIn} 
                  onCheckedChange={(checked) => setKeepLoggedIn(checked as boolean)}
                  className="border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                />
                <label 
                  htmlFor="keepLoggedInAdmin" 
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none"
                >
                  Mantener sesión maestra abierta
                </label>
              </div>

              <Button 
                type="submit"
                className="w-full h-18 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95" 
                disabled={loading}
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                  <><LogIn className="h-6 w-6" /> INICIAR SESIÓN ADMIN</>
                )}
              </Button>
            </form>
            
            <p className="mt-10 text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
              Usa exclusivamente la cuenta autorizada.<br/> El sistema registra cada intento de acceso.
            </p>
          </CardContent>
        </div>
      </Card>
    </div>
  )
}
