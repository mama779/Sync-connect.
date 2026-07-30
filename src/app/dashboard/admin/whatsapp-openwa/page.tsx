'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  QrCode, 
  Smartphone, 
  Wifi, 
  WifiOff, 
  RotateCw, 
  LogOut, 
  Send, 
  Sparkles, 
  Server, 
  Terminal as TerminalIcon, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Key, 
  Settings, 
  HelpCircle, 
  ShieldCheck, 
  Radio,
  Play,
  FileCode,
  Zap,
  Star,
  ExternalLink,
  Layers,
  Cpu,
  Database,
  Box,
  Code2,
  Globe,
  Package,
  BookOpen,
  GitFork,
  MessageSquare,
  Lock,
  Flame,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OpenWAConfig, OpenWASessionState, OpenWALog, OpenWAMessageLog, DEFAULT_OPENWA_PROMPT } from '@/lib/openwa-types';

export default function OpenWAWhatsAppAdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedDocker, setCopiedDocker] = useState(false);

  // Configuration
  const [config, setConfig] = useState<OpenWAConfig>({
    serviceUrl: 'http://localhost:8080',
    apiKey: 'sync_connect_openwa_secret_2026',
    botActive: true,
    systemPrompt: DEFAULT_OPENWA_PROMPT,
    autoReconnect: true,
  });

  // State
  const [sessionState, setSessionState] = useState<OpenWASessionState>({
    status: 'DISCONNECTED',
    updatedAt: new Date().toISOString(),
  });

  // Logs
  const [microLogs, setMicroLogs] = useState<OpenWALog[]>([]);
  const [messages, setMessages] = useState<OpenWAMessageLog[]>([]);

  // Form states
  const [testUserQuery, setTestUserQuery] = useState('');
  const [testAiReply, setTestAiReply] = useState('');
  const [isTestingAi, setIsTestingAi] = useState(false);

  // Linking states
  const [connectPhone, setConnectPhone] = useState('+52 55 8432 9102');
  const [connectPushname, setConnectPushname] = useState('WhatsApp Empresa');
  const [pairingPhone, setPairingPhone] = useState('+52 55 8432 9102');
  const [pairingCode, setPairingCode] = useState('');
  const [copiedPairingCode, setCopiedPairingCode] = useState(false);
  const [linkingMethod, setLinkingMethod] = useState<'qr' | 'pairing' | 'direct'>('qr');

  const [sendNumber, setSendNumber] = useState('');
  const [sendText, setSendText] = useState('');
  const [sendMediaUrl, setSendMediaUrl] = useState('');
  const [isSendingManual, setIsSendingManual] = useState(false);

  // Webhook URL
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/whatsapp/openwa/webhook`);
    }
  }, []);

  const safeFetchJson = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return { ok: false, status: res.status, error: 'Respuesta no válida del servidor.' };
      }
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Error de conexión' };
    }
  };

  // Fetch state and config
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const configRes = await safeFetchJson('/api/whatsapp/openwa/config');
      if (configRes.ok && configRes.data?.config) {
        setConfig(configRes.data.config);
      }

      const statusRes = await safeFetchJson('/api/whatsapp/openwa/status');
      if (statusRes.ok && statusRes.data) {
        const sData = statusRes.data;
        setSessionState({
          status: sData.status || 'DISCONNECTED',
          qrCodeUrl: sData.qrCodeUrl,
          deviceInfo: sData.deviceInfo,
          lastConnectedAt: sData.lastConnectedAt,
          lastError: sData.lastError,
          uptimeSeconds: sData.uptimeSeconds,
          updatedAt: sData.updatedAt || new Date().toISOString(),
        });
      }

      const logsRes = await safeFetchJson('/api/whatsapp/openwa/logs');
      if (logsRes.ok && logsRes.data) {
        const lData = logsRes.data;
        if (lData.microLogs) setMicroLogs(lData.microLogs);
        if (lData.messages) setMessages(lData.messages);
      }
    } catch (err) {
      console.error('Error fetching OpenWA data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSaveConfig = async (override?: Partial<OpenWAConfig>) => {
    setActionLoading(true);
    const toSave = { ...config, ...override };
    try {
      const res = await safeFetchJson('/api/whatsapp/openwa/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSave),
      });
      if (res.ok && res.data?.success) {
        setConfig(res.data.config);
        toast({ title: 'Configuración guardada', description: 'Servicio OpenWA actualizado.' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.data?.error || res.error });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitSession = async () => {
    setActionLoading(true);
    try {
      const res = await safeFetchJson('/api/whatsapp/openwa/init', { method: 'POST' });
      if (res.ok && res.data?.success) {
        if (res.data.qrCodeUrl) {
          setSessionState(prev => ({
            ...prev,
            status: 'WAITING_QR',
            qrCodeUrl: res.data.qrCodeUrl,
          }));
        }
        toast({ title: 'Código QR Generado ✓', description: 'Escanea el código con tu WhatsApp.' });
        fetchData();
      } else {
        toast({ variant: 'destructive', title: 'Error al iniciar', description: res.data?.error || res.error });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error de red', description: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnectSession = async () => {
    if (!confirm('¿Deseas cerrar la sesión de WhatsApp en OpenWA?')) return;
    setActionLoading(true);
    try {
      const res = await safeFetchJson('/api/whatsapp/openwa/disconnect', { method: 'POST' });
      if (res.ok && res.data?.success) {
        toast({ title: 'Sesión cerrada', description: 'WhatsApp desconectado.' });
        fetchData();
      } else {
        toast({ variant: 'destructive', title: 'Error al desconectar', description: res.data?.error || res.error });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error al desconectar', description: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConnectPlatformSession = async (customP?: string, customN?: string) => {
    setActionLoading(true);
    try {
      const res = await safeFetchJson('/api/whatsapp/openwa/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: customP || connectPhone || pairingPhone || '+52 55 8432 9102',
          pushname: customN || connectPushname || 'WhatsApp Empresa',
        }),
      });
      if (res.ok && res.data?.success) {
        if (res.data.sessionState) {
          setSessionState(res.data.sessionState);
        } else {
          setSessionState(prev => ({
            ...prev,
            status: 'CONNECTED',
            qrCodeUrl: undefined,
          }));
        }
        toast({ title: 'WhatsApp Vinculado ✓', description: 'Sesión activa en la plataforma.' });
        fetchData();
      } else {
        toast({ variant: 'destructive', title: 'Error al conectar', description: res.data?.error || res.error });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error de red', description: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePairingCode = async () => {
    if (!pairingPhone.trim() || pairingPhone.trim().length < 7) {
      toast({ variant: 'destructive', title: 'Número Inválido', description: 'Por favor ingresa un número válido con código de país (Ej: +525512345678).' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await safeFetchJson('/api/whatsapp/openwa/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: pairingPhone.trim() }),
      });
      if (res.ok && res.data?.success && res.data?.pairingCode) {
        setPairingCode(res.data.pairingCode);
        toast({ title: 'Código Generado ✓', description: `Ingresa ${res.data.pairingCode} en tu app de WhatsApp.` });
        fetchData();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: res.data?.error || res.error });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestAiPrompt = async () => {
    if (!testUserQuery.trim()) return;
    setIsTestingAi(true);
    setTestAiReply('');
    try {
      const res = await safeFetchJson('/api/whatsapp/openwa/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: testUserQuery }),
      });
      if (res.ok && res.data?.reply) {
        setTestAiReply(res.data.reply);
      } else {
        setTestAiReply(res.data?.error || res.error || 'Error al recibir respuesta del asistente Gemini.');
      }
    } catch (err: any) {
      setTestAiReply(`Error: ${err.message}`);
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleSendManual = async () => {
    if (!sendNumber.trim() || !sendText.trim()) {
      toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Ingresa número y mensaje.' });
      return;
    }
    setIsSendingManual(true);
    try {
      const res = await safeFetchJson('/api/whatsapp/openwa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: sendNumber.trim(),
          text: sendText.trim(),
          mediaUrl: sendMediaUrl.trim() || undefined,
        }),
      });
      if (res.ok && res.data?.success) {
        toast({ title: 'Mensaje Enviado ✓', description: `Enviado a ${sendNumber}` });
        setSendText('');
        fetchData();
      } else {
        toast({ variant: 'destructive', title: 'Error al enviar', description: res.data?.error || res.error });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error de envío', description: err.message });
    } finally {
      setIsSendingManual(false);
    }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'URL Copiada al Portapapeles' });
  };

  const copyDockerCode = () => {
    const code = `git clone https://github.com/rmyndharis/OpenWA.git\ncd OpenWA\ndocker compose -f docker-compose.dev.yml up -d`;
    navigator.clipboard.writeText(code);
    setCopiedDocker(true);
    setTimeout(() => setCopiedDocker(false), 2000);
    toast({ title: 'Comando Docker copiado' });
  };

  return (
    <DashboardShell role="admin">
      <div className="space-y-10 pb-20">
        
        {/* TOP BRAND HEADER (OPENWA BRANDING & HERO) */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 p-8 md:p-12 rounded-[2.5rem] border border-emerald-500/20 shadow-2xl relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="relative z-10 space-y-6 max-w-5xl">
            {/* Version & Badge Row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-emerald-400 font-mono text-xs font-bold">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                Logotipo de OpenWA
              </div>
              <Badge className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-black px-3 py-1 text-xs uppercase tracking-wider">
                OpenWA
              </Badge>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 font-mono text-xs">
                ⭐ 12.1k GitHub Stars
              </Badge>
              <Badge className="bg-white/10 text-white border border-white/20 font-mono text-xs">
                Versión 0.11.1 publicada
              </Badge>
            </div>

            {/* Title & Tagline */}
            <div className="space-y-3">
              <h1 className="text-3xl md:text-5xl font-headline font-black tracking-tight text-white uppercase italic leading-none">
                Puerta de enlace API de WhatsApp <span className="text-emerald-400">de código abierto</span>
              </h1>
              <p className="text-slate-300 text-sm md:text-base font-medium max-w-3xl leading-relaxed">
                La API HTTP gratuita y autoalojada de WhatsApp para desarrolladores que desean tener el control total de su infraestructura: <strong className="text-white">control absoluto</strong>, una arquitectura limpia y <strong className="text-white">sin dependencia de proveedores</strong>. Tus datos nunca salen de tu servidor.
              </p>
            </div>

            {/* Key Value Badges */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> 100% Gratis
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                <Code2 className="h-4 w-4 text-emerald-400" /> Código Abierto (MIT)
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                <Server className="h-4 w-4 text-emerald-400" /> Autogestionado
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Listo para Producción
              </div>
            </div>

            {/* Endpoints & Links Quick Strip */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-6 text-slate-300">
                <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-emerald-400" /> Panel: <strong className="text-white">:2785</strong></span>
                <span className="flex items-center gap-2"><Server className="h-3.5 w-3.5 text-emerald-400" /> API REST: <strong className="text-white">:2785/api</strong></span>
                <span className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-emerald-400" /> Swagger: <strong className="text-white">:2785/api/docs</strong></span>
              </div>

              <div className="flex items-center gap-3">
                <Badge className={sessionState.status === 'CONNECTED' ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'}>
                  {sessionState.status === 'CONNECTED' ? '🟢 SESIÓN ACTIVA' : '🔴 VINCULACIÓN PENDIENTE'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <Tabs defaultValue="docs" className="space-y-8">
          <TabsList className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 flex-wrap h-auto gap-1">
            <TabsTrigger value="docs" className="rounded-xl px-5 py-2.5 font-bold text-xs uppercase tracking-wider gap-2">
              <BookOpen className="h-4 w-4 text-emerald-500" /> Documentación Completa OpenWA
            </TabsTrigger>
            <TabsTrigger value="session" className="rounded-xl px-5 py-2.5 font-bold text-xs uppercase tracking-wider gap-2">
              <QrCode className="h-4 w-4 text-emerald-500" /> Conexión QR & Estado
            </TabsTrigger>
            <TabsTrigger value="test-ai" className="rounded-xl px-5 py-2.5 font-bold text-xs uppercase tracking-wider gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" /> Probar Asistente IA
            </TabsTrigger>
            <TabsTrigger value="send" className="rounded-xl px-5 py-2.5 font-bold text-xs uppercase tracking-wider gap-2">
              <Send className="h-4 w-4 text-emerald-500" /> Enviar Mensajes
            </TabsTrigger>
            <TabsTrigger value="config" className="rounded-xl px-5 py-2.5 font-bold text-xs uppercase tracking-wider gap-2">
              <Settings className="h-4 w-4 text-emerald-500" /> Configuración API
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-xl px-5 py-2.5 font-bold text-xs uppercase tracking-wider gap-2">
              <FileCode className="h-4 w-4 text-emerald-500" /> Registros / Logs
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: COMPLETE OPENWA DOCUMENTATION & GATEWAY SPEC (EXACTLY AS REQUESTED) */}
          <TabsContent value="docs" className="space-y-12">
            
            {/* 01 — CAPACIDADES */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <span className="text-xl font-black text-emerald-500 font-mono">01 —</span>
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Capacidades</h2>
                <span className="text-xs text-slate-500 font-medium">Todo lo que necesitas para enviar. Plataforma completa 100% gratuita y de código abierto.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Centro */}
                <Card className="border-slate-200 dark:border-white/10 shadow-sm rounded-2xl bg-white dark:bg-slate-950">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="h-4 w-4 text-emerald-500" /> Centro
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> API REST completa</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Soporte para múltiples sesiones</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Webhooks en tiempo real (HMAC)</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Panel de control web (9 idiomas)</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Autenticación API Key con ámbito</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Documentos de Swagger</div>
                  </CardContent>
                </Card>

                {/* Mensajería */}
                <Card className="border-slate-200 dark:border-white/10 shadow-sm rounded-2xl bg-white dark:bg-slate-950">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                      <Send className="h-4 w-4 text-emerald-500" /> Mensajería
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Mensajes de texto</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Imágenes y vídeos</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Documentos y audio</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Reacciones a los mensajes</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Mensajería masiva</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Estado de la entrega</div>
                  </CardContent>
                </Card>

                {/* Avanzado */}
                <Card className="border-slate-200 dark:border-white/10 shadow-sm rounded-2xl bg-white dark:bg-slate-950">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                      <Zap className="h-4 w-4 text-emerald-500" /> Avanzado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> API de grupos</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Canales / Boletín informativo</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Gestión de etiquetas</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Proxy por sesión</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Lista blanca IP CIDR</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Limitación de tarifas y auditoría</div>
                  </CardContent>
                </Card>

                {/* Infraestructura */}
                <Card className="border-slate-200 dark:border-white/10 shadow-sm rounded-2xl bg-white dark:bg-slate-950">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                      <Server className="h-4 w-4 text-emerald-500" /> Infraestructura
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> SQLite / PostgreSQL</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Caché de Redis + Colas</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Almacenamiento S3 / MinIO</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Docker multiarquitectura</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Contenedor sin raíz</div>
                    <div className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" /> Salud y migraciones</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 02 — ARQUITECTURA */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <span className="text-xl font-black text-emerald-500 font-mono">02 —</span>
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Arquitectura</h2>
                <span className="text-xs text-slate-500 font-medium">Construido sobre un núcleo enchufable. Cambia base de datos, almacenamiento, caché y motor sin tocar código.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-slate-200 dark:border-white/10 shadow-sm rounded-2xl bg-slate-900 text-white p-6 space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                    <Cpu className="h-5 w-5" /> Arquitectura Conectable
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    La base de datos (SQLite/PostgreSQL), el almacenamiento (local/S3/MinIO) y la caché (memoria/Redis) son adaptadores intercambiables: se configuran en el entorno, no se programan. Pasa de entorno local a producción de forma instantánea.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {['SQLite', 'PostgreSQL', 'Local S3', 'MinIO', 'Redis'].map((tech) => (
                      <span key={tech} className="bg-white/10 border border-white/20 px-3 py-1 rounded-lg text-xs font-mono font-bold text-white">
                        {tech}
                      </span>
                    ))}
                  </div>
                </Card>

                <Card className="border-slate-200 dark:border-white/10 shadow-sm rounded-2xl bg-slate-900 text-white p-6 space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                    <Zap className="h-5 w-5" /> Motor de WhatsApp Dual
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Elige tu motor para cada despliegue a través de <code className="text-emerald-300 bg-black/40 px-1.5 py-0.5 rounded font-mono">ENGINE_TYPE</code>. Por defecto, se incluye el motor probado <code className="text-white font-mono">whatsapp-web.js</code> (Puppeteer), o cambia al motor ligero <code className="text-white font-mono">baileys</code> (WebSocket sin navegador).
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-mono text-emerald-300 font-bold">
                      whatsapp-web.js (Predeterminado)
                    </div>
                    <span className="text-slate-500 text-xs">o</span>
                    <div className="bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-mono text-emerald-300 font-bold">
                      Baileys (WebSocket)
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* 03 — COMPARACIÓN */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <span className="text-xl font-black text-emerald-500 font-mono">03 —</span>
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Comparación</h2>
                <span className="text-xs text-slate-500 font-medium">¿Por qué los desarrolladores eligen OpenWA sobre otras opciones?</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 uppercase font-black tracking-wider border-b">
                    <tr>
                      <th className="p-4">Característica</th>
                      <th className="p-4 text-emerald-600 dark:text-emerald-400 font-black text-sm">OpenWA</th>
                      <th className="p-4 text-slate-500">Núcleo W.</th>
                      <th className="p-4 text-slate-500">W. Plus</th>
                      <th className="p-4 text-slate-500">Nube Occidental</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium text-slate-800 dark:text-slate-200">
                    <tr>
                      <td className="p-4 font-bold">Precio</td>
                      <td className="p-4 font-black text-emerald-500">Libre para siempre</td>
                      <td className="p-4">Gratis</td>
                      <td className="p-4">&gt; $50/mes</td>
                      <td className="p-4">&gt; $30/mes</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold">Código abierto</td>
                      <td className="p-4 font-black text-emerald-500">✓ Sí (MIT)</td>
                      <td className="p-4">✓ Sí</td>
                      <td className="p-4 text-slate-400">✗ No</td>
                      <td className="p-4 text-slate-400">✗ No</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold">Múltiples sesiones</td>
                      <td className="p-4 font-black text-emerald-500">✓ Ilimitadas</td>
                      <td className="p-4">Limitado</td>
                      <td className="p-4">✓ Sí</td>
                      <td className="p-4 text-slate-400">✗ No</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold">Panel de control web</td>
                      <td className="p-4 font-black text-emerald-500">✓ Sí (9 idiomas)</td>
                      <td className="p-4 text-slate-400">✗ No</td>
                      <td className="p-4 text-slate-400">✗ No</td>
                      <td className="p-4 text-slate-400">✗ No</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold">PostgreSQL / SQLite</td>
                      <td className="p-4 font-black text-emerald-500">✓ Nativo</td>
                      <td className="p-4 text-slate-400">✗ No</td>
                      <td className="p-4 text-slate-400">✗ No</td>
                      <td className="p-4 text-slate-400">N / A</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold">Interfaz UI de Webhook</td>
                      <td className="p-4 font-black text-emerald-500">✓ Sí</td>
                      <td className="p-4 text-slate-400">✗ No</td>
                      <td className="p-4 text-slate-400">✗ No</td>
                      <td className="p-4 text-slate-400">✗ No</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold">Autogestionado</td>
                      <td className="p-4 font-black text-emerald-500">✓ 100% Servidor Propio</td>
                      <td className="p-4">✓ Sí</td>
                      <td className="p-4 text-slate-400">✗ No</td>
                      <td className="p-4 text-slate-400">✗ No</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                La comparación refleja las características disponibles públicamente a partir de 2026. Los nombres de competidores aparecen abreviados.
              </p>
            </div>

            {/* 04 — INICIO RÁPIDO */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-emerald-500 font-mono">04 —</span>
                  <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Inicio Rápido</h2>
                </div>
                <Button size="sm" variant="outline" onClick={copyDockerCode} className="gap-2 text-xs font-mono">
                  {copiedDocker ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  Copiar Docker Compose
                </Button>
              </div>

              <div className="bg-slate-950 rounded-2xl p-6 font-mono text-xs text-slate-200 space-y-4 border border-slate-800 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-slate-400 text-[11px]">
                  <span>Terminal — Docker Container Quickstart</span>
                  <span className="text-emerald-400">puerto :2785</span>
                </div>
                <pre className="text-emerald-400 leading-relaxed overflow-x-auto">
{`# Clonar e iniciar con Docker (un solo contenedor de inicio rápido)
git clone https://github.com/rmyndharis/OpenWA.git
cd OpenWA
docker compose -f docker-compose.dev.yml up -d

# Dashboard y API agrupados en un solo puerto:
# http://localhost:2785
Panel: :2785
API REST: :2785/api
Swagger Docs: :2785/api/docs`}
                </pre>
              </div>
            </div>

            {/* 05 — PILA TECNOLÓGICA */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <span className="text-xl font-black text-emerald-500 font-mono">05 —</span>
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Pila Tecnológica</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono text-xs">
                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border"><span className="block font-black text-slate-900 dark:text-white">Node.js 22</span></div>
                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border"><span className="block font-black text-slate-900 dark:text-white">NestJS 11</span></div>
                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border"><span className="block font-black text-slate-900 dark:text-white">TypeScript 5</span></div>
                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border"><span className="block font-black text-slate-900 dark:text-white">React 19</span></div>
                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border"><span className="block font-black text-slate-900 dark:text-white">PostgreSQL</span></div>
                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border"><span className="block font-black text-slate-900 dark:text-white">Redis + BullMQ</span></div>
                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border"><span className="block font-black text-slate-900 dark:text-white">Docker Multi-arch</span></div>
                <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border"><span className="block font-black text-slate-900 dark:text-white">Socket.IO</span></div>
              </div>
            </div>

            {/* 06 — ECOSISTEMA & 07 — COMPLEMENTOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b pb-3">
                  <span className="text-xl font-black text-emerald-500 font-mono">06 —</span>
                  <h3 className="text-xl font-black uppercase italic">Ecosistema</h3>
                </div>
                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <div className="p-4 bg-white dark:bg-slate-950 border rounded-2xl">
                    <strong className="text-slate-900 dark:text-white block font-bold mb-1">Nodos n8n Oficiales</strong>
                    Comunidad <code className="text-emerald-500">@rmyndharis/n8n-nodes-openwa</code> para automatizar cientos de servicios.
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-950 border rounded-2xl">
                    <strong className="text-slate-900 dark:text-white block font-bold mb-1">SDKs Oficiales</strong>
                    Librerías cliente escritas a mano para JS/TS (<code className="text-emerald-500">@rmyndharis/openwa</code>), Python y PHP.
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b pb-3">
                  <span className="text-xl font-black text-emerald-500 font-mono">07 —</span>
                  <h3 className="text-xl font-black uppercase italic">Complementos / Plugins</h3>
                </div>
                <div className="p-4 bg-white dark:bg-slate-950 border rounded-2xl space-y-3 text-xs">
                  <p className="text-slate-600 dark:text-slate-300 font-medium">
                    Crea un plugin con hooks de ciclo de vida tipados: respuesta automática, retransmisión de webhook, transmisión y registrador de chat.
                  </p>
                  <div className="flex flex-wrap gap-2 font-mono text-[11px]">
                    <span className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-md border border-emerald-500/20">Respuesta automática</span>
                    <span className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-md border border-emerald-500/20">Webhook relay</span>
                    <span className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-md border border-emerald-500/20">Transmisión</span>
                    <span className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-md border border-emerald-500/20">Registrador</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 08 — REGISTRO DE CAMBIOS */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <span className="text-xl font-black text-emerald-500 font-mono">08 —</span>
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Registro de Cambios (Changelog)</h2>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <Card className="border-emerald-500/30 bg-emerald-950/10 p-5 space-y-2">
                  <div className="flex justify-between items-center text-emerald-400 font-bold">
                    <span>v0.11.1 (28-07-2026)</span>
                    <Badge className="bg-emerald-500 text-slate-950 font-sans">PUBLICADO</Badge>
                  </div>
                  <ul className="list-disc list-inside text-slate-300 space-y-1">
                    <li>El motor de Baileys ahora respeta el proxy de salida por sesión.</li>
                    <li>La especificación OpenAPI declara servidor predeterminado basado en plantillas.</li>
                    <li>Parches de seguridad y prevención de fugas de memoria en Docker.</li>
                  </ul>
                </Card>

                <Card className="border-slate-200 dark:border-white/10 p-5 space-y-2">
                  <div className="flex justify-between items-center text-slate-900 dark:text-white font-bold">
                    <span>v0.11.0 (27/07/2026)</span>
                    <span className="text-slate-400 text-[10px]">VERSIÓN ANTERIOR</span>
                  </div>
                  <ul className="list-disc list-inside text-slate-500 dark:text-slate-400 space-y-1">
                    <li>Incorporación de sondeos, imágenes de perfil por lotes y descargas multimedia.</li>
                    <li>Correcciones de reconexión Baileys, Redis rate limiter y exportación CSV.</li>
                  </ul>
                </Card>
              </div>
            </div>

            {/* 09 — PREGUNTAS FRECUENTES */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
                <span className="text-xl font-black text-emerald-500 font-mono">09 —</span>
                <h2 className="text-2xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Preguntas Frecuentes</h2>
              </div>

              <Accordion type="single" collapsible className="w-full space-y-3">
                <AccordionItem value="q1" className="border rounded-2xl px-5">
                  <AccordionTrigger className="font-bold text-sm">¿OpenWA es realmente gratuito?</AccordionTrigger>
                  <AccordionContent className="text-xs text-slate-500 leading-relaxed">
                    Sí, OpenWA es 100% de código abierto bajo licencia MIT. Puedes descargarlo, alojarlo en tu propia infraestructura y usarlo de manera ilimitada sin pagar suscripciones ni cargos por mensaje.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2" className="border rounded-2xl px-5">
                  <AccordionTrigger className="font-bold text-sm">¿OpenWA está afiliado a Meta o WhatsApp?</AccordionTrigger>
                  <AccordionContent className="text-xs text-slate-500 leading-relaxed">
                    No. OpenWA es un proyecto independiente mantenido por la comunidad para conectar servicios a través de la API web oficial de WhatsApp.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q3" className="border rounded-2xl px-5">
                  <AccordionTrigger className="font-bold text-sm">¿Puedo alojar OpenWA en mi propio servidor o Docker?</AccordionTrigger>
                  <AccordionContent className="text-xs text-slate-500 leading-relaxed">
                    Totalmente. Viene empaquetado en Docker listo para despliegue con un solo comando en cualquier VPS, servidor Cloud Run o servidor propio.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

          </TabsContent>

          {/* TAB 2: LIVE SESSION MANAGEMENT & QR CODE */}
          <TabsContent value="session" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Linking Panel */}
              <Card className="border-slate-200 dark:border-white/10 shadow-lg rounded-3xl overflow-hidden bg-white dark:bg-slate-950">
                <CardHeader className="bg-slate-900 text-white p-6">
                  <CardTitle className="text-lg font-headline font-black uppercase italic tracking-wider flex items-center gap-3">
                    <QrCode className="h-5 w-5 text-emerald-400" />
                    Vincular Cuenta de WhatsApp OpenWA
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Selecciona tu método preferido para vincular tu WhatsApp a la plataforma
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {sessionState.status === 'CONNECTED' ? (
                    <div className="space-y-6 py-6 text-center">
                      <div className="h-20 w-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-inner">
                        <Wifi className="h-10 w-10 animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <Badge className="bg-emerald-500 text-slate-950 text-xs font-bold uppercase tracking-wider px-3 py-1">
                          🟢 SESIÓN ACTIVA Y CONECTADA
                        </Badge>
                        <h3 className="text-xl font-black uppercase italic text-slate-900 dark:text-white">¡WhatsApp Vinculado Exitosamente!</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                          Tu bot de WhatsApp OpenWA está activo y listo para procesar mensajes entrantes utilizando Gemini IA.
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col gap-3">
                        <Button 
                          onClick={() => handleConnectPlatformSession()} 
                          disabled={actionLoading}
                          variant="outline" 
                          className="rounded-xl font-bold text-xs uppercase gap-2"
                        >
                          <RotateCw className="h-4 w-4 text-emerald-500" /> Sincronizar / Refrescar Estado
                        </Button>
                        <Button 
                          variant="destructive" 
                          onClick={handleDisconnectSession} 
                          disabled={actionLoading} 
                          className="rounded-xl font-bold text-xs uppercase tracking-wider gap-2"
                        >
                          <LogOut className="h-4 w-4" /> Desconectar Sesión Actual
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Linking Method Selector */}
                      <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border">
                        <button
                          type="button"
                          onClick={() => setLinkingMethod('qr')}
                          className={`py-2 px-2 text-[11px] font-bold rounded-xl transition-all ${
                            linkingMethod === 'qr'
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          1. Código QR
                        </button>
                        <button
                          type="button"
                          onClick={() => setLinkingMethod('pairing')}
                          className={`py-2 px-2 text-[11px] font-bold rounded-xl transition-all ${
                            linkingMethod === 'pairing'
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          2. Código 8 Dígitos
                        </button>
                        <button
                          type="button"
                          onClick={() => setLinkingMethod('direct')}
                          className={`py-2 px-2 text-[11px] font-bold rounded-xl transition-all ${
                            linkingMethod === 'direct'
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          3. Directa
                        </button>
                      </div>

                      {/* METHOD 1: QR CODE */}
                      {linkingMethod === 'qr' && (
                        <div className="space-y-6 text-center">
                          {sessionState.qrCodeUrl ? (
                            <div className="space-y-4">
                              <div className="p-4 bg-white border-2 border-slate-900 dark:border-emerald-500/50 rounded-3xl shadow-xl inline-block">
                                <img src={sessionState.qrCodeUrl} alt="Código QR OpenWA" className="w-56 h-56 object-contain mx-auto" />
                              </div>
                              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                                Escanea el código con la cámara de tu móvil en WhatsApp &gt; Dispositivos vinculados:
                              </p>
                              <div className="flex gap-2">
                                <Button onClick={handleInitSession} disabled={actionLoading} variant="outline" className="w-1/2 rounded-xl text-xs font-bold">
                                  <RotateCw className="h-3.5 w-3.5 mr-1" /> Nuevo QR
                                </Button>
                                <Button onClick={() => handleConnectPlatformSession()} disabled={actionLoading} className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold gap-1 shadow-md">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Vincular Ahora
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 py-6">
                              <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 flex items-center justify-center mx-auto">
                                <WifiOff className="h-8 w-8" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Genera tu Código QR de Vinculación</h4>
                                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                                  Genera un nuevo código para escanearlo directamente desde tu teléfono.
                                </p>
                              </div>
                              <Button onClick={handleInitSession} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider gap-2 shadow-lg">
                                <RotateCw className="h-4 w-4" /> Generar Código QR
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* METHOD 2: PAIRING CODE (8 DIGITS) */}
                      {linkingMethod === 'pairing' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Número de Teléfono WhatsApp (con Código de País)
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                value={pairingPhone}
                                onChange={(e) => setPairingPhone(e.target.value)}
                                placeholder="Ej: +525512345678"
                                className="font-mono text-xs rounded-xl"
                              />
                              <Button 
                                onClick={handleGeneratePairingCode} 
                                disabled={actionLoading}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shrink-0"
                              >
                                Obtener Código
                              </Button>
                            </div>
                          </div>

                          {pairingCode ? (
                            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-emerald-500/30 text-center space-y-3">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                                Tu Código de Emparejamiento (Ingresar en WhatsApp):
                              </span>
                              <div className="text-3xl font-mono font-black text-emerald-400 tracking-widest bg-black/40 py-2 px-4 rounded-xl inline-block border border-emerald-500/20">
                                {pairingCode}
                              </div>
                              <div className="text-[11px] text-slate-300 space-y-1 text-left bg-white/5 p-3 rounded-xl border border-white/10">
                                <p className="font-bold text-white">Pasos para conectar en tu teléfono:</p>
                                <ol className="list-decimal list-inside space-y-0.5 text-slate-300">
                                  <li>Abre <strong>WhatsApp</strong> en tu móvil.</li>
                                  <li>Toca Menú o Configuración &gt; <strong>Dispositivos vinculados</strong>.</li>
                                  <li>Selecciona <strong>Vincular con número de teléfono</strong> e ingresa este código.</li>
                                </ol>
                              </div>
                              <Button 
                                onClick={() => handleConnectPlatformSession(pairingPhone, 'WhatsApp Vinculado por Código')}
                                disabled={actionLoading}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider gap-2"
                              >
                                <CheckCircle2 className="h-4 w-4" /> Confirmar Vinculación Completa
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 text-center py-2">
                              Ingresa tu número para recibir un código de 8 dígitos para enlazar WhatsApp sin cámara.
                            </p>
                          )}
                        </div>
                      )}

                      {/* METHOD 3: DIRECT INSTANT CONNECT */}
                      {linkingMethod === 'direct' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Número de Teléfono de la Empresa
                            </Label>
                            <Input
                              value={connectPhone}
                              onChange={(e) => setConnectPhone(e.target.value)}
                              placeholder="Ej: +52 55 8432 9102"
                              className="font-mono text-xs rounded-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Nombre de la Cuenta / Negocio
                            </Label>
                            <Input
                              value={connectPushname}
                              onChange={(e) => setConnectPushname(e.target.value)}
                              placeholder="Ej: Mi WhatsApp Empresa"
                              className="text-xs rounded-xl"
                            />
                          </div>

                          <Button 
                            onClick={() => handleConnectPlatformSession(connectPhone, connectPushname)} 
                            disabled={actionLoading} 
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider gap-2 shadow-lg w-full py-2.5"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Activar Vinculación Instantánea en Plataforma
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status & Info Card */}
              <Card className="border-slate-200 dark:border-white/10 shadow-lg rounded-3xl p-6 space-y-6 bg-white dark:bg-slate-950">
                <CardHeader className="p-0">
                  <CardTitle className="text-lg font-headline font-black uppercase italic tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-emerald-500" />
                    Estado del Dispositivo
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                    <span className="font-bold text-slate-500">Estado de Red:</span>
                    <Badge className={sessionState.status === 'CONNECTED' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-amber-500 text-slate-950 font-bold'}>
                      {sessionState.status === 'CONNECTED' ? '🟢 CONECTADO' : sessionState.status}
                    </Badge>
                  </div>

                  {sessionState.deviceInfo && (
                    <>
                      <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                        <span className="font-bold text-slate-500">Número Conectado:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{sessionState.deviceInfo.phone || sessionState.deviceInfo.pushname || 'Registrado'}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                        <span className="font-bold text-slate-500">Nombre de Cuenta:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{sessionState.deviceInfo.pushname || 'OpenWA User'}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                        <span className="font-bold text-slate-500">Plataforma:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{sessionState.deviceInfo.platform}</span>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
                    <span className="font-bold text-slate-500">Reconexión Automática:</span>
                    <Switch
                      checked={config.autoReconnect}
                      onCheckedChange={(v) => handleSaveConfig({ autoReconnect: v })}
                    />
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">URL del Webhook de Eventos</Label>
                    <div className="flex gap-2">
                      <Input value={webhookUrl} readOnly className="font-mono text-xs bg-slate-50 dark:bg-slate-900" />
                      <Button size="icon" variant="outline" onClick={copyWebhook}>
                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: TEST AI GEMINI ASSISTANT */}
          <TabsContent value="test-ai" className="space-y-6">
            <Card className="border-slate-200 dark:border-white/10 shadow-lg rounded-3xl p-6 space-y-6 bg-white dark:bg-slate-950">
              <CardHeader className="p-0">
                <CardTitle className="text-lg font-headline font-black uppercase italic tracking-wider flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  Simulador de Respuestas de Asistente Gemini IA
                </CardTitle>
                <CardDescription className="text-xs">
                  Prueba cómo responderá el bot a las consultas de tus clientes en WhatsApp según el System Prompt configurado.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Mensaje de Prueba del Cliente</Label>
                  <Textarea
                    value={testUserQuery}
                    onChange={(e) => setTestUserQuery(e.target.value)}
                    placeholder="Ej: Hola, quiero información sobre los planes de capacitación de la academia..."
                    className="rounded-xl bg-slate-50 dark:bg-slate-900 text-xs"
                  />
                </div>
                <Button onClick={handleTestAiPrompt} disabled={isTestingAi || !testUserQuery.trim()} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl gap-2">
                  <Play className="h-4 w-4" /> Generar Respuesta IA
                </Button>

                {testAiReply && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-2">
                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Respuesta de Gemini IA:</span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">{testAiReply}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: MANUAL DIRECT MESSAGING */}
          <TabsContent value="send" className="space-y-6">
            <Card className="border-slate-200 dark:border-white/10 shadow-lg rounded-3xl p-6 space-y-6 bg-white dark:bg-slate-950">
              <CardHeader className="p-0">
                <CardTitle className="text-lg font-headline font-black uppercase italic tracking-wider flex items-center gap-2">
                  <Send className="h-5 w-5 text-emerald-500" />
                  Envío Directo de Mensajes WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Número Destino (con código de país)</Label>
                    <Input
                      value={sendNumber}
                      onChange={(e) => setSendNumber(e.target.value)}
                      placeholder="+5215500000000"
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">URL de Imagen/Archivo Adjunto (Opcional)</Label>
                    <Input
                      value={sendMediaUrl}
                      onChange={(e) => setSendMediaUrl(e.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Mensaje</Label>
                  <Textarea
                    value={sendText}
                    onChange={(e) => setSendText(e.target.value)}
                    placeholder="Escribe el mensaje a enviar..."
                    className="rounded-xl text-xs"
                  />
                </div>
                <Button onClick={handleSendManual} disabled={isSendingManual} className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold text-xs uppercase tracking-wider gap-2">
                  <Send className="h-4 w-4 text-emerald-400" /> Enviar Mensaje
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: CONFIGURATION */}
          <TabsContent value="config" className="space-y-6">
            <Card className="border-slate-200 dark:border-white/10 shadow-lg rounded-3xl p-6 space-y-6 bg-white dark:bg-slate-950">
              <CardHeader className="p-0">
                <CardTitle className="text-lg font-headline font-black uppercase italic tracking-wider flex items-center gap-2">
                  <Settings className="h-5 w-5 text-emerald-500" />
                  Ajustes de Servidor OpenWA y Prompt del Bot
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Bot de Respuestas Automáticas IA</span>
                    <span className="text-[10px] text-slate-400">Activa o desactiva la respuesta automática de Gemini para mensajes entrantes</span>
                  </div>
                  <Switch
                    checked={config.botActive}
                    onCheckedChange={(v) => handleSaveConfig({ botActive: v })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">URL del Servicio OpenWA API</Label>
                  <Input
                    value={config.serviceUrl}
                    onChange={(e) => setConfig({ ...config, serviceUrl: e.target.value })}
                    className="font-mono text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">API Key de Autenticación OpenWA</Label>
                  <Input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    className="font-mono text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">Instrucciones del Sistema para el Bot (System Prompt)</Label>
                  <Textarea
                    value={config.systemPrompt}
                    onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                    className="min-h-[160px] text-xs font-mono rounded-xl leading-relaxed"
                  />
                </div>

                <Button onClick={() => handleSaveConfig()} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl">
                  Guardar Cambios de Configuración
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 6: AUDIT LOGS */}
          <TabsContent value="logs" className="space-y-6">
            <Card className="border-slate-200 dark:border-white/10 shadow-lg rounded-3xl p-6 bg-slate-950 text-white font-mono space-y-4">
              <CardHeader className="p-0 pb-2 border-b border-slate-800 flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <TerminalIcon className="h-4 w-4" /> Registros de Actividad (OpenWA Micro-Logs)
                </CardTitle>
                <Badge variant="outline" className="text-slate-400 border-slate-700 text-[10px]">
                  {microLogs.length} Entradas
                </Badge>
              </CardHeader>
              <CardContent className="p-0 max-h-96 overflow-y-auto space-y-2 text-xs">
                {microLogs.length === 0 ? (
                  <p className="text-slate-500 italic text-center py-8">No hay registros aún.</p>
                ) : (
                  microLogs.map((log) => (
                    <div key={log.id} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-emerald-400">[{(log.level || 'info').toUpperCase()}]</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-200">{log.message}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
