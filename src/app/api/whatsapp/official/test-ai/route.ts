import { NextRequest, NextResponse } from "next/server";
import { generateOfficialAIResponse, getOfficialWhatsAppConfig } from "@/lib/whatsapp-official-service";

export async function POST(req: NextRequest) {
  try {
    const { prompt, customSystemPrompt } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: "Escriba una pregunta para probar la IA" }, { status: 400 });
    }

    const config = await getOfficialWhatsAppConfig();
    const systemPromptToUse = customSystemPrompt || config.systemPrompt;
    const aiReply = await generateOfficialAIResponse(prompt, systemPromptToUse);

    return NextResponse.json({
      success: true,
      prompt,
      aiReply,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al probar la IA" },
      { status: 500 }
    );
  }
}
