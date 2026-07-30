'use server';

import { adminAuth, adminDb } from './firebase-admin';

const ADMIN_EMAIL = 'affiliatesync0@gmail.com';

/**
 * Acción de servidor para eliminar permanentemente a un usuario de Firebase Authentication.
 */
export async function adminDeleteUser(uid: string) {
  if (!adminAuth) {
    return { 
      success: false, 
      error: 'ERROR DE SERVIDOR: El sistema no tiene permisos administrativos activos.' 
    };
  }

  try {
    await adminAuth.deleteUser(uid);
    return { success: true };
  } catch (error: any) {
    console.error('Error al eliminar usuario en Auth:', error.code);
    if (error.code === 'auth/user-not-found') return { success: true };
    return { success: false, error: `Error de Firebase Admin: ${error.message}` };
  }
}

/**
 * adminResetUserPassword - Cambia la contraseña de un usuario
 */
export async function adminResetUserPassword(email: string, newPassword: string) {
  if (!adminAuth) return { success: false, error: 'Admin SDK not initialized.' };
  try {
    const user = await adminAuth.getUserByEmail(email.toLowerCase().trim());
    await adminAuth.updateUser(user.uid, { password: newPassword });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * adminGenerateResetLink - Genera link de recuperación
 */
export async function adminGenerateResetLink(email: string) {
  if (!adminAuth) return { success: false, error: 'Admin SDK not initialized.' };
  try {
    const firebaseLink = await adminAuth.generatePasswordResetLink(email.toLowerCase().trim());
    const url = new URL(firebaseLink);
    const oobCode = url.searchParams.get('oobCode');
    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev ? 'http://localhost:9002' : 'https://syncconnect.ni'; 
    const customLink = `${baseUrl}/auth/reset-password?oobCode=${oobCode}`;
    return { success: true, link: customLink, oobCode };
  } catch (error: any) {
    return { success: false, error: error.code === 'auth/user-not-found' ? 'USUARIO_NO_EXISTE' : error.message };
  }
}
