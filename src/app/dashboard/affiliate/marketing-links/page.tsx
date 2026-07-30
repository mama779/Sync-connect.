
"use client"

import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Package, 
  Loader2, 
  Search,
  Zap,
  PlayCircle,
  Globe,
  FileText
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase'
import { collection } from 'firebase/firestore'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function AffiliateMarketingLinksPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const productsQuery = useMemoFirebase(() => collection(db, 'products'), [db]);
  const { data: products, isLoading } = useCollection(productsQuery);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Enlace Copiado ✓", description: "Listo para usar en tu publicidad." });
  };

  const filteredProducts = (products || []).filter(p => 
    (p.marketingLinks && p.marketingLinks.length > 0) &&
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardShell role="affiliate">
      <div className="space-y-12 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                <Zap className="h-6 w-6 fill-primary" />
              </div>
              <span className="text-[10px] font-black uppercase text-primary tracking-[0.4em]">Sync Assets Hub</span>
            </div>
            <h1 className="text-5xl font-headline font-black text-slate-900 tracking-tight leading-none uppercase italic">Links de <span className="text-primary">Publicidad</span></h1>
            <p className="text-lg text-slate-500 font-medium max-w-2xl">Accede a los materiales oficiales de cada producto para tus campañas.</p>
          </div>
          
          <div className="relative w-full md:w-[400px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
            <Input 
              className="pl-16 h-18 rounded-2xl border-none bg-white shadow-xl text-md font-bold" 
              placeholder="Buscar por producto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-40"><Loader2 className="animate-spin h-12 w-12 text-primary opacity-20" /></div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[4rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
             <LinkIcon className="h-16 w-16 text-slate-100 mb-6" />
             <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sin materiales de publicidad disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-10">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="border-none shadow-xl rounded-[3rem] bg-white overflow-hidden ring-1 ring-slate-100 group">
                <div className="p-8 bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5">
                   <div className="flex items-center gap-5">
                      <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-slate-950 shadow-2xl transition-transform group-hover:rotate-6">
                        <Package className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-headline font-black text-white uppercase italic tracking-tight">{product.name}</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{product.marketingLinks?.length || 0} RECURSOS DISPONIBLES</p>
                      </div>
                   </div>
                </div>
                <CardContent className="p-10 bg-slate-50/30">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {product.marketingLinks.map((link: any, idx: number) => {
                      const isVideo = link.label.toLowerCase().includes('video');
                      const isWeb = link.label.toLowerCase().includes('landing') || link.label.toLowerCase().includes('web');
                      
                      return (
                        <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col gap-6 relative overflow-hidden group/item">
                           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/item:opacity-10 transition-opacity">
                             {isVideo ? <PlayCircle className="h-20 w-20" /> : isWeb ? <Globe className="h-20 w-20" /> : <FileText className="h-20 w-20" />}
                           </div>
                           
                           <div className="space-y-1">
                             <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">Material Oficial</span>
                             <h4 className="text-sm font-black text-slate-900 uppercase leading-tight line-clamp-2">{link.label}</h4>
                           </div>

                           <div className="p-4 bg-slate-50 rounded-xl font-mono text-[9px] text-slate-400 truncate border">
                              {link.url}
                           </div>

                           <Button 
                            onClick={() => handleCopy(link.url, `${product.id}-${idx}`)}
                            className={cn(
                              "w-full h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg gap-2 transition-all active:scale-95",
                              copiedId === `${product.id}-${idx}` ? "bg-green-600 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
                            )}
                           >
                             {copiedId === `${product.id}-${idx}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                             COPIAR ENLACE
                           </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="p-12 bg-slate-900 rounded-[4rem] text-center space-y-6 relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 left-0 p-10 opacity-5 rotate-12"><Zap className="h-48 w-48 text-primary" /></div>
           <h3 className="text-3xl font-headline font-black text-white uppercase italic tracking-tight relative z-10">¿Necesitas material específico?</h3>
           <p className="text-slate-400 font-medium max-w-xl mx-auto relative z-10">Si un producto no tiene el link que necesitas, contacta a la administración para que lo suban al sistema.</p>
           <div className="pt-4 relative z-10">
              <Button variant="outline" className="h-16 px-12 rounded-2xl border-primary text-primary font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-slate-900 transition-all">
                SOLICITAR MATERIAL
              </Button>
           </div>
        </div>
      </div>
    </DashboardShell>
  );
}
