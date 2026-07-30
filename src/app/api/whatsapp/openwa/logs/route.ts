import { NextResponse } from 'next/server';
import { getOpenWALogs, getOpenWAMessageLogs, callOpenWAMicroservice } from '@/lib/openwa-service';

export async function GET() {
  try {
    // Attempt to fetch fresh logs from microservice
    const microRes = await callOpenWAMicroservice('/api/logs', 'GET');
    let microLogs = [];
    if (microRes.success && microRes.data?.logs) {
      microLogs = microRes.data.logs;
    }

    const firestoreLogs = await getOpenWALogs(50);
    const messageLogs = await getOpenWAMessageLogs(50);

    return NextResponse.json({
      success: true,
      microLogs,
      systemLogs: firestoreLogs,
      messages: messageLogs,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Error al obtener logs de OpenWA' }, { status: 500 });
  }
}
