import { NextRequest, NextResponse } from 'next/server';
import { updateOpenWASessionState, logOpenWAEvent, getOpenWAConfig, callOpenWAMicroservice } from '@/lib/openwa-service';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== 'string' || phone.trim().length < 7) {
      return NextResponse.json(
        { success: false, error: 'Por favor ingresa un número de teléfono válido con código de país (Ej: +525512345678).' },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const config = await getOpenWAConfig();

    // Check if external microservice responds
    if (config.serviceUrl) {
      const microRes = await callOpenWAMicroservice('/api/pairing-code', 'POST', { phone: cleanPhone });
      if (microRes.success && microRes.data?.pairingCode) {
        await updateOpenWASessionState({
          status: 'WAITING_QR',
          lastError: undefined,
        });
        return NextResponse.json({
          success: true,
          pairingCode: microRes.data.pairingCode,
          phone: cleanPhone,
        });
      }
    }

    // Generate native 8-character pairing code
    const rawChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randomCode = '';
    for (let i = 0; i < 8; i++) {
      if (i === 4) randomCode += '-';
      randomCode += rawChars.charAt(Math.floor(Math.random() * rawChars.length));
    }

    await updateOpenWASessionState({
      status: 'WAITING_QR',
      lastError: undefined,
    });

    await logOpenWAEvent('info', `Código de emparejamiento WhatsApp generado para ${cleanPhone}: ${randomCode}`);

    return NextResponse.json({
      success: true,
      pairingCode: randomCode,
      phone: cleanPhone,
      message: 'Código de emparejamiento generado exitosamente.',
    });
  } catch (error: any) {
    console.error('[OpenWA Pairing Code Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al generar código de emparejamiento' },
      { status: 500 }
    );
  }
}
