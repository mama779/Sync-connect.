"use client"

import { useState, useEffect } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  Copy, 
  Globe, 
  Save, 
  Loader2, 
  ArrowUp, 
  ArrowDown, 
  Smartphone, 
  Monitor, 
  Tablet, 
  BarChart2, 
  Users, 
  MousePointer, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  LayoutTemplate, 
  Grid, 
  Video, 
  MessageSquare, 
  ShieldCheck, 
  Clock, 
  HelpCircle,
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Code2,
  Sliders,
  Palette,
  Search,
  Zap,
  Filter,
  ShoppingBag
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useFirestore, useUser } from '@/firebase'
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, addDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'
import Link from 'next/link'

interface PageSection {
  id: string;
  type: 'hero' | 'features' | 'video' | 'testimonials' | 'faq' | 'guarantee' | 'timer_cta' | 'lead_form' | 'custom';
  name: string;
  content: any;
}

export default function AffiliateSiteBuilderPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()

  // Navegación principal del módulo
  const [activeTab, setActiveTab] = useState<'my_pages' | 'ai_wizard' | 'templates' | 'editor' | 'analytics'>('my_pages')

  // Estado de Páginas del Afiliado
  const [pages, setPages] = useState<any[]>([])
  const [loadingPages, setLoadingPages] = useState(true)
  const [selectedPage, setSelectedPage] = useState<any | null>(null)

  // Estado del Creador con IA (Wizard)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [wizardForm, setWizardForm] = useState({
    pageType: 'single_product',
    category: 'digital_products',
    productName: '',
    description: '',
    targetAudience: '',
    price: '$47 USD',
    offerDetails: '50% Descuento por tiempo limitado + 3 Bonos Exclusivos',
    guaranteeDays: 7,
    affiliateLink: '',
    whatsappNumber: '',
    desiredSubdomain: '',
    customPrompt: ''
  })

  // Estado del Editor Visual
  const [editorSections, setEditorSections] = useState<PageSection[]>([])
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [savingPage, setSavingPage] = useState(false)
  const [subdomainChecking, setSubdomainChecking] = useState(false)
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null)

  // Estado de Configuración de la Página en Edición
  const [pageTitle, setPageTitle] = useState('')
  const [pageSubdomain, setPageSubdomain] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [pageStatus, setPageStatus] = useState<'published' | 'draft'>('published')
  const [affiliateLink, setAffiliateLink] = useState('')
  const [themePreset, setThemePreset] = useState('emerald')
  const [primaryColor, setPrimaryColor] = useState('#2563eb')
  const [accentColor, setAccentColor] = useState('#16a34a')
  
  // Tracking & Integraciones
  const [facebookPixelId, setFacebookPixelId] = useState('')
  const [metaCapiToken, setMetaCapiToken] = useState('')
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState('')
  const [gtmId, setGtmId] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [whatsappMessage, setWhatsappMessage] = useState('Hola, me interesa obtener información sobre la oferta.')

  // Leads Capturados y Envío de Correos
  const [leads, setLeads] = useState<any[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')

  const handleSendEmailToLeads = async (e: React.FormEvent) => {
    e.preventDefault();
    const leadEmails = leads.map(l => l.email).filter(Boolean);
    if (leadEmails.length === 0) {
      toast({ variant: 'destructive', title: 'Sin destinatarios', description: 'No tienes contactos con correo electrónico capturado.' });
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch('/api/leads/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerEmail: user?.email || '',
          sellerName: user?.displayName || 'Vendedor SyncConnect',
          leadEmails,
          subject: emailSubject,
          body: emailBody,
          productName: 'Infoproducto Digital'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar correo.');

      toast({
        title: "¡Correo Enviado Exitosamente! ✉️",
        description: `Se ha entregado el mensaje a ${data.sentCount || leadEmails.length} contactos.`,
      });

      setEmailSubject('');
      setEmailBody('');
      setIsEmailModalOpen(false);
    } catch (err: any) {
      console.error("Error enviando correos:", err);
      toast({ variant: 'destructive', title: 'Error al enviar', description: err?.message || 'Ocurrió un fallo en el servidor.' });
    } finally {
      setSendingEmail(false);
    }
  };

  // Catálogo de Productos para la creación de páginas
  const [catalogProducts, setCatalogProducts] = useState<any[]>([])
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState<string>('')

  // Categorías de Plantillas
  const [templateFilter, setTemplateFilter] = useState('all')

  // Cargar Catálogo de Productos
  useEffect(() => {
    if (!db) return
    const unsubscribe = onSnapshot(collection(db, 'products'), (snap) => {
      const prodList: any[] = []
      snap.forEach((doc) => {
        prodList.push({ id: doc.id, ...doc.data() })
      })
      setCatalogProducts(prodList)
    }, (err) => {
      console.error("Error al cargar catálogo de productos:", err)
    })
    return () => unsubscribe()
  }, [db])

  // Seleccionar Producto del Catálogo para Auto-completar el Creador
  const handleSelectCatalogProduct = (productId: string) => {
    setSelectedCatalogProductId(productId)
    if (!productId || productId === 'custom') return

    const selectedProduct = catalogProducts.find(p => p.id === productId)
    if (selectedProduct) {
      const rawName = selectedProduct.title || selectedProduct.name || ''
      const cleanSub = rawName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 25)

      const formattedPrice = selectedProduct.price ? `$${selectedProduct.price} USD` : '$47 USD'
      const affLink = selectedProduct.affiliateUrl || `https://syncconnect.online/checkout/${selectedProduct.id}?ref=${user?.uid || 'afiliado'}`

      setWizardForm(prev => ({
        ...prev,
        productName: rawName,
        category: selectedProduct.category || prev.category,
        description: selectedProduct.description || selectedProduct.shortDescription || selectedProduct.subtitle || prev.description,
        price: formattedPrice,
        offerDetails: selectedProduct.commissionRate ? `Comisión del ${selectedProduct.commissionRate}% por venta` : prev.offerDetails,
        affiliateLink: affLink,
        desiredSubdomain: cleanSub || prev.desiredSubdomain
      }))

      if (cleanSub) {
        checkSubdomainAvailability(cleanSub)
      }

      toast({
        title: "¡Producto Cargado!",
        description: `Se han configurado los datos de "${rawName}" en el creador.`,
      })
    }
  }

  // Cargar Páginas del Afiliado
  useEffect(() => {
    if (!db || !user?.uid) return
    setLoadingPages(true)

    const q = query(collection(db, 'affiliate_pages'), where('userId', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snap) => {
      const pageList: any[] = []
      snap.forEach((doc) => {
        pageList.push({ id: doc.id, ...doc.data() })
      })
      setPages(pageList)
      setLoadingPages(false)
    }, (err) => {
      console.error("Error al cargar páginas:", err)
      setLoadingPages(false)
    })

    return () => unsubscribe()
  }, [db, user?.uid])

  // Cargar Leads Capturados
  useEffect(() => {
    if (!db || !user?.uid) return
    setLoadingLeads(true)

    const q = query(collection(db, 'page_leads'), where('affiliateId', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snap) => {
      const leadList: any[] = []
      snap.forEach((doc) => {
        leadList.push({ id: doc.id, ...doc.data() })
      })
      setLeads(leadList)
      setLoadingLeads(false)
    }, (err) => {
      console.error("Error al cargar leads:", err)
      setLoadingLeads(false)
    })

    return () => unsubscribe()
  }, [db, user?.uid])

  // Auto-completar enlace de afiliado por defecto si existe
  useEffect(() => {
    if (user?.uid && !wizardForm.affiliateLink) {
      setWizardForm(prev => ({
        ...prev,
        affiliateLink: `https://syncconnect.online/checkout/main?ref=${user.uid}`
      }))
    }
  }, [user?.uid])

  // Verificar Disponibilidad de Subdominio
  const checkSubdomainAvailability = async (sub: string, currentId?: string) => {
    if (!sub || !db) return
    const cleanSub = sub.toLowerCase().trim().replace(/[^a-z0-9-]/g, '')
    if (cleanSub.length < 3) {
      setSubdomainAvailable(false)
      return
    }

    setSubdomainChecking(true)
    try {
      const q = query(collection(db, 'affiliate_pages'), where('subdomain', '==', cleanSub))
      const querySnap = await getDocs(q)
      
      let isAvailable = true
      querySnap.forEach((doc) => {
        if (doc.id !== currentId) {
          isAvailable = false
        }
      })

      setSubdomainAvailable(isAvailable)
    } catch (e) {
      setSubdomainAvailable(true)
    } finally {
      setSubdomainChecking(false)
    }
  }

  // Cargar Página en el Editor
  const handleEditPage = (page: any) => {
    setSelectedPage(page)
    setPageTitle(page.title || '')
    setPageSubdomain(page.subdomain || '')
    setCustomDomain(page.customDomain || '')
    setPageStatus(page.status || 'published')
    setAffiliateLink(page.affiliateLink || '')
    setEditorSections(page.sections || [])
    
    // Theme
    setThemePreset(page.theme?.preset || 'emerald')
    setPrimaryColor(page.theme?.primaryColor || '#2563eb')
    setAccentColor(page.theme?.accentColor || '#16a34a')

    // Tracking
    setFacebookPixelId(page.tracking?.facebookPixelId || '')
    setMetaCapiToken(page.tracking?.metaCapiToken || '')
    setGoogleAnalyticsId(page.tracking?.googleAnalyticsId || '')
    setGtmId(page.tracking?.gtmId || '')

    // WhatsApp
    setWhatsappNumber(page.whatsappConfig?.number || '')
    setWhatsappMessage(page.whatsappConfig?.message || 'Hola, me interesa obtener información sobre la oferta.')

    if (page.sections && page.sections.length > 0) {
      setActiveSectionId(page.sections[0].id)
    }

    setActiveTab('editor')
  }

  // Generar Página con IA Gemini
  const handleGenerateWithAi = async () => {
    if (!wizardForm.productName || !wizardForm.desiredSubdomain) {
      toast({
        variant: 'destructive',
        title: 'Campos requeridos faltantes',
        description: 'Por favor ingresa el nombre del producto y el subdominio deseado.'
      })
      return
    }

    const cleanSubdomain = wizardForm.desiredSubdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, '')

    setGeneratingAi(true)
    try {
      const res = await fetch('/api/gemini/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizardForm)
      })

      const json = await res.json()

      if (!json.success || !json.data) {
        throw new Error(json.error || 'No se pudo generar la página con Gemini.')
      }

      const generatedData = json.data

      // Crear registro en Firestore
      const newPageDoc = {
        userId: user?.uid,
        userEmail: user?.email,
        title: generatedData.title || wizardForm.productName,
        subdomain: cleanSubdomain,
        customDomain: '',
        pageType: wizardForm.pageType,
        category: wizardForm.category,
        status: 'published',
        affiliateLink: wizardForm.affiliateLink || `https://syncconnect.online/checkout/main?ref=${user?.uid}`,
        theme: generatedData.theme || { preset: 'emerald', primaryColor: '#2563eb', accentColor: '#16a34a' },
        seo: generatedData.seo || { title: wizardForm.productName, description: wizardForm.description, keywords: 'afiliados, oferta' },
        header: generatedData.header || { brandName: wizardForm.productName, ctaText: 'Comprar Ahora', ctaUrl: wizardForm.affiliateLink },
        sections: generatedData.sections || [],
        whatsappConfig: {
          enabled: !!wizardForm.whatsappNumber,
          number: wizardForm.whatsappNumber,
          message: 'Hola, me interesa obtener información sobre la oferta.',
          buttonText: 'Chatea con un Asesor'
        },
        tracking: {
          facebookPixelId: '',
          metaCapiToken: '',
          googleAnalyticsId: '',
          gtmId: ''
        },
        stats: {
          views: 0,
          clicks: 0,
          leads: 0,
          sales: 0,
          revenue: 0
        },
        footerMessage: generatedData.footerMessage || '© 2026 SyncConnect. Todos los derechos reservados.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      if (db) {
        const pageRef = doc(collection(db, 'affiliate_pages'))
        await setDoc(pageRef, newPageDoc)
        
        toast({
          title: '¡Página Generada Exitosamente con Gemini IA! 🚀',
          description: `Tu página ya está en vivo en: ${cleanSubdomain}.syncconnect.online`
        })

        handleEditPage({ id: pageRef.id, ...newPageDoc })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error de Generación IA',
        description: err.message || 'Ocurrió un error al procesar con Gemini.'
      })
    } finally {
      setGeneratingAi(false)
    }
  }

  // Guardar Cambios en el Editor Visual
  const handleSaveEditor = async () => {
    if (!selectedPage || !db) return
    const cleanSubdomain = pageSubdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, '')

    setSavingPage(true)
    try {
      // Inyectar enlace de afiliado a todas las llamadas a la acción
      const updatedSections = editorSections.map((sec) => {
        const content = { ...sec.content }
        if (content.ctaUrl && (content.ctaUrl === '#' || content.ctaUrl === '')) {
          content.ctaUrl = affiliateLink
        }
        return { ...sec, content }
      })

      const updatedDoc = {
        title: pageTitle,
        subdomain: cleanSubdomain,
        customDomain,
        status: pageStatus,
        affiliateLink,
        sections: updatedSections,
        theme: {
          preset: themePreset,
          primaryColor,
          accentColor
        },
        tracking: {
          facebookPixelId,
          metaCapiToken,
          googleAnalyticsId,
          gtmId
        },
        whatsappConfig: {
          enabled: !!whatsappNumber,
          number: whatsappNumber,
          message: whatsappMessage,
          buttonText: 'Chatea con un Asesor'
        },
        updatedAt: new Date().toISOString()
      }

      await updateDoc(doc(db, 'affiliate_pages', selectedPage.id), updatedDoc)

      toast({
        title: '¡Página Guardada y Publicada! 🌐',
        description: `Tus cambios ya están activos en ${cleanSubdomain}.syncconnect.online`
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: err.message || 'No se pudieron persistir los cambios.'
      })
    } finally {
      setSavingPage(false)
    }
  }

  // Duplicar Página
  const handleDuplicatePage = async (page: any) => {
    if (!db || !user?.uid) return
    const newSubdomain = `${page.subdomain}-copy-${Math.floor(Math.random() * 1000)}`

    try {
      const cloned = {
        ...page,
        title: `${page.title} (Copia)`,
        subdomain: newSubdomain,
        stats: { views: 0, clicks: 0, leads: 0, sales: 0, revenue: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      delete cloned.id

      const newRef = doc(collection(db, 'affiliate_pages'))
      await setDoc(newRef, cloned)

      toast({
        title: 'Página Duplicada ✓',
        description: `Nueva versión creada con subdominio: ${newSubdomain}`
      })
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al duplicar página' })
    }
  }

  // Eliminar Página
  const handleDeletePage = async (pageId: string) => {
    if (!db) return
    try {
      await deleteDoc(doc(db, 'affiliate_pages', pageId))
      toast({ title: 'Página Eliminada ✓' })
      if (selectedPage?.id === pageId) {
        setSelectedPage(null)
        setActiveTab('my_pages')
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al eliminar la página' })
    }
  }

  // Usar Plantilla Pre-diseñada
  const handleSelectTemplate = (template: any) => {
    setWizardForm(prev => ({
      ...prev,
      productName: template.name,
      description: template.description,
      category: template.category,
      customPrompt: `Usa la estructura visual de la plantilla ${template.name}`
    }))
    setActiveTab('ai_wizard')
  }

  // Mover Secciones en el Editor Visual
  const moveSectionUp = (index: number) => {
    if (index === 0) return
    const copy = [...editorSections]
    const temp = copy[index]
    copy[index] = copy[index - 1]
    copy[index - 1] = temp
    setEditorSections(copy)
  }

  const moveSectionDown = (index: number) => {
    if (index === editorSections.length - 1) return
    const copy = [...editorSections]
    const temp = copy[index]
    copy[index] = copy[index + 1]
    copy[index + 1] = temp
    setEditorSections(copy)
  }

  const deleteSection = (id: string) => {
    const copy = editorSections.filter(s => s.id !== id)
    setEditorSections(copy)
    if (activeSectionId === id) setActiveSectionId(null)
  }

  const addSectionBlock = (type: PageSection['type']) => {
    const id = `sec_${type}_${Date.now()}`
    let newSec: PageSection

    switch (type) {
      case 'hero':
        newSec = { id, type, name: 'Encabezado Hero', content: { headline: 'TÍTULO IMPONENTE', subheadline: 'Descripción persuasiva del producto', ctaText: 'COMPRAR AHORA', ctaUrl: affiliateLink, badgeText: 'OFERTA EXCLUSIVA' } }
        break
      case 'features':
        newSec = { id, type, name: 'Beneficios y Características', content: { title: '¿Por qué elegir esta oferta?', subtitle: 'Principales ventajas competitivas', items: [{ title: 'Alta Calidad', desc: 'Soporte e infraestructura de nivel profesional.' }] } }
        break
      case 'video':
        newSec = { id, type, name: 'Video de Presentación', content: { title: 'Mira el Video Demostrativo', subtitle: 'Aprende cómo funciona en 2 minutos', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' } }
        break
      case 'testimonials':
        newSec = { id, type, name: 'Testimonios de Clientes', content: { title: 'Opiniones Verificadas', subtitle: 'Lo que dicen quienes ya lo probaron', items: [{ author: 'Carlos R.', role: 'Cliente Verificado', desc: 'Increíble servicio y resultados inmediatos.', rating: 5 }] } }
        break
      case 'faq':
        newSec = { id, type, name: 'Preguntas Frecuentes', content: { title: 'Dudas Comunes', subtitle: 'Respuestas claras a tus preguntas', items: [{ q: '¿Cómo recibo el acceso?', a: 'El acceso es instantáneo tras confirmar tu compra.' }] } }
        break
      case 'guarantee':
        newSec = { id, type, name: 'Garantía de Satisfacción', content: { guaranteeDays: 7, guaranteeText: 'Si no estás complacido con los resultados, solicitas tu reembolso inmediato sin preguntas.' } }
        break
      case 'timer_cta':
        newSec = { id, type, name: 'Contador de Oferta (Timer CTA)', content: { title: '¡Oferta por Tiempo Limitado!', subtitle: 'Descuento especial listo para reclamar', ctaText: 'COMPRAR CON DESCUENTO', ctaUrl: affiliateLink, timerMinutes: 15 } }
        break
      case 'lead_form':
        newSec = { id, type, name: 'Formulario de Captura de Clientes', content: { title: 'Solicita Más Información', subtitle: 'Déjanos tus datos y un especialista te contactará.' } }
        break
      default:
        newSec = { id, type: 'custom', name: 'Bloque Personalizado', content: { title: 'Título del Bloque', text: 'Escribe tu texto personalizado.' } }
    }

    setEditorSections([...editorSections, newSec])
    setActiveSectionId(id)
    toast({ title: `Bloque "${newSec.name}" Añadido ✓` })
  }

  // Plantillas Pre-diseñadas
  const templatesList = [
    {
      id: 'tpl_1',
      name: 'Página de Ventas para Cursos Online',
      category: 'courses',
      badge: 'Alta Conversión',
      description: 'Optimizada para la venta de programas educativos, masterclasses y diplomados digitales.',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'tpl_2',
      name: 'Landing de Afiliados y Productos Digitales',
      category: 'affiliates',
      badge: 'Hotmart / Clickbank Ready',
      description: 'Estructura directa con prueba social, garantía, bonos especiales y llamados a la acción destacados.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'tpl_3',
      name: 'Embudo de Captura de Clientes (Lead Magnet)',
      category: 'lead_capture',
      badge: 'Generador de Prospectos',
      description: 'Página ultra-ligera diseñada para capturar nombres, WhatsApps y correos de potenciales compradores.',
      image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'tpl_4',
      name: 'Página de Promoción y Ofertas Relámpago',
      category: 'offer_promo',
      badge: 'Temporizador Activo',
      description: 'Ideal para promociones de Black Friday, lanzamientos exclusivos o cupones de descuento especial.',
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'tpl_5',
      name: 'Presentación de Servicios y Consultoría',
      category: 'services',
      badge: 'Profesional & Elegante',
      description: 'Muestra tus servicios profesionales, agencia, mentorías o asesorías personalizadas.',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=600'
    },
    {
      id: 'tpl_6',
      name: 'Catálogo E-commerce Producto Físico',
      category: 'ecommerce',
      badge: 'Ventas Físicas',
      description: 'Destaca un producto físico con galerías de fotos, videos de uso, pago en línea y botón directo a WhatsApp.',
      image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=600'
    }
  ]

  const activeSection = editorSections.find(s => s.id === activeSectionId)

  return (
    <DashboardShell role="affiliate">
      <div className="space-y-8 pb-16">
        
        {/* ENCABEZADO SUPERIOR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Gemini AI Builder Core</span>
            </div>
            <h1 className="text-3xl font-headline font-black text-slate-900 tracking-tight uppercase italic">
              Creador de Páginas de <span className="text-primary">Venta & Publicidad</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Diseña, genera con IA y publica páginas de alta conversión con tus enlaces de afiliado integrados automáticamente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={() => setActiveTab('ai_wizard')}
              className="h-12 px-6 rounded-2xl bg-gradient-to-r from-primary via-indigo-600 to-purple-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-widest gap-2 shadow-xl hover:scale-105 transition-all"
            >
              <Sparkles className="h-4 w-4" /> Crear con IA Gemini
            </Button>
          </div>
        </div>

        {/* NAVEGACIÓN POR PESTAÑAS */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 bg-white border border-slate-200 shadow-sm rounded-2xl h-14 p-1 shrink-0">
            <TabsTrigger value="my_pages" className="rounded-xl font-black text-[10px] uppercase tracking-wider">
              <Layers className="h-4 w-4 mr-1.5 text-primary" /> Mis Páginas ({pages.length})
            </TabsTrigger>
            <TabsTrigger value="ai_wizard" className="rounded-xl font-black text-[10px] uppercase tracking-wider">
              <Sparkles className="h-4 w-4 mr-1.5 text-purple-500" /> Creador IA
            </TabsTrigger>
            <TabsTrigger value="templates" className="rounded-xl font-black text-[10px] uppercase tracking-wider">
              <LayoutTemplate className="h-4 w-4 mr-1.5 text-indigo-500" /> Plantillas
            </TabsTrigger>
            <TabsTrigger value="editor" disabled={!selectedPage} className="rounded-xl font-black text-[10px] uppercase tracking-wider">
              <Edit3 className="h-4 w-4 mr-1.5 text-amber-500" /> Editor Visual
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-xl font-black text-[10px] uppercase tracking-wider">
              <BarChart2 className="h-4 w-4 mr-1.5 text-emerald-500" /> Métrica & Prospectos
            </TabsTrigger>
          </TabsList>

          {/* ==================================================================== */}
          {/* PESTAÑA 1: MIS PÁGINAS CREADAS */}
          {/* ==================================================================== */}
          <TabsContent value="my_pages" className="pt-6 space-y-6 animate-in fade-in">
            {loadingPages ? (
              <div className="min-h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : pages.length === 0 ? (
              <Card className="border-dashed border-2 border-slate-200 p-12 text-center rounded-[2.5rem] bg-white space-y-6">
                <div className="h-20 w-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto">
                  <Sparkles className="h-10 w-10" />
                </div>
                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-xl font-black uppercase text-slate-800">Aún no has creado ninguna página</h3>
                  <p className="text-slate-500 text-sm">
                    Responde unas sencillas preguntas sobre tu oferta y Gemini IA generará una página web completa de alta conversión en segundos.
                  </p>
                </div>
                <Button 
                  onClick={() => setActiveTab('ai_wizard')}
                  className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl"
                >
                  <Sparkles className="h-4 w-4 mr-2" /> Crear Mi Primera Página con IA
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pages.map((p) => {
                  const pageUrl = `/p/${p.subdomain}`
                  const fullUrl = `https://${p.subdomain}.syncconnect.online`
                  const cr = p.stats?.views ? ((p.stats?.sales || 0) / p.stats.views * 100).toFixed(1) : '0.0'

                  return (
                    <Card key={p.id} className="border-none shadow-md rounded-[2rem] bg-white ring-1 ring-slate-100 overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all">
                      <div>
                        {/* HEADER DE LA CARD */}
                        <div className="p-6 bg-slate-900 text-white space-y-3 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                              {p.category || 'General'}
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${p.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {p.status === 'published' ? 'PUBLICADA' : 'BORRADOR'}
                            </span>
                          </div>

                          <h3 className="text-lg font-black uppercase tracking-tight text-white line-clamp-1">{p.title}</h3>
                          
                          <a 
                            href={pageUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1.5 text-xs text-primary font-mono hover:underline truncate max-w-full"
                          >
                            <Globe className="h-3.5 w-3.5 shrink-0" /> {p.subdomain}.syncconnect.online
                            <ExternalLink className="h-3 w-3 shrink-0 ml-1" />
                          </a>
                        </div>

                        {/* METRICAS RAPIDAS */}
                        <div className="p-6 grid grid-cols-3 gap-2 border-b text-center bg-slate-50">
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block">Visitas</span>
                            <span className="text-base font-black text-slate-800">{p.stats?.views || 0}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block">Clics</span>
                            <span className="text-base font-black text-slate-800">{p.stats?.clicks || 0}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block">Leads</span>
                            <span className="text-base font-black text-emerald-600">{p.stats?.leads || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* BOTONES DE ACCION */}
                      <div className="p-4 bg-white flex items-center justify-between gap-2 border-t">
                        <Button 
                          onClick={() => handleEditPage(p)}
                          variant="outline"
                          size="sm"
                          className="flex-1 h-10 rounded-xl font-black text-[10px] uppercase gap-1"
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Editar
                        </Button>

                        <Button 
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 rounded-xl text-slate-600 hover:text-slate-900"
                        >
                          <Link href={pageUrl} target="_blank">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>

                        <Button 
                          onClick={() => handleDuplicatePage(p)}
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 rounded-xl text-slate-600 hover:text-slate-900"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>

                        <Button 
                          onClick={() => handleDeletePage(p.id)}
                          variant="ghost"
                          size="sm"
                          className="h-10 w-10 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* ==================================================================== */}
          {/* PESTAÑA 2: CREADOR CON IA GEMINI (WIZARD) */}
          {/* ==================================================================== */}
          <TabsContent value="ai_wizard" className="pt-6 space-y-6 animate-in fade-in">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white ring-1 ring-slate-100 overflow-hidden max-w-4xl mx-auto">
              <CardHeader className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 md:p-10">
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="h-6 w-6 text-primary animate-spin" />
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">Gemini 3.6 Flash Engine</span>
                </div>
                <CardTitle className="text-2xl md:text-4xl font-headline font-black uppercase italic">
                  Creación Inteligente de Páginas con IA
                </CardTitle>
                <CardDescription className="text-slate-300 text-sm font-medium">
                  Completa los datos de tu oferta y Gemini diseñará una página web lista para vender con tu enlace de afiliado.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-8 md:p-10 space-y-8">
                
                {/* SELECTOR DE PRODUCTO DEL CATÁLOGO DE LA PLATAFORMA */}
                <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div>
                        <Label className="text-xs font-black uppercase text-white tracking-wider">
                          Seleccionar Producto del Catálogo
                        </Label>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Elige un producto oficial para auto-completar los datos y tu enlace de afiliado
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full w-fit">
                      Auto-Completado
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Select 
                      value={selectedCatalogProductId} 
                      onValueChange={handleSelectCatalogProduct}
                    >
                      <SelectTrigger className="h-12 bg-slate-800 border-slate-700 rounded-xl font-bold text-white">
                        <SelectValue placeholder="-- Seleccionar Producto del Catálogo (Opcional) --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">-- Escribir un Producto / Marca Personalizada --</SelectItem>
                        {catalogProducts.length === 0 ? (
                          <SelectItem value="none" disabled>Cargando productos del catálogo...</SelectItem>
                        ) : (
                          catalogProducts.map((prod) => (
                            <SelectItem key={prod.id} value={prod.id}>
                              📦 {prod.title || prod.name} ({prod.price ? `$${prod.price} USD` : 'Gratis'}) {prod.commissionRate ? `• ${prod.commissionRate}% Comisión` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCatalogProductId && selectedCatalogProductId !== 'custom' && (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center justify-between">
                      <span>✓ Datos y enlace de afiliado cargados automáticamente desde el catálogo.</span>
                      <span className="font-bold text-white underline cursor-pointer" onClick={() => setSelectedCatalogProductId('custom')}>Cambiar</span>
                    </div>
                  )}
                </div>

                {/* FILA 1: TIPO DE PÁGINA Y CATEGORÍA */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-600">Tipo de Página</Label>
                    <Select 
                      value={wizardForm.pageType} 
                      onValueChange={(val) => setWizardForm({ ...wizardForm, pageType: val })}
                    >
                      <SelectTrigger className="h-12 rounded-xl font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_product">Vender Un Solo Producto (Landing de Ventas)</SelectItem>
                        <SelectItem value="multi_product">Catálogo Multi-Producto / Tienda</SelectItem>
                        <SelectItem value="lead_capture">Landing de Captura de Clientes (Lead Magnet)</SelectItem>
                        <SelectItem value="launch">Página de Lanzamiento / Evento</SelectItem>
                        <SelectItem value="offer_promo">Página de Promoción y Oferta Especial</SelectItem>
                        <SelectItem value="business_presentation">Presentación de Negocio / Servicios</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-600">Categoría / Industria</Label>
                    <Select 
                      value={wizardForm.category} 
                      onValueChange={(val) => setWizardForm({ ...wizardForm, category: val })}
                    >
                      <SelectTrigger className="h-12 rounded-xl font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="digital_products">Productos Digitales & Ebooks</SelectItem>
                        <SelectItem value="courses">Cursos Online & Educación</SelectItem>
                        <SelectItem value="affiliates">Marketing de Afiliados (Hotmart/Sync)</SelectItem>
                        <SelectItem value="business">Negocios & Emprendimiento</SelectItem>
                        <SelectItem value="technology">Tecnología & Software</SelectItem>
                        <SelectItem value="health">Salud, Fitness & Bienestar</SelectItem>
                        <SelectItem value="beauty">Belleza & Estética</SelectItem>
                        <SelectItem value="finance">Finanzas & Inversiones</SelectItem>
                        <SelectItem value="real_estate">Bienes Raíces & Inmobiliaria</SelectItem>
                        <SelectItem value="restaurants">Restaurantes & Gastronomía</SelectItem>
                        <SelectItem value="services">Servicios Profesionales</SelectItem>
                        <SelectItem value="ecommerce">Comercio Electrónico / Producto Físico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* FILA 2: NOMBRE DEL PRODUCTO Y SUBDOMINIO DESEADO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-600">Nombre del Producto o Marca *</Label>
                    <Input 
                      placeholder="Ej. Máster en Marketing Digital Pro"
                      value={wizardForm.productName}
                      onChange={(e) => setWizardForm({ ...wizardForm, productName: e.target.value })}
                      className="h-12 rounded-xl font-bold text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-600">Subdominio Deseado en SyncConnect *</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="ej. curso-marketing"
                        value={wizardForm.desiredSubdomain}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                          setWizardForm({ ...wizardForm, desiredSubdomain: val })
                          checkSubdomainAvailability(val)
                        }}
                        className="h-12 rounded-xl font-mono text-sm uppercase"
                      />
                      <span className="text-xs font-bold text-slate-400 shrink-0">.syncconnect.online</span>
                    </div>
                    {subdomainChecking && <span className="text-[10px] text-slate-400 italic">Verificando subdominio...</span>}
                    {subdomainAvailable === true && <span className="text-[10px] text-emerald-600 font-bold">✓ Subdominio disponible</span>}
                    {subdomainAvailable === false && <span className="text-[10px] text-red-500 font-bold">✗ Subdominio ocupado, elige otro</span>}
                  </div>
                </div>

                {/* FILA 3: DESCRIPCIÓN Y PÚBLICO OBJETIVO */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-600">Descripción del Producto o Servicio</Label>
                    <Textarea 
                      placeholder="Escribe brevemente qué soluciona tu producto, qué incluye y cuáles son sus características principales..."
                      value={wizardForm.description}
                      onChange={(e) => setWizardForm({ ...wizardForm, description: e.target.value })}
                      className="min-h-[100px] rounded-xl text-sm leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-slate-600">Público Objetivo</Label>
                      <Input 
                        placeholder="Ej. Emprendedores, profesionales que desean vender más"
                        value={wizardForm.targetAudience}
                        onChange={(e) => setWizardForm({ ...wizardForm, targetAudience: e.target.value })}
                        className="h-12 rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-slate-600">Precio / Oferta Especial</Label>
                      <Input 
                        placeholder="Ej. $47 USD (Antes $97 USD)"
                        value={wizardForm.price}
                        onChange={(e) => setWizardForm({ ...wizardForm, price: e.target.value })}
                        className="h-12 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* FILA 4: ENLACE DE AFILIADO Y WHATSAPP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-primary">Tu Enlace de Afiliado (Auto-Inyección) *</Label>
                    <Input 
                      placeholder="https://syncconnect.online/checkout/..."
                      value={wizardForm.affiliateLink}
                      onChange={(e) => setWizardForm({ ...wizardForm, affiliateLink: e.target.value })}
                      className="h-12 rounded-xl font-mono text-xs bg-white"
                    />
                    <span className="text-[10px] text-slate-400 block">Este enlace se colocará automáticamente en todos los botones de compra.</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-600">WhatsApp para Atención (Opcional)</Label>
                    <Input 
                      placeholder="+505 8888 8888"
                      value={wizardForm.whatsappNumber}
                      onChange={(e) => setWizardForm({ ...wizardForm, whatsappNumber: e.target.value })}
                      className="h-12 rounded-xl font-mono text-xs bg-white"
                    />
                    <span className="text-[10px] text-slate-400 block">Habilita el botón flotante de WhatsApp en la página.</span>
                  </div>
                </div>

                {/* INSTRUCCIONES ADICIONALES */}
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-600">Instrucciones Especiales para Gemini (Opcional)</Label>
                  <Input 
                    placeholder="Ej. Usa un tono de alta urgencia, añade 3 preguntas frecuentes sobre pagos y resalta la garantía."
                    value={wizardForm.customPrompt}
                    onChange={(e) => setWizardForm({ ...wizardForm, customPrompt: e.target.value })}
                    className="h-12 rounded-xl text-xs"
                  />
                </div>

              </CardContent>

              <CardFooter className="p-8 md:p-10 bg-slate-50 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Generación ilimitada con inteligencia artificial</span>
                </div>

                <Button 
                  onClick={handleGenerateWithAi}
                  disabled={generatingAi}
                  className="w-full sm:w-auto h-14 px-10 bg-gradient-to-r from-primary via-indigo-600 to-purple-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 transition-all gap-3"
                >
                  {generatingAi ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Gemini Creando Tu Página...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>GENERAR PÁGINA COMPLETA AHORA</span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* ==================================================================== */}
          {/* PESTAÑA 3: BIBLIOTECA DE PLANTILLAS */}
          {/* ==================================================================== */}
          <TabsContent value="templates" className="pt-6 space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
              <h2 className="text-xl font-black uppercase text-slate-800">Plantillas Profesionales de Alta Conversión</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {templatesList.map((tpl) => (
                <Card key={tpl.id} className="border-none shadow-md rounded-[2rem] bg-white ring-1 ring-slate-100 overflow-hidden flex flex-col justify-between hover:shadow-xl transition-all group">
                  <div className="space-y-4">
                    <div className="relative aspect-video overflow-hidden bg-slate-900">
                      <img 
                        src={tpl.image} 
                        alt={tpl.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" 
                      />
                      <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-primary font-black text-[10px] uppercase tracking-widest border border-primary/30">
                        {tpl.badge}
                      </span>
                    </div>

                    <div className="p-6 space-y-2">
                      <h3 className="text-lg font-black uppercase text-slate-900 line-clamp-1">{tpl.name}</h3>
                      <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{tpl.description}</p>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <Button 
                      onClick={() => handleSelectTemplate(tpl)}
                      className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl gap-2"
                    >
                      <Sparkles className="h-4 w-4 text-primary" /> USAR ESTA PLANTILLA
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ==================================================================== */}
          {/* PESTAÑA 4: EDITOR VISUAL DRAG & DROP Y ESTILOS */}
          {/* ==================================================================== */}
          <TabsContent value="editor" className="pt-6 space-y-6 animate-in fade-in">
            {selectedPage && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* COLUMNA IZQUIERDA: CONTROLES DE LA PÁGINA Y SECCIONES */}
                <div className="xl:col-span-5 space-y-6">
                  <Tabs defaultValue="editor_sections" className="w-full">
                    <TabsList className="grid grid-cols-3 bg-white border shadow-sm rounded-2xl h-14 p-1 shrink-0">
                      <TabsTrigger value="editor_sections" className="rounded-xl font-black text-[9px] uppercase tracking-wider">
                        <Layers className="h-4 w-4 mr-1" /> Bloques
                      </TabsTrigger>
                      <TabsTrigger value="editor_content" className="rounded-xl font-black text-[9px] uppercase tracking-wider">
                        <Sliders className="h-4 w-4 mr-1" /> Contenido
                      </TabsTrigger>
                      <TabsTrigger value="editor_settings" className="rounded-xl font-black text-[9px] uppercase tracking-wider">
                        <Globe className="h-4 w-4 mr-1" /> Dominio/Pixel
                      </TabsTrigger>
                    </TabsList>

                    {/* SECCIONES Y ORDENAMIENTO */}
                    <TabsContent value="editor_sections" className="pt-4 space-y-6">
                      <Card className="border-none shadow-md rounded-[2rem] bg-white ring-1 ring-slate-100 overflow-hidden">
                        <CardHeader className="bg-slate-50 px-6 py-4 border-b">
                          <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Insertar Nuevo Bloque</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                              { type: 'hero', label: 'Hero', icon: LayoutTemplate },
                              { type: 'features', label: 'Beneficios', icon: Grid },
                              { type: 'video', label: 'Video', icon: Video },
                              { type: 'testimonials', label: 'Testimonios', icon: MessageSquare },
                              { type: 'faq', label: 'Preguntas', icon: HelpCircle },
                              { type: 'guarantee', label: 'Garantía', icon: ShieldCheck },
                              { type: 'timer_cta', label: 'Timer CTA', icon: Clock },
                              { type: 'lead_form', label: 'Captura Leads', icon: Users }
                            ].map((b) => {
                              const Icon = b.icon
                              return (
                                <Button 
                                  key={b.type}
                                  onClick={() => addSectionBlock(b.type as any)}
                                  variant="outline"
                                  className="h-14 flex flex-col items-center justify-center gap-1 text-[9px] font-black uppercase rounded-xl hover:bg-slate-50 hover:text-primary"
                                >
                                  <Icon className="h-4 w-4 text-primary" />
                                  <span>{b.label}</span>
                                </Button>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      {/* ESQUEMA DE SECCIONES */}
                      <Card className="border-none shadow-md rounded-[2rem] bg-white ring-1 ring-slate-100 overflow-hidden">
                        <CardHeader className="bg-slate-50 px-6 py-4 border-b">
                          <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Estructura de la Página</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-3">
                          {editorSections.map((sec, idx) => {
                            const isActive = activeSectionId === sec.id
                            return (
                              <div 
                                key={sec.id}
                                className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all ${
                                  isActive 
                                    ? 'border-primary bg-primary/5 shadow-sm' 
                                    : 'border-slate-100 hover:border-slate-200 bg-white'
                                }`}
                              >
                                <div 
                                  onClick={() => setActiveSectionId(sec.id)}
                                  className="flex-1 min-w-0 cursor-pointer space-y-0.5"
                                >
                                  <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none block">{sec.type}</span>
                                  <span className="font-black text-sm uppercase text-slate-800 block truncate">{sec.name}</span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <Button size="icon" variant="ghost" disabled={idx === 0} onClick={() => moveSectionUp(idx)} className="h-8 w-8">
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" disabled={idx === editorSections.length - 1} onClick={() => moveSectionDown(idx)} className="h-8 w-8">
                                    <ArrowDown className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => deleteSection(sec.id)} className="h-8 w-8 text-red-400 hover:text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* EDITAR CONTENIDO DE LA SECCIÓN SELECCIONADA */}
                    <TabsContent value="editor_content" className="pt-4 space-y-6">
                      {activeSection ? (
                        <Card className="border-none shadow-md rounded-[2rem] bg-white ring-1 ring-slate-100 overflow-hidden">
                          <CardHeader className="bg-slate-900 text-white px-6 py-4">
                            <span className="text-[9px] font-black uppercase text-primary tracking-widest">{activeSection.type}</span>
                            <CardTitle className="text-base font-black uppercase">{activeSection.name}</CardTitle>
                          </CardHeader>

                          <CardContent className="p-6 space-y-4">
                            {/* CAMPOS DE EDICION SEGUN TIPO */}
                            {activeSection.type === 'hero' && (
                              <div className="space-y-4">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-black uppercase text-slate-400">Título de Impacto (Headline)</Label>
                                  <Input 
                                    value={activeSection.content.headline || ''}
                                    onChange={(e) => {
                                      const copy = [...editorSections]
                                      const curr = copy.find(s => s.id === activeSection.id)
                                      if (curr) curr.content.headline = e.target.value
                                      setEditorSections(copy)
                                    }}
                                    className="font-bold text-xs"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-[10px] font-black uppercase text-slate-400">Subtítulo Descriptivo</Label>
                                  <Textarea 
                                    value={activeSection.content.subheadline || ''}
                                    onChange={(e) => {
                                      const copy = [...editorSections]
                                      const curr = copy.find(s => s.id === activeSection.id)
                                      if (curr) curr.content.subheadline = e.target.value
                                      setEditorSections(copy)
                                    }}
                                    className="text-xs min-h-[70px]"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Texto Botón CTA</Label>
                                    <Input 
                                      value={activeSection.content.ctaText || ''}
                                      onChange={(e) => {
                                        const copy = [...editorSections]
                                        const curr = copy.find(s => s.id === activeSection.id)
                                        if (curr) curr.content.ctaText = e.target.value
                                        setEditorSections(copy)
                                      }}
                                      className="text-xs font-bold"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Insignia Badge</Label>
                                    <Input 
                                      value={activeSection.content.badgeText || ''}
                                      onChange={(e) => {
                                        const copy = [...editorSections]
                                        const curr = copy.find(s => s.id === activeSection.id)
                                        if (curr) curr.content.badgeText = e.target.value
                                        setEditorSections(copy)
                                      }}
                                      className="text-xs"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-[10px] font-black uppercase text-slate-400">URL Imagen de Banner</Label>
                                  <Input 
                                    value={activeSection.content.imageUrl || ''}
                                    onChange={(e) => {
                                      const copy = [...editorSections]
                                      const curr = copy.find(s => s.id === activeSection.id)
                                      if (curr) curr.content.imageUrl = e.target.value
                                      setEditorSections(copy)
                                    }}
                                    className="text-xs font-mono"
                                  />
                                </div>
                              </div>
                            )}

                            {activeSection.type === 'features' && (
                              <div className="space-y-4">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-black uppercase text-slate-400">Título</Label>
                                  <Input 
                                    value={activeSection.content.title || ''}
                                    onChange={(e) => {
                                      const copy = [...editorSections]
                                      const curr = copy.find(s => s.id === activeSection.id)
                                      if (curr) curr.content.title = e.target.value
                                      setEditorSections(copy)
                                    }}
                                    className="font-bold text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-black uppercase text-slate-400">Subtítulo</Label>
                                  <Textarea 
                                    value={activeSection.content.subtitle || ''}
                                    onChange={(e) => {
                                      const copy = [...editorSections]
                                      const curr = copy.find(s => s.id === activeSection.id)
                                      if (curr) curr.content.subtitle = e.target.value
                                      setEditorSections(copy)
                                    }}
                                    className="text-xs min-h-[60px]"
                                  />
                                </div>
                              </div>
                            )}

                            {activeSection.type === 'video' && (
                              <div className="space-y-4">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-black uppercase text-slate-400">Título</Label>
                                  <Input 
                                    value={activeSection.content.title || ''}
                                    onChange={(e) => {
                                      const copy = [...editorSections]
                                      const curr = copy.find(s => s.id === activeSection.id)
                                      if (curr) curr.content.title = e.target.value
                                      setEditorSections(copy)
                                    }}
                                    className="font-bold text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-black uppercase text-slate-400">URL del Video (Youtube Embed Link)</Label>
                                  <Input 
                                    value={activeSection.content.videoUrl || ''}
                                    onChange={(e) => {
                                      const copy = [...editorSections]
                                      const curr = copy.find(s => s.id === activeSection.id)
                                      if (curr) curr.content.videoUrl = e.target.value
                                      setEditorSections(copy)
                                    }}
                                    className="text-xs font-mono"
                                  />
                                </div>
                              </div>
                            )}

                          </CardContent>
                        </Card>
                      ) : (
                        <div className="p-8 text-center text-slate-400 font-bold text-xs uppercase bg-white rounded-2xl">
                          Selecciona una sección para editar su contenido
                        </div>
                      )}
                    </TabsContent>

                    {/* DOMINIO, PIXEL Y CONFIGURACIÓN */}
                    <TabsContent value="editor_settings" className="pt-4 space-y-6">
                      <Card className="border-none shadow-md rounded-[2rem] bg-white ring-1 ring-slate-100 overflow-hidden">
                        <CardHeader className="bg-slate-50 px-6 py-4 border-b">
                          <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Configuración de Dominio y Enlace</CardTitle>
                        </CardHeader>

                        <CardContent className="p-6 space-y-4">
                          <div className="space-y-1">
                            <Label className="text-xs font-black uppercase text-slate-600">Nombre de la Página</Label>
                            <Input 
                              value={pageTitle}
                              onChange={(e) => setPageTitle(e.target.value)}
                              className="h-11 rounded-xl text-xs font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs font-black uppercase text-slate-600">Subdominio SyncConnect *</Label>
                            <div className="flex items-center gap-2">
                              <Input 
                                value={pageSubdomain}
                                onChange={(e) => {
                                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                                  setPageSubdomain(val)
                                  checkSubdomainAvailability(val, selectedPage?.id)
                                }}
                                className="h-11 rounded-xl font-mono text-xs uppercase"
                              />
                              <span className="text-xs font-bold text-slate-400 shrink-0">.syncconnect.online</span>
                            </div>
                            {subdomainAvailable === true && <span className="text-[10px] text-emerald-600 font-bold">✓ Subdominio disponible</span>}
                            {subdomainAvailable === false && <span className="text-[10px] text-red-500 font-bold">✗ Subdominio ocupado</span>}
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs font-black uppercase text-slate-600">Dominio Personalizado (Opcional)</Label>
                            <Input 
                              placeholder="ej. mi-marca-oficial.com"
                              value={customDomain}
                              onChange={(e) => setCustomDomain(e.target.value)}
                              className="h-11 rounded-xl text-xs font-mono"
                            />
                            <span className="text-[10px] text-slate-400 block">Apunta los registros CNAME a syncconnect.online.</span>
                          </div>

                          <div className="space-y-1 pt-2 border-t">
                            <Label className="text-xs font-black uppercase text-primary">Enlace de Afiliado para Compras</Label>
                            <Input 
                              value={affiliateLink}
                              onChange={(e) => setAffiliateLink(e.target.value)}
                              className="h-11 rounded-xl font-mono text-xs"
                            />
                          </div>

                          <div className="space-y-3 pt-2 border-t">
                            <span className="text-xs font-black uppercase text-slate-600 block">Píxeles y Redes de Seguimiento</span>
                            <div className="space-y-2">
                              <Input 
                                placeholder="ID de Facebook Pixel (ej. 123456789)"
                                value={facebookPixelId}
                                onChange={(e) => setFacebookPixelId(e.target.value)}
                                className="h-10 text-xs font-mono"
                              />
                              <Input 
                                placeholder="Token Meta Conversion API (Opcional)"
                                value={metaCapiToken}
                                onChange={(e) => setMetaCapiToken(e.target.value)}
                                className="h-10 text-xs font-mono"
                              />
                              <Input 
                                placeholder="ID de Google Analytics (ej. G-XXXXXXX)"
                                value={googleAnalyticsId}
                                onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                                className="h-10 text-xs font-mono"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* COLUMNA DERECHA: PREVISUALIZACIÓN EN TIEMPO REAL */}
                <div className="xl:col-span-7 space-y-4 sticky top-6">
                  <div className="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-sm">
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant={previewDevice === 'desktop' ? 'default' : 'ghost'} 
                        onClick={() => setPreviewDevice('desktop')}
                        className="h-9 px-3 rounded-xl text-xs font-bold"
                      >
                        <Monitor className="h-4 w-4 mr-1" /> PC
                      </Button>
                      <Button 
                        size="sm" 
                        variant={previewDevice === 'tablet' ? 'default' : 'ghost'} 
                        onClick={() => setPreviewDevice('tablet')}
                        className="h-9 px-3 rounded-xl text-xs font-bold"
                      >
                        <Tablet className="h-4 w-4 mr-1" /> Tablet
                      </Button>
                      <Button 
                        size="sm" 
                        variant={previewDevice === 'mobile' ? 'default' : 'ghost'} 
                        onClick={() => setPreviewDevice('mobile')}
                        className="h-9 px-3 rounded-xl text-xs font-bold"
                      >
                        <Smartphone className="h-4 w-4 mr-1" /> Móvil
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={handleSaveEditor}
                        disabled={savingPage}
                        className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg gap-2"
                      >
                        {savingPage ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 text-primary" /> GUARDAR & PUBLICAR</>}
                      </Button>
                    </div>
                  </div>

                  {/* VISTA EN IFRAME / PREVIEW CONTENEDOR */}
                  <div className="bg-slate-950 p-4 rounded-[2.5rem] border border-slate-800 shadow-2xl flex justify-center">
                    <div className={`transition-all duration-300 w-full overflow-hidden bg-slate-950 rounded-2xl border border-slate-800 ${
                      previewDevice === 'mobile' ? 'max-w-[380px] min-h-[650px]' : previewDevice === 'tablet' ? 'max-w-[680px] min-h-[700px]' : 'max-w-full min-h-[750px]'
                    }`}>
                      <iframe 
                        src={`/p/${pageSubdomain || selectedPage.subdomain}`} 
                        className="w-full h-[750px] rounded-2xl"
                        title="Vista previa"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}
          </TabsContent>

          {/* ==================================================================== */}
          {/* PESTAÑA 5: ESTADÍSTICAS Y LEADS CAPTURADOS */}
          {/* ==================================================================== */}
          <TabsContent value="analytics" className="pt-6 space-y-6 animate-in fade-in">
            {/* TARGETAS DE MÉTRICAS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Card className="border-none shadow-md rounded-[2rem] bg-white p-6 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Páginas Creadas</span>
                <span className="text-3xl font-black text-slate-900 block">{pages.length}</span>
              </Card>

              <Card className="border-none shadow-md rounded-[2rem] bg-white p-6 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Visitas Totales</span>
                <span className="text-3xl font-black text-primary block">
                  {pages.reduce((acc, p) => acc + (p.stats?.views || 0), 0)}
                </span>
              </Card>

              <Card className="border-none shadow-md rounded-[2rem] bg-white p-6 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clics en Comprar</span>
                <span className="text-3xl font-black text-indigo-600 block">
                  {pages.reduce((acc, p) => acc + (p.stats?.clicks || 0), 0)}
                </span>
              </Card>

              <Card className="border-none shadow-md rounded-[2rem] bg-white p-6 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Leads Capturados</span>
                <span className="text-3xl font-black text-emerald-600 block">{leads.length}</span>
              </Card>
            </div>

            {/* TABLA DE LEADS CAPTURADOS */}
            <Card className="border-none shadow-md rounded-[2rem] bg-white ring-1 ring-slate-100 overflow-hidden">
              <CardHeader className="bg-slate-50 px-8 py-5 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-black uppercase text-slate-800">Clientes Potenciales Capturados (Leads)</CardTitle>
                  <CardDescription className="text-xs">Prospectos interesados que completaron el formulario en tus páginas de venta.</CardDescription>
                </div>

                <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#FF5500] hover:bg-[#E63900] text-white font-black text-xs uppercase px-5 h-11 rounded-xl shadow-md flex items-center gap-2">
                      ✉️ Enviar Correo a Mis Leads ({leads.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg bg-white rounded-3xl p-6 text-slate-900 shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-headline font-black uppercase text-[#131921]">
                        Enviar Email Masivo a Leads
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500 font-medium">
                        Redacta tu mensaje de ventas o seguimiento. Se enviará a los {leads.length} correos capturados en tus páginas.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSendEmailToLeads} className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase text-slate-700">Asunto del Correo *</Label>
                        <Input 
                          value={emailSubject}
                          onChange={e => setEmailSubject(e.target.value)}
                          placeholder="Ej. ¡Acceso exclusivo a la oferta especial del curso!"
                          className="bg-white border-slate-300 text-slate-950 font-bold placeholder:text-slate-400 rounded-xl h-11 text-xs"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase text-slate-700">Contenido / Mensaje *</Label>
                        <Textarea 
                          value={emailBody}
                          onChange={e => setEmailBody(e.target.value)}
                          placeholder="Escribe el mensaje para tus clientes..."
                          className="bg-white border-slate-300 text-slate-950 font-bold placeholder:text-slate-400 rounded-xl h-36 text-xs"
                          required
                        />
                      </div>

                      <DialogFooter className="pt-2">
                        <Button
                          type="submit"
                          disabled={sendingEmail || leads.length === 0}
                          className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg"
                        >
                          {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {sendingEmail ? 'Enviando Correos...' : `Enviar a ${leads.length} Destinatarios`}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>

              <CardContent className="p-0">
                {leads.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-bold text-xs uppercase">
                    Aún no has recibido solicitudes de clientes.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 uppercase font-black text-slate-500 border-b">
                        <tr>
                          <th className="p-4 pl-8">Nombre</th>
                          <th className="p-4">Contacto</th>
                          <th className="p-4">Subdominio</th>
                          <th className="p-4">Mensaje</th>
                          <th className="p-4 pr-8">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {leads.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50">
                            <td className="p-4 pl-8 font-bold text-slate-900">{l.name}</td>
                            <td className="p-4 space-y-0.5">
                              <span className="block font-mono text-slate-800">{l.email || 'Sin correo'}</span>
                              <span className="block text-[10px] font-mono text-emerald-600 font-bold">{l.phone || 'Sin teléfono'}</span>
                            </td>
                            <td className="p-4 font-mono text-primary font-bold">{l.subdomain}.syncconnect.online</td>
                            <td className="p-4 max-w-xs truncate text-slate-500">{l.message || '-'}</td>
                            <td className="p-4 pr-8">
                              {l.phone && (
                                <Button 
                                  asChild 
                                  size="sm" 
                                  className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg gap-1"
                                >
                                  <a href={`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                                    <Phone className="h-3 w-3" /> WhatsApp
                                  </a>
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

      </div>
    </DashboardShell>
  )
}
