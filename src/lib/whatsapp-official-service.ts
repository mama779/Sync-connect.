import { GoogleGenAI } from '@google/genai';
import { generateGeminiContent } from '@/lib/gemini-helper';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';

export const DEFAULT_OFFICIAL_PROMPT = `Eres el Asistente Oficial de Inteligencia Artificial de SyncConnect en WhatsApp.
Tu objetivo es ayudar a los clientes, afiliados y compradores con información precisa, amable y profesional sobre la plataforma SyncConnect.

Información Clave sobre SyncConnect:
- ¿Qué es SyncConnect?: Es una plataforma digital todo en uno para marketing de afiliados, ventas de productos digitales, automatización de cursos y construcción de páginas web de alta conversión.
- Programas y Beneficios:
  1. Academia Digital: Cursos exclusivos sobre marketing, ventas, automatización y creación de embudos.
  2. Sistema de Afiliados: Comisiones atractivas por recomendar productos digitales y membresías.
  3. Site Builder (Creador de Sitios): Herramientas con IA para generar landing pages personalizadas en segundos.
  4. Métodos de Pago: Pagos seguros mediante PayPal y tarjetas de crédito/débito en tiempo real.
- Instrucciones de comportamiento:
  - Mantén respuestas claras, concisas y listas para WhatsApp (máximo 2-4 párrafos o listas con viñetas).
  - Utiliza un tono entusiasta, profesional y servicial.
  - Si el usuario requiere soporte técnico personalizado o humano, indica que un agente se comunicará a la brevedad.
  - Ofrece enlaces relevantes cuando aplique (por ejemplo: /dashboard, /checkout, /academy).
  - No inventes precios o promesas de ingresos desproporcionados.`;

export interface OfficialWhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId?: string;
  verifyToken: string;
  botActive: boolean;
  systemPrompt: string;
  updatedAt?: string;
}

export interface OfficialWhatsAppLog {
  id?: string;
  fromNumber: string;
  senderName: string;
  text: string;
  aiReply?: string;
  timestamp: string;
  status: 'received' | 'replied' | 'error' | 'manual';
  errorDetails?: string;
}

const DEFAULT_CONFIG: OfficialWhatsAppConfig = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'syncconnect123',
  botActive: true,
  systemPrompt: DEFAULT_OFFICIAL_PROMPT,
};

// Fetch official WhatsApp config from Firestore or default env
export async function getOfficialWhatsAppConfig(): Promise<OfficialWhatsAppConfig> {
  try {
    const { firestore } = initializeFirebase();
    const docRef = doc(firestore, 'site_config', 'whatsapp-official');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<OfficialWhatsAppConfig>;
      return {
        phoneNumberId: data.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        accessToken: data.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '',
        businessAccountId: data.businessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
        verifyToken: data.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || 'syncconnect123',
        botActive: typeof data.botActive === 'boolean' ? data.botActive : true,
        systemPrompt: data.systemPrompt || DEFAULT_OFFICIAL_PROMPT,
        updatedAt: data.updatedAt
      };
    }
  } catch (err) {
    console.warn("Error reading whatsapp-official config from Firestore:", err);
  }

  return DEFAULT_CONFIG;
}

// Save official WhatsApp config to Firestore
export async function saveOfficialWhatsAppConfig(config: Partial<OfficialWhatsAppConfig>): Promise<OfficialWhatsAppConfig> {
  const current = await getOfficialWhatsAppConfig();
  const updated: OfficialWhatsAppConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString()
  };

  try {
    const { firestore } = initializeFirebase();
    await setDoc(doc(firestore, 'site_config', 'whatsapp-official'), updated, { merge: true });
  } catch (err) {
    console.error("Error saving whatsapp-official config to Firestore:", err);
  }

  return updated;
}

// Send WhatsApp message via Meta Cloud API
export async function sendOfficialWhatsAppMessage(
  recipientPhone: string, 
  text: string, 
  overrideConfig?: Partial<OfficialWhatsAppConfig>
): Promise<{ success: boolean; data?: any; error?: string }> {
  const config = overrideConfig ? { ...(await getOfficialWhatsAppConfig()), ...overrideConfig } : await getOfficialWhatsAppConfig();

  if (!config.phoneNumberId || !config.accessToken) {
    return { 
      success: false, 
      error: 'Faltan las credenciales de la API Oficial de Meta (ID de Número de Teléfono o Token de Acceso).' 
    };
  }

  const cleanPhone = recipientPhone.replace(/\D/g, '');
  if (!cleanPhone) {
    return { success: false, error: 'Número de teléfono inválido.' };
  }

  const url = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: { preview_url: false, body: text }
      })
    });

    const responseData = await res.json();

    if (!res.ok) {
      const errMsg = responseData.error?.message || responseData.error?.error_data?.details || 'Error enviando mensaje con Meta API';
      return { success: false, error: errMsg, data: responseData };
    }

    return { success: true, data: responseData };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión con la API de Meta' };
  }
}

// Generate Gemini AI response
export async function generateOfficialAIResponse(userMessage: string, customSystemPrompt?: string): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return "Hola, gracias por escribir a SyncConnect. En este momento nuestro sistema de IA se encuentra actualizando sus credenciales. Por favor deja tu mensaje y un agente te atenderá pronto.";
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const config = await getOfficialWhatsAppConfig();
    const promptToUse = customSystemPrompt || config.systemPrompt || DEFAULT_OFFICIAL_PROMPT;

    const response = await generateGeminiContent(ai, {
      model: 'gemini-3.6-flash',
      contents: userMessage,
      config: {
        systemInstruction: promptToUse,
        temperature: 0.7,
      }
    });

    const text = response.text?.trim();
    if (!text) {
      return "¡Hola! Gracias por comunicarte con SyncConnect. ¿En qué podemos ayudarte el día de hoy?";
    }

    return text;
  } catch (err: any) {
    console.error("Error generating Gemini AI response for Official WhatsApp:", err);
    return "Gracias por escribir a SyncConnect. Hemos recibido tu mensaje y te responderemos a la brevedad.";
  }
}

// Log conversation to Firestore
export async function logOfficialWhatsAppConversation(logEntry: OfficialWhatsAppLog): Promise<void> {
  try {
    const { firestore } = initializeFirebase();
    const logsRef = collection(firestore, 'whatsapp_official_conversations');
    await addDoc(logsRef, {
      ...logEntry,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Could not save WhatsApp official log to Firestore:", err);
  }
}

// Fetch logs from Firestore
export async function getOfficialWhatsAppLogs(limitCount = 50): Promise<OfficialWhatsAppLog[]> {
  try {
    const { firestore } = initializeFirebase();
    const logsRef = collection(firestore, 'whatsapp_official_conversations');
    let snapshot;
    try {
      const q = query(logsRef, orderBy('createdAt', 'desc'), limit(limitCount));
      snapshot = await getDocs(q);
    } catch {
      snapshot = await getDocs(logsRef);
    }

    const items = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as OfficialWhatsAppLog[];

    return items.sort((a, b) => {
      const timeA = (a as any).createdAt || '';
      const timeB = (b as any).createdAt || '';
      return timeB.localeCompare(timeA);
    }).slice(0, limitCount);
  } catch (err) {
    console.warn("Could not fetch WhatsApp official logs:", err);
    return [];
  }
}
