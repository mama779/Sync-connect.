
"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingBag,
  Palette,
  Users2,
  UserCircle,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Zap,
  MapPin,
  UserCheck,
  GraduationCap,
  Link as LinkIcon,
  LayoutTemplate,
  ShieldAlert,
  MessageCircle,
  MessageSquare,
  Loader2,
  Globe,
  Camera,
  Upload,
  Video,
  Terminal,
  Bot,
  FileText,
  Wallet,
  PlusCircle,
  Share2,
  Mail,
  Building2
} from "lucide-react"
import { useLanguage } from "@/components/language-context"
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, updateDocumentNonBlocking } from "@/firebase"
import { doc, onSnapshot, getDoc } from "firebase/firestore"
import placeholderData from "@/app/lib/placeholder-images.json"
import { getGoogleDriveDirectLink } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { signOut } from "firebase/auth"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SyncConnectLogo } from "@/components/SyncConnectLogo"
import { AffiliateVerification } from "@/components/dashboard/affiliate-verification"
import { OnboardingGuideModal } from "@/components/OnboardingGuideModal"
import { Sparkles } from "lucide-react"

interface DashboardShellProps {
  children: React.ReactNode
  role: "admin" | "affiliate" | "buyer"
}

const ADMIN_EMAIL = 'affiliatesync0@gmail.com';

