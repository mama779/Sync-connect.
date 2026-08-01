import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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

export async function POST(req: NextRequest) {
  try {
    const { botToken, customAppUrl } = await req.json();

    if (!botToken || typeof botToken !== 'string') {
      return NextResponse.json({ error: 'El Token de la API del Bot de Telegram es requerido.' }, { status: 400 });
    }

    const trimmedToken = botToken.trim();

    // Determine host URL
    let appUrl = customAppUrl;
    if (!appUrl) {
      const host = req.headers.get('host') || 'ais-dev-k2s5p6yhl5qqo5pbfomvjo-725479423430.us-east1.run.app';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      appUrl = `${protocol}://${host}`;
    }

    const webhookUrl = `${appUrl}/api/telegram/webhook`;

    // Save token and webhook settings to Firestore site_config/settings
    const settingsRef = doc(db, 'site_config', 'settings');
    await setDoc(settingsRef, {
      telegram_bot_token: trimmedToken,
      telegram_webhook_url: webhookUrl,
      updated_at: new Date().toISOString(),
    }, { merge: true });

    // Call Telegram setWebhook API
    const tgRes = await fetch(`https://api.telegram.org/bot${trimmedToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'edited_message'],
      }),
    });

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      return NextResponse.json({
        success: false,
        error: `Telegram error: ${tgData.description || 'Token inválido'}`,
      }, { status: 400 });
    }

    // Also get bot info to retrieve username
    let botUsername = '';
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${trimmedToken}/getMe`);
      const meData = await meRes.json();
      if (meData.ok && meData.result?.username) {
        botUsername = `https://t.me/${meData.result.username}`;
        await setDoc(settingsRef, {
          telegram_bot_url: botUsername,
        }, { merge: true });
      }
    } catch (e) {
      console.warn('Could not fetch getMe from Telegram:', e);
    }

    return NextResponse.json({
      success: true,
      message: '¡Bot de Telegram conectado exitosamente a SyncConnect!',
      webhookUrl,
      botUsername,
      telegramResponse: tgData,
    });
  } catch (error: any) {
    console.error('Error setting Telegram webhook:', error);
    return NextResponse.json({ error: error.message || 'Error del servidor' }, { status: 500 });
  }
}
