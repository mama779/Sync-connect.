import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { generateGeminiContent } from "@/lib/gemini-helper";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pageType,
      category,
      productName,
      description,
      targetAudience,
      price,
      offerDetails,
      guaranteeDays,
      affiliateLink,
      whatsappNumber,
      customPrompt,
    } = body;

    const systemInstruction = `Eres un experto copywriter y diseñador de páginas de ventas de alta conversión para marketing de afiliados.
Tu objetivo es crear el contenido completo, estructura de secciones y paleta visual para una página web persuasiva y moderna.
Asegúrate de:
1. Usar copywriting persuasivo en español con fórmulas AIDA/PAS (Atención, Interés, Deseo, Acción).
2. Insertar de manera natural y coherente el enlace de afiliado proporcionado (${affiliateLink || '#'}) en todos los botones de llamada a la acción (CTA) y botones de compra.
3. Generar titulares potentes, beneficios irresistibles, testimonios creíbles, preguntas frecuentes claras y una garantía contundente.
4. Generar sugerencias de colores y fuentes elegantes optimizadas para conversión.`;

    const userPrompt = `Crea una página completa con las siguientes especificaciones:
- Tipo de página: ${pageType || 'single_product'}
- Categoría / Industria: ${category || 'digital_products'}
- Nombre del producto/servicio: ${productName || 'Producto Estrella'}
- Descripción principal: ${description || 'El producto definitivo para transformar tus resultados.'}
- Público objetivo: ${targetAudience || 'Emprendedores y profesionales.'}
- Precio / Oferta: ${price || '$47 USD'}
- Detalle de la oferta especial: ${offerDetails || 'Descuento del 50% por tiempo limitado + 3 Bonos Exclusivos.'}
- Días de garantía: ${guaranteeDays || 7} días.
- Enlace de afiliado obligatorio para CTAs: ${affiliateLink || '#'}
- Número de WhatsApp: ${whatsappNumber || ''}
${customPrompt ? `- Instrucciones adicionales del afiliado: ${customPrompt}` : ''}

Responde estrictamente en formato JSON siguiendo el esquema proporcionado.`;

    const response = await generateGeminiContent(ai, {
      model: "gemini-3.6-flash",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            theme: {
              type: Type.OBJECT,
              properties: {
                preset: { type: Type.STRING },
                primaryColor: { type: Type.STRING },
                accentColor: { type: Type.STRING },
                backgroundColor: { type: Type.STRING },
                fontFamily: { type: Type.STRING },
              },
              required: ["primaryColor", "accentColor", "backgroundColor", "fontFamily"],
            },
            seo: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                keywords: { type: Type.STRING },
              },
              required: ["title", "description", "keywords"],
            },
            header: {
              type: Type.OBJECT,
              properties: {
                brandName: { type: Type.STRING },
                tagline: { type: Type.STRING },
                ctaText: { type: Type.STRING },
                ctaUrl: { type: Type.STRING },
              },
              required: ["brandName", "ctaText"],
            },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING },
                  name: { type: Type.STRING },
                  content: {
                    type: Type.OBJECT,
                    properties: {
                      headline: { type: Type.STRING },
                      subheadline: { type: Type.STRING },
                      title: { type: Type.STRING },
                      subtitle: { type: Type.STRING },
                      badgeText: { type: Type.STRING },
                      ctaText: { type: Type.STRING },
                      ctaUrl: { type: Type.STRING },
                      imageUrl: { type: Type.STRING },
                      videoUrl: { type: Type.STRING },
                      priceText: { type: Type.STRING },
                      originalPrice: { type: Type.STRING },
                      guaranteeDays: { type: Type.NUMBER },
                      guaranteeText: { type: Type.STRING },
                      timerMinutes: { type: Type.NUMBER },
                      items: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            title: { type: Type.STRING },
                            desc: { type: Type.STRING },
                            icon: { type: Type.STRING },
                            author: { type: Type.STRING },
                            role: { type: Type.STRING },
                            rating: { type: Type.NUMBER },
                            q: { type: Type.STRING },
                            a: { type: Type.STRING },
                            price: { type: Type.STRING },
                            buttonUrl: { type: Type.STRING },
                            imageUrl: { type: Type.STRING },
                          },
                        },
                      },
                    },
                  },
                },
                required: ["id", "type", "name", "content"],
              },
            },
            whatsappConfig: {
              type: Type.OBJECT,
              properties: {
                enabled: { type: Type.BOOLEAN },
                number: { type: Type.STRING },
                message: { type: Type.STRING },
                buttonText: { type: Type.STRING },
              },
              required: ["enabled", "message", "buttonText"],
            },
            footerMessage: { type: Type.STRING },
          },
          required: ["title", "theme", "seo", "sections", "whatsappConfig"],
        },
      },
    });

    let rawText = response.text || "";
    if (!rawText.trim()) {
      return NextResponse.json({ error: "Gemini no devolvió texto" }, { status: 500 });
    }

    // Clean markdown wrap if present
    rawText = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsedData: any;
    try {
      parsedData = JSON.parse(rawText);
    } catch (parseErr) {
      console.warn("Error parsing Gemini JSON directly, attempting repair...", parseErr);
      
      // Try fixing truncated json or trailing quotes
      try {
        let repaired = rawText;
        // If unterminated string or missing closing brackets
        const openBraces = (repaired.match(/\{/g) || []).length;
        const closeBraces = (repaired.match(/\}/g) || []).length;
        const openBrackets = (repaired.match(/\[/g) || []).length;
        const closeBrackets = (repaired.match(/\]/g) || []).length;

        if (repaired.endsWith('"')) {
          // quote open
        } else if (!repaired.endsWith('}') && !repaired.endsWith(']')) {
          repaired += '"';
        }

        for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";
        for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";

        parsedData = JSON.parse(repaired);
      } catch (secondErr) {
        console.error("Failed to repair Gemini JSON. Fallback to structured default:", secondErr);
        
        // Structured fallback so generator never fails completely
        parsedData = {
          title: productName || "Página de Ventas",
          subtitle: description || "La mejor solución para tus objetivos",
          theme: {
            preset: "emerald",
            primaryColor: "#059669",
            accentColor: "#10b981",
            backgroundColor: "#0f172a",
            fontFamily: "Inter"
          },
          seo: {
            title: `${productName || 'Producto'} | Oferta Oficial`,
            description: description || "Consigue la mejor oferta y bonos exclusivos.",
            keywords: "afiliados, oferta, curso, compra"
          },
          header: {
            brandName: productName || "SyncConnect",
            tagline: "Oferta Exclusiva",
            ctaText: "Aprovechar Oferta",
            ctaUrl: affiliateLink || "#"
          },
          sections: [
            {
              id: "hero-1",
              type: "hero",
              name: "Sección Principal (Hero)",
              content: {
                headline: productName || "Aumenta tus Ventas Hoy",
                subheadline: description || "Aprovecha la oportunidad exclusiva con bonos especiales.",
                ctaText: "¡OBTENER ACCESO INMEDIATO!",
                ctaUrl: affiliateLink || "#",
                badgeText: "🔥 Oportunidad Especial"
              }
            },
            {
              id: "benefits-1",
              type: "benefits",
              name: "Beneficios Claves",
              content: {
                title: "¿Por qué elegir este producto?",
                subtitle: "Todo lo que necesitas para alcanzar el éxito",
                items: [
                  { title: "Resultados Comprobados", desc: "Metodología validada por cientos de clientes.", icon: "Zap" },
                  { title: "Soporte Continuo", desc: "Acompañamiento en cada paso de tu camino.", icon: "Headphones" },
                  { title: "Garantía de Satisfacción", desc: "Prueba sin riesgo durante 7 días.", icon: "Shield" }
                ]
              }
            },
            {
              id: "pricing-1",
              type: "pricing",
              name: "Oferta y Precio",
              content: {
                title: "Inversión Única con Descuento",
                priceText: price || "$47 USD",
                originalPrice: "$97 USD",
                ctaText: "COMPRAR AHORA CON DESCUENTO",
                ctaUrl: affiliateLink || "#",
                guaranteeDays: guaranteeDays || 7,
                guaranteeText: `${guaranteeDays || 7} días de garantía incondicional de devolución.`
              }
            }
          ],
          whatsappConfig: {
            enabled: true,
            number: whatsappNumber || "50588062712",
            message: "Hola, tengo dudas sobre " + (productName || "el producto"),
            buttonText: "Soporte WhatsApp"
          },
          footerMessage: "© 2024 Todos los derechos reservados."
        };
      }
    }

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Error en Gemini Page Generator, utilizando plantilla fallback:", error);
    
    // Si Gemini falla por 503 o demanda alta, devolver la página generada fallback garantizada
    const fallbackData = {
      title: "Página de Ventas Profesional",
      subtitle: "Descubre la solución definitiva para impulsar tus resultados",
      theme: {
        preset: "emerald",
        primaryColor: "#059669",
        accentColor: "#10b981",
        backgroundColor: "#0f172a",
        fontFamily: "Inter"
      },
      seo: {
        title: "Oferta Exclusiva | Acceso Inmediato",
        description: "Obtén la mejor oferta y acceso a bonos especiales por tiempo limitado.",
        keywords: "afiliados, oferta, curso, compra"
      },
      header: {
        brandName: "SyncConnect",
        tagline: "Oferta Especial",
        ctaText: "Aprovechar Oferta",
        ctaUrl: "#"
      },
      sections: [
        {
          id: "hero-1",
          type: "hero",
          name: "Sección Principal (Hero)",
          content: {
            headline: "Impulsa tus Ventas y Resultados Hoy",
            subheadline: "Accede al programa completo con bonos de acción rápida.",
            ctaText: "¡OBTENER ACCESO INMEDIATO!",
            ctaUrl: "#",
            badgeText: "🔥 Oferta por Tiempo Limitado"
          }
        },
        {
          id: "benefits-1",
          type: "benefits",
          name: "Beneficios Claves",
          content: {
            title: "¿Por qué unirte hoy?",
            subtitle: "Todo lo que necesitas en una sola solución",
            items: [
              { title: "Metodología Comprobada", desc: "Estrategias probadas por expertos del mercado.", icon: "Zap" },
              { title: "Soporte VIP 24/7", desc: "Respuestas a todas tus inquietudes de inmediato.", icon: "Headphones" },
              { title: "Garantía Total", desc: "Prueba sin riesgo con garantía de satisfacción.", icon: "Shield" }
            ]
          }
        },
        {
          id: "pricing-1",
          type: "pricing",
          name: "Oferta y Precio",
          content: {
            title: "Acceso Completo con Descuento",
            priceText: "$47 USD",
            originalPrice: "$97 USD",
            ctaText: "COMPRAR AHORA CON DESCUENTO",
            ctaUrl: "#",
            guaranteeDays: 7,
            guaranteeText: "7 días de garantía incondicional de devolución."
          }
        }
      ],
      whatsappConfig: {
        enabled: true,
        number: "50588062712",
        message: "Hola, tengo dudas sobre el producto",
        buttonText: "Soporte WhatsApp"
      },
      footerMessage: "© Todos los derechos reservados."
    };

    return NextResponse.json({ success: true, data: fallbackData, fallbackUsed: true });
  }
}
