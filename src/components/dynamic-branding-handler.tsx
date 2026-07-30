"use client"

import { useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { getGoogleDriveDirectLink } from '@/lib/utils';

export function DynamicBrandingHandler() {
  const db = useFirestore();
  const logoConfigRef = useMemoFirebase(() => (db ? doc(db, 'site_config', 'site-logo') : null), [db]);
  const settingsRef = useMemoFirebase(() => (db ? doc(db, 'site_config', 'settings') : null), [db]);

  const { data: logoData } = useDoc(logoConfigRef);
  const { data: settingsData } = useDoc(settingsRef);

  const activeFavicon = logoData?.faviconUrl || settingsData?.faviconUrl;

  useEffect(() => {
    if (!activeFavicon) return;

    const formattedFavicon = getGoogleDriveDirectLink(activeFavicon);
    if (!formattedFavicon) return;

    // Actualizar todos los elementos link rel="icon" o derivados en el <head>
    const existingIcons = document.querySelectorAll<HTMLLinkElement>(
      "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon'], link[rel*='icon']"
    );

    if (existingIcons.length > 0) {
      existingIcons.forEach((link) => {
        link.href = formattedFavicon;
      });
    } else {
      const newIcon = document.createElement('link');
      newIcon.rel = 'icon';
      newIcon.href = formattedFavicon;
      document.head.appendChild(newIcon);
    }
  }, [activeFavicon]);

  return null;
}
