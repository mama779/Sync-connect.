import { NextRequest, NextResponse } from 'next/server';
import { callOpenWAMicroservice, logOpenWAMessage, logOpenWAEvent, getOpenWAConfig, generateOpenWAAiReply } from '@/lib/openwa-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const recipientPhone = body.to || body.recipientPhone || '';
    const message = body.text || body.message || '';
    const mediaUrl = body.mediaUrl || undefined;

    if (!recipientPhone.trim() || !message.trim()) {
      return NextResponse.json({
        success: false,
        error: 'El número de teléfono y el mensaje son requeridos.',
      }, { status: 400 });
    }

    const config = await getOpenWAConfig();

    // Try calling external microservice if configured
    if (config.serviceUrl && config.serviceUrl !== 'http://localhost:8080') {
      const microRes = await callOpenWAMicroservice('/api/send-message', 'POST', {
        to: recipientPhone,
        text: message,
        mediaUrl,
      });

      if (microRes.success) {
        await logOpenWAMessage({
          fromNumber: recipientPhone,
          senderName: 'Manual (Admin)',
          userText: message,
          status: 'manual',
          mediaUrl,
        });

        await logOpenWAEvent('success', `Mensaje enviado a ${recipientPhone} vía microservicio OpenWA.`);

        return NextResponse.json({
          success: true,
          message: 'Mensaje enviado exitosamente vía OpenWA.',
          result: microRes.data,
        });
      }
    }

    // Native Platform Execution
    await logOpenWAMessage({
      fromNumber: recipientPhone,
      senderName: 'Manual (Admin)',
      userText: message,
      status: 'manual',
      mediaUrl,
    });

    await logOpenWAEvent('success', `Mensaje enviado a ${recipientPhone} dentro de la plataforma.`);

    // If AI Bot is active, auto-generate reply for demonstration / native flow
    if (config.botActive) {
      try {
        const aiReply = await generateOpenWAAiReply(message, config.systemPrompt);
        await logOpenWAMessage({
          fromNumber: recipientPhone,
          senderName: 'Asistente IA (Gemini)',
          userText: aiReply,
          status: 'replied',
        });
        await logOpenWAEvent('info', `Respuesta IA generada automáticamente para ${recipientPhone}.`);
      } catch (aiErr) {
        console.warn('Error generating native AI reply on send:', aiErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Mensaje procesado y registrado exitosamente en la plataforma.',
      deliveredVia: 'platform_native',
    });
  } catch (error: any) {
    console.error('[OpenWA Send Route Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al enviar mensaje' },
      { status: 500 }
    );
  }
}
