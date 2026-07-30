"use client"

import { useState, useEffect } from 'react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Landmark, Loader2, User, Mail, ShieldCheck, Banknote } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/components/language-context'
import { useFirestore, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase'
import { doc } from 'firebase/firestore'
import { NICA_BANKS, COUNTRY_CODES } from '@/lib/constants'

export default function AffiliateProfilePage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)

  const profileRef = useMemoFirebase(() => (user ? doc(db, 'affiliates', user.uid) : null), [db, user]);
  const { data: profile, isLoading: profileLoading } = useDoc(profileRef);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    countryCode: '+505',
    whatsappNumber: '',
    bankId: '',
    bankAccountNumber: '',
    bankAccountHolderName: ''
  })

  useEffect(() => {
    if (profile) {
      let code = '+505';
      let num = profile.whatsappNumber || '';
      
      const foundCode = COUNTRY_CODES.find(c => num.startsWith(c.code.replace('+', '')));
      if (foundCode) {
        code = foundCode.code;
        num = num.replace(foundCode.code.replace('+', ''), '');
      }

      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        countryCode: code,
        whatsappNumber: num,
        bankId: profile.bankId || '',
        bankAccountNumber: profile.bankAccountNumber || '',
        bankAccountHolderName: profile.bankAccountHolderName || ''
      })
    }
  }, [profile])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileRef || !user) return
    setLoading(true)
    
    try {
      updateDocumentNonBlocking(profileRef, {
        ...formData,
        whatsappNumber: (formData.countryCode + formData.whatsappNumber).replace(/\D/g, ''),
        updatedAt: new Date().toISOString()
      })
      toast({
        title: "Perfil Actualizado",
        description: "Tu información de pago y contacto ha sido guardada exitosamente."
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el perfil."
      })
    } finally {
      setLoading(false)
    }
  }

  if (profileLoading) {
    return (
      <DashboardShell role="affiliate">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell role="affiliate">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="space-y-2">
          <h1 className="text-4xl font-headline font-black text-slate-900 tracking-tight">Mi <span className="text-primary">Perfil de Cobros</span></h1>
          <p className="text-slate-500 font-medium">Gestiona dónde recibes tus comisiones y cómo te contacta el soporte.</p>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white ring-1 ring-slate-100">
              <CardHeader className="bg-slate-50/50 rounded-t-[2.5rem] p-8">
                <CardTitle className="text-xl flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" /> Información Personal
                </CardTitle>
                <CardDescription>Datos básicos de tu cuenta Sync.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre</Label>
                    <Input 
                      value={formData.firstName} 
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                      className="h-8 border-[#888c8c] focus:border-[#e77600] focus:ring-[3px] focus:ring-[#e77600]/20 rounded-[3px] px-2 py-1 text-[13px] font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Apellido</Label>
                    <Input 
                      value={formData.lastName} 
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                      className="h-8 border-[#888c8c] focus:border-[#e77600] focus:ring-[3px] focus:ring-[#e77600]/20 rounded-[3px] px-2 py-1 text-[13px] font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email (No editable)</Label>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-slate-400 text-sm font-bold">
                    <Mail className="h-4 w-4" /> {profile?.email}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp de Contacto</Label>
                  <div className="flex gap-0 items-stretch">
                    <Select value={formData.countryCode} onValueChange={(v) => setFormData({...formData, countryCode: v})}>
                      <SelectTrigger className="w-[85px] h-8 border-[#888c8c] focus:border-[#e77600] focus:ring-[3px] focus:ring-[#e77600]/20 rounded-[3px] rounded-r-none px-2 bg-[#F3F3F3] text-[13px] font-bold flex shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CODES.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="88888888"
                      value={formData.whatsappNumber} 
                      onChange={e => setFormData({...formData, whatsappNumber: e.target.value})}
                      className="flex-1 h-8 border-[#888c8c] focus:border-[#e77600] focus:ring-[3px] focus:ring-[#e77600]/20 rounded-[3px] rounded-l-none px-2 py-1 text-[13px] font-medium"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white ring-1 ring-slate-100">
              <CardHeader className="bg-primary/5 rounded-t-[2.5rem] p-8">
                <CardTitle className="text-xl flex items-center gap-3 text-primary">
                  <Landmark className="h-5 w-5" /> Datos para el Pago
                </CardTitle>
                <CardDescription>Aquí es donde depositaremos tus comisiones ganadas.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Banco Receptor</Label>
                  <Select 
                    value={formData.bankId} 
                    onValueChange={v => setFormData({...formData, bankId: v})}
                  >
                    <SelectTrigger className="h-8 border-[#888c8c] focus:border-[#e77600] focus:ring-[3px] focus:ring-[#e77600]/20 rounded-[3px] text-[13px] bg-white font-medium">
                      <SelectValue placeholder="Selecciona un banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {NICA_BANKS.map(bank => (
                        <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Número de Cuenta</Label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Ej: 1234567890"
                      value={formData.bankAccountNumber} 
                      onChange={e => setFormData({...formData, bankAccountNumber: e.target.value})}
                      className="pl-10 h-8 border-[#888c8c] focus:border-[#e77600] focus:ring-[3px] focus:ring-[#e77600]/20 rounded-[3px] text-[13px] font-mono font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre del Titular</Label>
                  <Input 
                    placeholder="Tal cual aparece en tu cuenta"
                    value={formData.bankAccountHolderName} 
                    onChange={e => setFormData({...formData, bankAccountHolderName: e.target.value})}
                    className="h-8 border-[#888c8c] focus:border-[#e77600] focus:ring-[3px] focus:ring-[#e77600]/20 rounded-[3px] px-2 py-1 text-[13px] font-medium"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="p-8 bg-blue-50 border border-blue-100 rounded-[2rem] flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="font-black text-blue-900">Seguridad de Pagos Activa</p>
                <p className="text-xs text-blue-700 font-medium">Tus datos están encriptados y solo son accesibles por la administración central.</p>
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="amazon-btn-primary h-10 px-8 rounded-md"
            >
              {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardShell>
  )
}
