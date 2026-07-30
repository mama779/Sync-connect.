'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Terminal as TerminalIcon, 
  Play, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  Package, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  Download, 
  Maximize2, 
  Minimize2, 
  Folder,
  Code
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LogEntry {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  success: boolean;
  timestamp: string;
  durationMs?: number;
}

export default function TerminalPage() {
  const { toast } = useToast();
  const [inputCommand, setInputCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      command: 'system info',
      stdout: 'Sync Connect System Shell v1.0.0\nEntorno Cloud Run activo.\nModulo @whiskeysockets/baileys disponible para instalación.',
      stderr: '',
      success: true,
      timestamp: new Date().toLocaleTimeString(),
      durationMs: 12
    }
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [baileysInstalled, setBaileysInstalled] = useState<boolean | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Check Baileys on load
  useEffect(() => {
    checkBaileysStatus();
  }, []);

  const checkBaileysStatus = async () => {
    try {
      const res = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'npm list @whiskeysockets/baileys' })
      });
      const data = await res.json();
      if (data.success && data.stdout && data.stdout.includes('@whiskeysockets/baileys')) {
        setBaileysInstalled(true);
      } else {
        setBaileysInstalled(false);
      }
    } catch {
      setBaileysInstalled(false);
    }
  };

  const handleExecute = async (cmdToRun?: string) => {
    const cmd = cmdToRun || inputCommand;
    if (!cmd.trim() || isExecuting) return;

    setIsExecuting(true);
    setInputCommand('');

    // Add to history
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    try {
      const res = await fetch('/api/terminal/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });

      const data = await res.json();

      const newEntry: LogEntry = {
        id: Math.random().toString(36).substring(7),
        command: data.command || cmd,
        stdout: data.stdout || (data.error ? '' : 'Ejecutado sin retorno.'),
        stderr: data.stderr || data.error || '',
        success: data.success !== false,
        timestamp: new Date().toLocaleTimeString(),
        durationMs: data.durationMs
      };

      setLogs(prev => [...prev, newEntry]);

      if (cmd.includes('baileys')) {
        checkBaileysStatus();
      }
    } catch (err: any) {
      setLogs(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          command: cmd,
          stdout: '',
          stderr: err.message || 'Error de red o timeout al ejecutar',
          success: false,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsExecuting(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleExecute();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(nextIndex);
      setInputCommand(commandHistory[commandHistory.length - 1 - nextIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setInputCommand(commandHistory[commandHistory.length - 1 - nextIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCommand('');
      }
    }
  };

  const clearTerminal = () => {
    setLogs([]);
    toast({ title: 'Terminal limpiada', description: 'Se eliminó el historial de pantalla.' });
  };

  const copyLogs = () => {
    const text = logs
      .map(l => `[$ ${l.command}]\n${l.stdout}${l.stderr ? '\nERR: ' + l.stderr : ''}`)
      .join('\n------------------------\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado', description: 'El registro de la terminal ha sido copiado al portapapeles.' });
  };

  return (
    <DashboardShell role="admin">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0c0c14] border border-slate-100 dark:border-white/5 p-6 rounded-3xl shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono text-[10px] uppercase">
                <ShieldCheck className="h-3 w-3 mr-1" /> Consola de Comandos
              </Badge>
              {baileysInstalled === true && (
                <Badge className="bg-emerald-500 text-white font-mono text-[10px] uppercase">
                  Baileys Instalado
                </Badge>
              )}
              {baileysInstalled === false && (
                <Badge variant="destructive" className="font-mono text-[10px] uppercase">
                  Baileys No Instalado
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-headline font-black text-slate-900 dark:text-white uppercase italic tracking-tight flex items-center gap-3">
              <TerminalIcon className="h-7 w-7 text-primary animate-pulse" /> Terminal para Baileys
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gestione paquetes npm, instale la librería Baileys para WhatsApp y ejecute verificaciones en el servidor.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleExecute('npm install @whiskeysockets/baileys')}
              disabled={isExecuting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider h-11 px-5 rounded-2xl shadow-lg"
            >
              <Download className="h-4 w-4 mr-2" /> Instalar Baileys
            </Button>
            <Button
              onClick={checkBaileysStatus}
              variant="outline"
              disabled={isExecuting}
              className="h-11 px-4 rounded-2xl font-bold text-xs"
            >
              <RotateCw className={`h-4 w-4 ${isExecuting ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Quick Presets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            onClick={() => handleExecute('npm install @whiskeysockets/baileys')}
            className="cursor-pointer hover:border-primary transition-all bg-white dark:bg-[#0c0c14] border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black text-xs text-slate-900 dark:text-white uppercase">Instalar Baileys</p>
                <p className="text-[10px] text-slate-400 font-mono">npm i @whiskeysockets/baileys</p>
              </div>
            </div>
          </Card>

          <Card 
            onClick={() => handleExecute('npm list @whiskeysockets/baileys')}
            className="cursor-pointer hover:border-primary transition-all bg-white dark:bg-[#0c0c14] border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black text-xs text-slate-900 dark:text-white uppercase">Verificar Estado</p>
                <p className="text-[10px] text-slate-400 font-mono">npm list @whiskeysockets/baileys</p>
              </div>
            </div>
          </Card>

          <Card 
            onClick={() => handleExecute('node -v && npm -v')}
            className="cursor-pointer hover:border-primary transition-all bg-white dark:bg-[#0c0c14] border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black text-xs text-slate-900 dark:text-white uppercase">Versión de Node/NPM</p>
                <p className="text-[10px] text-slate-400 font-mono">node -v && npm -v</p>
              </div>
            </div>
          </Card>

          <Card 
            onClick={() => handleExecute('ls -la')}
            className="cursor-pointer hover:border-primary transition-all bg-white dark:bg-[#0c0c14] border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Folder className="h-5 w-5" />
              </div>
              <div>
                <p className="font-black text-xs text-slate-900 dark:text-white uppercase">Directorio Raíz</p>
                <p className="text-[10px] text-slate-400 font-mono">ls -la</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Terminal Window */}
        <div className={`transition-all duration-300 rounded-3xl overflow-hidden border border-slate-800 bg-[#07090e] shadow-2xl ${
          isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)] flex flex-col' : ''
        }`}>
          {/* Terminal Window Bar */}
          <div className="bg-[#0f131d] px-5 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-xs font-mono text-slate-400 font-semibold flex items-center gap-2">
                <Code className="h-3.5 w-3.5 text-emerald-400" /> root@sync-connect:~/app#
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyLogs}
                className="h-8 px-2.5 text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
              >
                <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearTerminal}
                className="h-8 px-2.5 text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpiar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 px-2.5 text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Terminal Output Area */}
          <div className={`p-6 font-mono text-xs overflow-y-auto space-y-4 text-slate-200 select-text ${
            isFullscreen ? 'flex-1' : 'min-h-[380px] max-h-[550px]'
          }`}>
            {logs.length === 0 ? (
              <p className="text-slate-600 italic">Consola limpia. Escriba un comando a continuación...</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="space-y-1.5 border-b border-slate-800/60 pb-3 last:border-0">
                  <div className="flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">$</span>
                      <span className="text-white font-bold">{log.command}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      {log.durationMs && <span className="text-slate-500">{log.durationMs}ms</span>}
                      <span className="text-slate-600">{log.timestamp}</span>
                      {log.success ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                      )}
                    </div>
                  </div>

                  {log.stdout && (
                    <pre className="whitespace-pre-wrap text-emerald-300/90 bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/30 font-mono text-[11px]">
                      {log.stdout}
                    </pre>
                  )}

                  {log.stderr && (
                    <pre className="whitespace-pre-wrap text-red-300/90 bg-red-950/20 p-3 rounded-xl border border-red-900/30 font-mono text-[11px]">
                      {log.stderr}
                    </pre>
                  )}
                </div>
              ))
            )}

            {isExecuting && (
              <div className="flex items-center gap-2 text-amber-400 animate-pulse pt-2">
                <RotateCw className="h-4 w-4 animate-spin" />
                <span>Ejecutando comando en el servidor...</span>
              </div>
            )}

            <div ref={terminalEndRef} />
          </div>

          {/* Terminal Input Bar */}
          <div className="bg-[#0b0e17] p-4 border-t border-slate-800 flex items-center gap-3">
            <span className="text-emerald-400 font-bold font-mono text-sm shrink-0">$</span>
            <Input
              ref={inputRef}
              value={inputCommand}
              onChange={(e) => setInputCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escriba un comando (ej. npm install @whiskeysockets/baileys)..."
              disabled={isExecuting}
              className="bg-transparent border-none text-emerald-300 placeholder:text-slate-600 font-mono text-xs focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
            />
            <Button
              onClick={() => handleExecute()}
              disabled={isExecuting || !inputCommand.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl shrink-0"
            >
              <Play className="h-3.5 w-3.5 mr-1" /> Ejecutar
            </Button>
          </div>
        </div>

        {/* Documentation / Info Card */}
        <Card className="bg-white dark:bg-[#0c0c14] border-slate-100 dark:border-white/5 rounded-3xl p-6 shadow-sm">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Acerca de Baileys WhatsApp Library
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              <code className="text-emerald-500 font-mono">@whiskeysockets/baileys</code> es la biblioteca oficial WebSocket TypeScript para conectar con la API de WhatsApp Web.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <p>
              • Utilice el botón <strong>&quot;Instalar Baileys&quot;</strong> para asegurar que los módulos estén instalados en el servidor.
            </p>
            <p>
              • Los resultados de la ejecución se muestran en tiempo real en la pantalla estilo terminal con códigos de salida y registros stderr / stdout.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
