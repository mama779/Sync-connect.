"use client"

import { useState, useEffect } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Mail, Loader2, Calendar, Trash2, ShoppingBag, UserCheck, KeyRound, Zap, CheckCircle2, FileSpreadsheet } from 'lucide-react'
import { useLanguage } from '@/components/language-context'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useFirestore, useCollection, useMemoFirebase, useUser, deleteDocumentNonBlocking } from '@/firebase'
import { collection, doc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { sendNewPasswordAdmin } from '@/lib/email'
import { adminResetUserPassword, adminDeleteUser } from '@/lib/auth-actions'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { exportToExcel } from '@/lib/export-excel'

export default function AdminBuyersPage() {
  const { t } = useLanguage();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const buyersQuery = useMemoFirebase(() => {
    if (!db || isUserLoading || !user) return null;
    return collection(db, 'buyers');
  }, [db, user, isUserLoading]);

  const { data: buyers, isLoading } = useCollection(buyersQuery);

  const filteredBuyers = (buyers || []).filter(b => 
    `${b.firstName} ${b.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteBuyer = async (buyerId: string) => {
    setIsProcessing(buyerId);
    try {
      // 1. Intentar eliminar de Auth mediante servidor
      const authRes = await adminDeleteUser(buyerId);
      if (!authRes.success) {
        // Si el usuario no se encuentra en Auth, seguimos borrando de la base de datos
        console.warn("Auth delete skip:", authRes.error);
      }

      // 2. Eliminar de Firestore
      const buyerRef = doc(db, 'buyers', buyerId);
      deleteDocumentNonBlocking(buyerRef);
      
      toast({ title: "Cliente Eliminado", description: "El registro y el acceso han sido borrados permanentemente." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al eliminar", description: error.message });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleExportExcel = () => {
    if (!filteredBuyers || filteredBuyers.length === 0) {
      toast({ variant: "destructive", title: "Sin datos", description: "No hay compradores para exportar." });
      return;
    }

    const rows = filteredBuyers.map(b => ({
      ID_Comprador: b.id,
      Nombre_Completo: `${b.firstName || ''} ${b.lastName || ''}`.trim(),
      Correo: b.email || '',
      WhatsApp: b.phone || '',
      Vendedor_Referente: b.referredBy || 'Directo / Sistema',
      Fecha_Alta: b.registeredAt ? new Date(b.registeredAt).toLocaleDateString() : 'N/A'
    }));

    exportToExcel('Reporte_Compradores_Consumidores', rows, [
      { key: 'ID_Comprador', label: 'ID Comprador' },
      { key: 'Nombre_Completo', label: 'Nombre Completo' },
      { key: 'Correo', label: 'Correo Electrónico' },
      { key: 'WhatsApp', label: 'WhatsApp / Teléfono' },
      { key: 'Vendedor_Referente', label: 'Vendedor / Afiliado ID' },
      { key: 'Fecha_Alta', label: 'Fecha de Registro' }
    ]);

    toast({ title: "Base de Compradores Exportada", description: "El archivo Excel/CSV se ha descargado." });
  }

  if (!mounted) return null;

  return (
    <DashboardShell role="admin">
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 shadow-inner">
                <UserCheck className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black text-green-600 uppercase tracking-[0.3em]">Base de Alumnos</span>
            </div>
            <h1 className="text-4xl font-headline font-black text-slate-900 tracking-tight leading-none uppercase italic">Gestión de <span className="text-primary">Compradores</span></h1>
            <p className="text-slate-500 font-medium">Control administrativo de clientes y acceso a la academia.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Button 
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-xl h-16 rounded-[1.5rem] text-xs uppercase px-6 flex items-center gap-2"
            >
              <FileSpreadsheet className="h-5 w-5" /> Exportar a Excel
            </Button>
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
              <Input 
                className="pl-14 h-16 rounded-[1.5rem] border-none bg-white shadow-xl text-[16px] font-bold focus:ring-2 focus:ring-primary/20 transition-all" 
                placeholder="Buscar por nombre o email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {isLoading || isUserLoading ? (
          <div className="flex justify-center py-32"><Loader2 className="animate-spin text-primary h-12 w-12 opacity-50" /></div>
        ) : filteredBuyers.length === 0 ? (
          <Card className="border-dashed border-4 flex flex-col items-center justify-center p-32 text-center bg-white/50 rounded-[4rem] border-slate-100">
            <ShoppingBag className="h-20 w-20 text-slate-200 mb-8 rotate-12" />
            <h3 className="text-2xl font-black text-slate-400 mb-2">Sin clientes encontrados</h3>
            <p className="text-slate-400 max-w-sm font-bold text-sm leading-relaxed">Tu base de datos aparecerá aquí conforme se registren las ventas.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="hidden lg:block border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden ring-1 ring-slate-100">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 h-20 hover:bg-slate-50/50">
                        <TableHead className="px-10 font-black uppercase text-[10px] tracking-widest text-slate-400">Cliente / Alumno</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Cuenta Gmail</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Alta en Sistema</TableHead>
                        <TableHead className="px-10 text-right font-black uppercase text-[10px] tracking-widest text-slate-400">Acción Administrativa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBuyers.map((buyer) => (
                        <TableRow key={buyer.id} className="h-24 border-b last:border-0 group hover:bg-slate-50/30 transition-colors">
                          <TableCell className="px-10">
                            <div className="flex items-center gap-5">
                              <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-sm shadow-inner group-hover:rotate-3 transition-transform">
                                {buyer.firstName?.charAt(0) || 'U'}
                              </div>
                              <span className="font-black text-slate-800 text-lg tracking-tight uppercase">{buyer.firstName} {buyer.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                              <Mail className="h-4 w-4 text-primary/40" /> {buyer.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3 text-xs font-black text-slate-400 uppercase tracking-widest">
                              <Calendar className="h-4 w-4" /> {buyer.registeredAt ? new Date(buyer.registeredAt).toLocaleDateString() : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="px-10 text-right">
                            <div className="flex justify-end gap-2">
                              <AdminPasswordResetDialog user={buyer} />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-12 w-12 text-destructive hover:bg-destructive/10 rounded-2xl transition-colors">
                                    <Trash2 className="h-6 w-6" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem] p-10 border-none shadow-2xl w-[95vw] md:max-w-lg">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-2xl md:text-3xl font-headline font-black text-slate-900 tracking-tight">¿Eliminar Comprador?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-500 font-bold leading-relaxed mt-4">
                                      Esta acción eliminará permanentemente al cliente de la base de datos y su cuenta de acceso a la academia. No se puede revertir.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="mt-8 gap-3 flex-col sm:flex-row">
                                    <AlertDialogCancel className="h-14 rounded-2xl font-black border-slate-100">CANCELAR</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteBuyer(buyer.id)} disabled={isProcessing === buyer.id} className="h-14 rounded-2xl bg-destructive text-white font-black shadow-xl">
                                      {isProcessing === buyer.id ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : "ELIMINAR DEFINITIVAMENTE"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredBuyers.map((buyer) => (
                <Card key={buyer.id} className="border-none shadow-xl rounded-[2.5rem] bg-white p-6 space-y-6 ring-1 ring-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black shadow-inner">
                        {buyer.firstName?.charAt(0) || 'U'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-black text-slate-800 uppercase text-sm truncate">{buyer.firstName} {buyer.lastName}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{buyer.email}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black uppercase rounded-full">Activo</Badge>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Registrado:</span>
                      <span className="text-[11px] font-bold text-slate-700">{buyer.registeredAt ? new Date(buyer.registeredAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t pt-4">
                    <div className="flex-1">
                      <AdminPasswordResetDialog user={buyer} isFullWidth />
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" className="h-12 w-12 text-destructive hover:bg-destructive/10 rounded-xl shrink-0">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-[2rem] w-[90vw] p-8">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-xl font-black uppercase">¿Confirmar borrado?</AlertDialogTitle>
                          <AlertDialogDescription className="text-xs font-medium">Se perderán todos los datos del cliente y su acceso.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-6 flex-col gap-2">
                          <AlertDialogCancel className="h-12 rounded-xl">Cerrar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteBuyer(buyer.id)} disabled={isProcessing === buyer.id} className="h-12 rounded-xl bg-destructive">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

function AdminPasswordResetDialog({ user, isFullWidth }: { user: any, isFullWidth?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [generatedPass, setGeneratedPass] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAutoReset = async () => {
    setLoading(true);
    const newPass = Math.random().toString(36).slice(-8) + Math.floor(Math.random() * 10);
    
    try {
      const res = await adminResetUserPassword(user.email, newPass);
      if (!res.success) throw new Error(res.error);

      const emailRes = await sendNewPasswordAdmin({
        to: user.email,
        name: user.firstName,
        newPassword: newPass
      });

      if (emailRes.success) {
        setGeneratedPass(newPass);
        toast({ title: "Contraseña Actualizada", description: "Enviada al cliente por email." });
      } else {
        toast({ variant: "destructive", title: "Error Email", description: "Clave cambiada pero no se pudo notificar." });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fallo", description: e.message || "No se pudo actualizar." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if(!v) setGeneratedPass(null); }}>
      <DialogTrigger asChild>
        {isFullWidth ? (
          <Button variant="outline" className="w-full h-12 rounded-xl border-amber-200 text-amber-700 font-black text-[10px] uppercase gap-2">
            <KeyRound className="h-4 w-4" /> Resetear Acceso
          </Button>
        ) : (
          <Button size="icon" variant="ghost" className="h-12 w-12 text-slate-400 hover:text-primary rounded-2xl">
            <KeyRound className="h-6 w-6" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl w-[95vw] md:max-w-md">
        <div className="bg-slate-900 p-8 text-white text-center">
          <KeyRound className="h-12 w-12 mx-auto mb-4 text-primary" />
          <DialogHeader>
            <DialogTitle className="text-xl font-headline font-black text-white text-center uppercase tracking-tight">Acceso Alumno</DialogTitle>
            <p className="text-slate-400 font-bold text-[10px] uppercase mt-1">Generar nueva llave para {user.firstName}</p>
          </DialogHeader>
        </div>
        <div className="p-8 md:p-10 space-y-6">
          {!generatedPass ? (
            <div className="space-y-4 text-center">
              <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto shadow-inner mb-4">
                <Zap className="h-8 w-8 fill-primary" />
              </div>
              <p className="text-sm font-medium text-slate-500 leading-relaxed px-4">
                ¿Deseas generar una nueva clave? El cambio será **automático e inmediato**.
              </p>
              <Button onClick={handleAutoReset} className="w-full h-14 rounded-xl bg-slate-900 text-white font-black uppercase text-xs shadow-xl" disabled={loading}>
                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "GENERAR NUEVA CLAVE"}
              </Button>
            </div>
          ) : (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              <Alert className="bg-green-50 border-green-200 rounded-2xl">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-900 font-black text-[10px] uppercase">¡Sincronizado!</AlertTitle>
                <AlertDescription className="text-green-700 text-xs font-medium">Contraseña enviada correctamente.</AlertDescription>
              </Alert>
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed">
                <span className="text-[9px] font-black text-slate-400 uppercase mb-1">Clave actual:</span>
                <code className="text-2xl md:text-3xl font-black text-slate-900">{generatedPass}</code>
              </div>
              <Button onClick={() => setOpen(false)} className="w-full h-14 rounded-xl bg-green-600 text-white font-black uppercase text-xs shadow-xl">CERRAR VENTANA</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
