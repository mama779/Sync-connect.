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

      await setDoc(doc(db, 'buyers', uid), {
        id: uid,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: cleanEmail,
        whatsappNumber: (formData.countryCode + formData.phone).replace(/\D/g, ''),
        registeredAt: new Date().toISOString(),
        status: 'Active',
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

          <div className="space-y-1">
            <Label className="text-[13px] font-bold text-[#111]">Contraseña</Label>
            <Input 
              type="password" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              required 
              placeholder="Al menos 6 caracteres"
              className="h-8 border-[#888c8c] focus:border-[#e77600] focus:ring-[3px] focus:ring-[#e77600]/20 rounded-[3px] px-2 py-1 text-[13px] font-medium" 
            />
          </div>

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
