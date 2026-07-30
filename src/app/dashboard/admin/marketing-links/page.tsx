
"use client"

import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Plus, 
  Trash2, 
  Link as LinkIcon, 
  Save, 
  Loader2, 
  Search,
  Package,
  ChevronRight,
  X,
  Globe
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase'
import { collection, doc } from 'firebase/firestore'
import { cn } from '@/lib/utils'

interface MarketingLink {
  label: string;
  url: string;
}

export default function AdminMarketingLinksPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const productsQuery = useMemoFirebase(() => collection(db, 'products'), [db]);
  const { data: products, isLoading } = useCollection(productsQuery);

  const selectedProduct = products?.find(p => p.id === selectedProductId);
  const [tempLinks, setTempLinks] = useState<MarketingLink[]>([]);

  const handleSelectProduct = (p: any) => {
    setSelectedProductId(p.id);
    setTempLinks(p.marketingLinks || []);
  };

  const handleAddLink = () => {
    setTempLinks([...tempLinks, { label: '', url: '' }]);
  };

  const handleUpdateLink = (index: number, field: keyof MarketingLink, value: string) => {
    const updated = [...tempLinks];
    updated[index][field] = value;
    setTempLinks(updated);
  };

  const handleRemoveLink = (index: number) => {
    setTempLinks(tempLinks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedProductId || !db) return;
    setIsSaving(true);
    try {
      updateDocumentNonBlocking(doc(db, 'products', selectedProductId), {
        marketingLinks: tempLinks,
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Links de Publicidad Guardados ✓" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error al guardar" });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = (products || []).filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardShell role="admin">
      <div className="space-y-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Gestor de Materiales</span>
          </div>
          <h1 className="text-4xl font-headline font-black text-slate-900 tracking-tight uppercase italic">Links de <span className="text-primary">Publicidad</span></h1>
          <p className="text-slate-500 font-medium">Selecciona un producto y asigna sus materiales de venta para los afiliados.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar producto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-12 rounded-xl border-slate-200 bg-white shadow-sm font-bold"
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-200" /></div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className={cn(
                      "w-full flex items-center justify-between p-5 rounded-2xl transition-all border text-left group",
                      selectedProductId === p.id 
                        ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]" 
                        : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-4">
                       <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-inner", selectedProductId === p.id ? "bg-white/10" : "bg-slate-100")}>
                          <Package className="h-5 w-5" />
                       </div>
                       <span className="text-xs font-black uppercase tracking-tight truncate max-w-[150px]">{p.name}</span>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 transition-transform", selectedProductId === p.id ? "rotate-90 text-primary" : "text-slate-300")} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-8">
            {!selectedProductId ? (
              <Card className="h-full min-h-[400px] border-dashed border-2 flex flex-col items-center justify-center p-20 text-center bg-white/50 rounded-[3rem]">
                 <LinkIcon className="h-16 w-16 text-slate-100 mb-6" />
                 <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Selecciona un producto</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Asigna materiales de publicidad vinculados</p>
              </Card>
            ) : (
              <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden ring-1 ring-slate-100 animate-in fade-in slide-in-from-right-4 duration-500">
                <CardHeader className="bg-slate-950 p-10 text-white flex flex-row items-center justify-between">
                   <div className="flex items-center gap-4">
                     <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-slate-950 shadow-2xl">
                        <Package className="h-7 w-7" />
                     </div>
                     <div>
                       <CardTitle className="text-2xl font-headline font-black uppercase italic tracking-tight">{selectedProduct?.name}</CardTitle>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Editor de Links Promocionales</p>
                     </div>
                   </div>
                   <Button variant="ghost" size="icon" onClick={() => setSelectedProductId(null)} className="text-white/20 hover:text-white"><X className="h-6 w-6" /></Button>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                  <div className="space-y-6">
                    {tempLinks.map((link, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100 group">
                         <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">Nombre del Recurso (Ej: Video de Gancho)</Label>
                              <div className="relative">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                <Input 
                                  value={link.label} 
                                  onChange={e => handleUpdateLink(idx, 'label', e.target.value)}
                                  className="pl-11 h-12 rounded-xl border-none ring-1 ring-slate-200 font-bold"
                                  placeholder="Escribe un nombre..."
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase text-slate-400 ml-1">URL de Publicidad</Label>
                              <div className="relative">
                                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                <Input 
                                  value={link.url} 
                                  onChange={e => handleUpdateLink(idx, 'url', e.target.value)}
                                  className="pl-11 h-12 rounded-xl border-none ring-1 ring-slate-200 font-mono text-xs"
                                  placeholder="https://..."
                                />
                              </div>
                            </div>
                         </div>
                         <div className="flex items-end">
                           <Button variant="ghost" size="icon" onClick={() => handleRemoveLink(idx)} className="h-12 w-12 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl">
                             <Trash2 className="h-5 w-5" />
                           </Button>
                         </div>
                      </div>
                    ))}

                    <Button onClick={handleAddLink} variant="outline" className="w-full h-16 rounded-2xl border-dashed border-2 text-[10px] font-black uppercase tracking-widest gap-2">
                       <Plus className="h-5 w-5" /> AGREGAR LINK PUBLICITARIO
                    </Button>
                  </div>

                  <div className="pt-8 border-t flex justify-end">
                    <Button 
                      onClick={handleSave} 
                      disabled={isSaving}
                      className="h-16 px-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest shadow-2xl gap-3 transition-all active:scale-95"
                    >
                      {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                      GUARDAR CONFIGURACIÓN
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
