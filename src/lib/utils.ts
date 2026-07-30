import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Transforma un enlace de Google Drive en un enlace de imagen directa (thumbnail).
 * Soporta formatos: /file/d/ID/view, /open?id=ID, /uc?id=ID
 */
export function getGoogleDriveDirectLink(url: string | null | undefined): string {
  if (!url) return "";
  if (!url.includes('drive.google.com')) return url;

  try {
    let fileId = "";
    
    // Caso 1: /file/d/[ID]/view
    if (url.includes('/file/d/')) {
      fileId = url.split('/file/d/')[1].split('/')[0];
    } 
    // Caso 2: ?id=[ID] o &id=[ID]
    else if (url.includes('id=')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      fileId = urlParams.get('id') || "";
    }

    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
  } catch (e) {
    console.warn("Error transformando URL de Google Drive:", e);
  }

  return url;
}

/**
 * Extrae el ID de video de una URL de YouTube.
 */
export function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Obtiene la miniatura de un video de YouTube, Vimeo o imagen por defecto.
 */
export function getYoutubeThumbnail(url: string): string {
  const id = getYoutubeId(url);
  if (id) {
    return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  }
  if (url && (url.startsWith('data:video') || url.includes('.mp4') || url.includes('.webm') || url.includes('blob:'))) {
    return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80";
  }
  return "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80";
}

/**
 * Detecta el tipo de video de una URL (youtube, vimeo, drive, direct_video, iframe).
 */
export function getVideoType(url: string): 'youtube' | 'vimeo' | 'drive' | 'direct_video' | 'embed' {
  if (!url) return 'embed';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('drive.google.com')) return 'drive';
  if (url.startsWith('data:video') || url.startsWith('blob:') || url.match(/\.(mp4|webm|ogg|m4v)(\?.*)?$/i)) return 'direct_video';
  return 'embed';
}

/**
 * Convierte una URL a un formato apto para reproductor embebido o HTML5.
 */
export function getEmbedUrl(url: string): string {
  if (!url) return "";
  const type = getVideoType(url);
  if (type === 'youtube') {
    const id = getYoutubeId(url);
    if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
    return url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
  }
  if (type === 'vimeo') {
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    if (vimeoMatch && vimeoMatch[1]) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  if (type === 'drive') {
    if (url.includes('/view')) return url.replace('/view', '/preview');
    return url;
  }
  return url;
}

/**
 * Formatea segundos a formato mm:ss o hh:mm:ss
 */
export function formatVideoTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');
  if (h > 0) {
    return `${h}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
}

