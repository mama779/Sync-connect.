import { NextResponse } from 'next/server';
import { updateOpenWASessionState, logOpenWAEvent, callOpenWAMicroservice, getOpenWAConfig } from '@/lib/openwa-service';

export async function POST() {
  try {
    await updateOpenWASessionState({ status: 'RECONNECTING' });
    await logOpenWAEvent('warn', 'Solicitud de reinicio de sesión WhatsApp.');

    const config = await getOpenWAConfig();
    if (config.serviceUrl && config.serviceUrl !== 'http://localhost:8080') {
      const microRes = await callOpenWAMicroservice('/api/restart', 'POST');
      if (microRes.success) {
        return NextResponse.json({
          success: true,
          message: 'Reinicio de servicio OpenWA activado.',
        });
      }
    }

    // Platform Native Reset
    await updateOpenWASessionState({
      status: 'DISCONNECTED',
      qrCodeUrl: undefined,
      deviceInfo: undefined,
      updatedAt: new Date().toISOString(),
    });

    await logOpenWAEvent('info', 'Estado de la sesión restablecido en la plataforma.');

    return NextResponse.json({
      success: true,
      message: 'Servicio de WhatsApp reiniciado correctamente en la plataforma.',
    });
  } catch (error: any) {
    console.error('[OpenWA Restart Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al reiniciar WhatsApp' },
      { status: 500 }
    );
  }
}
