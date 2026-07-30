import { NextResponse } from 'next/server';
import { updateOpenWASessionState, logOpenWAEvent, callOpenWAMicroservice, getOpenWAConfig } from '@/lib/openwa-service';

export async function POST() {
  try {
    await logOpenWAEvent('info', 'Solicitud de desvinculación/cerrar sesión de WhatsApp.');

    const config = await getOpenWAConfig();
    if (config.serviceUrl) {
      await callOpenWAMicroservice('/api/disconnect', 'POST');
    }

    await updateOpenWASessionState({
      status: 'DISCONNECTED',
      qrCodeUrl: undefined,
      deviceInfo: undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Sesión de WhatsApp cerrada exitosamente.',
    });
  } catch (error: any) {
    console.error('[OpenWA Disconnect Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al desconectar OpenWA' },
      { status: 500 }
    );
  }
}
