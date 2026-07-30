"use client"

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Mail, Loader2, User, Copy, Check, Users, MessageCircle } from 'lucide-react'
import { useLanguage } from '@/components/language-context'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from '@/components/ui/button'
import { useFirestore, useCollection, useMemoFirebase, useUser, addDocumentNonBlocking } from '@/firebase'
import { collection } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminAffiliateContactsPage() {
  const { t } = useLanguage();
  const db = useFirestore();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const affiliatesQuery = useMemoFirebase(() => {
    if (!db || isUserLoading || !user) return null;
    return collection(db, 'affiliates');
  }, [db, user, isUserLoading]);

  const { data: affiliates, isLoading } = useCollection(affiliatesQuery);

  const filteredAffiliates = affiliates?.filter(aff => 
    aff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${aff.firstName} ${aff.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
    toast({
      title: "Copiado",
      description: "El Gmail ha sido copiado al portapapeles.",
    });
  };

  return (
    <DashboardShell role="admin">
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                <Mail className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Directorio Interno</span>
            </div>
            <h1 className="text-4xl font-headline font-black text-slate-900 tracking-tight">{t.affiliateContacts}</h1>
            <p className="text-slate-500 font-medium">Visualiza la lista de contactos de tus socios afiliados.</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
            <Input 
              className="pl-14 h-16 rounded-[1.5rem] border-none bg-white shadow-xl text-sm font-bold" 
              placeholder="Buscar por nombre o gmail..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading || isUserLoading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="h-12 w-12 animate-spin text-primary opacity-50" />
          </div>
        ) : filteredAffiliates.length === 0 ? (
          <Card className="border-dashed border-4 flex flex-col items-center justify-center p-32 text-center bg-white/50 rounded-[4rem] border-slate-100">
            <Users className="h-20 w-20 text-slate-200 mb-8" />
            <h3 className="text-2xl font-black text-slate-400 mb-2">Sin contactos</h3>
            <p className="text-slate-400 max-w-sm font-bold text-sm leading-relaxed">Tu red interna aparecerá aquí automáticamente.</p>
          </Card>
        ) : (
          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden ring-1 ring-slate-100">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                      <TableHead className="px-10 h-20 uppercase text-[10px] font-black text-slate-400 tracking-widest">{t.firstName} {t.lastName}</TableHead>
                      <TableHead className="h-20 uppercase text-[10px] font-black text-slate-400 tracking-widest">Cuenta de Usuario</TableHead>
                      <TableHead className="px-10 text-right h-20 uppercase text-[10px] font-black text-slate-400 tracking-widest">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAffiliates.map((aff) => (
                      <TableRow key={aff.id} className="hover:bg-slate-50/30 transition-all h-24 border-b border-slate-50 last:border-0 group">
                        <TableCell className="px-10">
                          <div className="flex items-center gap-5">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm shadow-inner">
                              {aff.firstName?.charAt(0)}
                            </div>
                            <span className="font-black text-slate-800 text-lg tracking-tight uppercase">{aff.firstName} {aff.lastName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                            <Mail className="h-4 w-4 opacity-40" /> 
                            {aff.email}
                          </div>
                        </TableCell>
                        <TableCell className="px-10 text-right">
                          <div className="flex justify-end gap-3">
                            <Button variant="ghost" className="h-12 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest" onClick={() => handleCopyEmail(aff.email)}>
                              {copiedEmail === aff.email ? "Copiado" : "Copiar Email"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
