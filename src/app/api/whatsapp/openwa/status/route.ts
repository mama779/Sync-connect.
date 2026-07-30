import { NextResponse } from 'next/server';
import { callOpenWAMicroservice, getOpenWASessionState, updateOpenWASessionState, getOpenWAConfig } from '@/lib/openwa-service';

export async function GET() {
  try {
    const config = await getOpenWAConfig();

    // Try microservice if URL is configured
    if (config.serviceUrl) {
      const microRes = await callOpenWAMicroservice('/api/status', 'GET');

      if (microRes.success && microRes.data) {
        const data = microRes.data;
        const statePayload = {
          status: data.status || 'DISCONNECTED',
          qrCodeUrl: data.qrCodeDataUrl || undefined,
          deviceInfo: data.deviceInfo || undefined,
          lastConnectedAt: data.lastConnectedAt || undefined,
          lastError: data.lastError || undefined,
          uptimeSeconds: data.uptimeSeconds || 0,
          updatedAt: new Date().toISOString(),
        };

        await updateOpenWASessionState(statePayload);

        return NextResponse.json({
          success: true,
          source: 'microservice',
          ...statePayload,
        });
      }
    }

    // Fallback to platform native stored state in Firestore
    const storedState = await getOpenWASessionState();
    return NextResponse.json({
      success: true,
      source: 'platform_native',
      ...storedState,
    });
  } catch (error: any) {
    console.error('[OpenWA Status Error]:', error);
    return NextResponse.json({
      success: true,
      source: 'fallback',
      status: 'DISCONNECTED',
      updatedAt: new Date().toISOString(),
    });
  }
}
