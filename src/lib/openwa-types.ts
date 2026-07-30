export interface OpenWAConfig {
  serviceUrl: string; // e.g. http://vps-ip:8080 or http://localhost:8080
  apiKey: string;     // Secret key for authenticating with OpenWA microservice
  botActive: boolean;
  systemPrompt: string;
  autoReconnect: boolean;
  webhookUrl?: string;
  updatedAt?: string;
}

export interface OpenWADeviceInfo {
  phone?: string;
  pushname?: string;
  platform?: string;
  battery?: number;
  plugged?: boolean;
  waVersion?: string;
}

export interface OpenWASessionState {
  status: 'DISCONNECTED' | 'INITIALIZING' | 'WAITING_QR' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';
  qrCodeUrl?: string;
  deviceInfo?: OpenWADeviceInfo;
  lastConnectedAt?: string;
  lastError?: string;
  uptimeSeconds?: number;
  updatedAt: string;
}

export interface OpenWALog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: any;
}

export interface OpenWAMessageLog {
  id: string;
  fromNumber: string;
  senderName: string;
  userText: string;
  aiReply?: string;
  status: 'received' | 'replied' | 'manual' | 'error';
  timestamp: string;
  mediaUrl?: string;
}

export const DEFAULT_OPENWA_PROMPT = `Eres SyncConnect Copilot, el asistente oficial de atención al cliente en WhatsApp impulsado por inteligencia artificial.
Tu objetivo es responder a los clientes con amabilidad, rapidez, precisión y profesionalismo.

Tus funciones principales:
1. Brindar información sobre los cursos, productos y servicios de SyncConnect.
2. Ayudar a los usuarios con problemas de acceso o consultas de soporte general.
3. Guiar a los clientes para registrarse o ingresar al panel de administración.
4. Mantener respuestas concisas (máximo 2 a 3 párrafos), claras e ideales para lectura en dispositivos móviles.

Reglas de respuesta:
- Sé siempre cortés y profesional.
- Utiliza emojis apropiados para hacer la conversación agradable.
- No proporciones datos falsos o no autorizados.
- Si no sabes una respuesta específica, indica amablemente que escalarás la consulta con el equipo de soporte técnico.`;
