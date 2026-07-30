"use client"

import { useState, useEffect, useRef } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useUser, useFirestore, useMemoFirebase, useCollection } from "@/firebase"
import { collection, addDoc, query, where, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore"
import { 
  MessageCircle, 
  Send, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Bot, 
  User, 
  Sparkles, 
  HelpCircle,
  FileText,
  History,
  LifeBuoy
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AffiliateSupportPage() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Tabs: 'ai-chat', 'new-ticket', 'my-tickets'
  const [activeSection, setActiveSection] = useState<"ai-chat" | "new-ticket" | "my-tickets">("ai-chat")

  // AI Chat States
  const [aiInput, setAiInput] = useState("")
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([
    {
      role: "assistant",
      content: "¡Hola! Soy tu Asistente de Soporte de SixFigure / SyncConnect. Estoy aquí para responder tus dudas académicas, consultas de comisiones, uso de enlaces Cycling, o cualquier problema técnico de forma instantánea. ¿En qué puedo ayudarte hoy?"
    }
  ])
  const [aiLoading, setAiLoading] = useState(false)

  // New Ticket Form States
  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState("Afiliados")
  const [priority, setPriority] = useState("Media")
  const [description, setDescription] = useState("")
  const [submittingTicket, setSubmittingTicket] = useState(false)

  // Active Ticket Conversation Explorer
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")

  // Real-time user tickets collection
  const ticketsQuery = useMemoFirebase(() => {
    if (!db || !user) return null
    return query(
      collection(db, "tickets"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    )
  }, [db, user])

  const { data: tickets, isLoading: ticketsLoading } = useCollection(ticketsQuery)

  const selectedTicket = (tickets || []).find(t => t.id === selectedTicketId)

  // Auto scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [aiMessages, selectedTicket?.messages])

  // AI Chat Handler
  const handleAiSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!aiInput.trim() || aiLoading) return

    const userMsg = aiInput.trim()
    setAiInput("")
    const updatedMsgs = [...aiMessages, { role: "user" as const, content: userMsg }]
    setAiMessages(updatedMsgs)
    setAiLoading(true)

    try {
      const res = await fetch("/api/support/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMsgs })
      })
      const data = await res.json()
      if (res.ok) {
        setAiMessages(prev => [...prev, { role: "assistant" as const, content: data.text }])
      } else {
        setAiMessages(prev => [...prev, { role: "assistant" as const, content: "Disculpa, he tenido una fluctuación en mis protocolos. Por favor, reintenta tu pregunta." }])
      }
    } catch (err) {
      console.error(err)
      setAiMessages(prev => [...prev, { role: "assistant" as const, content: "Disculpa, no puedo conectarme al servidor del modelo en este momento. Revisa tu conexión." }])
    } finally {
      setAiLoading(false)
    }
  }

  // Pre-configured questions
  const handleSuggestedQuestion = (question: string) => {
    setAiInput(question)
    setTimeout(() => {
      // Auto trigger send
      if (question.trim()) {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        // Triggering with value directly
        setAiMessages(prev => [...prev, { role: "user", content: question }])
        setAiLoading(true)
        fetch("/api/support/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [...aiMessages, { role: "user", content: question }] })
        })
        .then(res => res.json())
        .then(data => {
          setAiMessages(prev => [...prev, { role: "assistant", content: data.text }])
        })
        .catch(() => {
          setAiMessages(prev => [...prev, { role: "assistant", content: "Error de red al intentar responder." }])
        })
        .finally(() => {
          setAiLoading(false)
        })
      }
    }, 50)
    setAiInput("")
  }

  // Submit Ticket Handler
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !user) return
    if (!subject.trim() || !description.trim()) {
      toast({ title: "Faltan Campos", description: "Por favor, completa el asunto y la descripción.", variant: "destructive" })
      return
    }

    setSubmittingTicket(true)
    try {
      await addDoc(collection(db, "tickets"), {
        userId: user.uid,
        userName: user.displayName || user.email?.split("@")[0] || "Miembro Sync",
        userEmail: user.email || "",
        subject: subject.trim(),
        category,
        priority,
        status: "Open",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            senderId: user.uid,
            senderName: user.displayName || user.email?.split("@")[0] || "Miembro Sync",
            text: description.trim(),
            timestamp: new Date().toISOString(),
            isAdmin: false
          }
        ]
      })

      toast({ title: "Ticket Creado", description: "Tu ticket de soporte ha sido registrado con éxito." })
      setSubject("")
      setDescription("")
      setActiveSection("my-tickets")
    } catch (err: any) {
      console.error(err)
      toast({ title: "Error", description: "No se pudo crear el ticket. Intente nuevamente.", variant: "destructive" })
    } finally {
      setSubmittingTicket(false)
    }
  }

  // Reply to Ticket
  const handleReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !user || !selectedTicketId || !replyText.trim()) return

    const textToSubmit = replyText.trim()
    setReplyText("")

    try {
      const ticketRef = doc(db, "tickets", selectedTicketId)
      await updateDoc(ticketRef, {
        messages: arrayUnion({
          senderId: user.uid,
          senderName: user.displayName || user.email?.split("@")[0] || "Miembro Sync",
          text: textToSubmit,
          timestamp: new Date().toISOString(),
          isAdmin: false
        }),
        status: "Open", // reset to Open on user reply
        updatedAt: new Date().toISOString()
      })

      toast({ title: "Respuesta Enviada", description: "Tu mensaje ha sido agregado al ticket." })
    } catch (err) {
      console.error(err)
      toast({ title: "Error", description: "No se pudo enviar la respuesta.", variant: "destructive" })
    }
  }

  // Close Ticket
  const handleCloseTicket = async (ticketId: string) => {
    if (!db) return
    try {
      const ticketRef = doc(db, "tickets", ticketId)
      await updateDoc(ticketRef, {
        status: "Resolved",
        updatedAt: new Date().toISOString()
      })
      toast({ title: "Ticket Resuelto", description: "El ticket ha sido marcado como resuelto." })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <DashboardShell role="affiliate">
      <div className="space-y-10">
        {/* TOP TITLE HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white/5 p-8 md:p-10 rounded-[2rem] border border-white/5 shadow-2xl backdrop-blur-md">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-primary/20 text-primary rounded-xl flex items-center justify-center border border-primary/20">
                <LifeBuoy className="h-5 w-5 animate-spin" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Soporte Técnico & IA</span>
            </div>
            <h1 className="text-4xl font-headline font-black text-white tracking-tighter uppercase italic leading-none">
              Centro de <span className="text-primary">Atención</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium">Resuelve tus dudas al instante con IA o abre un ticket de soporte con nuestros ingenieros.</p>
          </div>
        </div>

        {/* CONTROLS BAR */}
        <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
          <Button 
            onClick={() => { setActiveSection("ai-chat"); setSelectedTicketId(null); }}
            variant="ghost"
            className={`h-12 px-6 font-black text-[10px] uppercase tracking-widest gap-2 rounded-xl transition-all ${
              activeSection === "ai-chat" ? "bg-white/10 text-primary" : "text-white/50 hover:text-white"
            }`}
          >
            <Bot className="h-4 w-4 text-primary" /> Soporte IA 24/7
          </Button>

          <Button 
            onClick={() => { setActiveSection("new-ticket"); setSelectedTicketId(null); }}
            variant="ghost"
            className={`h-12 px-6 font-black text-[10px] uppercase tracking-widest gap-2 rounded-xl transition-all ${
              activeSection === "new-ticket" ? "bg-white/10 text-primary" : "text-white/50 hover:text-white"
            }`}
          >
            <PlusCircle className="h-4 w-4 text-green-500" /> Crear Ticket
          </Button>

          <Button 
            onClick={() => { setActiveSection("my-tickets"); }}
            variant="ghost"
            className={`h-12 px-6 font-black text-[10px] uppercase tracking-widest gap-2 rounded-xl transition-all ${
              activeSection === "my-tickets" ? "bg-white/10 text-primary" : "text-white/50 hover:text-white"
            }`}
          >
            <History className="h-4 w-4 text-blue-400" /> Mis Tickets ({(tickets || []).length})
          </Button>
        </div>

        {/* ACTIVE SECTION RENDER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* AI CHATBOT TAB */}
          {activeSection === "ai-chat" && (
            <>
              {/* CHAT WINDOW */}
              <Card className="lg:col-span-8 bg-[#131921] border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[650px]">
                <CardHeader className="border-b border-white/5 bg-[#131921]/50 p-6 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20 animate-pulse">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        Sync.Bot <Badge className="bg-primary text-slate-950 font-black text-[8px] uppercase px-2 py-0.5 rounded-full">Activo</Badge>
                      </CardTitle>
                      <CardDescription className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Asistencia Virtual Automática</CardDescription>
                    </div>
                  </div>
                  <Sparkles className="h-5 w-5 text-primary" />
                </CardHeader>
                
                <ScrollArea className="flex-1 p-6 space-y-4">
                  <div className="space-y-4">
                    {aiMessages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex gap-3 max-w-[85%] ${
                          msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          msg.role === "user" 
                            ? "bg-white/5 text-white border-white/10" 
                            : "bg-primary/10 text-primary border-primary/20"
                        }`}>
                          {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <div className={`p-4 rounded-2xl text-xs leading-relaxed font-semibold shadow-inner ${
                          msg.role === "user"
                            ? "bg-primary text-slate-950 rounded-tr-none"
                            : "bg-white/5 text-slate-200 border border-white/5 rounded-tl-none"
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex gap-3 mr-auto max-w-[85%]">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 animate-spin" />
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 text-slate-400 border border-white/5 rounded-tl-none text-xs flex items-center gap-2 font-bold tracking-widest uppercase">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce delay-100" />
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce delay-200" />
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce delay-300" />
                          Sincronizando respuesta...
                        </div>
                      </div>
                    )}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                <form onSubmit={handleAiSend} className="p-4 border-t border-white/5 bg-[#131921]/50 flex gap-2">
                  <Input 
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Escribe tu consulta sobre afiliados, comisiones o soporte..."
                    className="flex-1 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-slate-500 text-xs focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-primary"
                    disabled={aiLoading}
                  />
                  <Button type="submit" disabled={aiLoading || !aiInput.trim()} className="bg-primary text-slate-950 hover:bg-primary/90 font-black text-xs uppercase tracking-widest px-6 rounded-xl shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </Card>

              {/* RECOMMENDED TOPICS */}
              <Card className="lg:col-span-4 bg-[#131921] border-white/5 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary" /> Temas Frecuentes
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Preguntas rápidas sugeridas</p>
                </div>
                <div className="space-y-2.5">
                  {[
                    "¿Cómo retiro mis comisiones bancarias?",
                    "¿Dónde encuentro mis Hotlinks promocionales?",
                    "Tengo problemas para reproducir un video",
                    "¿Cómo genero mi certificado de finalización?",
                    "¿Cómo funciona el sistema de afiliados?"
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestedQuestion(q)}
                      disabled={aiLoading}
                      className="w-full text-left p-3.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/20 text-slate-300 hover:text-white rounded-2xl transition-all text-xs font-semibold flex items-start gap-2.5 group"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* CREATE SUPPORT TICKET TAB */}
          {activeSection === "new-ticket" && (
            <Card className="lg:col-span-8 lg:col-start-3 bg-[#131921] border-white/5 rounded-3xl overflow-hidden shadow-2xl p-8 md:p-10">
              <div className="space-y-2 mb-8 border-b border-white/5 pb-6">
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-green-500" /> Abrir Nuevo Ticket
                </h2>
                <p className="text-xs text-slate-400 font-medium">Llena el siguiente formulario y un agente técnico te contactará a la brevedad.</p>
              </div>

              <form onSubmit={handleSubmitTicket} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asunto del Ticket</label>
                  <Input 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ej. Problema con la carga de facturación"
                    className="bg-white/5 border-white/10 text-white rounded-xl placeholder:text-slate-500 text-xs focus-visible:ring-primary focus-visible:ring-offset-0"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-semibold text-white focus:outline-none focus:border-primary"
                    >
                      <option value="Afiliados" className="bg-[#131921]">Afiliados & Enlaces</option>
                      <option value="Cursos" className="bg-[#131921]">Contenido & Academia</option>
                      <option value="Pagos" className="bg-[#131921]">Facturación & Retiros</option>
                      <option value="Técnico" className="bg-[#131921]">Problema de Plataforma</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridad</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-semibold text-white focus:outline-none focus:border-primary"
                    >
                      <option value="Baja" className="bg-[#131921]">Baja (Trámite ordinario)</option>
                      <option value="Media" className="bg-[#131921]">Media (Urgencia regular)</option>
                      <option value="Alta" className="bg-[#131921]">Alta (Bloqueante o Crítico)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalle y Descripción</label>
                  <Textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe minuciosamente tu problema para darte la solución adecuada..."
                    className="bg-white/5 border-white/10 text-white rounded-xl placeholder:text-slate-500 text-xs min-h-[150px] focus-visible:ring-primary focus-visible:ring-offset-0"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={submittingTicket}
                  className="w-full h-12 bg-primary text-slate-950 hover:bg-primary/90 font-black text-[10px] uppercase tracking-widest rounded-xl"
                >
                  {submittingTicket ? "Registrando Ticket..." : "Enviar Ticket a Soporte"}
                </Button>
              </form>
            </Card>
          )}

          {/* MIS TICKETS HISTORY TAB */}
          {activeSection === "my-tickets" && (
            <>
              {/* TICKETS LIST */}
              <div className="lg:col-span-5 space-y-4">
                <Card className="bg-[#131921] border-white/5 rounded-3xl p-6">
                  <div className="mb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-400" /> Historial de Tickets
                    </h3>
                  </div>

                  {ticketsLoading ? (
                    <div className="h-40 flex items-center justify-center text-xs font-bold text-slate-500 uppercase tracking-widest">Cargando historial...</div>
                  ) : !tickets || tickets.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-600 gap-3">
                      <LifeBuoy className="h-10 w-10 opacity-30" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No tienes tickets abiertos</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[450px] pr-2">
                      <div className="space-y-3">
                        {tickets.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTicketId(t.id)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
                              selectedTicketId === t.id 
                                ? "bg-primary/10 border-primary/40 text-white" 
                                : "bg-white/5 border-white/5 hover:border-white/10 text-slate-300 hover:text-white"
                            }`}
                          >
                            <div className="flex justify-between items-start w-full">
                              <Badge className="bg-white/5 text-slate-300 font-bold text-[8px] uppercase px-2 py-0.5 border border-white/5">{t.category}</Badge>
                              <Badge className={
                                t.status === "Open" 
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/25 text-[8px] font-bold uppercase" 
                                  : "bg-green-500/10 text-green-400 border border-green-500/25 text-[8px] font-bold uppercase"
                              }>
                                {t.status === "Open" ? "PENDIENTE" : "RESUELTO"}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase truncate leading-none mb-1">{t.subject}</p>
                              <p className="text-[9px] text-slate-500 font-medium">Creado el {new Date(t.createdAt).toLocaleDateString()}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </Card>
              </div>

              {/* TICKET CONVERSATION */}
              <div className="lg:col-span-7">
                {selectedTicket ? (
                  <Card className="bg-[#131921] border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[550px]">
                    <div className="border-b border-white/5 bg-[#131921]/50 p-6 flex items-center justify-between">
                      <div>
                        <Badge className="bg-primary/10 text-primary border border-primary/20 text-[8px] font-black uppercase px-2.5 py-1 mb-2 rounded-full">{selectedTicket.category}</Badge>
                        <h3 className="text-sm font-black text-white uppercase tracking-tight">{selectedTicket.subject}</h3>
                      </div>
                      {selectedTicket.status === "Open" && (
                        <Button 
                          onClick={() => handleCloseTicket(selectedTicket.id)}
                          size="sm" 
                          variant="outline" 
                          className="border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl"
                        >
                          Marcar Resuelto
                        </Button>
                      )}
                    </div>

                    <ScrollArea className="flex-1 p-6 space-y-4">
                      <div className="space-y-4">
                        {(selectedTicket.messages || []).map((m: any, idx: number) => (
                          <div 
                            key={idx} 
                            className={`flex gap-3 max-w-[85%] ${
                              !m.isAdmin ? "ml-auto flex-row-reverse" : "mr-auto"
                            }`}
                          >
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${
                              !m.isAdmin 
                                ? "bg-white/5 text-white border-white/10" 
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}>
                              {!m.isAdmin ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-blue-400" />}
                            </div>
                            <div className={`p-4 rounded-2xl text-xs leading-relaxed font-semibold shadow-inner ${
                              !m.isAdmin
                                ? "bg-primary text-slate-950 rounded-tr-none"
                                : "bg-white/5 text-slate-200 border border-white/5 rounded-tl-none"
                            }`}>
                              <p className="whitespace-pre-wrap">{m.text}</p>
                              <p className={`text-[8px] mt-2 font-bold uppercase tracking-wider text-right ${
                                !m.isAdmin ? "text-slate-800" : "text-slate-500"
                              }`}>
                                {m.senderName} • {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {selectedTicket.status === "Open" ? (
                      <form onSubmit={handleReplyTicket} className="p-4 border-t border-white/5 bg-[#131921]/50 flex gap-2">
                        <Input 
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Escribe tu respuesta para el administrador..."
                          className="flex-1 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-slate-500 text-xs focus-visible:ring-primary focus-visible:ring-offset-0"
                        />
                        <Button type="submit" disabled={!replyText.trim()} className="bg-primary text-slate-950 hover:bg-primary/90 font-black text-xs uppercase tracking-widest px-6 rounded-xl">
                          Responder
                        </Button>
                      </form>
                    ) : (
                      <div className="p-6 border-t border-white/5 bg-green-500/5 text-center text-xs font-black uppercase text-green-400 tracking-widest">
                        Este ticket ha sido resuelto y cerrado.
                      </div>
                    )}
                  </Card>
                ) : (
                  <Card className="h-full bg-[#131921] border-white/5 rounded-3xl flex flex-col items-center justify-center text-slate-600 p-10 text-center border border-dashed">
                    <LifeBuoy className="h-12 w-12 opacity-35 mb-4 animate-pulse" />
                    <h4 className="text-xs font-black uppercase text-white/50 tracking-wider">Selecciona un Ticket</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest max-w-xs mt-1">Elige un ticket del historial de la izquierda para ver las respuestas y conversar con soporte.</p>
                  </Card>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </DashboardShell>
  )
}