export function DashboardShell({ children, role }: DashboardShellProps) {
  const { t } = useLanguage();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const db = useFirestore();
  const auth = useAuth();
  
  const [mounted, setMounted] = useState(false);
  const [isVerifyingRole, setIsVerifyingRole] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { toast } = useToast();
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
      setShowCamera(true);
    } catch (err) {
      toast({ variant: "destructive", title: "Cámara no disponible", description: "Verifique sus permisos." });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setNewPhotoUrl(dataUrl);
        stopCamera();
      }
    }
  };

  const compressAvatarImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
    });
  };

  const uploadProfileImage = async (imageSource: string) => {
    if (!user || !db) return;
    setUploading(true);
    try {
      const compressedBase64 = await compressAvatarImage(imageSource);
      const collectionName = role === 'buyer' ? 'buyers' : 'affiliates';
      const userRef = doc(db, collectionName, user.uid);
      updateDocumentNonBlocking(userRef, { photoUrl: compressedBase64 });
      toast({ title: "Fotografía Guardada ✓", description: "Tu foto de perfil se ha actualizado correctamente." });
      setIsEditingPhoto(false);
      setNewPhotoUrl('');
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Fallo en carga", description: "No se pudo actualizar la foto de perfil." });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!mounted || !db || !user) return;
    const collectionName = role === 'buyer' ? 'buyers' : 'affiliates';
    const userRef = doc(db, collectionName, user.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setProfile(snap.data());
      }
    });
    return () => unsub();
  }, [mounted, db, user?.uid, role]);

  const [adminSettings, setAdminSettings] = useState<{ emails: string[], phones: string[] }>({ emails: [], phones: [] });

  useEffect(() => {
    if (!db || !mounted) return;
    const ref = doc(db, 'site_config', 'admin_settings');
    getDoc(ref).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAdminSettings({
          emails: data.emails || [],
          phones: data.phones || []
        });
      }
    }).catch(err => {
      console.warn("Lectura offline/cuota de admin_settings en shell:", err);
    });
  }, [db, mounted]);

  const cleanEmail = user?.email?.toLowerCase().trim() || '';
  const cleanPhone = user?.phoneNumber?.trim() || '';
  const isUserAdmin = Boolean(
    cleanEmail === ADMIN_EMAIL || 
    cleanEmail === 'urielroques604@gmail.com' || 
    cleanEmail === 'roquescarlos143@gmail.com' ||
    cleanPhone === '+50588062712' ||
    cleanPhone.includes('88062712') ||
    adminSettings.emails.some(e => e.toLowerCase().trim() === cleanEmail) ||
    adminSettings.phones.some(p => p.trim() === cleanPhone || p.replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, ''))
  );

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let unsubscribe: () => void;

    if (!mounted || isUserLoading) return;
    if (!user) {
      window.location.href = '/';
      return;
    }

    if (isUserAdmin) {
      setIsVerifyingRole(false);
      return;
    }

    if (role === 'admin' && !isUserAdmin) {
       router.push('/dashboard/affiliate');
       return;
    }

    try {
      if (db) {
        const collectionName = role === 'affiliate' ? 'affiliates' : 'buyers';
        const userRef = doc(db, collectionName, user.uid);
        
        unsubscribe = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const userData = snap.data();
            setIsBlocked(userData?.status === 'Blocked');
          }
          setIsVerifyingRole(false);
        }, (err) => {
          console.warn("Auth snapshot warn:", err);
          setIsVerifyingRole(false);
        });
      } else {
        setIsVerifyingRole(false);
      }
    } catch (err) { 
      console.error(err); 
      setIsVerifyingRole(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid, isUserLoading, mounted, isUserAdmin, role, db]);

  const logoConfigRef = useMemoFirebase(() => db ? doc(db, 'site_config', 'site-logo') : null, [db]);
  const { data: logoOverride } = useDoc(logoConfigRef);
  const defaultLogo = placeholderData.placeholderImages.find(img => img.id === 'site-logo');
  const displayLogoUrl = getGoogleDriveDirectLink(logoOverride?.imageUrl || defaultLogo?.imageUrl || "");

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    window.location.href = '/';
  }

  if (!mounted || isUserLoading || isVerifyingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-slate-800 border-t-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Iniciando Protocolos...</p>
        </div>
      </div>
    )
  }

  if (isBlocked && !isUserAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
           <div className="h-24 w-24 bg-red-600 rounded-xl flex items-center justify-center text-white mx-auto shadow-2xl border-4 border-slate-900">
              <ShieldAlert className="h-12 w-12" />
           </div>
           <div className="space-y-4">
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Acceso <span className="text-red-500">Restringido</span></h1>
              <p className="text-slate-400 font-medium leading-relaxed">
                Su cuenta ha sido bloqueada por el sistema. El acceso a la infraestructura Sync está suspendido.
              </p>
           </div>
           <Button asChild className="w-full h-14 bg-white text-slate-950 hover:bg-slate-200 font-black text-[10px] uppercase tracking-widest gap-3 rounded-xl shadow-2xl">
              <a href="mailto:soporte@syncconnect.ni">
                 <MessageCircle className="h-5 w-5" /> SOLICITAR REVISIÓN
              </a>
           </Button>
           <button onClick={handleLogout} className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] hover:text-white transition-colors">
             CERRAR SESIÓN
           </button>
        </div>
      </div>
    );
  }

  const adminItems = [
    { title: "Panel", url: "/dashboard/admin", icon: LayoutDashboard },
    { title: "Redes & Bio-Link", url: "/dashboard/admin/social-bio", icon: Share2 },
    { title: "Campañas Gmail", url: "/dashboard/affiliate/email-campaigns", icon: Mail },
    { title: "Asistente IA Ventas", url: "/dashboard/ai-sales-copilot", icon: Bot },
    { title: "Generador Páginas IA", url: "/dashboard/ai-page-generator", icon: LayoutTemplate },
    { title: "Academia Cursos", url: "/dashboard/admin/academy", icon: GraduationCap },
    { title: "Reuniones", url: "/dashboard/meeting", icon: Video },
    { title: "Afiliados", url: "/dashboard/admin/affiliates", icon: Users },
    { title: "Compradores", url: "/dashboard/admin/buyers", icon: UserCheck },
    { title: "Geolocalización", url: "/dashboard/admin/map", icon: MapPin },
    { title: "Catálogo Productos", url: "/dashboard/admin/products", icon: Package },
    { title: "Materiales & Cycling", url: "/dashboard/admin/marketing-links", icon: LinkIcon },
    { title: "Ventas & Pagos", url: "/dashboard/admin/sales", icon: ShoppingBag },
    { title: "Configuración", url: "/dashboard/admin/design", icon: Palette },
    { title: "Soporte", url: "/dashboard/admin/support", icon: MessageCircle },
  ]

  const affiliateItems = [
    { title: "Resumen", url: "/dashboard/affiliate", icon: LayoutDashboard },
    { title: "Mi Negocio 360", url: "/dashboard/affiliate/business", icon: Building2 },
    { title: "Campañas Gmail", url: "/dashboard/affiliate/email-campaigns", icon: Mail },
    { title: "Registrar Venta", url: "/dashboard/affiliate/register-sale", icon: PlusCircle },
    { title: "Estado de Cuenta", url: "/dashboard/affiliate/statement", icon: Wallet },
    { title: "Constructor de Sitios", url: "/dashboard/affiliate/site-builder", icon: Globe },
    { title: "Asistente IA Ventas", url: "/dashboard/ai-sales-copilot", icon: Bot },
    { title: "Generador Páginas IA", url: "/dashboard/ai-page-generator", icon: LayoutTemplate },
    { title: "Academia", url: "/dashboard/affiliate/academy", icon: GraduationCap },
    { title: "Reuniones", url: "/dashboard/meeting", icon: Video },
    { title: "Catálogo Productos", url: "/dashboard/affiliate/products", icon: ShoppingBag },
    { title: "Enlaces Cycling", url: "/dashboard/affiliate/marketing-links", icon: LinkIcon },
    { title: "Mis Clientes", url: "/dashboard/affiliate/buyers", icon: Users2 },
    { title: "Geolocalización", url: "/dashboard/affiliate/map", icon: MapPin },
    { title: "Soporte", url: "/dashboard/affiliate/support", icon: MessageCircle },
    { title: "Cuenta", url: "/dashboard/affiliate/profile", icon: UserCircle },
  ]

  const buyerItems = [
    { title: "Mis Cursos", url: "/dashboard/buyer", icon: LayoutDashboard },
    { title: "Estado de Cuenta", url: "/dashboard/buyer/statement", icon: FileText },
    { title: "Asistente IA", url: "/dashboard/ai-sales-copilot", icon: Bot },
    { title: "Mercado Productos", url: "/dashboard/buyer/products", icon: ShoppingBag },
    { title: "Soporte", url: "/dashboard/buyer/support", icon: MessageCircle },
  ]

  const isPendingVerification = role === 'affiliate' && profile?.status === 'Pending' && !isUserAdmin;

  const menuItems = isUserAdmin 
    ? adminItems 
    : role === 'buyer' 
      ? buyerItems 
      : isPendingVerification
        ? [{ title: "Verificación de Cuenta", url: "/dashboard/affiliate", icon: ShieldAlert }]
        : affiliateItems;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col text-white">
      <header className="h-16 bg-[#131921]/80 backdrop-blur-md text-white flex items-center px-4 md:px-8 justify-between sticky top-0 z-[100] border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-10">
          <Link href={isUserAdmin ? "/dashboard/admin" : role === 'buyer' ? "/dashboard/buyer" : "/dashboard/affiliate"} className="shrink-0 flex items-center">
            <SyncConnectLogo size="md" variant="dark" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {menuItems.map((item) => (
              <Link 
                key={item.title} 
                href={item.url} 
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  pathname === item.url ? "bg-white/10 text-primary shadow-xl" : "text-white/40 hover:bg-white/5 hover:text-white"
                )}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            onClick={() => setShowOnboarding(true)}
            variant="outline" 
            className="border-amber-500/40 text-amber-300 hover:text-white hover:bg-amber-500/20 text-[10px] font-bold uppercase tracking-wider px-2.5 h-8 rounded-lg hidden sm:flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Guía Paso a Paso
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:text-primary transition-all text-left group bg-white/5 p-1.5 pr-4 rounded-2xl border border-white/5">
                <div className="h-8 w-8 rounded-xl bg-slate-900 flex items-center justify-center text-primary font-black text-xs border border-white/10 group-hover:border-primary/50 shadow-inner relative overflow-hidden shrink-0">
                  {profile?.photoUrl ? (
                    <Image 
                      src={getGoogleDriveDirectLink(profile.photoUrl)} 
                      alt="Avatar" 
                      fill 
                      className="object-cover" 
                      unoptimized 
                    />
                  ) : (
                    user?.displayName?.charAt(0) || user?.email?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden md:block">
                  <p className="text-[8px] font-black uppercase text-white/30 leading-none mb-1">Hola, {profile?.firstName || user?.displayName?.split(' ')[0] || 'Socio'}</p>
                  <p className="text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-1">Cuenta <ChevronDown className="h-3 w-3 opacity-30" /></p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 bg-[#131921] border-white/10 rounded-2xl shadow-3xl mt-4 text-white">
              <DropdownMenuLabel className="p-4 border-b border-white/5 mb-2">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Nodo Registrado:</p>
                 <p className="text-xs font-bold text-white truncate">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setShowOnboarding(true)} className="rounded-xl p-3 focus:bg-white/5 font-black text-[10px] uppercase tracking-widest gap-3 cursor-pointer transition-all hover:text-amber-400 focus:text-amber-400">
                <Sparkles className="h-4 w-4 text-amber-400" /> GUÍA PASO A PASO 🚀
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEditingPhoto(true)} className="rounded-xl p-3 focus:bg-white/5 font-black text-[10px] uppercase tracking-widest gap-3 cursor-pointer transition-all hover:text-primary focus:text-primary">
                <Camera className="h-4 w-4 text-primary" /> CAMBIAR FOTO DE PERFIL
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onClick={handleLogout} className="rounded-xl p-3 text-red-500 focus:bg-red-500/10 focus:text-red-400 font-black text-[10px] uppercase tracking-widest gap-3 cursor-pointer transition-all">
                <LogOut className="h-4 w-4" /> CERRAR SESIÓN
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <OnboardingGuideModal 
            isOpen={showOnboarding} 
            onClose={() => setShowOnboarding(false)} 
            autoShowOnFirstVisit={true}
          />

          <Button 
            variant="ghost" 
            className="text-white hover:bg-white/10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 px-3 h-9 text-xs font-bold gap-1.5" 
            onClick={() => setIsMobileMenuOpen(true)}
            title="Abrir Menú de Navegación"
          >
            <Menu className="h-5 w-5 text-[#00D8FF]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Menú</span>
          </Button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[200] flex">
           <div className="absolute inset-0 bg-[#0a0a0f]/95 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
           <div className="relative w-[85%] max-w-[320px] bg-[#131921] h-full animate-in slide-in-from-right duration-300 border-l border-white/5">
              <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
                 <span className="font-black text-lg uppercase italic tracking-tighter">Sync <span className="text-primary">Menu</span></span>
                 <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/40 hover:text-white p-2 bg-white/5 rounded-xl"><X className="h-6 w-6" /></button>
              </div>
              <ScrollArea className="h-[calc(100vh-80px)] p-6">
                 <div className="space-y-2">
                   {menuItems.map((item) => (
                     <Link 
                      key={item.title} 
                      href={item.url} 
                      onClick={() => setIsMobileMenuOpen(false)} 
                      className={cn(
                        "flex items-center gap-4 p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all",
                        pathname === item.url ? "bg-primary text-white shadow-2xl shadow-primary/20" : "text-white/40 hover:bg-white/5 hover:text-white"
                      )}
                    >
                       <item.icon className="h-5 w-5" /> {item.title}
                     </Link>
                   ))}
                 </div>
              </ScrollArea>
           </div>
        </div>
      )}

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        {isPendingVerification ? (
          <AffiliateVerification profile={profile} user={user} db={db} />
        ) : (
          children
        )}
      </main>

      <Dialog open={isEditingPhoto} onOpenChange={(v) => { setIsEditingPhoto(v); if(!v) stopCamera(); }}>
        <DialogContent className="rounded-[3rem] p-12 border-none shadow-3xl bg-slate-950 text-white max-w-lg w-[95vw] z-[250]">
          <div className="space-y-10">
            <div className="text-center relative">
               <h2 className="text-3xl font-headline font-black text-white uppercase tracking-tighter italic">Firma <span className="text-primary">Biométrica</span></h2>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">Actualización de identidad corporativa</p>
            </div>
            
            <div className="space-y-8">
               {showCamera ? (
                 <div className="space-y-6">
                    <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-black border-2 border-white/5 shadow-inner">
                       <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="grid grid-cols-2 gap-4">
                       <Button variant="outline" onClick={stopCamera} className="h-14 font-black text-[10px] uppercase rounded-xl border-white/10 text-white hover:bg-white/5">Cerrar</Button>
                       <Button onClick={capturePhoto} className="h-14 bg-primary text-slate-950 hover:bg-primary/90 font-black text-[10px] uppercase rounded-xl shadow-xl">CAPTURAR</Button>
                    </div>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 gap-6">
                    {newPhotoUrl ? (
                      <div className="flex flex-col items-center gap-6">
                         <div className="relative h-64 w-56 rounded-[2rem] overflow-hidden border-2 border-primary shadow-[0_0_50px_rgba(255,153,0,0.3)] animate-in zoom-in-95">
                           <img src={newPhotoUrl} className="h-full w-full object-cover" alt="preview" />
                         </div>
                         <Button variant="ghost" onClick={() => setNewPhotoUrl('')} className="text-[10px] font-black text-slate-500 uppercase hover:text-primary transition-colors">Volver a intentar</Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-6">
                        <Button onClick={startCamera} variant="outline" className="h-48 rounded-[2rem] border-dashed border-2 border-white/10 flex flex-col items-center justify-center gap-5 hover:bg-white/5 transition-all group text-white">
                          <div className="h-14 w-14 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-primary transition-colors"><Camera className="h-7 w-7" /></div>
                          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Usar Cámara</span>
                        </Button>
                        <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="h-48 rounded-[2rem] border-dashed border-2 border-white/10 flex flex-col items-center justify-center gap-5 hover:bg-white/5 transition-all group text-white">
                          <div className="h-14 w-14 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-primary transition-colors"><Upload className="h-7 w-7" /></div>
                          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Subir Archivo</span>
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                             const reader = new FileReader();
                             reader.onload = (ev) => setNewPhotoUrl(ev.target?.result as string);
                             reader.readAsDataURL(file);
                          }
                        }} accept="image/*" className="hidden" />
                      </div>
                    )}
                 </div>
               )}
            </div>

            {newPhotoUrl && (
              <Button 
                onClick={() => uploadProfileImage(newPhotoUrl)} 
                className="h-18 w-full bg-primary hover:bg-primary/80 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-3xl transition-all active:scale-95" 
                disabled={uploading}
              >
                {uploading ? <Loader2 className="animate-spin h-6 w-6" /> : "INSTALAR IDENTIDAD"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <footer className="h-24 border-t border-white/5 bg-[#131921]/20 flex items-center justify-center">
         <p className="text-[9px] font-black uppercase text-slate-600 tracking-[0.5em] text-center px-6">Sync Connect Infrastructure • Global Sales Node • 2024</p>
      </footer>
    </div>
  )
}
