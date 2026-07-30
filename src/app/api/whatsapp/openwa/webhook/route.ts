import { NextRequest, NextResponse } from 'next/server';
import { 
  getOpenWAConfig, 
  updateOpenWASessionState, 
  logOpenWAEvent, 
  logOpenWAMessage, 
  generateOpenWAAiReply 
} from '@/lib/openwa-service';

export async function POST(req: NextRequest) {
  try {
    const config = await getOpenWAConfig();

    // Verify Secret Key
    const apiKeyHeader = req.headers.get('x-openwa-api-key');
    if (config.apiKey && apiKeyHeader !== config.apiKey) {
      return NextResponse.json({ success: false, error: 'API Key de OpenWA inválida' }, { status: 401 });
    }

    const body = await req.json();
    const event = body.event;

    // Handle State Changes
    if (event === 'STATE_CHANGED') {
      await updateOpenWASessionState({
        status: body.status,
        qrCodeUrl: body.qrCodeUrl,
        deviceInfo: body.deviceInfo,
        lastConnectedAt: body.lastConnectedAt,
        lastError: body.lastError,
        uptimeSeconds: body.uptimeSeconds,
      });

      await logOpenWAEvent('info', `[Webhook OpenWA] Cambio de estado: ${body.status}`);
      return NextResponse.json({ success: true, event: 'STATE_CHANGED_ACK' });
    }

    // Handle Incoming Messages
    if (event === 'INCOMING_MESSAGE') {
      const { fromNumber, senderName, text, mediaUrl } = body;

      await logOpenWAEvent('info', `[Webhook OpenWA Recibido] De ${senderName} (+${fromNumber}): "${text}"`);

      let aiReplyText: string | undefined = undefined;

      if (config.botActive && text && text.trim().length > 0) {
        try {
          aiReplyText = await generateOpenWAAiReply(text, config.systemPrompt);

          await logOpenWAMessage({
            fromNumber,
            senderName,
            userText: text,
            aiReply: aiReplyText,
            status: 'replied',
            mediaUrl,
          });

          await logOpenWAEvent('success', `Respuesta de IA Gemini generada para +${fromNumber}`);
        } catch (aiErr: any) {
          await logOpenWAEvent('error', `Error al generar respuesta de IA: ${aiErr.message}`);
          await logOpenWAMessage({
            fromNumber,
            senderName,
            userText: text,
            status: 'error',
          });
        }
      } else {
        await logOpenWAMessage({
          fromNumber,
          senderName,
          userText: text,
          status: 'received',
          mediaUrl,
        });
      }

      return NextResponse.json({
        success: true,
        replyText: aiReplyText,
      });
    }

    return NextResponse.json({ success: true, status: 'ignored' });
  } catch (error: any) {
    console.error('Error procesando Webhook de OpenWA:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error en Webhook' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'OpenWA Webhook Endpoint listo.' });
}
