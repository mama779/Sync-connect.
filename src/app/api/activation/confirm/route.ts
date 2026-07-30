import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId, role, paymentMethod, transactionId } = await req.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'Faltan parámetros de usuario y rol para la activación.' },
        { status: 400 }
      );
    }

    const feeMap: Record<string, number> = {
      affiliate: 15,
      seller: 7,
      buyer: 0
    };

    const feeAmount = feeMap[role] ?? 15;

    // Simulate activation success and return detailed result
    const activationResult = {
      success: true,
      userId,
      role,
      feeAmount,
      currency: 'USD',
      status: 'active',
      transactionId: transactionId || `TX-SYNC-${Date.now()}`,
      activatedAt: new Date().toISOString(),
      message: `Cuenta de ${role === 'affiliate' ? 'Afiliado' : 'Vendedor'} activada con éxito en SyncConnect ($${feeAmount} USD).`
    };

    return NextResponse.json(activationResult);
  } catch (error: any) {
    console.error('Error en activación automática:', error);
    return NextResponse.json(
      { error: error?.message || 'Error en el servidor durante la activación.' },
      { status: 500 }
    );
  }
}
