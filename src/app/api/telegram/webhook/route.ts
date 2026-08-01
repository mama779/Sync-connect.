import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Initialize Firebase client for API route
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const SYSTEM_PROMPT = `
Eres el Bot Oficial de Atención y Soporte Automático de SyncConnect (SixFigure).
Tu objetivo es responder de forma amable, clara, profesional y muy persuasiva a las dudas de los usuarios en Telegram sobre la plataforma SyncConnect.

Información oficial clave de SyncConnect:
1. ¿Qué es SyncConnect?
Es la plataforma y ecosistema global todo-en-uno para comercializar, vender e impulsar infoproductos digitales utilizando Inteligencia Artificial, Copilotos de Ventas, Enlaces Cycling automatizados e Infraestructura de comisiones.

2. Precios de Activación de Cuenta:
- Afiliados / Socios: $6 USD (Seis Dólares) costo único de activación.
- Vendedores / Productores: $7 USD (Siete Dólares) costo único de activación.
- Promoción de Registro Gratuito ($0 USD): Cuando hay cupos promocionales activos, el registro es $0 USD.

3. Herramientas Incluidas:
- Copiloto IA de Cierre de Ventas y Generador de Páginas de Venta
- Enlaces Cycling Automatizados para rotación de afiliados
- Plataforma de Cursos y Formación (Academy)
- Retiros de comisiones y panel de métricas en tiempo real

4. Instrucciones de Registro y Activación:
Los usuarios pueden registrarse directamente en el sitio web de SyncConnect, seleccionar su rol (Afiliado o Vendedor) y realizar su activación por banca local o PayPal para quedar inmediatamente activos.

Reglas de respuesta:
- Sé servicial, directo y positivo.
- Usa emoticonos adecuados (🚀, ⚡, 💡, 💎, 📲) sin saturar.
- Respuestas cortas y fáciles de leer en dispositivos móviles (1-3 párrafos).
- Invita siempre al usuario a completar su registro o consultar el canal oficial de Telegram.
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if message is present in update
    const message = body.message || body.edited_message;
    if (!message || !message.text || !message.chat) {
      return NextResponse.json({ status: 'ok', ignored: 'No text message' });
    }

    const chatId = message.chat.id;
    const userQuery = message.text;
    const senderName = message.from?.first_name || 'Amigo';

    // Fetch Telegram Bot Token from Firestore site_config/settings
    let botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    try {
      const settingsRef = doc(db, 'site_config', 'settings');
      const snap = await getDoc(settingsRef);
      if (snap.exists() && snap.data().telegram_bot_token) {
        botToken = snap.data().telegram_bot_token;
      }
    } catch (e) {
      console.warn('Could not read telegram_bot_token from Firestore:', e);
    }

    if (!botToken) {
      console.error('Telegram Bot Token not configured in site_config/settings or process.env');
      return NextResponse.json({ status: 'error', error: 'Bot token not set' });
    }

    // Handle /start or greeting command
    let responseText = '';
    if (userQuery.startsWith('/start')) {
      responseText = `¡Hola ${senderName}! 👋 Bienvenido al Bot Oficial de Soporte e Información de **SyncConnect** (SixFigure).\n\n` +
        `🚀 Estoy aquí para responder cualquier duda sobre la plataforma, activación de cuentas ($6 USD Afiliados / $7 USD Vendedores), herramientas con Inteligencia Artificial, enlaces Cycling y comisiones.\n\n` +
        `¿En qué puedo ayudarte hoy? Escribe tu pregunta directamente.`;
    } else {
      // Use Gemini AI to answer query
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const geminiRes = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `${SYSTEM_PROMPT}\n\nEl usuario ${senderName} pregunta: "${userQuery}"`,
          });
          responseText = geminiRes.text || 'Hola, por favor reitera tu consulta para poder ayudarte con la información de SyncConnect.';
        } catch (aiErr: any) {
          console.error('Gemini error in Telegram Bot:', aiErr);
          responseText = `Hola ${senderName}, gracias por tu mensaje. Para responder a tu duda sobre SyncConnect, la activación de cuenta de Afiliado es de $6 USD únicos y Vendedor de $7 USD únicos. Si deseas más ayuda, ponte en contacto con nuestro equipo de soporte.`;
        }
      } else {
        responseText = `Hola ${senderName}. SyncConnect es el ecosistema de infoproductos digitales e Inteligencia Artificial. La activación de cuenta para Afiliados es de $6 USD y para Vendedores de $7 USD. ¡Ingresa a nuestro portal oficial para más detalles!`;
      }
    }

    // Send reply via Telegram sendMessage API
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: responseText,
        parse_mode: 'Markdown',
      }),
    });

    return NextResponse.json({ status: 'ok', replied: true });
  } catch (error: any) {
    console.error('Error handling Telegram webhook:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'active', service: 'SyncConnect Telegram Bot Webhook' });
}
