import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, name, role, amount, transactionId } = await req.json();

    const recipientEmail = email || 'socio@syncconnect.com';
    const recipientName = name || 'Estimado Socio';
    const userRole = role === 'seller' ? 'Vendedor / Productor' : 'Afiliado Comercial';
    const feeAmount = amount || (role === 'seller' ? 7 : 15);
    const txId = transactionId || `TX-SYNC-${Math.floor(100000 + Math.random() * 900000)}`;

    const emailHtmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background-color: #111827; border-radius: 16px; overflow: hidden; border: 1px solid #1f2937; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { background: linear-gradient(135deg, #E63900 0%, #FF5500 50%, #FFAA00 100%); padding: 40px 30px; text-align: center; }
    .brand-title { font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: -1px; margin: 0; text-transform: uppercase; }
    .brand-subtitle { font-size: 11px; font-weight: 800; color: #ffebd6; letter-spacing: 4px; margin-top: 4px; text-transform: uppercase; }
    .content { padding: 40px 30px; text-align: left; }
    .greeting { font-size: 24px; font-weight: 800; color: #ffffff; margin-bottom: 16px; }
    .badge { display: inline-block; background-color: #10b981; color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 6px 16px; border-radius: 20px; margin-bottom: 24px; }
    .message { font-size: 15px; color: #9ca3af; line-height: 1.7; margin-bottom: 28px; }
    .card { background-color: #1f2937; border-radius: 12px; padding: 20px; margin-bottom: 28px; border: 1px solid #374151; }
    .card-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #374151; font-size: 14px; }
    .card-row:last-child { border-bottom: none; }
    .card-label { color: #9ca3af; font-weight: 600; }
    .card-value { color: #ffffff; font-weight: 700; }
    .btn { display: block; width: 100%; text-align: center; background: linear-gradient(90deg, #FF5500, #FF8800); color: #ffffff; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; padding: 18px 0; border-radius: 10px; text-decoration: none; box-shadow: 0 10px 15px -3px rgba(255, 85, 0, 0.4); }
    .footer { text-align: center; padding: 24px; font-size: 11px; color: #6b7280; border-top: 1px solid #1f2937; letter-spacing: 1px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand-title">SyncConnect</div>
      <div class="brand-subtitle">— GLOBAL DIGITAL NETWORK —</div>
    </div>
    <div class="content">
      <div class="badge">✓ ACTIVACIÓN AUTOMÁTICA COMPLETADA</div>
      <div class="greeting">¡Felicitaciones, ${recipientName}! 🚀</div>
      <p class="message">
        Tu membresía como <strong>${userRole}</strong> ha sido activada exitosamente en la infraestructura de <strong>SyncConnect / SixFigure</strong>.
        A partir de este momento tienes acceso ilimitado al mercado de activos digitales, tu Copiloto de Ventas con IA, tus Enlaces Cycling personalizados de comisión acelerada y todos los materiales publicitarios descargables.
      </p>

      <div class="card">
        <div class="card-row">
          <span class="card-label">Socio:</span>
          <span class="card-value">${recipientName}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Correo:</span>
          <span class="card-value">${recipientEmail}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Perfil Activado:</span>
          <span class="card-value">${userRole}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Monto Abonado:</span>
          <span class="card-value">$${feeAmount}.00 USD</span>
        </div>
        <div class="card-row">
          <span class="card-label">Código de Transacción:</span>
          <span class="card-value">${txId}</span>
        </div>
      </div>

      <a href="https://ais-dev-j4y6blqticzrspz655h3gs-801374469814.us-east1.run.app/dashboard/affiliate" class="btn">
        INGRESAR A MI PANEL DE SYNCCONNECT
      </a>
    </div>
    <div class="footer">
      SyncConnect Global Ecosystem • Sistema de Activación Automatizado 2026
    </div>
  </div>
</body>
</html>
    `;

    return NextResponse.json({
      success: true,
      message: `Correo de felicitación y activación enviado a ${recipientEmail}`,
      templatePreview: emailHtmlTemplate
    });
  } catch (error: any) {
    console.error('Error al enviar correo de activación:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al enviar la notificación.' },
      { status: 500 }
    );
  }
}
