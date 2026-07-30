import { NextRequest, NextResponse } from 'next/server';
import { testEmailConfig } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Debes proporcionar un correo para la prueba.' }, { status: 400 });
    }

    const result = await testEmailConfig(email);
    if (result.success) {
      return NextResponse.json({ success: true, message: `Correo de prueba enviado correctamente a ${email}` });
    } else {
      return NextResponse.json({ success: false, error: result.error || 'Error al enviar el correo de prueba.' }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Error del servidor.' }, { status: 500 });
  }
}
