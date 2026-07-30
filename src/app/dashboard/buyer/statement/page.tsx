"use client"

import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  FileSpreadsheet, 
  Printer, 
  Search, 
  Loader2, 
  ShoppingBag, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  CreditCard, 
  Landmark,
  ArrowUpRight,
  ShieldCheck,
  User,
  Download
} from 'lucide-react'
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase'
import { doc, collection, query, where } from 'firebase/firestore'
import { exportToExcel } from '@/lib/export-excel'
import { useToast } from '@/hooks/use-toast'

export default function BuyerStatementPage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Completed' | 'Pending'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const buyerRef = useMemoFirebase(() => (db && user ? doc(db, 'buyers', user.uid) : null), [db, user]);
  const { data: profile, isLoading: profileLoading } = useDoc(buyerRef);

  const salesQuery = useMemoFirebase(() => (db && user ? query(collection(db, 'sales'), where('buyerId', '==', user.uid)) : null), [db, user]);
  const { data: rawSales, isLoading: salesLoading } = useCollection(salesQuery);

  if (isUserLoading || profileLoading) {
    return (
      <DashboardShell role="buyer">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        </div>
      </DashboardShell>
    )
  }

  const salesList = rawSales || [];

  const filteredSales = salesList.filter(s => {
    const matchesSearch = 
      (s.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.voucherReference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.id || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    let matchesDate = true;
    if (s.saleDate) {
      const saleTime = new Date(s.saleDate).getTime();
      if (startDate) {
        const startTime = new Date(`${startDate}T00:00:00`).getTime();
        if (saleTime < startTime) matchesDate = false;
      }
      if (endDate) {
        const endTime = new Date(`${endDate}T23:59:59`).getTime();
        if (saleTime > endTime) matchesDate = false;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleSetPresetDate = (days: number | 'all') => {
    if (days === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const totalSpent = salesList
    .filter(s => s.status === 'Completed')
    .reduce((acc, s) => acc + (Number(s.saleAmount) || 0), 0);

  const pendingAmount = salesList
    .filter(s => s.status === 'Pending')
    .reduce((acc, s) => acc + (Number(s.saleAmount) || 0), 0);

  const completedCount = salesList.filter(s => s.status === 'Completed').length;
  const pendingCount = salesList.filter(s => s.status === 'Pending').length;

  const handleExportExcel = () => {
    if (salesList.length === 0) {
      toast({
        variant: "destructive",
        title: "Sin registros",
        description: "No posees historial de transacciones para exportar."
      });
      return;
    }

    const rowsData = salesList.map(s => ({
      ID_Transaccion: s.id,
      Fecha: s.saleDate ? new Date(s.saleDate).toLocaleDateString() + ' ' + new Date(s.saleDate).toLocaleTimeString() : 'N/A',
      Producto: s.productName || 'Producto Sync',
      Referencia_Voucher: s.voucherReference || 'N/A',
      Monto_USD: `$${(Number(s.saleAmount) || 0).toFixed(2)}`,
      Estado: s.status === 'Completed' ? 'Completado' : s.status === 'Pending' ? 'Pendiente' : 'Cancelado',
      Metodo_Pago: 'Transferencia / Voucher'
    }));

    exportToExcel(`Estado_Cuenta_Comprador_${profile?.firstName || 'Usuario'}`, rowsData, [
      { key: 'ID_Transaccion', label: 'ID Transacción' },
      { key: 'Fecha', label: 'Fecha & Hora' },
      { key: 'Producto', label: 'Producto Adquirido' },
      { key: 'Referencia_Voucher', label: 'Referencia Voucher' },
      { key: 'Monto_USD', label: 'Monto (USD)' },
      { key: 'Estado', label: 'Estado de Pago' },
      { key: 'Metodo_Pago', label: 'Método de Pago' }
    ]);

    toast({
      title: "Estado de Cuenta Exportado",
      description: "Se ha descargado el archivo CSV/Excel correctamente."
    });
  }

  const handlePrint = () => {
    window.print();
  }

  return (
    <DashboardShell role="buyer">
      <div className="space-y-10 pb-16">
        {/* ENCABEZADO ESTADO DE CUENTA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 via-[#131921] to-slate-900 p-8 md:p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck className="h-3.5 w-3.5" /> Estado Financiero del Consumidor
            </div>
            <h1 className="text-4xl md:text-5xl font-headline font-black text-white uppercase italic tracking-tight">
              Estado de <span className="text-primary">Cuenta</span>
            </h1>
            <p className="text-slate-400 font-medium text-sm max-w-xl">
              Consulta el desglose detallado de tus transacciones, compras realizadas y descarga tu reporte en Excel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <Button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase px-6 h-14 rounded-2xl shadow-xl flex items-center gap-2 transition-all active:scale-95"
            >
              <FileSpreadsheet className="h-5 w-5" /> Exportar a Excel
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 font-black text-xs uppercase px-5 h-14 rounded-2xl flex items-center gap-2"
            >
              <Printer className="h-5 w-5" /> Imprimir Recibo
            </Button>
          </div>
        </div>

        {/* METRICAS DE ESTADO DE CUENTA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 p-8 ring-1 ring-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Invertido</span>
              <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>
            <p className="text-4xl font-black text-white tracking-tighter">${totalSpent.toFixed(2)}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
              {completedCount} compra(s) procesada(s)
            </p>
          </Card>

          <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 p-8 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monto en Validación</span>
              <div className="h-12 w-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <p className="text-4xl font-black text-amber-400 tracking-tighter">${pendingAmount.toFixed(2)}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
              {pendingCount} orden(es) en verificación
            </p>
          </Card>

          <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 p-8 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Titular de Cuenta</span>
              <div className="h-12 w-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                <User className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xl font-black text-white truncate uppercase">{profile?.firstName} {profile?.lastName}</p>
            <p className="text-[10px] font-bold text-slate-400 truncate tracking-widest mt-2">{user?.email}</p>
          </Card>
        </div>

        {/* TABLA DE HISTORIAL FINANCIERO */}
        <Card className="border-none shadow-2xl rounded-[3rem] bg-white ring-1 ring-slate-100 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-8 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-headline font-black uppercase italic text-slate-900">
                  Historial de <span className="text-primary">Transacciones</span>
                </CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500 mt-1">
                  Registros contables de adquisiciones y estado de voucher.
                </CardDescription>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar producto o voucher..."
                    className="pl-11 h-11 bg-white border-none ring-1 ring-slate-200 rounded-xl font-bold text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                      statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Completed')}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                      statusFilter === 'Completed' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Aprobados
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Pending')}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                      statusFilter === 'Pending' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Pendientes
                  </button>
                </div>
              </div>
            </div>

            {/* BARRA DE FILTRO POR RANGO DE FECHAS */}
            <div className="pt-4 border-t border-slate-200/60 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Desde:</span>
                  <Input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 border-none bg-transparent p-0 text-xs font-bold w-32 focus-visible:ring-0"
                  />
                </div>

                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-[10px] font-black uppercase text-slate-400">Hasta:</span>
                  <Input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 border-none bg-transparent p-0 text-xs font-bold w-32 focus-visible:ring-0"
                  />
                </div>

                {(startDate || endDate) && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => handleSetPresetDate('all')}
                    className="h-8 text-[10px] font-black uppercase text-slate-500 hover:text-red-500 px-3"
                  >
                    Limpiar Fechas
                  </Button>
                )}
              </div>

              {/* PRESETS DE FECHA */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 mr-1 hidden sm:inline">Rápido:</span>
                <button
                  type="button"
                  onClick={() => handleSetPresetDate(7)}
                  className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  7 días
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetDate(30)}
                  className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  30 días
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetDate(90)}
                  className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  90 días
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPresetDate('all')}
                  className="px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  Todo
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {salesLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-24 space-y-4">
                <ShoppingBag className="h-14 w-14 text-slate-300 mx-auto" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  No se encontraron transacciones en tu estado de cuenta
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 h-16">
                      <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-slate-400">Fecha</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Producto</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Voucher / Ref.</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Monto Invertido</TableHead>
                      <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Estatus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id} className="h-20 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="px-8">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-black text-slate-900 text-xs uppercase">
                            {sale.productName || 'Producto Sync'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs font-bold text-slate-600 bg-slate-50 border-slate-200">
                            {sale.voucherReference || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-black text-sm text-slate-900">
                            ${(Number(sale.saleAmount) || 0).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {sale.status === 'Completed' ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 font-black text-[9px] uppercase px-3 py-1 rounded-full gap-1">
                              <CheckCircle2 className="h-3 w-3" /> APROBADO
                            </Badge>
                          ) : sale.status === 'Pending' ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-black text-[9px] uppercase px-3 py-1 rounded-full gap-1">
                              <Clock className="h-3 w-3" /> VALIDANDO
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-black text-[9px] uppercase px-3 py-1 rounded-full gap-1">
                              <XCircle className="h-3 w-3" /> RECHAZADO
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
