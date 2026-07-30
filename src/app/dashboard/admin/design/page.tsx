"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Mail, 
  Loader2, 
  ImageIcon,
  Server,
  Upload,
  MessageSquare,
  LayoutTemplate,
  Plus,
  Trash2,
  Save,
  User,
  Zap,
  ShieldCheck,
  Globe,
  Sparkles,
  RefreshCw,
  FileCode,
  Check
} from 'lucide-react'
import { SyncConnectLogo } from '@/components/SyncConnectLogo'
import { useToast } from '@/hooks/use-toast'
import { useFirestore, setDocumentNonBlocking, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase'
import { collection, doc, setDoc } from 'firebase/firestore'
import { getGoogleDriveDirectLink } from '@/lib/utils'
import { testEmailConfig } from '@/lib/email'
import { uploadImageToFirebaseStorage } from '@/firebase/storage-upload'

export default function AdminDesignPage() {
  const router = useRouter()
  const { toast } = useToast()
  const db = useFirestore()
  const { user, isUserLoading } = useUser();
  const [savingId, setSavingId] = useState<string | null>(null)
  const [testLoading, setTestLoading] = useState(false)

  const configQuery = useMemoFirebase(() => {
    if (!db || isUserLoading || !user) return null;
    return collection(db, 'site_config');
  }, [db, user, isUserLoading]);
  const { data: overrides, isLoading } = useCollection(configQuery);

  const landingPageRef = useMemoFirebase(() => db ? doc(db, 'site_config', 'landing_page') : null, [db]);
  const { data: landingData } = useDoc(landingPageRef);

  const logoConfigRef = useMemoFirebase(() => db ? doc(db, 'site_config', 'site-logo') : null, [db]);
  const { data: logoData } = useDoc(logoConfigRef);

  const settingsRef = useMemoFirebase(() => db ? doc(db, 'site_config', 'settings') : null, [db]);
  const { data: settingsData } = useDoc(settingsRef);

  // Estados locales para el editor de Branding (Logo & Favicon)
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [brandName, setBrandName] = useState('SYNC');
  const [brandSub, setBrandSub] = useState('CONNECT');

  useEffect(() => {
    if (logoData || settingsData) {
      const currentLogo = logoData?.imageUrl || settingsData?.siteLogoUrl || settingsData?.logoUrl;
      const currentFavicon = logoData?.faviconUrl || settingsData?.faviconUrl;
      const currentBrandName = logoData?.brandName || settingsData?.siteName;
      const currentBrandSub = logoData?.brandSub;

      if (currentLogo !== undefined && currentLogo !== '') setLogoUrl(currentLogo);
      if (currentFavicon !== undefined && currentFavicon !== '') setFaviconUrl(currentFavicon);
      if (currentBrandName) setBrandName(currentBrandName);
      if (currentBrandSub) setBrandSub(currentBrandSub);
    }
  }, [logoData, settingsData]);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Archivo muy grande", description: "El logo no debe superar los 10MB." });
      return;
    }
    setIsUploadingLogo(true);
    toast({ title: "Procesando Logo...", description: "Comprimiendo y optimizando imagen del logo." });
    try {
      const url = await uploadImageToFirebaseStorage(file, 'site-branding', 600, 600);
      setLogoUrl(url);
      toast({ title: "Logo Procesado con Éxito ✓", description: "Haz clic en 'GUARDAR LOGO Y FAVICON' para publicar los cambios." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error de Carga", description: err?.message || "No se pudo procesar la imagen." });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleFaviconFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Archivo muy grande", description: "El favicon no debe superar los 5MB." });
      return;
    }
    setIsUploadingFavicon(true);
    toast({ title: "Procesando Favicon...", description: "Comprimiendo y optimizando favicon (128x128)." });
    try {
      const url = await uploadImageToFirebaseStorage(file, 'site-branding', 128, 128);
      setFaviconUrl(url);
      toast({ title: "Favicon Procesado con Éxito ✓", description: "Haz clic en 'GUARDAR LOGO Y FAVICON' para publicar los cambios." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error de Carga", description: err?.message || "No se pudo procesar la imagen." });
    } finally {
      setIsUploadingFavicon(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!db) return;
    setSavingId('branding');
    try {
      const payload = {
        imageUrl: logoUrl.trim(),
        faviconUrl: faviconUrl.trim(),
        brandName: brandName.trim(),
        brandSub: brandSub.trim(),
        updatedAt: new Date().toISOString()
      };

      const settingsPayload = {
        siteLogoUrl: logoUrl.trim(),
        logoUrl: logoUrl.trim(),
        faviconUrl: faviconUrl.trim(),
        siteName: brandName.trim(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'site_config', 'site-logo'), payload, { merge: true });
      await setDoc(doc(db, 'site_config', 'settings'), settingsPayload, { merge: true });

      toast({ title: "¡Identidad Visual Guardada! ✓", description: "El nuevo logo y favicon se han guardado y aplicado en toda la plataforma." });
    } catch (e: any) {
      console.error("Error guardando branding:", e);
      toast({ variant: "destructive", title: "Error al guardar la identidad visual", description: e?.message || "No se pudo actualizar en Firestore." });
    } finally {
      setTimeout(() => setSavingId(null), 800);
    }
  };

  // Estados locales para el editor de Landing
  const [localLanding, setLocalLanding] = useState<any>({
    hero: {
      headline: "VENDE TODO. GANA SIEMPRE.",
      subheadline: "La infraestructura tecnológica para escalar la venta de productos físicos, digitales y servicios profesionales.",
      ctaText: "ACCEDER A LA PLATAFORMA"
    },
    team: [
      { name: "Uriel Roques", role: "Director General & Fundador", imageUrl: "https://picsum.photos/seed/uriel/400/500" }
    ],
    features: [
      { title: "Pago Directo", desc: "Recibe tus comisiones directamente a tu banco local." },
      { title: "Socio de Negocio", desc: "Genera ingresos constantes escalando productos de alta demanda." }
    ]
  });

  useEffect(() => {
    if (landingData) {
      setLocalLanding({
        hero: {
          headline: landingData.hero?.headline || "VENDE TODO. GANA SIEMPRE.",
          subheadline: landingData.hero?.subheadline || "La infraestructura tecnológica para escalar la venta de productos físicos, digitales y servicios profesionales.",
          ctaText: landingData.hero?.ctaText || "ACCEDER A LA PLATAFORMA"
        },
        team: landingData.team || [
          { name: "Uriel Roques", role: "Director General & Fundador", imageUrl: "https://picsum.photos/seed/uriel/400/500" }
        ],
        features: landingData.features || [
          { title: "Pago Directo", desc: "Recibe tus comisiones directamente a tu banco local." },
          { title: "Socio de Negocio", desc: "Genera ingresos constantes escalando productos de alta demanda." }
        ],
        ...landingData
      });
    }
  }, [landingData]);

  const handleSaveLanding = async () => {
    if (!db) return;
    setSavingId('landing');
    try {
      setDocumentNonBlocking(doc(db, 'site_config', 'landing_page'), {
        ...localLanding,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast({ title: "Página de Inicio Actualizada ✓" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error al guardar" });
    } finally {
      setTimeout(() => setSavingId(null), 1000);
    }
  };

  const handleSaveSmtp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      smtp_host: formData.get('smtp_host'),
      smtp_port: formData.get('smtp_port'),
      smtp_user: formData.get('smtp_user')?.toString().trim(),
      smtp_password: formData.get('smtp_password')?.toString().trim(),
      smtp_from_name: formData.get('smtp_from_name'),
    };
    const configRef = doc(db, 'site_config', 'settings');
    setSavingId('settings');
    setDocumentNonBlocking(configRef, { id: 'settings', ...data, updatedAt: new Date().toISOString() }, { merge: true });
    setTimeout(() => {
      setSavingId(null);
      toast({ title: "Ajuste Guardado" });
    }, 1000);
  };

  const handleTestEmail = async () => {
    if (!user?.email) return;
    setTestLoading(true);
    try {
      const res = await testEmailConfig(user.email);
      if (res.success) {
        toast({ title: "Email Enviado ✓" });
      } else {
        toast({ variant: "destructive", title: "Error SMTP", description: res.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Fallo en la conexión SMTP." });
    } finally {
      setTestLoading(false);
    }
  };

  if (isUserLoading || isLoading || !localLanding) {
    return <DashboardShell role="admin"><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardShell>
  }

  const settings = overrides?.find(o => o.id === 'settings') || {};

  return (
    <DashboardShell role="admin">
      <div className="space-y-12 pb-20">
        <div className="space-y-2">
          <h1 className="text-4xl font-headline font-black text-slate-900 tracking-tight uppercase italic">Infraestructura & <span className="text-primary">Personalización</span></h1>
          <p className="text-slate-500 font-medium">Control total sobre el sistema y la identidad visual de la marca.</p>
        </div>

        <Tabs defaultValue="branding" className="space-y-8">
          <TabsList className="bg-white p-1 rounded-2xl h-14 shadow-sm border">
            <TabsTrigger value="branding" className="rounded-xl px-8 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
              <ImageIcon className="h-4 w-4 mr-2" /> Logo & Favicon
            </TabsTrigger>
            <TabsTrigger value="landing" className="rounded-xl px-8 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
              <LayoutTemplate className="h-4 w-4 mr-2" /> Página de Inicio
            </TabsTrigger>
            <TabsTrigger value="infra" className="rounded-xl px-8 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">
              <Server className="h-4 w-4 mr-2" /> Sistema & SMTP
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: BRANDING (LOGO & FAVICON) */}
          <TabsContent value="branding" className="space-y-10 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              
              {/* EDITORES PRINCIPALES DE LOGO Y FAVICON */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* CARD 1: CONFIGURACIÓN Y SUBIDA DE LOGOTIPO */}
                <Card className="premium-card">
                  <CardHeader className="bg-slate-50/50 border-b p-8 flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-headline font-black uppercase italic flex items-center gap-3">
                      <ImageIcon className="h-5 w-5 text-primary" /> Logotipo Oficial del Sistema
                    </CardTitle>
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[9px] font-black uppercase tracking-widest">
                      Actualización Instantánea
                    </span>
                  </CardHeader>

                  <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-500">Nombre Principal de Marca</Label>
                        <Input 
                          value={brandName}
                          onChange={e => setBrandName(e.target.value)}
                          placeholder="SYNC"
                          className="h-12 font-black uppercase tracking-wider"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-500">Subtítulo / Sufijo de Marca</Label>
                        <Input 
                          value={brandSub}
                          onChange={e => setBrandSub(e.target.value)}
                          placeholder="CONNECT"
                          className="h-12 font-bold text-sky-500 uppercase tracking-widest"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-slate-500">URL / Enlace Directo de la Imagen del Logo</Label>
                      <Input 
                        value={logoUrl}
                        onChange={e => setLogoUrl(e.target.value)}
                        placeholder="https://drive.google.com/file/d/... o https://tusitio.com/logo.png"
                        className="h-12 font-mono text-xs"
                      />
                      <p className="text-[11px] text-slate-400">
                        Admite enlaces compartidos de <b>Google Drive</b>, imágenes directas HTTPS o archivos locales.
                      </p>
                    </div>

                    {/* BOTÓN SUBIR ARCHIVO DE LOGO DESDE DISPOSITIVO */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border text-slate-600 shadow-sm">
                          {isUploadingLogo ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <Upload className="h-5 w-5 text-primary" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Cargar Archivo de Logo a Firebase Storage</p>
                          <p className="text-[10px] text-slate-400">Archivos PNG, SVG, JPG o WebP (Almacenamiento en Nube)</p>
                        </div>
                      </div>
                      <label className="cursor-pointer shrink-0">
                        <input 
                          type="file" 
                          accept="image/*" 
                          disabled={isUploadingLogo}
                          className="hidden" 
                          onChange={handleLogoFileUpload}
                        />
                        <span className="h-10 px-5 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider flex items-center hover:bg-slate-800 transition-colors disabled:opacity-50">
                          {isUploadingLogo ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-2" />} 
                          {isUploadingLogo ? "Subiendo..." : "Seleccionar Archivo"}
                        </span>
                      </label>
                    </div>

                    {/* PRESETS RÁPIDOS DE LOGO */}
                    <div className="space-y-3 pt-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">O Seleccionar de la Galería de Presets</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { name: "Neon Vector", url: "" },
                          { name: "Cyber Sphere", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80" },
                          { name: "Emerald Cube", url: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&auto=format&fit=crop&q=80" },
                          { name: "Luxe Flame Gold", url: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&auto=format&fit=crop&q=80" }
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setLogoUrl(preset.url)}
                            className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${logoUrl === preset.url ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                          >
                            <span className="text-[10px] font-black uppercase text-slate-700">{preset.name}</span>
                            {logoUrl === preset.url && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* CARD 2: CONFIGURACIÓN Y SUBIDA DE FAVICON */}
                <Card className="premium-card">
                  <CardHeader className="bg-slate-50/50 border-b p-8 flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-headline font-black uppercase italic flex items-center gap-3">
                      <Globe className="h-5 w-5 text-sky-500" /> Icono de Pestaña (Favicon)
                    </CardTitle>
                    <span className="px-3 py-1 bg-sky-50 text-sky-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                      Favicon del Navegador
                    </span>
                  </CardHeader>

                  <CardContent className="p-8 space-y-6">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-slate-500">URL / Enlace del Favicon (.ico, .png, .svg)</Label>
                      <Input 
                        value={faviconUrl}
                        onChange={e => setFaviconUrl(e.target.value)}
                        placeholder="https://tusitio.com/favicon.png o data:image/png..."
                        className="h-12 font-mono text-xs"
                      />
                      <p className="text-[11px] text-slate-400">
                        El favicon es el icono cuadrado que se muestra en las pestañas del navegador junto al título del sitio.
                      </p>
                    </div>

                    {/* SUBIDA LOCAL DE FAVICON */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border text-slate-600 shadow-sm">
                          {isUploadingFavicon ? <Loader2 className="h-5 w-5 text-sky-500 animate-spin" /> : <Globe className="h-5 w-5 text-sky-500" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Cargar Favicon a Firebase Storage</p>
                          <p className="text-[10px] text-slate-400">Recomendado 32x32px o 64x64px (PNG, SVG, ICO)</p>
                        </div>
                      </div>
                      <label className="cursor-pointer shrink-0">
                        <input 
                          type="file" 
                          accept="image/*" 
                          disabled={isUploadingFavicon}
                          className="hidden" 
                          onChange={handleFaviconFileUpload}
                        />
                        <span className="h-10 px-5 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider flex items-center hover:bg-slate-800 transition-colors disabled:opacity-50">
                          {isUploadingFavicon ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-2" />} 
                          {isUploadingFavicon ? "Subiendo..." : "Seleccionar Favicon"}
                        </span>
                      </label>
                    </div>

                    {/* PRESETS RÁPIDOS DE FAVICON */}
                    <div className="space-y-3 pt-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">Presets Recomendados de Favicon</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          { name: "Oficial", url: "/favicon.png" },
                          { name: "Escudo Cian", url: "https://api.iconify.design/lucide:shield-check.svg?color=%2300d8ff" },
                          { name: "Rayo Verde", url: "https://api.iconify.design/lucide:zap.svg?color=%2310b981" },
                          { name: "Crown Oro", url: "https://api.iconify.design/lucide:crown.svg?color=%23f59e0b" },
                          { name: "Átomo Vio", url: "https://api.iconify.design/lucide:atom.svg?color=%236366f1" }
                        ].map((fav, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFaviconUrl(fav.url)}
                            className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all ${faviconUrl === fav.url ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                          >
                            <img src={getGoogleDriveDirectLink(fav.url) || "/favicon.png"} alt={fav.name} className="h-6 w-6 object-contain" />
                            <span className="text-[9px] font-black uppercase text-slate-700">{fav.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* PANEL DE VISTA PREVIA EN TIEMPO REAL & BOTÓN DE GUARDADO */}
              <div className="lg:col-span-4 space-y-8">
                <div className="sticky top-24 space-y-8">
                  
                  {/* BOTÓN PRINCIPAL DE GUARDAR IDENTIDAD VISUAL */}
                  <Card className="premium-card bg-slate-950 text-white border-none shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                    <CardContent className="p-8 space-y-6 relative z-10">
                      <div className="h-14 w-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                        <Sparkles className="h-7 w-7" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-headline font-black uppercase italic tracking-tight">Publicar Identidad</h3>
                        <p className="text-slate-400 text-xs font-medium leading-relaxed">
                          Aplica el nuevo logo y favicon inmediatamente en la navegación, registro, páginas de pago y pestañas del navegador.
                        </p>
                      </div>
                      <Button 
                        onClick={handleSaveBranding}
                        disabled={savingId === 'branding'}
                        className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-slate-950 font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
                      >
                        {savingId === 'branding' ? <Loader2 className="animate-spin" /> : <><Save className="h-5 w-5 mr-2" /> GUARDAR LOGO Y FAVICON</>}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* SIMULADOR VISTA PREVIA DEL LOGO */}
                  <Card className="premium-card p-6 space-y-4">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" /> Vista Previa del Logo
                    </Label>
                    
                    {/* Fondo Oscuro */}
                    <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">En Cabecera / Modo Oscuro</span>
                      <SyncConnectLogo size="md" variant="dark" customImageUrl={logoUrl} />
                    </div>

                    {/* Fondo Claro */}
                    <div className="p-6 bg-slate-100 rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">En Documentos / Modo Claro</span>
                      <SyncConnectLogo size="md" variant="light" customImageUrl={logoUrl} />
                    </div>
                  </Card>

                  {/* SIMULADOR VISTA PREVIA DE PESTAÑA DEL NAVEGADOR (FAVICON) */}
                  <Card className="premium-card p-6 space-y-4">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                      <Globe className="h-4 w-4 text-sky-500" /> Vista Previa Pestaña Navegador
                    </Label>
                    
                    {/* Pestaña de Navegador Simulada */}
                    <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                      <div className="bg-slate-800 rounded-t-xl px-4 py-2.5 flex items-center gap-3 border-b border-slate-700 w-full">
                        <img 
                          src={getGoogleDriveDirectLink(faviconUrl) || "/favicon.png"} 
                          alt="Favicon Preview" 
                          className="h-4 w-4 object-contain shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/favicon.png";
                          }}
                        />
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {brandName} {brandSub} | Panel
                        </span>
                        <span className="ml-auto text-slate-500 text-xs">✕</span>
                      </div>
                      <div className="p-4 bg-slate-950 rounded-b-xl text-[10px] text-slate-500 font-mono text-center">
                        Pestaña activa con Favicon dinámico
                      </div>
                    </div>
                  </Card>

                </div>
              </div>

            </div>
          </TabsContent>

          <TabsContent value="landing" className="space-y-10 animate-in fade-in duration-500">
             
             {/* BANNER PROMOCIONAL AL NUEVO EDITOR VISUAL SYSTEME.IO */}
             <Card className="border-none bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-[2.5rem] shadow-xl overflow-hidden relative border border-white/5">
                <div className="absolute top-1/2 right-10 -translate-y-1/2 w-48 h-48 bg-primary/20 rounded-full blur-[60px] pointer-events-none" />
                <CardContent className="p-10 flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                   <div className="space-y-3">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest">
                         <Zap className="h-3 w-3 fill-current animate-pulse" /> NUEVA INFRAESTRUCTURA VISUAL v2.0
                      </div>
                      <h3 className="text-2xl font-headline font-black uppercase italic tracking-tight">
                         Constructor Visual de Landing <span className="text-primary">Systeme.io Engine</span>
                      </h3>
                      <p className="text-slate-300 text-xs font-medium max-w-xl leading-relaxed">
                         Diseña libremente bloques con soporte drag-reorder, selecciona presets de color vibrantes (Esmeralda, Cósmico, Carbono), modifica tipografías de Google Fonts y previsualiza en tiempo real de forma side-by-side (Desktop y Móvil) con publicación instantánea de 1-click.
                      </p>
                   </div>
                   <Button 
                      onClick={() => router.push('/dashboard/admin/site-builder')}
                      className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/95 text-slate-950 font-black text-xs uppercase tracking-widest shrink-0 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                   >
                      ABRIR EDITOR VISUAL 🚀
                   </Button>
                </CardContent>
             </Card>

             {/* EDITOR DE HERO */}
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-8">
                   <Card className="premium-card">
                      <CardHeader className="bg-slate-50/50 border-b p-8">
                        <CardTitle className="text-xl font-headline font-black uppercase italic flex items-center gap-3">
                          <Zap className="h-5 w-5 text-primary" /> Sección Principal (Hero)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-10 space-y-6">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Titular de Impacto</Label>
                            <Input 
                              value={localLanding?.hero?.headline || ''} 
                              onChange={e => setLocalLanding({...localLanding, hero: {...(localLanding?.hero || {}), headline: e.target.value}})}
                              className="h-14 font-black text-lg uppercase tracking-tight"
                            />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Subtitular Descriptivo</Label>
                            <Textarea 
                              value={localLanding?.hero?.subheadline || ''}
                              onChange={e => setLocalLanding({...localLanding, hero: {...(localLanding?.hero || {}), subheadline: e.target.value}})}
                              className="min-h-[100px] text-sm font-medium leading-relaxed"
                            />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400">Texto del Botón (CTA)</Label>
                            <Input 
                              value={localLanding?.hero?.ctaText || ''}
                              onChange={e => setLocalLanding({...localLanding, hero: {...(localLanding?.hero || {}), ctaText: e.target.value}})}
                              className="h-12 font-bold"
                            />
                         </div>
                      </CardContent>
                   </Card>

                   <Card className="premium-card">
                      <CardHeader className="bg-slate-50/50 border-b p-8 flex flex-row items-center justify-between">
                        <CardTitle className="text-xl font-headline font-black uppercase italic flex items-center gap-3">
                          <User className="h-5 w-5 text-primary" /> Miembros del Equipo
                        </CardTitle>
                        <Button size="sm" onClick={() => setLocalLanding({...localLanding, team: [...(localLanding?.team || []), { name: '', role: '', imageUrl: '' }]})} className="h-10 px-5 rounded-xl bg-slate-900 font-black text-[10px] uppercase">
                           <Plus className="h-4 w-4 mr-2" /> AÑADIR EXPERTO
                        </Button>
                      </CardHeader>
                      <CardContent className="p-10 space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(localLanding?.team || []).map((member: any, idx: number) => (
                              <div key={idx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4 relative group">
                                 <button 
                                   onClick={() => setLocalLanding({...localLanding, team: (localLanding?.team || []).filter((_:any, i:number) => i !== idx)})}
                                   className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"
                                 >
                                    <Trash2 className="h-4 w-4" />
                                 </button>
                                 <div className="space-y-4">
                                    <div className="space-y-1">
                                       <Label className="text-[9px] font-black uppercase text-slate-400">Nombre Completo</Label>
                                       <Input 
                                          value={member.name || ''}
                                          onChange={e => {
                                            const updatedTeam = [...(localLanding?.team || [])];
                                            if (updatedTeam[idx]) {
                                              updatedTeam[idx] = { ...updatedTeam[idx], name: e.target.value };
                                            }
                                            setLocalLanding({...localLanding, team: updatedTeam});
                                          }}
                                          className="h-10 font-bold bg-white"
                                       />
                                    </div>
                                    <div className="space-y-1">
                                       <Label className="text-[9px] font-black uppercase text-slate-400">Cargo / Rol</Label>
                                       <Input 
                                          value={member.role || ''}
                                          onChange={e => {
                                            const updatedTeam = [...(localLanding?.team || [])];
                                            if (updatedTeam[idx]) {
                                              updatedTeam[idx] = { ...updatedTeam[idx], role: e.target.value };
                                            }
                                            setLocalLanding({...localLanding, team: updatedTeam});
                                          }}
                                          className="h-10 text-xs bg-white"
                                       />
                                    </div>
                                    <div className="space-y-1">
                                       <Label className="text-[9px] font-black uppercase text-slate-400">URL Imagen (Google Drive/Link)</Label>
                                       <Input 
                                          value={member.imageUrl || ''}
                                          onChange={e => {
                                            const updatedTeam = [...(localLanding?.team || [])];
                                            if (updatedTeam[idx]) {
                                              updatedTeam[idx] = { ...updatedTeam[idx], imageUrl: e.target.value };
                                            }
                                            setLocalLanding({...localLanding, team: updatedTeam});
                                          }}
                                          className="h-10 text-[10px] bg-white font-mono"
                                       />
                                    </div>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </CardContent>
                   </Card>
                </div>

                <div className="lg:col-span-4 space-y-8">
                   <div className="sticky top-24 space-y-8">
                      <Card className="premium-card bg-slate-900 text-white border-none shadow-2xl">
                         <CardContent className="p-10 space-y-6">
                            <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                               <ShieldCheck className="h-8 w-8" />
                            </div>
                            <div className="space-y-2">
                               <h3 className="text-xl font-headline font-black uppercase italic tracking-tight">Publicación Maestra</h3>
                               <p className="text-slate-400 text-xs font-medium leading-relaxed">Los cambios realizados aquí actualizarán la cara visible de tu plataforma para todos los usuarios y visitantes.</p>
                            </div>
                            <Button 
                              onClick={handleSaveLanding} 
                              disabled={savingId === 'landing'}
                              className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
                            >
                               {savingId === 'landing' ? <Loader2 className="animate-spin" /> : <><Save className="h-5 w-5 mr-2" /> GUARDAR TODO</>}
                            </Button>
                         </CardContent>
                      </Card>

                      <div className="p-8 bg-blue-50 border border-blue-100 rounded-3xl flex items-center gap-5">
                         <Globe className="h-6 w-6 text-blue-600 shrink-0" />
                         <p className="text-[10px] text-blue-800 font-bold leading-relaxed uppercase tracking-wider">
                           La Landing Page utiliza el dominio principal de la infraestructura Sync.
                         </p>
                      </div>
                   </div>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="infra" className="space-y-10 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="premium-card p-10">
                  <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-3"><Mail className="h-6 w-6 text-primary" /> Gmail SMTP</h3>
                  <form onSubmit={handleSaveSmtp} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase">Host</Label>
                        <Input name="smtp_host" defaultValue={settings.smtp_host || 'smtp.gmail.com'} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase">Puerto</Label>
                        <Input name="smtp_port" defaultValue={settings.smtp_port || '465'} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase">Usuario Gmail</Label>
                      <Input name="smtp_user" defaultValue={settings.smtp_user} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase">Pass Aplicación</Label>
                      <Input name="smtp_password" type="password" defaultValue={settings.smtp_password} className="font-mono" />
                    </div>
                    <div className="flex gap-4">
                       <Button type="button" onClick={handleTestEmail} variant="outline" className="flex-1 font-black" disabled={testLoading}>PROBAR</Button>
                       <Button type="submit" className="flex-[2] bg-slate-900 text-white font-black" disabled={savingId === 'settings'}>GUARDAR</Button>
                    </div>
                  </form>
                </Card>

                <Card className="premium-card p-10 bg-slate-50/50">
                  <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-3"><Server className="h-6 w-6 text-slate-400" /> Estado de Nodos</h3>
                  <div className="space-y-6">
                     {[
                       { node: "Auth Central", status: "Online", latency: "12ms" },
                       { node: "Media Store", status: "Online", latency: "24ms" },
                       { node: "AI Core", status: "Online", latency: "110ms" },
                       { node: "Database Cluster", status: "Online", latency: "9ms" }
                     ].map((n, i) => (
                       <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-3">
                             <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                             <span className="text-[10px] font-black uppercase text-slate-900">{n.node}</span>
                          </div>
                          <span className="font-mono text-[9px] text-slate-400">{n.latency}</span>
                       </div>
                     ))}
                  </div>
                </Card>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
