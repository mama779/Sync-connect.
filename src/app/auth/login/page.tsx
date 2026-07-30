"use client"

import { useState, useEffect, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { 
  Loader2, 
  Triangle,
  ChevronRight,
  AlertCircle,
  Globe,
  ChevronLeft
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth, useFirestore, useUser } from '@/firebase'
import { 
  setPersistence, 
  browserLocalPersistence, 
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { SyncConnectLogo } from '@/components/SyncConnectLogo'

const ADMIN_EMAIL = 'affiliatesync0@gmail.com';

function LoginPageContent() {
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { user, isUserLoading } = useUser()
  
  const [loading, setLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [domainError, setDomainError] = useState<{
    show: boolean;
    domain: string;
    projectId: string;
  } | null>(null)

  useEffect(() => {
    if (user && !isUserLoading) {
      setIsRedirecting(true);
      checkUserRole(user.uid, user.email);
    }
  }, [user, isUserLoading]);

  const checkUserRole = async (uid: string, userEmail: string | null) => {
    const cleanEmail = userEmail?.toLowerCase().trim() || '';

    let isUserAdmin = false;

    // Hardcoded fallback for safety so they are never locked out:
    if (cleanEmail === ADMIN_EMAIL || cleanEmail === 'urielroques604@gmail.com' || cleanEmail === 'roquescarlos143@gmail.com') {
      isUserAdmin = true;
    }

    try {
      const adminSettingsSnap = await getDoc(doc(db, 'site_config', 'admin_settings'));
      if (adminSettingsSnap.exists()) {
        const adminData = adminSettingsSnap.data();
        const emails: string[] = adminData.emails || [];
        
        if (cleanEmail && emails.some(e => e.toLowerCase().trim() === cleanEmail)) {
          isUserAdmin = true;
        }
      }
    } catch (e) {
      console.warn("Modo offline o cuota de lectura en admin_settings:", e);
    }

    if (isUserAdmin) {
      router.replace('/dashboard/admin');
      return;
    }

    try {
      const affSnap = await getDoc(doc(db, 'affiliates', uid));
      if (affSnap.exists()) {
        router.replace('/dashboard/affiliate');
        return;
      }

      const buyerSnap = await getDoc(doc(db, 'buyers', uid));
      if (buyerSnap.exists()) {
        router.replace('/dashboard/buyer');
        return;
      }

      router.replace('/auth/register/role');
    } catch (error: any) {
      console.error("Error al verificar el rol de usuario:", error);
      setIsRedirecting(false);
      setLoading(false);
      
      let errorText = "Error al conectar con la base de datos de usuarios.";
      if (error?.code === 'resource-exhausted' || error?.message?.includes('resource-exhausted') || error?.message?.includes('Quota')) {
        errorText = "Límite de cuota diaria de escritura/lectura excedido en la consola de Firebase Firestore para hoy.";
        toast({
          title: "Cuota de Base de Datos Excedida",
          description: "La base de datos Firebase ha alcanzado sus límites de uso diario gratuitos. Por favor, intente de nuevo mañana o configure la facturación.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error de base de datos",
          description: errorText,
          variant: "destructive"
        });
      }
      setErrorMsg(errorText);
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth || loading) return;
    setErrorMsg(null);
    setLoading(true);
    setDomainError(null);
    
    const provider = new GoogleAuthProvider();
    try {
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, provider);
      if (result?.user) {
        setIsRedirecting(true);
        toast({
          title: "Acceso autorizado",
          description: "Estableciendo conexión segura con tu cuenta de Google...",
        });
        await checkUserRole(result.user.uid, result.user.email);
      }
    } catch (error: any) {
      setLoading(false);
      
      const isPopupClosed = error?.code === 'auth/popup-closed-by-user' || 
                            error?.code === 'auth/cancelled-popup-request' ||
                            error?.message?.includes('auth/popup-closed-by-user') ||
                            error?.message?.includes('popup-closed-by-user') ||
                            error?.message?.includes('cancelled-popup-request') ||
                            error?.message?.includes('Pending promise was never set');
                             
      if (isPopupClosed) {
        toast({
          title: "Inicio de sesión cancelado",
          description: "Se canceló o cerró la solicitud de autenticación.",
        });
        return;
      }

      const isPopupBlocked = error?.code === 'auth/popup-blocked' || 
                             error?.message?.includes('popup-blocked') ||
                             error?.message?.includes('popup blocked');

      if (isPopupBlocked) {
        toast({
          title: "Ventana emergente bloqueada",
          description: "El navegador bloqueó la ventana de inicio de sesión. Por favor, permite las ventanas emergentes o inicia sesión en una nueva pestaña.",
          variant: "destructive"
        });
        return;
      }

      console.error("Error de login con Google:", error);

      const isDomainError = error?.code === 'auth/unauthorized-domain' || 
                           error?.message?.includes('unauthorized-domain') ||
                           error?.message?.includes('auth/unauthorized-domain');
      if (isDomainError) {
        setDomainError({
          show: true,
          domain: typeof window !== 'undefined' ? window.location.hostname : 'ais-dev-cxra4jpdiazkigux5gxcbj-801374469814.us-east1.run.app',
          projectId: 'gen-lang-client-0673094537'
        });
        setErrorMsg("Este dominio de vista previa de AI Studio no está autorizado en tu proyecto de Firebase.");
      } else {
        setErrorMsg("No se pudo completar la autenticación con Google.");
      }
      toast({
        title: "Error de autenticación",
        description: isDomainError 
          ? "Dominio no autorizado en Firebase"
          : "Intente nuevamente o verifique sus credenciales.",
        variant: "destructive"
      });
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !auth) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      setIsRedirecting(true);
      toast({
        title: "Iniciando sesión",
        description: "Redireccionando a tu panel de control seguro...",
      });
    } catch (error: any) {
      setLoading(false);
      setErrorMsg("Credenciales incorrectas. Verifique sus datos.");
      toast({
        title: "Acceso denegado",
        description: "Credenciales de seguridad incorrectas.",
        variant: "destructive"
      });
    }
  };

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0a0a0f]">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">Cargando panel de control seguro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0f] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center px-6 relative transition-colors duration-300 py-12">
      {/* Back button to homepage */}
      <div className="absolute top-6 left-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-full">
            <ChevronLeft className="h-4 w-4" /> Volver a Inicio
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-[480px]">
        <Card className="w-full border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_80px_rgba(0,0,0,0.6)] rounded-[3rem] overflow-hidden bg-slate-900 p-1">
          <div className="bg-white dark:bg-[#11111c] rounded-[2.8rem] p-8 md:p-12 transition-colors duration-300">
            
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <SyncConnectLogo size="lg" variant="dark" />
              </div>
              <h2 className="text-2xl md:text-3xl font-headline font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none mb-2">
                Bienvenido
              </h2>
              <p className="text-xs text-slate-400 font-medium">Ingresa con tu correo o Google</p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl flex gap-3 animate-in fade-in">
                <Triangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black text-red-950 dark:text-red-200 uppercase">Error de Acceso</h4>
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">{errorMsg}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Dirección de e-mail</Label>
                <div className="relative">
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    className="h-13 rounded-xl bg-slate-50 dark:bg-slate-900/60 border-none ring-1 ring-slate-200 dark:ring-white/10 font-bold px-5 focus:ring-primary text-slate-900 dark:text-white" 
                    placeholder="ejemplo@correo.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Contraseña</Label>
                  <Link href="/auth/forgot-password" className="text-[10px] font-black text-primary hover:underline uppercase">¿Olvidaste tu clave?</Link>
                </div>
                <div className="relative">
                  <Input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    className="h-13 rounded-xl bg-slate-50 dark:bg-slate-900/60 border-none ring-1 ring-slate-200 dark:ring-white/10 font-bold px-5 focus:ring-primary text-slate-900 dark:text-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button 
                type="submit"
                className="w-full h-14 rounded-xl bg-slate-900 dark:bg-primary hover:bg-slate-800 dark:hover:bg-primary/95 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 cursor-pointer" 
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "ENTRAR AHORA"}
              </Button>
            </form>

            <div className="relative py-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100 dark:border-white/5"></div>
              </div>
              <span className="relative flex justify-center text-[9px] text-slate-300 dark:text-slate-600 bg-white dark:bg-[#11111c] px-4 font-black uppercase tracking-[0.3em] transition-colors">
                Acceso Rápido
              </span>
            </div>

            <Button 
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full h-13 border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm flex items-center justify-center gap-3 transition-all text-slate-800 dark:text-slate-200"
              disabled={loading}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.16H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.84l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.16l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
              </svg>
              CONTINUAR CON GOOGLE
            </Button>

            {domainError && (
              <div className="mt-6 p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-3 text-slate-800 dark:text-slate-200 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Configuración de Firebase Requerida</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Firebase requiere que autorices el dominio de esta vista previa para permitir el inicio de sesión con Google.
                </p>
                <div className="text-[11px] bg-slate-100 dark:bg-slate-900/60 p-3 rounded-xl font-mono break-all text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2 border border-slate-200/50 dark:border-white/5">
                  <span className="select-all">{domainError.domain}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6 hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(domainError.domain);
                        toast({ title: "Dominio copiado" });
                      }
                    }}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </Button>
                </div>
                <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex gap-2">
                    <span className="font-bold text-amber-600 dark:text-amber-400">1.</span>
                    <span>Ve a la pestaña <strong>Ajustes</strong> (Settings) en tu Consola de Firebase.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-amber-600 dark:text-amber-400">2.</span>
                    <span>Selecciona <strong>Dominios autorizados</strong> (Authorized domains) en la sección de Authentication.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-amber-600 dark:text-amber-400">3.</span>
                    <span>Haz clic en <strong>Agregar dominio</strong> y añade el dominio copiado arriba.</span>
                  </div>
                </div>
                <Button 
                  asChild 
                  variant="outline" 
                  className="w-full h-10 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-950/30 text-[10px] font-black uppercase tracking-widest rounded-xl text-amber-700 dark:text-amber-300 mt-2"
                >
                  <a 
                    href={`https://console.firebase.google.com/project/${domainError.projectId}/authentication/providers`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <Globe className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    ABRIR CONSOLA DE FIREBASE
                  </a>
                </Button>
              </div>
            )}
            
          </div>
        </Card>

        <div className="mt-12 text-center space-y-4">
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">¿No tienes una cuenta aún?</p>
          <Button asChild variant="link" className="text-primary font-black text-xs uppercase tracking-[0.2em] group">
            <Link href="/auth/register/role" className="flex items-center gap-2 justify-center">
              CREA TU PERFIL DE SOCIO O ALUMNO <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RootLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0a0a0f]">
        <div className="h-12 w-12 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}
