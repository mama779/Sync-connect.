import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Read config from env
const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'Abv8KNoqUorR_SreKjR0W86A7r7f5NcoB5K280-GgLwVv9Rovp_jWpUozT1f7H-j3Z3u86A_7v9Ro';
const clientSecret = process.env.PAYPAL_CLIENT_SECRET || 'EBv8KNoqUorR_SreKjR0W86A7r7f5NcoB5K280-GgLwVv9Rovp_jWpUozT1f7H-j3Z3u86A_7v9Ro_secret';
const mode = process.env.PAYPAL_MODE || 'sandbox';

const paypalBaseUrl = mode === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

// Fetch PayPal Access Token
async function getPayPalAccessToken() {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to get PayPal access token: ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: 'Falta el ID del producto.' }, { status: 400 });
    }

    // 1. Fetch Product details from Firestore server-side for security (anti-tamper)
    if (!adminDb) {
      console.error('Firebase Admin SDK is not initialized.');
      return NextResponse.json({ error: 'Error del servidor de base de datos.' }, { status: 500 });
    }

    const productDoc = await adminDb.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return NextResponse.json({ error: 'El producto solicitado no existe.' }, { status: 404 });
    }

    const product = productDoc.data();
    const price = product?.price;

    if (price === undefined || typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'El precio del producto es inválido.' }, { status: 400 });
    }

    // Check if we are using the fallback/test credentials
    const envClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
    const isTestMode = !envClientId || envClientId.startsWith('Abv8KNo') || envClientId === 'test';

    if (isTestMode) {
      console.log('PayPal create-order running in Test/Demo Mode.');
      return NextResponse.json({ id: `MOCK_ORD_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` });
    }

    // 2. Authenticate with PayPal
    const accessToken = await getPayPalAccessToken();

    // 3. Create Order on PayPal
    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: price.toFixed(2),
          },
          description: product?.name || 'Compra Sync Connect',
          custom_id: productId, // Save reference to verify and unlock later
        },
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING', // digital product by default
        user_action: 'PAY_NOW',
      },
    };

    const createOrderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    if (!createOrderResponse.ok) {
      const errText = await createOrderResponse.text();
      console.error('PayPal Order Creation Failed:', errText);
      return NextResponse.json({ error: 'Error al iniciar la orden de PayPal.' }, { status: 500 });
    }

    const orderData = await createOrderResponse.json();

    return NextResponse.json({ id: orderData.id });
  } catch (error: any) {
    console.error('Error in create-order endpoint:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
