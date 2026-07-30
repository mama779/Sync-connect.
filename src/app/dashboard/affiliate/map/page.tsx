"use client"

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { 
  MapPin, 
  Loader2, 
  Calendar, 
  Navigation, 
  ShieldCheck,
  Locate,
  Radio,
  AlertCircle
} from 'lucide-react'
import { useFirestore, useUser, updateDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase'
import { doc } from 'firebase/firestore'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function AffiliateMapPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const [updatingLocation, setUpdatingLocation] = useState(false)

  // Consultar únicamente el perfil del afiliado actual
  const profileRef = useMemoFirebase(() => (user ? doc(db, 'affiliates', user.uid) : null), [db, user]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

  // Función para solicitar y reportar la ubicación actual del afiliado
  const reportLocation = () => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "No soportado",
        description: "Tu navegador no soporta la API de geolocalización."
      })
      return
    }

    setUpdatingLocation(true)
    toast({
      title: "Solicitando Permiso",
      description: "Por favor acepta el permiso de ubicación en tu navegador para reportar tu presencia activa."
    })

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        if (profileRef) {
          try {
            await updateDocumentNonBlocking(profileRef, {
              lastLocation: {
                lat: latitude,
                lng: longitude,
                updatedAt: new Date().toISOString()
              }
            })

            toast({
              title: "Ubicación Sincronizada ✓",
              description: "Tu nodo de geolocalización ha sido reportado exitosamente. Solo la administración principal puede ver esta información."
            })
          } catch (err: any) {
            console.error("Error updating affiliate location:", err);
            toast({
              variant: "destructive",
              title: "Error al actualizar",
              description: err.message || "No se pudo sincronizar tu ubicación."
            })
          }
        }
        setUpdatingLocation(false)
      },
      (error) => {
        console.error(error)
        let errMsg = "No se pudo obtener la ubicación."
        if (error.code === error.PERMISSION_DENIED) {
          errMsg = "Permiso denegado. Por favor, habilita el acceso a la ubicación en los ajustes del navegador."
        }
        toast({
          variant: "destructive",
          title: "Error de Ubicación",
          description: errMsg
        })
        setUpdatingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <DashboardShell role="affiliate">
      <div className="space-y-10">
        
        {/* Encabezado Principal */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                <MapPin className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Geolocalización Segura</span>
            </div>
            <h1 className="text-4xl font-headline font-black text-slate-900 tracking-tight leading-none uppercase italic">
              Reporte de <span className="text-primary">Presencia Territorial</span>
            </h1>
            <p className="text-slate-500 font-medium max-w-xl">
              Reporta tu presencia de geolocalización de forma segura. Tu ubicación está encriptada y es únicamente visible para el administrador principal.
            </p>
          </div>
        </div>

        {/* Sección de Estado del Propio Nodo */}
        <Card className="border-none shadow-xl rounded-[3rem] bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
            <Radio className="h-64 w-64 text-primary animate-ping" />
          </div>
          
          <CardContent className="p-10 md:p-12">
            {isProfileLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <Badge className={`border-none font-black px-5 py-2 rounded-2xl text-[9px] uppercase tracking-widest ${
                      profile?.lastLocation ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white animate-pulse'
                    }`}>
                      {profile?.lastLocation ? 'NODO ACTIVO' : 'NODO INACTIVO'}
                    </Badge>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado de Privacidad</span>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight italic">
                      Hola, <span className="text-primary">{profile?.firstName || 'Socio'}</span>. {profile?.lastLocation ? 'Tu señal está en línea.' : 'Establece tu presencia.'}
                    </h2>
                    <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-2xl">
                      Al reportar tu ubicación de geolocalización, confirmas tu señal de presencia. Tu ubicación quedará disponible únicamente para la gerencia principal, respetando tu privacidad al 100%.
                    </p>
                  </div>

                  {profile?.lastLocation && (
                    <div className="flex flex-wrap gap-4 pt-2">
                      <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                        <Navigation className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Coordenadas Registradas</p>
                          <p className="text-xs font-bold font-mono text-white">
                            {profile.lastLocation.lat.toFixed(6)}, {profile.lastLocation.lng.toFixed(6)}
                          </p>
                        </div>
                      </div>
                      <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Último Reporte</p>
                          <p className="text-xs font-bold text-white">
                            {new Date(profile.lastLocation.updatedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-4 flex flex-col items-stretch justify-center">
                  <Button 
                    onClick={reportLocation}
                    disabled={updatingLocation}
                    className={`w-full h-20 rounded-3xl font-black text-md uppercase tracking-widest shadow-2xl transition-all duration-500 gap-3 ${
                      profile?.lastLocation 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                        : 'bg-primary hover:bg-primary/90 text-white animate-bounce'
                    }`}
                  >
                    {updatingLocation ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                        Sincronizando...
                      </>
                    ) : profile?.lastLocation ? (
                      <>
                        <Locate className="h-6 w-6 text-white animate-pulse" />
                        Actualizar Señal
                      </>
                    ) : (
                      <>
                        <Radio className="h-6 w-6 text-white animate-pulse" />
                        Reportar Presencia Activa
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info de Seguridad de Ubicaciones */}
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white ring-1 ring-slate-100 p-8 flex items-start gap-5">
          <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1 text-left">
            <h4 className="text-sm font-black uppercase tracking-wide text-slate-900">Política de Privacidad Sync Connect</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Tu ubicación no es pública ni compartida con otros afiliados o compradores. Queda encriptada y restringida por reglas de seguridad de Firestore para uso exclusivo de la administración de la plataforma.
            </p>
          </div>
        </Card>

      </div>
    </DashboardShell>
  )
}
