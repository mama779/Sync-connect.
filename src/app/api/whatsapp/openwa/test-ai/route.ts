import { NextRequest, NextResponse } from 'next/server';
import { generateOpenWAAiReply, logOpenWAEvent } from '@/lib/openwa-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt || body.userQuery || '';

    if (!prompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'El mensaje de prueba no puede estar vacío.' },
        { status: 400 }
      );
    }

    const reply = await generateOpenWAAiReply(prompt);
    await logOpenWAEvent('info', 'Prueba de asistente de Gemini ejecutada.', { prompt, reply });

    return NextResponse.json({
      success: true,
      reply,
    });
  } catch (error: any) {
    console.error('[OpenWA Test AI Route Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al probar el asistente de IA' },
      { status: 500 }
    );
  }
}
