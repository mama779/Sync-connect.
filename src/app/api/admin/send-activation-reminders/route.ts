import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebase } from '@/firebase';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { sendActivationReminderEmail } from '@/lib/email';
import { getFreeSpotsInfo } from '@/lib/free-spots';

export async function POST(req: NextRequest) {
  try {
    const { firestore } = initializeFirebase();

    // Obtener precios de activación
    const freeInfo = await getFreeSpotsInfo(firestore);

    // Obtener usuarios no activados
    const usersRef = collection(firestore, 'users');
    const qPending = query(usersRef, where('activated', '!=', true));
    const snap = await getDocs(qPending);

    let countSent = 0;
    const errors: string[] = [];

    for (const docSnap of snap.docs) {
      const u = docSnap.data();
      const email = u.email;
      const name = u.displayName || u.fullName || u.email?.split('@')[0] || 'Socio';
      const role = u.role || 'affiliate';

      if (!email) continue;

      const priceStr = role === 'seller' 
        ? `$${freeInfo.sellerPrice} USD` 
        : `$${freeInfo.affiliatePrice} USD`;

      // 1. Enviar correo motivacional de activación
      try {
        const mailRes = await sendActivationReminderEmail({
          to: email,
          name,
          role,
          activationPrice: priceStr
        });

        if (mailRes.success) {
          countSent++;
        }
      } catch (err: any) {
        errors.push(`Error ${email}: ${err.message}`);
      }

      // 2. Crear notificación en app (Firestore collection 'notifications')
      try {
        await addDoc(collection(firestore, 'notifications'), {
          userId: docSnap.id,
          userEmail: email,
          title: '⚡ ¡Activa tu cuenta hoy!',
          message: `Hola ${name}, completa tu activación por ${priceStr} (o aprovecha un cupo de regalo si está disponible) para acceder al Copiloto IA y enlaces Cycling.`,
          type: 'activation_reminder',
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Could not create in-app notification:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se enviaron ${countSent} recordatorios de activación a usuarios pendientes.`,
      countSent,
      errors
    });
  } catch (error: any) {
    console.error('Error sending activation reminders:', error);
    return NextResponse.json({ error: error?.message || 'Error al procesar recordatorios' }, { status: 500 });
  }
}
