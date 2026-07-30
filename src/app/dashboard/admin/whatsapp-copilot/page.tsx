'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  MessageSquare, 
  Send, 
  Sparkles, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  Settings, 
  HelpCircle,
  PhoneCall,
  Key,
  Globe,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_OFFICIAL_PROMPT, OfficialWhatsAppConfig, OfficialWhatsAppLog } from '@/lib/whatsapp-official-service';

export default function OfficialWhatsAppCopilotPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [copied, setCopied] = useState(false);

  const [config, setConfig] = useState<OfficialWhatsAppConfig>({
    phoneNumberId: '',
    accessToken: '',
    businessAccountId: '',
    verifyToken: 'sync_connect_verify_token_123',
    botActive: true,
    systemPrompt: DEFAULT_OFFICIAL_PROMPT,
  });

  const [logs, setLogs] = useState<OfficialWhatsAppLog[]>([]);

  // Tester state
  const [testUserQuery, setTestUserQuery] = useState('');
  const [testAiReply, setTestAiReply] = useState('');
  const [isTestingAi, setIsTestingAi] = useState(false);

  // Manual message sender state
  const [sendNumber, setSendNumber] = useState('');
  const [sendText, setSendText] = useState('');
  const [isSendingManual, setIsSendingManual] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/whatsapp/webhook`);
    }
  }, []);

  const fetchConfigAndLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/whatsapp/official/config');
      if (!res.ok) return;
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
      }
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Error fetching official WhatsApp config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigAndLogs();
  }, [fetchConfigAndLogs]);

  const handleSaveConfig = async (override?: Partial<OfficialWhatsAppConfig>) => {
    setSavingConfig(true);
    const configToSave = { ...config, ...override };

    try {
      const res = await fetch('/api/whatsapp/official/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave)
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        toast({
          title: 'Configuración Guardada',
          description: 'Las credenciales y configuraciones de Meta WhatsApp Cloud API han sido actualizadas.'
        });
      } else {
        toast({ title: 'Error', description: data.error || 'No se pudo guardar la configuración.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Error de red al guardar la configuración.', variant: 'destructive' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleBot = async (checked: boolean) => {
    setConfig(prev => ({ ...prev, botActive: checked }));
    await handleSaveConfig({ botActive: checked });
  };

  const handleCopyWebhookUrl = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({ title: 'Copiado', description: 'URL de Webhook copiada al portapapeles.' });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestAi = async () => {
    if (!testUserQuery.trim()) return;
    setIsTestingAi(true);
    setTestAiReply('');
    try {
      const res = await fetch('/api/whatsapp/official/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: testUserQuery,
          customSystemPrompt: config.systemPrompt
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestAiReply(data.aiReply);
      } else {
        toast({ title: 'Error', description: data.error || 'Error al probar la IA.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión con la IA.', variant: 'destructive' });
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleSendManualMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendNumber || !sendText) return;

    setIsSendingManual(true);
    try {
      const res = await fetch('/api/whatsapp/official/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: sendNumber,
          message: sendText
        })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Mensaje Enviado', description: `Mensaje enviado vía Meta API a +${sendNumber}` });
        setSendText('');
        fetchConfigAndLogs();
      } else {
        toast({ title: 'Error al Enviar', description: data.error || 'Verifica las credenciales de Meta API.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error de Red', description: err.message, variant: 'destructive' });
    } finally {
      setIsSendingManual(false);
    }
  };

  const isConfigReady = !!(config.phoneNumberId && config.accessToken);

  return (
    <DashboardShell role="admin">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0c0c14] border border-slate-100 dark:border-white/5 p-6 rounded-3xl shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono text-[10px] uppercase">
                <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Meta WhatsApp Business Cloud API
              </Badge>
              {isConfigReady ? (
                <Badge className="bg-emerald-500 text-white font-black text-[10px] uppercase">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> API Lista y Configurada
                </Badge>
              ) : (
                <Badge variant="destructive" className="font-black text-[10px] uppercase">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Faltan Credenciales Meta
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-headline font-black text-slate-900 dark:text-white uppercase italic tracking-tight flex items-center gap-3">
              <Sparkles className="h-7 w-7 text-primary" /> API Oficial de WhatsApp Copilot
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Conecte las credenciales oficiales de Meta WhatsApp Business Cloud API para responder clientes de forma automatizada con Gemini 3.6 Flash.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={fetchConfigAndLogs}
              disabled={loading}
              variant="outline"
              className="h-11 px-4 rounded-2xl text-xs font-bold"
            >
              <RotateCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </Button>
          </div>
        </div>

        {/* Top Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-[#0c0c14] border-slate-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Respuesta Automática IA</p>
                <p className="text-lg font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  {config.botActive ? (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <Zap className="h-4 w-4" /> Activo (Gemini)
                    </span>
                  ) : (
                    <span className="text-amber-500 flex items-center gap-1">
                      Pausado
                    </span>
                  )}
                </p>
              </div>
              <Switch
                checked={config.botActive}
                onCheckedChange={handleToggleBot}
                disabled={savingConfig}
              />
            </div>
          </Card>

          <Card className="bg-white dark:bg-[#0c0c14] border-slate-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone Number ID (Meta)</p>
            <p className="text-sm font-black text-slate-900 dark:text-white mt-1 font-mono truncate">
              {config.phoneNumberId ? config.phoneNumberId : 'Sin configurar'}
            </p>
          </Card>

          <Card className="bg-white dark:bg-[#0c0c14] border-slate-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Modelo de IA</p>
            <p className="text-lg font-black text-primary mt-1 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> Gemini 3.6 Flash
            </p>
          </Card>

          <Card className="bg-white dark:bg-[#0c0c14] border-slate-100 dark:border-white/5 rounded-3xl p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mensajes Registrados</p>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
              {logs.length} <span className="text-xs font-normal text-slate-400">conversaciones</span>
            </p>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="credentials" className="space-y-6">
          <TabsList className="bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200/50 dark:border-white/5 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="credentials" className="rounded-xl text-xs font-black uppercase px-5 py-2.5">
              <Key className="h-4 w-4 mr-2" /> Credenciales API Meta
            </TabsTrigger>
            <TabsTrigger value="prompt" className="rounded-xl text-xs font-black uppercase px-5 py-2.5">
              <Settings className="h-4 w-4 mr-2" /> Prompt IA
            </TabsTrigger>
            <TabsTrigger value="logs" className="rounded-xl text-xs font-black uppercase px-5 py-2.5">
              <MessageSquare className="h-4 w-4 mr-2" /> Logs de Mensajes ({logs.length})
            </TabsTrigger>
            <TabsTrigger value="tester" className="rounded-xl text-xs font-black uppercase px-5 py-2.5">
              <Sparkles className="h-4 w-4 mr-2 text-primary" /> Probador IA
            </TabsTrigger>
            <TabsTrigger value="manual" className="rounded-xl text-xs font-black uppercase px-5 py-2.5">
              <Send className="h-4 w-4 mr-2" /> Envío Manual
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: META CREDENTIALS & WEBHOOK CONFIG */}
          <TabsContent value="credentials" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Credentials Form */}
              <Card className="lg:col-span-7 bg-white dark:bg-[#0c0c14] border-slate-100 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                    <Key className="h-5 w-5 text-emerald-500" /> Credenciales de Meta WhatsApp Business
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ingrese los datos obtenidos en Meta for Developers (WhatsApp Cloud API).
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ID del Número de Teléfono (Phone Number ID):
                    </label>
                    <Input
                      value={config.phoneNumberId}
                      onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                      placeholder="Ej. 102938475610293"
                      className="h-11 rounded-2xl text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Token de Acceso (Access Token de WhatsApp API):
                    </label>
                    <Input
                      type="password"
                      value={config.accessToken}
                      onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                      placeholder="EAAG..."
                      className="h-11 rounded-2xl text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      ID de la Cuenta de WhatsApp Business (Opcional):
                    </label>
                    <Input
                      value={config.businessAccountId || ''}
                      onChange={(e) => setConfig({ ...config, businessAccountId: e.target.value })}
                      placeholder="Ej. 98765432101234"
                      className="h-11 rounded-2xl text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Token de Verificación del Webhook (Verify Token):
                    </label>
                    <Input
                      value={config.verifyToken}
                      onChange={(e) => setConfig({ ...config, verifyToken: e.target.value })}
                      placeholder="Ej. sync_connect_verify_token_123"
                      className="h-11 rounded-2xl text-xs font-mono"
                    />
                    <p className="text-[11px] text-slate-400">
                      Utilice exactamente este mismo token al configurar el Webhook en el panel de Meta.
                    </p>
                  </div>

                  <Button
                    onClick={() => handleSaveConfig()}
                    disabled={savingConfig}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase h-11 px-6 rounded-2xl w-full shadow-lg"
                  >
                    {savingConfig ? <RotateCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Guardar Credenciales de Meta API
                  </Button>
                </div>
              </Card>

              {/* Webhook Copy & Setup Guide */}
              <Card className="lg:col-span-5 bg-white dark:bg-[#0c0c14] border-slate-100 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Configuración del Webhook en Meta
                  </h3>
                  <p className="text-xs text-slate-500">
                    Copie esta URL e ingrésela en su app de Meta Developers.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    URL de Webhook (Callback URL):
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={webhookUrl}
                      className="h-10 rounded-xl text-xs font-mono bg-white dark:bg-black/30"
                    />
                    <Button
                      onClick={handleCopyWebhookUrl}
                      variant="outline"
                      className="h-10 px-3 rounded-xl shrink-0"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                    Pasos en Meta for Developers:
                  </p>
                  <div className="flex gap-2 items-start">
                    <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <p>Acceda a <strong>developers.facebook.com</strong> y seleccione su App.</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <p>Vaya a <strong>WhatsApp &gt; Configuración</strong> y haga clic en <strong>Editar Webhook</strong>.</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <p>Pegue la <strong>URL de Webhook</strong> y el <strong>Token de Verificación</strong> definidos a la izquierda.</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                    <p>En el campo de suscripción del Webhook, active la opción <strong>messages</strong>.</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: SYSTEM PROMPT */}
          <TabsContent value="prompt" className="space-y-6">
            <Card className="bg-white dark:bg-[#0c0c14] border-slate-100 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" /> Prompt del Sistema de IA
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina las instrucciones que seguirá Gemini 3.6 Flash al responder a los clientes por WhatsApp.
                  </p>
                </div>

                <Button
                  onClick={() => handleSaveConfig()}
                  disabled={savingConfig}
                  className="bg-primary hover:bg-primary/90 text-slate-900 font-black text-xs uppercase px-5 h-10 rounded-xl shrink-0"
                >
                  Guardar Prompt
                </Button>
              </div>

              <div className="space-y-2">
                <Textarea
                  value={config.systemPrompt}
                  onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                  rows={14}
                  className="font-mono text-xs bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-2xl p-4 leading-relaxed"
                  placeholder="Escriba el prompt del sistema..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfig({ ...config, systemPrompt: DEFAULT_OFFICIAL_PROMPT })}
                  className="rounded-xl text-[11px] font-bold"
                >
                  Reestablecer Plantilla Oficial
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 3: LOGS */}
          <TabsContent value="logs" className="space-y-6">
            <Card className="bg-white dark:bg-[#0c0c14] border-slate-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-emerald-500" /> Historial de Mensajes Oficiales
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mensajes recibidos mediante Webhook de Meta y respuestas automáticas/manuales enviadas.
                  </p>
                </div>
                <Button onClick={fetchConfigAndLogs} variant="outline" size="sm" className="rounded-xl text-xs font-bold">
                  <RotateCw className="h-3.5 w-3.5 mr-1" /> Actualizar
                </Button>
              </div>

              <div className="mt-4 space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {logs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 italic text-xs">
                    No se han recibido mensajes aún. Pruebe enviando un WhatsApp a su número oficial de Meta.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div 
                      key={log.id || Math.random()} 
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                          <PhoneCall className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{log.senderName}</span>
                          <span className="font-mono text-slate-400">(+{log.fromNumber})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                          {log.status === 'replied' && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px]">
                              Respondido por IA
                            </Badge>
                          )}
                          {log.status === 'manual' && (
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[9px]">
                              Manual (Admin)
                            </Badge>
                          )}
                          {log.status === 'error' && (
                            <Badge variant="destructive" className="text-[9px]">
                              Error Meta API
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-black/30 border border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300 font-mono">
                        <span className="font-bold text-slate-400 mr-2">Cliente:</span> {log.text}
                      </div>

                      {log.aiReply && (
                        <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 text-emerald-900 dark:text-emerald-300 font-mono">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 mr-2">IA SyncConnect:</span> {log.aiReply}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          {/* TAB 4: TESTER */}
          <TabsContent value="tester" className="space-y-6">
            <Card className="bg-white dark:bg-[#0c0c14] border-slate-100 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Simulador de IA de WhatsApp
                </h3>
                <p className="text-xs text-slate-500">
                  Realice consultas de prueba para simular cómo responderá la IA a preguntas reales.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={testUserQuery}
                    onChange={(e) => setTestUserQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTestAi()}
                    placeholder="Escriba su consulta de prueba..."
                    className="h-11 rounded-2xl text-xs font-mono"
                  />
                  <Button
                    onClick={handleTestAi}
                    disabled={isTestingAi || !testUserQuery.trim()}
                    className="bg-primary hover:bg-primary/90 text-slate-900 font-black text-xs h-11 px-6 rounded-2xl shrink-0"
                  >
                    {isTestingAi ? <RotateCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                    Probar IA
                  </Button>
                </div>

                {testAiReply && (
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> Respuesta Generada por Gemini 3.6 Flash:
                    </p>
                    <div className="whitespace-pre-wrap font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed bg-white dark:bg-black/40 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                      {testAiReply}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* TAB 5: MANUAL SENDER */}
          <TabsContent value="manual" className="space-y-6">
            <Card className="bg-white dark:bg-[#0c0c14] border-slate-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
              <form onSubmit={handleSendManualMessage} className="space-y-4 max-w-xl">
                <div>
                  <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                    <Send className="h-5 w-5 text-emerald-500" /> Enviar Mensaje Directo con Meta API
                  </h3>
                  <p className="text-xs text-slate-500">
                    Envíe un mensaje de WhatsApp a un cliente utilizando su API Oficial de Meta.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Número de WhatsApp Destino (con código de país, ej. 50588062712):
                  </label>
                  <Input
                    value={sendNumber}
                    onChange={(e) => setSendNumber(e.target.value)}
                    placeholder="Ej. 50588062712"
                    className="h-11 rounded-2xl text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mensaje de Texto:
                  </label>
                  <Textarea
                    value={sendText}
                    onChange={(e) => setSendText(e.target.value)}
                    rows={4}
                    placeholder="Escriba su mensaje aquí..."
                    className="text-xs font-mono rounded-2xl"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSendingManual || !isConfigReady || !sendNumber || !sendText}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-11 px-6 rounded-2xl w-full"
                >
                  {isSendingManual ? <RotateCw className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Enviar Mensaje por Meta Cloud API
                </Button>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
