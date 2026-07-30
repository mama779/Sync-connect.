import { NextRequest, NextResponse } from 'next/server';
import { getOpenWAConfig, saveOpenWAConfig } from '@/lib/openwa-service';

export async function GET() {
  try {
    const config = await getOpenWAConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Error al obtener la configuración de OpenWA' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await saveOpenWAConfig(body);
    return NextResponse.json({ success: true, config: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Error al guardar la configuración de OpenWA' }, { status: 500 });
  }
}
