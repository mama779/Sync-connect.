import { NextRequest, NextResponse } from "next/server";
import { sendOfficialWhatsAppMessage, logOfficialWhatsAppConversation } from "@/lib/whatsapp-official-service";

export async function POST(req: NextRequest) {
  try {
    const { recipientPhone, message } = await req.json();

    if (!recipientPhone || !message) {
      return NextResponse.json(
        { error: "Se requiere un número de destino y el texto del mensaje" },
        { status: 400 }
      );
    }

    const result = await sendOfficialWhatsAppMessage(recipientPhone, message);

    if (result.success) {
      await logOfficialWhatsAppConversation({
        fromNumber: recipientPhone.replace(/\D/g, ''),
        senderName: 'Manual (Admin)',
        text: message,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        status: 'manual'
      });

      return NextResponse.json({
        success: true,
        data: result.data,
        message: "Mensaje enviado exitosamente a través de Meta API"
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Error al enviar mensaje" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error procesando envío de mensaje" },
      { status: 500 }
    );
  }
}
