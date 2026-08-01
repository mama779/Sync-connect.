"use client"

import { useState, Suspense, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, AlertTriangle, ChevronRight, ShieldCheck, Landmark, Banknote, Mail, CheckCircle, ArrowLeft } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useToast } from '@/hooks/use-toast'
import { useAuth, useFirestore, useUser, updateDocumentNonBlocking, useMemoFirebase, useDoc } from '@/firebase'
import { GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, increment, getDoc } from 'firebase/firestore'
import { cn, getGoogleDriveDirectLink } from '@/lib/utils'
import { NICA_BANKS } from '@/lib/constants'
import { getFreeSpotsInfo, consumeFreeSpotIfEligible, FreeSpotInfo } from '@/lib/free-spots'
import { loginWithGoogle, loginWithFacebook, loginWithTikTok } from '@/lib/social-auth'
import placeholderData from '@/app/lib/placeholder-images.json'

type Step = 'google' | 'payment'

function AffiliateRegisterContent() {
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: existingUser, isUserLoading } = useUser()
  
  const referralId = searchParams.get('ref')
  
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>('google')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 6 Free spots state
  const [freeSpots, setFreeSpots] = useState<FreeSpotInfo>({
    totalFreeSpots: 6,
    usedFreeSpots: 0,
    remainingFreeSpots: 6,
    isFreeEligible: true
  })

  useEffect(() => {
    getFreeSpotsInfo(db).then(setFreeSpots);
  }, [db]);

  // Email verification states (Fallback / Alternative to Google Popup)
  const [emailAuthMode, setEmailAuthMode] = useState<'google' | 'email'>('google')
  const [emailInput, setEmailInput] = useState('')
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [emailOtpCode, setEmailOtpCode] = useState('')
  const [emailOtpInput, setEmailOtpInput] = useState('')

  // Profile and Payment state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    cedula: '',
  })

  const [paymentData, setPaymentData] = useState({
    bankId: '',
    bankAccountNumber: '',
    bankAccountHolderName: ''
  })

  const logoConfigRef = useMemoFirebase(() => db ? doc(db, 'site_config', 'site-logo') : null, [db]);
  const { data: logoOverride } = useDoc(logoConfigRef);
  const defaultLogo = placeholderData.placeholderImages.find(img => img.id === 'site-logo');
  const displayLogoUrl = getGoogleDriveDirectLink(logoOverride?.imageUrl || defaultLogo?.imageUrl || "");

  // Auto-fill names from account once authenticated and advance step
  useEffect(() => {
    if (existingUser) {
      setFormData(prev => ({
        ...prev,
        firstName: prev.firstName || existingUser.displayName?.split(' ')[0] || '',
        lastName: prev.lastName || existingUser.displayName?.split(' ').slice(1).join(' ') || ''
      }));
      if (step === 'google') {
        setStep('payment');
      }
    }
  }, [existingUser, step]);

  // Handle Exit and sign out to return to role selection
  const handleExitAndSignOut = async () => {
    setLoading(true);
    try {
      if (auth) {
        await signOut(auth);
      }
      toast({
        title: "Sesión Finalizada",
        description: "Se ha cancelado el registro y se ha cerrado la sesión.",
      });
      router.push('/auth/register/role');
    } catch (err) {
      console.error("Error signing out during exit:", err);
      router.push('/auth/register/role');
    } finally {
      setLoading(false);
    }
  };

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
      toast({
        title: "Cuenta Vinculada",
        description: `Autenticación con ${providerType.toUpperCase()} exitosa.`,
      });
      setStep('payment');
    } catch (error: any) {
      const isPopupClosed = error?.code === 'auth/popup-closed-by-user' || 
                            error?.message?.includes('popup-closed-by-user');

      if (isPopupClosed) {
        toast({
          title: "Inicio de sesión cancelado",
          description: "Se cerró la solicitud de autenticación.",
        });
        return;
      }

      console.error(`Error de login con ${providerType}:`, error);
      setErrorMsg(`Fallo en la autenticación con ${providerType}. Intente con correo u otro proveedor.`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => handleSocialLogin('google');
  const handleFacebookLogin = () => handleSocialLogin('facebook');
  const handleTikTokLogin = () => handleSocialLogin('tiktok');

  const [emailPasswordInput, setEmailPasswordInput] = useState('')

  const handleDirectEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || loading) return;
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPass = emailPasswordInput.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg("Por favor, ingrese un correo electrónico válido.");
      return;
    }
    if (!cleanPass || cleanPass.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      try {
        await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        } else {
          throw createErr;
        }
      }

      toast({
        title: "Correo Autenticado ✓",
        description: "Acceso validado. Procediendo al registro de Socio Afiliado.",
      });
      setStep('payment');
    } catch (err: any) {
      console.error("Direct email register error:", err);
      setErrorMsg("Error al autenticar con este correo. Verifique sus datos o intente con Google.");
    } finally {
      setLoading(false);
    }
  };

  // Final Registration Step
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !auth.currentUser) return;
    setLoading(true);
    setErrorMsg(null);

    const uid = auth.currentUser.uid;
    const cleanEmail = auth.currentUser.email || '';

    try {
      // Check if user is eligible for free registration
      const currentFreeInfo = await getFreeSpotsInfo(db);
      const isFree = currentFreeInfo.isAffiliateFreeEligible;
      
      let wasFreeConsumed = false;
      if (isFree) {
        wasFreeConsumed = await consumeFreeSpotIfEligible(db, uid, cleanEmail, 'affiliate');
      }

      // Check if user is already registered in affiliates to avoid overwriting or duplicates
      const affRef = doc(db, 'affiliates', uid);
      const affSnap = await getDoc(affRef);
      
      if (affSnap.exists()) {
        toast({
          title: "Socio ya registrado",
          description: "Redireccionando al panel de control...",
        });
        router.push('/dashboard/affiliate');
        return;
      }

      const initialStatus = wasFreeConsumed ? 'Active' : 'Pending';

      await setDoc(affRef, {
        id: uid,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        cedula: formData.cedula.trim(),
        email: cleanEmail,
        whatsappNumber: '',
        photoUrl: auth.currentUser.photoURL || '',
        registeredAt: new Date().toISOString(),
        currentBalance: 0,
        status: initialStatus,
        isFreeRegistration: wasFreeConsumed,
        referredBy: referralId || null,
        bankId: paymentData.bankId,
        bankAccountNumber: paymentData.bankAccountNumber,
        bankAccountHolderName: paymentData.bankAccountHolderName
      });

      if (referralId) {
        try {
          updateDocumentNonBlocking(doc(db, 'affiliates', referralId), {
            currentBalance: increment(1)
          });
          
          await setDoc(doc(db, 'notifications', `${referralId}_referral_${uid}`), {
            userId: referralId,
            title: '🎁 Bonificación por Referido',
            message: `El usuario ${formData.firstName} se ha registrado correctamente mediante su enlace de socio.`,
            type: 'sale',
            createdAt: new Date().toISOString(),
            isRead: false
          });
        } catch (refError) {
          console.error("Error crediting referral bonus:", refError);
        }
      }

      if (wasFreeConsumed) {
        toast({ 
          title: "🎉 ¡Registro GRATUITO Exitoso! ($0 USD)", 
          description: "¡Felicidades! Tu cuenta está ACTIVADA de forma completamente GRATUITA." 
        });
      } else {
        toast({ 
          title: "Registro Exitoso", 
          description: "Tu perfil de socio ha sido creado. Procede a confirmar tu pago ($6 USD) para la activación automatizada." 
        });
      }

      router.push('/dashboard/affiliate');

    } catch (err: any) {
      console.error("Register Error:", err);
      setErrorMsg("No se pudo completar el registro debido a límites o problemas en la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex flex-col items-center justify-center p-6 py-12">
      <div className="mb-10">
        <Link href="/">
          <div className="relative h-10 w-40">
            {displayLogoUrl ? (
              <Image src={displayLogoUrl} alt="Logo" fill className="object-contain" unoptimized />
            ) : (
              <span className="text-[#131921] font-black text-2xl uppercase italic tracking-tighter">Sync<span className="text-[#ff9900]">.Pro</span></span>
            )}
          </div>
        </Link>
      </div>

      <Card className="w-full max-w-[480px] border border-[#ddd] shadow-none rounded-[4px] bg-white overflow-hidden relative">
        <div className="bg-[#131921] p-8 text-white text-center relative">
          <button
            type="button"
            onClick={handleExitAndSignOut}
            disabled={loading}
            className="absolute left-4 top-4 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
            title="Salir y Volver"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Salir</span>
          </button>
          <h1 className="text-2xl font-black uppercase tracking-tight">Registro de <span className="text-[#ff9900]">Socio Comercial</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Formulario de Aplicación Corporativa</p>
        </div>

        <CardContent className="p-8 md:p-10">
          {errorMsg && (
            <div className="mb-8 p-4 border border-[#c40000] bg-white flex gap-3 items-start">
              <AlertTriangle className="h-4 w-4 text-[#c40000] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-bold text-[#c40000] uppercase">Error en el Proceso</h4>
                <p className="text-xs text-slate-600 font-medium leading-tight">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Stepper Progress */}
          <div className="mb-10 flex gap-2">
            {['google', 'payment'].map((s, idx) => (
              <div key={s} className="flex-1 space-y-2">
                <div className={cn("h-1 transition-all duration-300", 
                  (step === s || (s === 'google' && step !== 'google')) ? "bg-[#ff9900]" : "bg-slate-100")} 
                />
                <p className="text-[8px] font-black uppercase text-center text-slate-400 tracking-wider">
                  Paso {idx + 1}
                </p>
              </div>
            ))}
          </div>

          {/* STEP 1: Google Auth / Email Code Verification */}
          {step === 'google' && (
            <div className="space-y-6 text-center">
              <div className="p-6 bg-slate-50 border border-slate-100 rounded-[4px] space-y-2 text-left">
                <h3 className="text-sm font-black text-slate-900 uppercase">1. Cuenta de Identidad</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Para ingresar a la red Sync como socio comercial, es obligatorio registrarse utilizando su cuenta de Google o verificando su correo electrónico con un código de seguridad. Esto garantiza la seguridad del canal.
                </p>
              </div>

              <div className="flex border border-slate-200 rounded-[4px] overflow-hidden p-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setEmailAuthMode('google')}
                  className={cn("flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-[3px] transition-all",
                    emailAuthMode === 'google' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => setEmailAuthMode('email')}
                  className={cn("flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-[3px] transition-all",
                    emailAuthMode === 'email' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                >
                  Código de Correo
                </button>
              </div>

              {emailAuthMode === 'google' ? (
                <div className="space-y-3">
                  <Button 
                    onClick={handleGoogleLogin} 
                    disabled={loading || isUserLoading}
                    className="w-full h-13 bg-white text-slate-900 hover:bg-slate-50 border border-slate-300 flex items-center justify-center gap-3 font-black rounded-xl shadow-sm text-xs uppercase tracking-widest transition-all cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.6c-.28 1.5-.1.3-1.12 1.98l3.12 2.42c1.83-1.69 2.88-4.18 2.88-6.25z" />
                          <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.12-2.42c-.87.59-2 .95-3.32.95-2.55 0-4.72-1.73-5.5-4.07L1.91 18.06C3.89 22 7.92 24 12 24z" />
                          <path fill="#FBBC05" d="M6.5 15.55c-.2-.59-.31-1.22-.31-1.87s.11-1.28.31-1.87L1.91 9.39C.69 11.83 0 14.52 0 17.3s.69 5.47 1.91 7.91l4.59-3.66z" />
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0 7.92 0 3.89 2 1.91 5.94l4.59 3.66c.78-2.34 2.95-4.07 5.5-4.07z" />
                        </svg>
                        <span>Google</span>
                      </>
                    )}
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      onClick={handleFacebookLogin}
                      disabled={loading}
                      variant="outline"
                      className="w-full h-11 border-slate-200 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      <span>Facebook</span>
                    </Button>

                    <Button
                      type="button"
                      onClick={handleTikTokLogin}
                      disabled={loading}
                      variant="outline"
                      className="w-full h-11 border-slate-200 bg-black/5 hover:bg-black/10 text-slate-900 font-black text-[10px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.98-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.57-1.31 1.56-1.3 2.56.01.94.5 1.86 1.28 2.37.89.58 2.05.67 3.01.25.95-.41 1.63-1.31 1.81-2.31.12-.82.08-1.66.08-2.49V.02z"/>
                      </svg>
                      <span>TikTok</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <form onSubmit={handleDirectEmailRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-wider text-slate-500">Correo Electrónico</Label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          placeholder="nombre@empresa.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          required
                          className="h-12 rounded-xl border border-slate-300 focus:ring-primary pl-10 text-xs font-medium"
                        />
                        <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-wider text-slate-500">Contraseña</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={emailPasswordInput}
                        onChange={(e) => setEmailPasswordInput(e.target.value)}
                        required
                        className="h-12 rounded-xl border border-slate-300 focus:ring-primary text-xs font-medium px-4"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-[#ff9900] hover:bg-[#e08800] text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl cursor-pointer"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar Registro con Correo"}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Payment Data and Profile */}
          {step === 'payment' && (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-emerald-900 uppercase">Cuenta Vinculada</p>
                    <p className="text-xs text-emerald-700 font-bold">{existingUser?.email}</p>
                  </div>
                </div>

                {freeSpots.isFreeEligible ? (
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm animate-pulse">
                    🎁 GRATIS ($0 USD)
                  </span>
                ) : (
                  <div className="text-right">
                    <span className="bg-slate-900 text-amber-400 font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider inline-block shadow-sm">
                      $6 USD
                    </span>
                    <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">Tarifa de Activación (Dólares)</p>
                  </div>
                )}
              </div>

              {freeSpots.isFreeEligible ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>🎉 <strong>¡Invitación Gratuita Activa!</strong> Tu activación de afiliado es totalmente <strong>GRATIS ($0 USD)</strong>. No tendrás que realizar ningún pago.</span>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-950">
                    <Banknote className="h-4 w-4 text-amber-600 shrink-0" />
                    Activación de Afiliado: $6 USD (Dólares)
                  </p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    La tarifa única de activación para socio afiliado es de <strong>$6 USD (Seis Dólares)</strong>. Al transferir mediante banco local, el monto se calcula en Dólares USD o su equivalente al tipo de cambio oficial del banco.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre</Label>
                    <Input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required className="amazon-input" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Apellido</Label>
                    <Input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} required className="amazon-input" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Número de Cédula de Identidad</Label>
                  <Input 
                    value={formData.cedula} 
                    onChange={e => setFormData({...formData, cedula: e.target.value})} 
                    required 
                    placeholder="Ej: 001-000000-0000A"
                    className="amazon-input font-bold" 
                  />
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <Landmark className="h-4 w-4 text-[#ff9900]" /> Banco de Recepción
                  </Label>
                  <Select value={paymentData.bankId} onValueChange={(v) => setPaymentData({...paymentData, bankId: v})} required>
                    <SelectTrigger className="h-10 border-[#888c8c] rounded-[3px] font-bold">
                      <SelectValue placeholder="Seleccione un banco local" />
                    </SelectTrigger>
                    <SelectContent>
                      {NICA_BANKS.map(bank => (
                        <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Número de Cuenta Bancaria</Label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      value={paymentData.bankAccountNumber} 
                      onChange={e => setPaymentData({...paymentData, bankAccountNumber: e.target.value})} 
                      required 
                      placeholder="Ej: 1234567890"
                      className="pl-10 amazon-input font-mono" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre del Titular de la Cuenta</Label>
                  <Input 
                    value={paymentData.bankAccountHolderName} 
                    onChange={e => setPaymentData({...paymentData, bankAccountHolderName: e.target.value})} 
                    required 
                    placeholder="Debe coincidir con su nombre legal"
                    className="amazon-input" 
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-4">
                <Button type="button" variant="outline" onClick={() => setStep('google')} className="h-12 w-1/3 font-bold uppercase tracking-wider text-xs">Atrás</Button>
                <Button type="submit" disabled={loading} className="amazon-btn-primary flex-1 h-12 font-bold text-xs uppercase tracking-wider">
                  {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "FINALIZAR REGISTRO"}
                </Button>
              </div>
            </form>
          )}
          
          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
             <p className="text-xs font-medium text-slate-500">
              ¿Ya tiene una cuenta de socio? <Link href="/auth/login" className="text-[#0066c0] hover:underline font-bold ml-1 uppercase text-[10px] tracking-widest">Identificarse <ChevronRight className="inline h-3 w-3" /></Link>
             </p>
          </div>
        </CardContent>
      </Card>

      <footer className="mt-12 flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
         <ShieldCheck className="h-4 w-4" /> Entorno de Gestión Comercial Sync Connect Nicaragua
      </footer>
    </div>
  )
}

export default function AffiliateRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F9FA]"><Loader2 className="animate-spin text-[#ff9900] h-10 w-10 mb-4" /></div>}>
      <AffiliateRegisterContent />
    </Suspense>
  )
}
