"use client"

import { useState, Suspense, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ShieldCheck, Store, Mail, CheckCircle, ArrowLeft, Sparkles, Building2, CreditCard } from 'lucide-react'
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

function SellerRegisterContent() {
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: existingUser } = useUser()
  
  const referralId = searchParams.get('ref')
  
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>('google')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Free spots state
  const [freeSpots, setFreeSpots] = useState<FreeSpotInfo>({
    totalFreeSpots: 6,
    usedFreeSpots: 0,
    remainingFreeSpots: 6,
    isFreeEligible: true
  })

  useEffect(() => {
    if (db) {
      getFreeSpotsInfo(db).then(setFreeSpots);
    }
  }, [db]);

  // Email verification states
  const [emailAuthMode, setEmailAuthMode] = useState<'google' | 'email'>('google')
  const [emailInput, setEmailInput] = useState('')
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [emailOtpCode, setEmailOtpCode] = useState('')
  const [emailOtpInput, setEmailOtpInput] = useState('')

  // Seller Profile State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    cedula: '',
    brandName: '',
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
        description: "Acceso validado. Procediendo al registro de Vendedor.",
      });
      setStep('payment');
    } catch (err: any) {
      console.error("Direct email register error:", err);
      setErrorMsg("Error al autenticar con este correo. Verifique sus datos o intente con Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleSellerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;

    const activeUser = auth.currentUser || existingUser;
    if (!activeUser) {
      setErrorMsg("No se detectó una sesión activa. Por favor identifíquese con su correo o Google en el paso 1.");
      setStep('google');
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.cedula.trim()) {
      setErrorMsg("Por favor complete todos los datos personales obligatorios.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const uid = activeUser.uid;
    const cleanEmail = activeUser.email || '';

    try {
      // Check free spots for seller
      const currentFreeInfo = await getFreeSpotsInfo(db);
      const isFree = currentFreeInfo.isSellerFreeEligible;
      
      let wasFreeConsumed = false;
      if (isFree) {
        wasFreeConsumed = await consumeFreeSpotIfEligible(db, uid, cleanEmail, 'seller');
      }

      const affRef = doc(db, 'affiliates', uid);
      const affSnap = await getDoc(affRef);
      
      if (affSnap.exists()) {
        toast({
          title: "Vendedor ya registrado",
          description: "Redireccionando al panel de control...",
        });
        router.push('/dashboard/affiliate');
        return;
      }

      const initialStatus = wasFreeConsumed ? 'Active' : 'Pending';

      const sellerData = {
        id: uid,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        cedula: formData.cedula.trim(),
        brandName: formData.brandName.trim() || `${formData.firstName.trim()} Store`,
        email: cleanEmail,
        whatsappNumber: '',
        photoUrl: activeUser.photoURL || '',
        registeredAt: new Date().toISOString(),
        currentBalance: 0,
        status: initialStatus,
        role: 'seller',
        isSeller: true,
        isFreeRegistration: wasFreeConsumed,
        referredBy: referralId || null,
        bankId: paymentData.bankId,
        bankAccountNumber: paymentData.bankAccountNumber,
        bankAccountHolderName: paymentData.bankAccountHolderName
      };

      await setDoc(affRef, sellerData);
      
      // Also write to sellers collection for indexing
      try {
        await setDoc(doc(db, 'sellers', uid), sellerData);
      } catch (sErr) {
        console.warn("Non-blocking write to sellers collection:", sErr);
      }

      // Send activation notification
      fetch('/api/activation/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: `${formData.firstName} ${formData.lastName}`,
          role: 'seller',
          amount: wasFreeConsumed ? 0 : 7
        })
      }).catch(err => console.warn("Error triggering seller notification:", err));

      if (wasFreeConsumed) {
        toast({ 
          title: "🎉 ¡Registro GRATUITO Exitoso! ($0 USD)", 
          description: "¡Felicidades! Tu cuenta de Vendedor/Productor está ACTIVADA de forma completamente GRATUITA." 
        });
      } else {
        toast({ 
          title: "Registro de Vendedor Exitoso ✓", 
          description: "Tu perfil de Vendedor/Productor ha sido creado ($7 USD tarifa de activación)." 
        });
      }

      router.push('/dashboard/affiliate');

    } catch (err: any) {
      console.error("Seller Register Error:", err);
      setErrorMsg("No se pudo completar el registro debido a un error de base de datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex flex-col items-center justify-center p-6 py-12">
      <div className="mb-8">
        <Link href="/">
          <div className="h-10 w-40 relative">
            {displayLogoUrl ? (
              <Image src={displayLogoUrl} alt="Logo" fill className="object-contain" unoptimized />
            ) : (
              <span className="text-[#131921] font-black text-2xl italic tracking-tighter uppercase">Six<span className="text-[#ff9900]">Figure</span></span>
            )}
          </div>
        </Link>
      </div>

      <Card className="w-full max-w-xl border border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white">
        {/* Banner de Promoción */}
        <div className="bg-[#131921] p-8 text-white text-center relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-[#ff9900]/10 rounded-full blur-2xl" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff9900]/20 border border-[#ff9900]/40 text-[#ff9900] text-[10px] font-black uppercase tracking-widest mb-3">
            <Store className="h-3.5 w-3.5" /> Perfil Productor / Vendedor
          </div>
          <h1 className="text-2xl font-headline font-black uppercase tracking-tight">Registro de <span className="text-[#ff9900]">Vendedor Digital</span></h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
            {freeSpots.isFreeEligible ? "🎁 REGISTRO $0 USD ACTIVADO (Cupos Limitados)" : "Membresía de Vendedor: $7 USD Única Vez"}
          </p>
        </div>

        <CardContent className="p-8 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-3">
              <Store className="h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'google' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center space-y-1">
                <p className="text-sm font-black uppercase text-[#131921]">Paso 1: Identificación del Productor</p>
                <p className="text-xs text-slate-500">Inicie sesión con su cuenta para vincular la tienda.</p>
              </div>

              {emailAuthMode === 'google' ? (
                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full h-13 bg-[#131921] hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 shadow-lg cursor-pointer"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                      <>
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        <span>Regístrate con Google</span>
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

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                    <div className="relative flex justify-center text-[10px] font-black uppercase text-slate-400"><span className="bg-white px-3">O con tu correo</span></div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEmailAuthMode('email')}
                    className="w-full h-11 rounded-2xl border-slate-200 font-bold text-xs uppercase text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Mail className="h-4 w-4 mr-2 text-slate-500" /> Usar Correo Electrónico
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <form onSubmit={handleDirectEmailRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-slate-600">Correo Electrónico</Label>
                      <Input
                        type="email"
                        placeholder="vendedor@empresa.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        required
                        className="h-12 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 font-medium text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-slate-600">Contraseña</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={emailPasswordInput}
                        onChange={(e) => setEmailPasswordInput(e.target.value)}
                        required
                        className="h-12 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 font-medium text-xs"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-[#ff9900] hover:bg-[#e68a00] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar Registro con Correo"}
                    </Button>
                  </form>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEmailAuthMode('google')}
                    className="w-full text-xs text-slate-500 font-bold uppercase"
                  >
                    ← Volver a Redes Sociales
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 'payment' && (
            <form onSubmit={handleSellerRegister} className="space-y-6 animate-in fade-in duration-300">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 font-bold">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-[#131921]">
                      {auth?.currentUser?.email || emailInput}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Identidad Autenticada</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleExitAndSignOut}
                  className="h-8 text-[10px] font-black uppercase text-slate-400 hover:text-red-600"
                >
                  Cambiar
                </Button>
              </div>

              <div className="space-y-4">
                <div className="text-left">
                  <p className="text-xs font-black uppercase text-[#131921] flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#ff9900]" /> Datos de Vendedor / Marca
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Nombres *</Label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Juan Carlos"
                      required
                      className="h-11 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Apellidos *</Label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Pérez López"
                      required
                      className="h-11 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Cédula / DNI *</Label>
                    <Input
                      value={formData.cedula}
                      onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                      placeholder="001-000000-0000A"
                      required
                      className="h-11 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Nombre de la Tienda / Marca</Label>
                    <Input
                      value={formData.brandName}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      placeholder="Ej: Innova Digital"
                      className="h-11 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 text-left">
                  <p className="text-xs font-black uppercase text-[#131921] flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" /> Cuenta para Recepción de Ventas
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Banco Receptor</Label>
                    <Select
                      value={paymentData.bankId}
                      onValueChange={(val) => setPaymentData({ ...paymentData, bankId: val })}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 font-bold text-xs">
                        <SelectValue placeholder="Seleccione su Banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {NICA_BANKS.map((b) => (
                          <SelectItem key={b} value={b} className="text-xs font-bold">
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-500">Número de Cuenta</Label>
                      <Input
                        value={paymentData.bankAccountNumber}
                        onChange={(e) => setPaymentData({ ...paymentData, bankAccountNumber: e.target.value })}
                        placeholder="123456789"
                        className="h-11 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 font-mono text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-500">Titular de la Cuenta</Label>
                      <Input
                        value={paymentData.bankAccountHolderName}
                        onChange={(e) => setPaymentData({ ...paymentData, bankAccountHolderName: e.target.value })}
                        placeholder="Nombre exacto en el banco"
                        className="h-11 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-[#131921] hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    <Store className="h-4 w-4 text-[#ff9900]" />
                    <span>FINALIZAR REGISTRO DE VENDEDOR</span>
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="pt-4 border-t flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
            <Link href="/auth/register/role" className="hover:text-slate-700 flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Cambiar Rol
            </Link>
            <div className="flex items-center gap-1 text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" /> Entorno Protegido
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SellerRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff9900]" />
      </div>
    }>
      <SellerRegisterContent />
    </Suspense>
  )
}
