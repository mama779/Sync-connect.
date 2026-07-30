import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { generateGeminiContent } from "@/lib/gemini-helper";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply: "El servicio de IA requiere configuración de API Key. Mientras tanto, puedes revisar los productos en el catálogo oficial de SyncConnect."
      });
    }

    const { messages, productsCatalog } = await req.json();

    const ai = new GoogleGenAI({ apiKey });

    // Format catalog context
    const catalogSummary = Array.isArray(productsCatalog) && productsCatalog.length > 0
      ? productsCatalog.map((p: any, idx: number) => 
          `${idx + 1}. [ID: ${p.id}] "${p.name || 'Producto Digital'}" - Precio: $${p.price || 0} USD - Comisión Afiliado: ${p.commission || '80'}% - Descripción: ${p.description || 'Curso digital y formación profesional'}`
        ).join("\n")
      : "1. Master en Marketing Digital y Ventas - $49 USD (80% comisión)\n2. Escuela de Creadores de Contenido - $29 USD (70% comisión)\n3. Automatización de Ventas con IA - $67 USD (80% comisión)\n4. Copiloto de Cierre de Ventas - $15 USD (80% comisión)";

    const systemPrompt = `Eres el Copiloto de Ventas e Inteligencia Artificial Oficial de SyncConnect.
Tu objetivo principal es ayudar a Afiliados, Vendedores y Compradores a cerrar ventas de productos digitales, responder objeciones de clientes, brindar guiones de prospección persuasivos y recomendar los productos ideales del catálogo de SyncConnect.

CATÁLOGO ACTUALIZADO DE SYNCCONNECT:
${catalogSummary}

REGLAS DE ACTUACIÓN:
1. Responde de forma highly profesional, persuasiva y empática.
2. Si un comprador hace una pregunta sobre un curso o producto, brinda detalles claros, beneficios principales, precio en USD y llamado a la acción persuasivo.
3. Si un afiliado te pide ayuda para vender a un cliente, proporciónale el mensaje o guión exacto listo para copiar y enviar al cliente.
4. Siempre mantén el nombre de la plataforma como "SyncConnect".
5. Si no estás seguro del producto exacto, recomienda las mejores opciones del catálogo actual.
6. Responde de forma estructurada con viñetas, negritas y llamadas a la acción claras.`;

    const chatHistory = Array.isArray(messages) ? messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    })) : [];

    // Prompt construction
    const promptText = chatHistory.length > 0
      ? chatHistory[chatHistory.length - 1].parts[0].text
      : "Hola, ¿cómo puedes ayudarme a vender los productos de SyncConnect?";

    const response = await generateGeminiContent(ai, {
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    const reply = response.text || "Hola, soy el Copiloto de Ventas SyncConnect. ¿En qué puedo ayudarte hoy?";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Error en Gemini Sales Copilot, entregando respuesta de contingencia:", error);
    return NextResponse.json({
      reply: "¡Hola! En este momento estoy experimentando un pico de consultas elevadas en la red. Sin embargo, como tu **Copiloto SyncConnect**, te sugiero utilizar nuestros enlaces Cycling de alta conversión en la sección de enlaces de marketing, o comunicarte con soporte directo por WhatsApp."
    });
  }
}
