import * as admin from 'firebase-admin';

/**
 * Inicialización ultra-segura del SDK de Administración de Firebase.
 * Optimizada para Vercel: Maneja credenciales faltantes durante el build
 * y limpia correctamente la clave privada.
 */

const rawKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.FIREBASE_PROJECT_ID || "studio-9886993662-50a10";

// Limpiar la clave privada para asegurar que los saltos de línea (\n) se procesen correctamente en Vercel
const privateKey = rawKey ? rawKey.replace(/\\n/g, '\n') : undefined;

// Verificar si la credencial parece ser un certificado válido de Google
const hasValidCredentials = !!(privateKey && clientEmail && privateKey.includes('BEGIN PRIVATE KEY'));

function getAdminApp() {
  // Evitar inicializaciones duplicadas en entornos de serverless
  if (admin.apps.length > 0) return admin.apps[0];

  try {
    if (hasValidCredentials) {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        } as admin.ServiceAccount),
      });
    } else {
      // Durante el 'next build' en Vercel, las variables de entorno pueden no estar presentes.
      // Retornamos null silenciosamente en lugar de romper el build.
      if (process.env.NODE_ENV === 'production') {
        console.warn("ADMIN_INIT_WARNING: Credenciales administrativas (Service Account) no detectadas. La eliminación de usuarios fallará.");
      }
      return null;
    }
  } catch (error) {
    console.error("ADMIN_INIT_ERROR:", error);
    return null;
  }
}

const adminApp = getAdminApp();

// Exportamos las instancias con chequeo de nulidad para evitar crashes en el build
export const adminAuth = adminApp ? admin.auth(adminApp) : null;
export const adminDb = adminApp ? admin.firestore(adminApp) : null;
