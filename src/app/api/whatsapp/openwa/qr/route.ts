import { NextResponse } from 'next/server';
import { callOpenWAMicroservice, getOpenWASessionState } from '@/lib/openwa-service';

export async function GET() {
  try {
    const microRes = await callOpenWAMicroservice('/api/qr', 'GET');

    if (microRes.success && microRes.data) {
      return NextResponse.json({
        success: true,
        status: microRes.data.status,
        qrCodeUrl: microRes.data.qrCodeDataUrl,
        rawQr: microRes.data.rawQr,
      });
    }

    const storedState = await getOpenWASessionState();
    return NextResponse.json({
      success: true,
      status: storedState.status,
      qrCodeUrl: storedState.qrCodeUrl,
      microserviceError: microRes.error,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Error al obtener código QR' }, { status: 500 });
  }
}
