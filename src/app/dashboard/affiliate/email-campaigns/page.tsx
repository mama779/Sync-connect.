"use client";

import React, { useState, useEffect } from "react";
import { useUser, useFirestore } from "@/firebase";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  Send, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Settings, 
  Bot, 
  Loader2,
  Copy,
  ExternalLink
} from "lucide-react";

interface CampaignLog {
  id: string;
  title: string;
  subject: string;
  recipientsCount: number;
  sentCount: number;
  status: "Completed" | "Failed" | "Sending";
  sentAt: string;
}

export default function EmailCampaignsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [campaignTitle, setCampaignTitle] = useState("Campaña de Oferta Especial");
  const [subject, setSubject] = useState("🔥 [Oportunidad VIP] Accede con 50% de Descuento Hoy");
  const [recipientType, setRecipientType] = useState<"buyers" | "leads" | "custom">("buyers");
  const [customEmails, setCustomEmails] = useState("");
  const [senderName, setSenderName] = useState("Sync Connect Pro");
  
  // Gmail credentials option
  const [customGmail, setCustomGmail] = useState("");
  const [customAppPassword, setCustomAppPassword] = useState("");

  const [emailBody, setEmailBody] = useState(`
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #ffffff; padding: 30px; rounded-corner: 16px;">
      <h1 style="color: #38bdf8; text-transform: uppercase; font-size: 24px;">¡Atención Especial para Ti!</h1>
      <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Hola,</p>
      <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Te escribimos para notificarte que hemos habilitado una oportunidad exclusiva para adquirir nuestros programas y herramientas VIP con un beneficio único por tiempo limitado.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://syncconnect.app" style="background-color: #0284c7; color: #ffffff; padding: 16px 32px; text-decoration: none; font-weight: bold; font-size: 16px; border-radius: 12px; display: inline-block;">
          RECLAMAR MI BENEFICIO AHORA
        </a>
      </div>

      <p style="font-size: 14px; color: #94a3b8; text-align: center;">Si tienes preguntas, responde directamente a este correo.</p>
    </div>
  `);

  const [buyersList, setBuyersList] = useState<string[]>([]);
  const [leadsList, setLeadsList] = useState<string[]>([]);
  const [campaignLogs, setCampaignLogs] = useState<CampaignLog[]>([]);

  const [sending, setSending] = useState(false);
  const [generatingCopy, setGeneratingCopy] = useState(false);

  // Load buyers and leads
  useEffect(() => {
    if (!db || !user?.uid) return;

    const unsubBuyers = onSnapshot(collection(db, "buyers"), (snap) => {
      const emails: string[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.email) emails.push(data.email);
      });
      setBuyersList(Array.from(new Set(emails)));
    });

    const unsubLeads = onSnapshot(collection(db, "leads"), (snap) => {
      const emails: string[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.email) emails.push(data.email);
      });
      setLeadsList(Array.from(new Set(emails)));
    });

    const unsubLogs = onSnapshot(collection(db, "email_campaigns"), (snap) => {
      const logs: CampaignLog[] = [];
      snap.forEach((d) => logs.push({ id: d.id, ...d.data() } as CampaignLog));
      setCampaignLogs(logs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()));
    });

    return () => {
      unsubBuyers();
      unsubLeads();
      unsubLogs();
    };
  }, [db, user?.uid]);

  // Generate Email Copy using Gemini AI endpoint
  const handleGenerateAiCopy = async () => {
    setGeneratingCopy(true);
    try {
      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Escribe un correo electrónico persuasivo de ventas en HTML para vender un producto digital.
                    Título de campaña: ${campaignTitle}.
                    Debe incluir un encabezado h1 atractivo, párrafos breves, y un botón de llamada a la acción resaltado.
                    Devuelve ÚNICAMENTE el código HTML dentro de un div, sin explicaciones ni markdown triple backticks.`,
        }),
      });

      const data = await res.json();
      if (data.text) {
        const cleanText = data.text.replace(/```html/g, "").replace(/```/g, "").trim();
        setEmailBody(cleanText);
        toast({ title: "¡Copy Generado con IA!", description: "Se ha insertado la plantilla redactada por la IA." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al generar copy", description: err?.message });
    } finally {
      setGeneratingCopy(false);
    }
  };

  // Get recipient array
  const getRecipients = () => {
    if (recipientType === "buyers") return buyersList;
    if (recipientType === "leads") return leadsList;
    return customEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));
  };

  const recipients = getRecipients();

  // Dispatch Campaign
  const handleSendCampaign = async () => {
    if (recipients.length === 0) {
      toast({ variant: "destructive", title: "Sin destinatarios", description: "Agrega al menos una dirección de correo válida." });
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/email/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          subject,
          htmlContent: emailBody,
          senderName,
          customGmail: customGmail || undefined,
          customAppPassword: customAppPassword || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Error al enviar la campaña");
      }

      // Save log in Firestore
      if (db) {
        const logDoc = doc(collection(db, "email_campaigns"));
        await setDoc(logDoc, {
          title: campaignTitle,
          subject,
          recipientsCount: recipients.length,
          sentCount: result.sent || recipients.length,
          status: "Completed",
          sentAt: new Date().toISOString(),
          sentBy: user?.email || "Usuario",
        });
      }

      toast({
        title: "¡Campaña Enviada Exitosamente!",
        description: `Se enviaron ${result.sent} de ${recipients.length} correos correctamente.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error en el envío",
        description: err?.message || "Ocurrió un fallo durante el envío masivo.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardShell role="affiliate">
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-3">
              <Mail className="h-3.5 w-3.5" /> CENTRO DE CAMPAÑAS DE GMAIL 100% FUNCIONAL
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase italic">
              Email Marketing <span className="text-primary">& Campañas</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2 font-medium max-w-2xl">
              Crea, personaliza y envía campañas de correo electrónico a tus clientes y prospectos con alta entregabilidad.
            </p>
          </div>

          <Button
            onClick={handleSendCampaign}
            disabled={sending || recipients.length === 0}
            className="h-14 bg-primary hover:bg-primary/90 text-slate-950 font-black text-sm uppercase tracking-wider px-8 rounded-2xl shadow-xl gap-3"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            {sending ? "ENVIANDO CORREOS..." : `ENVIAR A ${recipients.length} CONTACTOS`}
          </Button>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Config Panel */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 bg-slate-900/60 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Configuración del Envío
                </h3>

                <Button
                  onClick={handleGenerateAiCopy}
                  disabled={generatingCopy}
                  size="sm"
                  className="h-9 bg-white/10 hover:bg-white/20 text-white font-bold text-xs gap-2 rounded-xl"
                >
                  {generatingCopy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4 text-primary" />}
                  REDACTAR CON IA
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Nombre de Campaña</Label>
                    <Input
                      value={campaignTitle}
                      onChange={(e) => setCampaignTitle(e.target.value)}
                      className="h-11 bg-slate-950 border-white/10 text-white text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Nombre de Remitente</Label>
                    <Input
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="h-11 bg-slate-950 border-white/10 text-white text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Asunto del Correo (Subject)</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-12 bg-slate-950 border-white/10 text-white text-sm font-bold"
                  />
                </div>

                {/* Recipient Selection */}
                <div className="space-y-3 pt-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Seleccionar Destinatarios</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setRecipientType("buyers")}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        recipientType === "buyers"
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-white/10 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      Compradores ({buyersList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientType("leads")}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        recipientType === "leads"
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-white/10 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      Leads / Prospectos ({leadsList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecipientType("custom")}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        recipientType === "custom"
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-white/10 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      Lista Personalizada
                    </button>
                  </div>

                  {recipientType === "custom" && (
                    <div className="space-y-1 pt-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">
                        Pega los Correos Separados por Coma o Línea
                      </Label>
                      <Textarea
                        placeholder="cliente1@gmail.com&#10;cliente2@yahoo.com"
                        value={customEmails}
                        onChange={(e) => setCustomEmails(e.target.value)}
                        className="min-h-[100px] bg-slate-950 border-white/10 text-white font-mono text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Email Body HTML Editor */}
                <div className="space-y-2 pt-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Cuerpo del Correo (HTML / Texto)</Label>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="min-h-[220px] bg-slate-950 border-white/10 text-slate-300 font-mono text-xs leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Optional Gmail Credentials Box */}
            <div className="p-6 bg-slate-900/60 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-black uppercase italic text-white">
                  Conexión Gmail Directa (Opcional)
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Si deseas que los correos salgan directamente desde tu cuenta personal de Gmail, ingresa tu correo y tu Contraseña de Aplicación. De lo contrario, se usará el servidor de alta entregabilidad por defecto.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Tu Correo Gmail (ej. miempresa@gmail.com)"
                  value={customGmail}
                  onChange={(e) => setCustomGmail(e.target.value)}
                  className="h-10 bg-slate-950 border-white/10 text-white text-xs font-mono"
                />
                <Input
                  type="password"
                  placeholder="Contraseña de Aplicación de Gmail"
                  value={customAppPassword}
                  onChange={(e) => setCustomAppPassword(e.target.value)}
                  className="h-10 bg-slate-950 border-white/10 text-white text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Right Live Preview & Campaign Logs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 bg-slate-900/60 rounded-3xl border border-white/10 space-y-4">
              <h3 className="text-sm font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> VISTA PREVIA DEL CORREO
              </h3>

              <div className="bg-slate-950 rounded-2xl border border-white/10 p-4 space-y-3">
                <div className="border-b border-white/10 pb-3 space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">De: <span className="text-slate-300">{senderName} &lt;{customGmail || "noreply@syncconnect.ni"}&gt;</span></p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Asunto: <span className="text-primary font-black">{subject}</span></p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Destinatarios: <span className="text-white">{recipients.length} contactos</span></p>
                </div>

                <div 
                  className="p-4 bg-slate-900 rounded-xl max-h-[350px] overflow-y-auto text-xs"
                  dangerouslySetInnerHTML={{ __html: emailBody }}
                />
              </div>
            </div>

            {/* Logs */}
            <div className="p-6 bg-slate-900/60 rounded-3xl border border-white/10 space-y-4">
              <h3 className="text-sm font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> HISTORIAL DE CAMPAÑAS
              </h3>

              {campaignLogs.length === 0 ? (
                <p className="text-xs text-slate-500 font-bold uppercase text-center py-6">
                  No se han registrado envíos recientes.
                </p>
              ) : (
                <div className="space-y-3 max-h-[250px] overflow-y-auto">
                  {campaignLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">{log.title}</span>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Enviado ({log.sentCount}/{log.recipientsCount})
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{log.subject}</p>
                      <p className="text-[9px] text-slate-600">{new Date(log.sentAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
