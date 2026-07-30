"use client";

import React, { useState, useEffect } from "react";
import { useUser, useFirestore } from "@/firebase";
import { collection, doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PlusCircle, 
  MinusCircle, 
  Users, 
  MessageCircle, 
  Package, 
  CheckCircle2, 
  Trash2, 
  Calendar, 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  AlertTriangle,
  Search,
  FileSpreadsheet
} from "lucide-react";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  paymentMethod: "Efectivo" | "Transferencia" | "Fiado" | "Tarjeta";
  date: string;
}

interface Debt {
  id: string;
  clientName: string;
  clientPhone: string;
  amount: number;
  concept: string;
  status: "Pending" | "Paid";
  dueDate: string;
  createdAt: string;
}

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  costPrice: number;
  sellingPrice: number;
  category: string;
}

export default function AffiliateBusinessPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Dialog states
  const [isTxDialogOpen, setIsTxDialogOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("Venta Directa");
  const [txDesc, setTxDesc] = useState("");
  const [txMethod, setTxMethod] = useState<"Efectivo" | "Transferencia" | "Fiado" | "Tarjeta">("Efectivo");

  const [isDebtDialogOpen, setIsDebtDialogOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtConcept, setDebtConcept] = useState("");

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemStock, setItemStock] = useState("");
  const [itemCost, setItemCost] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState("Físico");

  const [searchDebt, setSearchDebt] = useState("");

  // Load business data from Firestore
  useEffect(() => {
    if (!user?.uid || !db) return;

    const txsRef = collection(db, "affiliate_business", user.uid, "transactions");
    const unsubTxs = onSnapshot(txsRef, (snap) => {
      const list: Transaction[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    });

    const debtsRef = collection(db, "affiliate_business", user.uid, "debts");
    const unsubDebts = onSnapshot(debtsRef, (snap) => {
      const list: Debt[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Debt));
      setDebts(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    const invRef = collection(db, "affiliate_business", user.uid, "inventory");
    const unsubInv = onSnapshot(invRef, (snap) => {
      const list: InventoryItem[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as InventoryItem));
      setInventory(list);
    });

    return () => {
      unsubTxs();
      unsubDebts();
      unsubInv();
    };
  }, [user?.uid, db]);

  // Calculations
  const totalIncomes = transactions.filter((t) => t.type === "income").reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = totalIncomes - totalExpenses;
  const pendingDebtsTotal = debts.filter((d) => d.status === "Pending").reduce((acc, curr) => acc + curr.amount, 0);

  // Add Transaction
  const handleSaveTransaction = async () => {
    if (!user?.uid || !db) return;
    const amountNum = parseFloat(txAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ variant: "destructive", title: "Monto inválido" });
      return;
    }

    const newTxDoc = doc(collection(db, "affiliate_business", user.uid, "transactions"));
    await setDoc(newTxDoc, {
      type: txType,
      amount: amountNum,
      category: txCategory,
      description: txDesc || (txType === "income" ? "Venta registrada" : "Gasto registrado"),
      paymentMethod: txMethod,
      date: new Date().toISOString(),
    });

    toast({ title: txType === "income" ? "Ingreso Registrado" : "Gasto Registrado", description: `$${amountNum.toFixed(2)}` });
    setIsTxDialogOpen(false);
    setTxAmount("");
    setTxDesc("");
  };

  // Add Debt (Fiado)
  const handleSaveDebt = async () => {
    if (!user?.uid || !db) return;
    const amountNum = parseFloat(debtAmount);
    if (!clientName || isNaN(amountNum) || amountNum <= 0) {
      toast({ variant: "destructive", title: "Complete los datos del cliente y monto" });
      return;
    }

    const newDebtDoc = doc(collection(db, "affiliate_business", user.uid, "debts"));
    await setDoc(newDebtDoc, {
      clientName,
      clientPhone,
      amount: amountNum,
      concept: debtConcept || "Compra a crédito",
      status: "Pending",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    toast({ title: "Fiado Registrado", description: `Cliente: ${clientName} - $${amountNum.toFixed(2)}` });
    setIsDebtDialogOpen(false);
    setClientName("");
    setClientPhone("");
    setDebtAmount("");
    setDebtConcept("");
  };

  // Toggle Debt Paid
  const handleToggleDebtPaid = async (debt: Debt) => {
    if (!user?.uid || !db) return;
    const debtRef = doc(db, "affiliate_business", user.uid, "debts", debt.id);
    const newStatus = debt.status === "Pending" ? "Paid" : "Pending";

    await setDoc(debtRef, { ...debt, status: newStatus }, { merge: true });

    // Automatically add an income transaction if marked paid
    if (newStatus === "Paid") {
      const newTxDoc = doc(collection(db, "affiliate_business", user.uid, "transactions"));
      await setDoc(newTxDoc, {
        type: "income",
        amount: debt.amount,
        category: "Cobro de Fiado",
        description: `Pago de deuda de ${debt.clientName}`,
        paymentMethod: "Efectivo",
        date: new Date().toISOString(),
      });
      toast({ title: "¡Fiado Cobrado!", description: `Se acreditó $${debt.amount.toFixed(2)} a su caja.` });
    }
  };

  // Send WhatsApp Reminder
  const handleSendWhatsAppReminder = (debt: Debt) => {
    const cleanPhone = debt.clientPhone.replace(/[^0-9]/g, "");
    const message = encodeURIComponent(
      `Hola ${debt.clientName}, espero que te encuentres excelente. Te enviamos un cordial saludo de nuestro negocio. Te recordamos de forma respetuosa tu saldo pendiente de $${debt.amount.toFixed(
        2
      )} por concepto de "${debt.concept}". Quedamos atentos para apoyarte. ¡Muchas gracias!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  // Add Inventory Item
  const handleSaveInventoryItem = async () => {
    if (!user?.uid || !db) return;
    if (!itemName) return;

    const newInvDoc = doc(collection(db, "affiliate_business", user.uid, "inventory"));
    await setDoc(newInvDoc, {
      name: itemName,
      stock: parseInt(itemStock) || 0,
      costPrice: parseFloat(itemCost) || 0,
      sellingPrice: parseFloat(itemPrice) || 0,
      category: itemCategory,
    });

    toast({ title: "Producto Agregado al Inventario" });
    setIsItemDialogOpen(false);
    setItemName("");
    setItemStock("");
    setItemCost("");
    setItemPrice("");
  };

  const filteredDebts = debts.filter(
    (d) =>
      d.clientName.toLowerCase().includes(searchDebt.toLowerCase()) ||
      d.concept.toLowerCase().includes(searchDebt.toLowerCase())
  );

  return (
    <DashboardShell role="affiliate">
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-3">
              <Building2 className="h-3.5 w-3.5" /> GESTIÓN DE NEGOCIO TIPO TREINTA
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase italic">
              Mi Negocio <span className="text-primary">360 (Caja & Fiados)</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2 font-medium max-w-2xl">
              Controla tus ventas, ingresos, egresos, cobro de fiados con WhatsApp e inventario en un solo lugar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                setTxType("income");
                setIsTxDialogOpen(true);
              }}
              className="h-12 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider px-5 rounded-2xl shadow-xl gap-2"
            >
              <PlusCircle className="h-4 w-4" /> + REGISTRAR VENTA
            </Button>
            <Button
              onClick={() => {
                setTxType("expense");
                setIsTxDialogOpen(true);
              }}
              className="h-12 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider px-5 rounded-2xl shadow-xl gap-2"
            >
              <MinusCircle className="h-4 w-4" /> - REGISTRAR GASTO
            </Button>
          </div>
        </div>

        {/* Balance Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-slate-900/80 border-white/10 rounded-3xl p-6 space-y-2 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Saldo en Caja</span>
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <p className={`text-3xl font-black ${netProfit >= 0 ? "text-white" : "text-red-400"}`}>
              ${netProfit.toFixed(2)}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Ganancia Neta Total</p>
          </Card>

          <Card className="bg-slate-900/80 border-white/10 rounded-3xl p-6 space-y-2 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Total Ingresos</span>
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-400">${totalIncomes.toFixed(2)}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Ventas & Entradas</p>
          </Card>

          <Card className="bg-slate-900/80 border-white/10 rounded-3xl p-6 space-y-2 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Total Egresos</span>
              <div className="p-2 bg-red-500/10 rounded-xl text-red-400">
                <ArrowDownRight className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-red-400">${totalExpenses.toFixed(2)}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Gastos & Salidas</p>
          </Card>

          <Card className="bg-slate-900/80 border-white/10 rounded-3xl p-6 space-y-2 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Fiados por Cobrar</span>
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-amber-400">${pendingDebtsTotal.toFixed(2)}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Cuentas Pendientes</p>
          </Card>
        </div>

        {/* Tabs for Features */}
        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="bg-slate-900 border border-white/10 p-1.5 rounded-2xl flex flex-wrap gap-2">
            <TabsTrigger value="transactions" className="rounded-xl text-xs font-bold px-5 py-2.5">
              <DollarSign className="h-4 w-4 mr-2" /> Flujo de Caja ({transactions.length})
            </TabsTrigger>
            <TabsTrigger value="debts" className="rounded-xl text-xs font-bold px-5 py-2.5">
              <Users className="h-4 w-4 mr-2" /> Fiados & Cobros ({debts.filter((d) => d.status === "Pending").length})
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-xl text-xs font-bold px-5 py-2.5">
              <Package className="h-4 w-4 mr-2" /> Inventario ({inventory.length})
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <div className="p-6 bg-slate-900/60 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase italic tracking-tight text-white">
                  Historial de Movimientos
                </h3>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  No hay transacciones registradas. Haz clic en + REGISTRAR VENTA o - REGISTRAR GASTO.
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-2xl ${
                            tx.type === "income" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {tx.type === "income" ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{tx.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/5 text-slate-400">
                              {tx.category}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {tx.paymentMethod} • {new Date(tx.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-lg font-black ${
                            tx.type === "income" ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "-"}${tx.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Debts Tab */}
          <TabsContent value="debts" className="space-y-4">
            <div className="p-6 bg-slate-900/60 rounded-3xl border border-white/10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-tight text-white">
                    Clientes Con Saldos Pendientes (Fiados)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Envía recordatorios amables por WhatsApp con 1 clic para cobrar rápido
                  </p>
                </div>

                <Button
                  onClick={() => setIsDebtDialogOpen(true)}
                  className="h-11 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase gap-2 rounded-xl"
                >
                  <PlusCircle className="h-4 w-4" /> + NUEVO FIADO
                </Button>
              </div>

              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3.5 text-slate-500" />
                <Input
                  placeholder="Buscar por cliente o concepto..."
                  value={searchDebt}
                  onChange={(e) => setSearchDebt(e.target.value)}
                  className="pl-9 h-11 bg-slate-950 border-white/10 text-white text-xs"
                />
              </div>

              {filteredDebts.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs font-bold uppercase">
                  No hay fiados registrados.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDebts.map((debt) => (
                    <div
                      key={debt.id}
                      className="p-5 bg-slate-950 rounded-2xl border border-white/5 space-y-4 relative group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-base font-black text-white">{debt.clientName}</h4>
                          <p className="text-xs text-slate-400 font-medium">{debt.concept}</p>
                          {debt.clientPhone && (
                            <p className="text-xs text-emerald-400 font-mono mt-0.5">{debt.clientPhone}</p>
                          )}
                        </div>

                        <span
                          className={`text-xs font-black uppercase px-2.5 py-1 rounded-full ${
                            debt.status === "Paid"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {debt.status === "Paid" ? "Cobrado" : "Pendiente"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-3">
                        <span className="text-2xl font-black text-white">${debt.amount.toFixed(2)}</span>

                        <div className="flex items-center gap-2">
                          {debt.status === "Pending" && debt.clientPhone && (
                            <Button
                              size="sm"
                              onClick={() => handleSendWhatsAppReminder(debt)}
                              className="h-9 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-xs gap-1.5 rounded-xl border border-emerald-500/30"
                            >
                              <MessageCircle className="h-4 w-4" /> Recordar
                            </Button>
                          )}

                          <Button
                            size="sm"
                            onClick={() => handleToggleDebtPaid(debt)}
                            variant={debt.status === "Paid" ? "outline" : "default"}
                            className="h-9 text-xs font-bold rounded-xl"
                          >
                            {debt.status === "Paid" ? "Marcar Pendiente" : "Marcar Cobrado"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4">
            <div className="p-6 bg-slate-900/60 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-tight text-white">
                    Control de Inventario
                  </h3>
                  <p className="text-xs text-slate-400">
                    Administra tus existencias, costo unitario y precio de venta
                  </p>
                </div>

                <Button
                  onClick={() => setIsItemDialogOpen(true)}
                  className="h-11 bg-primary hover:bg-primary/90 text-slate-950 font-black text-xs uppercase gap-2 rounded-xl"
                >
                  <PlusCircle className="h-4 w-4" /> + NUEVO PRODUCTO
                </Button>
              </div>

              {inventory.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs font-bold uppercase">
                  No hay productos registrados en el inventario.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inventory.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 bg-slate-950 rounded-2xl border border-white/5 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-black text-white">{item.name}</h4>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/5 text-slate-400">
                          {item.category}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center bg-slate-900 p-3 rounded-xl border border-white/5">
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Stock</p>
                          <p className={`text-base font-black ${item.stock <= 2 ? "text-red-400" : "text-white"}`}>
                            {item.stock}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Costo</p>
                          <p className="text-xs font-bold text-slate-300">${item.costPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Venta</p>
                          <p className="text-xs font-black text-emerald-400">${item.sellingPrice.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Transaction Modal */}
        <Dialog open={isTxDialogOpen} onOpenChange={setIsTxDialogOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-white rounded-3xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase italic">
                {txType === "income" ? "Registrar Ingreso / Venta" : "Registrar Gasto / Egreso"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300">Monto ($ USD)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="h-12 bg-slate-950 border-white/10 text-white text-lg font-black"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300">Categoría</Label>
                <Input
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="h-11 bg-slate-950 border-white/10 text-white text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300">Descripción / Concepto</Label>
                <Input
                  placeholder="Ej. Venta de Diplomado o Pago de Publicidad"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  className="h-11 bg-slate-950 border-white/10 text-white text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300">Método de Pago</Label>
                <select
                  value={txMethod}
                  onChange={(e: any) => setTxMethod(e.target.value)}
                  className="h-11 w-full bg-slate-950 border border-white/10 rounded-xl px-3 text-xs font-bold text-white"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Tarjeta">Tarjeta de Crédito / Débito</option>
                  <option value="Fiado">Fiado (A Crédito)</option>
                </select>
              </div>

              <Button
                onClick={handleSaveTransaction}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl"
              >
                REGISTRAR MOVIMIENTO
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Debt Modal */}
        <Dialog open={isDebtDialogOpen} onOpenChange={setIsDebtDialogOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-white rounded-3xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase italic">Registrar Nuevo Fiado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300">Nombre del Cliente</Label>
                <Input
                  placeholder="Ej. Juan Pérez"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="h-11 bg-slate-950 border-white/10 text-white text-xs font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300">WhatsApp del Cliente (con código de país)</Label>
                <Input
                  placeholder="Ej. +50588888888"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="h-11 bg-slate-950 border-white/10 text-white text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300">Monto Pendiente ($ USD)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={debtAmount}
                  onChange={(e) => setDebtAmount(e.target.value)}
                  className="h-11 bg-slate-950 border-white/10 text-white text-lg font-black"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300">Concepto o Producto</Label>
                <Input
                  placeholder="Ej. Producto X a crédito"
                  value={debtConcept}
                  onChange={(e) => setDebtConcept(e.target.value)}
                  className="h-11 bg-slate-950 border-white/10 text-white text-xs"
                />
              </div>

              <Button
                onClick={handleSaveDebt}
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl"
              >
                GUARDAR FIADO
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Inventory Item Modal */}
        <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
          <DialogContent className="bg-slate-900 border-white/10 text-white rounded-3xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase italic">Agregar Producto al Inventario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300">Nombre del Producto</Label>
                <Input
                  placeholder="Ej. Curso / Producto Físico X"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="h-11 bg-slate-950 border-white/10 text-white text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400">Stock Inicial</Label>
                  <Input
                    type="number"
                    value={itemStock}
                    onChange={(e) => setItemStock(e.target.value)}
                    className="h-10 bg-slate-950 border-white/10 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400">Costo ($)</Label>
                  <Input
                    type="number"
                    value={itemCost}
                    onChange={(e) => setItemCost(e.target.value)}
                    className="h-10 bg-slate-950 border-white/10 text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400">Precio Venta ($)</Label>
                  <Input
                    type="number"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="h-10 bg-slate-950 border-white/10 text-white text-xs"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveInventoryItem}
                className="w-full h-12 bg-primary text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl"
              >
                GUARDAR PRODUCTO
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}
