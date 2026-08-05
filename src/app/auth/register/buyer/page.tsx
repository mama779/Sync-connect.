"use client"

import { useState, Suspense, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Triangle, ChevronRight, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useAuth, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import placeholderData from '@/app/lib/placeholder-images.json'
import { getGoogleDriveDirectLink } from '@/lib/utils'
import { COUNTRY_CODES } from '@/lib/constants'
import { getFreeSpotsInfo, consumeFreeSpotIfEligible } from '@/lib/free-spots'
import { loginWithGoogle, loginWithFacebook, loginWithTikTok } from '@/lib/social-auth'

function BuyerRegisterContent() {
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { user: existingUser } = useUser()
  
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleExitAndSignOut = async () => {
    setLoading(true);
    try {
      if (auth) {
        await signOut(auth);
      }
      toast({
        title: "Sesión Finalizada",
        description: "Se ha cerrado la sesión actual.",
      });
      router.push('/auth/register/role');
    } catch (err) {
      console.error("Error signing out during exit:", err);
      router.push('/auth/register/role');
    } finally {
      setLoading(false);
    }
  };
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    countryCode: '+505',
    phone: '',
    password: ''
  })

  // Pre-fill form if logged in via Google
  useEffect(() => {
    if (existingUser && !formData.email) {
      const names = existingUser.displayName?.split(' ') || []
      setFormData(prev => ({
        ...prev,
        email: existingUser.email || '',
        phone: existingUser.phoneNumber?.replace(/\D/g, '').slice(-8) || '',
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || ''
      }));
    }
  }, [existingUser, formData.email]);

  const handleSocialLogin = async (providerType: 'google' | 'facebook' | 'tiktok') => {
    if (!auth || loading) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      if (providerType === 'google') {
        await loginWithGoogle(auth);
      } else if (providerType === 'facebook') {
        await loginWithFacebook(auth);
      } else {
        await loginWithTikTok(auth);
      }
      toast({ title: "Bienvenido", description: `Autenticado con ${providerType.toUpperCase()}` });
    } catch (err: any) {
      console.error("Social login error:", err);
      setErrorMsg("Error al autenticar con red social.");
    } finally {
      setLoading(false);
    }
  };

  const logoConfigRef = useMemoFirebase(() => db ? doc(db, 'site_config', 'site-logo') : null, [db]);
  const { data: logoOverride } = useDoc(logoConfigRef);
  const defaultLogo = placeholderData.placeholderImages.find(img => img.id === 'site-logo');
  const displayLogoUrl = getGoogleDriveDirectLink(logoOverride?.imageUrl || defaultLogo?.imageUrl || "");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    setLoading(true);
    setErrorMsg(null);

    const cleanEmail = formData.email.toLowerCase().trim();
    const cleanPass = formData.password.trim();

    try {
      let uid = existingUser?.uid;

      if (!uid) {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
        uid = userCredential.user.uid;
      }

      // Check free spots / access config for Buyer
      const freeInfo = await getFreeSpotsInfo(db);
      const isBuyerFree = freeInfo.isBuyerFreeEligible;
      if (isBuyerFree) {
        await consumeFreeSpotIfEligible(db, uid, cleanEmail, 'buyer');
      }

      const initialStatus = isBuyerFree ? 'Active' : 'Pending';

      await setDoc(doc(db, 'buyers', uid), {
        id: uid,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: cleanEmail,
        whatsappNumber: (formData.countryCode + formData.phone).replace(/\D/g, ''),
        registeredAt: new Date().toISOString(),
        status: initialStatus,
        photoUrl: existingUser?.photoURL || ''
      });

      if (!existingUser) {
        await signOut(auth);
        toast({ title: "¡Cuenta Creada!", description: "Ahora inicia sesión con tus datos." });
        router.push('/auth/login');
      } else {
        toast({ title: "¡Perfil Sincronizado!", description: "Tu cuenta de Google ha sido vinculada con éxito." });
        router.push('/dashboard/buyer');
      }

    } catch (err: any) {
      console.error("Buyer Register Error:", err);
      let msg = "No pudimos crear tu cuenta.";
      if (err.code === 'auth/email-already-in-use') msg = "Este correo ya existe.";
      else if (err.code === 'auth/weak-password') msg = "La contraseña debe tener al menos 6 caracteres.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white md:bg-[#EAEDED] flex flex-col items-center pt-8 pb-12 px-4">
      <div className="mb-4">
        <Link href="/">
          <div className="relative h-12 w-32 md:h-14 md:w-36 flex items-center justify-center">
            {displayLogoUrl ? (
              <Image src={displayLogoUrl} alt="Logo" fill className="object-contain" unoptimized />
            ) : (
              <span className="text-[#111] font-black text-2xl italic">Sync<span className="text-[#FF9900]">.Connect</span></span>
            )}
          </div>
        </Link>
      </div>

      <Card className="w-full max-w-[350px] border border-[#ddd] shadow-none md:shadow-sm rounded-[4px] bg-white p-6 md:p-8 relative">
        <button
          type="button"
          onClick={handleExitAndSignOut}
          disabled={loading}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-800 transition-colors flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
          title="Salir y Volver"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Salir</span>
        </button>
        <h1 className="text-[28px] font-normal text-[#111] mb-5 leading-tight text-left">Crear cuenta</h1>

        <div className="space-y-2 mb-6">
          <Button 
            type="button" 
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
            className="w-full h-10 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-[4px] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.16H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.84l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.16l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
            </svg>
            Entrar con Google
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button 
              type="button" 
              onClick={() => handleSocialLogin('facebook')}
              disabled={loading}
              className="w-full h-9 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-blue-200 text-[#1877F2] font-bold text-[10px] uppercase tracking-wider rounded-[4px] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </Button>

            <Button 
              type="button" 
              onClick={() => handleSocialLogin('tiktok')}
              disabled={loading}
              className="w-full h-9 bg-black/5 hover:bg-black/10 border border-slate-200 text-slate-900 font-bold text-[10px] uppercase tracking-wider rounded-[4px] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.98-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.57-1.31 1.56-1.3 2.56.01.94.5 1.86 1.28 2.37.89.58 2.05.67 3.01.25.95-.41 1.63-1.31 1.81-2.31.12-.82.08-1.66.08-2.49V.02z"/>
              </svg>
              TikTok
            </Button>
          </div>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <span className="relative flex justify-center text-[10px] text-slate-400 bg-white px-2 font-bold uppercase tracking-wider">
            O crea con tu correo
          </span>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-white border border-[#c40000] rounded-[4px] flex gap-3 items-start animate-in fade-in">
            <Triangle className="h-4 w-4 text-[#c40000] fill-[#c40000] mt-1 shrink-0" />
            <div className="space-y-1">
              <h4 className="text-[13px] font-bold text-[#c40000]">Hubo un problema</h4>
              <p className="text-[12px] text-[#111]">{errorMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-[13px] font-bold text-[#111]">Tu nombre</Label>
            <Input 
              value={formData.firstName} 
              onChange={e => setFormData({...formData, firstName: e.target.value})} 
              required 
              className="h-8 border-[#888c8c] focus:border-[#e77600] focus:ring-[3px] focus:ring-[#e77600]/20 rounded-[3px] px-2 py-1 text-[13px] font-medium" 
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[13px] font-bold text-[#111]">Apellido</Label>
            <Input 
              value={formData.lastName} 
              onChange={e => setFormData({...formData, lastName: e.target.value})} 
              required 
              className="h-8 border-[#888c8c] focus:border-[#e77600] focus:ring-[3px] focus:ring-[#e77600]/20 rounded-[3px] px-2 py-1 text-[13px] font-medium" 
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[13px] font-bold text-[#111]">Número de móvil</Label>
            <div className="flex gap-0 items-stretch">
              <Select value={formData.countryCode} onValueChange={(v) => setFormData({...formData, countryCode: v})}>
                <SelectTrigger className="w-[85px] h-8 border-[#888c8c] border-r-0 focus:border-[#e77600] focus:ring-[3px] focus:ring-[#e77600]/20 rounded-[3px] rounded-r-none px-2 bg-[#F3F3F3] text-[13px] font-bold flex shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map(c => (
                    <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                required 
                className="flex-1 h-8 border-[#888c8c] focus:border-[#e77600] focus:ring-[3px] focus:ring-[#e77600]/20 rounded-[3px] rounded-l-none px-2 py-1 text-[13px] font-medium" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[13px] font-bold text-[#111]">Dirección de e-mail</Label>
            <Input 
              type="email" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              required 
              className="h-8 border-[#888c8c] focus:border-[#e77600] focus:ring-[3px] focus:ring-[#e77600]/20 rounded-[3px] px-2 py-1 text-[13px] font-medium" 
            />
          </div>

          {!existingUser && (
            <div className="space-y-1">
              <Label className="text-[13px] font-bold text-[#111]">Contraseña</Label>
              <Input 
                type="password" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                required={!existingUser} 
                placeholder="Al menos 6 caracteres"
                className="h-8 border-[#888c8c] focus:border-[#e77600] focus:ring-[3px] focus:ring-[#e77600]/20 rounded-[3px] px-2 py-1 text-[13px] font-medium" 
              />
            </div>
          )}

          <Button 
            type="submit"
            className="amazon-btn-primary w-full h-8 mt-4" 
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crea tu cuenta de Sync"}
          </Button>

          <p className="text-[12px] text-[#111] leading-snug pt-2">
            Al crear una cuenta, aceptas las <Link href="#" className="text-[#0066c0] hover:underline hover:text-[#c45500]">Condiciones de uso</Link> de Sync Connect.
          </p>
        </form>

        <div className="mt-6 pt-6 border-t border-[#eee] text-center">
           <p className="text-[13px] text-[#111]">
            ¿Ya tienes una cuenta? <Link href="/auth/login" className="text-[#0066c0] hover:underline hover:text-[#c45500] font-medium">Iniciar sesión <ChevronRight className="inline h-3 w-3" /></Link>
          </p>
        </div>
      </Card>

      <footer className="mt-12 w-full max-w-xl text-center space-y-4 border-t border-[#eee] pt-8 bg-gradient-to-b from-[#eee] to-transparent bg-[length:100%_1px] bg-no-repeat">
        <div className="flex justify-center gap-8">
          <Link href="#" className="text-[11px] text-[#0066c0] hover:text-[#c45500] hover:underline">Ayuda</Link>
          <Link href="#" className="text-[11px] text-[#0066c0] hover:text-[#c45500] hover:underline">Aviso de privacidad</Link>
        </div>
        <p className="text-[11px] text-[#555]">© 2024, SyncConnect.com, Inc. o sus afiliados</p>
      </footer>
    </div>
  )
}

export default function BuyerRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-[#FF9900] h-12 w-12" /></div>}>
      <BuyerRegisterContent />
    </Suspense>
  )
}
