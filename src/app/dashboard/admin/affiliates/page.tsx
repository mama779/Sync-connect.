"use client"

import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Loader2, 
  Copy,
  Check,
  Link as LinkIcon,
  Trash2,
  UserPlus,
  CreditCard,
  UserCheck,
  Lock,
  Unlock,
  Banknote,
  ShieldAlert,
  Eye,
  FileSpreadsheet
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useLanguage } from '@/components/language-context'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser } from '@/firebase'
import { collection, doc, setDoc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { adminDeleteUser } from '@/lib/auth-actions'
import { getGoogleDriveDirectLink } from '@/lib/utils'
import { sendAccountActivatedEmail, sendAccountStatusEmail, sendPayoutProcessedEmail } from '@/lib/email'
import { exportToExcel } from '@/lib/export-excel'

export default function AdminAffiliatesPage() {
  const { t } = useLanguage();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState<any>(null);

  const affiliatesQuery = useMemoFirebase(() => {
    if (!db || isUserLoading || !user) return null;
    return collection(db, 'affiliates');
  }, [db, user, isUserLoading]);
  const { data: affiliates, isLoading } = useCollection(affiliatesQuery);

  const handleCopyRegisterLink = () => {
    const link = `${window.location.origin}/auth/register/role`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({ title: "Enlace Copiado", description: "Envía este link para nuevos socios." });
  };

  const handleActivateAffiliate = async (aff: any) => {
    if (!db) return;
    setIsProcessing(aff.id);
    try {
      updateDocumentNonBlocking(doc(db, 'affiliates', aff.id), {
        status: 'Active',
        activatedAt: new Date().toISOString()
      });

      const notifId = `welcome_${aff.id}`;
      await setDoc(doc(db, 'notifications', notifId), {
        userId: aff.id,
        title: '💎 ¡Cuenta Activada!',
        message: 'Bienvenido. Ya puedes acceder al mercado y herramientas del sistema.',
        type: 'system',
        createdAt: new Date().toISOString(),
        isRead: false
      });

      if (aff.email) {
        await sendAccountActivatedEmail({
          to: aff.email,
          name: aff.firstName
        }).catch(err => console.error("Error email activación:", err));
      }

      toast({ title: "Socio Activado ✓", description: `La cuenta de ${aff.firstName} ha sido habilitada.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo activar la cuenta." });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleToggleBlock = async (aff: any) => {
    if (!db) return;
    const newStatus = aff.status === 'Blocked' ? 'Active' : 'Blocked';
    setIsProcessing(aff.id);
    try {
      updateDocumentNonBlocking(doc(db, 'affiliates', aff.id), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      if (aff.email) {
        await sendAccountStatusEmail({
          to: aff.email,
          name: aff.firstName,
          status: newStatus
        }).catch(err => console.error("Error email estatus:", err));
      }

      toast({ 
        title: newStatus === 'Blocked' ? "Acceso Bloqueado" : "Acceso Restaurado", 
        description: `El estado de ${aff.firstName} ha sido actualizado.` 
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cambiar el estado." });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleProcessPayment = async (aff: any) => {
    if (!db || !aff.currentBalance || aff.currentBalance <= 0) return;
    
    if (!confirm(`¿Confirmar pago de $${aff.currentBalance.toFixed(2)} a ${aff.firstName}? El saldo se reseteará a cero.`)) return;

    setIsProcessing(aff.id);
    try {
      const currentAmount = aff.currentBalance;
      
      updateDocumentNonBlocking(doc(db, 'affiliates', aff.id), {
        currentBalance: 0,
        lastPayoutAt: new Date().toISOString()
      });

      if (aff.email) {
        await sendPayoutProcessedEmail({
          to: aff.email,
          name: aff.firstName,
          amount: currentAmount
        }).catch(err => console.error("Error email pago:", err));
      }

      toast({ title: "Pago Liquidado ✓", description: `Se ha reseteado el saldo de ${aff.firstName}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo procesar el pago." });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteAffiliate = async (uid: string) => {
    if(!confirm("⚠️ ¿ELIMINAR SOCIO? Se borrará su cuenta de acceso y perfil. Acción irreversible.")) return;
    
    setIsDeleting(uid);
    try {
      const res = await adminDeleteUser(uid);
      if(res.success) {
        if (db) {
          deleteDocumentNonBlocking(doc(db, 'affiliates', uid));
          toast({ title: "Socio Eliminado ✓", description: "El acceso y registro han sido purgados." });
        }
      } else {
        toast({ variant: "destructive", title: "Error", description: res.error || "No se pudo eliminar el acceso." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error Crítico", description: "Fallo en conexión administrativa." });
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredAffiliates = (affiliates || []).filter(aff => 
    `${aff.firstName} ${aff.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aff.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = () => {
    if (!filteredAffiliates || filteredAffiliates.length === 0) {
      toast({ variant: "destructive", title: "Sin datos", description: "No hay vendedores/afiliados para exportar." });
      return;
    }

    const rows = filteredAffiliates.map(aff => ({
      ID_Socio: aff.id,
      Nombre_Completo: `${aff.firstName || ''} ${aff.lastName || ''}`.trim(),
      Correo: aff.email || '',
      WhatsApp: aff.whatsappNumber || aff.phone || '',
      Cedula: aff.cedula || 'N/A',
      Banco: aff.bankId || 'N/A',
      Numero_Cuenta: aff.bankAccountNumber || 'N/A',
      Balance_USD: `$${(Number(aff.currentBalance) || 0).toFixed(2)}`,
      Estado: aff.status === 'Active' ? 'Activo / Verificado' : aff.status === 'Blocked' ? 'Bloqueado' : 'Pendiente'
    }));

    exportToExcel('Reporte_Socios_Vendedores', rows, [
      { key: 'ID_Socio', label: 'ID Socio' },
      { key: 'Nombre_Completo', label: 'Nombre Completo' },
      { key: 'Correo', label: 'Correo Electrónico' },
      { key: 'WhatsApp', label: 'WhatsApp / Teléfono' },
      { key: 'Cedula', label: 'Cédula de Identidad' },
      { key: 'Banco', label: 'Banco' },
      { key: 'Numero_Cuenta', label: 'Número de Cuenta' },
      { key: 'Balance_USD', label: 'Balance Pendiente (USD)' },
      { key: 'Estado', label: 'Estatus' }
    ]);

    toast({ title: "Lista de Vendedores Exportada", description: "El archivo Excel/CSV se ha descargado." });
  }

  return (
    <DashboardShell role="admin">
      <div className="space-y-10 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-headline font-black text-slate-900 tracking-tighter uppercase italic">Gestión de <span className="text-primary">Socios</span></h1>
            <p className="text-slate-500 font-medium">Control administrativo de la red y seguridad de accesos.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-xl h-14 rounded-2xl text-xs uppercase px-6 flex items-center gap-2"
            >
              <FileSpreadsheet className="h-5 w-5" /> Exportar a Excel
            </Button>
            <Button 
              onClick={handleCopyRegisterLink} 
              variant="outline" 
              className="h-14 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 border-slate-200 bg-white"
            >
              {copiedLink ? <Check className="h-5 w-5 text-green-600" /> : <LinkIcon className="h-5 w-5 text-primary" />}
              {copiedLink ? "COPIADO" : "LINK REGISTRO"}
            </Button>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
              <Input 
                className="pl-14 h-14 w-full sm:w-80 rounded-2xl bg-white shadow-sm border-slate-200 text-sm font-bold" 
                placeholder="Buscar socio..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-40"><Loader2 className="animate-spin text-primary h-12 w-12 opacity-20" /></div>
        ) : filteredAffiliates.length === 0 ? (
          <Card className="p-40 text-center border-dashed border-2 border-slate-200 bg-white rounded-[3rem]">
            <UserPlus className="h-16 w-16 text-slate-100 mx-auto mb-6" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sin registros activos</p>
          </Card>
        ) : (
          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden ring-1 ring-slate-100">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 h-20">
                    <TableHead className="px-10 font-black uppercase text-[10px] text-slate-400 tracking-widest">Socio / Email</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Estado</TableHead>
                    <TableHead className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Saldo ($)</TableHead>
                    <TableHead className="px-10 text-right font-black uppercase text-[10px] text-slate-400 tracking-widest">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAffiliates.map((aff) => (
                    <TableRow key={aff.id} className="h-24 border-b last:border-0 hover:bg-slate-50/30 transition-all group">
                      <TableCell className="px-10">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-[12px] font-black text-slate-400 overflow-hidden shadow-inner group-hover:rotate-3 transition-transform">
                            {aff.photoUrl ? (
                              <img src={getGoogleDriveDirectLink(aff.photoUrl)} className="w-full h-full object-cover" alt="" />
                            ) : aff.firstName?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-sm uppercase text-slate-900">{aff.firstName} {aff.lastName}</p>
                            <p className="text-[10px] font-bold text-slate-400 tracking-tight">{aff.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase px-4 py-1.5 rounded-full border-none shadow-sm",
                          aff.status === 'Active' ? "bg-green-100 text-green-700" : 
                          aff.status === 'Blocked' ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700 animate-pulse"
                        )}>
                          {aff.status === 'Active' ? 'VERIFICADO' : aff.status === 'Blocked' ? 'BLOQUEADO' : 'PENDIENTE'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-black text-lg text-slate-900 italic tracking-tighter">${aff.currentBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</TableCell>
                      <TableCell className="px-10 text-right">
                        <div className="flex justify-end gap-3">
                          {aff.currentBalance > 0 && (
                            <Button 
                              size="sm" 
                              className="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest gap-2 rounded-xl shadow-lg"
                              onClick={() => handleProcessPayment(aff)}
                              disabled={isProcessing === aff.id}
                            >
                              {isProcessing === aff.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4 text-primary" />}
                              PAGAR
                            </Button>
                          )}
                          {aff.status === 'Pending' && (
                            <Button 
                              size="sm" 
                              className="h-11 px-6 bg-green-600 hover:bg-green-700 text-white font-black text-[10px] uppercase tracking-widest gap-2 rounded-xl shadow-lg"
                              onClick={() => handleActivateAffiliate(aff)}
                              disabled={isProcessing === aff.id}
                            >
                              {isProcessing === aff.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                              ACTIVAR
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Ver Datos de Verificación"
                            className="h-11 w-11 rounded-xl text-slate-400 hover:text-slate-900"
                            onClick={() => setSelectedAffiliate(aff)}
                          >
                            <Eye className="h-5 w-5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title={aff.status === 'Blocked' ? "Desbloquear" : "Bloquear"}
                            className={cn(
                              "h-11 w-11 rounded-xl",
                              aff.status === 'Blocked' ? "text-green-500 hover:bg-green-50" : "text-amber-500 hover:bg-amber-50"
                            )}
                            onClick={() => handleToggleBlock(aff)}
                            disabled={isProcessing === aff.id}
                          >
                            {isProcessing === aff.id ? <Loader2 className="h-5 w-5 animate-spin" /> : aff.status === 'Blocked' ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-11 w-11 rounded-xl text-red-200 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteAffiliate(aff.id)}
                            disabled={isDeleting === aff.id}
                          >
                            {isDeleting === aff.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={!!selectedAffiliate} onOpenChange={(open) => { if (!open) setSelectedAffiliate(null); }}>
        <DialogContent className="rounded-[2.5rem] bg-slate-900 border-none p-8 md:p-12 text-white max-w-2xl w-[95vw] overflow-y-auto max-h-[90vh]">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-headline font-black uppercase italic tracking-tighter">
              Detalles de <span className="text-primary">Verificación</span>
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">
              Revisión manual de los datos de identidad y cobro para el socio comercial.
            </DialogDescription>
          </DialogHeader>

          {selectedAffiliate && (
            <div className="space-y-8">
              {/* Personal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Nombre Completo</p>
                  <p className="text-sm font-bold text-white mt-1">{selectedAffiliate.firstName} {selectedAffiliate.lastName}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Cédula de Identidad</p>
                  <p className="text-sm font-bold text-primary mt-1 font-mono uppercase">{selectedAffiliate.cedula || "No registrada"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">WhatsApp de Contacto</p>
                  <p className="text-sm font-bold text-white mt-1">+{selectedAffiliate.whatsappNumber || "No registrado"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Correo Electrónico</p>
                  <p className="text-sm font-bold text-slate-300 mt-1 truncate">{selectedAffiliate.email}</p>
                </div>
              </div>

              {/* Bank Info */}
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
                  <Banknote className="h-4 w-4" /> Datos de Cobro Bancario
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                  <div>
                    <span className="text-slate-500 block uppercase text-[9px] tracking-wider">Banco</span>
                    <span className="text-white text-sm font-bold mt-1 block">{selectedAffiliate.bankId || "No especificado"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block uppercase text-[9px] tracking-wider">Cuenta Bancaria</span>
                    <span className="text-white text-sm font-mono font-bold mt-1 block">{selectedAffiliate.bankAccountNumber || "No especificada"}</span>
                  </div>
                  <div className="sm:col-span-2 border-t border-white/5 pt-3 mt-1">
                    <span className="text-slate-500 block uppercase text-[9px] tracking-wider">Titular de la Cuenta</span>
                    <span className="text-white text-sm font-bold mt-1 block">{selectedAffiliate.bankAccountHolderName || "No especificado"}</span>
                  </div>
                </div>
              </div>

              {/* ID Photo */}
              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Documento de Identificación Cargado</p>
                {selectedAffiliate.idPhotoUrl ? (
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-inner flex items-center justify-center">
                    <img 
                      src={selectedAffiliate.idPhotoUrl} 
                      className="max-h-full max-w-full object-contain" 
                      alt="Cédula de Identidad" 
                    />
                  </div>
                ) : (
                  <div className="p-10 border-2 border-dashed border-white/5 bg-white/[0.02] rounded-2xl text-center text-slate-500 text-xs font-bold">
                    No ha cargado ningún documento de identidad aún.
                  </div>
                )}
              </div>

              {/* Actions inside dialog */}
              <div className="flex gap-4 pt-4 border-t border-white/5 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedAffiliate(null)}
                  className="h-12 px-6 rounded-xl border-white/10 text-white hover:bg-white/5 bg-transparent"
                >
                  Cerrar
                </Button>
                {selectedAffiliate.status === 'Pending' && (
                  <Button 
                    className="h-12 px-8 bg-green-600 hover:bg-green-700 text-white font-black text-[10px] uppercase tracking-widest gap-2 rounded-xl shadow-lg"
                    onClick={() => {
                      handleActivateAffiliate(selectedAffiliate);
                      setSelectedAffiliate(null);
                    }}
                  >
                    <UserCheck className="h-4 w-4" /> ACTIVAR SOCIO
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
