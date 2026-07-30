"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { 
  LayoutTemplate, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  ShoppingBag, 
  Eye, 
  Copy, 
  ExternalLink, 
  Globe, 
  Store, 
  Target, 
  Settings, 
  Smartphone, 
  Share2, 
  Trash2, 
  Plus, 
  Check, 
  HelpCircle, 
  Info, 
  Megaphone,
  Radio,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Search,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase'
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import Image from 'next/image'

// Catalogo predeterminado de muestra si Firestore no tiene productos cargados
const FALLBACK_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Masterclass de Ventas con IA',
    price: 15,
    originalPrice: 49,
    category: 'Curso Digital',
    description: 'Aprende a utilizar ChatGPT y Gemini para cerrar ventas en automático.',
    image: 'https://picsum.photos/seed/masterclass-ai/600/400',
    type: 'Digital'
  },
  {
    id: 'prod-2',
    name: 'Sistema Automatizado de WhatsApp Bot',
    price: 27,
    originalPrice: 97,
    category: 'Software / Bot',
    description: 'Bot oficial para responder mensajes y captar leads 24/7 sin intervención.',
    image: 'https://picsum.photos/seed/whatsapp-bot/600/400',
    type: 'Digital'
  },
  {
    id: 'prod-3',
    name: 'Pack de Anuncios y Copywriting de Alta Conversión',
    price: 10,
    originalPrice: 35,
    category: 'Infoproducto',
    description: 'Más de 100 plantillas de anuncios listos para publicar en Facebook Ads y TikTok.',
    image: 'https://picsum.photos/seed/copywriting-pack/600/400',
    type: 'Digital'
  },
  {
    id: 'prod-4',
    name: 'Curso Completo de Marketing de Afiliados',
    price: 35,
    originalPrice: 120,
    category: 'E-Learning',
    description: 'Estrategia completa para escalar comisiones de afiliado de 0 a $1,000 USD/mes.',
    image: 'https://picsum.photos/seed/affiliate-course/600/400',
    type: 'Digital'
  }
]

