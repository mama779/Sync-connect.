import { firebaseConfig, firestoreDatabaseId } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

/**
 * Inicialización segura de Firebase.
 * Forzamos el uso de la configuración explícita para evitar fallos de conexión en Vercel/Studio.
 */
export function initializeFirebase() {
  if (!getApps().length) {
    // Usamos directamente la configuración para garantizar consistencia
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
    }, firestoreDatabaseId),
    storage: getStorage(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
