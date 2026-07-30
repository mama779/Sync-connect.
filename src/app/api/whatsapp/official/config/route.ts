import { NextRequest, NextResponse } from "next/server";
import { getOfficialWhatsAppConfig, saveOfficialWhatsAppConfig, getOfficialWhatsAppLogs } from "@/lib/whatsapp-official-service";

export async function GET() {
  try {
    const config = await getOfficialWhatsAppConfig();
    const logs = await getOfficialWhatsAppLogs(50);

    return NextResponse.json({
      success: true,
      config,
      logs
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al obtener configuración de WhatsApp Oficial" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phoneNumberId, accessToken, businessAccountId, verifyToken, botActive, systemPrompt } = body;

    const updated = await saveOfficialWhatsAppConfig({
      phoneNumberId,
      accessToken,
      businessAccountId,
      verifyToken,
      botActive,
      systemPrompt
    });

    return NextResponse.json({
      success: true,
      config: updated,
      message: "Configuración guardada exitosamente"
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error guardando configuración de WhatsApp Oficial" },
      { status: 500 }
    );
  }
}
