"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useFirestore } from '@/firebase'
import { collection, query, where, getDocs, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore'
import { 
  ShieldCheck, 
  CheckCircle2, 
  Star, 
  MessageSquare, 
  Send, 
  Zap, 
  Clock, 
  Award, 
  HelpCircle, 
  ShoppingBag, 
  ChevronRight, 
  ArrowRight, 
  Sparkles,
  Phone,
  Mail,
  User,
  Lock,
  ThumbsUp,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'

export default function PublishedPage() {
  const params = useParams()
  const rawSubdomain = params?.subdomain as string
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()

  const [pageData, setPageData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Formulario de Captura de Clientes (Leads)
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const [submittingLead, setSubmittingLead] = useState(false)

  // Temporizador de Oferta Countdown
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number }>({ minutes: 15, seconds: 0 })

  useEffect(() => {
    async function fetchPage() {
      if (!db || !rawSubdomain) return
      setLoading(true)

      try {
        const decoded = decodeURIComponent(rawSubdomain).toLowerCase().trim()
        
        // 1. Buscar por subdominio
        const pagesRef = collection(db, 'affiliate_pages')
        const q = query(pagesRef, where('subdomain', '==', decoded))
        const querySnap = await getDocs(q)

        let foundPage: any = null

        if (!querySnap.empty) {
          const docSnap = querySnap.docs[0]
          foundPage = { id: docSnap.id, ...docSnap.data() }
        } else {
          // 2. Buscar por dominio personalizado
          const qCustom = query(pagesRef, where('customDomain', '==', decoded))
          const querySnapCustom = await getDocs(qCustom)
          if (!querySnapCustom.empty) {
            const docSnap = querySnapCustom.docs[0]
            foundPage = { id: docSnap.id, ...docSnap.data() }
          } else {
            // 3. Fallback: buscar por ID directo
            const qById = query(pagesRef, where('__name__', '==', rawSubdomain))
            const querySnapById = await getDocs(qById)
            if (!querySnapById.empty) {
              const docSnap = querySnapById.docs[0]
              foundPage = { id: docSnap.id, ...docSnap.data() }
            }
          }
        }

        if (foundPage && foundPage.status !== 'suspended') {
          setPageData(foundPage)
          
          // Incrementar contador de visitas
          try {
            const pageDocRef = doc(db, 'affiliate_pages', foundPage.id)
            updateDoc(pageDocRef, { 'stats.views': increment(1) }).catch(() => {})
          } catch (e) {}

          // Inicializar timer si la página lo requiere
          if (foundPage.timerMinutes) {
            setTimeLeft({ minutes: foundPage.timerMinutes, seconds: 0 })
          }
        } else {
          setNotFound(true)
        }
      } catch (err) {
        console.error('Error cargando página publicada:', err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    fetchPage()
  }, [db, rawSubdomain])

  // Countdown timer effect
  useEffect(() => {
    if (!pageData) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 }
        } else {
          return { minutes: 0, seconds: 0 }
        }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [pageData])

  // Manejar Click de Compra / CTA con seguimiento de conversión
  const handleCtaClick = (targetUrl?: string) => {
    const url = targetUrl && targetUrl !== '#' ? targetUrl : (pageData?.affiliateLink || '#')

    // Incrementar clicks en stats
    if (db && pageData?.id) {
      try {
        const pageDocRef = doc(db, 'affiliate_pages', pageData.id)
        updateDoc(pageDocRef, { 'stats.clicks': increment(1) }).catch(() => {})
      } catch (e) {}
    }

    // Ejecutar Pixel si está configurado
    if (typeof window !== 'undefined' && (window as any).fbq && pageData?.tracking?.facebookPixelId) {
      (window as any).fbq('track', 'InitiateCheckout', {
        content_name: pageData.title,
        value: pageData.price || 0,
        currency: 'USD'
      })
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank')
    } else if (url.startsWith('#')) {
      const el = document.querySelector(url)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.open(url, '_blank')
    }
  }

  // Enviar Lead
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadForm.name || (!leadForm.email && !leadForm.phone)) {
      toast({
        variant: 'destructive',
        title: 'Formulario incompleto',
        description: 'Por favor ingresa tu nombre y al menos un correo o teléfono.'
      })
      return
    }

    setSubmittingLead(true)
    try {
      if (db) {
        await addDoc(collection(db, 'page_leads'), {
          pageId: pageData.id,
          subdomain: pageData.subdomain,
          affiliateId: pageData.userId,
          name: leadForm.name,
          email: leadForm.email,
          phone: leadForm.phone,
          message: leadForm.message,
          createdAt: serverTimestamp()
        })

        // Incrementar leads en stats de la página
        updateDoc(doc(db, 'affiliate_pages', pageData.id), {
          'stats.leads': increment(1)
        }).catch(() => {})
      }

      setLeadSubmitted(true)
      toast({
        title: '¡Información Enviada con Éxito! 🎉',
        description: 'Un asesor se pondrá en contacto contigo en breve.'
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al enviar',
        description: 'No se pudo registrar la solicitud. Intenta nuevamente.'
      })
    } finally {
      setSubmittingLead(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Cargando experiencia SyncConnect...</p>
        </div>
      </div>
    )
  }

  if (notFound || !pageData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="h-16 w-16 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tight">Página No Disponible</h1>
            <p className="text-slate-400 text-sm">
              El subdominio <span className="font-mono text-primary font-bold">{rawSubdomain}.syncconnect.online</span> no se encuentra activo o ha sido pausado por su autor.
            </p>
          </div>
          <Button 
            onClick={() => router.push('/')} 
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-xl"
          >
            Ir a SyncConnect.online
          </Button>
        </div>
      </div>
    )
  }

  const { theme, sections, header, footerMessage, whatsappConfig, tracking, affiliateLink } = pageData
  const primaryColor = theme?.primaryColor || '#2563eb'
  const accentColor = theme?.accentColor || '#16a34a'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-primary/30 overflow-x-hidden">
      
      {/* INYECCIÓN DE PIXEL / METADATOS EN EL ENCABEZADO */}
      {tracking?.facebookPixelId && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${tracking.facebookPixelId}');
              fbq('track', 'PageView');
            `
          }}
        />
      )}

      {/* ENCABEZADO DE LA PÁGINA */}
      <nav className="h-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-[100] px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg shadow-lg rotate-3">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <span className="font-black text-lg md:text-xl uppercase tracking-tight text-white">
            {header?.brandName || pageData.title || 'SyncConnect'}
          </span>
        </div>

        <Button 
          onClick={() => handleCtaClick(header?.ctaUrl || affiliateLink)}
          className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:scale-105"
        >
          {header?.ctaText || 'Comprar Ahora 🚀'}
        </Button>
      </nav>

      {/* RENDERIZADO DINÁMICO DE SECCIONES DE LA PÁGINA */}
      <div className="space-y-0">
        {sections && sections.map((sec: any, index: number) => {
          const content = sec.content || {}

          switch (sec.type) {
            
            // SECCIÓN HERO
            case 'hero':
              return (
                <React.Fragment key={sec.id || index}>
                  <section className="relative py-24 md:py-36 px-6 overflow-hidden border-b border-white/5">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.15),transparent_70%)] pointer-events-none" />
                    
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
                      <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
                        {content.badgeText && (
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-black uppercase tracking-widest">
                            <Sparkles className="h-4 w-4" /> {content.badgeText}
                          </div>
                        )}

                        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white leading-[1.05]">
                          {content.headline || 'Transforma Tus Resultados Hoy'}
                        </h1>

                        <p className="text-lg md:text-xl text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
                          {content.subheadline || 'Descubre la solución más completa creada para acelerar tus ventas y llevar tu negocio al siguiente nivel.'}
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                          <Button 
                            onClick={() => handleCtaClick(content.ctaUrl || affiliateLink)}
                            size="lg"
                            className="w-full sm:w-auto h-16 px-10 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base uppercase tracking-wider rounded-2xl shadow-[0_10px_40px_rgba(22,163,74,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                          >
                            {content.ctaText || 'OBTENER ACCESO INMEDIATO'}
                            <ArrowRight className="h-5 w-5" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-center lg:justify-start gap-6 pt-4 text-xs font-bold text-slate-400">
                          <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Compra 100% Segura</span>
                          <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-amber-400" /> Acceso Instantáneo</span>
                        </div>
                      </div>

                      <div className="lg:col-span-5 relative">
                        <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900 group">
                          {content.imageUrl ? (
                            <img 
                              src={content.imageUrl} 
                              alt={content.headline || 'Hero'} 
                              className="w-full h-auto object-cover rounded-3xl group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="aspect-video bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-8 text-center space-y-4">
                              <ShoppingBag className="h-16 w-16 text-primary animate-bounce" />
                              <span className="text-sm font-black uppercase text-slate-300">Oferta Exclusiva Verificada</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* CATÁLOGO MULTI-PRODUCTO ESTILO SHOPIFY */}
                  {Array.isArray(pageData?.selectedProductsData) && pageData.selectedProductsData.length > 0 && (
                    <section className="py-20 px-6 bg-slate-900/60 border-b border-white/5">
                      <div className="max-w-6xl mx-auto space-y-12">
                        <div className="text-center space-y-3 max-w-2xl mx-auto">
                          <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-widest border border-emerald-500/20">
                            🛒 Catálogo Destacado de la Tienda
                          </span>
                          <h2 className="text-3xl sm:text-5xl font-black uppercase text-white">
                            Productos Disponibles
                          </h2>
                          <p className="text-slate-400 text-sm">
                            Selecciona el producto de tu interés y accede inmediatamente a tu formación o paquete digital.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {pageData.selectedProductsData.map((prod: any, pIdx: number) => (
                            <div key={prod.id || pIdx} className="bg-slate-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between hover:border-emerald-500/50 transition-all group">
                              <div>
                                <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                                  <img 
                                    src={prod.image || 'https://picsum.photos/seed/product/600/400'} 
                                    alt={prod.name} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                  {prod.originalPrice && (
                                    <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg">
                                      OFERTA ESPECIAL
                                    </span>
                                  )}
                                </div>

                                <div className="p-6 space-y-3">
                                  <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                                    {prod.name}
                                  </h3>
                                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                                    {prod.description || 'Producto exclusivo de formación con acceso directo y soporte completo.'}
                                  </p>

                                  <div className="flex items-baseline gap-2 pt-2">
                                    <span className="text-2xl font-black text-emerald-400">${prod.price || 15} USD</span>
                                    {prod.originalPrice && (
                                      <span className="text-xs text-slate-500 line-through">${prod.originalPrice} USD</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="p-6 pt-0">
                                <Button 
                                  onClick={() => handleCtaClick(`/checkout?prod=${prod.id}&ref=${pageData.userId || ''}`)}
                                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all"
                                >
                                  COMPRAR AHORA 🚀
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                </React.Fragment>
              )

            // CARACTERÍSTICAS Y BENEFICIOS
            case 'features':
              return (
                <section key={sec.id || index} className="py-24 px-6 bg-slate-900/40 border-b border-white/5">
                  <div className="max-w-6xl mx-auto space-y-16">
                    <div className="text-center space-y-4 max-w-3xl mx-auto">
                      <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
                        {content.title || '¿Por qué elegir esta solución?'}
                      </h2>
                      <p className="text-slate-400 text-base md:text-lg">
                        {content.subtitle || 'Diseñado meticulosamente para garantizar la máxima calidad y satisfacción.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {content.items && content.items.map((item: any, idx: number) => (
                        <div key={idx} className="p-8 rounded-3xl bg-slate-900/80 border border-white/10 space-y-4 hover:border-primary/50 transition-all shadow-xl group">
                          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                            <Award className="h-6 w-6" />
                          </div>
                          <h3 className="text-xl font-bold uppercase text-white">{item.title}</h3>
                          <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )

            // SECCIÓN DE VIDEO
            case 'video':
              return (
                <section key={sec.id || index} className="py-24 px-6 bg-slate-950 border-b border-white/5">
                  <div className="max-w-4xl mx-auto text-center space-y-10">
                    <div className="space-y-4">
                      <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white">
                        {content.title || 'Mira Este Video Explicativo'}
                      </h2>
                      <p className="text-slate-400 text-base">
                        {content.subtitle || 'Descubre exactamente cómo funciona y cómo puede ayudarte hoy mismo.'}
                      </p>
                    </div>

                    {content.videoUrl ? (
                      <div className="aspect-video w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900">
                        <iframe 
                          src={content.videoUrl} 
                          title="Video" 
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="aspect-video w-full rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500 font-bold uppercase">
                        Video de Presentación
                      </div>
                    )}
                  </div>
                </section>
              )

            // TEMPORIZADOR Y LLAMADO A LA ACCIÓN (TIMER CTA)
            case 'cta':
            case 'timer_cta':
              return (
                <section key={sec.id || index} className="py-20 px-6 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-b border-white/5 text-center">
                  <div className="max-w-4xl mx-auto space-y-8 bg-slate-900/90 border border-emerald-500/30 p-10 md:p-16 rounded-[3rem] shadow-[0_0_50px_rgba(22,163,74,0.15)] relative overflow-hidden">
                    
                    <div className="space-y-4">
                      <span className="px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-widest border border-emerald-500/20">
                        ⚡ Oferta por Tiempo Limitado
                      </span>
                      <h2 className="text-3xl md:text-6xl font-black uppercase tracking-tight text-white">
                        {content.title || '¡No Dejes Pasar Esta Oportunidad!'}
                      </h2>
                      <p className="text-slate-300 text-base md:text-lg">
                        {content.subtitle || 'Obtén acceso inmediato antes de que expire la promoción.'}
                      </p>
                    </div>

                    {/* COUNTDOWN TIMER */}
                    <div className="flex items-center justify-center gap-4 py-4">
                      <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 min-w-[90px]">
                        <span className="text-4xl font-black text-emerald-400 font-mono">
                          {String(timeLeft.minutes).padStart(2, '0')}
                        </span>
                        <span className="block text-[10px] font-bold uppercase text-slate-500 mt-1">Minutos</span>
                      </div>
                      <span className="text-3xl font-black text-emerald-400">:</span>
                      <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 min-w-[90px]">
                        <span className="text-4xl font-black text-emerald-400 font-mono">
                          {String(timeLeft.seconds).padStart(2, '0')}
                        </span>
                        <span className="block text-[10px] font-bold uppercase text-slate-500 mt-1">Segundos</span>
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button 
                        onClick={() => handleCtaClick(content.ctaUrl || affiliateLink)}
                        size="lg"
                        className="h-20 px-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg uppercase tracking-wider rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95"
                      >
                        {content.ctaText || 'APROVECHAR DESCUENTO AHORA'}
                      </Button>
                    </div>
                  </div>
                </section>
              )

            // FORMULARIO DE CAPTURA DE CLIENTES (LEADS)
            case 'lead_form':
              return (
                <section key={sec.id || index} id="lead-form-section" className="py-24 px-6 bg-slate-950 border-b border-white/5">
                  <div className="max-w-2xl mx-auto bg-slate-900 border border-white/10 rounded-3xl p-8 md:p-12 space-y-8 shadow-2xl">
                    <div className="text-center space-y-3">
                      <h2 className="text-3xl font-black uppercase text-white">
                        {content.title || 'Solicita Más Información'}
                      </h2>
                      <p className="text-slate-400 text-sm">
                        {content.subtitle || 'Déjanos tus datos y un especialista se comunicará contigo de inmediato.'}
                      </p>
                    </div>

                    {leadSubmitted ? (
                      <div className="p-8 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
                        <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
                        <h3 className="text-lg font-bold text-white uppercase">¡Solicitud Recibida!</h3>
                        <p className="text-slate-300 text-xs">
                          Gracias por tu interés. Revisaremos tus datos y te contactaremos en breve.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleLeadSubmit} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-slate-400">Nombre Completo</label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                            <Input 
                              required
                              placeholder="Ej. Juan Pérez"
                              value={leadForm.name}
                              onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                              className="pl-10 h-12 bg-slate-950 border-slate-800 text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-slate-400">Correo Electrónico</label>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                              <Input 
                                type="email"
                                placeholder="tu@correo.com"
                                value={leadForm.email}
                                onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                                className="pl-10 h-12 bg-slate-950 border-slate-800 text-white"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-slate-400">WhatsApp / Teléfono</label>
                            <div className="relative">
                              <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                              <Input 
                                placeholder="+505 8888 8888"
                                value={leadForm.phone}
                                onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                                className="pl-10 h-12 bg-slate-950 border-slate-800 text-white"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-slate-400">Mensaje o Consulta (Opcional)</label>
                          <Textarea 
                            placeholder="Escribe aquí tus preguntas..."
                            value={leadForm.message}
                            onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                            className="bg-slate-950 border-slate-800 text-white min-h-[90px]"
                          />
                        </div>

                        <Button 
                          type="submit"
                          disabled={submittingLead}
                          className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-xl"
                        >
                          {submittingLead ? <Loader2 className="h-5 w-5 animate-spin" /> : 'ENVIAR SOLICITUD DE INFORMACIÓN'}
                        </Button>
                      </form>
                    )}
                  </div>
                </section>
              )

            // TESTIMONIOS
            case 'testimonials':
              return (
                <section key={sec.id || index} className="py-24 px-6 bg-slate-900/30 border-b border-white/5">
                  <div className="max-w-6xl mx-auto space-y-16">
                    <div className="text-center space-y-3">
                      <h2 className="text-3xl sm:text-5xl font-black uppercase text-white">
                        {content.title || 'Lo Que Dicen Nuestros Clientes'}
                      </h2>
                      <p className="text-slate-400 text-base">
                        {content.subtitle || 'Historias reales de satisfacción y resultados confirmados.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {content.items && content.items.map((t: any, idx: number) => (
                        <div key={idx} className="p-8 rounded-3xl bg-slate-900 border border-white/10 space-y-4 shadow-xl">
                          <div className="flex gap-1 text-amber-400">
                            {[...Array(t.rating || 5)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-current" />
                            ))}
                          </div>
                          <p className="text-slate-300 text-sm italic leading-relaxed">
                            "{t.desc}"
                          </p>
                          <div className="pt-2 border-t border-white/5">
                            <span className="font-bold text-white text-sm block">{t.author || 'Cliente Satisfecho'}</span>
                            <span className="text-xs text-slate-500 font-medium">{t.role || 'Usuario Verificado'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )

            // PREGUNTAS FRECUENTES (FAQ)
            case 'faq':
              return (
                <section key={sec.id || index} className="py-24 px-6 bg-slate-950 border-b border-white/5">
                  <div className="max-w-4xl mx-auto space-y-12">
                    <div className="text-center space-y-3">
                      <h2 className="text-3xl sm:text-5xl font-black uppercase text-white">
                        {content.title || 'Preguntas Frecuentes'}
                      </h2>
                      <p className="text-slate-400 text-base">
                        {content.subtitle || 'Respuestas rápidas a las dudas más comunes.'}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {content.items && content.items.map((item: any, idx: number) => (
                        <div key={idx} className="p-6 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
                          <h3 className="font-bold text-white text-base flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                            {item.q}
                          </h3>
                          <p className="text-slate-400 text-sm leading-relaxed pl-7">
                            {item.a}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )

            // GARANTÍA
            case 'guarantee':
              return (
                <section key={sec.id || index} className="py-20 px-6 bg-slate-900/60 border-b border-white/5 text-center">
                  <div className="max-w-3xl mx-auto space-y-6 bg-slate-900 border border-amber-500/30 p-10 rounded-3xl shadow-xl">
                    <div className="h-16 w-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
                      <ShieldCheck className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl md:text-4xl font-black uppercase text-white">
                      Garantía Incondicional de {content.guaranteeDays || 7} Días
                    </h2>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                      {content.guaranteeText || 'Prueba el producto sin ningún riesgo. Si por cualquier motivo no estás 100% satisfecho, te devolvemos la totalidad de tu dinero sin preguntas.'}
                    </p>
                  </div>
                </section>
              )

            default:
              return null
          }
        })}
      </div>

      {/* BOTÓN FLOTANTE DE WHATSAPP */}
      {whatsappConfig?.enabled && whatsappConfig?.number && (
        <a
          href={`https://wa.me/${whatsappConfig.number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappConfig.message || 'Hola, me interesa obtener información sobre la oferta.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-[200] bg-emerald-500 hover:bg-emerald-400 text-white p-4 rounded-full shadow-[0_10px_30px_rgba(34,197,94,0.5)] transition-all hover:scale-110 active:scale-95 flex items-center gap-3 font-bold text-xs uppercase tracking-wider"
        >
          <Phone className="h-6 w-6 fill-current" />
          <span className="hidden sm:inline">{whatsappConfig.buttonText || '¿Dudas? Chatea con un Asesor'}</span>
        </a>
      )}

      {/* PIE DE PÁGINA */}
      <footer className="py-12 px-6 border-t border-white/10 bg-slate-950 text-center space-y-6">
        <p className="text-xs text-slate-500 font-medium max-w-xl mx-auto">
          {footerMessage || '© 2026 SyncConnect Platform. Todos los derechos reservados. Las ventas y comisiones son procesadas de manera transparente y segura.'}
        </p>
        <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          <span>Garantía de Satisfacción</span>
          <span>•</span>
          <span>Pago Encriptado SSL</span>
          <span>•</span>
          <span>Soporte 24/7</span>
        </div>
      </footer>
    </div>
  )
}
