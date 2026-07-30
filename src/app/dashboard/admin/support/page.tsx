"use client"

import { useState, useEffect, useRef } from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useUser, useFirestore, useMemoFirebase, useCollection } from "@/firebase"
import { collection, query, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore"
import { 
  MessageCircle, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  User, 
  ShieldCheck, 
  Filter, 
  Sparkles, 
  LifeBuoy, 
  Search,
  Activity,
  ArrowUpRight
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function AdminSupportDashboard() {
  const { user, isUserLoading } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Filtering states
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "Resolved">("All")
  const [categoryFilter, setCategoryFilter] = useState<"All" | "Afiliados" | "Cursos" | "Pagos" | "Técnico">("All")
  const [searchQuery, setSearchQuery] = useState("")

  // Active Ticket Explorer
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [generatingAiSuggestion, setGeneratingAiSuggestion] = useState(false)

  // Real-time all tickets collection
  const allTicketsQuery = useMemoFirebase(() => {
    if (!db || isUserLoading || !user) return null
    return query(collection(db, "tickets"), orderBy("createdAt", "desc"))
  }, [db, user, isUserLoading])

  const { data: tickets, isLoading: ticketsLoading } = useCollection(allTicketsQuery)

  const selectedTicket = (tickets || []).find(t => t.id === selectedTicketId)

  // Auto scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [selectedTicket?.messages])

  // Filtered tickets list
  const filteredTickets = (tickets || []).filter(t => {
    const matchesStatus = statusFilter === "All" || t.status === statusFilter
    const matchesCategory = categoryFilter === "All" || t.category === categoryFilter
    const matchesSearch = !searchQuery.trim() || 
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesCategory && matchesSearch
  })

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
          senderName: "Soporte Sync.Pro",
          text: textToSubmit,
          timestamp: new Date().toISOString(),
          isAdmin: true
        }),
        status: "Open", // maintain Open status or update on admin action
        updatedAt: new Date().toISOString()
      })

      toast({ title: "Respuesta Registrada", description: "Tu mensaje de administrador ha sido guardado." })
    } catch (err) {
      console.error(err)
      toast({ title: "Error", description: "No se pudo registrar la respuesta.", variant: "destructive" })
    }
  }

  // Generate AI Suggestion (Gemini Smart Reply Co-Pilot)
  const handleGenerateAiSuggestion = async () => {
    if (!selectedTicket || generatingAiSuggestion) return

    setGeneratingAiSuggestion(true)
    const lastUserMessage = [...(selectedTicket.messages || [])]
      .reverse()
      .find((m: any) => !m.isAdmin)?.text || ""

    try {
      const messagesPayload = [
        {
          role: "user",
          content: `Tengo un ticket de soporte. Categoría: ${selectedTicket.category}. Asunto: ${selectedTicket.subject}. El usuario describe su problema así: "${lastUserMessage}". Escribe una sugerencia de respuesta muy profesional, empática, y técnica para resolver su duda paso a paso.`
        }
      ]

      const res = await fetch("/api/support/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesPayload })
      })

      const data = await res.json()
      if (res.ok && data.text) {
        setReplyText(data.text)
        toast({ title: "Sugerencia Generada", description: "La respuesta generada por IA ha sido cargada en tu editor." })
      } else {
        toast({ title: "Error de IA", description: "No se pudo generar la sugerencia.", variant: "destructive" })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setGeneratingAiSuggestion(false)
    }
  }

  // Resolve Ticket
  const handleCloseTicket = async (ticketId: string) => {
    if (!db) return
    try {
      const ticketRef = doc(db, "tickets", ticketId)
      await updateDoc(ticketRef, {
        status: "Resolved",
        updatedAt: new Date().toISOString()
      })
      toast({ title: "Ticket Resuelto", description: "El ticket ha sido marcado como resuelto de forma permanente." })
    } catch (err) {
      console.error(err)
    }
  }

  const openTicketsCount = (tickets || []).filter(t => t.status === "Open").length
  const resolvedTicketsCount = (tickets || []).filter(t => t.status === "Resolved").length

  return (
    <DashboardShell role="admin">
      <div className="space-y-12">
        {/* COMMAND MASTER HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 bg-white p-12 rounded-[4rem] shadow-sm border border-slate-50">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-2xl">
                <ShieldCheck className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Operations & Tickets Hub</span>
            </div>
            <h1 className="text-5xl font-headline font-black text-slate-950 tracking-tighter leading-none uppercase italic">
              Soporte <span className="text-orange-500">Global</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium">Gestiona consultas, comisiones de afiliados, y dudas de alumnos.</p>
          </div>

          <div className="flex gap-4">
            <Badge variant="outline" className="h-12 px-6 rounded-2xl bg-amber-50 border-amber-100 font-black text-[10px] uppercase tracking-widest text-amber-700 flex items-center gap-2">
              <Clock className="h-4 w-4 animate-spin text-amber-500" /> Pendientes: {openTicketsCount}
            </Badge>
            <Badge variant="outline" className="h-12 px-6 rounded-2xl bg-green-50 border-green-100 font-black text-[10px] uppercase tracking-widest text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" /> Resueltos: {resolvedTicketsCount}
            </Badge>
          </div>
        </div>

        {/* TICKET CENTER INTERACTION SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LEFT FILTER & TICKETS AREA */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="premium-card">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-lg font-headline font-black uppercase text-slate-950 italic">Filtros de Búsqueda</h3>
                  <Filter className="h-5 w-5 text-slate-400" />
                </div>

                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <Input 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por asunto, alumno o email..."
                      className="pl-11 h-12 bg-slate-50 border-slate-100 rounded-xl text-xs font-semibold placeholder:text-slate-400 focus-visible:ring-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Status Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</label>
                      <select
                        value={statusFilter}
                        onChange={(e: any) => setStatusFilter(e.target.value)}
                        className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-semibold text-slate-700 focus:outline-none focus:border-orange-500"
                      >
                        <option value="All">Todos</option>
                        <option value="Open">Pendiente</option>
                        <option value="Resolved">Resuelto</option>
                      </select>
                    </div>

                    {/* Category Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                      <select
                        value={categoryFilter}
                        onChange={(e: any) => setCategoryFilter(e.target.value)}
                        className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-semibold text-slate-700 focus:outline-none focus:border-orange-500"
                      >
                        <option value="All">Todas</option>
                        <option value="Afiliados">Afiliados</option>
                        <option value="Cursos">Cursos</option>
                        <option value="Pagos">Pagos</option>
                        <option value="Técnico">Técnico</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardContent className="p-6">
                {ticketsLoading ? (
                  <div className="h-60 flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando tickets...</div>
                ) : filteredTickets.length === 0 ? (
                  <div className="h-60 flex flex-col items-center justify-center text-slate-400 gap-3 opacity-50">
                    <LifeBuoy className="h-10 w-10 text-slate-300" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Ningún ticket coincide</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[450px] pr-2">
                    <div className="space-y-3">
                      {filteredTickets.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTicketId(t.id)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
                            selectedTicketId === t.id 
                              ? "bg-orange-50 border-orange-200 text-slate-900" 
                              : "bg-white border-slate-100 hover:border-slate-200 text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <Badge variant="outline" className="bg-slate-50 text-slate-400 font-bold text-[8px] uppercase px-2 py-0.5 border-slate-100">{t.category}</Badge>
                            <Badge className={
                              t.status === "Open" 
                                ? "bg-amber-100 text-amber-700 text-[8px] font-bold uppercase border-none" 
                                : "bg-green-100 text-green-700 text-[8px] font-bold uppercase border-none"
                            }>
                              {t.status === "Open" ? "PENDIENTE" : "RESUELTO"}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase truncate leading-none mb-1 text-slate-900">{t.subject}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{t.userName} ({t.userEmail})</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT TICKET CHAT CONVERSATION */}
          <div className="lg:col-span-7">
            {selectedTicket ? (
              <Card className="premium-card overflow-hidden flex flex-col h-[680px]">
                <div className="border-b bg-slate-50/50 p-8 flex items-center justify-between">
                  <div>
                    <Badge className="bg-orange-100 text-orange-700 font-black text-[8px] uppercase px-2.5 py-1 mb-2 rounded-full border-none">{selectedTicket.category}</Badge>
                    <h3 className="text-lg font-headline font-black text-slate-950 uppercase tracking-tight">{selectedTicket.subject}</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">De: {selectedTicket.userName} ({selectedTicket.userEmail})</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedTicket.status === "Open" && (
                      <Button 
                        onClick={handleGenerateAiSuggestion}
                        disabled={generatingAiSuggestion}
                        variant="outline" 
                        className="h-10 px-4 border-purple-200 text-purple-700 hover:bg-purple-50 font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-1.5 shadow-sm"
                      >
                        <Sparkles className="h-4 w-4 animate-bounce" /> {generatingAiSuggestion ? "Pensando..." : "Co-Pilot IA"}
                      </Button>
                    )}
                    {selectedTicket.status === "Open" && (
                      <Button 
                        onClick={() => handleCloseTicket(selectedTicket.id)}
                        size="sm" 
                        className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm"
                      >
                        Cerrar Ticket
                      </Button>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1 p-8 space-y-6 bg-slate-50/20">
                  <div className="space-y-6">
                    {(selectedTicket.messages || []).map((m: any, idx: number) => (
                      <div 
                        key={idx} 
                        className={`flex gap-3 max-w-[85%] ${
                          m.isAdmin ? "ml-auto flex-row-reverse" : "mr-auto"
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          m.isAdmin 
                            ? "bg-orange-500 text-white border-orange-600 shadow-sm" 
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {m.isAdmin ? <ShieldCheck className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </div>
                        <div className={`p-4 rounded-2xl text-xs leading-relaxed font-semibold shadow-sm border ${
                          m.isAdmin
                            ? "bg-slate-950 text-white border-slate-950 rounded-tr-none"
                            : "bg-white text-slate-700 border-slate-100 rounded-tl-none"
                        }`}>
                          <p className="whitespace-pre-wrap">{m.text}</p>
                          <p className={`text-[8px] mt-2 font-black uppercase tracking-wider text-right ${
                            m.isAdmin ? "text-orange-400" : "text-slate-400"
                          }`}>
                            {m.senderName} • {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                {selectedTicket.status === "Open" ? (
                  <form onSubmit={handleReplyTicket} className="p-6 border-t bg-white flex gap-3">
                    <Input 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={generatingAiSuggestion ? "Sincronizando sugerencia de IA..." : "Escribe tu respuesta técnica oficial de administración..."}
                      className="flex-1 h-12 bg-slate-50 border-slate-100 text-slate-900 rounded-xl placeholder:text-slate-400 text-xs font-semibold focus-visible:ring-orange-500"
                      disabled={generatingAiSuggestion}
                    />
                    <Button type="submit" disabled={!replyText.trim() || generatingAiSuggestion} className="h-12 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest px-6 rounded-xl shadow-lg shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                ) : (
                  <div className="p-6 border-t bg-green-50 text-center text-xs font-black uppercase text-green-700 tracking-widest">
                    Este ticket ha sido resuelto y cerrado.
                  </div>
                )}
              </Card>
            ) : (
              <Card className="h-full bg-slate-50/30 border-slate-200/50 rounded-3xl flex flex-col items-center justify-center text-slate-400 p-10 text-center border-2 border-dashed">
                <LifeBuoy className="h-12 w-12 text-slate-300 mb-4 animate-pulse" />
                <h4 className="text-sm font-headline font-black uppercase text-slate-900 tracking-wider">Selecciona un Ticket</h4>
                <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">Elige un ticket de soporte de la lista para ver el historial y responder con el Co-Pilot IA.</p>
              </Card>
            )}
          </div>

        </div>
      </div>
    </DashboardShell>
  )
}
