"use client"

import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Landmark, Banknote, Camera, Upload, ShieldAlert, Clock, Loader2, CheckCircle, ShieldCheck, Mail, Phone, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { updateDocumentNonBlocking } from "@/firebase"
import { doc } from "firebase/firestore"
import { NICA_BANKS, COUNTRY_CODES } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface AffiliateVerificationProps {
  profile: any
  user: any
  db: any
}

export function AffiliateVerification({ profile, user, db }: AffiliateVerificationProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    cedula: "",
    payoutMethod: "banco_nicaragua",
    bankId: "",
    bankAccountNumber: "",
    bankAccountHolderName: "",
    paypalEmail: ""
  })

  // Photo state
  const [idPhotoUrl, setIdPhotoUrl] = useState("")
  const [showCamera, setShowCamera] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize form with existing profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        cedula: profile.cedula || "",
        payoutMethod: profile.payoutMethod || "banco_nicaragua",
        bankId: profile.bankId || "Banco LAFISE BANCENTRO",
        bankAccountNumber: profile.bankAccountNumber || "",
        bankAccountHolderName: profile.bankAccountHolderName || "",
        paypalEmail: profile.paypalEmail || ""
      })
      if (profile.idPhotoUrl) {
        setIdPhotoUrl(profile.idPhotoUrl)
      }
    }
  }, [profile])


  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 480 } }
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
        }
      }
      setShowCamera(true)
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Cámara no disponible",
        description: "Asegúrate de otorgar permisos de cámara en tu navegador."
      })
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7)
        setIdPhotoUrl(dataUrl)
        stopCamera()
        toast({
          title: "Fotografía Capturada",
          description: "La foto de tu identificación se cargó temporalmente. Guarda los cambios para guardarla permanentemente."
        })
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setIdPhotoUrl(ev.target.result as string)
          toast({
            title: "Archivo Cargado",
            description: "Imagen de identificación cargada temporalmente."
          })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const compressImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.src = dataUrl
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const MAX_SIZE = 600
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width
            width = MAX_SIZE
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height
            height = MAX_SIZE
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL("image/jpeg", 0.6))
        } else {
          resolve(dataUrl)
        }
      }
      img.onerror = () => resolve(dataUrl)
    })
  }

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !db) return

    if (!idPhotoUrl) {
      toast({
        variant: "destructive",
        title: "Foto de Documento Requerida",
        description: "Por seguridad de la plataforma, debes tomar o subir una foto de tu documento de identidad para verificar que eres la persona titular."
      })
      return
    }

    setLoading(true)

    try {
      let finalPhotoUrl = idPhotoUrl
      if (idPhotoUrl && idPhotoUrl.startsWith("data:image")) {
        finalPhotoUrl = await compressImage(idPhotoUrl)
      }

      const affRef = doc(db, "affiliates", user.uid)
      updateDocumentNonBlocking(affRef, {
        ...formData,
        idPhotoUrl: finalPhotoUrl,
        hasSubmittedVerification: true,
        verificationSubmittedAt: new Date().toISOString()
      })

      toast({
        title: "Datos Enviados ✓",
        description: "Tu información y documento han sido actualizados y están bajo revisión manual."
      })
    } catch (error) {
      console.error("Error submitting verification:", error)
      toast({
        variant: "destructive",
        title: "Fallo en envío",
        description: "No se pudieron guardar los datos de verificación."
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300 pb-12">
      {/* Pending status banner */}
      <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
          <div className="h-14 w-14 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <Clock className="h-7 w-7 animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="font-black text-amber-500 uppercase text-xs tracking-widest">Verificación de Cuenta Requerida</p>
            <p className="text-sm text-slate-300 font-medium">
              {profile?.hasSubmittedVerification 
                ? "Tus datos ya están en manos del equipo administrativo. Estamos verificando tu información para darte de alta." 
                : "Para comenzar a vender, formarte y retirar comisiones, es necesario que completes tu información personal y bancaria."}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-500/20 px-4 py-2 rounded-full border border-amber-500/30">
            {profile?.hasSubmittedVerification ? "EN REVISIÓN MANUAL" : "FALTA COMPLETAR DATOS"}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmitVerification} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Section 1: Datos Personales y de Identificación */}
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-[#11111c] ring-1 ring-white/5 overflow-hidden">
            <CardHeader className="bg-white/[0.02] border-b border-white/5 p-8">
              <CardTitle className="text-xl flex items-center gap-3 text-white">
                <User className="h-5 w-5 text-primary" /> Información Personal
              </CardTitle>
              <CardDescription className="text-slate-500">Completa tus datos de identidad nacional.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre</Label>
                  <Input 
                    value={formData.firstName} 
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                    required
                    className="h-10 bg-white/5 border-white/10 text-white focus:border-primary focus:ring-primary/25 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Apellido</Label>
                  <Input 
                    value={formData.lastName} 
                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                    required
                    className="h-10 bg-white/5 border-white/10 text-white focus:border-primary focus:ring-primary/25 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Número de Cédula de Identidad</Label>
                <Input 
                  value={formData.cedula} 
                  onChange={e => setFormData({...formData, cedula: e.target.value})}
                  required
                  placeholder="Ej: 001-201090-0005M"
                  className="h-10 bg-white/5 border-white/10 text-white focus:border-primary focus:ring-primary/25 rounded-xl text-sm font-bold uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp Vinculado</Label>
                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl text-slate-400 text-sm font-bold">
                  <Phone className="h-4 w-4 text-primary" /> {profile?.whatsappNumber ? `+${profile.whatsappNumber}` : "No registrado"}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email de Registro (Google)</Label>
                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl text-slate-400 text-sm font-bold truncate">
                  <Mail className="h-4 w-4 text-primary" /> {profile?.email || user?.email}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Datos Bancarios o PayPal de Retiro */}
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-[#11111c] ring-1 ring-white/5 overflow-hidden">
            <CardHeader className="bg-white/[0.02] border-b border-white/5 p-8">
              <CardTitle className="text-xl flex items-center gap-3 text-white">
                <Landmark className="h-5 w-5 text-primary" /> Método de Retiro de Comisiones
              </CardTitle>
              <CardDescription className="text-slate-500">Selecciona si prefieres retiro a cuenta de Nicaragua o PayPal.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Método Preferido</Label>
                <Select 
                  value={formData.payoutMethod || "banco_nicaragua"} 
                  onValueChange={v => setFormData({...formData, payoutMethod: v})}
                >
                  <SelectTrigger className="h-10 bg-white/5 border-white/10 text-white focus:border-primary focus:ring-primary/25 rounded-xl text-sm font-bold">
                    <SelectValue placeholder="Selecciona método de retiro" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#11111c] border-white/10 text-white">
                    <SelectItem value="banco_nicaragua" className="focus:bg-white/5 focus:text-primary cursor-pointer font-bold">🇳🇮 Solicitud a Banco de Nicaragua</SelectItem>
                    <SelectItem value="paypal" className="focus:bg-white/5 focus:text-primary cursor-pointer font-bold">💳 Retiro por PayPal (Correo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.payoutMethod === "paypal" ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Correo Electrónico de PayPal</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input 
                        type="email"
                        placeholder="ejemplo@paypal.com"
                        value={formData.paypalEmail} 
                        onChange={e => setFormData({...formData, paypalEmail: e.target.value})}
                        required
                        className="pl-10 h-10 bg-white/5 border-white/10 text-white focus:border-primary focus:ring-primary/25 rounded-xl text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre del Titular de PayPal</Label>
                    <Input 
                      placeholder="Nombre tal cual en la cuenta de PayPal"
                      value={formData.bankAccountHolderName} 
                      onChange={e => setFormData({...formData, bankAccountHolderName: e.target.value})}
                      required
                      className="h-10 bg-white/5 border-white/10 text-white focus:border-primary focus:ring-primary/25 rounded-xl text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Banco Receptor de Nicaragua</Label>
                    <Select 
                      value={formData.bankId} 
                      onValueChange={v => setFormData({...formData, bankId: v})}
                      required
                    >
                      <SelectTrigger className="h-10 bg-white/5 border-white/10 text-white focus:border-primary focus:ring-primary/25 rounded-xl text-sm font-bold">
                        <SelectValue placeholder="Selecciona un banco" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#11111c] border-white/10 text-white">
                        {NICA_BANKS.map(bank => (
                          <SelectItem key={bank} value={bank} className="focus:bg-white/5 focus:text-primary cursor-pointer">{bank}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Número de Cuenta Bancaria</Label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input 
                        placeholder="Ej: 1234567890"
                        value={formData.bankAccountNumber} 
                        onChange={e => setFormData({...formData, bankAccountNumber: e.target.value})}
                        required
                        className="pl-10 h-10 bg-white/5 border-white/10 text-white focus:border-primary focus:ring-primary/25 rounded-xl text-sm font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre Completo del Titular</Label>
                    <Input 
                      placeholder="Tal cual aparece en tu cuenta bancaria"
                      value={formData.bankAccountHolderName} 
                      onChange={e => setFormData({...formData, bankAccountHolderName: e.target.value})}
                      required
                      className="h-10 bg-white/5 border-white/10 text-white focus:border-primary focus:ring-primary/25 rounded-xl text-sm"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Section 3: Documento de Identificación */}
        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-[#11111c] ring-1 ring-white/5 overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 p-8">
            <CardTitle className="text-xl flex items-center gap-3 text-white">
              <Camera className="h-5 w-5 text-primary" /> Documento de Cédula de Identidad (Foto / Selfie con Cédula)
            </CardTitle>
            <CardDescription className="text-slate-500">Carga una foto nítida de tu cédula de identidad para verificar tu firma y titularidad de los retiros.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  Para fines de cumplimiento normativo y antilavado de dinero, es obligatorio adjuntar una fotografía clara de tu cédula de identidad nítida, o una autofoto (selfie) sosteniendo tu cédula junto a tu rostro.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    type="button" 
                    onClick={startCamera} 
                    variant="outline" 
                    className="h-12 rounded-xl border-white/10 text-white hover:bg-white/5 flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2 text-primary" /> Tomar Foto con Cámara
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    variant="outline" 
                    className="h-12 rounded-xl border-white/10 text-white hover:bg-white/5 flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2 text-primary" /> Subir Imagen
                  </Button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>

                {showCamera && (
                  <div className="space-y-4 p-4 bg-black rounded-[1.5rem] border border-white/10 animate-in zoom-in-95">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="grid grid-cols-2 gap-4">
                      <Button type="button" variant="outline" onClick={stopCamera} className="h-10 text-xs rounded-lg border-white/10 text-white">Cerrar</Button>
                      <Button type="button" onClick={capturePhoto} className="h-10 text-xs bg-primary text-slate-950 font-bold rounded-lg hover:bg-primary/95">CAPTURAR</Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/10 rounded-[2rem] aspect-video bg-black/20">
                {idPhotoUrl ? (
                  <div className="relative w-full h-full rounded-[1.5rem] overflow-hidden group">
                    <img src={idPhotoUrl} className="w-full h-full object-cover" alt="Documento" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-[1.5rem]">
                      <Button type="button" variant="ghost" onClick={() => setIdPhotoUrl("")} className="text-red-500 hover:text-red-400 text-xs uppercase font-bold">Eliminar Documento</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 text-slate-500">
                    <ShieldCheck className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sin Documento Cargado</p>
                    <p className="text-xs text-slate-600 mt-2">Usa la cámara o sube un archivo desde tu dispositivo</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit bar */}
        <div className="p-8 bg-blue-950/20 border border-blue-500/20 rounded-[2.5rem] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="h-12 w-12 bg-blue-500 text-slate-950 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-0.5">
              <p className="font-black text-blue-400 uppercase text-xs tracking-wider">Cifrado de Alta Seguridad</p>
              <p className="text-[11px] text-slate-400 font-medium">Tus datos personales y de cobros están protegidos bajo protocolos de encriptación.</p>
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={loading || !idPhotoUrl}
            className="w-full sm:w-auto h-14 px-10 bg-primary hover:bg-primary/90 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-3xl transition-all"
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : profile?.hasSubmittedVerification ? (
              "ACTUALIZAR Y ENVIAR"
            ) : (
              "ENVIAR PARA VERIFICACIÓN"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
