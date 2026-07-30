"use client"

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Loader2, ShoppingBag, Landmark, Eye, CheckCircle2, Phone, User, Calendar, MessageCircle, FileSpreadsheet } from 'lucide-react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useFirestore, useCollection, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase'
import { collection, doc, increment } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { exportToExcel } from '@/lib/export-excel'

export default function AdminSalesPage() {
  const { t } = useLanguage();
  const db = useFirestore();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState('');

  const salesQuery = useMemoFirebase(() => {
    if (!db || isUserLoading || !user) return null;
    return collection(db, 'sales');
  }, [db, user, isUserLoading]);

  const { data: allSales, isLoading } = useCollection(salesQuery);

  const filteredSales = (allSales || []).filter(s => 
    s.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.voucherReference?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => String(b.saleDate || '').localeCompare(String(a.saleDate || '')));

  const handleApproveSale = (saleId: string) => {
    if (!db || !allSales) return;
    
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;

    // 1. Validar la venta en el registro
    updateDocumentNonBlocking(doc(db, 'sales', saleId), {
      status: 'Completed',
      approvedAt: new Date().toISOString()
    });

    // 2. ACREDITAR COMISIÓN: Solo si la venta es de un afiliado (no de admin directo)
    if (sale.affiliateId && sale.affiliateId !== 'admin') {
      const affiliateRef = doc(db, 'affiliates', sale.affiliateId);
      updateDocumentNonBlocking(affiliateRef, {
        currentBalance: increment(sale.commissionEarned || 0)
      });
    }

    toast({ 
      title: "Pago Validado Correctamente", 
      description: "Acceso habilitado para el cliente y comisión sumada al socio." 
    });
  };

  const handleExportExcel = () => {
    if (!filteredSales || filteredSales.length === 0) {
      toast({ variant: "destructive", title: "Sin datos", description: "No hay ventas para exportar." });
      return;
    }

    const rows = filteredSales.map(s => ({
      ID_Transaccion: s.id,
      Fecha: s.saleDate ? new Date(s.saleDate).toLocaleDateString() + ' ' + new Date(s.saleDate).toLocaleTimeString() : 'N/A',
      Producto: s.productName || 'Producto Sync',
      Cliente_Comprador: s.buyerName || 'Desconocido',
      ID_Vendedor: s.affiliateId || 'Directo',
      Voucher_Referencia: s.voucherReference || 'N/A',
      Monto_USD: `$${(Number(s.saleAmount) || 0).toFixed(2)}`,
      Comision_Afiliado_USD: `$${(Number(s.commissionEarned) || 0).toFixed(2)}`,
      Estado: s.status === 'Completed' ? 'Validado' : 'Pendiente'
    }));

    exportToExcel('Reporte_Ventas_Administracion', rows, [
      { key: 'ID_Transaccion', label: 'ID Transacción' },
      { key: 'Fecha', label: 'Fecha & Hora' },
      { key: 'Producto', label: 'Producto' },
      { key: 'Cliente_Comprador', label: 'Cliente Comprador' },
      { key: 'ID_Vendedor', label: 'Vendedor / Afiliado' },
      { key: 'Voucher_Referencia', label: 'Referencia Voucher' },
      { key: 'Monto_USD', label: 'Monto Venta' },
      { key: 'Comision_Afiliado_USD', label: 'Comisión' },
      { key: 'Estado', label: 'Estado Auditoría' }
    ]);

    toast({ title: "Reporte de Ventas Exportado", description: "El archivo Excel/CSV se ha descargado." });
  }

  return (
    <DashboardShell role="admin">
      <div className="space-y-6 md:space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Auditoría de Transacciones</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-slate-900 tracking-tight leading-none uppercase italic">Registro de <span className="text-primary">Ventas</span></h1>
            <p className="text-sm md:text-base text-slate-500 font-medium mt-2">Valida los depósitos bancarios para habilitar entregas y pagar comisiones.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-xl h-14 rounded-2xl text-xs uppercase px-6 flex items-center gap-2"
            >
              <FileSpreadsheet className="h-5 w-5" /> Exportar a Excel
            </Button>
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                className="pl-11 h-14 rounded-2xl bg-white border-none shadow-xl ring-1 ring-slate-100 font-bold" 
                placeholder="Buscar por voucher o cliente..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {isLoading || isUserLoading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
          </div>
        ) : filteredSales.length === 0 ? (
          <Card className="border-dashed border-4 flex flex-col items-center justify-center p-24 text-center bg-white/50 rounded-[3rem] border-slate-100">
            <ShoppingBag className="h-16 w-16 text-slate-200 mb-6" />
            <h3 className="text-xl font-black text-slate-400 mb-2 uppercase">Sin ventas pendientes</h3>
            <p className="text-slate-400 max-w-xs text-sm font-bold">No se han encontrado registros de transacciones.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* VISTA DESKTOP (TABLA) */}
            <Card className="hidden lg:block border-none shadow-2xl overflow-hidden rounded-[3rem] bg-white ring-1 ring-slate-100">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 h-20">
                        <TableHead className="px-8 h-20 uppercase text-[10px] font-black tracking-widest text-slate-400">Comprobante (Voucher)</TableHead>
                        <TableHead className="h-20 uppercase text-[10px] font-black tracking-widest text-slate-400">Fecha</TableHead>
                        <TableHead className="h-20 uppercase text-[10px] font-black tracking-widest text-slate-400">Producto</TableHead>
                        <TableHead className="h-20 uppercase text-[10px] font-black tracking-widest text-slate-400">Comprador</TableHead>
                        <TableHead className="h-20 uppercase text-[10px] font-black tracking-widest text-slate-400">Estatus</TableHead>
                        <TableHead className="px-8 text-right h-20 uppercase text-[10px] font-black tracking-widest text-slate-400">Acción Maestra</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.map((sale) => (
                        <TableRow key={sale.id} className="h-24 border-b last:border-0 group hover:bg-slate-50/30 transition-colors">
                          <TableCell className="px-8">
                            <span className="font-mono font-black text-sm text-primary tracking-tighter">{sale.voucherReference || 'LINK_DIRECTO'}</span>
                          </TableCell>
                          <TableCell className="text-slate-500 text-[11px] font-bold">
                            {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="font-black text-slate-800 text-xs uppercase truncate max-w-[150px]">{sale.productName || 'Producto Sync'}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-[11px] font-black text-slate-700 uppercase">{sale.buyerName}</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "rounded-full font-black text-[9px] px-4 py-1.5 uppercase tracking-widest border-none shadow-sm",
                              sale.status === 'Completed' ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600 animate-pulse"
                            )}>
                              {sale.status === 'Completed' ? 'VALIDADO ✓' : 'PENDIENTE'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-8 text-right">
                            <div className="flex justify-end gap-3">
                              {sale.status !== 'Completed' && (
                                <Button 
                                  className="h-11 px-5 bg-green-600 hover:bg-green-700 text-white font-black text-[10px] uppercase rounded-xl shadow-lg transition-all hover:scale-105"
                                  onClick={() => handleApproveSale(sale.id)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" /> APROBAR Y PAGAR
                                </Button>
                              )}
                              <SaleDetailsDialog sale={sale} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* VISTA MÓVIL (TARJETAS) */}
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredSales.map((sale) => (
                <Card key={sale.id} className="border-none shadow-xl rounded-[2.5rem] bg-white p-6 space-y-6 ring-1 ring-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Voucher Bancario</p>
                      <span className="font-mono font-black text-primary text-lg">{sale.voucherReference || 'LINK_DIRECTO'}</span>
                    </div>
                    <Badge className={cn(
                      "rounded-full font-black text-[9px] px-4 py-1.5 uppercase border-none",
                      sale.status === 'Completed' ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {sale.status === 'Completed' ? 'VÁLIDO ✓' : 'PENDIENTE'}
                    </Badge>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-100">
                    <p className="text-[11px] font-black text-slate-800 uppercase">{sale.productName}</p>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Cliente:</span>
                      <span className="text-[10px] font-black text-slate-700 uppercase">{sale.buyerName}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {sale.status !== 'Completed' && (
                      <Button 
                        className="flex-1 h-12 bg-green-600 text-white font-black text-[10px] uppercase rounded-xl shadow-lg active:scale-95"
                        onClick={() => handleApproveSale(sale.id)}
                      >
                        VALIDAR PAGO
                      </Button>
                    )}
                    <SaleDetailsDialog sale={sale} isMobile />
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

function SaleDetailsDialog({ sale, isMobile }: { sale: any, isMobile?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn(
          "h-12 px-5 font-black text-[10px] uppercase rounded-xl",
          isMobile ? "flex-1" : ""
        )}>
          <Eye className="h-4 w-4 mr-2" /> {isMobile ? 'DETALLES' : 'VER VOUCHER'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md w-[95vw] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
        <div className="bg-slate-900 p-8 text-white">
           <DialogHeader>
             <DialogTitle className="text-xl font-headline font-black uppercase italic">Expediente de <span className="text-primary">Transacción</span></DialogTitle>
             <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mt-1">Auditoría Sync Connect</p>
           </DialogHeader>
        </div>
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border">
             <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm border">
               <User className="h-5 w-5 text-slate-400" />
             </div>
             <div className="min-w-0 flex-1">
               <p className="text-[9px] font-black text-slate-400 uppercase">Comprador / Cliente</p>
               <p className="text-xs font-black text-slate-800 uppercase truncate">{sale.buyerName}</p>
             </div>
          </div>
          <div className="p-6 rounded-[2rem] bg-purple-50 border-2 border-dashed border-purple-200 text-center space-y-2">
            <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Número de Referencia Bancaria</p>
            <p className="text-2xl font-black font-mono tracking-widest text-purple-600 break-all">{sale.voucherReference || 'SIN REFERENCIA'}</p>
          </div>
          <div className="pt-4 border-t flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase">Monto Transacción</p>
              <p className="text-2xl font-black text-slate-900 tracking-tighter">${sale.saleAmount?.toFixed(2)}</p>
            </div>
            {sale.buyerPhone && (
              <Button asChild variant="outline" className="h-12 px-6 rounded-xl border-green-100 text-green-600 text-[10px] font-black gap-2 shadow-sm">
                <a href={`https://wa.me/${sale.buyerPhone.replace(/\D/g, '')}`} target="_blank">
                  <MessageCircle className="h-4 w-4" /> CONTACTAR
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
