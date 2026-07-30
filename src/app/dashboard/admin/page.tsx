
"use client"

import { useState, useEffect } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { 
  ShoppingBag, 
  Wallet, 
  Loader2, 
  Users, 
  Target,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Calendar,
  Zap,
  Activity,
  ArrowUpRight,
  Trash2,
  Mail,
  Key,
  Server,
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Gift,
  Power
} from 'lucide-react'
import { useLanguage } from '@/components/language-context'
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase'
import { collection, query, orderBy, limit, doc, getDoc, setDoc } from 'firebase/firestore'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { getFreeSpotsInfo, setFreeInvitationsConfig } from '@/lib/free-spots'

export default function AdminDashboard() {
  const { t } = useLanguage();
  const db = useFirestore();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const { toast } = useToast();
  const [adminEmails, setAdminEmails] = useState<string[]>(['affiliatesync0@gmail.com', 'urielroques604@gmail.com', 'roquescarlos143@gmail.com']);
  const [adminPhones, setAdminPhones] = useState<string[]>(['+50588062712']);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Estados para credenciales SMTP de Gmail
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpUser, setSmtpUser] = useState('affiliatesync0@gmail.com');
  const [smtpPassword, setSmtpPassword] = useState('wagrmuphptnevpin');
  const [smtpFromName, setSmtpFromName] = useState('Sync Connect Activaciones');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');

  // Estados para Invitaciones Gratuitas y Tarifas
  const [freeInvitationsEnabled, setFreeInvitationsEnabled] = useState(false);
  const [freeTotalSpots, setFreeTotalSpots] = useState(6);
  const [freeUsedSpots, setFreeUsedSpots] = useState(0);
  const [freeAffiliatePrice, setFreeAffiliatePrice] = useState(6);
  const [freeSellerPrice, setFreeSellerPrice] = useState(7);
  const [isSavingFreeConfig, setIsSavingFreeConfig] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  useEffect(() => { 
    setMounted(true); 
    setCurrentTime(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    if (!db) return;
    const adminSettingsRef = doc(db, 'site_config', 'admin_settings');
    getDoc(adminSettingsRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.emails) setAdminEmails(data.emails);
        if (data.phones) setAdminPhones(data.phones);
      } else {
        setDoc(adminSettingsRef, {
          emails: ['affiliatesync0@gmail.com', 'urielroques604@gmail.com', 'roquescarlos143@gmail.com'],
          phones: ['+50588062712']
        }).catch(err => console.warn("Error sembrando admin_settings por defecto:", err));
      }
    }).catch((err) => {
      console.warn("Error cargando admin settings:", err);
    });

    // Cargar credenciales SMTP desde site_config/settings
    const settingsRef = doc(db, 'site_config', 'settings');
    getDoc(settingsRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.smtp_host) setSmtpHost(data.smtp_host);
        if (data.smtp_port) setSmtpPort(data.smtp_port);
        if (data.smtp_user) {
          setSmtpUser(data.smtp_user);
          setTestEmailRecipient(data.smtp_user);
        }
        if (data.smtp_password) setSmtpPassword(data.smtp_password);
        if (data.smtp_from_name) setSmtpFromName(data.smtp_from_name);
      } else {
        setTestEmailRecipient('affiliatesync0@gmail.com');
      }
    }).catch(err => console.warn("Error cargando SMTP settings:", err));

    // Cargar configuración de Invitaciones Gratuitas
    getFreeSpotsInfo(db).then((info) => {
      setFreeInvitationsEnabled(info.enabled);
      setFreeTotalSpots(info.totalFreeSpots);
      setFreeUsedSpots(info.usedFreeSpots);
      setFreeAffiliatePrice(info.affiliatePrice || 6);
      setFreeSellerPrice(info.sellerPrice || 7);
    }).catch(err => console.warn("Error cargando free spots config:", err));
  }, [db]);

  const handleSaveFreeConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setIsSavingFreeConfig(true);
    try {
      const success = await setFreeInvitationsConfig(db, {
        enabled: freeInvitationsEnabled,
        totalSpots: Number(freeTotalSpots),
        usedSpots: Number(freeUsedSpots),
        affiliatePrice: Number(freeAffiliatePrice),
        sellerPrice: Number(freeSellerPrice)
      });
      if (success) {
        toast({ 
          title: freeInvitationsEnabled ? "Invitaciones Gratuitas HABILITADAS ✓" : "Configuración Guardada ✓", 
          description: `Tarifa Afiliados: $${freeAffiliatePrice} USD | Tarifa Vendedores: $${freeSellerPrice} USD.` 
        });
      } else {
        throw new Error("No se pudo guardar en Firestore");
      }
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error al guardar", 
        description: err?.message || "No se pudo actualizar la configuración." 
      });
    } finally {
      setIsSavingFreeConfig(false);
    }
  };

  const handleSendReminders = async () => {
    setIsSendingReminders(true);
    try {
      const res = await fetch('/api/admin/send-activation-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "¡Recordatorios Enviados! 🚀",
          description: data.message || `Se enviaron ${data.countSent} correos y notificaciones de motivación.`
        });
      } else {
        throw new Error(data.error || "No se pudieron enviar las notificaciones.");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error de envío",
        description: err?.message || "Error al enviar recordatorios."
      });
    } finally {
      setIsSendingReminders(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setIsSavingSmtp(true);
    try {
      await setDoc(doc(db, 'site_config', 'settings'), {
        smtp_host: smtpHost.trim(),
        smtp_port: smtpPort.trim(),
        smtp_user: smtpUser.trim(),
        smtp_password: smtpPassword.trim(),
        smtp_from_name: smtpFromName.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast({ 
        title: "Credenciales SMTP Guardadas ✓", 
        description: "Los correos de activación enviarán notificaciones con esta cuenta Gmail." 
      });
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error al guardar SMTP", 
        description: err?.message || "No se pudo actualizar la configuración." 
      });
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleTestSmtp = async () => {
    const target = (testEmailRecipient || smtpUser).trim();
    if (!target) {
      toast({ variant: "destructive", title: "Atención", description: "Ingresa un correo para realizar la prueba." });
      return;
    }

    setIsTestingSmtp(true);
    try {
      // Primero guardar la configuración actual
      if (db) {
        await setDoc(doc(db, 'site_config', 'settings'), {
          smtp_host: smtpHost.trim(),
          smtp_port: smtpPort.trim(),
          smtp_user: smtpUser.trim(),
          smtp_password: smtpPassword.trim(),
          smtp_from_name: smtpFromName.trim(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      const res = await fetch('/api/admin/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target })
      });
      const data = await res.json();

      if (data.success) {
        toast({ 
          title: "¡Conexión SMTP Exitosa! 🚀", 
          description: `Se ha enviado el correo de prueba a ${target}.` 
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Error de Servidor SMTP", 
          description: data.error || "No se pudo establecer conexión con Gmail." 
        });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Fallo de envío", description: err?.message || "Error al probar la cuenta SMTP." });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToTrim = newEmail.trim().toLowerCase();
    if (!emailToTrim) return;
    if (adminEmails.includes(emailToTrim)) {
      toast({ title: "Email ya existe", description: "El correo electrónico ya está en la lista de administradores.", variant: "destructive" });
      return;
    }

    const updatedEmails = [...adminEmails, emailToTrim];
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'site_config', 'admin_settings'), {
        emails: updatedEmails,
        phones: adminPhones
      }, { merge: true });
      setAdminEmails(updatedEmails);
      setNewEmail('');
      toast({ title: "Administrador agregado", description: `Se ha autorizado a ${emailToTrim} como administrador.` });
    } catch (err) {
      console.error("Error saving admin email:", err);
      toast({ title: "Error al guardar", description: "No se pudieron guardar los cambios en la base de datos.", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRemoveEmail = async (emailToRemove: string) => {
    if (emailToRemove === 'urielroques604@gmail.com' || emailToRemove === 'affiliatesync0@gmail.com' || emailToRemove === 'roquescarlos143@gmail.com') {
      toast({ title: "Acción no permitida", description: "No puedes eliminar los administradores principales del sistema.", variant: "destructive" });
      return;
    }

    const updatedEmails = adminEmails.filter(e => e !== emailToRemove);
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'site_config', 'admin_settings'), {
        emails: updatedEmails,
        phones: adminPhones
      }, { merge: true });
      setAdminEmails(updatedEmails);
      toast({ title: "Administrador eliminado", description: `${emailToRemove} ya no tiene privilegios de administrador.` });
    } catch (err) {
      console.error("Error removing admin email:", err);
      toast({ title: "Error al guardar", description: "No se pudieron guardar los cambios en la base de datos.", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    let phoneToTrim = newPhone.trim();
    if (!phoneToTrim) return;
    
    // Auto add + prefix if missing
    if (!phoneToTrim.startsWith('+')) {
      phoneToTrim = '+' + phoneToTrim.replace(/\D/g, '');
    } else {
      phoneToTrim = '+' + phoneToTrim.slice(1).replace(/\D/g, '');
    }

    if (adminPhones.includes(phoneToTrim)) {
      toast({ title: "Teléfono ya existe", description: "El número de teléfono ya está en la lista de administradores.", variant: "destructive" });
      return;
    }

    const updatedPhones = [...adminPhones, phoneToTrim];
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'site_config', 'admin_settings'), {
        emails: adminEmails,
        phones: updatedPhones
      }, { merge: true });
      setAdminPhones(updatedPhones);
      setNewPhone('');
      toast({ title: "Teléfono de administrador agregado", description: `Se ha autorizado al teléfono ${phoneToTrim} como administrador.` });
    } catch (err) {
      console.error("Error saving admin phone:", err);
      toast({ title: "Error al guardar", description: "No se pudieron guardar los cambios en la base de datos.", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRemovePhone = async (phoneToRemove: string) => {
    if (phoneToRemove === '+50588062712') {
      toast({ title: "Acción no permitida", description: "No puedes eliminar el número telefónico principal de administración.", variant: "destructive" });
      return;
    }

    const updatedPhones = adminPhones.filter(p => p !== phoneToRemove);
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'site_config', 'admin_settings'), {
        emails: adminEmails,
        phones: updatedPhones
      }, { merge: true });
      setAdminPhones(updatedPhones);
      toast({ title: "Teléfono de administrador eliminado", description: `El número ${phoneToRemove} ya no tiene privilegios.` });
    } catch (err) {
      console.error("Error removing admin phone:", err);
      toast({ title: "Error al guardar", description: "No se pudieron guardar los cambios en la base de datos.", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const salesQuery = useMemoFirebase(() => (!db || isAuthLoading || !user) ? null : query(collection(db, 'sales'), orderBy('saleDate', 'desc'), limit(10)), [db, user, isAuthLoading]);
  const { data: sales, isLoading: salesLoading } = useCollection(salesQuery);

  const affiliatesQuery = useMemoFirebase(() => (!db || isAuthLoading || !user) ? null : collection(db, 'affiliates'), [db, user, isAuthLoading]);
  const { data: affiliates } = useCollection(affiliatesQuery);

  const buyersQuery = useMemoFirebase(() => (!db || isAuthLoading || !user) ? null : collection(db, 'buyers'), [db, user, isAuthLoading]);
  const { data: buyers } = useCollection(buyersQuery);

  if (!mounted) return null;

  const totalRevenue = (sales || []).reduce((acc, s) => acc + (s.saleAmount || 0), 0);

  const stats = [
    { title: "Ingresos Brutos", value: `$${totalRevenue.toLocaleString()}`, icon: Wallet, color: "text-orange-500", bg: "bg-orange-50" },
    { title: "Volumen Operativo", value: (sales || []).length.toString(), icon: Activity, color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Red Platinum", value: (affiliates || []).length.toString(), icon: Users, color: "text-purple-500", bg: "bg-purple-50" },
    { title: "Base de Datos", value: (buyers || []).length.toString(), icon: Target, color: "text-green-500", bg: "bg-green-50" },
  ]

  return (
    <DashboardShell role="admin">
      <div className="space-y-12">
        {/* HEADER DE CONTROL MAESTRO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 bg-white p-12 rounded-[4rem] shadow-sm border border-slate-50">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                <ShieldCheck className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Central Command Unit</span>
            </div>
            <h1 className="text-5xl font-headline font-black text-slate-950 tracking-tighter leading-none uppercase italic">Resumen <span className="text-orange-500">Ejecutivo</span></h1>
            <p className="text-lg text-slate-500 font-medium">Monitorización de KPIs y rendimiento de red en tiempo real.</p>
          </div>
          <Badge variant="outline" className="h-10 px-6 rounded-2xl bg-slate-50 border-slate-100 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Sincronizado: {currentTime}
          </Badge>
        </div>

        {/* MÉTRICAS ELITE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <Card key={i} className="premium-card">
              <CardContent className="p-10">
                <div className="flex justify-between items-start mb-10">
                  <div className={`h-16 w-16 ${stat.bg} ${stat.color} rounded-[1.5rem] flex items-center justify-center shadow-inner`}>
                    <stat.icon className="h-8 w-8" />
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase">Live</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.title}</p>
                  <h3 className="text-4xl font-black text-slate-950 tracking-tighter italic">{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <Card className="lg:col-span-8 premium-card">
            <CardHeader className="bg-slate-50/50 border-b p-10 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-headline font-black uppercase italic text-slate-950">Transacciones <span className="text-orange-500">Globales</span></CardTitle>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Últimas 10 operaciones del sistema</p>
              </div>
              <BarChart3 className="h-6 w-6 text-slate-200" />
            </CardHeader>
            <CardContent className="p-0">
              {salesLoading ? (
                <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-orange-500" /></div>
              ) : !sales || sales.length === 0 ? (
                <div className="h-[400px] flex flex-col items-center justify-center opacity-20 gap-4">
                  <ShoppingBag className="h-16 w-16" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Esperando flujo de datos...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                   <table className="w-full">
                      <thead className="bg-slate-50/30 border-b">
                         <tr>
                            <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                            <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                            <th className="px-10 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Monto</th>
                         </tr>
                      </thead>
                      <tbody>
                         {sales.map((s) => (
                           <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50/30 transition-colors group">
                              <td className="px-10 py-6">
                                 <p className="text-sm font-black text-slate-900 uppercase truncate max-w-[200px] group-hover:text-orange-500 transition-colors">{s.productName}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase">{s.buyerName}</p>
                              </td>
                              <td className="px-10 py-6">
                                 <Badge className={s.status === 'Completed' ? "bg-green-100 text-green-700 border-none px-4 py-1.5 rounded-full text-[9px] font-black uppercase" : "bg-amber-100 text-amber-700 border-none px-4 py-1.5 rounded-full text-[9px] font-black uppercase"}>
                                    {s.status === 'Completed' ? 'LIQUIDADO' : 'PENDIENTE'}
                                 </Badge>
                              </td>
                              <td className="px-10 py-6 text-right">
                                 <p className="text-lg font-black text-slate-900 italic tracking-tighter">${s.saleAmount?.toFixed(2)}</p>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-4 space-y-8">
            <Card className="premium-card bg-slate-950 text-white border-none">
              <CardContent className="p-12 space-y-10">
                <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center text-orange-500 shadow-2xl">
                  <Calendar className="h-8 w-8" />
                </div>
                <div className="space-y-4">
                  <h4 className="text-3xl font-headline font-black uppercase italic leading-none">Próximos <span className="text-orange-500">Pagos</span></h4>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed">
                    Las solicitudes de liquidación de comisiones se procesan automáticamente cada viernes para asegurar la fluidez de la red.
                  </p>
                </div>
                <div className="pt-6 border-t border-white/5 flex flex-col gap-6">
                   <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-between group cursor-pointer hover:bg-orange-500 transition-all duration-500">
                     <div>
                       <p className="text-[10px] font-black uppercase text-white/40 group-hover:text-white/60">Cierre Semanal</p>
                       <p className="text-xl font-black mt-1 group-hover:scale-105 transition-transform">Viernes, 18:00</p>
                     </div>
                     <ArrowUpRight className="h-6 w-6 text-orange-500 group-hover:text-white" />
                   </div>
                   <div className="flex items-center gap-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                      <Zap className="h-4 w-4 text-orange-500" /> Sistema de Liquidación Sync Safe
                   </div>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card p-10 space-y-6">
               <h4 className="text-sm font-black uppercase text-slate-950 tracking-[0.2em] flex items-center gap-3">
                 <Zap className="h-4 w-4 text-orange-500 fill-current" /> Notas de Sistema
               </h4>
               <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic">
                    "Verifica los vouchers bancarios manualmente antes de aprobar ventas directas para mantener la integridad financiera."
                  </p>
                  <p className="text-[9px] font-black text-slate-400 uppercase text-right">— Admin Protocol</p>
               </div>
            </Card>
          </div>
        </div>

        {/* PANEL DE ADMINISTRADORES AUTORIZADOS */}
        <Card className="premium-card">
          <CardHeader className="bg-slate-50/50 border-b p-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-headline font-black uppercase italic text-slate-950">Administradores <span className="text-orange-500">Autorizados</span></CardTitle>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gestiona quién tiene acceso a este Command Unit</p>
            </div>
            <Badge variant="outline" className="rounded-xl border-orange-200 text-orange-600 bg-orange-50/50 font-black text-[10px] tracking-wider uppercase h-8 px-4">
              Seguridad del Sistema
            </Badge>
          </CardHeader>
          <CardContent className="p-10 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              
              {/* Sección de correos */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-black uppercase text-slate-950 tracking-wider mb-2">Cuentas de Google / Gmail</h4>
                  <p className="text-xs text-slate-400 font-medium">Los usuarios con estos correos podrán iniciar sesión vía Google o email y acceder al panel administrador.</p>
                </div>

                <form onSubmit={handleAddEmail} className="flex gap-2">
                  <Input 
                    type="email" 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)} 
                    placeholder="nuevo-admin@gmail.com" 
                    required 
                    className="h-11 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 px-4 text-xs font-bold focus:ring-orange-500"
                  />
                  <Button 
                    type="submit" 
                    disabled={savingSettings}
                    className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs px-6 uppercase"
                  >
                    Agregar
                  </Button>
                </form>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                  {adminEmails.map((emailItem) => (
                    <div key={emailItem} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                      <span className="text-xs font-bold text-slate-800">{emailItem}</span>
                      {emailItem !== 'urielroques604@gmail.com' && emailItem !== 'affiliatesync0@gmail.com' && emailItem !== 'roquescarlos143@gmail.com' ? (
                        <Button 
                          onClick={() => handleRemoveEmail(emailItem)} 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-[9px] font-black text-orange-500 uppercase bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">Principal</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sección de teléfonos */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-black uppercase text-slate-950 tracking-wider mb-2">Números de Teléfono Autorizados</h4>
                  <p className="text-xs text-slate-400 font-medium">Los usuarios con estos números telefónicos (incluyendo código de país) podrán iniciar sesión y acceder al panel administrador.</p>
                </div>

                <form onSubmit={handleAddPhone} className="flex gap-2">
                  <Input 
                    type="text" 
                    value={newPhone} 
                    onChange={(e) => setNewPhone(e.target.value)} 
                    placeholder="+50588062712" 
                    required 
                    className="h-11 rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 px-4 text-xs font-bold focus:ring-orange-500"
                  />
                  <Button 
                    type="submit" 
                    disabled={savingSettings}
                    className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs px-6 uppercase"
                  >
                    Agregar
                  </Button>
                </form>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                  {adminPhones.map((phoneItem) => (
                    <div key={phoneItem} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                      <span className="text-xs font-mono font-bold text-slate-800">{phoneItem}</span>
                      {phoneItem !== '+50588062712' ? (
                        <Button 
                          onClick={() => handleRemovePhone(phoneItem)} 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-[9px] font-black text-orange-500 uppercase bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">Principal</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* PANEL DE CONTROL DE INVITACIONES GRATUITAS ($0 USD) */}
        <Card className="premium-card border-2 border-emerald-500/20 shadow-xl">
          <CardHeader className="bg-emerald-50/40 border-b p-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-headline font-black uppercase italic text-slate-950 flex items-center gap-3">
                <Gift className="h-6 w-6 text-emerald-600" /> Control de <span className="text-emerald-600">Invitaciones Gratuitas ($0 USD)</span>
              </CardTitle>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Habilita o deshabilita la promoción de registro gratis $0 USD y administra los cupos
              </p>
            </div>
            <Badge 
              variant="outline" 
              className={`rounded-xl font-black text-[10px] tracking-wider uppercase h-8 px-4 flex items-center gap-2 ${
                freeInvitationsEnabled 
                  ? 'border-emerald-300 text-emerald-700 bg-emerald-100' 
                  : 'border-slate-300 text-slate-600 bg-slate-100'
              }`}
            >
              <Power className={`h-3.5 w-3.5 ${freeInvitationsEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
              {freeInvitationsEnabled ? 'ESTADO: HABILITADO ($0 USD)' : 'ESTADO: DESHABILITADO'}
            </Badge>
          </CardHeader>

          <CardContent className="p-10 space-y-8">
            <form onSubmit={handleSaveFreeConfig} className="space-y-6">
              
              {/* Interruptor Principal */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <Label className="text-xs font-black uppercase text-slate-700 block">
                  Estado de Promoción de Invitaciones Gratuitas
                </Label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Button
                    type="button"
                    onClick={() => setFreeInvitationsEnabled(true)}
                    className={`w-full sm:w-1/2 h-14 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${
                      freeInvitationsEnabled
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-500'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    Habilitar Invitaciones ($0 USD)
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setFreeInvitationsEnabled(false)}
                    className={`w-full sm:w-1/2 h-14 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${
                      !freeInvitationsEnabled
                        ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20 ring-2 ring-slate-800'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <Power className="h-5 w-5 text-rose-400" />
                    Deshabilitar Invitaciones ($6 / $7 USD)
                  </Button>
                </div>

                <p className="text-xs font-medium text-slate-500">
                  {freeInvitationsEnabled ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      ✓ Las invitaciones gratuitas están HABILITADAS. Los nuevos usuarios obtendrán membresía $0 USD si hay cupos.
                    </span>
                  ) : (
                    <span className="text-slate-600 font-bold flex items-center gap-1.5">
                      <Power className="h-4 w-4 text-slate-400" />
                      🚫 Las invitaciones gratuitas están DESACTIVADAS. Todos los nuevos usuarios pagarán $6 USD (Afiliados) o $7 USD (Vendedores).
                    </span>
                  )}
                </p>
              </div>

              {/* Configuración de Cupos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500">
                    Total Cupos Gratuitos
                  </Label>
                  <Input 
                    type="number"
                    min="0"
                    value={freeTotalSpots}
                    onChange={(e) => setFreeTotalSpots(Number(e.target.value))}
                    required
                    className="h-12 font-mono text-sm font-bold rounded-xl bg-slate-50 border-none ring-1 ring-slate-200"
                  />
                  <p className="text-[10px] text-slate-400">Límite total de accesos $0 USD (Ej: 6)</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500">
                    Cupos Consumidos
                  </Label>
                  <Input 
                    type="number"
                    min="0"
                    value={freeUsedSpots}
                    onChange={(e) => setFreeUsedSpots(Number(e.target.value))}
                    required
                    className="h-12 font-mono text-sm font-bold rounded-xl bg-slate-50 border-none ring-1 ring-slate-200"
                  />
                  <p className="text-[10px] text-slate-400">Cupos que ya fueron reclamados</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500">
                    Cupos Restantes
                  </Label>
                  <div className="h-12 px-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-emerald-900">Disponible</span>
                    <span className="text-base font-black font-mono text-emerald-600">
                      {Math.max(0, freeTotalSpots - freeUsedSpots)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Lugares disponibles en directo</p>
                </div>
              </div>

              {/* Configuración de Tarifas de Activación (Vendedor $7 / Afiliado $6) */}
              <div className="pt-6 border-t space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Tarifas Estándar de Activación de Cuenta ($ USD)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500">
                      Activación Afiliado ($ USD)
                    </Label>
                    <Input 
                      type="number"
                      min="1"
                      value={freeAffiliatePrice}
                      onChange={(e) => setFreeAffiliatePrice(Number(e.target.value))}
                      required
                      className="h-12 font-mono text-sm font-bold rounded-xl bg-slate-50 border-none ring-1 ring-slate-200"
                    />
                    <p className="text-[10px] text-slate-400">Precio base para afiliado (Predeterminado: $6 USD)</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500">
                      Activación Vendedor / Productor ($ USD)
                    </Label>
                    <Input 
                      type="number"
                      min="1"
                      value={freeSellerPrice}
                      onChange={(e) => setFreeSellerPrice(Number(e.target.value))}
                      required
                      className="h-12 font-mono text-sm font-bold rounded-xl bg-slate-50 border-none ring-1 ring-slate-200"
                    />
                    <p className="text-[10px] text-slate-400">Precio base para vendedor (Predeterminado: $7 USD)</p>
                  </div>
                </div>
              </div>

              {/* Botón de Guardado */}
              <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                <Button
                  type="button"
                  onClick={handleSendReminders}
                  disabled={isSendingReminders}
                  variant="outline"
                  className="w-full sm:w-auto h-12 px-6 rounded-xl border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-900 font-black text-xs uppercase flex items-center gap-2"
                >
                  {isSendingReminders ? (
                    <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                  ) : (
                    <Mail className="h-4 w-4 text-orange-600" />
                  )}
                  Enviar Correos y Notificaciones a Pendientes
                </Button>

                <Button
                  type="submit"
                  disabled={isSavingFreeConfig}
                  className="w-full sm:w-auto h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase shadow-lg shadow-emerald-600/20 active:scale-95"
                >
                  {isSavingFreeConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-2" /> Guardar Configuración</>}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>

        {/* PANEL DE CONFIGURACIÓN SMTP GMAIL (CORREOS DE ACTIVACIÓN) */}
        <Card className="premium-card">
          <CardHeader className="bg-slate-50/50 border-b p-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-headline font-black uppercase italic text-slate-950 flex items-center gap-3">
                <Mail className="h-6 w-6 text-orange-500" /> Configuración SMTP <span className="text-orange-500">Gmail</span>
              </CardTitle>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Credenciales oficiales para envíos de correos de activación y notificaciones</p>
            </div>
            <Badge variant="outline" className="rounded-xl border-orange-200 text-orange-600 bg-orange-50/50 font-black text-[10px] tracking-wider uppercase h-8 px-4 flex items-center gap-2">
              <Server className="h-3.5 w-3.5" /> Servidor de Correo
            </Badge>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <form onSubmit={handleSaveSmtp} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Servidor SMTP Host */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                    <Server className="h-3.5 w-3.5 text-orange-500" /> Servidor SMTP (Host)
                  </Label>
                  <Input 
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    required
                    className="h-12 font-mono text-xs font-bold rounded-xl bg-slate-50 border-none ring-1 ring-slate-200"
                  />
                  <p className="text-[10px] text-slate-400">Por defecto: <code>smtp.gmail.com</code></p>
                </div>

                {/* Puerto SMTP */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                    <Key className="h-3.5 w-3.5 text-orange-500" /> Puerto SMTP
                  </Label>
                  <Input 
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="465"
                    required
                    className="h-12 font-mono text-xs font-bold rounded-xl bg-slate-50 border-none ring-1 ring-slate-200"
                  />
                  <p className="text-[10px] text-slate-400"><code>465</code> (SSL) o <code>587</code> (TLS)</p>
                </div>

                {/* Nombre del Remitente */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-orange-500" /> Nombre del Remitente
                  </Label>
                  <Input 
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="Sync Connect Activaciones"
                    required
                    className="h-12 font-bold text-xs rounded-xl bg-slate-50 border-none ring-1 ring-slate-200"
                  />
                  <p className="text-[10px] text-slate-400">Aparecerá en el buzón del cliente</p>
                </div>

                {/* Correo Gmail Remitente */}
                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                  <Label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-orange-500" /> Usuario Gmail / Remitente
                  </Label>
                  <Input 
                    type="email"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="tucuenta@gmail.com"
                    required
                    className="h-12 font-bold text-xs rounded-xl bg-slate-50 border-none ring-1 ring-slate-200"
                  />
                  <p className="text-[10px] text-slate-400">Dirección con la que se enviarán los correos</p>
                </div>

                {/* Contraseña de Aplicación Gmail */}
                <div className="space-y-2 md:col-span-2 lg:col-span-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                    <Key className="h-3.5 w-3.5 text-orange-500" /> Contraseña de Aplicación de Gmail
                  </Label>
                  <div className="relative">
                    <Input 
                      type={showSmtpPassword ? "text" : "password"}
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx"
                      required
                      className="h-12 font-mono text-xs font-bold rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Genera tu clave de 16 caracteres en Google: <b>Cuenta de Google → Seguridad → Contraseñas de aplicaciones</b>.
                  </p>
                </div>

              </div>

              {/* BARRA DE ACCIONES SMTP */}
              <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input 
                    type="email"
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    placeholder="Prueba a: correo@ejemplo.com"
                    className="h-12 text-xs font-bold rounded-xl bg-slate-50 border-none ring-1 ring-slate-200 w-full sm:w-64"
                  />
                  <Button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={isTestingSmtp}
                    variant="outline"
                    className="h-12 px-5 rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50 font-black text-xs uppercase shrink-0 flex items-center gap-2"
                  >
                    {isTestingSmtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Probador</>}
                  </Button>
                </div>

                <Button
                  type="submit"
                  disabled={isSavingSmtp}
                  className="w-full sm:w-auto h-12 px-8 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase shadow-lg shadow-orange-500/20 active:scale-95"
                >
                  {isSavingSmtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-2" /> Guardar Credenciales SMTP</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
