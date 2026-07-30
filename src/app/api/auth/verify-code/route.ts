import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { uid, code } = await req.json();

    if (!uid || !code) {
      return NextResponse.json({ error: 'UID y código son requeridos' }, { status: 400 });
    }

    const { firestore } = initializeFirebase();
    const userRef = doc(firestore, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userData = userSnap.data();

    if (userData.emailVerified) {
      return NextResponse.json({ success: true, message: 'El correo ya estaba verificado' });
    }

    const savedCode = userData.emailVerificationCode;
    const expiresAt = userData.emailVerificationExpiresAt || 0;

    if (!savedCode || savedCode.trim() !== code.trim()) {
      return NextResponse.json({ error: 'Código de verificación incorrecto' }, { status: 400 });
    }

    if (Date.now() > expiresAt) {
      return NextResponse.json({ error: 'El código ha expirado. Solicita uno nuevo.' }, { status: 400 });
    }

    // Código válido -> Marcar verificado
    await updateDoc(userRef, {
      emailVerified: true,
      emailVerifiedAt: new Date().toISOString(),
      emailVerificationCode: null
    });

    return NextResponse.json({
      success: true,
      message: '¡Correo electrónico verificado exitosamente!'
    });
  } catch (error: any) {
    console.error('Error verifying code:', error);
    return NextResponse.json({ error: error?.message || 'Error al verificar código' }, { status: 500 });
  }
}
