"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Bot, Send, Sparkles, Loader2, Copy, Check, ShoppingBag, Zap, RefreshCw, MessageSquare } from 'lucide-react'
import { useFirestore, useCollection } from '@/firebase'
import { collection, query, where } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export default function AISalesCopilotPage() {
  const db = useFirestore()
  const { toast } = useToast()
  
  // Fetch real products catalog from Firestore
  const productsQuery = db ? collection(db, 'products') : null
  const { data: rawProducts } = useCollection(productsQuery)
  
  const productsCatalog = rawProducts && rawProducts.length > 0 
    ? rawProducts.map(p => ({
        id: p.id,
        name: p.name || 'Curso Digital',
        price: p.price || 15,
        commission: p.commissionRate || p.commission || 80,
        description: p.description || 'Formación especializada'
      }))
    : [
        { id: 'p1', name: 'Master en Marketing Digital y Ventas', price: 49, commission: 80, description: 'Estrategia completa para vender productos digitales en redes.' },
        { id: 'p2', name: 'Escuela de Creadores de Contenido', price: 29, commission: 70, description: 'Domina TikTok, Instagram Reels y YouTube Shorts.' },
        { id: 'p3', name: 'Automatización de Ventas con IA', price: 67, commission: 80, description: 'Sistemas inteligentes para vender 24/7 sin estar presente.' },
        { id: 'p4', name: 'Copiloto de Cierre de Ventas', price: 15, commission: 80, description: 'Respuestas de alta conversión para objeciones de clientes.' }
      ]

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm-init',
      role: 'assistant',
      content: '¡Hola! Soy tu Copiloto de Ventas con Inteligencia Artificial de SyncConnect 🚀\n\nConozco todo el catálogo actualizado de productos. ¿En qué puedo ayudarte hoy?\n\n• ¿Un cliente te hizo una pregunta o puso una objeción? Pégala aquí y te daré la respuesta perfecta para cerrar la venta.\n• ¿Quieres un guión de prospección para Instagram, Facebook o WhatsApp?\n• ¿Quieres que te recomiende qué producto vender a un cliente según sus necesidades?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])

  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputMessage.trim() || loading) return

    const userText = inputMessage.trim()
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    setInputMessage('')
    setLoading(true)

    try {
      const formattedHistory = messages.concat(userMsg).map(m => ({
        role: m.role,
        content: m.content
      }))

      const res = await fetch('/api/gemini/sales-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: formattedHistory,
          productsCatalog
        })
      })

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'He procesado tu consulta sobre SyncConnect.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (error: any) {
      console.error('Error in sales copilot:', error)
      toast({
        variant: 'destructive',
        title: 'Error en la IA de Ventas',
        description: error?.message || 'No se pudo conectar con el servidor de IA.'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast({
      title: '¡Copiado!',
      description: 'Respuesta copiada al portapapeles lista para enviar a tu cliente.'
    })
    setTimeout(() => setCopiedId(null), 2000)
  }

  const quickPrompts = [
    '¿Cómo le respondo a un cliente que dice que el producto es caro?',
    'Dame un guión persuasivo para vender el curso de $15 USD.',
    '¿Qué producto del catálogo le recomiendo a alguien que no tiene experiencia?',
    'Escribe un mensaje de seguimiento para enviar por chat a un prospecto.'
  ]

  return (
    <DashboardShell role="affiliate">
      <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#131921] to-slate-900 p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-xs font-black uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Inteligencia Artificial 24/7
          </div>
          <h1 className="text-3xl md:text-4xl font-headline font-black text-white tracking-tight">
            Copiloto de Ventas <span className="text-[#FF5500]">SyncConnect</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Tu asistente inteligente sincronizado en tiempo real con todos los productos del catálogo. Responde objeciones, crea guiones persuasivos y cierra ventas automáticamente.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2 relative z-10">
          <Badge className="bg-[#FF5500] text-white px-4 py-2 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg">
            {productsCatalog.length} Productos Conectados
          </Badge>
        </div>
      </div>

      {/* Main Chat Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat window */}
        <Card className="lg:col-span-2 bg-[#131921] border-white/10 text-white rounded-3xl shadow-2xl flex flex-col h-[650px] overflow-hidden">
          <CardHeader className="border-b border-white/5 py-4 px-6 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#FF3B00] to-[#FF8800] flex items-center justify-center text-white shadow-lg">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black uppercase tracking-wider text-white">IA de Ventas SyncConnect</CardTitle>
                <CardDescription className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> En línea • Sincronizado
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMessages([{
                id: 'm-init',
                role: 'assistant',
                content: '¡Chat reiniciado! ¿En qué puedo ayudarte a vender hoy?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }])}
              className="text-slate-400 hover:text-white text-xs uppercase font-bold"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reiniciar
            </Button>
          </CardHeader>

          <CardContent className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-xl bg-[#FF5500] text-white flex items-center justify-center shrink-0 text-xs font-bold mt-1 shadow-md">
                    IA
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl p-4 space-y-2 text-sm leading-relaxed relative group ${
                    m.role === 'user'
                      ? 'bg-[#FF5500] text-white rounded-tr-none shadow-lg'
                      : 'bg-slate-800/90 text-slate-100 rounded-tl-none border border-white/5'
                  }`}
                >
                  <p className="whitespace-pre-line font-sans">{m.content}</p>

                  <div className="flex items-center justify-between pt-2 text-[10px] opacity-60 border-t border-white/10">
                    <span>{m.timestamp}</span>
                    {m.role === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(m.content, m.id)}
                        className="hover:opacity-100 transition-opacity flex items-center gap-1 font-bold text-amber-300"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="h-3 w-3" /> ¡Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copiar Respuesta
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                {m.role === 'user' && (
                  <div className="h-8 w-8 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                    Tú
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3 text-slate-400 text-xs font-bold p-3 bg-slate-800/40 rounded-2xl w-fit animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-[#FF5500]" />
                <span>La Inteligencia Artificial está analizando tu consulta y redactando la respuesta...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          <div className="p-4 border-t border-white/5 bg-slate-900/60">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Escribe la consulta del cliente, una objeción o solicita un guión de venta..."
                disabled={loading}
                className="bg-white border-slate-300 text-slate-950 font-bold placeholder:text-slate-400 rounded-xl h-12 text-sm focus-visible:ring-2 focus-visible:ring-[#FF5500] shadow-inner"
              />
              <Button
                type="submit"
                disabled={loading || !inputMessage.trim()}
                className="h-12 px-6 bg-[#FF5500] hover:bg-[#E63900] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shrink-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </Card>

        {/* Sidebar suggestions & products */}
        <div className="space-y-6">
          <Card className="bg-[#131921] border-white/10 text-white rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#FF5500] flex items-center gap-2">
              <Zap className="h-4 w-4" /> Consultas Rápidas Recomendadas
            </h3>
            <div className="space-y-2">
              {quickPrompts.map((promptText, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputMessage(promptText)
                  }}
                  className="w-full text-left p-3 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-white/5 text-xs text-slate-300 hover:text-white font-medium transition-all group flex items-start gap-2"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-[#FF5500] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span>{promptText}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="bg-[#131921] border-white/10 text-white rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Catálogo Activo en IA
            </h3>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {productsCatalog.map((prod) => (
                <div key={prod.id} className="p-3 bg-slate-800/50 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate max-w-[170px]">{prod.name}</span>
                    <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black border-none">
                      ${prod.price} USD
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{prod.description}</p>
                  <p className="text-[9px] text-amber-400 font-black uppercase tracking-widest pt-1">
                    Comisión: {prod.commission}%
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
    </DashboardShell>
  )
}
