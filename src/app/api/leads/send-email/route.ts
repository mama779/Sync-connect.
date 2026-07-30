import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { generateGeminiContent } from "@/lib/gemini-helper";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { sellerEmail, sellerName, leadEmails, subject, body, productName } = await req.json();

    if (!leadEmails || !Array.isArray(leadEmails) || leadEmails.length === 0) {
      return NextResponse.json({ error: "Debe proporcionar al menos un correo de destinatario." }, { status: 400 });
    }

    if (!subject || !body) {
      return NextResponse.json({ error: "El asunto y el contenido del correo son obligatorios." }, { status: 400 });
    }

    // Usar Gemini para optimizar el contenido del correo de venta o seguimiento si el vendedor lo requiere
    let polishedBody = body;
    try {
      const response = await generateGeminiContent(ai, {
        model: "gemini-3.6-flash",
        contents: `Eres un experto en Email Marketing y Copywriting de Alta Conversión en español.
Optimiza el siguiente borrador de correo enviado por el vendedor "${sellerName || 'Vendedor SyncConnect'}" (${sellerEmail}) para su producto "${productName || 'Infoproducto Digital'}".
Mantén la intención original pero mejora la claridad, empatía, llamados a la acción y persuasión.

Asunto original: ${subject}
Cuerpo original: ${body}

Entrega el contenido final del correo redactado profesionalmente en texto plano con saltos de línea claros.`,
      });
      if (response.text) {
        polishedBody = response.text;
      }
    } catch (e) {
      console.warn("No se pudo aplicar pulido de AI al correo, usando cuerpo original:", e);
    }

    // Simular el envío exitoso a través de infraestructura de Emailing (ej. Nodemailer, Resend o SendGrid)
    console.log(`[EMAIL DISPATCH] De: ${sellerEmail} Para: ${leadEmails.length} leads. Asunto: ${subject}`);

    return NextResponse.json({
      success: true,
      message: `Correo enviado exitosamente a ${leadEmails.length} clientes/leads.`,
      sentCount: leadEmails.length,
      optimizedBody: polishedBody,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error en send-email API:", error);
    return NextResponse.json({ error: error?.message || "Error al procesar el envío de correo." }, { status: 500 });
  }
}
