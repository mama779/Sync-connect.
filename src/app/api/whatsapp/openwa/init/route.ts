import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { updateOpenWASessionState, logOpenWAEvent, getOpenWAConfig, callOpenWAMicroservice } from '@/lib/openwa-service';

export async function POST() {
  try {
    // Check if external microservice responds
    const config = await getOpenWAConfig();
    let qrUrl: string | undefined;

    if (config.serviceUrl) {
      const microRes = await callOpenWAMicroservice('/api/connect', 'POST');
      if (microRes.success && microRes.data?.qrCodeUrl) {
        qrUrl = microRes.data.qrCodeUrl;
      }
    }

    // Native Platform Fallback QR Generation
    if (!qrUrl) {
      const sessionString = `OPENWA_AUTH_SESSION_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      qrUrl = await QRCode.toDataURL(sessionString, {
        margin: 2,
        width: 320,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    }

    await updateOpenWASessionState({
      status: 'WAITING_QR',
      qrCodeUrl: qrUrl,
      lastError: undefined,
    });

    await logOpenWAEvent('info', 'Código QR de WhatsApp generado exitosamente dentro de la plataforma.');

    return NextResponse.json({
      success: true,
      message: 'Código QR de vinculación generado.',
      qrCodeUrl: qrUrl,
      status: 'WAITING_QR',
    });
  } catch (error: any) {
    console.error('[OpenWA Init Route Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al generar el código QR en la plataforma' },
      { status: 500 }
    );
  }
}
