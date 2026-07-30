import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { generateGeminiContent } from "@/lib/gemini-helper";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "La clave GEMINI_API_KEY no está configurada en el servidor." },
        { status: 500 }
      );
    }

    const { prompt, pageType, selectedProducts } = await req.json();

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `Eres el Diseñador y Generador de Páginas de Venta y Tiendas Digitales de SyncConnect.
Genera una estructura de página de ventas moderna, responsiva, persuasiva e impactante utilizando componentes y clases de Tailwind CSS.

Tipo de página solicitada: ${pageType || 'single-product'}
Instrucciones del usuario: "${prompt || 'Crea una página de ventas de alta conversión para mi producto digital'}"
Productos asociados: ${JSON.stringify(selectedProducts || [])}

REGLAS DE GENERACIÓN:
1. Siempre usa el branding de SyncConnect.
2. Incluye secciones clave: Hero principal con título de alto impacto, Subtítulo persuasivo, Selector o reproductor de Video/Imagen, Lista de beneficios con íconos de check, Selector de módulos del curso o catálogo de productos (si es tienda tipo Shopify), Garantía de satisfacción de 7 días, Sección de Testimonios reales con estrellas, Botón de Compra / Checkout destacado y Sección de Preguntas Frecuentes.
3. Devuelve una respuesta estructurada en formato JSON con la siguiente forma:
{
  "title": "Título de la Página",
  "heroTitle": "Encabezado Principal Impactante",
  "heroSubtitle": "Subtítulo Descriptivo y Persuasivo",
  "ctaText": "Texto del Botón de Acción (Ej: ¡QUIERO ACCEDER AHORA CON 50% DCTO!)",
  "priceTag": "$15 USD",
  "originalPrice": "$49 USD",
  "benefits": [
    "Beneficio clave 1 con explicación",
    "Beneficio clave 2 con explicación",
    "Beneficio clave 3 con explicación",
    "Acceso de por vida e intensivo"
  ],
  "modules": [
    { "title": "Módulo 1: Fundamentos Acelerados", "description": "Aprende las bases estratégicas para posicionarte rápido." },
    { "title": "Módulo 2: Sistema de Ventas en Piloto Automático", "description": "Implementa la IA para responder y cerrar ventas 24/7." }
  ],
  "testimonials": [
    { "name": "Carlos M.", "role": "Afiliado SyncConnect", "comment": "Gané mis primeras comisiones en menos de 48 horas gracias a este material.", "rating": 5 },
    { "name": "Elena R.", "role": "Estudiante", "comment": "La calidad de los videos y la explicación paso a paso son excelentes.", "rating": 5 }
  ],
  "faq": [
    { "question": "¿Cómo recibo el acceso?", "answer": "Inmediatamente después de realizar tu pago recibirás un correo con tus credenciales de acceso a la plataforma SyncConnect." },
    { "question": "¿Tengo garantía de devolución?", "answer": "Sí, cuentas con 7 días de garantía incondicional para solicitar el reembolso si el programa no cumple tus expectativas." }
  ],
  "htmlOutput": "<div class='min-h-screen bg-slate-900 text-white font-sans'>...</div>"
}

Responde ÚNICAMENTE con el objeto JSON válido. Sin Markdown extra alrededor si es posible, o formateado como JSON puro.`;

    const response = await generateGeminiContent(ai, {
      model: "gemini-3.6-flash",
      contents: systemPrompt
    });

    const responseText = response.text || "";
    
    // Clean json formatting
    const cleanedJson = responseText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let pageData;
    try {
      pageData = JSON.parse(cleanedJson);
    } catch (e) {
      pageData = {
        title: "Página Generada con IA - SyncConnect",
        heroTitle: "Lleva tu Negocio Digital al Siguiente Nivel con SyncConnect",
        heroSubtitle: "Aprende las estrategias probadas para vender productos digitales y escalar tus comisiones hoy mismo.",
        ctaText: "¡OBTENER ACCESO INMEDIATO POR $15!",
        priceTag: "$15 USD",
        originalPrice: "$49 USD",
        benefits: [
          "Acceso inmediato al campus virtual 24/7",
          "Material publicitario listo para descargar y usar",
          "Acompañamiento con la Inteligencia Artificial de Ventas",
          "Certificado oficial al finalizar"
        ],
        modules: [
          { title: "Módulo 1: Configuración de la Cuenta", description: "Configura tu perfil de afiliado y vincula tus cuentas de pago." },
          { title: "Módulo 2: Estrategia de Prospección con IA", description: "Usa el Copiloto de IA para responder y cerrar clientes automáticamente." }
        ],
        testimonials: [
          { name: "Lucía P.", role: "Socia Comercial", comment: "Súper fácil de entender y aplicar.", rating: 5 }
        ],
        faq: [
          { question: "¿Puedo acceder desde mi celular?", answer: "Sí, la plataforma es 100% responsiva y compatible con dispositivos móviles." }
        ]
      };
    }

    return NextResponse.json({ pageData });
  } catch (error: any) {
    console.error("Error en Gemini Page Generator:", error);
    return NextResponse.json(
      { error: error?.message || "Error al generar la página con IA." },
      { status: 500 }
    );
  }
}
