'use server';

import nodemailer from 'nodemailer';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Obtiene la configuración SMTP desde Firestore con fallback a cuenta maestra.
 */
async function getSmtpConfig() {
  const { firestore } = initializeFirebase();
  try {
    const configDoc = await getDoc(doc(firestore, 'site_config', 'settings'));
    if (configDoc.exists()) {
      const data = configDoc.data();
      if (data.smtp_user && data.smtp_password) {
        return {
          host: (data.smtp_host || 'smtp.gmail.com').trim(),
          port: parseInt(data.smtp_port || '465'),
          user: data.smtp_user.trim(),
          pass: data.smtp_password.trim(),
          fromName: data.smtp_from_name || 'Sync Connect',
        };
      }
    }
  } catch (error) {
    console.error("Error SMTP Config:", error);
  }
  
  return {
    host: 'smtp.gmail.com',
    port: 465,
    user: 'affiliatesync0@gmail.com',
    pass: 'wagrmuphptnevpin', 
    fromName: 'Sync Connect'
  };
}

function getEmailWrapper(content: string, title: string = "Sync Connect") {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #f1f5f9; border-radius: 32px; overflow: hidden; background-color: #ffffff; box-shadow: 0 20px 50px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #131921 0%, #232f3e 100%); padding: 50px 40px; text-align: center;">
        <h1 style="margin: 0; color: #ff9900; font-size: 28px; font-weight: 900; letter-spacing: -1px; font-style: italic;">Sync<span style="color: #ffffff;">.Connect</span></h1>
        <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 3px;">Elite Network System</p>
      </div>
      <div style="padding: 50px 40px; line-height: 1.8; color: #334155; font-size: 16px; background-color: #ffffff;">
        <div style="margin-bottom: 30px;">
           <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: -0.5px;">${title}</h2>
        </div>
        ${content}
      </div>
      <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0; font-weight: 800; font-size: 10px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1px;">&copy; ${new Date().getFullYear()} Sync Connect Nicaragua. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
}

