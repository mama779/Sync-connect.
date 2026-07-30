/**
 * OpenWA WhatsApp Web Microservice 24/7
 * Impulsado por @open-wa/wa-automate, Express y WebSockets.
 * Diseñado para ejecutarse de forma persistente en VPS, Docker, Railway, Render o Termux.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const wa = require('@open-wa/wa-automate');

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.OPENWA_API_SECRET || process.env.OPENWA_API_KEY || 'sync_connect_openwa_secret_2026';
const NEXT_WEBHOOK_URL = process.env.NEXT_WEBHOOK_URL || 'http://localhost:3000/api/whatsapp/openwa/webhook';
const SESSION_NAME = process.env.SESSION_NAME || 'sync_connect_openwa_session';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Memory State
let clientInstance = null;
let currentStatus = 'DISCONNECTED'; // DISCONNECTED, INITIALIZING, WAITING_QR, CONNECTED, RECONNECTING, ERROR
let currentQrCodeDataUrl = null;
let currentRawQr = null;
let lastConnectedAt = null;
let lastError = null;
let deviceInfo = null;
let logs = [];
const startTime = Date.now();

// Helper to record logs in memory
function addLog(level, message, details = null) {
  const item = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    level, // 'info', 'warn', 'error', 'success'
    message,
    details
  };
  logs.unshift(item);
  if (logs.length > 150) logs.pop();

  console.log(`[OpenWA Microservice] [${level.toUpperCase()}] ${message}`);
  broadcastToWs({ type: 'LOG_EVENT', data: item });

  // Optional: Send status sync to Next.js Webhook
  notifyNextJsStateChange().catch(() => {});
}

// Broadcast WebSocket message to connected clients
function broadcastToWs(payload) {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Notify Next.js Webhook of status updates
async function notifyNextJsStateChange() {
  if (!NEXT_WEBHOOK_URL) return;
  try {
    const payload = {
      event: 'STATE_CHANGED',
      status: currentStatus,
      qrCodeUrl: currentQrCodeDataUrl,
      deviceInfo,
      lastConnectedAt,
      lastError,
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000)
    };

    fetch(NEXT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-openwa-api-key': API_KEY
      },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch (err) {
    // Ignore webhook notify error silently
  }
}

// Middleware Security Check
function authenticateApiKey(req, res, next) {
  const apiKeyHeader = req.headers['x-openwa-api-key'] || req.query.api_key;
  if (!apiKeyHeader || apiKeyHeader !== API_KEY) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado. API Key inválida.' });
  }
  next();
}

// Initialize OpenWA Client
async function initializeWhatsAppClient() {
  if (clientInstance) {
    addLog('info', 'El cliente ya se encuentra en proceso o iniciado.');
    return;
  }

  currentStatus = 'INITIALIZING';
  currentQrCodeDataUrl = null;
  currentRawQr = null;
  addLog('info', `Iniciando motor OpenWA con sesión "${SESSION_NAME}"...`);

  try {
    const options = {
      sessionId: SESSION_NAME,
      multiDevice: true,
      authTimeout: 60000,
      qrTimeout: 0,
      useChrome: false,
      restartOnCrash: true,
      cacheEnabled: false,
      headless: true,
      devtools: false,
      logConsole: false,
      disableSpins: true,
      autoRefresh: true,
      qrRefreshInterval: 15000,
      executablePath: process.env.CHROME_PATH || undefined,
      qrCallback: async (qrCode, asciiQR, attempt, urlCode) => {
        currentStatus = 'WAITING_QR';
        currentRawQr = qrCode;
        try {
          currentQrCodeDataUrl = await QRCode.toDataURL(qrCode, { margin: 2, scale: 6 });
          addLog('info', `Nuevo Código QR generado (Intento ${attempt}). Escanéalo en WhatsApp.`);
          broadcastToWs({
            type: 'QR_CODE',
            data: { qrCodeDataUrl: currentQrCodeDataUrl, raw: qrCode, attempt }
          });
        } catch (qrErr) {
          addLog('error', 'Error al convertir QR a DataURL', qrErr.message);
        }
      }
    };

    clientInstance = await wa.create(options);

    currentStatus = 'CONNECTED';
    currentQrCodeDataUrl = null;
    lastConnectedAt = new Date().toISOString();
    lastError = null;

    addLog('success', '✅ WhatsApp conectado exitosamente con OpenWA.');

    // Fetch device details
    try {
      const hostNumber = await clientInstance.getHostNumber();
      const pushname = await clientInstance.getMyContact().then(c => c.pushname || c.formattedName || 'WhatsApp Host');
      const battery = await clientInstance.getBatteryLevel();
      const waVersion = await clientInstance.getWAVersion();

      deviceInfo = {
        phone: hostNumber ? `+${hostNumber}` : 'Desconocido',
        pushname: pushname || 'Cuenta Vinculada',
        platform: 'OpenWA Web',
        battery: typeof battery === 'number' ? battery : 100,
        waVersion: waVersion || 'Web'
      };

      addLog('info', `Información de dispositivo: Teléfono ${deviceInfo.phone}, Batería ${deviceInfo.battery}%`);
    } catch (devErr) {
      addLog('warn', 'No se pudieron obtener todos los detalles del dispositivo:', devErr.message);
    }

    // Handle Incoming Messages
    clientInstance.onMessage(async (message) => {
      try {
        if (message.isGroupMsg) return; // Skip group messages by default

        const fromNumber = message.from.replace('@c.us', '').replace('+', '');
        const senderName = message.sender?.pushname || message.sender?.shortName || 'Cliente';
        const userText = message.body || message.caption || '';

        addLog('info', `Mensaje recibido de ${senderName} (+${fromNumber}): "${userText.substring(0, 50)}"`);

        // Forward to Next.js Webhook
        if (NEXT_WEBHOOK_URL) {
          fetch(NEXT_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-openwa-api-key': API_KEY
            },
            body: JSON.stringify({
              event: 'INCOMING_MESSAGE',
              messageId: message.id,
              fromNumber,
              senderName,
              text: userText,
              timestamp: new Date().toISOString()
            })
          }).then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              // If Next.js returned an AI reply, auto-respond via OpenWA
              if (data.replyText && clientInstance) {
                await clientInstance.sendText(message.from, data.replyText);
                addLog('success', `Respuesta automática enviada a +${fromNumber}`);
              }
            }
          }).catch((err) => {
            addLog('warn', `Error al enviar mensaje a Webhook de Next.js: ${err.message}`);
          });
        }
      } catch (msgErr) {
        addLog('error', 'Error procesando mensaje entrante:', msgErr.message);
      }
    });

    // Handle State Changes & Auto-Reconnect
    clientInstance.onStateChanged(async (state) => {
      addLog('warn', `Estado de sesión WhatsApp cambió a: ${state}`);
      if (state === 'CONFLICT' || state === 'UNLAUNCHED') {
        currentStatus = 'RECONNECTING';
        addLog('warn', 'Reconectando cliente de WhatsApp en 5 segundos...');
        setTimeout(() => handleAutoReconnect(), 5000);
      } else if (state === 'UNPAIRED') {
        currentStatus = 'DISCONNECTED';
        deviceInfo = null;
        addLog('warn', 'La cuenta ha sido desvinculada desde el teléfono.');
      }
    });

  } catch (err) {
    currentStatus = 'ERROR';
    lastError = err.message || 'Error al inicializar OpenWA';
    addLog('error', `Fallo en inicialización de OpenWA: ${lastError}`);
    clientInstance = null;
  }
}

// Auto Reconnect Loop
async function handleAutoReconnect() {
  if (currentStatus === 'CONNECTED') return;
  addLog('info', 'Ejecutando reconexión automática de OpenWA...');
  if (clientInstance) {
    try { await clientInstance.kill(); } catch (e) {}
    clientInstance = null;
  }
  await initializeWhatsAppClient();
}

// REST Endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'openwa-microservice', uptime: Math.floor((Date.now() - startTime) / 1000) });
});

app.get('/api/status', authenticateApiKey, (req, res) => {
  res.json({
    success: true,
    status: currentStatus,
    qrCodeDataUrl: currentQrCodeDataUrl,
    deviceInfo,
    lastConnectedAt,
    lastError,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    nextWebhookUrl: NEXT_WEBHOOK_URL
  });
});

app.get('/api/qr', authenticateApiKey, (req, res) => {
  res.json({
    success: true,
    status: currentStatus,
    qrCodeDataUrl: currentQrCodeDataUrl,
    rawQr: currentRawQr
  });
});

app.post('/api/connect', authenticateApiKey, async (req, res) => {
  if (currentStatus === 'CONNECTED') {
    return res.json({ success: true, message: 'Ya se encuentra conectado.', status: currentStatus });
  }

  initializeWhatsAppClient().catch(err => {
    addLog('error', 'Error en trigger de conexión:', err.message);
  });

  res.json({ success: true, message: 'Proceso de vinculación iniciado.', status: 'INITIALIZING' });
});

app.post('/api/disconnect', authenticateApiKey, async (req, res) => {
  addLog('info', 'Solicitud de desvinculación/cerrar sesión recibida.');
  if (clientInstance) {
    try {
      await clientInstance.logout();
      await clientInstance.kill();
    } catch (err) {
      addLog('warn', 'Error al cerrar sesión:', err.message);
    }
    clientInstance = null;
  }

  currentStatus = 'DISCONNECTED';
  currentQrCodeDataUrl = null;
  deviceInfo = null;

  // Optionally delete session files
  const sessionDir = path.join(__dirname, SESSION_NAME);
  if (fs.existsSync(sessionDir)) {
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      addLog('info', 'Archivos de sesión eliminados.');
    } catch (e) {}
  }

  res.json({ success: true, message: 'Sesión de WhatsApp cerrada exitosamente.' });
});

app.post('/api/restart', authenticateApiKey, async (req, res) => {
  addLog('info', 'Reiniciando demonio OpenWA...');
  if (clientInstance) {
    try { await clientInstance.kill(); } catch (e) {}
    clientInstance = null;
  }

  currentStatus = 'RECONNECTING';
  setTimeout(() => {
    initializeWhatsAppClient();
  }, 2000);

  res.json({ success: true, message: 'Reinicio en progreso.' });
});

app.post('/api/send-message', authenticateApiKey, async (req, res) => {
  const { to, text, mediaUrl } = req.body;
  if (!to || !text) {
    return res.status(400).json({ success: false, error: 'Faltan parámetros: "to" y "text" son requeridos.' });
  }

  if (currentStatus !== 'CONNECTED' || !clientInstance) {
    return res.status(503).json({ success: false, error: 'Servicio de WhatsApp no está conectado actualmente.' });
  }

  try {
    const formattedNumber = `${to.replace(/[^0-9]/g, '')}@c.us`;
    let result;

    if (mediaUrl) {
      result = await clientInstance.sendFile(formattedNumber, mediaUrl, 'file', text);
    } else {
      result = await clientInstance.sendText(formattedNumber, text);
    }

    addLog('success', `Mensaje enviado exitosamente a +${to}`);
    res.json({ success: true, message: 'Mensaje enviado.', result });
  } catch (err) {
    addLog('error', `Error al enviar mensaje a +${to}: ${err.message}`);
    res.status(500).json({ success: false, error: err.message || 'Error al enviar mensaje' });
  }
});

app.get('/api/logs', authenticateApiKey, (req, res) => {
  res.json({ success: true, logs });
});

// WebSocket Connection Handling
wss.on('connection', (ws, req) => {
  ws.send(JSON.stringify({
    type: 'INIT',
    data: {
      status: currentStatus,
      qrCodeDataUrl: currentQrCodeDataUrl,
      deviceInfo,
      logs: logs.slice(0, 30)
    }
  }));
});

// Auto-start client on process boot if session exists
if (fs.existsSync(path.join(__dirname, SESSION_NAME))) {
  addLog('info', 'Sesión previa detectada. Iniciando reconexión automática 24/7...');
  initializeWhatsAppClient();
} else {
  addLog('info', 'Servicio OpenWA listo. Esperando comando de vinculación desde el panel.');
}

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Microservicio OpenWA 24/7 activo en puerto: ${PORT}`);
  console.log(`🔐 API Key de Seguridad: ${API_KEY}`);
  console.log(`📡 Webhook Next.js: ${NEXT_WEBHOOK_URL}`);
  console.log(`=======================================================`);
});
