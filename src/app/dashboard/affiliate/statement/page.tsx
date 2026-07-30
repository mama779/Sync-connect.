"use client"

import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  User,
  BadgeDollarSign,
  Wallet,
  Plus,
  ArrowDownLeft,
  Receipt
} from 'lucide-react'
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase'
import { doc, collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore'
import { exportToExcel } from '@/lib/export-excel'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function AffiliateStatementPage() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'income' | 'payouts' | 'manual'>('income')

  // Modal para Registrar Movimiento Manual (Ingreso / Egreso)
  const [isTxOpen, setIsTxOpen] = useState(false)
  const [isSavingTx, setIsSavingTx] = useState(false)
  const [txForm, setTxForm] = useState({
    type: 'ingreso',
    concept: '',
    amount: '',
    reference: '',
    notes: ''
  })

  const affiliateRef = useMemoFirebase(() => (db && user ? doc(db, 'affiliates', user.uid) : null), [db, user]);
  const { data: profile, isLoading: profileLoading } = useDoc(affiliateRef);

  const salesQuery = useMemoFirebase(() => (db && user ? query(collection(db, 'sales'), where('affiliateId', '==', user.uid)) : null), [db, user]);
  const { data: rawSales, isLoading: salesLoading } = useCollection(salesQuery);

  const payoutsQuery = useMemoFirebase(() => (db && user ? query(collection(db, 'withdrawals'), where('affiliateId', '==', user.uid)) : null), [db, user]);
  const { data: rawPayouts, isLoading: payoutsLoading } = useCollection(payoutsQuery);

  const manualTxQuery = useMemoFirebase(() => (db && user ? query(collection(db, 'seller_transactions'), where('sellerId', '==', user.uid)) : null), [db, user]);
  const { data: rawManualTx } = useCollection(manualTxQuery);

  const handleSaveManualTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;
    if (!txForm.concept || !txForm.amount) {
      toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Ingresa el concepto y el monto.' });
      return;
    }

    setIsSavingTx(true);
    try {
      await addDoc(collection(db, 'seller_transactions'), {
        sellerId: user.uid,
        sellerEmail: user.email || '',
        type: txForm.type,
        concept: txForm.concept,
        amount: Number(txForm.amount) || 0,
        reference: txForm.reference || 'Registro Manual',
        notes: txForm.notes || '',
        createdAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      });

      toast({
        title: "Movimiento Registrado ✓",
        description: `Se guardó el ${txForm.type === 'ingreso' ? 'Ingreso' : 'Egreso'} por $${txForm.amount} USD.`,
      });

      setTxForm({ type: 'ingreso', concept: '', amount: '', reference: '', notes: '' });
      setIsTxOpen(false);
    } catch (err: any) {
      console.error('Error guardando transacción:', err);
      toast({ variant: 'destructive', title: 'Error al Guardar', description: err?.message || 'No se pudo guardar el registro.' });
    } finally {
      setIsSavingTx(false);
    }
  };

  if (isUserLoading || profileLoading) {
    return (
      <DashboardShell role="affiliate">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        </div>
      </DashboardShell>
    )
  }

  const salesList = rawSales || [];
  const payoutsList = rawPayouts || [];

  // Calculos financieros
  const totalApprovedCommissions = salesList
    .filter(s => s.status === 'Completed')
    .reduce((acc, s) => acc + (Number(s.commissionEarned) || 0), 0);

  const totalPendingCommissions = salesList
    .filter(s => s.status === 'Pending')
    .reduce((acc, s) => acc + (Number(s.commissionEarned) || 0), 0);

  const totalPayoutsPaid = payoutsList
    .filter(p => p.status === 'Completed' || p.status === 'Paid')
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const availableBalance = Number(profile?.balance) || (totalApprovedCommissions - totalPayoutsPaid);

  const filteredSales = salesList.filter(s => 
    (s.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.buyerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.voucherReference || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayouts = payoutsList.filter(p => 
    (p.method || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.status || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcelAll = () => {
    if (salesList.length === 0 && payoutsList.length === 0) {
      toast({
        variant: "destructive",
        title: "Sin registros contables",
        description: "No posees ventas ni egresos registrados para exportar."
      });
      return;
    }

    // Exportar Ventas e Ingresos
    const rowsIncome = salesList.map(s => ({
      Tipo_Movimiento: 'Ingreso (Comisión Venta)',
      ID_Transaccion: s.id,
      Fecha: s.saleDate ? new Date(s.saleDate).toLocaleDateString() + ' ' + new Date(s.saleDate).toLocaleTimeString() : 'N/A',
      Cliente_Comprador: s.buyerName || s.buyerId || 'Desconocido',
      Producto_Vendido: s.productName || 'Producto Sync',
      Referencia_Voucher: s.voucherReference || 'N/A',
      Monto_Venta_USD: `$${(Number(s.saleAmount) || 0).toFixed(2)}`,
      Comision_Ganada_USD: `$${(Number(s.commissionEarned) || 0).toFixed(2)}`,
      Estado_Pago: s.status === 'Completed' ? 'Aprobado' : s.status === 'Pending' ? 'Pendiente' : 'Rechazado'
    }));

    // Exportar Retiros y Egresos
    const rowsPayouts = payoutsList.map(p => ({
      Tipo_Movimiento: 'Egreso (Retiro Solicitado)',
      ID_Transaccion: p.id,
      Fecha: p.requestedAt ? new Date(p.requestedAt).toLocaleDateString() : 'N/A',
      Cliente_Comprador: 'N/A (Retiro Personal)',
      Producto_Vendido: 'Pago a Vendedor',
      Referencia_Voucher: p.referenceNumber || 'N/A',
      Monto_Venta_USD: `$${(Number(p.amount) || 0).toFixed(2)}`,
      Comision_Ganada_USD: `-$${(Number(p.amount) || 0).toFixed(2)}`,
      Estado_Pago: p.status === 'Completed' || p.status === 'Paid' ? 'Pagado' : p.status === 'Pending' ? 'Pendiente' : 'Rechazado'
    }));

    const combinedRows = [...rowsIncome, ...rowsPayouts];

    exportToExcel(`Estado_Cuenta_Vendedor_${profile?.firstName || 'Afiliado'}`, combinedRows, [
      { key: 'Tipo_Movimiento', label: 'Tipo de Movimiento' },
      { key: 'ID_Transaccion', label: 'ID Transacción' },
      { key: 'Fecha', label: 'Fecha & Hora' },
      { key: 'Cliente_Comprador', label: 'Cliente / Comprador' },
      { key: 'Producto_Vendido', label: 'Producto / Concepto' },
      { key: 'Referencia_Voucher', label: 'Ref. Voucher' },
      { key: 'Monto_Venta_USD', label: 'Monto Venta (USD)' },
      { key: 'Comision_Ganada_USD', label: 'Comisión / Movimiento (USD)' },
      { key: 'Estado_Pago', label: 'Estado' }
    ]);

    toast({
      title: "Estado de Cuenta Exportado a Excel",
      description: "Se ha generado el archivo contable completo en formato CSV/Excel."
    });
  }

  const handlePrint = () => {
    window.print();
  }

  return (
    <DashboardShell role="affiliate">
      <div className="space-y-10 pb-16">
        {/* ENCABEZADO ESTADO DE CUENTA VENDEDOR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 via-[#131921] to-slate-900 p-8 md:p-10 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00D8FF]/10 border border-[#00D8FF]/20 rounded-full text-[#00D8FF] text-[10px] font-black uppercase tracking-widest">
              <BadgeDollarSign className="h-3.5 w-3.5" /> Centro de Control Financiero de Vendedor
            </div>
            <h1 className="text-4xl md:text-5xl font-headline font-black text-white uppercase italic tracking-tight">
              Estado de <span className="text-primary">Cuenta & Finanzas</span>
            </h1>
            <p className="text-slate-400 font-medium text-sm max-w-xl">
              Monitorea tus ingresos por comisiones, egresos por retiros y exporta tu reporte contable completo a Excel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <Dialog open={isTxOpen} onOpenChange={setIsTxOpen}>
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase px-5 h-14 rounded-2xl shadow-xl flex items-center gap-2">
                  <Receipt className="h-5 w-5" /> + Registrar Ingreso / Egreso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white rounded-3xl p-6 text-slate-900 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-headline font-black uppercase text-[#131921] flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-amber-500" /> Registrar Movimiento Financiero
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-medium">
                    Lleva el control contable de tus ingresos de venta o egresos por publicidad, dominios o hosting.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSaveManualTx} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-700">Tipo de Movimiento *</Label>
                    <Select value={txForm.type} onValueChange={v => setTxForm(p => ({ ...p, type: v }))}>
                      <SelectTrigger className="bg-white border-slate-300 text-slate-950 font-bold rounded-xl h-11 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ingreso" className="text-xs font-bold text-emerald-600">🟢 Ingreso (Venta / Cobro / Inversión)</SelectItem>
                        <SelectItem value="egreso" className="text-xs font-bold text-red-600">🔴 Egreso (Gasto Publicitario / Dominio / Comision)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-700">Concepto / Descripción *</Label>
                    <Input 
                      value={txForm.concept}
                      onChange={e => setTxForm(p => ({ ...p, concept: e.target.value }))}
                      placeholder="Ej. Anuncio en Facebook Ads / Pago Dominio .com"
                      className="bg-white border-slate-300 text-slate-950 font-bold placeholder:text-slate-400 rounded-xl h-11 text-xs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase text-slate-700">Monto ($ USD) *</Label>
                      <Input 
                        type="number"
                        step="0.01"
                        value={txForm.amount}
                        onChange={e => setTxForm(p => ({ ...p, amount: e.target.value }))}
                        placeholder="25.00"
                        className="bg-white border-slate-300 text-slate-950 font-bold placeholder:text-slate-400 rounded-xl h-11 text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase text-slate-700">Referencia / Voucher</Label>
                      <Input 
                        value={txForm.reference}
                        onChange={e => setTxForm(p => ({ ...p, reference: e.target.value }))}
                        placeholder="#12345"
                        className="bg-white border-slate-300 text-slate-950 font-bold placeholder:text-slate-400 rounded-xl h-11 text-xs"
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSavingTx}
                      className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg"
                    >
                      {isSavingTx ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      {isSavingTx ? 'Guardando...' : 'Guardar Movimiento'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              onClick={handleExportExcelAll}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase px-5 h-14 rounded-2xl shadow-xl flex items-center gap-2 transition-all active:scale-95"
            >
              <FileSpreadsheet className="h-5 w-5" /> Exportar Excel
            </Button>
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-slate-950 font-black text-xs uppercase px-5 h-14 rounded-2xl shadow-xl flex items-center gap-2"
            >
              <Link href="/dashboard/affiliate/register-sale">
                <Plus className="h-5 w-5" /> Registrar Venta
              </Link>
            </Button>
          </div>
        </div>

        {/* METRICAS DE BALANCES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 p-8 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Balance Disponible</span>
              <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
            <p className="text-4xl font-black text-white tracking-tighter">${availableBalance.toFixed(2)}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Saldo líquido en cuenta</p>
          </Card>

          <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 p-8 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ingresos Aprobados</span>
              <div className="h-12 w-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-400">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <p className="text-4xl font-black text-green-400 tracking-tighter">${totalApprovedCommissions.toFixed(2)}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Comisiones liberadas</p>
          </Card>

          <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 p-8 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ingresos Pendientes</span>
              <div className="h-12 w-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <p className="text-4xl font-black text-amber-400 tracking-tighter">${totalPendingCommissions.toFixed(2)}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">En validación admin</p>
          </Card>

          <Card className="border-none shadow-xl rounded-[2.5rem] bg-slate-900 p-8 ring-1 ring-white/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Egresos / Retiros</span>
              <div className="h-12 w-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400">
                <TrendingDown className="h-6 w-6" />
              </div>
            </div>
            <p className="text-4xl font-black text-purple-300 tracking-tighter">${totalPayoutsPaid.toFixed(2)}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Transferidos a banco</p>
          </Card>
        </div>

        {/* CONTENEDOR DE REGISTROS FINANCIEROS */}
        <Card className="border-none shadow-2xl rounded-[3rem] bg-white ring-1 ring-slate-100 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b p-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex bg-slate-200/60 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('income')}
                  className={`px-5 py-2.5 text-xs font-black uppercase rounded-xl transition-all flex items-center gap-2 ${
                    activeTab === 'income' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp className="h-4 w-4 text-green-400" /> Ingresos Venta ({salesList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('payouts')}
                  className={`px-5 py-2.5 text-xs font-black uppercase rounded-xl transition-all flex items-center gap-2 ${
                    activeTab === 'payouts' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingDown className="h-4 w-4 text-purple-400" /> Retiros Banco ({payoutsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className={`px-5 py-2.5 text-xs font-black uppercase rounded-xl transition-all flex items-center gap-2 ${
                    activeTab === 'manual' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Receipt className="h-4 w-4 text-amber-400" /> Registros Manuales ({rawManualTx?.length || 0})
                </button>
              </div>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar cliente, voucher..."
                className="pl-11 h-11 bg-white border-none ring-1 ring-slate-200 rounded-xl font-bold text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {activeTab === 'income' ? (
              salesLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
                </div>
              ) : filteredSales.length === 0 ? (
                <div className="text-center py-24 space-y-4">
                  <BadgeDollarSign className="h-14 w-14 text-slate-300 mx-auto" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    No hay ventas registradas en tu estado de cuenta
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 h-16">
                        <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-slate-400">Fecha</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Comprador / Cliente</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Producto</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Voucher / Ref.</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Monto Venta</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Tu Comisión</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Estatus</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.map((sale) => (
                        <TableRow key={sale.id} className="h-20 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="px-8 font-bold text-xs text-slate-600">
                            {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="font-black text-slate-900 text-xs uppercase">{sale.buyerName || sale.buyerId}</div>
                          </TableCell>
                          <TableCell className="font-bold text-slate-700 text-xs uppercase">{sale.productName || 'Producto'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs font-bold bg-slate-50">
                              {sale.voucherReference || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-slate-700 text-xs">${(Number(sale.saleAmount) || 0).toFixed(2)}</TableCell>
                          <TableCell className="font-black text-green-600 text-sm">${(Number(sale.commissionEarned) || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            {sale.status === 'Completed' ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 font-black text-[9px] uppercase px-3 py-1 rounded-full">
                                APROBADO
                              </Badge>
                            ) : sale.status === 'Pending' ? (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-black text-[9px] uppercase px-3 py-1 rounded-full">
                                EN VALIDACIÓN
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-black text-[9px] uppercase px-3 py-1 rounded-full">
                                RECHAZADO
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : activeTab === 'payouts' ? (
              payoutsLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
                </div>
              ) : filteredPayouts.length === 0 ? (
                <div className="text-center py-24 space-y-4">
                  <Wallet className="h-14 w-14 text-slate-300 mx-auto" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    No posees solicitudes de retiro registradas
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 h-16">
                        <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-slate-400">Fecha</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Método de Retiro</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Referencia Pago</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Monto Egreso</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Estatus</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayouts.map((payout) => (
                        <TableRow key={payout.id} className="h-20 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="px-8 font-bold text-xs text-slate-600">
                            {payout.requestedAt ? new Date(payout.requestedAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="font-black text-slate-900 text-xs uppercase">{payout.method || 'Banco Nicaragua'}</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-slate-600">{payout.referenceNumber || 'N/A'}</TableCell>
                          <TableCell className="font-black text-purple-600 text-sm">-${(Number(payout.amount) || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            {payout.status === 'Completed' || payout.status === 'Paid' ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 font-black text-[9px] uppercase px-3 py-1 rounded-full">
                                PAGADO
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-black text-[9px] uppercase px-3 py-1 rounded-full">
                                PROCESANDO
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : (
              !rawManualTx || rawManualTx.length === 0 ? (
                <div className="text-center py-24 space-y-4">
                  <Receipt className="h-14 w-14 text-slate-300 mx-auto" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    No has registrado movimientos manuales de ingresos o egresos
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 h-16">
                        <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-slate-400">Fecha</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Tipo</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Concepto / Descripción</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Referencia</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Monto (USD)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawManualTx.map((tx: any) => (
                        <TableRow key={tx.id} className="h-20 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="px-8 font-bold text-xs text-slate-600">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {tx.type === 'ingreso' ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black text-[9px] uppercase px-3 py-1 rounded-full">
                                🟢 INGRESO
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/10 text-red-600 border-red-500/20 font-black text-[9px] uppercase px-3 py-1 rounded-full">
                                🔴 EGRESO
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-slate-900 text-xs">{tx.concept || 'Movimiento'}</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-slate-500">{tx.reference || '-'}</TableCell>
                          <TableCell className={`font-black text-sm ${tx.type === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {tx.type === 'ingreso' ? '+' : '-'}${(Number(tx.amount) || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