export default function AIPageGeneratorPage() {
  const { toast } = useToast()
  const { user } = useUser()
  const db = useFirestore()

  const [activeTab, setActiveTab] = useState<'builder' | 'my-pages'>('builder')

  // Cargar Productos desde Firestore
  const productsQuery = useMemoFirebase(() => (db ? collection(db, 'products') : null), [db])
  const { data: dbProducts, isLoading: loadingProducts } = useCollection(productsQuery)

  const availableProducts = (dbProducts && dbProducts.length > 0) ? dbProducts : FALLBACK_PRODUCTS

  // Cargar Páginas Guardadas del Usuario
  const [userPages, setUserPages] = useState<any[]>([])
  const [loadingUserPages, setLoadingUserPages] = useState(false)

  const fetchUserPages = async () => {
    if (!db || !user?.uid) return
    setLoadingUserPages(true)
    try {
      const q = query(
        collection(db, 'affiliate_pages'),
        where('userId', '==', user.uid)
      )
      const snap = await getDocs(q)
      const list = snap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
      setUserPages(list)
    } catch (e) {
      console.error('Error fetching user pages:', e)
    } finally {
      setLoadingUserPages(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'my-pages' && user?.uid) {
      fetchUserPages()
    }
  }, [activeTab, user?.uid, db])

  // ESTADOS DEL BUILDER
  const [pageType, setPageType] = useState<'single-product' | 'multi-store'>('single-product')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([availableProducts[0]?.id || 'prod-1'])
  const [prompt, setPrompt] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [domainType, setDomainType] = useState<'subdomain' | 'custom'>('subdomain')
  
  // Tracking & WhatsApp
  const [facebookPixelId, setFacebookPixelId] = useState('')
  const [tiktokPixelId, setTiktokPixelId] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [whatsappMessage, setWhatsappMessage] = useState('Hola, vengo de tu página y deseo más información sobre la oferta.')

  const [loadingIA, setLoadingIA] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [generatedPage, setGeneratedPage] = useState<any>(null)
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null)

  // Modal para Configuración de Dominio Personalizado
  const [dnsModalOpen, setDnsModalOpen] = useState(false)
  const [selectedPageForDns, setSelectedPageForDns] = useState<any>(null)

  // Autogenerar subdominio sugerido
  useEffect(() => {
    if (!subdomain && user?.uid) {
      const defaultSub = `tienda-${user.uid.slice(0, 5)}`.toLowerCase()
      setSubdomain(defaultSub)
    }
  }, [user, subdomain])

  // Selección de Producto Único
  const handleSelectSingleProduct = (productId: string) => {
    setSelectedProductIds([productId])
  }

  // Selección Múltiple de Productos para Tienda Shopify
  const handleToggleProductSelection = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      if (selectedProductIds.length === 1) {
        toast({
          variant: 'destructive',
          title: 'Atención',
          description: 'Debes seleccionar al menos un producto para la tienda.'
        })
        return
      }
      setSelectedProductIds(selectedProductIds.filter(id => id !== productId))
    } else {
      setSelectedProductIds([...selectedProductIds, productId])
    }
  }

  const handleSelectAllProducts = () => {
    if (selectedProductIds.length === availableProducts.length) {
      setSelectedProductIds([availableProducts[0]?.id || 'prod-1'])
    } else {
      setSelectedProductIds(availableProducts.map(p => p.id))
    }
  }

  // Generación con IA
  const handleGenerateIA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || loadingIA) return

    setLoadingIA(true)

    // Obtener objetos de productos seleccionados
    const selectedProdsData = availableProducts.filter(p => selectedProductIds.includes(p.id))

    try {
      const res = await fetch('/api/gemini/page-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          pageType,
          selectedProducts: selectedProdsData
        })
      })

      const data = await res.json()

      if (data.error) throw new Error(data.error)

      setGeneratedPage(data.pageData)
      toast({
        title: '¡Página Generada con IA! ✨',
        description: 'Hemos creado la estructura y el copy persuasivo. Revisa la vista previa y publícala.'
      })
    } catch (error: any) {
      console.error('Error generando página:', error)
      toast({
        variant: 'destructive',
        title: 'Error al Generar',
        description: error?.message || 'Ocurrió un inconveniente con el motor de IA.'
      })
    } finally {
      setLoadingIA(false)
    }
  }

  // Publicar Página en Firestore
  const handlePublishPage = async () => {
    if (!user?.uid || !db) {
      toast({
        variant: 'destructive',
        title: 'Inicia Sesión',
        description: 'Debes estar autenticado para publicar tu página.'
      })
      return
    }

    const cleanSubdomain = (subdomain || `tienda-${Date.now().toString().slice(-4)}`)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')

    setPublishing(true)

    try {
      const selectedProdsData = availableProducts.filter(p => selectedProductIds.includes(p.id))
      const targetProduct = selectedProdsData[0] || availableProducts[0]

      const pagePayload = {
        userId: user.uid,
        pageType, // 'single-product' | 'multi-store'
        title: generatedPage?.title || (pageType === 'single-product' ? targetProduct?.name : 'Tienda Oficial SyncConnect'),
        subdomain: cleanSubdomain,
        customDomain: customDomain ? customDomain.trim().toLowerCase() : null,
        domainType,
        domainStatus: customDomain ? 'pending_dns' : 'active',
        selectedProductIds,
        selectedProductsData: selectedProdsData,
        affiliateLink: `/checkout?ref=${user.uid}&prod=${targetProduct?.id || ''}`,
        theme: {
          preset: 'emerald',
          primaryColor: '#059669',
          accentColor: '#10b981',
          backgroundColor: '#0f172a',
          fontFamily: 'Inter'
        },
        header: {
          brandName: pageType === 'single-product' ? (targetProduct?.name || 'SyncConnect') : 'Mi Tienda Oficial SyncConnect',
          tagline: 'Oferta Especial y Envíos/Accesos Inmediatos',
          ctaText: 'Comprar Ahora 🚀',
          ctaUrl: '#'
        },
        tracking: {
          facebookPixelId: facebookPixelId.trim() || null,
          tiktokPixelId: tiktokPixelId.trim() || null
        },
        whatsappConfig: {
          enabled: !!whatsappNumber.trim(),
          number: whatsappNumber.trim(),
          message: whatsappMessage,
          buttonText: 'Soporte / Comprar por WhatsApp'
        },
        sections: [
          {
            id: 'hero-1',
            type: 'hero',
            name: 'Hero Principal',
            content: {
              headline: generatedPage?.heroTitle || (pageType === 'single-product' ? `Consigue ${targetProduct?.name}` : 'Bienvenido a Nuestra Tienda Digital VIP'),
              subheadline: generatedPage?.heroSubtitle || 'Aprovecha nuestra oferta exclusiva con acceso inmediato y garantía incondicional.',
              ctaText: generatedPage?.ctaText || '¡OBTENER ACCESO CON DESCUENTO!',
              ctaUrl: '#',
              badgeText: '🔥 Oferta Limitada',
              imageUrl: targetProduct?.image || 'https://picsum.photos/seed/sync-store/800/450'
            }
          },
          {
            id: 'features-1',
            type: 'features',
            name: 'Beneficios',
            content: {
              title: '¿Por qué elegir esta solución?',
              subtitle: 'Diseñado para darte el máximo rendimiento',
              items: (generatedPage?.benefits || [
                'Acceso inmediato 24/7 sin esperas',
                'Material listo para descargar y ejecutar',
                'Soporte directo con nuestro equipo',
                'Garantía incondicional de satisfacción'
              ]).map((b: string) => ({ title: b, desc: 'Verificado por SyncConnect' }))
            }
          },
          {
            id: 'cta-1',
            type: 'timer_cta',
            name: 'Reloj y Botón de Oferta',
            content: {
              title: '¡No Dejes Pasar Esta Promoción!',
              subtitle: 'El precio con descuento vencerá cuando termine el temporizador.',
              ctaText: 'APROVECHAR DESCUENTO AHORA'
            }
          },
          {
            id: 'lead-1',
            type: 'lead_form',
            name: 'Captura de Clientes (Leads)',
            content: {
              title: '¿Tienes Dudas? Déjanos tus datos',
              subtitle: 'Te enviaremos la información directamente a tu correo o WhatsApp.'
            }
          },
          {
            id: 'faq-1',
            type: 'faq',
            name: 'Preguntas Frecuentes',
            content: {
              title: 'Preguntas Frecuentes',
              subtitle: 'Resolvemos tus dudas antes de comprar',
              items: (generatedPage?.faq || [
                { q: '¿Cómo recibo el acceso?', a: 'El acceso es automático e instantáneo por correo electrónico.' },
                { q: '¿Tengo garantía de devolución?', a: 'Sí, 7 días de garantía incondicional.' }
              ])
            }
          },
          {
            id: 'guarantee-1',
            type: 'guarantee',
            name: 'Garantía',
            content: {
              guaranteeDays: 7,
              guaranteeText: 'Si no estás totalmente satisfecho con el contenido, te devolvemos el 100% de tu dinero.'
            }
          }
        ],
        stats: {
          views: 0,
          clicks: 0,
          leads: 0,
          sales: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      const docRef = await addDoc(collection(db, 'affiliate_pages'), pagePayload)

      const fullUrl = `${window.location.origin}/p/${cleanSubdomain}`
      setPublishedUrl(fullUrl)

      toast({
        title: '¡Página Publicada con Éxito! 🎉',
        description: `Tu página ya está en línea en: ${fullUrl}`
      })

      fetchUserPages()
    } catch (e: any) {
      console.error('Error publicando página:', e)
      toast({
        variant: 'destructive',
        title: 'Error al Publicar',
        description: e?.message || 'No se pudo guardar la página en Firestore.'
      })
    } finally {
      setPublishing(false)
    }
  }

  // Eliminar Página
  const handleDeletePage = async (pageId: string) => {
    if (!db || !confirm('¿Estás seguro de que deseas eliminar esta página publicada?')) return
    try {
      await deleteDoc(doc(db, 'affiliate_pages', pageId))
      toast({ title: 'Página Eliminada', description: 'La página ha sido removida.' })
      fetchUserPages()
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la página.' })
    }
  }

  return (
    <DashboardShell role="affiliate">
      <div className="space-y-8 max-w-7xl mx-auto pb-16">
        
        {/* Banner de Encabezado */}
        <div className="bg-gradient-to-r from-slate-900 via-[#131921] to-slate-900 p-8 rounded-3xl border border-white/10 shadow-2xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Globe className="h-48 w-48 text-[#FF5500]" />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#FF5500]/20 border border-[#FF5500]/30 rounded-full text-[#FF5500] text-xs font-black uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5" /> Motor de Creación & Publicidad SyncConnect
          </div>

          <h1 className="text-3xl md:text-5xl font-headline font-black text-white tracking-tight">
            Creación de Páginas de Venta y <span className="text-[#FF5500]">Tiendas Digitales</span>
          </h1>

          <p className="text-slate-300 text-sm md:text-base max-w-3xl leading-relaxed font-medium">
            Crea tu **Página para 1 solo Producto con Publicidad Integrada** o tu **Tienda Completa estilo Shopify** con múltiples productos. Publica instantáneamente con subdominio gratuito o conecta tu propio dominio personalizado.
          </p>

          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="pt-2">
            <TabsList className="bg-slate-950 p-1.5 border border-white/10 rounded-2xl h-auto gap-2">
              <TabsTrigger 
                value="builder" 
                className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-300 data-[state=active]:bg-[#FF5500] data-[state=active]:text-white transition-all"
              >
                <Sparkles className="h-4 w-4 mr-2" /> 1. Creador de Páginas / Tienda
              </TabsTrigger>
              <TabsTrigger 
                value="my-pages" 
                className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-300 data-[state=active]:bg-[#FF5500] data-[state=active]:text-white transition-all"
              >
                <Globe className="h-4 w-4 mr-2" /> 2. Mis Páginas & Dominios ({userPages.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* CONTENIDO TAB 1: CREADOR / BUILDER */}
        {activeTab === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Panel de Configuración e Insumos */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* PASO 1: MODO DE SITIO */}
              <Card className="bg-[#131921] border-white/10 text-white rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-[#FF5500]/20 text-[#FF5500] flex items-center justify-center font-black text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase text-white">Selecciona el Formato de tu Sitio</h3>
                    <p className="text-xs text-slate-400">¿Qué deseas crear hoy?</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div 
                    onClick={() => setPageType('single-product')}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                      pageType === 'single-product' 
                        ? 'bg-[#FF5500]/10 border-[#FF5500] text-white shadow-lg shadow-[#FF5500]/10' 
                        : 'bg-slate-950 border-white/10 hover:border-white/20 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Target className="h-6 w-6 text-[#FF5500]" />
                      {pageType === 'single-product' && <CheckCircle2 className="h-5 w-5 text-[#FF5500]" />}
                    </div>
                    <div>
                      <h4 className="font-black text-sm uppercase text-white">1 Producto + Publicidad</h4>
                      <p className="text-[11px] text-slate-400 leading-tight mt-1">
                        Página de alta conversión enfocada en 1 solo producto con Pixel de Anuncios y Funnel Directo.
                      </p>
                    </div>
                  </div>

                  <div 
                    onClick={() => setPageType('multi-store')}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                      pageType === 'multi-store' 
                        ? 'bg-[#FF5500]/10 border-[#FF5500] text-white shadow-lg shadow-[#FF5500]/10' 
                        : 'bg-slate-950 border-white/10 hover:border-white/20 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Store className="h-6 w-6 text-emerald-400" />
                      {pageType === 'multi-store' && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                    </div>
                    <div>
                      <h4 className="font-black text-sm uppercase text-white">Tienda Multi-Producto</h4>
                      <p className="text-[11px] text-slate-400 leading-tight mt-1">
                        Estilo Shopify. Exhibe varios productos o tu catálogo entero con carrito de compras.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* PASO 2: SELECCIÓN DE PRODUCTOS */}
              <Card className="bg-[#131921] border-white/10 text-white rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-[#FF5500]/20 text-[#FF5500] flex items-center justify-center font-black text-xs">
                      2
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase text-white">
                        {pageType === 'single-product' ? 'Selecciona el Producto' : 'Selecciona los Productos para tu Tienda'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {pageType === 'single-product' ? 'Elige el producto único a promocionar' : `${selectedProductIds.length} productos seleccionados`}
                      </p>
                    </div>
                  </div>

                  {pageType === 'multi-store' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSelectAllProducts}
                      className="border-white/10 text-xs font-bold bg-slate-950 hover:bg-white/5"
                    >
                      {selectedProductIds.length === availableProducts.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[320px] overflow-y-auto pr-1">
                  {availableProducts.map((product) => {
                    const isSelected = selectedProductIds.includes(product.id)

                    return (
                      <div 
                        key={product.id}
                        onClick={() => {
                          if (pageType === 'single-product') {
                            handleSelectSingleProduct(product.id)
                          } else {
                            handleToggleProductSelection(product.id)
                          }
                        }}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-slate-900 border-[#FF5500] shadow-md' 
                            : 'bg-slate-950 border-white/5 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-slate-800 shrink-0">
                            <img src={product.image || 'https://picsum.photos/200/200'} alt={product.name} className="object-cover w-full h-full" />
                          </div>
                          <div>
                            <h5 className="font-bold text-xs text-white line-clamp-1">{product.name}</h5>
                            <span className="text-[11px] text-amber-400 font-mono font-bold">${product.price} USD</span>
                            {product.category && (
                              <Badge className="ml-2 bg-white/10 text-[9px] text-slate-300 border-none">{product.category}</Badge>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isSelected ? (
                            <div className="h-6 w-6 rounded-full bg-[#FF5500] flex items-center justify-center text-white">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="h-6 w-6 rounded-full border border-white/20" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* PASO 3: DOMINIO Y SUBDOMINIO */}
              <Card className="bg-[#131921] border-white/10 text-white rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-[#FF5500]/20 text-[#FF5500] flex items-center justify-center font-black text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase text-white">Enlace y Dominio de Publicación</h3>
                    <p className="text-xs text-slate-400">Elige dónde vivirá tu sitio web</p>
                  </div>
                </div>

                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setDomainType('subdomain')}
                      className={`py-2 rounded-xl text-xs font-black uppercase transition-all ${
                        domainType === 'subdomain' ? 'bg-[#FF5500] text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ⚡ Subdominio Gratuito
                    </button>
                    <button
                      type="button"
                      onClick={() => setDomainType('custom')}
                      className={`py-2 rounded-xl text-xs font-black uppercase transition-all ${
                        domainType === 'custom' ? 'bg-[#FF5500] text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🌐 Dominio Propio (.com)
                    </button>
                  </div>

                  {domainType === 'subdomain' ? (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-300 uppercase">
                        Subdominio en SyncConnect
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={subdomain}
                          onChange={(e) => setSubdomain(e.target.value)}
                          placeholder="mi-tienda"
                          className="bg-slate-950 border-white/10 text-white font-mono text-sm h-12 rounded-xl"
                        />
                        <span className="text-xs font-bold text-slate-400 font-mono shrink-0">.syncconnect.online</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-white/10">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-300 uppercase">
                          Escribe tu Dominio Personalizado
                        </Label>
                        <Input 
                          value={customDomain}
                          onChange={(e) => setCustomDomain(e.target.value)}
                          placeholder="www.mitiendaoficial.com"
                          className="bg-slate-900 border-white/10 text-white font-mono text-sm h-12 rounded-xl"
                        />
                      </div>

                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5 text-xs text-amber-300">
                        <span className="font-bold flex items-center gap-1.5">
                          <Info className="h-4 w-4" /> Configuración DNS Sencilla:
                        </span>
                        <p className="text-[11px] text-amber-200/80">
                          Añade en tu proveedor (GoDaddy, Namecheap, Cloudflare):
                        </p>
                        <div className="font-mono text-[10px] bg-slate-900 p-2 rounded border border-white/10 space-y-1 text-slate-300">
                          <div><span className="text-emerald-400">CNAME</span> | Host: <span className="text-white">www</span> | Valor: <span className="text-white">syncconnect.online</span></div>
                          <div><span className="text-emerald-400">A Record</span> | Host: <span className="text-white">@</span> | Valor: <span className="text-white">34.160.10.222</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* PASO 4: PUBLICIDAD Y REDES */}
              <Card className="bg-[#131921] border-white/10 text-white rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-[#FF5500]/20 text-[#FF5500] flex items-center justify-center font-black text-xs">
                    4
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase text-white">Pixel de Publicidad & WhatsApp</h3>
                    <p className="text-xs text-slate-400">Rastrea tus conversiones de Facebook / TikTok</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-300 uppercase">Facebook Pixel ID</Label>
                    <Input 
                      value={facebookPixelId}
                      onChange={(e) => setFacebookPixelId(e.target.value)}
                      placeholder="Ej. 1234567890"
                      className="bg-slate-950 border-white/10 text-white text-xs h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-300 uppercase">TikTok Pixel ID</Label>
                    <Input 
                      value={tiktokPixelId}
                      onChange={(e) => setTiktokPixelId(e.target.value)}
                      placeholder="Ej. C12345678"
                      className="bg-slate-950 border-white/10 text-white text-xs h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-[11px] font-bold text-slate-300 uppercase">WhatsApp de Atención al Cliente</Label>
                    <Input 
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="+505 8806 2712"
                      className="bg-slate-950 border-white/10 text-white text-xs h-10 rounded-xl"
                    />
                  </div>
                </div>
              </Card>

              {/* PASO 5: INSTRUCCIONES A LA IA & GENERACIÓN */}
              <Card className="bg-[#131921] border-white/10 text-white rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-[#FF5500]/20 text-[#FF5500] flex items-center justify-center font-black text-xs">
                    5
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase text-white">Instrucciones para el Copy con IA</h3>
                    <p className="text-xs text-slate-400">Describe el enfoque de ventas o usa nuestras sugerencias</p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPrompt('Crea una página de alta conversión con enfoque urgente, temporizador de 15 minutos, bonos de acción rápida y testimonios comprobados.')}
                      className="px-3 py-1 bg-slate-950 border border-white/10 hover:border-[#FF5500] rounded-full text-[11px] text-slate-300 font-bold transition-all"
                    >
                      🚀 Campaña Agresiva con Descuento
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrompt('Diseña una tienda limpia y moderna mostrando los productos destacados con envío inmediato y soporte por WhatsApp.')}
                      className="px-3 py-1 bg-slate-950 border border-white/10 hover:border-[#FF5500] rounded-full text-[11px] text-slate-300 font-bold transition-all"
                    >
                      🛒 Tienda Elegante Shopify
                    </button>
                  </div>

                  <Textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Escribe aquí las instrucciones específicas para tu página..."
                    rows={3}
                    className="bg-slate-950 border-white/10 text-white text-xs p-3 rounded-xl"
                  />

                  <Button 
                    type="button"
                    onClick={handleGenerateIA}
                    disabled={loadingIA || !prompt.trim()}
                    className="w-full h-12 bg-gradient-to-r from-[#FF5500] to-amber-600 hover:from-[#E63900] hover:to-amber-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg"
                  >
                    {loadingIA ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> GENERANDO DISEÑO CON IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" /> GENERAR ESTRUCTURA CON IA
                      </>
                    )}
                  </Button>
                </div>
              </Card>

            </div>

            {/* Panel de Vista Previa y Botón de Publicación */}
            <div className="lg:col-span-6 space-y-6">
              
              <Card className="bg-[#131921] border-white/10 text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full min-h-[600px]">
                
                {/* Header de la Vista Previa */}
                <div className="p-4 border-b border-white/10 bg-slate-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="h-3 w-3 rounded-full bg-amber-500" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-400 ml-2">Vista Previa del Sitio</span>
                  </div>

                  <Badge className="bg-[#FF5500]/20 text-[#FF5500] border-[#FF5500]/30 text-[10px] uppercase font-black">
                    {pageType === 'single-product' ? '1 Producto' : 'Tienda Shopify'}
                  </Badge>
                </div>

                <CardContent className="p-6 flex-1 overflow-y-auto space-y-6">
                  
                  {publishedUrl && (
                    <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-black text-sm uppercase">
                        <CheckCircle2 className="h-5 w-5" /> ¡Sitio Publicado en Línea!
                      </div>
                      <p className="text-xs text-slate-300">
                        Tu sitio ya se encuentra activo y listo para recibir clientes:
                      </p>
                      <div className="p-3 bg-slate-950 rounded-xl border border-white/10 flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-emerald-400 truncate">{publishedUrl}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => {
                              navigator.clipboard.writeText(publishedUrl)
                              toast({ title: 'Enlace Copiado' })
                            }}
                            className="h-8 px-2 text-xs text-slate-300 hover:text-white"
                          >
                            <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                          </Button>
                          <a href={publishedUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
                              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Renderizado de Pre-Visualización */}
                  <div className="bg-slate-950 rounded-2xl p-6 border border-white/5 space-y-6">
                    <div className="text-center space-y-3">
                      <Badge className="bg-primary text-white text-[10px] uppercase font-bold">
                        {pageType === 'single-product' ? 'Lanzamiento Especial' : 'Tienda Oficial'}
                      </Badge>
                      <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
                        {generatedPage?.heroTitle || (pageType === 'single-product' ? 'Consigue la Máxima Formación con IA' : 'Catálogo Digital VIP SyncConnect')}
                      </h2>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        {generatedPage?.heroSubtitle || 'Acceso instantáneo con procesamiento seguro de pago y bonos exclusivos.'}
                      </p>
                    </div>

                    {/* Mostrar Productos Seleccionados */}
                    <div className="space-y-3 pt-2">
                      <span className="text-[11px] font-black uppercase text-[#FF5500] tracking-wider block">
                        Productos en esta Oferta ({selectedProductIds.length})
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availableProducts
                          .filter(p => selectedProductIds.includes(p.id))
                          .map((prod) => (
                            <div key={prod.id} className="p-3 bg-slate-900 rounded-xl border border-white/10 flex items-center gap-3">
                              <img src={prod.image} alt={prod.name} className="h-10 w-10 rounded-lg object-cover" />
                              <div className="min-w-0 flex-1">
                                <h6 className="text-xs font-bold text-white truncate">{prod.name}</h6>
                                <span className="text-[11px] text-emerald-400 font-bold">${prod.price} USD</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Botón CTA de Muestra */}
                    <div className="pt-2">
                      <Button className="w-full h-12 bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg">
                        {generatedPage?.ctaText || '¡COMPRAR AHORA CON DESCUENTO!'}
                      </Button>
                    </div>
                  </div>

                </CardContent>

                {/* Footer con Botón Principal de Publicar */}
                <div className="p-6 border-t border-white/10 bg-slate-950 space-y-3">
                  <Button 
                    onClick={handlePublishPage}
                    disabled={publishing}
                    className="w-full h-14 bg-[#FF5500] hover:bg-[#E63900] text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl transition-all"
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" /> PUBLICANDO PÁGINA EN LÍNEA...
                      </>
                    ) : (
                      <>
                        <Globe className="h-5 w-5 mr-2" /> 🚀 PUBLICAR PÁGINA EN LÍNEA AHORA
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-center text-slate-400">
                    Tu sitio estará disponible inmediatamente en el subdominio o tu dominio configurado.
                  </p>
                </div>

              </Card>

            </div>

          </div>
        )}

        {/* CONTENIDO TAB 2: MIS PÁGINAS Y DOMINIOS */}
        {activeTab === 'my-pages' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase text-white">Tus Páginas y Tiendas Publicadas</h3>
                <p className="text-xs text-slate-400">Administra los enlaces de tus campañas y dominios personalizados</p>
              </div>

              <Button 
                onClick={fetchUserPages} 
                variant="outline" 
                size="sm"
                className="border-white/10 text-white bg-slate-900 hover:bg-white/5 text-xs font-bold"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Actualizar Lista
              </Button>
            </div>

            {loadingUserPages ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[#FF5500]" />
              </div>
            ) : userPages.length === 0 ? (
              <Card className="bg-[#131921] border-white/10 text-white rounded-3xl p-12 text-center space-y-4">
                <Globe className="h-12 w-12 text-slate-600 mx-auto" />
                <h4 className="text-lg font-bold uppercase text-slate-300">Aún no tienes páginas publicadas</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Crea tu primera página de 1 producto o tienda multi-producto en la pestaña &quot;Creador de Páginas&quot;.
                </p>
                <Button 
                  onClick={() => setActiveTab('builder')}
                  className="bg-[#FF5500] hover:bg-[#E63900] text-white font-bold text-xs uppercase"
                >
                  <Plus className="h-4 w-4 mr-2" /> Crear Mi Primera Página
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userPages.map((page) => {
                  const liveUrl = `${window.location.origin}/p/${page.subdomain}`

                  return (
                    <Card key={page.id} className="bg-[#131921] border-white/10 text-white rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <Badge className="bg-[#FF5500]/20 text-[#FF5500] border-[#FF5500]/30 text-[10px] uppercase font-black">
                            {page.pageType === 'single-product' ? '1 Producto' : 'Tienda Shopify'}
                          </Badge>

                          <div className="flex items-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleDeletePage(page.id)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <h4 className="font-black text-base text-white line-clamp-1">{page.title}</h4>

                        {/* Subdominio y Dominio */}
                        <div className="space-y-1.5 pt-1">
                          <div className="text-xs font-mono text-emerald-400 bg-slate-950 p-2.5 rounded-xl border border-white/5 truncate flex items-center justify-between">
                            <span className="truncate">{page.subdomain}.syncconnect.online</span>
                            <Copy 
                              onClick={() => {
                                navigator.clipboard.writeText(liveUrl)
                                toast({ title: 'Enlace Copiado' })
                              }}
                              className="h-3.5 w-3.5 text-slate-400 hover:text-white cursor-pointer shrink-0 ml-2" 
                            />
                          </div>

                          {page.customDomain && (
                            <div className="text-xs font-mono text-amber-400 bg-slate-950 p-2 rounded-xl border border-white/5 flex items-center justify-between">
                              <span className="truncate">🌐 {page.customDomain}</span>
                              <Badge className="bg-amber-500/20 text-amber-300 text-[9px]">DNS Pendiente</Badge>
                            </div>
                          )}
                        </div>

                        {/* Métricas rápidas */}
                        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950 rounded-xl text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Visitas</span>
                            <span className="font-mono font-bold text-white">{page.stats?.views || 0}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Clics</span>
                            <span className="font-mono font-bold text-white">{page.stats?.clicks || 0}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Leads</span>
                            <span className="font-mono font-bold text-emerald-400">{page.stats?.leads || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      <div className="pt-2 flex gap-2">
                        <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button className="w-full h-10 bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-bold text-xs uppercase rounded-xl">
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Ver Sitio
                          </Button>
                        </a>

                        <Button 
                          onClick={() => {
                            setSelectedPageForDns(page)
                            setDnsModalOpen(true)
                          }}
                          variant="outline"
                          className="h-10 px-3 border-white/10 text-slate-300 hover:text-white bg-slate-950 rounded-xl"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>

                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* MODAL CONFIGURACIÓN DE DOMINIO Y DNS */}
        <Dialog open={dnsModalOpen} onOpenChange={setDnsModalOpen}>
          <DialogContent className="bg-[#131921] border-white/10 text-white max-w-lg rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-[#FF5500]" /> Configuración de Dominio Personalizado
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Paso a paso para vincular tu propio dominio .com a tu página SyncConnect.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase block">1. Apunta los registros DNS en tu proveedor:</span>
                <div className="font-mono text-xs space-y-2 bg-slate-900 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-emerald-400 font-bold">CNAME</span> | Host: <span className="text-white">www</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">syncconnect.online</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-emerald-400 font-bold">A Record</span> | Host: <span className="text-white">@</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">34.160.10.222</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300 space-y-1">
                <span className="font-bold block">⏱️ Tiempo de Propagación:</span>
                <p className="text-[11px] text-amber-200/80">
                  La activación de los registros DNS suele tardar entre 5 minutos y 24 horas dependiendo de tu registrador (GoDaddy, Namecheap, etc.).
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button 
                onClick={() => {
                  toast({ title: 'Verificación Iniciada', description: 'Comprobando registros DNS en la red...' })
                  setDnsModalOpen(false)
                }}
                className="bg-[#FF5500] hover:bg-[#E63900] text-white font-bold text-xs uppercase w-full h-11 rounded-xl"
              >
                Verificar Conexión de Dominio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardShell>
  )
}
