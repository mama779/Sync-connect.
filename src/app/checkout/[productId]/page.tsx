"use client"

import { useState, Suspense, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth, useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase'
import { doc } from 'firebase/firestore'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'
import { 
  Loader2, 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  User, 
  Mail, 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Sparkles,
  Lock,
  Gift,
  BookOpen,
  HelpCircle
} from 'lucide-react'
import Link from 'next/link'

declare global {
  interface Window {
    paypal?: any;
  }
}

function CheckoutContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const db = useFirestore()
  const auth = useAuth()
  
  const productId = params.productId as string
  const affiliateId = searchParams.get('ref') || 'admin'

  const productRef = useMemoFirebase(() => doc(db, 'products', productId), [db, productId])
  const { data: product, isLoading: productLoading } = useDoc(productRef)

  const { user, isUserLoading } = useUser()

  const buyerProfileRef = useMemoFirebase(() => (db && user ? doc(db, 'buyers', user.uid) : null), [db, user])
  const { data: buyerProfile, isLoading: buyerProfileLoading } = useDoc(buyerProfileRef)

  // Checkout States
  const [paypalReady, setPaypalReady] = useState(false)
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [paymentState, setPaymentState] = useState<'checkout' | 'success' | 'cancel' | 'error'>('checkout')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [transactionDetails, setTransactionDetails] = useState<any>(null)
  const [activeImgIndex, setActiveImgIndex] = useState(0)
  const [purchaseLocation, setPurchaseLocation] = useState<{lat: number, lng: number, updatedAt: string} | null>(null)

  // Form States
  const [step1Confirmed, setStep1Confirmed] = useState(false)
  const [authTab, setAuthTab] = useState<'login' | 'register'>('register')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: ''
  })

  // Pre-fill form if logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || prev.email,
        firstName: buyerProfile?.firstName || prev.firstName,
        lastName: buyerProfile?.lastName || prev.lastName,
        phone: buyerProfile?.whatsappNumber || buyerProfile?.phone || prev.phone,
      }))
      setStep1Confirmed(true)
    }
  }, [user, buyerProfile])

  // Capturar ubicación con consentimiento para seguridad de compra
  useEffect(() => {
    if (step1Confirmed && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPurchaseLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            updatedAt: new Date().toISOString()
          });
        },
        (error) => {
          console.log("Consentimiento de ubicación denegado o error:", error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  }, [step1Confirmed]);

  // Load PayPal SDK Script dynamically
  useEffect(() => {
    if (!product) return;

    const envClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
    const isTestMode = !envClientId || envClientId.startsWith('Abv8KNo') || envClientId === 'test';
    const clientId = isTestMode ? 'test' : envClientId;
    
    if (window.paypal) {
      setPaypalReady(true)
      return
    }

    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`
    script.async = true
    script.onload = () => {
      setPaypalReady(true)
    }
    script.onerror = () => {
      console.error("Failed to load PayPal SDK")
      toast({ variant: "destructive", title: "Error de Carga", description: "No se pudo iniciar la pasarela de PayPal." })
    }
    document.body.appendChild(script)

    return () => {
      // Keep script loaded to avoid multiple additions on hot reloads
    }
  }, [product, toast])

  // Render PayPal Buttons dynamically
  useEffect(() => {
    if (!paypalReady || !window.paypal || !step1Confirmed || paymentState !== 'checkout') return;

    const container = document.getElementById('paypal-button-container');
    if (!container) return;

    // Clear previous buttons before rendering new ones to avoid duplicating
    container.innerHTML = '';

    const envClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
    const isTestMode = !envClientId || envClientId.startsWith('Abv8KNo') || envClientId === 'test';

    try {
      window.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'pay'
        },
        createOrder: async (data: any, actions: any) => {
          // If in test/demo mode, create order client-side using test sandbox SDK
          if (isTestMode) {
            return actions.order.create({
              purchase_units: [
                {
                  amount: {
                    currency_code: 'USD',
                    value: product?.price?.toFixed(2) || '10.00',
                  },
                  description: product?.name || 'Compra Sync Connect',
                },
              ],
            });
          }

          try {
            const res = await fetch('/api/paypal/create-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId }),
            });
            const order = await res.json();
            if (order.error) {
              throw new Error(order.error);
            }
            return order.id;
          } catch (err: any) {
            console.error("Create order failed:", err);
            toast({ variant: "destructive", title: "Error", description: err.message || "No se pudo iniciar la orden de pago." });
            throw err;
          }
        },
        onApprove: async (data: any) => {
          setLoadingPayment(true);
          try {
            const res = await fetch('/api/paypal/capture-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: data.orderID,
                productId,
                buyerId: auth?.currentUser?.uid,
                buyerInfo: {
                  firstName: formData.firstName,
                  lastName: formData.lastName,
                  email: formData.email,
                  phone: formData.phone,
                  lastLocation: purchaseLocation,
                },
                affiliateId,
              }),
            });
            
            const captureResult = await res.json();
            
            if (captureResult.error) {
              throw new Error(captureResult.error);
            }
            
            setTransactionDetails(captureResult);
            setPaymentState('success');
            toast({ title: "¡Compra Exitosa!", description: "Tu acceso ha sido habilitado al instante." });
          } catch (captureErr: any) {
            console.error("Capture failed:", captureErr);
            setPaymentState('error');
            setErrorMessage(captureErr.message || "No se pudo validar el pago en nuestros servidores.");
          } finally {
            setLoadingPayment(false);
          }
        },
        onCancel: () => {
          setPaymentState('cancel');
          toast({ title: "Pago Cancelado", description: "Puedes intentarlo de nuevo cuando desees." });
        },
        onError: (err: any) => {
          console.error("PayPal processing error:", err);
          setPaymentState('error');
          setErrorMessage("Ocurrió un error en la comunicación segura con los servidores de PayPal.");
        }
      }).render('#paypal-button-container');
    } catch (renderErr) {
      console.error("Error setting up buttons:", renderErr);
    }
  }, [paypalReady, step1Confirmed, paymentState, productId, auth?.currentUser?.uid, formData, affiliateId, purchaseLocation, toast]);

  // Handle Manual Auth Steps (Login / Signup)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) return;
    
    setAuthLoading(true);
    setAuthError(null);

    const email = formData.email.toLowerCase().trim();
    const pass = formData.password.trim();

    try {
      if (authTab === 'register') {
        if (!formData.firstName || !formData.lastName || !formData.phone) {
          throw new Error("Por favor completa tu nombre, apellido y WhatsApp.");
        }
        
        // Simplemente confirmamos los datos y habilitamos la pasarela de pago para este huésped
        toast({ title: "Datos Confirmados", description: "La pasarela de pago seguro ha sido habilitada." });
      } else {
        // Sign In
        if (!pass) {
          throw new Error("Por favor ingresa tu contraseña.");
        }
        await signInWithEmailAndPassword(auth, email, pass);
        toast({ title: "Sesión Iniciada", description: "Tus credenciales son válidas." });
      }
      setStep1Confirmed(true);
    } catch (err: any) {
      console.error("Auth error:", err);
      let friendlyMsg = err.message || "No se pudo procesar.";
      if (err.code === 'auth/email-already-in-use') {
        friendlyMsg = "Este correo ya está registrado. Por favor, selecciona 'Iniciar Sesión' si ya tienes una cuenta.";
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyMsg = "Contraseña o correo incorrectos. Verifica tus datos.";
      } else if (err.code === 'auth/weak-password') {
        friendlyMsg = "La contraseña debe tener un mínimo de 6 caracteres.";
      }
      setAuthError(friendlyMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  // SUCCESS SCREEN
  if (paymentState === 'success') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center py-20 px-6 relative overflow-hidden">
        {/* Glow circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-2xl w-full relative z-10 space-y-10">
          <div className="text-center space-y-4">
            <div className="inline-flex h-24 w-24 bg-green-500/10 border border-green-500/20 text-green-400 rounded-[2.5rem] items-center justify-center shadow-3xl shadow-green-500/5 animate-bounce">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h1 className="text-4xl md:text-5xl font-headline font-black text-white italic uppercase tracking-tight leading-none">
              ¡PAGO REALIZADO <span className="text-primary">CON ÉXITO!</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide max-w-md mx-auto">
              Tu orden ha sido procesada de forma segura y tu capacitación digital ha sido desbloqueada al instante.
            </p>
          </div>

          <Card className="border-none shadow-3xl bg-slate-900/60 backdrop-blur-2xl rounded-[3rem] p-10 ring-1 ring-white/10 text-white space-y-8">
            <div className="flex items-center gap-4 pb-6 border-b border-white/5">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><BookOpen className="h-6 w-6" /></div>
              <div>
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Capacitación Adquirida</p>
                <h3 className="font-black text-white text-lg uppercase tracking-tight leading-tight">{product?.name}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block">ID de Transacción</span>
                <span className="font-mono text-xs text-white break-all">{transactionDetails?.transactionId || "N/A"}</span>
              </div>
              <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block">Inversión Recibida</span>
                <span className="font-black text-primary text-base">${parseFloat(transactionDetails?.amount || product?.price || 0).toFixed(2)} USD</span>
              </div>
              <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block">Alumno Registrado</span>
                <span className="font-bold text-white block truncate">{formData.firstName} {formData.lastName}</span>
              </div>
              <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block">Correo Electrónico</span>
                <span className="font-medium text-slate-300 block truncate">{formData.email}</span>
              </div>
            </div>

            <div className="flex gap-4 items-center p-5 bg-primary/5 rounded-2xl border border-primary/10 text-primary text-xs font-bold leading-relaxed">
              <Sparkles className="h-5 w-5 shrink-0" />
              Hemos enviado un comprobante de compra y los accesos de ingreso a tu correo electrónico. Ya eres miembro oficial de la red.
            </div>
          </Card>

          <div className="flex flex-col gap-4 text-center">
            <Button asChild className="h-18 rounded-2xl bg-white text-slate-950 hover:bg-primary hover:text-white font-black text-sm uppercase tracking-widest shadow-2xl transition-all duration-300 gap-4 group">
              <Link href="/dashboard/buyer">
                ACCEDER A MI ACADEMIA <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">PROPIEDAD VITALICIA • SOPORTE 24/7</p>
          </div>
        </div>
      </div>
    )
  }

  // CANCEL / ERROR SCREEN WRAPPER
  const handleRetry = () => {
    setPaymentState('checkout')
    setErrorMessage(null)
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-white py-12 px-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-10 relative z-10">
        {/* TOP BAR */}
        <div className="flex items-center justify-between border-b border-white/5 pb-6">
          <Link href="/">
            <div className="flex items-center gap-1">
              <span className="text-white font-black text-2xl italic uppercase tracking-tighter">Sync<span className="text-primary">.Connect</span></span>
            </div>
          </Link>
          <div className="flex items-center gap-2.5 text-[9px] font-black uppercase text-slate-500 tracking-widest bg-white/5 border border-white/10 px-5 py-2.5 rounded-full backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-green-500" /> Transacción Encriptada SSL
          </div>
        </div>

        {/* NOTIFICATION BANNERS */}
        {paymentState === 'cancel' && (
          <div className="p-6 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-3xl flex gap-4 items-start animate-in slide-in-from-top duration-300">
            <AlertTriangle className="h-6 w-6 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase tracking-wide">Pago Cancelado por el Usuario</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                La orden fue interrumpida y no se realizó ningún cargo. Puedes revisar tu información o cambiar tu método de pago e intentarlo nuevamente cuando desees.
              </p>
              <Button onClick={handleRetry} variant="link" className="p-0 h-auto text-yellow-400 hover:text-white font-black text-xs uppercase tracking-widest pt-2">
                REINTENTAR AHORA →
              </Button>
            </div>
          </div>
        )}

        {paymentState === 'error' && (
          <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl flex gap-4 items-start animate-in slide-in-from-top duration-300">
            <XCircle className="h-6 w-6 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase tracking-wide">Error en el Procesamiento</h4>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {errorMessage || "Ocurrió un inconveniente al validar tus fondos o conectar con PayPal. Por favor, asegúrate de tener saldo suficiente e intenta nuevamente."}
              </p>
              <Button onClick={handleRetry} variant="link" className="p-0 h-auto text-red-400 hover:text-white font-black text-xs uppercase tracking-widest pt-2">
                REINTENTAR PAGO →
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* LADO IZQUIERDO: FORMULARIO */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* STEP 1: COMPRADOR Y AUTENTICACIÓN */}
            <Card className="border-none shadow-3xl bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden ring-1 ring-white/10">
              <CardHeader className="bg-slate-950 p-8 border-b border-white/5">
                <CardTitle className="text-lg font-headline font-black uppercase italic flex items-center justify-between text-white">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-slate-950 shadow-lg"><User className="h-5 w-5" /></div>
                    01. Datos del Alumno
                  </div>
                  {user && (
                    <span className="text-[9px] font-black uppercase text-green-500 tracking-widest bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                      ✓ Autenticado
                    </span>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-8 space-y-6">
                {!user ? (
                  // NOT AUTHENTICATED: SHOW TABBED FORM
                  <div className="space-y-6">
                    <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl text-xs font-bold text-primary flex gap-3 leading-relaxed">
                      <Lock className="h-5 w-5 mt-0.5 shrink-0" />
                      Ingresa tus datos de contacto para habilitar la pasarela oficial. No requieres crear contraseña ni registrarte previamente.
                    </div>

                    <div className="flex p-1 bg-slate-950 rounded-xl border border-white/5">
                      <button
                        type="button"
                        onClick={() => { setAuthTab('register'); setAuthError(null); }}
                        className={`flex-1 py-3 text-center rounded-lg font-black text-xs uppercase tracking-wider transition-all ${
                          authTab === 'register' ? 'bg-primary text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Compra Rápida
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAuthTab('login'); setAuthError(null); }}
                        className={`flex-1 py-3 text-center rounded-lg font-black text-xs uppercase tracking-wider transition-all ${
                          authTab === 'login' ? 'bg-primary text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Ya tengo Cuenta
                      </button>
                    </div>

                    {authError && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-semibold leading-relaxed">
                        ⚠️ {authError}
                      </div>
                    )}

                    <form onSubmit={handleAuthSubmit} className="space-y-5">
                      {authTab === 'register' ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Tu Nombre</Label>
                              <Input 
                                placeholder="Ej: Juan" 
                                value={formData.firstName} 
                                onChange={e => setFormData({...formData, firstName: e.target.value})} 
                                className="h-12 rounded-xl bg-slate-950 border-none ring-1 ring-white/10 focus:ring-primary font-bold px-4 text-sm text-white" 
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Tu Apellido</Label>
                              <Input 
                                placeholder="Ej: Pérez" 
                                value={formData.lastName} 
                                onChange={e => setFormData({...formData, lastName: e.target.value})} 
                                className="h-12 rounded-xl bg-slate-950 border-none ring-1 ring-white/10 focus:ring-primary font-bold px-4 text-sm text-white" 
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Correo Electrónico</Label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                              <Input 
                                type="email" 
                                placeholder="tu@email.com" 
                                value={formData.email} 
                                onChange={e => setFormData({...formData, email: e.target.value})} 
                                className="h-12 rounded-xl bg-slate-950 border-none ring-1 ring-white/10 focus:ring-primary font-bold pl-12 text-sm text-white" 
                                required 
                              />
                            </div>
                          </div>

                          <div className="space-y-2 animate-in fade-in duration-200">
                            <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">WhatsApp de Contacto</Label>
                            <div className="relative">
                              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                              <Input 
                                placeholder="50588888888" 
                                value={formData.phone} 
                                onChange={e => setFormData({...formData, phone: e.target.value})} 
                                className="h-12 rounded-xl bg-slate-950 border-none ring-1 ring-white/10 focus:ring-primary font-bold pl-12 text-sm text-white" 
                                required
                              />
                            </div>
                            <p className="text-[9px] text-slate-500 italic px-1">Indispensable para soporte post-compra y envío automático de tus accesos.</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Correo Electrónico</Label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                              <Input 
                                type="email" 
                                placeholder="tu@email.com" 
                                value={formData.email} 
                                onChange={e => setFormData({...formData, email: e.target.value})} 
                                className="h-12 rounded-xl bg-slate-950 border-none ring-1 ring-white/10 focus:ring-primary font-bold pl-12 text-sm text-white" 
                                required 
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Contraseña de Acceso</Label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                              <Input 
                                type="password" 
                                placeholder="Ingresa tu contraseña" 
                                value={formData.password} 
                                onChange={e => setFormData({...formData, password: e.target.value})} 
                                className="h-12 rounded-xl bg-slate-950 border-none ring-1 ring-white/10 focus:ring-primary font-bold pl-12 text-sm text-white" 
                                required 
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <Button 
                        type="submit" 
                        disabled={authLoading}
                        className="w-full h-14 rounded-xl bg-primary hover:bg-primary/95 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg transition-all"
                      >
                        {authLoading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                          authTab === 'register' ? "CONTINUAR AL MÉTODO DE PAGO" : "INICIAR SESIÓN Y CONTINUAR"
                        )}
                      </Button>
                    </form>
                  </div>
                ) : (
                  // AUTHENTICATED: SHOW COMPACT DETAILS CONFIRMATION
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center p-4 bg-slate-950 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400"><ShieldCheck className="h-5 w-5" /></div>
                        <div className="text-left">
                          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Sesión Iniciada como</p>
                          <p className="text-xs font-bold text-white truncate max-w-[180px] md:max-w-xs">{user.email}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        onClick={() => auth.signOut()} 
                        className="h-8 px-3 rounded-lg text-slate-400 hover:text-red-400 font-bold text-[10px] uppercase tracking-wider"
                      >
                        Cambiar Cuenta
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-slate-500 ml-1">Nombre</Label>
                        <Input 
                          value={formData.firstName}
                          onChange={e => setFormData({...formData, firstName: e.target.value})}
                          placeholder="Tu Nombre" 
                          className="h-12 rounded-xl bg-slate-950 border-none ring-1 ring-white/5 font-bold px-4 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-slate-500 ml-1">Apellido</Label>
                        <Input 
                          value={formData.lastName}
                          onChange={e => setFormData({...formData, lastName: e.target.value})}
                          placeholder="Tu Apellido" 
                          className="h-12 rounded-xl bg-slate-950 border-none ring-1 ring-white/5 font-bold px-4 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-slate-500 ml-1">Número de WhatsApp</Label>
                      <Input 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        placeholder="Ej: 50588888888" 
                        className="h-12 rounded-xl bg-slate-950 border-none ring-1 ring-white/5 font-bold px-4 text-xs text-white"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* STEP 2: METODO DE PAGO (PAYPAL CHECKOUT) */}
            <Card className={`border-none shadow-3xl bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden ring-1 ring-white/10 transition-all duration-500 ${
              !step1Confirmed ? 'opacity-30 pointer-events-none' : ''
            }`}>
              <CardHeader className="bg-slate-950 p-8 border-b border-white/5">
                <CardTitle className="text-lg font-headline font-black uppercase italic flex items-center gap-4 text-white">
                  <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center text-slate-950 shadow-lg"><CreditCard className="h-5 w-5" /></div>
                  02. Pasarela de Pago Oficial
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {!step1Confirmed ? (
                  <div className="p-8 bg-slate-950/40 rounded-2xl border border-dashed border-white/5 text-center text-slate-500">
                    <p className="text-xs font-bold uppercase tracking-wider">Completa o inicia sesión en el Paso 1 para habilitar el pago.</p>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="p-4 bg-slate-950/80 rounded-2xl border border-white/5 text-slate-300 text-[11px] leading-relaxed flex gap-3 font-medium">
                      <ShieldCheck className="h-5 w-5 text-green-500 shrink-0" />
                      A continuación, selecciona tu método preferido. Puedes pagar de forma instantánea usando tu cuenta **PayPal** o directamente con tus tarjetas de **Débito o Crédito** locales.
                    </div>

                    {loadingPayment ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Verificando transacción en PayPal...</p>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-950 rounded-2xl border border-white/5">
                        {/* PayPal Button Container Target */}
                        <div id="paypal-button-container" className="w-full min-h-[150px] relative z-10" />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* LADO DERECHO: RESUMEN DE COMPRA */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            <Card className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] rounded-[2.5rem] bg-slate-950 border border-white/5 text-white overflow-hidden">
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-slate-950 shadow-lg">
                    <Zap className="h-6 w-6 fill-current" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-headline font-black uppercase italic tracking-tight">Tu Compra</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Socio Ref: {affiliateId.substring(0,8).toUpperCase()}</p>
                  </div>
                </div>

                {/* Visualizador de múltiples fotos */}
                {product && (
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    {(() => {
                      const imgs = product.images && product.images.length > 0 ? product.images : [product.imageUrl || 'https://picsum.photos/seed/product/600/400'];
                      const activeImg = imgs[activeImgIndex] || imgs[0];
                      return (
                        <>
                          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                            <Image 
                              src={activeImg} 
                              alt={product.name || "Producto"} 
                              fill 
                              className="object-cover" 
                              unoptimized
                            />
                          </div>
                          {imgs.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto py-1 justify-center scrollbar-none">
                              {imgs.map((img: string, idx: number) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setActiveImgIndex(idx)}
                                  className={`relative h-10 w-10 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                                    activeImgIndex === idx ? 'border-primary scale-105 shadow-md' : 'border-white/10 hover:border-white/20'
                                  }`}
                                >
                                  <Image src={img} alt="" fill className="object-cover" unoptimized />
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="space-y-4 border-t border-white/5 pt-6 text-left">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Capacitación Seleccionada</span>
                    <span className="text-sm font-black uppercase text-white leading-tight break-words">{product?.name}</span>
                  </div>
                  
                  <div className="p-4 bg-slate-900/60 rounded-2xl space-y-2 border border-white/5 text-xs text-slate-400">
                    <div className="flex justify-between font-medium">
                      <span>Acceso Vitalicio</span>
                      <span className="text-white font-bold">✓ Incluido</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Módulos Formativos</span>
                      <span className="text-white font-bold">✓ Desbloqueados</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Soporte Académico</span>
                      <span className="text-white font-bold">✓ Habilitado</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-6 border-y border-white/5">
                    <span className="text-base font-black text-slate-400 uppercase italic">Inversión Total:</span>
                    <span className="text-4xl font-black text-primary tracking-tighter">${product?.price?.toFixed(2)} <span className="text-xs text-white uppercase font-bold tracking-normal italic ml-1">USD</span></span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 text-[9px] font-black text-slate-500 uppercase tracking-widest pt-2">
                  <ShieldCheck className="h-4 w-4" /> Pagos auditados por la pasarela oficial
                </div>
              </div>
            </Card>

            <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-4">
              <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed text-left">
                Esta es una transacción segura. Al realizar la compra, autorizas el débito a través de la red oficial de PayPal y la habilitación inmediata de los contenidos del curso en tu panel de miembro.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#07070a]"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>}>
      <CheckoutContent />
    </Suspense>
  )
}