export async function sendEmail({ to, subject, text, html, title }: { to: string, subject: string, text: string, html?: string, title?: string }) {
  try {
    const config = await getSmtpConfig();
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.user}>`,
      to,
      subject,
      text,
      html: html || getEmailWrapper(text.split('\n').map(line => `<p style="margin-bottom: 15px;">${line}</p>`).join(''), title || subject),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Mail Send Error:", error.message);
    return { success: false, error: error.message };
  }
}

export async function testEmailConfig(to: string) {
  return await sendEmail({
    to,
    subject: '🧪 Prueba de Conexión Sync Connect',
    text: 'Si recibes este correo, tu configuración SMTP de Gmail está funcionando correctamente dentro de la infraestructura de Sync Connect.',
    title: 'Prueba de Sistema'
  });
}

export async function sendLoginAlertEmail({ to, name }: { to: string, name: string }) {
  const content = `
    <div style="text-align: left;">
      <p style="font-size: 18px; color: #0f172a; font-weight: 700; margin-bottom: 20px;">Aviso de Seguridad</p>
      <p style="margin-bottom: 20px; font-size: 16px; color: #475569;">
        Hola <strong>${name}</strong>, se ha detectado un nuevo inicio de sesión en tu cuenta de Sync Connect.
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin: 30px 0;">
        <p style="margin: 0; font-size: 13px; color: #64748b;"><strong>Fecha y Hora:</strong> ${new Date().toLocaleString()}</p>
        <p style="margin: 5px 0 0 0; font-size: 13px; color: #64748b;"><strong>Ubicación:</strong> Detectada por Red Sync</p>
      </div>
    </div>
  `;
  return await sendEmail({ 
    to, 
    subject: '🔐 Alerta: Nuevo Inicio de Sesión detectado', 
    text: `Se ha iniciado sesión en tu cuenta de Sync Connect a las ${new Date().toLocaleString()}.`, 
    html: getEmailWrapper(content, "Seguridad de Acceso"),
    title: "Alerta de Acceso"
  });
}

export async function sendPayoutProcessedEmail({ to, name, amount }: { to: string, name: string, amount: number }) {
  const content = `
    <div style="text-align: left;">
      <p style="font-size: 18px; color: #0f172a; font-weight: 700; margin-bottom: 20px;">¡Hola, ${name}!</p>
      <p style="margin-bottom: 20px; font-size: 16px; color: #475569;">
        Nos complace informarte que se ha procesado tu liquidación de comisiones correspondiente a tu actividad como <strong>Socio Platinum</strong>.
      </p>
      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center;">
        <h4 style="margin: 0 0 10px 0; color: #0f172a; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Monto Liquidado:</h4>
        <p style="margin: 0; font-size: 32px; font-weight: 900; color: #15803d; font-style: italic;">$${amount.toFixed(2)} USD</p>
      </div>
      <p style="margin-bottom: 30px; font-size: 15px; color: #475569;">
        El dinero ha sido enviado a la cuenta bancaria que tienes registrada en tu perfil.
      </p>
    </div>
  `;
  return await sendEmail({ 
    to, 
    subject: '💰 ¡Pago Procesado! Tus comisiones han sido enviadas', 
    text: `Se ha procesado tu pago de $${amount.toFixed(2)}.`, 
    html: getEmailWrapper(content, "Comprobante de Pago"), 
    title: "Liquidación Sync Connect" 
  });
}

export async function sendAccountActivatedEmail({ to, name }: { to: string, name: string }) {
  const content = `
    <div style="text-align: left;">
      <p style="font-size: 18px; color: #0f172a; font-weight: 700; margin-bottom: 20px;">¡Felicidades, ${name}!</p>
      <p style="margin-bottom: 20px; font-size: 16px; color: #475569;">
        Tu cuenta de <strong>Socio Embajador</strong> ha sido aprobada manualmente.
      </p>
      <div style="background-color: #f8fafc; border-left: 4px solid #ff9900; padding: 25px; border-radius: 12px; margin: 30px 0;">
        <h4 style="margin: 0 0 10px 0; color: #0f172a; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Nuevo Rango Alcanzado:</h4>
        <p style="margin: 0; font-size: 24px; font-weight: 900; color: #1e293b; font-style: italic;">Socio Platinum ✓</p>
      </div>
    </div>
  `;
  return await sendEmail({ 
    to, 
    subject: '💎 ¡Cuenta Activada! Bienvenido a Sync Platinum', 
    text: 'Tu cuenta de Socio Platinum ha sido aprobada. Ya puedes entrar al sistema.', 
    html: getEmailWrapper(content, "Bienvenida Oficial"), 
    title: "Activación Sync Connect" 
  });
}

/**
 * Notifica al usuario sobre un cambio en el estatus de su cuenta (Bloqueado/Activo).
 */
export async function sendAccountStatusEmail({ to, name, status }: { to: string, name: string, status: string }) {
  const isBlocked = status === 'Blocked';
  const content = `
    <div style="text-align: left;">
      <p style="font-size: 18px; color: #0f172a; font-weight: 700; margin-bottom: 20px;">Aviso de Sistema</p>
      <p style="margin-bottom: 20px; font-size: 16px; color: #475569;">
        Hola <strong>${name}</strong>, te informamos sobre una actualización en el estado de tu cuenta de Sync Connect.
      </p>
      <div style="background-color: ${isBlocked ? '#fef2f2' : '#f0fdf4'}; border-left: 4px solid ${isBlocked ? '#ef4444' : '#22c55e'}; padding: 25px; border-radius: 12px; margin: 30px 0;">
        <h4 style="margin: 0 0 5px 0; color: #0f172a; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">Nuevo Estado de Cuenta:</h4>
        <p style="margin: 0; font-size: 20px; font-weight: 900; color: ${isBlocked ? '#991b1b' : '#15803d'}; text-transform: uppercase;">
          ${isBlocked ? 'Cuenta Restringida / Bloqueada' : 'Cuenta Activa / Desbloqueada'}
        </p>
      </div>
      <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
        ${isBlocked 
          ? 'Tu acceso a la infraestructura ha sido suspendido. Por favor, contacta a soporte para más detalles.' 
          : 'Tu acceso ha sido restaurado. Ya puedes entrar a tu panel de control.'}
      </p>
    </div>
  `;
  return await sendEmail({ 
    to, 
    subject: `Sync Connect: Actualización de Estatus (${isBlocked ? 'Restringido' : 'Activo'})`, 
    text: `Tu cuenta ahora está ${isBlocked ? 'Bloqueada' : 'Activa'}.`, 
    html: getEmailWrapper(content, "Estatus de Seguridad"), 
    title: "Notificación de Cuenta" 
  });
}

export async function sendOrderConfirmedEmail({ to, name, product, isPhysical }: { to: string, name: string, product: string, isPhysical: boolean }) {
  const content = `<p>Hola ${name}, tu registro de compra para <strong>${product}</strong> ha sido exitoso.</p><p>${isPhysical ? 'Nuestro equipo de logística se pondrá en contacto.' : 'Tu acceso digital está siendo validado por la administración.'}</p>`;
  return await sendEmail({ to, subject: `🛒 Registro de Compra: ${product}`, text: 'Pedido registrado.', html: getEmailWrapper(content, "Confirmación de Orden") });
}

export async function sendNewPasswordAdmin({ to, name, newPassword }: { to: string, name: string, newPassword: string }) {
  const content = `<p>Hola ${name}, se ha generado un nuevo acceso administrativo para tu cuenta.</p><p>Tu nueva clave temporal es:</p><h2 style="text-align:center; letter-spacing:5px; background:#f8fafc; padding:20px; border-radius:12px;">${newPassword}</h2>`;
  return await sendEmail({ to, subject: '🔐 Restauración de Acceso', text: `Tu clave es: ${newPassword}`, html: getEmailWrapper(content, "Nueva Contraseña") });
}

export async function sendPasswordResetEmailCustom({ to, link }: { to: string, link: string }) {
  const content = `
    <div style="margin-bottom: 30px; text-align: center;">
      <p style="font-size: 16px; color: #475569; margin-bottom: 35px; text-align: left;">
        Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para continuar:
      </p>
      <div style="margin: 40px 0;">
        <a href="${link}" style="background: linear-gradient(135deg, #ff9900 0%, #e68a00 100%); color: #ffffff; padding: 22px 40px; border-radius: 18px; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; box-shadow: 0 10px 30px rgba(255, 153, 0, 0.3);">
          Establecer Nueva Contraseña
        </a>
      </div>
    </div>
  `;

  return await sendEmail({
    to,
    subject: '🔐 Recuperación de Acceso: Sync Connect',
    text: `Usa este enlace para cambiar tu contraseña: ${link}`,
    html: getEmailWrapper(content, "Seguridad de Cuenta"),
    title: "Seguridad de Cuenta"
  });
}

/**
 * Envia el código de verificación de 6 dígitos al correo electrónico del usuario.
 */
export async function sendVerificationCodeEmail({ to, name, code }: { to: string, name: string, code: string }) {
  const content = `
    <div style="text-align: left;">
      <p style="font-size: 18px; color: #0f172a; font-weight: 700; margin-bottom: 20px;">¡Hola, ${name || 'Usuario Sync Connect'}!</p>
      <p style="margin-bottom: 25px; font-size: 16px; color: #475569;">
        Para completar el registro y verificar la propiedad de tu dirección de correo electrónico, utiliza el siguiente código de seguridad de 6 dígitos:
      </p>
      <div style="background-color: #f8fafc; border: 2px dashed #ff9900; padding: 25px; border-radius: 16px; margin: 30px 0; text-align: center;">
        <span style="font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #1e293b; font-family: monospace;">${code}</span>
      </div>
      <p style="margin-top: 20px; font-size: 13px; color: #64748b; text-align: center;">
        Este código es válido por 30 minutos. Si no solicitaste esta verificación, puedes ignorar este mensaje.
      </p>
    </div>
  `;

  return await sendEmail({
    to,
    subject: `🔑 Código de Verificación: ${code} - Sync Connect`,
    text: `Tu código de verificación de correo en Sync Connect es: ${code}`,
    html: getEmailWrapper(content, "Verificación de Correo"),
    title: "Verificación de Cuenta"
  });
}

/**
 * Envía un correo motivacional para recordar la activación de la cuenta.
 */
export async function sendActivationReminderEmail({ to, name, role, activationPrice }: { to: string, name: string, role?: string, activationPrice?: string }) {
  const isSeller = role === 'seller';
  const priceText = activationPrice || (isSeller ? '$7 USD' : '$6 USD');

  const content = `
    <div style="text-align: left;">
      <p style="font-size: 18px; color: #0f172a; font-weight: 700; margin-bottom: 20px;">¡Hola, ${name || 'Futuro Socio'}!</p>
      <p style="margin-bottom: 20px; font-size: 16px; color: #475569;">
        Notamos que aún no has completado tu <strong>activación total</strong> en la plataforma Sync Connect.
      </p>
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left: 5px solid #22c55e; padding: 25px; border-radius: 16px; margin: 30px 0;">
        <h3 style="margin: 0 0 10px 0; color: #14532d; font-size: 18px; font-weight: 900; text-transform: uppercase;">🚀 ¿Qué estás perdiendo al no activarte?</h3>
        <ul style="margin: 10px 0 0 20px; padding: 0; color: #166534; font-size: 14px; line-height: 1.8;">
          <li>Acceso inmediato a los <strong>enlaces Cycling</strong> de alta conversión.</li>
          <li>Asistencia 24/7 de tu <strong>Copiloto de IA para ventas</strong>.</li>
          <li>Comisiones directas e instantáneas por venta realizada.</li>
          <li>Acceso al mercado global de infoproductos exclusivos.</li>
        </ul>
      </div>
      <p style="margin-bottom: 25px; font-size: 15px; color: #334155;">
        Completa hoy tu activación por solo <strong>${priceText}</strong> o aprovecha un cupo de regalo si la promoción está activa.
      </p>
      <div style="text-align: center; margin: 35px 0;">
        <a href="https://ais-dev-4fet3hgtk6umqlabggcpck-144951180309.us-west2.run.app/auth/login" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 20px 36px; border-radius: 16px; text-decoration: none; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);">
          ⚡ ACTIVAR MI CUENTA AHORA
        </a>
      </div>
    </div>
  `;

  return await sendEmail({
    to,
    subject: '⚡ ¡No te quedes fuera! Completa tu activación en Sync Connect',
    text: `Hola ${name}, activa tu cuenta en Sync Connect y accede a tus enlaces y Copiloto IA.`,
    html: getEmailWrapper(content, "Recordatorio de Activación"),
    title: "Activación Pendiente"
  });
}

