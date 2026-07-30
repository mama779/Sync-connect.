"use client"

import { ShieldCheck, Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Link href="/auth/login" className="mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase text-[10px] tracking-widest">
        <ArrowLeft className="h-4 w-4" />
        <span>Volver al inicio de sesión</span>
      </Link>

      <Card className="w-full max-w-md border-none shadow-2xl rounded-2xl overflow-hidden bg-white">
        <div className="bg-slate-900 p-10 text-white text-center">
          <div className="h-16 w-16 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-headline font-black uppercase tracking-tight">Acceso Restringido</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Membresía por Invitación</p>
        </div>
        
        <CardContent className="p-10 text-center space-y-6">
          <p className="text-slate-600 text-sm leading-relaxed">
            Actualmente, el registro de nuevos socios en <strong>Sync Connect</strong> se realiza exclusivamente mediante invitación directa de un administrador.
          </p>

          <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">¿Deseas solicitar acceso?</p>
            <Button asChild variant="outline" className="w-full h-12 rounded-lg border-slate-300 font-black text-xs uppercase">
              <Link href="mailto:admin@syncconnect.ni" className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" /> CONTACTAR SOPORTE
              </Link>
            </Button>
          </div>

          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">Sync Connect Nicaragua • Sistema de Gestión Elite</p>
        </CardContent>
      </Card>
    </div>
  )
}