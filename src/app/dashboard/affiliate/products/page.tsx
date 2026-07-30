"use client"

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Search, Loader2, Link as LinkIcon, Check, Package, ShoppingCart, Copy, DollarSign, Truck, Zap, Star, Eye, ShieldCheck, Plus, Store } from 'lucide-react'
import Image from 'next/image'
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { useLanguage } from '@/components/language-context'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { getGoogleDriveDirectLink } from '@/lib/utils'

export default function AffiliateProductsPage() {
  const { t } = useLanguage();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal de Crear Producto Vendedor
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Infoproductos',
    price: '29',
    currency: 'USD',
    commissionRate: '70',
    description: '',
    imageUrl: '',
    paypalLink: '',
    bankDetails: ''
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user) return;
    if (!newProduct.name || !newProduct.price) {
      toast({ variant: 'destructive', title: 'Datos Incompletos', description: 'Ingresa el nombre y precio del producto.' });
      return;
    }

    setIsCreating(true);
    try {
      await addDoc(collection(db, 'products'), {
        name: newProduct.name,
        category: newProduct.category || 'Infoproductos',
        price: Number(newProduct.price) || 29,
        currency: newProduct.currency || 'USD',
        commissionRate: Number(newProduct.commissionRate) || 70,
        description: newProduct.description || 'Infoproducto digital creado por vendedor.',
        imageUrl: newProduct.imageUrl || 'https://picsum.photos/seed/product/600/400',
        sellerId: user.uid,
        sellerEmail: user.email || '',
        paypalLink: newProduct.paypalLink || '',
        bankDetails: newProduct.bankDetails || '',
        active: true,
        createdAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      });

      toast({
        title: "¡Producto Publicado! 🎉",
        description: `El producto "${newProduct.name}" ya está activo en el catálogo global de SyncConnect.`,
      });

      setNewProduct({
        name: '',
        category: 'Infoproductos',
        price: '29',
        currency: 'USD',
        commissionRate: '70',
        description: '',
        imageUrl: '',
        paypalLink: '',
        bankDetails: ''
      });
      setIsCreateOpen(false);
    } catch (err: any) {
      console.error('Error creando producto:', err);
      toast({ variant: 'destructive', title: 'Error al Publicar', description: err?.message || 'No se pudo guardar el producto.' });
    } finally {
      setIsCreating(false);
    }
  };
  
  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'products');
  }, [db]);
  
  const { data: products, isLoading } = useCollection(productsQuery);

  const filteredProducts = (products || []).filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Enlace Cycling Copiado 🚴‍♂️",
      description: "Enlace de afiliación listo para tus promociones.",
    });
  };

  return (
    <DashboardShell role="affiliate">
      <div className="space-y-12 pb-20">
        {/* HEADER MERCADO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-200">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <span className="text-[11px] font-black uppercase text-primary tracking-[0.4em]">Mercado de Productos</span>
            </div>
            <h1 className="text-5xl font-headline font-black text-slate-900 leading-tight tracking-tight uppercase italic">Tus Próximas <span className="text-primary">Ganancias</span></h1>
            <p className="text-lg text-slate-500 font-medium max-w-2xl leading-relaxed">Infraestructura lista para vender productos físicos, digitales y servicios.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="h-14 px-6 bg-[#131921] hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl flex items-center gap-2 border border-white/10 shrink-0">
                  <Plus className="h-5 w-5 text-primary" /> Publicar Mi Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl bg-white rounded-3xl p-6 text-slate-900 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline font-black uppercase flex items-center gap-2 text-[#131921]">
                    <Store className="h-6 w-6 text-primary" /> Registrar Nuevo Producto / Infoproducto
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-medium">
                    Agrega tu producto al catálogo global de SyncConnect para que la red de afiliados empiece a venderlo.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateProduct} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-700">Nombre del Producto / Curso *</Label>
                    <Input 
                      value={newProduct.name}
                      onChange={e => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej. Máster en Automatización de Ventas 2026"
                      className="bg-white border-slate-300 text-slate-950 font-bold placeholder:text-slate-400 rounded-xl h-11 text-xs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase text-slate-700">Moneda *</Label>
                      <select 
                        value={newProduct.currency || 'USD'}
                        onChange={e => setNewProduct(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full bg-white border border-slate-300 text-slate-950 font-bold rounded-xl h-11 text-xs px-2"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="NIO">Córdobas (C$)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase text-slate-700">Precio *</Label>
                      <Input 
                        type="number"
                        value={newProduct.price}
                        onChange={e => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="29"
                        className="bg-white border-slate-300 text-slate-950 font-bold placeholder:text-slate-400 rounded-xl h-11 text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold uppercase text-slate-700">Comisión (%)</Label>
                      <Input 
                        type="number"
                        value={newProduct.commissionRate}
                        onChange={e => setNewProduct(prev => ({ ...prev, commissionRate: e.target.value }))}
                        placeholder="70"
                        className="bg-white border-slate-300 text-slate-950 font-bold placeholder:text-slate-400 rounded-xl h-11 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-700">Descripción del Producto</Label>
                    <Textarea 
                      value={newProduct.description}
                      onChange={e => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Resume los módulos, beneficios clave y qué incluye la entrega..."
                      className="bg-white border-slate-300 text-slate-950 font-bold placeholder:text-slate-400 rounded-xl h-20 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold uppercase text-slate-700">URL de Imagen del Producto</Label>
                    <Input 
                      value={newProduct.imageUrl}
                      onChange={e => setNewProduct(prev => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="https://ejemplo.com/imagen.jpg (Opcional)"
                      className="bg-white border-slate-300 text-slate-950 font-bold placeholder:text-slate-400 rounded-xl h-11 text-xs"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <p className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Métodos de Cobro Directo para el Vendedor</p>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-[10px] font-bold uppercase text-slate-600">Enlace de Pago PayPal (.me / checkout)</Label>
                        <Input 
                          value={newProduct.paypalLink}
                          onChange={e => setNewProduct(prev => ({ ...prev, paypalLink: e.target.value }))}
                          placeholder="https://paypal.me/miboleta"
                          className="bg-white border-slate-300 text-slate-950 font-bold placeholder:text-slate-400 rounded-xl h-9 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold uppercase text-slate-600">Datos de Transferencia Bancaria</Label>
                        <Input 
                          value={newProduct.bankDetails}
                          onChange={e => setNewProduct(prev => ({ ...prev, bankDetails: e.target.value }))}
                          placeholder="BAC / Banpro - Cuenta N° 123456789 - Nombre Titular"
                          className="bg-white border-slate-300 text-slate-950 font-bold placeholder:text-slate-400 rounded-xl h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="submit"
                      disabled={isCreating}
                      className="w-full h-12 bg-[#FF5500] hover:bg-[#E63900] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg"
                    >
                      {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      {isCreating ? 'Guardando...' : 'Publicar Producto en Catálogo'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <div className="relative w-full md:w-[320px]">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
              <Input 
                className="pl-16 h-14 rounded-[2rem] border-none bg-slate-50 shadow-inner text-md font-bold text-slate-950 focus:ring-2 focus:ring-primary/20" 
                placeholder="Buscar producto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-40">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando Mercado...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[4rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
            <Package className="h-16 w-16 text-slate-100 mb-6" />
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Catálogo en mantenimiento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id}
                product={product}
                user={user}
                copiedId={copiedId}
                handleCopyLink={handleCopyLink}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}

function ProductCard({ product, user, copiedId, handleCopyLink }: { product: any; user: any; copiedId: string | null; handleCopyLink: (text: string, id: string) => void }) {
  const { toast } = useToast();
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [detailActiveImgIndex, setDetailActiveImgIndex] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const images = product.images && product.images.length > 0 
    ? product.images 
    : [product.imageUrl || 'https://picsum.photos/seed/product/600/400'];

  const activeImage = images[activeImgIndex] || images[0];
  const detailActiveImage = images[detailActiveImgIndex] || images[0];
  const maxCommission = (product.price * (product.commissionRate / 100)).toFixed(2);

  const features = product.features
    ? product.features.split('\n').filter((f: string) => f.trim().length > 0)
    : ['Comisión directa acreditada de inmediato', 'Rastreo permanente mediante cookies y pixel', 'Material promocional y creativos listos para usar', 'Soporte prioritario para afiliados destacados'];

  const affiliateLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/checkout/${product.id}?ref=${user?.uid || ''}`
    : '';

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
            <div className="absolute top-6 left-6 flex flex-col gap-2">
              <Badge className="bg-slate-900/90 backdrop-blur-md text-white border-none font-black px-4 py-1.5 rounded-xl text-[8px] uppercase tracking-widest shadow-2xl">
                {product.category || 'CURSO'}
              </Badge>
              <Badge className="bg-primary text-white border-none font-black px-4 py-1.5 rounded-xl text-[8px] uppercase tracking-widest shadow-2xl flex items-center gap-2">
                {product.type === 'Físico' ? <Truck className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                {product.type?.toUpperCase() || 'DIGITAL'}
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
        
        <CardContent className="p-10 flex-1 flex flex-col gap-8">
          <div className="space-y-2">
            <DialogTrigger asChild>
              <h3 className="text-xl font-headline font-black text-slate-900 uppercase leading-tight line-clamp-1 group-hover:text-primary transition-colors cursor-pointer">{product.name}</h3>
            </DialogTrigger>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Infraestructura Sync Connect</p>
          </div>

          <div className="flex items-center justify-between p-6 rounded-[2rem] bg-orange-50 border border-orange-100 ring-1 ring-primary/5">
            <div>
              <p className="text-[9px] text-primary/60 font-black uppercase tracking-widest">
                Precio ({product.currency === 'NIO' ? 'Córdobas' : 'USD'})
              </p>
              <p className="font-black text-2xl text-slate-900">
                {product.currency === 'NIO' ? `C$ ${product.price?.toFixed(2)} NIO` : `$${product.price?.toFixed(2)} USD`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-primary font-black uppercase tracking-widest">Tu Comisión</p>
              <p className="font-black text-3xl text-primary italic">
                {product.currency === 'NIO' ? `C$ ${maxCommission}` : `$${maxCommission}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="w-full h-14 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-xs uppercase gap-2 transition-all shadow-sm"
              >
                <Eye className="h-4 w-4" /> VER DETALLE
              </Button>
            </DialogTrigger>

            <Button 
              onClick={() => handleCopyLink(affiliateLink, product.id)}
              className="w-full h-14 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase shadow-xl gap-2 transition-all active:scale-95"
            >
              {copiedId === product.id ? (
                <><Check className="h-4 w-4 text-primary" /> COPIADO</>
              ) : (
                <><LinkIcon className="h-4 w-4 text-primary" /> ENLACE CYCLING</>
              )}
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">
            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Pago Bancario</span>
            <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Rastreo Activo</span>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full">{product.category || 'CURSO'}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 bg-slate-100 px-4 py-1.5 rounded-full">{product.type || 'Digital'}</span>
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
                <span className="text-xs text-slate-400 font-bold hover:text-primary cursor-pointer transition-colors">(124 valoraciones del afiliado)</span>
              </div>

              {/* Precio y Comisión */}
              <div className="flex gap-4 items-center justify-between p-6 rounded-2xl bg-orange-50 border border-orange-100 ring-1 ring-primary/5">
                <div>
                  <p className="text-[9px] text-primary/60 font-black uppercase tracking-widest">Precio Final</p>
                  <p className="font-black text-2xl text-slate-900">${product.price?.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-primary font-black uppercase tracking-widest">Comisión de Afiliado</p>
                  <p className="font-black text-3xl text-primary italic">${maxCommission}</p>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Sobre este artículo</h4>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{product.description || 'Este exclusivo programa educativo ha sido desarrollado por líderes de la industria para otorgar conocimientos avanzados y habilidades de alta demanda.'}</p>
              </div>

              {/* Viñetas / Características */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Especificaciones de Promoción</h4>
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

            {/* CTA Promoción & Descargas */}
            <div className="space-y-4 border-t border-slate-100 pt-6 mt-4">
              <Button 
                onClick={() => handleCopyLink(affiliateLink, product.id)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-md rounded-2xl h-18 shadow-2xl transition-all duration-300 gap-3"
              >
                {copiedId === product.id ? (
                  <><Check className="h-6 w-6 text-primary" /> COPIADO CON ÉXITO</>
                ) : (
                  <><LinkIcon className="h-6 w-6 text-primary" /> COPIAR ENLACE DE AFILIADO</>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = getGoogleDriveDirectLink(detailActiveImage);
                  link.download = `material_publicidad_${product.name || 'syncconnect'}.jpg`;
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  toast({
                    title: "Descargando Imagen",
                    description: "Se ha iniciado la descarga del material publicitario.",
                  });
                }}
                className="w-full h-14 border-slate-300 hover:bg-slate-50 text-slate-800 font-black text-xs uppercase rounded-2xl gap-2 shadow-sm"
              >
                <Zap className="h-4 w-4 text-primary" /> DESCARGAR FOTO PUBLICITARIA (SELECCIONADA)
              </Button>

              <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <ShieldCheck className="h-4 w-4 text-green-600" /> Rastreo Activo 365 días Sync Connect
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
