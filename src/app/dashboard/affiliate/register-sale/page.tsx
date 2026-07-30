
"use client"

import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { BadgeDollarSign, User, Mail, Tag, Landmark, AlertCircle, Phone, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/components/language-context'
import { useFirestore, useUser, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase'
import { collection, query, where, getDocs, doc } from 'firebase/firestore'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { sendEmail } from '@/lib/email'

export default function RegisterSalePage() {
  const { toast } = useToast()
  const { t } = useLanguage()
  const db = useFirestore()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [productCode, setProductCode] = useState('')
  const [voucherReference, setVoucherReference] = useState('')
  const [buyerData, setBuyerData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })

  const handleRegisterSale = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!voucherReference.trim()) {
      toast({
        variant: "destructive",
        title: "Campo Obligatorio",
        description: "Debes ingresar el número de referencia del voucher para registrar la venta.",
      })
      return
    }

    if (!user || !db) return

    setLoading(true)
    
    try {
      // 1. Buscar producto por código
      const productsRef = collection(db, 'products')
      const q = query(productsRef, where('code', '==', productCode.toUpperCase()))
      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Error de Código",
          description: "El código de producto no existe en nuestro catálogo."
        })
        setLoading(false)
        return
      }

      const productDoc = querySnapshot.docs[0]
      const product = productDoc.data()
      
      // 2. Calcular comisión
      const saleAmount = product.price || 0
      const commissionRate = product.commissionRate || 0
      const commissionEarned = (saleAmount * commissionRate) / 100

      // 3. Registrar/Actualizar Comprador
      const buyerId = buyerData.email.toLowerCase().trim();
      const buyerRef = doc(db, 'buyers', buyerId);
      setDocumentNonBlocking(buyerRef, {
        id: buyerId,
        firstName: buyerData.firstName,
        lastName: buyerData.lastName,
        email: buyerId,
        phone: buyerData.phone.trim(),
        referredBy: user.uid,
        registeredAt: new Date().toISOString()
      }, { merge: true });

      // 4. Registrar venta como PENDIENTE
      const saleData = {
        affiliateId: user.uid,
        productId: productDoc.id,
        productName: product.name,
        buyerId: buyerId,
        buyerName: `${buyerData.firstName} ${buyerData.lastName}`,
        saleDate: new Date().toISOString(),
        saleAmount: saleAmount,
        commissionEarned: commissionEarned,
        productPayoutAmount: saleAmount - commissionEarned,
        voucherReference: voucherReference.trim(),
        status: 'Pending' // Iniciamos como pendiente de aprobación admin
      }

      const salesRef = collection(db, 'sales')
      addDocumentNonBlocking(salesRef, saleData)

      // 5. EMAIL AL AFILIADO (AVISO DE REGISTRO)
      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: `Venta Registrada - Pendiente de Validación`,
          text: `¡Hola! Has registrado una nueva venta.
          
Detalles:
- Producto: ${product.name}
- Cliente: ${buyerData.firstName} ${buyerData.lastName}
- Voucher: ${voucherReference.trim()}

Tu comisión de $${commissionEarned.toFixed(2)} será sumada a tu saldo una vez que el administrador valide el pago.`
        });
      }

      // NO ACTUALIZAR SALDO AQUÍ. Se hará en la aprobación admin.

      toast({
        title: "Venta Registrada",
        description: "Enviada para validación del administrador.",
      })
      
      setProductCode('')
      setVoucherReference('')
      setBuyerData({ firstName: '', lastName: '', email: '', phone: '' })
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la venta."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardShell role="affiliate">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary mb-2">{t.registerSale}</h1>
          <p className="text-muted-foreground">Ingresa los datos de la transacción. El saldo se actualizará tras la validación administrativa.</p>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800 font-bold">Proceso de Pago</AlertTitle>
          <AlertDescription className="text-blue-700 text-xs">
            Una vez registrado el voucher, el administrador validará el depósito y habilitará tu comisión automáticamente.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleRegisterSale}>
          <div className="grid gap-6">
            <Card className="border-none shadow-md ring-2 ring-primary/5">
              <CardHeader className="bg-primary/5 rounded-t-lg">
                <CardTitle className="text-lg font-headline flex items-center gap-2 text-primary">
                  <Landmark className="h-5 w-5" />
                  Paso 1: Comprobante de Pago (Voucher)
                </CardTitle>
                <CardDescription>Indispensable para sumar tu comisión.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="voucherRef" className="flex items-center gap-1">
                    {t.voucherReference} <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="voucherRef" 
                    placeholder="Nº de Referencia Bancaria" 
                    required 
                    value={voucherReference}
                    onChange={(e) => setVoucherReference(e.target.value)}
                    className="h-12 border-primary/30 focus:border-primary font-bold text-lg"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-headline flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Paso 2: Detalles del Producto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="productCode">Código del Producto <span className="text-destructive">*</span></Label>
                  <Input 
                    id="productCode" 
                    placeholder="Ej: MKT-PRO" 
                    required 
                    className="font-mono uppercase h-11" 
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-headline flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Paso 3: Datos del Comprador
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="buyerFirstName">{t.firstName} <span className="text-destructive">*</span></Label>
                    <Input id="buyerFirstName" required value={buyerData.firstName} onChange={(e) => setBuyerData({...buyerData, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buyerLastName">{t.lastName} <span className="text-destructive">*</span></Label>
                    <Input id="buyerLastName" required value={buyerData.lastName} onChange={(e) => setBuyerData({...buyerData, lastName: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyerEmail">{t.email} <span className="text-destructive">*</span></Label>
                  <Input id="buyerEmail" type="email" required value={buyerData.email} onChange={(e) => setBuyerData({...buyerData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyerPhone">WhatsApp <span className="text-destructive">*</span></Label>
                  <Input id="buyerPhone" placeholder="505..." required value={buyerData.phone} onChange={(e) => setBuyerData({...buyerData, phone: e.target.value})} />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-16 rounded-2xl shadow-xl" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "REGISTRAR PARA VALIDACIÓN"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardShell>
  )
}
