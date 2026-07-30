
"use client"

import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Users2, Plus, Search, Loader2, Mail, Calendar, Trash2, Smartphone, MessageCircle, FileSpreadsheet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/components/language-context'
import { useFirestore, useCollection, useMemoFirebase, useUser, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase'
import { collection, doc, query, where } from 'firebase/firestore'
import { Badge } from '@/components/ui/badge'
import { exportToExcel } from '@/lib/export-excel'

export default function AffiliateBuyersPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [isAdding, setIsAdding] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '' })

  const buyersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, 'buyers'), where('referredBy', '==', user.uid));
  }, [db, user]);

  const { data: buyers, isLoading } = useCollection(buyersQuery)

  const filteredBuyers = (buyers || []).filter(b => 
    `${b.firstName} ${b.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    if (!user) return;
    const buyerId = formData.email.toLowerCase().trim()
    const buyerRef = doc(db, 'buyers', buyerId)
    
    setDocumentNonBlocking(buyerRef, {
      id: buyerId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: buyerId,
      phone: formData.phone.trim(),
      referredBy: user.uid,
      registeredAt: new Date().toISOString()
    }, { merge: true })

    toast({
      title: "Comprador Registrado",
      description: `${formData.firstName} ha sido añadido a tu lista.`,
    })
    setIsAdding(false)
    setFormData({ firstName: '', lastName: '', email: '', phone: '' })
  }

  const handleDelete = (id: string) => {
    if(!confirm("¿Borrar este prospecto?")) return;
    const buyerRef = doc(db, 'buyers', id)
    deleteDocumentNonBlocking(buyerRef)
    toast({ title: "Comprador Eliminado" })
  }

  const handleExportExcel = () => {
    if (!filteredBuyers || filteredBuyers.length === 0) {
      toast({ variant: "destructive", title: "Sin datos", description: "No hay compradores para exportar." });
      return;
    }

    const rows = filteredBuyers.map(b => ({
      ID: b.id,
      Nombre: `${b.firstName || ''} ${b.lastName || ''}`.trim(),
      Email: b.email || '',
      WhatsApp: b.phone || '',
      Fecha_Registro: b.registeredAt ? new Date(b.registeredAt).toLocaleDateString() : 'N/A'
    }));

    exportToExcel('Mis_Clientes_Vendedor', rows, [
      { key: 'ID', label: 'ID Cliente' },
      { key: 'Nombre', label: 'Nombre Completo' },
      { key: 'Email', label: 'Correo Electrónico' },
      { key: 'WhatsApp', label: 'Teléfono / WhatsApp' },
      { key: 'Fecha_Registro', label: 'Fecha de Registro' }
    ]);

    toast({ title: "Clientes Exportados a Excel", description: "El archivo Excel/CSV se ha descargado." });
  }

  return (
    <DashboardShell role="affiliate">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users2 className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{t.buyers}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-headline font-black text-slate-900 tracking-tight uppercase italic leading-none">Mis <span className="text-primary">Clientes</span></h1>
            <p className="text-slate-500 font-medium mt-2">{t.customerList}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-xl h-16 rounded-2xl text-xs uppercase tracking-widest px-6 flex items-center gap-2"
            >
              <FileSpreadsheet className="h-5 w-5" /> Exportar a Excel
            </Button>

            <Dialog open={isAdding} onOpenChange={setIsAdding}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-primary hover:bg-primary/90 font-black shadow-xl h-16 rounded-2xl text-xs uppercase tracking-widest px-8">
                  <Plus className="mr-2 h-5 w-5" /> {t.registerBuyer}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] border-none shadow-2xl w-[95vw] md:max-w-lg p-0 overflow-hidden">
                <div className="bg-slate-900 p-8 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-headline font-black text-white uppercase italic">Nuevo <span className="text-primary">Prospecto</span></DialogTitle>
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] mt-1">Añadir cliente manualmente a tu red</p>
                  </DialogHeader>
                </div>
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre</Label>
                      <Input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} placeholder="Juan" className="h-12 rounded-xl font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Apellido</Label>
                      <Input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} placeholder="Pérez" className="h-12 rounded-xl font-bold" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">WhatsApp</Label>
                    <Input placeholder="50588888888" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-12 rounded-xl font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</Label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="juan@email.com" className="h-12 rounded-xl font-bold" />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <Button variant="ghost" onClick={() => setIsAdding(false)} className="flex-1 rounded-xl font-black text-[10px] uppercase">Cancelar</Button>
                    <Button className="flex-[2] bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase h-14 shadow-xl" onClick={handleSave}>VINCULAR CLIENTE</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="border-none shadow-2xl overflow-hidden rounded-[3rem] bg-white ring-1 ring-slate-100">
          <CardHeader className="bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between py-6 px-8 md:px-10 gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                className="pl-11 h-12 text-sm bg-white border-none ring-1 ring-slate-200 rounded-xl font-bold" 
                placeholder="Buscar prospecto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total: {filteredBuyers.length}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-32"><Loader2 className="animate-spin text-primary h-10 w-10 opacity-50" /></div>
            ) : filteredBuyers.length === 0 ? (
              <div className="text-center py-32 space-y-4 opacity-30">
                <Users2 className="h-16 w-16 mx-auto text-slate-300" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-400">Sin compradores vinculados</p>
              </div>
            ) : (
              <>
                {/* VISTA DESKTOP (TABLA) */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/30 h-16">
                        <TableHead className="px-10 font-black uppercase text-[10px] tracking-widest text-slate-400">Prospecto / Alumno</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Contacto</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Estatus</TableHead>
                        <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400">Registro</TableHead>
                        <TableHead className="text-right px-10 font-black uppercase text-[10px] tracking-widest text-slate-400">Gestión</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBuyers.map((buyer) => (
                        <TableRow key={buyer.id} className="hover:bg-slate-50/50 transition-all h-20 border-b last:border-0 group">
                          <TableCell className="px-10">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs shadow-inner">
                                {buyer.firstName?.charAt(0)}
                              </div>
                              <span className="font-black text-slate-800 uppercase text-xs">{buyer.firstName} {buyer.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                <Mail className="h-3.5 w-3.5 opacity-40" /> {buyer.email}
                              </div>
                              {buyer.phone && (
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                  <Smartphone className="h-3.5 w-3.5 opacity-40" /> {buyer.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[8px] font-black uppercase px-3 py-1 rounded-full border-green-100 bg-green-50 text-green-600">VINCULADO</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <Calendar className="h-3.5 w-3.5" /> {buyer.registeredAt ? new Date(buyer.registeredAt).toLocaleDateString() : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-10">
                            <div className="flex justify-end gap-2">
                              {buyer.phone && (
                                <Button asChild variant="outline" size="icon" className="h-10 w-10 text-green-600 hover:bg-green-50 border-green-100 rounded-xl">
                                  <a href={`https://wa.me/${buyer.phone.replace(/\D/g, '')}`} target="_blank"><MessageCircle className="h-4 w-4" /></a>
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-10 w-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl" onClick={() => handleDelete(buyer.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* VISTA MÓVIL (TARJETAS) */}
                <div className="lg:hidden grid grid-cols-1 gap-4 p-6">
                  {filteredBuyers.map((buyer) => (
                    <Card key={buyer.id} className="border-none shadow-xl rounded-[2.5rem] bg-white p-6 space-y-6 ring-1 ring-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black shadow-inner">
                            {buyer.firstName?.charAt(0)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-slate-800 uppercase text-sm truncate">{buyer.firstName} {buyer.lastName}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{buyer.email}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[8px] font-black uppercase rounded-full bg-slate-50">Socio</Badge>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase">WhatsApp:</span>
                          <span className="text-[11px] font-bold text-slate-700">{buyer.phone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase">Registrado:</span>
                          <span className="text-[11px] font-bold text-slate-700">{buyer.registeredAt ? new Date(buyer.registeredAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 border-t pt-4">
                        {buyer.phone && (
                          <Button asChild variant="outline" className="flex-1 h-12 rounded-xl border-green-100 text-green-600 font-black text-[10px] uppercase gap-2 shadow-sm">
                            <a href={`https://wa.me/${buyer.phone.replace(/\D/g, '')}`} target="_blank">
                              <MessageCircle className="h-4 w-4" /> WhatsApp
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-12 w-12 text-red-400 hover:text-red-600 bg-red-50 rounded-xl" onClick={() => handleDelete(buyer.id)}>
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
