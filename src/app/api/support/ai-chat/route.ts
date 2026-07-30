import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { initializeFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { generateGeminiContent } from "@/lib/gemini-helper";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Mensajes no válidos." }, { status: 400 });
    }

    // Intentar leer la API Key desde Firestore (guardada por el admin) o usar la provista como fallback
    let apiKey = process.env.GEMINI_API_KEY || "";
    try {
      const { firestore } = initializeFirebase();
      const configDoc = await getDoc(doc(firestore, 'site_config', 'gemini-config'));
      if (configDoc.exists()) {
        const data = configDoc.data();
        if (data.geminiApiKey && data.geminiApiKey.trim()) {
          apiKey = data.geminiApiKey.trim();
        }
      }
    } catch (e) {
      console.warn("No se pudo leer la configuración de WhatsApp de Firestore:", e);
    }

    if (!apiKey) {
      // Retornar una respuesta simulada amigable si no se ha configurado la clave API en la plataforma de vista previa.
      return NextResponse.json({
        text: "¡Hola! Soy tu Asistente de Soporte de Sync. Para poder responder tus preguntas usando IA de última generación, por favor asegúrate de configurar la variable de entorno `GEMINI_API_KEY` en la configuración de la aplicación (Settings > Secrets). Mientras tanto, puedo decirte que Sync.Pro es la plataforma de formación y marketing de afiliados más completa."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Convert chat history format
    const formattedContents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const response = await generateGeminiContent(ai, {
      model: "gemini-3.6-flash",
      contents: formattedContents,
      config: {
        systemInstruction: `Eres el "Asistente de Soporte IA de SixFigure / SyncConnect", una plataforma líder en infoproductos y marketing de afiliados de alta calidad. 
Tus funciones son:
1. Ayudar a los alumnos con dudas de sus cursos, navegación de la plataforma, y progreso académico.
2. Ayudar a los afiliados a entender cómo compartir sus enlaces de afiliación Cycling, ver estadísticas de ventas en tiempo real, solicitar liquidaciones y maximizar conversiones.
3. Informar sobre la activación de la cuenta: Afiliados pagan $6 USD únicos y Vendedores/Productores $7 USD únicos.
4. Ayudar con soporte técnico, como la descarga de certificados, visualización del reproductor de video profesional, configuración de perfil o restablecimiento de accesos.
5. Responder de forma profesional, cálida, concisa y estructurada en español. Usa viñetas cuando sea apropiado.`,
        temperature: 0.7,
      },
    });

    const text = response.text || "Lo siento, no pude procesar la solicitud en este momento.";
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Error en la ruta del chat de IA:", error);
    return NextResponse.json({ 
      error: "Error interno del servidor", 
      details: error.message 
    }, { status: 500 });
  }
}
