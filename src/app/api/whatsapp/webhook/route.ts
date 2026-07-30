import { NextRequest, NextResponse } from "next/server";
import { 
  getOfficialWhatsAppConfig, 
  sendOfficialWhatsAppMessage, 
  generateOfficialAIResponse, 
  logOfficialWhatsAppConversation 
} from "@/lib/whatsapp-official-service";

const HARDCODED_VERIFY_TOKEN = "syncconnect123";

// Webhook Verification (Meta GET request)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const config = await getOfficialWhatsAppConfig();
    const expectedToken = config.verifyToken || HARDCODED_VERIFY_TOKEN;

    if (mode === "subscribe" && (token === HARDCODED_VERIFY_TOKEN || token === expectedToken)) {
      console.log("✅ Webhook verificado correctamente");
      return new NextResponse(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return NextResponse.json(
      { success: false, message: "Token inválido" },
      { status: 403 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error en validación de webhook" }, { status: 500 });
  }
}

// Incoming WhatsApp Webhook Notification (Meta POST request)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("Webhook recibido:");
    console.log(JSON.stringify(body, null, 2));

    // Verify WhatsApp message payload structure
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value || !value.messages || value.messages.length === 0) {
      // Event status updates (sent, delivered, read) or unsupported event
      return NextResponse.json({ success: true, status: "ignored" }, { status: 200 });
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];

    const fromNumber = message.from; // Sender WhatsApp phone number
    const senderName = contact?.profile?.name || fromNumber;
    const messageType = message.type;

    let userText = "";
    if (messageType === "text") {
      userText = message.text?.body || "";
    } else if (messageType === "button") {
      userText = message.button?.text || "";
    } else if (messageType === "interactive") {
      userText = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || "";
    } else {
      userText = `[Mensaje tipo: ${messageType}]`;
    }

    if (!userText.trim()) {
      return NextResponse.json({ success: true, status: "empty_text" }, { status: 200 });
    }

    console.log(`[Meta WhatsApp Webhook Received] De ${senderName} (+${fromNumber}): "${userText}"`);

    const config = await getOfficialWhatsAppConfig();

    if (config.botActive) {
      // Generate Gemini 3.6 Flash AI response
      const aiReply = await generateOfficialAIResponse(userText, config.systemPrompt);

      // Send response via Meta Graph API
      const sendResult = await sendOfficialWhatsAppMessage(fromNumber, aiReply, config);

      await logOfficialWhatsAppConversation({
        fromNumber,
        senderName,
        text: userText,
        aiReply: aiReply,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        status: sendResult.success ? 'replied' : 'error',
        errorDetails: sendResult.error
      });

      console.log(`[Meta WhatsApp Webhook AI Replied] Status: ${sendResult.success ? 'OK' : sendResult.error}`);
    } else {
      await logOfficialWhatsAppConversation({
        fromNumber,
        senderName,
        text: userText,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        status: 'received'
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error procesando Webhook:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
