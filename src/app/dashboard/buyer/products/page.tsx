
"use client"

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Loader2, ShieldCheck, Package, CreditCard, ShoppingCart, Star, Eye } from 'lucide-react'
import Image from 'next/image'
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase'
import { collection } from 'firebase/firestore'
import { useLanguage } from '@/components/language-context'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { getGoogleDriveDirectLink } from '@/lib/utils'

export default function BuyerProductsPage() {
  const { t } = useLanguage();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  
  const productsQuery = useMemoFirebase(() => collection(db, 'products'), [db]);
  const { data: products, isLoading } = useCollection(productsQuery);

  const filteredProducts = (products || []).filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardShell role="buyer">
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-inner">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Tienda Oficial Sync</span>
            </div>
            <h1 className="text-5xl font-headline font-black text-slate-900 leading-tight tracking-tight uppercase italic">Catálogo <span className="text-primary">VIP</span></h1>
            <p className="text-lg text-slate-500 font-medium max-w-2xl leading-relaxed">Adquiere formación de élite con procesamiento de pago instantáneo y seguro.</p>
          </div>
          <div className="relative w-full md:w-[400px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
            <Input 
              className="pl-16 h-18 rounded-2xl border-none bg-white shadow-xl text-md font-bold" 
              placeholder="Buscar producto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-40">
            <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <Package className="h-16 w-16 text-slate-100 mx-auto mb-4" />
            <p className="font-black text-xs uppercase tracking-widest text-slate-400">Catálogo próximamente disponible</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredProducts.map((product) => (
              <BuyerProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

function BuyerProductCard({ product }: { product: any }) {
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [detailActiveImgIndex, setDetailActiveImgIndex] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const images = product.images && product.images.length > 0 
    ? product.images 
    : [product.imageUrl || 'https://picsum.photos/seed/product/600/400'];
  
  const activeImage = images[activeImgIndex] || images[0];
  const detailActiveImage = images[detailActiveImgIndex] || images[0];

  const features = product.features
    ? product.features.split('\n').filter((f: string) => f.trim().length > 0)
    : ['Acceso inmediato al campus virtual', 'Certificación oficial de Sync Connect Inc.', 'Soporte VIP 24/7 de nuestro equipo', 'Material descargable de alta calidad'];

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => {
      setIsDialogOpen(open);
      if (open) {
        setDetailActiveImgIndex(0);
      }
    }}>
      <Card className="border-none shadow-sm hover:shadow-2xl transition-all duration-700 overflow-hidden flex flex-col rounded-[2.5rem] bg-white group ring-1 ring-slate-100">
        <DialogTrigger asChild>
          <div className="relative h-64 w-full overflow-hidden cursor-pointer">
            <Image 
              src={getGoogleDriveDirectLink(activeImage)} 
              alt={product.name} 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-1000" 
              unoptimized
            />
            <div className="absolute top-6 right-6">
              <Badge className="bg-white/95 text-slate-900 font-black px-5 py-2 rounded-2xl shadow-2xl border-none text-[9px] tracking-widest uppercase">
                {product.category}
              </Badge>
            </div>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="bg-white text-slate-900 font-black text-xs uppercase px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl scale-95 group-hover:scale-100 transition-transform">
                <Eye className="h-4 w-4 text-primary" /> VER GALERÍA Y DETALLES
              </div>
            </div>
          </div>
        </DialogTrigger>

        {images.length > 1 && (
          <div className="px-6 pt-4 flex gap-2 overflow-x-auto justify-center">
            {images.map((img: string, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImgIndex(idx)}
                className={`relative h-10 w-10 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                  activeImgIndex === idx ? 'border-primary scale-105 shadow-sm' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <Image src={getGoogleDriveDirectLink(img)} alt="" fill className="object-cover" unoptimized />
              </button>
            ))}
          </div>
        )}

        <CardHeader className="pt-8 pb-3 px-8 text-center">
          <DialogTrigger asChild>
            <CardTitle className="text-2xl font-headline font-black text-slate-900 group-hover:text-primary transition-colors line-clamp-2 min-h-[4rem] tracking-tight uppercase italic cursor-pointer">
              {product.name}
            </CardTitle>
          </DialogTrigger>
        </CardHeader>
        
        <CardContent className="px-8 pb-10 pt-3 flex-1 flex flex-col gap-6">
          <div className="flex items-center justify-center p-6 rounded-2xl bg-slate-50 border border-slate-100 ring-1 ring-black/5">
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                Monto de la inversión ({product.currency === 'NIO' ? 'Córdobas' : 'USD'})
              </p>
              <p className="font-black text-4xl text-slate-900 tracking-tighter">
                {product.currency === 'NIO' ? `C$ ${product.price?.toFixed(2)}` : `$${product.price?.toFixed(2)}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-xs uppercase rounded-xl h-14 shadow-sm transition-all duration-300 gap-2"
              >
                <Eye className="h-4 w-4" /> DETALLES
              </Button>
            </DialogTrigger>

            <Button 
              asChild
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase rounded-xl h-14 shadow-xl transition-all duration-300 gap-2"
            >
              <Link href={`/checkout/${product.id}`}>
                <ShoppingCart className="h-4 w-4" /> COMPRAR
              </Link>
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <ShieldCheck className="h-4 w-4 text-green-600" /> Transacción Encriptada Sync
          </div>
        </CardContent>
      </Card>

      <DialogContent className="max-w-5xl rounded-[3rem] p-8 md:p-12 border-none shadow-3xl bg-white text-slate-900 overflow-y-auto max-h-[95vh] w-[95vw] z-[250]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* GALERÍA DE IMÁGENES ESTILO AMAZON */}
          <div className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-5 items-stretch">
            {/* Tira vertical de miniaturas (thumbnails) */}
            {images.length > 1 && (
              <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto max-h-[500px] md:w-20 w-full shrink-0 pr-1">
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseEnter={() => setDetailActiveImgIndex(idx)}
                    onClick={() => setDetailActiveImgIndex(idx)}
                    className={`relative h-16 w-16 md:h-20 md:w-full aspect-square rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      detailActiveImgIndex === idx 
                        ? 'border-primary ring-2 ring-primary/20 scale-105 shadow-md' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Image src={getGoogleDriveDirectLink(img)} alt="" fill className="object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}

            {/* Imagen principal interactiva con Zoom-on-Hover */}
            <div className="flex-1 relative aspect-square rounded-3xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center group shadow-md">
              <div className="relative w-full h-full overflow-hidden">
                <Image 
                  src={getGoogleDriveDirectLink(detailActiveImage)} 
                  alt={product.name} 
                  fill 
                  className="object-cover transition-all duration-300 transform hover:scale-[1.6] cursor-zoom-in origin-center" 
                  unoptimized
                />
              </div>
              <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-xl pointer-events-none">
                Pasa el mouse para ampliar zoom
              </div>
            </div>
          </div>

          {/* DETALLES DEL PRODUCTO ESTILO AMAZON */}
          <div className="lg:col-span-5 space-y-8 flex flex-col justify-between h-full">
            <div className="space-y-6">
              {/* Categoría y Nombre */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full">{product.category}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">SKU: {product.code || 'SYNC-PROD'}</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-headline font-black text-slate-900 uppercase italic tracking-tight leading-none mt-2">{product.name}</h2>
              </div>

              {/* Calificaciones y Estrellas estilo Amazon */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <span className="text-sm font-black text-slate-800">4.9</span>
                <span className="text-xs text-slate-400 font-bold hover:text-primary cursor-pointer transition-colors">(124 valoraciones del cliente)</span>
              </div>

              {/* Precio */}
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Especial</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black text-slate-900 tracking-tighter">${product.price?.toFixed(2)}</span>
                  <span className="text-sm font-bold text-slate-400 line-through">${(product.price * 1.3).toFixed(2)}</span>
                  <span className="text-xs font-black text-green-600 uppercase bg-green-50 px-3 py-1 rounded-lg">Ahorra 30%</span>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Sobre este artículo</h4>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{product.description || 'Este exclusivo programa educativo ha sido desarrollado por líderes de la industria para otorgarte conocimientos avanzados y habilidades de alta demanda.'}</p>
              </div>

              {/* Viñetas / Características */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Características Clave</h4>
                <ul className="space-y-2.5">
                  {features.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-slate-600 font-semibold">
                      <span className="text-primary text-md shrink-0 mt-0.5">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA Compra */}
            <div className="space-y-4 border-t border-slate-100 pt-6 mt-4">
              <Button 
                asChild
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-md rounded-2xl h-18 shadow-2xl transition-all duration-300 gap-3"
              >
                <Link href={`/checkout/${product.id}`}>
                  <ShoppingCart className="h-6 w-6 text-primary" /> ADQUIRIR ESTE PRODUCTO
                </Link>
              </Button>
              <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <ShieldCheck className="h-4 w-4 text-green-600" /> Transacción encriptada por Sync Connect Inc.
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
