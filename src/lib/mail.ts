/**
 * Este archivo ha sido desactivado para evitar errores de compilación con Prisma.
 * El sistema ahora utiliza exclusivamente 'src/lib/email.ts' que está integrado con Firestore.
 */
export const sendPasswordResetEmail = async (email: string, token: string) => {
  console.warn("Función obsoleta llamada. Usa src/lib/email.ts");
};

export const sendVerificationEmail = async (email: string, token: string) => {
  console.warn("Función obsoleta llamada. Usa src/lib/email.ts");
};
