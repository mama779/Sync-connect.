import { adminDb } from './firebase-admin';
import { GoogleGenAI } from '@google/genai';
import { generateGeminiContent } from './gemini-helper';
import { 
  OpenWAConfig, 
  OpenWADeviceInfo, 
  OpenWASessionState, 
  OpenWALog, 
  OpenWAMessageLog, 
  DEFAULT_OPENWA_PROMPT 
} from './openwa-types';

export type { OpenWAConfig, OpenWADeviceInfo, OpenWASessionState, OpenWALog, OpenWAMessageLog };
export { DEFAULT_OPENWA_PROMPT };

const CONFIG_DOC_PATH = 'site_config/openwa_config';
const STATE_DOC_PATH = 'openwa_session/current_state';

export async function getOpenWAConfig(): Promise<OpenWAConfig> {
  const defaultConfig: OpenWAConfig = {
    serviceUrl: process.env.OPENWA_SERVICE_URL || 'http://localhost:8080',
    apiKey: process.env.OPENWA_API_KEY || 'sync_connect_openwa_secret_2026',
    botActive: true,
    systemPrompt: DEFAULT_OPENWA_PROMPT,
    autoReconnect: true,
  };

  try {
    if (adminDb) {
      const docSnap = await adminDb.doc(CONFIG_DOC_PATH).get();
      if (docSnap.exists) {
        const data = docSnap.data();
        return {
          serviceUrl: data?.serviceUrl || defaultConfig.serviceUrl,
          apiKey: data?.apiKey || defaultConfig.apiKey,
          botActive: typeof data?.botActive === 'boolean' ? data.botActive : defaultConfig.botActive,
          systemPrompt: data?.systemPrompt || defaultConfig.systemPrompt,
          autoReconnect: typeof data?.autoReconnect === 'boolean' ? data.autoReconnect : defaultConfig.autoReconnect,
          webhookUrl: data?.webhookUrl,
          updatedAt: data?.updatedAt,
        };
      }
    }
  } catch (err) {
    console.warn('[OpenWA Service] Error reading config from Firestore, using default config:', err);
  }

  return defaultConfig;
}

export async function saveOpenWAConfig(config: Partial<OpenWAConfig>): Promise<OpenWAConfig> {
  const current = await getOpenWAConfig();
  const updated: OpenWAConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
  };

  try {
    if (adminDb) {
      await adminDb.doc(CONFIG_DOC_PATH).set(updated, { merge: true });
    }
  } catch (err) {
    console.error('[OpenWA Service] Error saving config to Firestore:', err);
  }

  return updated;
}

export async function getOpenWASessionState(): Promise<OpenWASessionState> {
  const defaultState: OpenWASessionState = {
    status: 'DISCONNECTED',
    updatedAt: new Date().toISOString(),
  };

  try {
    if (adminDb) {
      const docSnap = await adminDb.doc(STATE_DOC_PATH).get();
      if (docSnap.exists) {
        return docSnap.data() as OpenWASessionState;
      }
    }
  } catch (err) {
    console.warn('[OpenWA Service] Error getting session state:', err);
  }

  return defaultState;
}

export async function updateOpenWASessionState(state: Partial<OpenWASessionState>): Promise<void> {
  try {
    if (adminDb) {
      await adminDb.doc(STATE_DOC_PATH).set(
        {
          ...state,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.error('[OpenWA Service] Error updating session state:', err);
  }
}

// Call external OpenWA microservice helper
export async function callOpenWAMicroservice(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  const config = await getOpenWAConfig();
  if (!config.serviceUrl) {
    return { success: false, error: 'URL del microservicio OpenWA no configurada' };
  }

  const cleanUrl = config.serviceUrl.replace(/\/+$/, '');
  const targetUrl = `${cleanUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5 second fast timeout

    const res = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-openwa-api-key': config.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        error: `Servicio OpenWA respondió con status ${res.status}: ${errText}`,
      };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    console.error(`[OpenWA Service] Fetch error (${targetUrl}):`, err);
    return {
      success: false,
      error: err.name === 'AbortError' 
        ? 'Tiempo de espera agotado al conectar con el microservicio OpenWA' 
        : (err.message || 'Error de conexión con microservicio OpenWA'),
    };
  }
}

// Logger helper for OpenWA events
export async function logOpenWAEvent(
  level: 'info' | 'warn' | 'error' | 'success',
  message: string,
  details?: any
): Promise<void> {
  const logItem: OpenWALog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    details: details ? JSON.parse(JSON.stringify(details)) : undefined,
  };

  try {
    if (adminDb) {
      await adminDb.collection('openwa_logs').doc(logItem.id).set(logItem);
    }
  } catch (err) {
    console.warn('[OpenWA Logger] Failed to persist log:', err);
  }
}

export async function getOpenWALogs(limitCount = 50): Promise<OpenWALog[]> {
  try {
    if (adminDb) {
      const snap = await adminDb
        .collection('openwa_logs')
        .orderBy('timestamp', 'desc')
        .limit(limitCount)
        .get();

      return snap.docs.map((doc) => doc.data() as OpenWALog);
    }
  } catch (err) {
    console.warn('[OpenWA Logger] Failed to fetch logs:', err);
  }
  return [];
}

// Message Log helper
export async function logOpenWAMessage(msg: Omit<OpenWAMessageLog, 'id' | 'timestamp'>): Promise<void> {
  const item: OpenWAMessageLog = {
    ...msg,
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    if (adminDb) {
      await adminDb.collection('openwa_messages').doc(item.id).set(item);
    }
  } catch (err) {
    console.warn('[OpenWA Message Log] Failed to save message log:', err);
  }
}

export async function getOpenWAMessageLogs(limitCount = 50): Promise<OpenWAMessageLog[]> {
  try {
    if (adminDb) {
      const snap = await adminDb
        .collection('openwa_messages')
        .orderBy('timestamp', 'desc')
        .limit(limitCount)
        .get();

      return snap.docs.map((doc) => doc.data() as OpenWAMessageLog);
    }
  } catch (err) {
    console.warn('[OpenWA Message Log] Error getting message logs:', err);
  }
  return [];
}

// Generate AI Reply using Gemini 3.6 Flash
export async function generateOpenWAAiReply(userPrompt: string, customSystemPrompt?: string): Promise<string> {
  try {
    const config = await getOpenWAConfig();
    const systemPrompt = customSystemPrompt || config.systemPrompt || DEFAULT_OPENWA_PROMPT;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no configurada');
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await generateGeminiContent(ai, {
      model: 'gemini-3.6-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: `[INSTRUCCIONES DEL SISTEMA]\n${systemPrompt}\n\n[MENSAJE DEL CLIENTE EN WHATSAPP]\n${userPrompt}` }
          ]
        }
      ]
    });

    return response.text || 'Gracias por tu mensaje. Un agente te responderá a la brevedad.';
  } catch (err: any) {
    console.error('[OpenWA Gemini AI] Error generating response:', err);
    return 'Hola, en este momento estamos experimentando una breve interrupción. Nos comunicaremos contigo pronto.';
  }
}
