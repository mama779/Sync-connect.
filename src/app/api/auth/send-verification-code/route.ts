import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { sendVerificationCodeEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { uid, email, name } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 });
    }

    const { firestore } = initializeFirebase();

    // Generar código numérico de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutos

    if (uid) {
      const userRef = doc(firestore, 'users', uid);
      await updateDoc(userRef, {
        emailVerificationCode: code,
        emailVerificationExpiresAt: expiresAt,
        emailVerified: false,
        updatedAt: new Date().toISOString()
      });
    }

    // Enviar correo con código
    const mailRes = await sendVerificationCodeEmail({
      to: email,
      name: name || email.split('@')[0],
      code
    });

    if (!mailRes.success) {
      console.warn("Could not send email, code generated:", code, mailRes.error);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Código de verificación enviado al correo electrónico',
      codeSent: mailRes.success
    });
  } catch (error: any) {
    console.error('Error sending verification code:', error);
    return NextResponse.json({ error: error?.message || 'Error al enviar código' }, { status: 500 });
  }
}
