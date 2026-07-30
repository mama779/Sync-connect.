import { initializeFirebase } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Sube una imagen a Firebase Storage y retorna su URL pública de descarga.
 * Si Firebase Storage no está habilitado o falla, devuelve la versión Base64 como fallback.
 */
export async function uploadImageToFirebaseStorage(file: File, folderName: string = 'branding'): Promise<string> {
  try {
    const { storage } = initializeFirebase();
    const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storageRef = ref(storage, `${folderName}/${cleanFileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error: any) {
    console.warn("Firebase Storage upload fallback to base64:", error?.message);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    });
  }
}
