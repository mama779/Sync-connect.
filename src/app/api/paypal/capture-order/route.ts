import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email';

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
    const { orderId, productId, buyerInfo, buyerId, affiliateId } = await req.json();

    if (!orderId || !productId || !buyerInfo) {
      return NextResponse.json({ error: 'Faltan parámetros de transacción requeridos.' }, { status: 400 });
    }

    if (!adminDb) {
      console.error('Firebase Admin SDK is not initialized.');
      return NextResponse.json({ error: 'Error del servidor de base de datos.' }, { status: 500 });
    }

    // Resolve or Auto-Create the Buyer's user account
    let finalBuyerId = buyerId;
    let accountCreated = false;
    let autoPassword = '';

    if (!finalBuyerId || finalBuyerId === 'undefined' || finalBuyerId.startsWith('guest_')) {
      if (adminAuth) {
        try {
          const emailLower = buyerInfo.email.toLowerCase().trim();
          let userRecord;
          try {
            userRecord = await adminAuth.getUserByEmail(emailLower);
            finalBuyerId = userRecord.uid;
          } catch (getErr: any) {
            if (getErr.code === 'auth/user-not-found') {
              // Create user in firebase Auth dynamically
              const whatsappClean = buyerInfo.phone.replace(/\D/g, '');
              const pass = whatsappClean.length >= 6 ? whatsappClean : 'sync123456';
              autoPassword = pass;
              
              userRecord = await adminAuth.createUser({
                email: emailLower,
                password: pass,
                displayName: `${buyerInfo.firstName} ${buyerInfo.lastName}`.trim(),
              });
              finalBuyerId = userRecord.uid;
              accountCreated = true;
              console.log(`Auto-created account for guest checkout: ${finalBuyerId}`);
            } else {
              throw getErr;
            }
          }
        } catch (authErr) {
          console.error('Error in auto-creating guest user:', authErr);
          finalBuyerId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        }
      } else {
        finalBuyerId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      }
    }

    // 1. Fetch original product details from Firestore server-side for validation
    const productDoc = await adminDb.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      return NextResponse.json({ error: 'El producto solicitado no existe.' }, { status: 404 });
    }

    const product = productDoc.data();
    const expectedPrice = product?.price;

    if (expectedPrice === undefined || typeof expectedPrice !== 'number' || expectedPrice <= 0) {
      return NextResponse.json({ error: 'El precio del producto es inválido.' }, { status: 400 });
    }

    // Check if we are using the fallback/test credentials
    const envClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
    const isTestMode = !envClientId || envClientId.startsWith('Abv8KNo') || envClientId === 'test';

    let captureId: string;
    let payerEmail: string;

    if (isTestMode) {
      console.log('PayPal capture-order running in Test/Demo Mode.');
      // Use the orderId passed from client-side buttons (with 'test' clientId, client-side Buttons onApprove provides a valid sandbox order/payment ID)
      captureId = orderId.startsWith('MOCK_') ? `MOCK_CAP_${Date.now()}` : orderId;
      payerEmail = buyerInfo.email;
    } else {
      // 2. Authenticate with PayPal
      const accessToken = await getPayPalAccessToken();

      // 3. Capture payment on PayPal
      const captureResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!captureResponse.ok) {
        const errText = await captureResponse.text();
        console.error('PayPal Payment Capture Failed:', errText);
        return NextResponse.json({ error: 'No se pudo liquidar el pago en PayPal.' }, { status: 500 });
      }

      const captureData = await captureResponse.json();

      // 4. Validate captured payment details
      const purchaseUnit = captureData.purchase_units?.[0];
      const capture = purchaseUnit?.payments?.captures?.[0];

      if (captureData.status !== 'COMPLETED' || !capture || capture.status !== 'COMPLETED') {
        return NextResponse.json({ 
          error: 'El pago no se ha completado de forma satisfactoria.', 
          paypalStatus: captureData.status 
        }, { status: 400 });
      }

      const capturedAmount = parseFloat(capture.amount?.value);
      
      // Allow minor floating point difference (e.g., within 1 cent)
      if (Math.abs(capturedAmount - expectedPrice) > 0.01) {
        console.error(`Price discrepancy detected! Expected: ${expectedPrice}, Captured: ${capturedAmount}`);
        return NextResponse.json({ error: 'Discrepancia detectada en el monto de la compra.' }, { status: 400 });
      }

      captureId = capture.id;
      payerEmail = captureData.payer?.email_address || buyerInfo.email;
    }

    // 5. Save/Update Buyer Profile (Lead)
    const buyerRef = adminDb.collection('buyers').doc(finalBuyerId);
    const buyerData: any = {
      id: finalBuyerId,
      firstName: buyerInfo.firstName.trim(),
      lastName: buyerInfo.lastName.trim(),
      email: buyerInfo.email.toLowerCase().trim(),
      whatsappNumber: buyerInfo.phone.trim(),
      referredBy: affiliateId || 'admin',
      registeredAt: new Date().toISOString(),
      status: 'Active'
    };

    if (buyerInfo.lastLocation) {
      buyerData.lastLocation = {
        lat: Number(buyerInfo.lastLocation.lat),
        lng: Number(buyerInfo.lastLocation.lng),
        updatedAt: buyerInfo.lastLocation.updatedAt || new Date().toISOString()
      };
      
      // Save location history under the buyer profile
      try {
        await buyerRef.collection('location_history').add({
          lat: Number(buyerInfo.lastLocation.lat),
          lng: Number(buyerInfo.lastLocation.lng),
          timestamp: buyerInfo.lastLocation.updatedAt || new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to save location history:", err);
      }
    }

    await buyerRef.set(buyerData, { merge: true });

    // Calculate Affiliate Commission
    const commissionRate = product?.commissionRate || product?.commission || 0;
    const commissionEarned = (expectedPrice * commissionRate) / 100;

    // 6. Save completed transaction in /sales
    const saleId = captureId; // Use PayPal capture ID as Firestore Sale Document ID for deduplication
    const saleData = {
      id: saleId,
      productId: productId,
      productName: product?.name || 'Producto Digital',
      buyerId: finalBuyerId,
      buyerName: `${buyerInfo.firstName} ${buyerInfo.lastName}`.trim(),
      buyerPhone: buyerInfo.phone.trim(),
      buyerEmail: buyerInfo.email.toLowerCase().trim(),
      saleDate: new Date().toISOString(),
      saleAmount: expectedPrice,
      commissionEarned: commissionEarned,
      status: 'Completed', // UNLOCKED INSTANTLY!
      paymentMethod: 'PayPal',
      voucherReference: orderId,
      transactionId: captureId,
      affiliateId: affiliateId || 'admin'
    };

    await adminDb.collection('sales').doc(saleId).set(saleData);

    // 7. Send Order Confirmed Email to the buyer
    try {
      const emailContent = `
        <div style="text-align: left;">
          <p style="font-size: 18px; color: #0f172a; font-weight: 700; margin-bottom: 20px;">¡Felicidades, ${buyerInfo.firstName}!</p>
          <p style="margin-bottom: 25px; font-size: 16px; color: #475569; line-height: 1.6;">
            Tu pago para el producto digital <strong>"${product?.name}"</strong> ha sido procesado con éxito a través de PayPal.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; border-radius: 16px; margin: 30px 0;">
            <p style="margin: 0; font-size: 14px; color: #64748b; font-weight: bold; text-transform: uppercase; tracking: 0.5px; margin-bottom: 15px;">Detalles de la Transacción</p>
            <p style="margin: 0; font-size: 14px; color: #334155; margin-bottom: 8px;"><strong>Producto:</strong> ${product?.name}</p>
            <p style="margin: 0; font-size: 14px; color: #334155; margin-bottom: 8px;"><strong>Monto Pagado:</strong> $${expectedPrice.toFixed(2)} USD</p>
            <p style="margin: 0; font-size: 14px; color: #334155; margin-bottom: 8px;"><strong>ID de Transacción:</strong> ${captureId}</p>
            <p style="margin: 0; font-size: 14px; color: #334155; margin-bottom: 8px;"><strong>Método de Pago:</strong> PayPal Checkout</p>
            <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
          </div>
          ${accountCreated ? `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 25px; border-radius: 16px; margin: 30px 0; text-align: left;">
            <p style="margin: 0; font-size: 14px; color: #15803d; font-weight: bold; text-transform: uppercase; tracking: 0.5px; margin-bottom: 10px;">🔑 ¡CUENTA DE ACCESO CREADA!</p>
            <p style="margin: 0; font-size: 14px; color: #1e293b; margin-bottom: 8px;">Hemos creado automáticamente una cuenta de alumno para que ingreses de inmediato a la academia:</p>
            <p style="margin: 0; font-size: 14px; color: #1e293b; margin-bottom: 8px;"><strong>Usuario / Correo:</strong> ${buyerInfo.email.toLowerCase().trim()}</p>
            <p style="margin: 0; font-size: 14px; color: #1e293b; margin-bottom: 8px;"><strong>Contraseña:</strong> ${autoPassword}</p>
            <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b; font-style: italic;">* Se recomienda cambiar tu contraseña una vez que ingreses por primera vez en tu perfil.</p>
          </div>
          ` : `
          <p style="margin-bottom: 30px; font-size: 15px; color: #475569; line-height: 1.6;">
            Tu acceso ya ha sido desbloqueado. Puedes iniciar sesión en tu panel de alumno para acceder de forma vitalicia a todo el contenido usando tus credenciales registradas.
          </p>
          `}
          <div style="text-align: center; margin: 40px 0;">
            <a href="${req.nextUrl.origin}/dashboard/buyer" style="background: linear-gradient(135deg, #ff9900 0%, #e68a00 100%); color: #ffffff; padding: 18px 36px; border-radius: 14px; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; box-shadow: 0 10px 30px rgba(255, 153, 0, 0.25);">
              Ir a mi panel de alumno
            </a>
          </div>
        </div>
      `;

      await sendEmail({
        to: buyerInfo.email.toLowerCase().trim(),
        subject: `🛒 Compra Confirmada: Acceso listo a ${product?.name}`,
        text: `Tu compra de ${product?.name} fue aprobada. ID: ${captureId}`,
        html: emailContent,
        title: "Confirmación de Compra"
      });
    } catch (emailErr) {
      console.error('Error sending purchase confirmation email:', emailErr);
    }

    return NextResponse.json({
      success: true,
      transactionId: captureId,
      amount: expectedPrice,
      payerEmail: payerEmail,
      status: 'Completed'
    });

  } catch (error: any) {
    console.error('Error in capture-order endpoint:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
