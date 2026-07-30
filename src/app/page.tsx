"use client"

import { useState, useEffect, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  Flame, 
  Search, 
  ShoppingBag, 
  BookOpen, 
  TrendingUp, 
  Award, 
  ShieldCheck, 
  DollarSign, 
  CreditCard, 
  Users, 
  Zap, 
  Play, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Star, 
  Globe2, 
  Lock, 
  HelpCircle, 
  ChevronDown, 
  Layers, 
  Video, 
  Tv, 
  Smartphone,
  BarChart3,
  ExternalLink,
  PlusCircle,
  Copy,
  Check
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase'
import { 
  setPersistence, 
  browserLocalPersistence, 
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { SyncConnectLogo as HotmartLogo } from '@/components/SyncConnectLogo'
import { useToast } from '@/hooks/use-toast'
import { getFreeSpotsInfo, FreeSpotInfo } from '@/lib/free-spots'
import { OnboardingGuideModal } from '@/components/OnboardingGuideModal'

const SYNCCONNECT_CATEGORIES = [
  { id: 'all', label: '🔥 Todos los Productos' },
  { id: 'cursos', label: '🎓 Cursos Online' },
  { id: 'ebooks', label: '📚 Ebooks & Guías' },
  { id: 'software', label: '💻 Software & SaaS' },
  { id: 'membresias', label: '👑 Membresías VIP' },
]

const SYNCCONNECT_PRODUCTS = [
  {
    id: 'prod-1',
    title: 'Masterclass: Tráfico Pago & Meta Ads 2026 Pro',
    category: 'Cursos Online',
    producer: 'Avanza Digital Academy',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
    temp: 150,
    blueprint: '100%',
    rating: 4.9,
    reviews: 1420,
    price: '$97.00 USD',
    commission: '$77.60 USD',
    commissionRate: '80%',
    cyclingLink: 'https://syncconnect.com/cycling/ref/M92817362P',
    type: 'Curso Online con Campus SyncConnect',
    description: 'Aprende a escalar tus campañas publicitarias de $0 a $10,000/mes con estrategias validadas de retargeting y funnels.'
  },
  {
    id: 'prod-2',
    title: 'Ebook: Hackea tu Mente Financiera - De Cero a Inversionista',
    category: 'Ebooks & Guías',
    producer: 'Diego R. - Finanzas Globales',
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
    temp: 145,
    blueprint: '98%',
    rating: 4.8,
    reviews: 890,
    price: '$27.00 USD',
    commission: '$21.60 USD',
    commissionRate: '80%',
    cyclingLink: 'https://syncconnect.com/cycling/ref/H81726354K',
    type: 'Ebook en PDF Interactivo',
    description: 'Manual paso a paso para organizar tus ingresos, eliminar deudas y construir tu portafolio de inversión rentable.'
  },
  {
    id: 'prod-3',
    title: 'Software BotPro IA - Automatización & CRM',
    category: 'Software & SaaS',
    producer: 'TechStudio Solutions',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
    temp: 130,
    blueprint: '96%',
    rating: 5.0,
    reviews: 650,
    price: '$149.00 USD',
    commission: '$89.40 USD',
    commissionRate: '60%',
    cyclingLink: 'https://syncconnect.com/cycling/ref/B99182371S',
    type: 'Software con Licencia Recurrente',
    description: 'Infraestructura en la nube con IA integrada para responder mensajes, enviar secuencias y gestionar prospectos 24/7.'
  },
  {
    id: 'prod-4',
    title: 'Comunidad Exclusiva: Emprendedores de Alto Rendimiento',
    category: 'Membresías VIP',
    producer: 'Club Impulso Latam',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
    temp: 120,
    blueprint: '99%',
    rating: 4.9,
    reviews: 512,
    price: '$49.00 USD/mes',
    commission: '$29.40 USD/mes',
    commissionRate: '60%',
    cyclingLink: 'https://syncconnect.com/cycling/ref/C12983719C',
    type: 'Suscripción Recurrente SyncConnect',
    description: 'Accede a sesiones en vivo semanales, plantillas de embudos de venta y networking con top afiliados.'
  },
  {
    id: 'prod-5',
    title: 'Diplomado en Inteligencia Artificial Generativa y Prompts',
    category: 'Cursos Online',
    producer: 'Futuro IA Institute',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
    temp: 115,
    blueprint: '97%',
    rating: 4.8,
    reviews: 340,
    price: '$120.00 USD',
    commission: '$84.00 USD',
    commissionRate: '70%',
    cyclingLink: 'https://syncconnect.com/cycling/ref/D91827364F',
    type: 'Curso en Campus SyncConnect con Certificado',
    description: 'Domina ChatGPT, Midjourney y automatizaciones sin código para multiplicar tu productividad profesional.'
  },
  {
    id: 'prod-6',
    title: 'Nutrición Keto & Ayuno Intermitente - Guía Definitiva',
    category: 'Ebooks & Guías',
    producer: 'Dra. Elena Vital',
    image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&q=80&w=800',
    temp: 110,
    blueprint: '95%',
    rating: 4.9,
    reviews: 780,
    price: '$19.00 USD',
    commission: '$15.20 USD',
    commissionRate: '80%',
    cyclingLink: 'https://syncconnect.com/cycling/ref/N38219382E',
    type: 'Ebook + Recetario Digital',
    description: 'Planes de alimentación de 30 días, recetas deliciosas y explicaciones científicas para transformar tu salud.'
  }
]

function SyncConnectLandingContent() {
  const { toast } = useToast()
  const auth = useAuth()
  const db = useFirestore()
  const router = useRouter()
  const { user, isUserLoading } = useUser()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState<typeof SYNCCONNECT_PRODUCTS[0] | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // 6 Free spots counter state
  const [freeSpots, setFreeSpots] = useState<FreeSpotInfo>({
    totalFreeSpots: 6,
    usedFreeSpots: 0,
    remainingFreeSpots: 6,
    isFreeEligible: true
  })

  useEffect(() => {
    getFreeSpotsInfo(db).then(setFreeSpots);
  }, [db]);

  // Interactive FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const filteredProducts = SYNCCONNECT_PRODUCTS.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category.toLowerCase().includes(selectedCategory)
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.producer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const copyCyclingLink = (link: string) => {
    navigator.clipboard.writeText(link)
    setCopiedLink(true)
    toast({
      title: '¡Enlace Cycling Copiado! 🚴‍♂️',
      description: 'Copiado al portapapeles. Ya puedes compartir tu enlace de afiliación Cycling para generar comisiones.',
    })
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const faqItems = [
    {
      q: "¿Cuánto cuesta la activación de la cuenta en SyncConnect?",
      a: "La activación para Afiliados tiene un costo único de $6 USD y para Vendedores/Productores un costo de $7 USD. Ambos incluyen acceso inmediato y completo a todo el ecosistema de herramientas."
    },
    {
      q: "¿Qué es SixFigure / SyncConnect y cómo generar ingresos?",
      a: "SyncConnect (SixFigure) es el ecosistema global para crear, vender y comercializar productos digitales con IA. Puedes generar ingresos como Vendedor ($7 USD) o como Afiliado ($6 USD)."
    },
    {
      q: "¿Cómo funcionan las comisiones y los enlaces de afiliado Cycling?",
      a: "Un enlace de afiliación Cycling es una URL única asignada a tu perfil. Cuando un comprador accede mediante tu enlace Cycling, el sistema atribuye la venta y transfiere tu comisión automáticamente."
    },
    {
      q: "¿Cómo se realiza la activación automatizada?",
      a: "Los pagos de membresía se procesan de forma segura mediante SyncConnect Pay y recibes una confirmación e inicio de sesión instantáneo."
    },
    {
      q: "¿Cómo funciona el Copiloto de Inteligencia Artificial para ventas?",
      a: "Cada usuario tiene acceso a su propio Copiloto de IA de Ventas que conoce el catálogo completo de productos, responde objeciones de clientes y redacta guiones persuasivos listos para enviar."
    }
  ]

  return (
    <div className="min-h-screen bg-[#0b132b] text-slate-100 flex flex-col font-sans selection:bg-[#FF5500] selection:text-white">
      
      {/* Onboarding Walkthrough Modal */}
      <OnboardingGuideModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
        autoShowOnFirstVisit={false} 
      />

      {/* Navigation Header */}
      <header className="bg-[#0b132b]/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="shrink-0">
              <HotmartLogo size="md" variant="dark" />
            </Link>

            <nav className="hidden lg:flex items-center gap-5 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Link href="#mercado" className="hover:text-[#FF5500] transition-colors flex items-center gap-1.5">
                <ShoppingBag className="h-4 w-4 text-[#FF5500]" /> Mercado
              </Link>
              <Link href="#sync-pay" className="hover:text-[#FF5500] transition-colors flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-[#FF5500]" /> SyncConnect Pay
              </Link>
              <Link href="#sync-campus" className="hover:text-[#FF5500] transition-colors flex items-center gap-1.5">
                <Tv className="h-4 w-4 text-[#FF5500]" /> Campus Virtual
              </Link>
              <Link href="#afiliados" className="hover:text-[#FF5500] transition-colors flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#FF5500]" /> Afiliados Cycling
              </Link>
            </nav>
          </div>

          {/* Compact & Neat Buttons - Perfectly Aligned */}
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              onClick={() => setShowOnboarding(true)}
              variant="outline" 
              className="border-amber-500/40 text-amber-300 hover:text-white hover:bg-amber-500/20 text-[10px] font-bold uppercase tracking-wider px-2 h-7 rounded-md hidden sm:flex items-center"
            >
              <Sparkles className="h-3 w-3 mr-1 text-amber-400" /> Guía
            </Button>

            <Button asChild variant="ghost" className="text-slate-200 hover:text-white hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider px-2.5 h-7 rounded-md">
              <Link href="/auth/login">Iniciar Sesión</Link>
            </Button>

            {/* Compact Registration Button - Small, neat, right beside login */}
            <Button asChild className="bg-[#FF5500] hover:bg-[#E63900] text-white font-black text-[10px] uppercase tracking-wider rounded-md px-2.5 h-7 shadow-sm shadow-[#FF5500]/25 transition-transform hover:scale-105 active:scale-95">
              <Link href="/auth/register/role" className="flex items-center gap-1">
                <PlusCircle className="h-3 w-3" /> Registrarse
              </Link>
            </Button>
          </div>
        </div>
      </header>


      <main className="flex-1 space-y-20 pb-20">
        
        {/* HERO SECTION */}
        <section className="relative py-20 px-6 overflow-hidden bg-gradient-to-b from-[#0b132b] via-[#1c2541] to-[#0b132b]">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#FF5500]/15 rounded-full blur-[140px] pointer-events-none" />
          
          <div className="max-w-6xl mx-auto text-center space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] text-xs font-black uppercase tracking-widest shadow-inner">
              <Flame className="h-4 w-4 fill-[#FF5500] animate-pulse" /> ECOSISTEMA DE PRODUCTOS DIGITALES SYNCCONNECT
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-white uppercase italic max-w-5xl mx-auto leading-tight">
              Transforma tu conocimiento con <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E63900] via-[#FF5500] to-[#FFAA00]">SyncConnect & IA</span>
            </h1>

            <p className="text-base md:text-xl text-slate-300 font-medium max-w-3xl mx-auto leading-relaxed">
              Crea cursos online, vende infoproductos, automatiza tu prospección con Inteligencia Artificial y comparte tus enlaces de afiliación Cycling.
            </p>

            {/* Main Interactive Search Bar */}
            <div className="max-w-2xl mx-auto bg-slate-900/90 p-2 rounded-2xl border-2 border-[#FF5500]/40 shadow-2xl flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-400 ml-3 shrink-0" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="¿Qué quieres aprender o promocionar hoy en SyncConnect?"
                className="bg-transparent border-none text-white placeholder:text-slate-400 focus-visible:ring-0 text-sm font-medium h-12"
              />
              <Button onClick={() => {
                const el = document.getElementById('mercado')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }} className="bg-[#FF5500] hover:bg-[#E63900] text-white font-bold text-xs uppercase px-6 h-12 rounded-xl shrink-0">
                Buscar en Mercado
              </Button>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 max-w-4xl mx-auto">
              <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl text-left space-y-3 hover:border-[#FF5500]/50 transition-colors group cursor-pointer" onClick={() => router.push('/auth/register/role')}>
                <div className="h-10 w-10 rounded-xl bg-[#FF5500]/10 text-[#FF5500] flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-white">Soy Vendedor ($7 USD)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">Sube tus productos digitales, administra fotos e imágenes publicitarias deslizables y vende globalmente.</p>
              </div>

              <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl text-left space-y-3 hover:border-[#FF5500]/50 transition-colors group cursor-pointer" onClick={() => router.push('/auth/register/role')}>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white">Soy Afiliado</h3>
                  {freeSpots.isFreeEligible ? (
                    <Badge className="bg-emerald-500 text-slate-950 font-black text-[10px] uppercase animate-pulse">
                      100% GRATIS ($0 USD)
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-[10px]">
                      $6 USD
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {freeSpots.isFreeEligible 
                    ? `¡Invitación gratuita activa! Acceso gratis a enlaces Cycling, Copiloto IA y mercado.` 
                    : `Acceso a enlaces Cycling, Copiloto de IA para ventas y todos los cursos.`}
                </p>
              </div>

              <div className="p-6 bg-slate-900/60 border border-white/10 rounded-2xl text-left space-y-3 hover:border-[#FF5500]/50 transition-colors group cursor-pointer" onClick={() => router.push('/dashboard/buyer')}>
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                  <Tv className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-white">Soy Comprador</h3>
                <p className="text-xs text-slate-400 leading-relaxed">Accede a tus cursos comprados, descarga material de publicidad y consulta al asistente de IA.</p>
              </div>
            </div>

            {/* ACTIVATION INFO BANNER */}
            <div className="max-w-3xl mx-auto mt-6 p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                      {freeSpots.isFreeEligible ? "🎁 Invitaciones Gratuitas Activas" : "Activación de Afiliados"}
                    </span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <p className="text-xs text-slate-200 font-bold mt-0.5">
                    {freeSpots.isFreeEligible ? (
                      <>¡Atención! Hay <strong>{freeSpots.remainingFreeSpots} de {freeSpots.totalFreeSpots} cupos</strong> de registro <strong>GRATUITO ($0 USD)</strong> disponibles.</>
                    ) : (
                      <>Actívate hoy por solo <strong>$6 USD</strong> y accede a enlaces Cycling, Copiloto IA de Ventas y Comisiones Inmediatas.</>
                    )}
                  </p>
                </div>
              </div>

              <Button asChild className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider px-4 h-9 rounded-xl shrink-0 shadow-lg">
                <Link href="/auth/register/role">
                  {freeSpots.isFreeEligible ? "Reclamar Cupo $0 USD" : "Registrarme ($6 USD)"}
                </Link>
              </Button>
            </div>

            {/* Trust Stats Bar */}

            <div className="pt-12 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-3xl font-black text-[#FF5500]">SyncConnect</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Nombre Oficial</p>
              </div>
              <div>
                <p className="text-3xl font-black text-white">100%</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Activación Automática</p>
              </div>
              <div>
                <p className="text-3xl font-black text-emerald-400">Cycling</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Enlaces de Afiliado</p>
              </div>
              <div>
                <p className="text-3xl font-black text-indigo-400">IA 24/7</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Copiloto de Ventas</p>
              </div>
            </div>

          </div>
        </section>

        {/* SYNCCONNECT MARKETPLACE SECTION */}
        <section id="mercado" className="max-w-7xl mx-auto px-6 space-y-8 scroll-mt-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase text-[#FF5500] tracking-wider">
                <Flame className="h-4 w-4 fill-[#FF5500]" /> MERCADO DE AFILIADOS SYNCCONNECT
              </div>
              <h2 className="text-3xl md:text-4xl font-black uppercase italic text-white">
                Catálogo de Infoproductos 🔥
              </h2>
              <p className="text-xs text-slate-400 max-w-xl">
                Selecciona un producto, solicita tu afiliación, obtén tu enlace Cycling y genera ingresos recomendando infoproductos probados.
              </p>
            </div>

            {/* Category Filter Badges */}
            <div className="flex flex-wrap gap-2">
              {SYNCCONNECT_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-[#FF5500] text-white shadow-lg shadow-[#FF5500]/30'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((p) => (
              <Card key={p.id} className="bg-slate-900 border border-white/10 overflow-hidden rounded-3xl hover:border-[#FF5500]/50 transition-all duration-300 group flex flex-col justify-between shadow-xl">
                <div>
                  {/* Image & Badges */}
                  <div className="relative aspect-video overflow-hidden">
                    <img 
                      src={p.image} 
                      alt={p.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge className="bg-slate-950/80 backdrop-blur-md text-[#FF5500] border border-[#FF5500]/40 font-black text-[11px] px-2.5 py-1 flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5 fill-[#FF5500]" /> {p.temp}° Temp
                      </Badge>
                      <Badge className="bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/40 font-bold text-[11px] px-2 py-1">
                        Blueprint {p.blueprint}
                      </Badge>
                    </div>

                    <div className="absolute bottom-3 right-3">
                      <Badge className="bg-[#FF5500] text-white font-black text-xs px-2.5 py-1 shadow-md">
                        {p.commissionRate} Comisión
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#FF5500] tracking-widest">{p.category}</span>
                      <h3 className="text-lg font-bold text-white group-hover:text-[#FF5500] transition-colors leading-snug line-clamp-2">
                        {p.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">Productor: <span className="text-slate-200">{p.producer}</span></p>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>

                    {/* Stats & Rating */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10 text-slate-300">
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="h-3.5 w-3.5 fill-amber-400" /> {p.rating} <span className="text-slate-500 font-normal">({p.reviews})</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{p.type}</span>
                    </div>
                  </div>
                </div>

                {/* Price & Action */}
                <div className="p-6 pt-0 space-y-3">
                  <div className="p-3 bg-slate-950/60 rounded-2xl border border-white/5 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Precio de Venta</span>
                      <span className="text-sm font-extrabold text-white">{p.price}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-emerald-400 font-bold block">Tu Comisión</span>
                      <span className="text-base font-black text-emerald-400">{p.commission}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setSelectedProduct(p)}
                      className="w-full bg-[#FF5500] hover:bg-[#E63900] text-white font-bold text-xs uppercase tracking-wider rounded-xl h-11"
                    >
                      Ver Detalle & Obtener Enlace Cycling
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* SYNCCONNECT PAY FEATURE BANNER */}
        <section id="sync-pay" className="max-w-7xl mx-auto px-6 scroll-mt-24">
          <div className="bg-gradient-to-r from-slate-900 via-[#1c2541] to-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-14 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center shadow-2xl">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <CreditCard className="h-4 w-4" /> ACTIVACIÓN & PAGOS SEGUROS
              </div>

              <h2 className="text-3xl md:text-5xl font-black uppercase italic text-white leading-tight">
                SyncConnect Pay: Activación Automatizada al Instante
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                Nuestra pasarela de pago procesa la membresía de Afiliados ($6 USD) y Vendedores ($7 USD) activando automáticamente la cuenta y enviando un correo personalizado con la plantilla oficial.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Activación automatizada con confirmación por correo personalizado
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Rastreo de enlaces Cycling sin margen de error
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> Copiloto de Inteligencia Artificial para atención y cierre de ventas
                </div>
              </div>

              <Button asChild className="bg-[#FF5500] hover:bg-[#E63900] text-white font-black text-xs uppercase tracking-wider rounded-xl px-6 h-12">
                <Link href="/auth/register/role">Comenzar Ahora en SyncConnect</Link>
              </Button>
            </div>

            {/* Checkout Preview Mockup */}
            <div className="bg-slate-950 p-6 rounded-3xl border border-white/10 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 fill-[#FF5500] text-[#FF5500]" />
                  <span className="font-bold text-sm text-white">Activación SyncConnect Pay</span>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                  Activación Automatizada
                </Badge>
              </div>

              <div className="p-4 bg-slate-900 rounded-2xl border border-white/5 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Perfil Seleccionado</span>
                <p className="font-bold text-sm text-white">Membresía Afiliado Comercial SyncConnect</p>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-slate-400">Total a pagar:</span>
                  <span className="font-black text-[#FF5500] text-lg">$6.00 USD</span>
                </div>
              </div>

              <Button disabled className="w-full bg-emerald-500 text-slate-950 font-black text-xs uppercase h-12 rounded-xl">
                🔒 Pagar y Activar Mi Cuenta Solo
              </Button>
            </div>
          </div>
        </section>

        {/* INTERACTIVE FAQ */}
        <section className="max-w-4xl mx-auto px-6 space-y-8 pt-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black uppercase italic text-white">Preguntas Frecuentes de SyncConnect</h2>
            <p className="text-xs text-slate-400">Resuelve tus dudas sobre registros, activaciones, enlaces Cycling e Inteligencia Artificial.</p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, idx) => (
              <div key={idx} className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-sm text-white flex items-center justify-between gap-4"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`h-5 w-5 text-[#FF5500] transition-transform duration-300 shrink-0 ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="p-5 pt-0 text-xs text-slate-300 leading-relaxed border-t border-white/5 bg-slate-950/40">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* PRODUCT DETAILS MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <Badge className="bg-[#FF5500] text-white font-bold text-xs">{selectedProduct.category}</Badge>
                <h2 className="text-2xl font-black text-white">{selectedProduct.title}</h2>
                <p className="text-xs text-slate-400">Productor: <span className="text-white font-bold">{selectedProduct.producer}</span></p>
              </div>
              <Button onClick={() => setSelectedProduct(null)} variant="ghost" className="text-slate-400 hover:text-white text-lg font-bold">✕</Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Temperatura</span>
                <span className="text-base font-black text-[#FF5500]">🔥 {selectedProduct.temp}°</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Blueprint</span>
                <span className="text-base font-black text-emerald-400">{selectedProduct.blueprint}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Calificación</span>
                <span className="text-base font-black text-amber-400">⭐ {selectedProduct.rating}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Comisión</span>
                <span className="text-base font-black text-emerald-400">{selectedProduct.commissionRate}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-white/5">
              {selectedProduct.description}
            </p>

            <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Tu Enlace de Afiliado (Cycling):</span>
              <div className="flex gap-2">
                <Input value={selectedProduct.cyclingLink} readOnly className="font-mono text-xs bg-slate-900 border-white/10 text-emerald-400" />
                <Button onClick={() => copyCyclingLink(selectedProduct.cyclingLink)} className="bg-[#FF5500] hover:bg-[#E63900] text-white shrink-0 text-xs font-bold">
                  {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copiar Enlace Cycling
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={() => {
                toast({
                  title: '¡Afiliación Aprobada! 🎉',
                  description: 'Ya eres afiliado de este producto en SyncConnect. Copia tu enlace Cycling.',
                })
                setSelectedProduct(null)
              }} className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase h-12 rounded-xl">
                Obtener Enlace Cycling de Afiliado
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-white/10 py-12 px-6 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <HotmartLogo size="sm" variant="dark" />
            <span className="text-slate-500">| Ecosistema Global SyncConnect • Inteligencia Artificial & Afiliación Cycling</span>
          </div>

          <div className="flex gap-6 text-slate-400 text-xs">
            <Link href="#mercado" className="hover:text-white">Mercado</Link>
            <Link href="#sync-pay" className="hover:text-white">SyncConnect Pay</Link>
            <Link href="/auth/login" className="hover:text-white">Iniciar Sesión</Link>
          </div>

          <div className="text-slate-500 text-[11px]">
            © 2026 SyncConnect Inc. Todos los derechos reservados.
          </div>
        </div>
      </footer>

    </div>
  )
}

export default function RootLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0b132b]">
        <div className="h-10 w-10 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SyncConnectLandingContent />
    </Suspense>
  )
}
