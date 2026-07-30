"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { MessageCircle, X, Settings, Send, Bot, User, Sparkles, PhoneCall, Check, ExternalLink, ChevronRight, RefreshCw, HelpCircle } from "lucide-react"
import { useFirestore } from "@/firebase"
import { doc, onSnapshot, setDoc } from "firebase/firestore"

interface Message {
  id: string
  role: "assistant" | "user"
  content: string
  timestamp: string
  showWhatsapp?: boolean
  showWhatsappButton?: boolean
}

export function FloatingContact() {
  const db = useFirestore()
  const [isOpen, setIsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Configuración de Soporte
  const [supportPhone, setSupportPhone] = useState("50588062712")
  const [botName, setBotName] = useState("SyncBot IA")
  const [welcomeMessage, setWelcomeMessage] = useState(
    "¡Hola! 👋 Soy SyncBot, tu asistente inteligente de SyncConnect. Puedo resolver tus dudas sobre la creación de páginas web, productos, comisiones y retiros al instante. ¿En qué puedo ayudarte hoy?"
  )
  const [humanWhatsappText, setHumanWhatsappText] = useState(
    "Hola, vengo de la plataforma SyncConnect y necesito atención personalizada de un agente de soporte humano."
  )

  // Guardado local
  const [savingSettings, setSavingSettings] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Chat State
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [loadingAi, setLoadingAi] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Cargar configuración de soporte desde Firestore / localStorage
  useEffect(() => {
    // Intento de lectura desde localStorage
    const cachedPhone = localStorage.getItem("sync_support_phone")
    const cachedBotName = localStorage.getItem("sync_bot_name")
    if (cachedPhone) setSupportPhone(cachedPhone)
    if (cachedBotName) setBotName(cachedBotName)

    if (!db) return
    const settingsRef = doc(db, "site_config", "settings")
    const unsubscribe = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        const phone = data.supportPhone || data.whatsappNumber || "50588062712"
        const name = data.supportBotName || "SyncBot IA"
        const welcome = data.supportBotWelcome || welcomeMessage
        const waText = data.supportHumanText || humanWhatsappText

        setSupportPhone(phone)
        setBotName(name)
        setWelcomeMessage(welcome)
        setHumanWhatsappText(waText)

        localStorage.setItem("sync_support_phone", phone)
        localStorage.setItem("sync_bot_name", name)
      }
    }, (err) => {
      console.warn("No se pudo escuchar configuración de soporte en tiempo real:", err)
    })

    return () => unsubscribe()
  }, [db])

  // Inicializar conversación cuando se abre por primera vez
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "msg-welcome",
          role: "assistant",
          content: welcomeMessage,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    }
  }, [isOpen, welcomeMessage])

  // Scroll automático al último mensaje
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen, loadingAi])

  // Guardar configuración de soporte
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    const cleanPhone = supportPhone.replace(/[^0-9]/g, "")

    try {
      localStorage.setItem("sync_support_phone", cleanPhone)
      localStorage.setItem("sync_bot_name", botName)

      if (db) {
        await setDoc(doc(db, "site_config", "settings"), {
          supportPhone: cleanPhone,
          whatsappNumber: cleanPhone,
          supportBotName: botName,
          supportBotWelcome: welcomeMessage,
          supportHumanText: humanWhatsappText,
          updatedAt: new Date().toISOString()
        }, { merge: true })
      }

      setSavedSuccess(true)
      setTimeout(() => {
        setSavedSuccess(false)
        setIsSettingsOpen(false)
      }, 1500)
    } catch (err) {
      console.error("Error al guardar soporte:", err)
      setIsSettingsOpen(false)
    } finally {
      setSavingSettings(false)
    }
  }

  // Respuestas predeterminadas inteligentes de fallback
  const getSmartBotReply = (userQuery: string): { reply: string; showWhatsapp: boolean } => {
    const query = userQuery.toLowerCase()

    if (query.includes("humano") || query.includes("agente") || query.includes("persona") || query.includes("whatsapp") || query.includes("contacto directo") || query.includes("soporte tecnico")) {
      return {
        reply: "Comprendo que necesitas atención personalizada. He preparado el enlace directo para que un agente de nuestro equipo humano te atienda en WhatsApp.",
        showWhatsapp: true
      }
    }

    if (query.includes("crear pagina") || query.includes("landing") || query.includes("creador") || query.includes("builder") || query.includes("sitio")) {
      return {
        reply: "Para crear tu página web con IA:\n1. Ve a 'Creador Páginas' en tu panel de afiliado.\n2. Ingresa a la pestaña 'Creador con IA'.\n3. Selecciona el producto del catálogo (o escribe su nombre).\n4. Define tu subdominio deseado.\n5. Haz clic en 'Generar Página Web' y Gemini la creará automáticamente en segundos.",
        showWhatsapp: false
      }
    }

    if (query.includes("producto") || query.includes("catalogo") || query.includes("seleccionar")) {
      return {
        reply: "En el Creador de Páginas ahora puedes desplegar el selector 'Producto del Catálogo'. Al elegir un producto, la IA auto-completará su nombre, descripción, precio y tu enlace de afiliado único automáticamente.",
        showWhatsapp: false
      }
    }

    if (query.includes("comision") || query.includes("retiro") || query.includes("pago") || query.includes("dinero") || query.includes("banco")) {
      return {
        reply: "Las comisiones se acreditan instantáneamente en tu billetera SyncConnect tras cada venta realizada con tu enlace de afiliado. Puedes solicitar retiros desde el módulo 'Liquidaciones' a tu cuenta bancaria local.",
        showWhatsapp: false
      }
    }

    if (query.includes("curso") || query.includes("academia") || query.includes("formacion")) {
      return {
        reply: "En la sección 'Academia / Formación' encontrarás todas las clases paso a paso sobre estrategias de tráfico, ventas con TikTok/Facebook Ads y optimización de embudos de venta.",
        showWhatsapp: false
      }
    }

    return {
      reply: `He recibido tu consulta. Como soy tu asistente de soporte virtual, puedo guiarte con información sobre el Creador de Páginas, selección de productos, comisiones y configuración. Si requieres revisión directa de un agente, haz clic abajo para contactar por WhatsApp.`,
      showWhatsapp: true
    }
  }

  // Enviar mensaje al Chat
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim()
    if (!text || loadingAi) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInputMessage("")
    setLoadingAi(true)

    // Evaluar si es solicitud explícita de agente humano
    const isHumanRequest = text.toLowerCase().includes("humano") || text.toLowerCase().includes("agente") || text.toLowerCase().includes("whatsapp")

    try {
      // Intentar llamar a la API de IA
      const res = await fetch("/api/support/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.text) {
          setMessages(prev => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: data.text,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              showWhatsapp: isHumanRequest || data.text.toLowerCase().includes("whatsapp") || data.text.toLowerCase().includes("humano")
            }
          ])
          setLoadingAi(false)
          return
        }
      }
    } catch (err) {
      console.warn("Falling back to local smart reply:", err)
    }

    // Fallback inteligente local
    const smart = getSmartBotReply(text)
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: smart.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          showWhatsapp: smart.showWhatsapp || isHumanRequest
        }
      ])
      setLoadingAi(false)
    }, 600)
  }

  // URL directa de WhatsApp para humano
  const getWhatsappUrl = () => {
    const cleanNumber = supportPhone.replace(/[^0-9]/g, "")
    const encoded = encodeURIComponent(humanWhatsappText)
    return `https://wa.me/${cleanNumber}?text=${encoded}`
  }

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end font-sans">
      
      {/* CARD PRINCIPAL DE CHAT / SOPORTE */}
      {isOpen && (
        <div className="w-[360px] md:w-[390px] h-[520px] bg-slate-950/95 border border-slate-800 rounded-3xl shadow-2xl text-white flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 backdrop-blur-2xl mb-3 relative">
          
          {/* HEADER DEL BOT */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                  <Bot className="h-5 w-5" />
                </div>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">{botName}</h4>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold border border-emerald-500/30">IA</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Asistente Virtual • Soporte 24/7</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                title="Editar número de soporte y bot"
              >
                <Settings className="h-4 w-4" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                aria-label="Cerrar soporte"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* VISTA DE CONFIGURACIÓN (SI EL USUARIO CLICKEA EL ENGRANE) */}
          {isSettingsOpen ? (
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-900/90 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configurar Número de Soporte
                </h3>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-[10px] text-slate-400 hover:text-white underline"
                >
                  Volver al Chat
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-300">
                    Teléfono de WhatsApp (Agente Humano) *
                  </label>
                  <input
                    type="text"
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    placeholder="Ej. 50588062712"
                    className="w-full h-10 px-3 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <p className="text-[9px] text-slate-400 leading-tight">
                    Este número recibirá las preguntas que el bot no pueda responder o las solicitudes de atención humana.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-300">
                    Nombre del Bot Asistente
                  </label>
                  <input
                    type="text"
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    placeholder="SyncBot IA"
                    className="w-full h-10 px-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-300">
                    Mensaje de Transferencia a WhatsApp
                  </label>
                  <textarea
                    value={humanWhatsappText}
                    onChange={(e) => setHumanWhatsappText(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                {savedSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0" />
                    ¡Número y configuración actualizados!
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    {savingSettings ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* CUERPO PRINCIPAL DEL CHAT */
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              
              {/* HISTORIAL DE MENSAJES */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[9px] text-slate-400">
                      {msg.role === "assistant" ? (
                        <>
                          <Sparkles className="h-3 w-3 text-emerald-400" />
                          <span className="font-bold text-slate-300">{botName}</span>
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 text-slate-400" />
                          <span>Tú</span>
                        </>
                      )}
                      <span>• {msg.timestamp}</span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-emerald-500 text-slate-950 font-medium rounded-tr-none shadow-md shadow-emerald-500/10"
                          : "bg-slate-900 border border-white/10 text-slate-200 rounded-tl-none whitespace-pre-line"
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* BOTÓN DE TRANSFERENCIA A WHATSAPP SI APLICA */}
                    {msg.showWhatsapp && (
                      <div className="mt-2.5 w-[85%] animate-in fade-in">
                        <a
                          href={getWhatsappUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] uppercase tracking-wider py-2.5 px-3 rounded-xl transition-all shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-95"
                        >
                          <MessageCircle className="h-4 w-4 fill-current" />
                          Hablar con un Agente en WhatsApp
                          <ExternalLink className="h-3 w-3 opacity-80" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}

                {loadingAi && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 bg-slate-900/60 p-2.5 rounded-2xl border border-white/5 w-fit">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span className="font-medium text-[11px]">Escribiendo respuesta...</span>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* OPCIONES RÁPIDAS (FAQS) */}
              <div className="px-4 py-2 bg-slate-900/50 border-t border-white/5 shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none">
                <button
                  onClick={() => handleSendMessage("¿Cómo crear mi landing page con IA?")}
                  className="shrink-0 text-[10px] font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
                >
                  🚀 Crear Landing
                </button>

                <button
                  onClick={() => handleSendMessage("¿Cómo seleccionar un producto del catálogo?")}
                  className="shrink-0 text-[10px] font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
                >
                  📦 Seleccionar Producto
                </button>

                <button
                  onClick={() => handleSendMessage("¿Cómo funcionan las comisiones y retiros?")}
                  className="shrink-0 text-[10px] font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
                >
                  💰 Comisiones
                </button>

                <button
                  onClick={() => handleSendMessage("Quiero hablar con un agente humano por WhatsApp")}
                  className="shrink-0 text-[10px] font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <MessageCircle className="h-3 w-3" />
                  Agente Humano
                </button>
              </div>

              {/* INPUT DE MENSAJE */}
              <div className="p-3 bg-slate-950 border-t border-white/10 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Haz una pregunta o pide ayuda..."
                    className="flex-1 h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || loadingAi}
                    className="h-10 w-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-40 flex items-center justify-center transition-all shrink-0 active:scale-95"
                    aria-label="Enviar mensaje"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>

                <div className="mt-2 flex items-center justify-between text-[9px] text-slate-500 font-medium px-1">
                  <span>¿Consultas complejas?</span>
                  <a
                    href={getWhatsappUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    Atención directa en WhatsApp
                    <ChevronRight className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* BOTÓN FLOTANTE PRINCIPAL */}
      <div className="relative group">
        {!isOpen && (
          <div className="absolute -top-10 right-0 bg-[#131921] border border-white/10 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            Asistente IA • Soporte 24/7
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all transform hover:scale-110 active:scale-95 border-2 border-emerald-300/30 relative"
          aria-label="Abrir Soporte IA"
        >
          {isOpen ? (
            <X className="h-6 w-6 stroke-[3]" />
          ) : (
            <Bot className="h-7 w-7 fill-slate-950 stroke-emerald-500" />
          )}
        </button>
      </div>

    </div>
  )
}
