"use client"

import { useState, useEffect } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  LayoutTemplate, 
  Save, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  Smartphone, 
  Monitor, 
  Image as ImageIcon, 
  Video, 
  HelpCircle, 
  Users, 
  Sliders, 
  ShieldCheck, 
  Globe, 
  Grid,
  Loader2,
  Maximize2,
  ChevronRight,
  Menu,
  Facebook,
  Instagram,
  Twitter,
  Youtube
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useUser } from '@/firebase'
import { doc } from 'firebase/firestore'
import { getGoogleDriveDirectLink } from '@/lib/utils'

interface PageSection {
  id: string;
  type: 'hero' | 'features' | 'video' | 'security' | 'faq' | 'team' | 'cta' | 'custom';
  name: string;
  content: any;
}

export default function SiteBuilderPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user, isUserLoading } = useUser()

  // Referencias a Firestore
  const landingPageRef = useMemoFirebase(() => db ? doc(db, 'site_config', 'landing_page') : null, [db]);
  const { data: landingData, isLoading: isLandingLoading } = useDoc(landingPageRef);

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'site_config', 'settings') : null, [db]);
  const { data: settingsData, isLoading: isSettingsLoading } = useDoc(settingsRef);

  // Estados del editor
  const [sections, setSections] = useState<PageSection[]>([])
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [showFullPreview, setShowFullPreview] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  // Configuración Global & Branding
  const [siteName, setSiteName] = useState('Sync.Connect')
  const [logoUrl, setLogoUrl] = useState('')
  const [faviconUrl, setFaviconUrl] = useState('')
  const [customDomain, setCustomDomain] = useState('sync-nicaragua.pro')
  const [themeColor, setThemeColor] = useState('#2563eb') // Azul por defecto
  const [themePreset, setThemePreset] = useState('emerald') // emerald, slate, cosmic, amber, crimson
  const [displayFont, setDisplayFont] = useState('Inter')
  const [seoTitle, setSeoTitle] = useState('Sync Connect Nicaragua - Plataforma de Afiliados')
  const [seoDescription, setSeoDescription] = useState('La plataforma tecnológica líder en Nicaragua para vender activos digitales y físicos.')
  const [seoKeywords, setSeoKeywords] = useState('afiliados, nicaragua, cursos, hotmart, ventas')
  const [footerCopyright, setFooterCopyright] = useState('© 2024 Sync Connect Nicaragua • Infraestructura Tecnológica Pro')
  
  // Enlaces de redes sociales
  const [socialFacebook, setSocialFacebook] = useState('https://facebook.com')
  const [socialInstagram, setSocialInstagram] = useState('https://instagram.com')
  const [socialTwitter, setSocialTwitter] = useState('https://twitter.com')

  // Enlaces de navegación
  const [menuLinks, setMenuLinks] = useState<Array<{ label: string; href: string }>>([
    { label: 'Características', href: '#features' },
    { label: 'Seguridad', href: '#security-verification' },
    { label: 'Preguntas', href: '#faq-section' },
    { label: 'Equipo', href: '#leadership-section' }
  ])

  // Carga inicial desde Firebase
  useEffect(() => {
    if (landingData) {
      if (landingData.sections) {
        setSections(landingData.sections);
      } else {
        // Fallback robusto a secciones predeterminadas si no hay nada guardado
        setSections(getDefaultSections());
      }
      if (landingData.menuLinks) {
        setMenuLinks(landingData.menuLinks);
      }
    } else {
      setSections(getDefaultSections());
    }
  }, [landingData]);

  useEffect(() => {
    if (settingsData) {
      setSiteName(settingsData.siteName || 'Sync.Connect');
      setLogoUrl(settingsData.logoUrl || '');
      setFaviconUrl(settingsData.faviconUrl || '');
      setCustomDomain(settingsData.customDomain || 'sync-nicaragua.pro');
      setThemeColor(settingsData.themeColor || '#2563eb');
      setThemePreset(settingsData.themePreset || 'emerald');
      setDisplayFont(settingsData.displayFont || 'Inter');
      setSeoTitle(settingsData.seoTitle || 'Sync Connect Nicaragua - Plataforma de Afiliados');
      setSeoDescription(settingsData.seoDescription || 'La plataforma tecnológica líder en Nicaragua para vender activos digitales y físicos.');
      setSeoKeywords(settingsData.seoKeywords || 'afiliados, nicaragua, cursos, hotmart, ventas');
      setFooterCopyright(settingsData.footerCopyright || '© 2024 Sync Connect Nicaragua • Infraestructura Tecnológica Pro');
      setSocialFacebook(settingsData.socialFacebook || 'https://facebook.com');
      setSocialInstagram(settingsData.socialInstagram || 'https://instagram.com');
      setSocialTwitter(settingsData.socialTwitter || 'https://twitter.com');
    }
  }, [settingsData]);

  // Secciones Predeterminadas
  const getDefaultSections = (): PageSection[] => [
    {
      id: 'sec_hero',
      type: 'hero',
      name: 'Cabecera Principal (Hero)',
      content: {
        headline: "TRANSFORMA TU CONOCIMIENTO EN UN NEGOCIO RENTABLE",
        subheadline: "La infraestructura tecnológica completa en Nicaragua para vender productos físicos, digitales y servicios con seguridad bancaria.",
        ctaText: "INGRESAR A LA PLATAFORMA",
        ctaUrl: "#login-section",
        imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200",
        testimonialText: "La solidez tecnológica de Sync Connect nos brindó total certidumbre para distribuir y monetizar nuestros cursos con liquidaciones exactas.",
        testimonialAuthor: "Socio Comercial Verificado",
        testimonialLocation: "Managua, Nicaragua"
      }
    },
    {
      id: 'sec_features',
      type: 'features',
      name: 'Cuadrícula de Características',
      content: {
        title: "Tu negocio, sin límites",
        subtitle: "Una infraestructura blindada, escalable y optimizada para procesar cobros, resguardar activos y automatizar depósitos sin fricciones.",
        items: [
          { title: "Pagos Directos", desc: "Recibe tus comisiones directamente en tu cuenta bancaria local." },
          { title: "Socio Comercial", desc: "Accede a un catálogo de activos de alta demanda listos para vender." },
          { title: "Gestión de Activos", desc: "Controla tus productos físicos y digitales desde un solo panel técnico." }
        ]
      }
    },
    {
      id: 'sec_video',
      type: 'video',
      name: 'Reproductor de Video',
      content: {
        title: "Conoce Sync Connect por dentro",
        subtitle: "Descubre en este video cómo miles de nicaragüenses están construyendo negocios lucrativos sin saber programar.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        bgColor: "bg-slate-900"
      }
    },
    {
      id: 'sec_faq',
      type: 'faq',
      name: 'Preguntas Frecuentes',
      content: {
        title: "Información de Confianza",
        subtitle: "Todo lo que necesitas saber sobre nuestras garantías de seguridad, comisiones bancarias y funcionamiento del catálogo.",
        items: [
          { q: "¿Es seguro utilizar Sync Connect para cobrar mis ventas?", a: "Absolutamente. Todos los datos de transacciones están protegidos bajo protocolos SSL/TLS de 256 bits y encriptación de grado militar." },
          { q: "¿Cómo y cuándo recibo mis comisiones bancarias?", a: "Tus comisiones de ventas de activos físicos y digitales se liquidan directamente a tu cuenta bancaria local registrada." },
          { q: "¿Qué tipo de productos puedo comercializar en la plataforma?", a: "Sync te ofrece una infraestructura completa para vender y distribuir productos digitales (cursos, membresías, PDFs) y físicos." }
        ]
      }
    }
  ];

  // Métodos de sección
  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setSections(updated);
  };

  const moveSectionDown = (index: number) => {
    if (index === sections.length - 1) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setSections(updated);
  };

  const deleteSection = (id: string) => {
    const updated = sections.filter(s => s.id !== id);
    setSections(updated);
    if (activeSectionId === id) setActiveSectionId(null);
    toast({
      title: "Bloque Eliminado ✓",
      description: "Se ha removido el bloque de tu esquema. Recuerda presionar 'Guardar & Publicar' para guardar los cambios."
    });
  };

  const addSectionBlock = (type: PageSection['type']) => {
    const id = `sec_${type}_${Date.now()}`;
    let newSec: PageSection;

    switch (type) {
      case 'hero':
        newSec = { id, type, name: 'Sección Hero', content: { headline: 'TÍTULO IMPONENTE', subheadline: 'Un subtítulo atractivo', ctaText: 'ENTRAR', ctaUrl: '#', imageUrl: 'https://picsum.photos/seed/hero/1200/800' } };
        break;
      case 'features':
        newSec = { id, type, name: 'Características', content: { title: 'NUESTRAS VENTAJAS', subtitle: 'Descubre los beneficios', items: [{ title: 'Característica 1', desc: 'Descripción resumida de la ventaja.' }] } };
        break;
      case 'video':
        newSec = { id, type, name: 'Video de Presentación', content: { title: 'MIRA ESTE VIDEO', subtitle: 'Demostración paso a paso', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' } };
        break;
      case 'cta':
        newSec = { id, type, name: 'Llamado a la Acción (CTA)', content: { title: '¿Listo para escalar?', subtitle: 'Inicia tu registro y conecta con nuestra red en menos de 5 minutos.', ctaText: 'EMPEZAR AHORA 🚀', ctaUrl: '#login-section' } };
        break;
      case 'custom':
        newSec = { id, type, name: 'Texto Libre con Imagen', content: { title: 'Nuestra Visión Tecnológica', text: 'Escribe aquí un párrafo largo explicando algún elemento diferenciador de tu marca, misión o infraestructura.', imageUrl: 'https://picsum.photos/seed/vision/800/600', layout: 'left' } };
        break;
      default:
        newSec = { id, type: 'custom', name: 'Bloque Personalizado', content: { title: 'Nuevo Bloque', text: 'Contenido genérico.' } };
    }

    setSections([...sections, newSec]);
    setActiveSectionId(id);
    toast({ title: `Bloque "${newSec.name}" Añadido ✓` });
  };

  // Guardar Cambios en un click
  const handlePublish = async () => {
    if (!db) return;
    setIsPublishing(true);
    try {
      // 1. Guardar Landing Page sections
      setDocumentNonBlocking(doc(db, 'site_config', 'landing_page'), {
        sections,
        menuLinks,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Guardar Branding Settings
      setDocumentNonBlocking(doc(db, 'site_config', 'settings'), {
        id: 'settings',
        siteName,
        logoUrl,
        faviconUrl,
        customDomain,
        themeColor,
        themePreset,
        displayFont,
        seoTitle,
        seoDescription,
        seoKeywords,
        footerCopyright,
        socialFacebook,
        socialInstagram,
        socialTwitter,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast({
        title: "¡Plataforma Publicada Exitosamente! 🌐",
        description: "Todos los cambios en el editor visual ya están en vivo para tus clientes y afiliados."
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Error en la Publicación", description: "No se pudieron persistir los datos en Firestore." });
    } finally {
      setTimeout(() => setIsPublishing(false), 1000);
    }
  };

  if (isUserLoading || isLandingLoading || isSettingsLoading) {
    return (
      <DashboardShell role="admin">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  // Encontrar sección seleccionada
  const activeSection = sections.find(s => s.id === activeSectionId);

  // Obtener clases de color según tema seleccionado
  const themePresetColors: Record<string, { bg: string, text: string, hover: string, border: string }> = {
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-500', hover: 'hover:bg-emerald-700', border: 'border-emerald-500/20' },
    slate: { bg: 'bg-slate-900', text: 'text-slate-800', hover: 'hover:bg-slate-800', border: 'border-slate-800/20' },
    cosmic: { bg: 'bg-indigo-600', text: 'text-indigo-500', hover: 'hover:bg-indigo-700', border: 'border-indigo-500/20' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-500', hover: 'hover:bg-amber-600', border: 'border-amber-500/20' },
    crimson: { bg: 'bg-red-600', text: 'text-red-500', hover: 'hover:bg-red-700', border: 'border-red-500/20' }
  };
  const activeColors = themePresetColors[themePreset] || themePresetColors.emerald;

  return (
    <DashboardShell role="admin">
      <div className="space-y-6 pb-12">
        
        {/* ENCABEZADO SUPERIOR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Systeme.io Engine</span>
            </div>
            <h1 className="text-3xl font-headline font-black text-slate-900 tracking-tight uppercase italic">
              Editor Visual <span className="text-primary">Landing Page</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Añade, reordena y edita secciones completas, branding, colores y tipografías en tiempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button 
              variant="outline"
              onClick={() => setShowFullPreview(true)}
              className="h-12 px-5 rounded-xl text-xs font-black uppercase tracking-widest gap-2"
            >
              <Eye className="h-4 w-4" /> VISTA PREVIA COMPLETA
            </Button>
            <Button 
              onClick={handlePublish}
              disabled={isPublishing}
              className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest gap-2 shadow-xl active:scale-95 transition-all"
            >
              {isPublishing ? <Loader2 className="animate-spin h-4 w-4" /> : <><Save className="h-4 w-4 text-primary" /> GUARDAR & PUBLICAR</>}
            </Button>
          </div>
        </div>

        {/* WORKSPACE DIVIDIDO EN DOS COLUMNAS */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* COLUMNA IZQUIERDA: CONTROLES DEL EDITOR */}
          <div className="xl:col-span-5 space-y-6">
            
            <Tabs defaultValue="sections" className="w-full">
              <TabsList className="grid grid-cols-3 bg-white border shadow-sm rounded-2xl h-14 p-1 shrink-0">
                <TabsTrigger value="sections" className="rounded-xl font-black text-[9px] uppercase tracking-wider">
                  <LayoutTemplate className="h-4 w-4 mr-1.5" /> Secciones
                </TabsTrigger>
                <TabsTrigger value="content" className="rounded-xl font-black text-[9px] uppercase tracking-wider">
                  <Sliders className="h-4 w-4 mr-1.5" /> Editar Bloque
                </TabsTrigger>
                <TabsTrigger value="branding" className="rounded-xl font-black text-[9px] uppercase tracking-wider">
                  <Globe className="h-4 w-4 mr-1.5" /> Branding/SEO
                </TabsTrigger>
              </TabsList>

              {/* PESTAÑA 1: LISTADO Y AGREGADO DE SECCIONES */}
              <TabsContent value="sections" className="pt-4 space-y-6 animate-in fade-in">
                
                {/* AGREGAR NUEVAS SECCIONES */}
                <Card className="border-none shadow-md rounded-[2rem] bg-white ring-1 ring-slate-100 overflow-hidden">
                  <CardHeader className="bg-slate-50 px-6 py-4 border-b">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Insertar Bloques Pre-diseñados</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { type: 'hero', name: 'Hero Banner', icon: LayoutTemplate },
                        { type: 'features', name: 'Características', icon: Grid },
                        { type: 'video', name: 'Video Player', icon: Video },
                        { type: 'cta', name: 'Call to Action', icon: Maximize2 },
                        { type: 'custom', name: 'Texto + Imagen', icon: ImageIcon }
                      ].map((b) => {
                        const Icon = b.icon;
                        return (
                          <Button 
                            key={b.type}
                            onClick={() => addSectionBlock(b.type as any)}
                            variant="outline"
                            className="h-16 flex flex-col items-center justify-center gap-1.5 text-center text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-50 hover:text-primary"
                          >
                            <Icon className="h-4 w-4" />
                            <span>{b.name}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* ORDEN DE SECCIONES ACTUALES */}
                <Card className="border-none shadow-md rounded-[2rem] bg-white ring-1 ring-slate-100 overflow-hidden">
                  <CardHeader className="bg-slate-50 px-6 py-4 border-b">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Esquema de Secciones en la Página</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    {sections.map((sec, idx) => {
                      const isActive = activeSectionId === sec.id;
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

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              disabled={idx === 0}
                              onClick={() => moveSectionUp(idx)}
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-800"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              disabled={idx === sections.length - 1}
                              onClick={() => moveSectionDown(idx)}
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-800"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => deleteSection(sec.id)}
                              className="h-8 w-8 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

              </TabsContent>

              {/* PESTAÑA 2: EDICIÓN DE LA SECCIÓN ACTIVA */}
              <TabsContent value="content" className="pt-4 space-y-6 animate-in fade-in">
                {activeSection ? (
                  <Card className="border-none shadow-md rounded-[2rem] bg-white ring-1 ring-slate-100 overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white px-8 py-5 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-black uppercase text-primary tracking-widest">{activeSection.type}</span>
                        <CardTitle className="text-base font-headline font-black uppercase italic">{activeSection.name}</CardTitle>
                      </div>
                      <span className="font-mono text-[9px] bg-white/10 px-2 py-0.5 rounded-full uppercase text-white/70">EDITANDO</span>
                    </CardHeader>
                    
                    <CardContent className="p-8 space-y-6">
                      
                      {/* CAMPOS DINÁMICOS SEGÚN TIPO DE SECCIÓN */}
                      {activeSection.type === 'hero' && (
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Título de Impacto (Headline)</Label>
                            <Input 
                              value={activeSection.content.headline || ''}
                              onChange={(e) => {
                                const copy = [...sections];
                                const current = copy.find(s => s.id === activeSection.id);
                                if (current) {
                                  current.content.headline = e.target.value;
                                  setSections(copy);
                                }
                              }}
                              className="font-bold uppercase tracking-tight"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Subtítulo Descriptivo</Label>
                            <Textarea 
                              value={activeSection.content.subheadline || ''}
                              onChange={(e) => {
                                const copy = [...sections];
                                const current = copy.find(s => s.id === activeSection.id);
                                if (current) {
                                  current.content.subheadline = e.target.value;
                                  setSections(copy);
                                }
                              }}
                              className="min-h-[90px] text-xs font-medium leading-relaxed"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Texto del Botón (CTA)</Label>
                              <Input 
                                value={activeSection.content.ctaText || ''}
                                onChange={(e) => {
                                  const copy = [...sections];
                                  const current = copy.find(s => s.id === activeSection.id);
                                  if (current) {
                                    current.content.ctaText = e.target.value;
                                    setSections(copy);
                                  }
                                }}
                                className="font-bold text-xs"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Enlace del Botón</Label>
                              <Input 
                                value={activeSection.content.ctaUrl || ''}
                                onChange={(e) => {
                                  const copy = [...sections];
                                  const current = copy.find(s => s.id === activeSection.id);
                                  if (current) {
                                    current.content.ctaUrl = e.target.value;
                                    setSections(copy);
                                  }
                                }}
                                className="font-mono text-xs"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">URL de Imagen de Fondo / Banner</Label>
                            <Input 
                              value={activeSection.content.imageUrl || ''}
                              onChange={(e) => {
                                const copy = [...sections];
                                const current = copy.find(s => s.id === activeSection.id);
                                if (current) {
                                  current.content.imageUrl = e.target.value;
                                  setSections(copy);
                                }
                              }}
                              className="font-mono text-xs"
                            />
                          </div>

                          <div className="p-4 bg-slate-55 shadow-inner rounded-2xl border space-y-3">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Testimonio Destacado (Hero Card)</span>
                            <div className="space-y-2">
                              <Textarea 
                                value={activeSection.content.testimonialText || ''}
                                onChange={(e) => {
                                  const copy = [...sections];
                                  const current = copy.find(s => s.id === activeSection.id);
                                  if (current) {
                                    current.content.testimonialText = e.target.value;
                                    setSections(copy);
                                  }
                                }}
                                className="text-xs min-h-[60px]"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <Input 
                                placeholder="Autor"
                                value={activeSection.content.testimonialAuthor || ''}
                                onChange={(e) => {
                                  const copy = [...sections];
                                  const current = copy.find(s => s.id === activeSection.id);
                                  if (current) {
                                    current.content.testimonialAuthor = e.target.value;
                                    setSections(copy);
                                  }
                                }}
                                className="text-[11px]"
                              />
                              <Input 
                                placeholder="Ubicación"
                                value={activeSection.content.testimonialLocation || ''}
                                onChange={(e) => {
                                  const copy = [...sections];
                                  const current = copy.find(s => s.id === activeSection.id);
                                  if (current) {
                                    current.content.testimonialLocation = e.target.value;
                                    setSections(copy);
                                  }
                                }}
                                className="text-[11px]"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {activeSection.type === 'features' && (
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Título de la Sección</Label>
                            <Input 
                              value={activeSection.content.title || ''}
                              onChange={(e) => {
                                const copy = [...sections];
                                const current = copy.find(s => s.id === activeSection.id);
                                if (current) {
                                  current.content.title = e.target.value;
                                  setSections(copy);
                                }
                              }}
                              className="font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Subtítulo</Label>
                            <Textarea 
                              value={activeSection.content.subtitle || ''}
                              onChange={(e) => {
                                const copy = [...sections];
                                const current = copy.find(s => s.id === activeSection.id);
                                if (current) {
                                  current.content.subtitle = e.target.value;
                                  setSections(copy);
                                }
                              }}
                              className="min-h-[70px] text-xs"
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-slate-400">Tarjetas de Características</span>
                              <Button 
                                size="sm"
                                onClick={() => {
                                  const copy = [...sections];
                                  const current = copy.find(s => s.id === activeSection.id);
                                  if (current) {
                                    current.content.items = [...(current.content.items || []), { title: 'Nueva Ventaja', desc: 'Descripción resumida.' }];
                                    setSections(copy);
                                  }
                                }}
                                className="h-8 bg-slate-900 text-white text-[10px] uppercase rounded-lg"
                              >
                                + AÑADIR
                              </Button>
                            </div>

                            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
                              {activeSection.content.items?.map((item: any, idx: number) => (
                                <div key={idx} className="p-4 bg-slate-50 border rounded-2xl relative space-y-2">
                                  <button 
                                    onClick={() => {
                                      const copy = [...sections];
                                      const current = copy.find(s => s.id === activeSection.id);
                                      if (current) {
                                        current.content.items = current.content.items.filter((_:any, i:number) => i !== idx);
                                        setSections(copy);
                                      }
                                    }}
                                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                  <Input 
                                    value={item.title}
                                    onChange={(e) => {
                                      const copy = [...sections];
                                      const current = copy.find(s => s.id === activeSection.id);
                                      if (current) {
                                        current.content.items[idx].title = e.target.value;
                                        setSections(copy);
                                      }
                                    }}
                                    className="h-8 font-bold text-xs"
                                    placeholder="Título de la ventaja"
                                  />
                                  <Textarea 
                                    value={item.desc}
                                    onChange={(e) => {
                                      const copy = [...sections];
                                      const current = copy.find(s => s.id === activeSection.id);
                                      if (current) {
                                        current.content.items[idx].desc = e.target.value;
                                        setSections(copy);
                                      }
                                    }}
                                    className="text-[11px] min-h-[50px]"
                                    placeholder="Descripción corta"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeSection.type === 'video' && (
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Título</Label>
                            <Input 
                              value={activeSection.content.title || ''}
                              onChange={(e) => {
                                const copy = [...sections];
                                const current = copy.find(s => s.id === activeSection.id);
                                if (current) {
                                  current.content.title = e.target.value;
                                  setSections(copy);
                                }
                              }}
                              className="font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Subtítulo</Label>
                            <Textarea 
                              value={activeSection.content.subtitle || ''}
                              onChange={(e) => {
                                const copy = [...sections];
                                const current = copy.find(s => s.id === activeSection.id);
                                if (current) {
                                  current.content.subtitle = e.target.value;
                                  setSections(copy);
                                }
                              }}
                              className="min-h-[60px]"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">URL del Video (Youtube Embed Link)</Label>
                            <Input 
                              value={activeSection.content.videoUrl || ''}
                              onChange={(e) => {
                                const copy = [...sections];
                                const current = copy.find(s => s.id === activeSection.id);
                                if (current) {
                                  current.content.videoUrl = e.target.value;
                                  setSections(copy);
                                }
                              }}
                              className="font-mono text-xs"
                              placeholder="https://www.youtube.com/embed/..."
                            />
                          </div>
                        </div>
                      )}

                      {activeSection.type === 'cta' && (
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Título del CTA</Label>
                            <Input 
                              value={activeSection.content.title || ''}
                              onChange={(e) => {
                                const copy = [...sections];
                                const current = copy.find(s => s.id === activeSection.id);
                                if (current) {
                                  current.content.title = e.target.value;
                                  setSections(copy);
                                }
                              }}
                              className="font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Subtítulo o Párrafo</Label>
                            <Textarea 
                              value={activeSection.content.subtitle || ''}
                              onChange={(e) => {
                                const copy = [...sections];
                                const current = copy.find(s => s.id === activeSection.id);
                                if (current) {
                                  current.content.subtitle = e.target.value;
                                  setSections(copy);
                                }
                              }}
                              className="min-h-[70px] text-xs"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Texto Botón</Label>
                              <Input 
                                value={activeSection.content.ctaText || ''}
                                onChange={(e) => {
                                  const copy = [...sections];
                                  const current = copy.find(s => s.id === activeSection.id);
                                  if (current) {
                                    current.content.ctaText = e.target.value;
                                    setSections(copy);
                                  }
                                }}
                                className="font-bold text-xs"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-slate-400">Enlace Destino</Label>
                              <Input 
                                value={activeSection.content.ctaUrl || ''}
                                onChange={(e) => {
                                  const copy = [...sections];
                                  const current = copy.find(s => s.id === activeSection.id);
                                  if (current) {
                                    current.content.ctaUrl = e.target.value;
                                    setSections(copy);
                                  }
                                }}
                                className="font-mono text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {activeSection.type === 'custom' && (
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Título</Label>
                            <Input 
                              value={activeSection.content.title || ''}
                              onChange={(e) => {
                                const copy = [...sections];
                                const current = copy.find(s => s.id === activeSection.id);
                                if (current) {
                                  current.content.title = e.target.value;
                                  setSections(copy);
                                }
                              }}
                              className="font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Contenido Detallado</Label>
                            <Textarea 
                              value={activeSection.content.text || ''}
                              onChange={(e) => {
                                const copy = [...sections];
                                const current = copy.find(s => s.id === activeSection.id);
                                if (current) {
                                  current.content.text = e.target.value;
                                  setSections(copy);
                                }
                              }}
                              className="min-h-[140px] text-xs leading-relaxed"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">URL Imagen de Apoyo</Label>
                            <Input 
                              value={activeSection.content.imageUrl || ''}
                              onChange={(e) => {
                                const copy = [...sections];
                                const current = copy.find(s => s.id === activeSection.id);
                                if (current) {
                                  current.content.imageUrl = e.target.value;
                                  setSections(copy);
                                }
                              }}
                              className="font-mono text-xs"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Alineación del Contenido</Label>
                            <select 
                              value={activeSection.content.layout || 'left'}
                              onChange={(e) => {
                                const copy = [...sections];
                                const current = copy.find(s => s.id === activeSection.id);
                                if (current) {
                                  current.content.layout = e.target.value;
                                  setSections(copy);
                                }
                              }}
                              className="w-full h-11 rounded-xl bg-slate-50 border ring-1 ring-slate-200 text-xs font-bold px-3"
                            >
                              <option value="left">Imagen a la Izquierda, Texto a la Derecha</option>
                              <option value="right">Texto a la Izquierda, Imagen a la Derecha</option>
                            </select>
                          </div>
                        </div>
                      )}

                      {activeSection.type === 'faq' && (
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Título Principal</Label>
                            <Input 
                              value={activeSection.content.title || ''}
                              onChange={(e) => {
                                const copy = [...sections];
                                const current = copy.find(s => s.id === activeSection.id);
                                if (current) {
                                  current.content.title = e.target.value;
                                  setSections(copy);
                                }
                              }}
                              className="font-bold"
                            />
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-slate-400">Lista de Preguntas</span>
                              <Button 
                                size="sm"
                                onClick={() => {
                                  const copy = [...sections];
                                  const current = copy.find(s => s.id === activeSection.id);
                                  if (current) {
                                    current.content.items = [...(current.content.items || []), { q: 'Nueva Pregunta', a: 'Respuesta detallada.' }];
                                    setSections(copy);
                                  }
                                }}
                                className="h-8 bg-slate-900 text-white text-[10px] uppercase rounded-lg"
                              >
                                + AGREGAR PREGUNTA
                              </Button>
                            </div>

                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                              {activeSection.content.items?.map((item: any, idx: number) => (
                                <div key={idx} className="p-4 bg-slate-50 border rounded-2xl relative space-y-2">
                                  <button 
                                    onClick={() => {
                                      const copy = [...sections];
                                      const current = copy.find(s => s.id === activeSection.id);
                                      if (current) {
                                        current.content.items = current.content.items.filter((_:any, i:number) => i !== idx);
                                        setSections(copy);
                                      }
                                    }}
                                    className="absolute top-2 right-2 text-slate-300 hover:text-red-500"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                  <Input 
                                    value={item.q}
                                    onChange={(e) => {
                                      const copy = [...sections];
                                      const current = copy.find(s => s.id === activeSection.id);
                                      if (current) {
                                        current.content.items[idx].q = e.target.value;
                                        setSections(copy);
                                      }
                                    }}
                                    className="h-8 font-bold text-xs"
                                    placeholder="Pregunta"
                                  />
                                  <Textarea 
                                    value={item.a}
                                    onChange={(e) => {
                                      const copy = [...sections];
                                      const current = copy.find(s => s.id === activeSection.id);
                                      if (current) {
                                        current.content.items[idx].a = e.target.value;
                                        setSections(copy);
                                      }
                                    }}
                                    className="text-[11px] min-h-[60px]"
                                    placeholder="Respuesta"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-2 border-dashed p-10 rounded-[2.5rem] text-center bg-slate-50 text-slate-400">
                    <Sliders className="h-10 w-10 mx-auto mb-4 text-slate-300" />
                    <p className="text-xs font-black uppercase tracking-widest">Ningún bloque seleccionado</p>
                    <p className="text-[11px] text-slate-400 mt-2 font-medium">Toca el título de cualquier bloque en la pestaña "Secciones" para editar su contenido aquí.</p>
                  </Card>
                )}
              </TabsContent>

              {/* PESTAÑA 3: ESTILOS, BRANDING, SEO Y MENÚ */}
              <TabsContent value="branding" className="pt-4 space-y-6 animate-in fade-in">
                
                {/* IDENTIDAD VISUAL */}
                <Card className="border-none shadow-md rounded-[2rem] bg-white ring-1 ring-slate-100 overflow-hidden">
                  <CardHeader className="bg-slate-50 px-6 py-4 border-b">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Identidad de Marca</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase">Nombre del Sistema</Label>
                      <Input value={siteName} onChange={e => setSiteName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase">Filtro de Tema (Preset)</Label>
                        <select 
                          value={themePreset} 
                          onChange={e => setThemePreset(e.target.value)}
                          className="w-full h-10 border rounded-lg bg-slate-50 text-xs font-bold px-3"
                        >
                          <option value="emerald">🟢 Esmeralda (Vibrante)</option>
                          <option value="slate">⚫ Carbono (Elegante)</option>
                          <option value="cosmic">🔵 Cósmico (Tech)</option>
                          <option value="amber">🟡 Ámbar (Cálido)</option>
                          <option value="crimson">🔴 Carmesí (Fuerte)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase">Tipografía Principal</Label>
                        <select 
                          value={displayFont} 
                          onChange={e => setDisplayFont(e.target.value)}
                          className="w-full h-10 border rounded-lg bg-slate-50 text-xs font-bold px-3"
                        >
                          <option value="Inter">Sans (Inter)</option>
                          <option value="Space Grotesk">Tech (Space Grotesk)</option>
                          <option value="Playfair Display">Serif (Playfair)</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase">Logo de la Plataforma (Direct Link/Google Drive)</Label>
                      <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="font-mono text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase">Favicon de la pestaña (URL .ico/.png)</Label>
                      <Input value={faviconUrl} onChange={e => setFaviconUrl(e.target.value)} className="font-mono text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase">Dominio Personalizado</Label>
                      <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)} className="font-mono text-xs" />
                    </div>
                  </CardContent>
                </Card>

                {/* SEO BÁSICO */}
                <Card className="border-none shadow-md rounded-[2rem] bg-white ring-1 ring-slate-100 overflow-hidden">
                  <CardHeader className="bg-slate-50 px-6 py-4 border-b">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Configuración SEO & Buscadores</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase">Meta Título (Pestaña Navegador)</Label>
                      <Input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase">Meta Descripción</Label>
                      <Textarea value={seoDescription} onChange={e => setSeoDescription(e.target.value)} className="text-xs min-h-[60px]" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase">Palabras Clave (Keywords separadas por coma)</Label>
                      <Input value={seoKeywords} onChange={e => setSeoKeywords(e.target.value)} className="text-xs" />
                    </div>
                  </CardContent>
                </Card>

                {/* MENÚ DE NAVEGACIÓN */}
                <Card className="border-none shadow-md rounded-[2rem] bg-white ring-1 ring-slate-100 overflow-hidden">
                  <CardHeader className="bg-slate-50 px-6 py-4 border-b flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Enlaces del Menú Superior</CardTitle>
                    <Button 
                      size="sm"
                      onClick={() => setMenuLinks([...menuLinks, { label: 'Nuevo Enlace', href: '#' }])}
                      className="h-7 bg-slate-900 text-white text-[9px] uppercase rounded"
                    >
                      + AÑADIR
                    </Button>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    {menuLinks.map((link, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input 
                          value={link.label}
                          onChange={(e) => {
                            const copy = [...menuLinks];
                            copy[idx].label = e.target.value;
                            setMenuLinks(copy);
                          }}
                          className="h-9 font-bold text-xs"
                          placeholder="Nombre del Enlace"
                        />
                        <Input 
                          value={link.href}
                          onChange={(e) => {
                            const copy = [...menuLinks];
                            copy[idx].href = e.target.value;
                            setMenuLinks(copy);
                          }}
                          className="h-9 font-mono text-xs"
                          placeholder="#seccion"
                        />
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => setMenuLinks(menuLinks.filter((_, i) => i !== idx))}
                          className="h-9 w-9 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

              </TabsContent>
            </Tabs>

          </div>

          {/* COLUMNA DERECHA: INTERACTIVE PREVIEW DENTRO DE DISPOSITIVO */}
          <div className="xl:col-span-7">
            <div className="sticky top-24 space-y-4">
              
              <div className="flex justify-between items-center bg-slate-900 p-4 rounded-3xl text-white">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Monitor className="h-4 w-4 text-primary" /> Vista Previa Interactiva del Canal
                </span>
                
                <div className="flex gap-1.5 bg-slate-850 p-1 rounded-xl">
                  <Button 
                    size="sm" 
                    variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                    onClick={() => setPreviewMode('desktop')}
                    className="h-8 rounded-lg text-[9px] font-black uppercase"
                  >
                    <Monitor className="h-3 w-3 mr-1" /> DESKTOP
                  </Button>
                  <Button 
                    size="sm" 
                    variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                    onClick={() => setPreviewMode('mobile')}
                    className="h-8 rounded-lg text-[9px] font-black uppercase"
                  >
                    <Smartphone className="h-3 w-3 mr-1" /> MOBILE
                  </Button>
                </div>
              </div>

              {/* CONTENEDOR DE LA PANTALLA PREVIEW */}
              <div className={`mx-auto bg-white border-8 border-slate-900 shadow-2xl overflow-hidden transition-all duration-500 rounded-[2rem] flex flex-col ${
                previewMode === 'desktop' ? 'w-full aspect-[16/10.5]' : 'max-w-[340px] aspect-[9/18.5]'
              }`}>
                
                <div className="flex-1 overflow-y-auto bg-slate-950 flex flex-col text-white font-sans text-[11px]">
                  
                  {/* HEADER PREVIEW */}
                  <header className="bg-slate-900/90 py-3 px-6 border-b border-white/5 flex items-center justify-between sticky top-0 z-10 backdrop-blur">
                    <span className="font-black text-xs uppercase italic tracking-tighter text-white">
                      {siteName}
                    </span>
                    {previewMode === 'desktop' ? (
                      <div className="flex gap-4">
                        {menuLinks.map((link, i) => (
                          <span key={i} className="text-[8px] text-slate-300 font-bold uppercase tracking-wider cursor-pointer hover:text-white">{link.label}</span>
                        ))}
                      </div>
                    ) : (
                      <Menu className="h-4 w-4 text-slate-400" />
                    )}
                  </header>

                  {/* BODY PREVIEW */}
                  <main className="flex-1 space-y-12">
                    {sections.map((sec) => (
                      <div key={sec.id} className={`relative p-8 border-2 border-dashed ${activeSectionId === sec.id ? 'border-primary bg-primary/5' : 'border-transparent'}`}>
                        {activeSectionId === sec.id && (
                          <span className="absolute top-2 right-2 bg-primary text-white font-black text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded leading-none">ACTIVO</span>
                        )}

                        {/* HERO RENDER */}
                        {sec.type === 'hero' && (
                          <div className="text-center space-y-6 py-6">
                            <h1 className="text-xl md:text-3xl font-black uppercase tracking-tight italic text-white max-w-xl mx-auto leading-none">
                              {sec.content.headline || 'TÍTULO'}
                            </h1>
                            <p className="text-[10px] md:text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                              {sec.content.subheadline || 'Subtítulo'}
                            </p>
                            <Button className={`${activeColors.bg} text-white font-black text-[9px] uppercase tracking-widest h-11 px-6 rounded-full`}>
                              {sec.content.ctaText || 'ACCEDER'}
                            </Button>

                            {sec.content.imageUrl && (
                              <div className="relative aspect-video max-w-sm mx-auto rounded-2xl overflow-hidden mt-4 border border-white/10 shadow-lg">
                                <img src={sec.content.imageUrl} className="object-cover w-full h-full brightness-75" alt="" />
                              </div>
                            )}
                          </div>
                        )}

                        {/* FEATURES RENDER */}
                        {sec.type === 'features' && (
                          <div className="space-y-6">
                            <div className="text-center space-y-1">
                              <h2 className="text-lg font-black uppercase text-white italic">{sec.content.title || 'Características'}</h2>
                              <p className="text-[9px] text-slate-400 max-w-md mx-auto">{sec.content.subtitle}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {sec.content.items?.map((item: any, idx: number) => (
                                <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-xl text-center space-y-2">
                                  <h4 className="font-bold text-xs uppercase tracking-tight text-white">{item.title}</h4>
                                  <p className="text-[9px] text-slate-400 leading-normal">{item.desc}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* VIDEO RENDER */}
                        {sec.type === 'video' && (
                          <div className="text-center space-y-4 py-4 bg-slate-900 rounded-2xl border border-white/5 p-6">
                            <h3 className="font-black text-sm uppercase text-white tracking-wide">{sec.content.title}</h3>
                            <p className="text-[9px] text-slate-400 max-w-sm mx-auto">{sec.content.subtitle}</p>
                            <div className="aspect-video max-w-sm mx-auto bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
                              {sec.content.videoUrl ? (
                                <iframe src={sec.content.videoUrl} className="w-full h-full" frameBorder="0" allowFullScreen />
                              ) : (
                                <Video className="h-8 w-8 text-slate-600 animate-pulse" />
                              )}
                            </div>
                          </div>
                        )}

                        {/* CTA RENDER */}
                        {sec.type === 'cta' && (
                          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center space-y-4 max-w-md mx-auto">
                            <h3 className="text-sm font-black uppercase text-white">{sec.content.title}</h3>
                            <p className="text-[9px] text-slate-400 leading-relaxed">{sec.content.subtitle}</p>
                            <Button className={`${activeColors.bg} text-white font-black text-[9px] uppercase tracking-widest h-10 px-5 rounded-lg`}>
                              {sec.content.ctaText}
                            </Button>
                          </div>
                        )}

                        {/* CUSTOM BLOCK RENDER */}
                        {sec.type === 'custom' && (
                          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 items-center`}>
                            <div className={`${sec.content.layout === 'right' ? 'md:order-1' : ''} space-y-3`}>
                              <h3 className="text-sm font-black uppercase text-white">{sec.content.title}</h3>
                              <p className="text-[9px] text-slate-400 leading-relaxed whitespace-pre-line">{sec.content.text}</p>
                            </div>
                            <div className="aspect-video bg-white/5 rounded-xl overflow-hidden border border-white/10">
                              {sec.content.imageUrl ? (
                                <img src={sec.content.imageUrl} className="object-cover w-full h-full" alt="" />
                              ) : (
                                <ImageIcon className="h-6 w-6 text-slate-600 m-auto mt-6" />
                              )}
                            </div>
                          </div>
                        )}

                        {/* FAQ RENDER */}
                        {sec.type === 'faq' && (
                          <div className="space-y-4">
                            <h3 className="text-center text-sm font-black uppercase text-white">{sec.content.title}</h3>
                            <div className="space-y-2">
                              {sec.content.items?.map((item: any, idx: number) => (
                                <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-lg">
                                  <p className="font-bold text-[10px] text-white uppercase">{item.q}</p>
                                  <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">{item.a}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    ))}
                  </main>

                  {/* FOOTER PREVIEW */}
                  <footer className="bg-slate-900 border-t border-white/5 py-8 px-6 mt-12 space-y-4 text-center">
                    <p className="text-[8px] text-slate-500 uppercase tracking-wider">{footerCopyright}</p>
                    <div className="flex justify-center gap-4 text-slate-500">
                      <Facebook className="h-3.5 w-3.5" />
                      <Instagram className="h-3.5 w-3.5" />
                      <Twitter className="h-3.5 w-3.5" />
                    </div>
                  </footer>

                </div>
              </div>

            </div>
          </div>

        </div>

        {/* MODAL FULL PREVIEW */}
        {showFullPreview && (
          <div className="fixed inset-0 bg-slate-950/95 z-50 overflow-y-auto p-4 md:p-10 flex flex-col">
            <div className="max-w-6xl w-full mx-auto flex items-center justify-between pb-4 border-b border-white/10 text-white mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-black uppercase tracking-widest">Simulación de Landing Page en Vivo</span>
              </div>
              <Button variant="ghost" className="text-white/60 hover:text-white font-black" onClick={() => setShowFullPreview(false)}>CERRAR PREVIEW [X]</Button>
            </div>

            <div className="flex-1 bg-[#0a0a0f] text-white font-sans max-w-6xl w-full mx-auto rounded-[3.5rem] border border-white/10 overflow-hidden flex flex-col p-1">
              <div className="bg-[#0e0e15] rounded-[3.3rem] overflow-hidden flex-1 overflow-y-auto py-10 px-6 md:px-16 space-y-20">
                
                {/* HERO BLOCK */}
                {sections.find(s => s.type === 'hero') && (() => {
                  const s = sections.find(s => s.type === 'hero')!;
                  return (
                    <div className="text-center max-w-4xl mx-auto space-y-8 py-10 relative">
                      <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tight text-white leading-none max-w-3xl mx-auto">
                        {s.content.headline}
                      </h1>
                      <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        {s.content.subheadline}
                      </p>
                      <Button className={`h-14 px-10 rounded-full font-black text-xs uppercase tracking-widest ${activeColors.bg} text-white shadow-2xl`}>
                        {s.content.ctaText}
                      </Button>

                      {s.content.imageUrl && (
                        <div className="aspect-[16/9] w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl mt-10 relative group">
                          <img src={s.content.imageUrl} className="object-cover w-full h-full brightness-75 group-hover:scale-102 transition-transform duration-700" alt="" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
                          
                          {s.content.testimonialText && (
                            <div className="absolute bottom-8 left-8 right-8 p-6 bg-slate-900/80 backdrop-blur border border-white/10 text-left rounded-2xl max-w-md">
                              <p className="text-xs text-white italic">"{s.content.testimonialText}"</p>
                              <div className="pt-2 border-t border-white/5 mt-2 flex justify-between text-[10px] font-black uppercase text-primary">
                                <span>{s.content.testimonialAuthor}</span>
                                <span className="text-slate-400">{s.content.testimonialLocation}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* OTROS BLOQUES DE SECCIÓN */}
                {sections.filter(s => s.type !== 'hero').map((sec) => (
                  <section key={sec.id} className="py-10 border-t border-white/5 max-w-4xl mx-auto w-full">
                    {sec.type === 'features' && (
                      <div className="space-y-12">
                        <div className="text-center space-y-2">
                          <h2 className="text-2xl md:text-3xl font-black uppercase italic text-white">{sec.content.title}</h2>
                          <p className="text-xs text-slate-400 max-w-lg mx-auto">{sec.content.subtitle}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {sec.content.items?.map((item: any, i: number) => (
                            <div key={i} className="p-8 bg-white/5 border border-white/5 rounded-3xl text-center space-y-4">
                              <h4 className="font-black text-base text-white uppercase tracking-tight">{item.title}</h4>
                              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sec.type === 'video' && (
                      <div className="text-center space-y-6">
                        <h2 className="text-xl md:text-2xl font-black uppercase italic text-white">{sec.content.title}</h2>
                        <p className="text-xs text-slate-400 max-w-lg mx-auto">{sec.content.subtitle}</p>
                        <div className="aspect-video w-full rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl bg-black">
                          <iframe src={sec.content.videoUrl} className="w-full h-full" frameBorder="0" allowFullScreen />
                        </div>
                      </div>
                    )}

                    {sec.type === 'cta' && (
                      <div className="p-10 bg-slate-900 rounded-[2.5rem] border border-white/10 text-center space-y-6 max-w-2xl mx-auto shadow-2xl">
                        <h3 className="text-xl font-black uppercase text-white">{sec.content.title}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{sec.content.subtitle}</p>
                        <Button className={`h-12 px-8 rounded-full font-black text-[10px] uppercase tracking-wider ${activeColors.bg} text-white`}>
                          {sec.content.ctaText}
                        </Button>
                      </div>
                    )}

                    {sec.type === 'custom' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                        <div className={`${sec.content.layout === 'right' ? 'md:order-1' : ''} space-y-4`}>
                          <h3 className="text-xl font-black uppercase text-white italic">{sec.content.title}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">{sec.content.text}</p>
                        </div>
                        <div className="aspect-video bg-white/5 rounded-3xl overflow-hidden border border-white/10 shadow-lg">
                          <img src={sec.content.imageUrl} className="object-cover w-full h-full" alt="" />
                        </div>
                      </div>
                    )}

                    {sec.type === 'faq' && (
                      <div className="space-y-8">
                        <h3 className="text-center text-xl font-black uppercase italic text-white">{sec.content.title}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {sec.content.items?.map((item: any, i: number) => (
                            <div key={i} className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                              <p className="font-black text-xs text-white uppercase">{item.q}</p>
                              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{item.a}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                ))}

              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  )
}
