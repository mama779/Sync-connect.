import { initializeFirebase } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Resalta y comprime client-side una imagen antes de guardarla o subirla.
 * Retorna un Data URL optimizado y liviano (< 50KB) en caso de fallback.
 */
export async function compressAndResizeImage(
  file: File,
  maxWidth: number = 600,
  maxHeight: number = 600,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Si es SVG o muy pequeño, usar lectura directa
    if (file.type === 'image/svg+xml' || file.size < 15 * 1024) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error("Error al leer el archivo."));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Error al leer la imagen."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo seleccionado no es una imagen válida."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Formato liviano PNG o WebP
        const isPng = file.type === 'image/png' || file.name.endsWith('.png');
        const mimeType = isPng ? 'image/png' : 'image/webp';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sube una imagen a Firebase Storage y retorna su URL pública de descarga.
 * Si Firebase Storage no está habilitado o falla, devuelve la versión Base64 comprimida como fallback.
 */
export async function uploadImageToFirebaseStorage(
  file: File, 
  folderName: string = 'branding',
  maxWidth: number = 600,
  maxHeight: number = 600
): Promise<string> {
  // 1. Obtener primero la versión comprimida client-side
  let compressedDataUrl: string = "";
  try {
    compressedDataUrl = await compressAndResizeImage(file, maxWidth, maxHeight, 0.85);
  } catch (e) {
    console.warn("Fallo al comprimir imagen, usando archivo original:", e);
  }

  // 2. Intentar subida a Firebase Storage
  try {
    const { storage } = initializeFirebase();
    const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storageRef = ref(storage, `${folderName}/${cleanFileName}`);
    
    // Si tenemos dataURL comprimido, subirlo como dataurl o subir bytes
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error: any) {
    console.warn("Firebase Storage no disponible o sin permisos. Usando Data URL comprimido fallback:", error?.message);
    if (compressedDataUrl) {
      return compressedDataUrl;
    }
    // Fallback básico si todo falla
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }
}
