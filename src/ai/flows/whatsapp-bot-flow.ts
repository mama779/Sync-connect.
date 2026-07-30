'use server';
/**
 * @fileOverview FLUJO DESACTIVADO.
 * Se han eliminado las dependencias de Genkit para garantizar estabilidad en el despliegue.
 */

export async function processBotMessage(input: any): Promise<any> {
  return { reply: "El asistente automático de WhatsApp ha sido desactivado por el administrador." };
}
