"use client"

import { useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { getGoogleDriveDirectLink } from '@/lib/utils';

export function DynamicBrandingHandler() {
  const db = useFirestore();
  const logoConfigRef = useMemoFirebase(() => (db ? doc(db, 'site_config', 'site-logo') : null), [db]);
  const { data: logoData } = useDoc(logoConfigRef);

  useEffect(() => {
    if (!logoData?.faviconUrl) return;

    const formattedFavicon = getGoogleDriveDirectLink(logoData.faviconUrl);
    if (!formattedFavicon) return;

    // Actualizar o crear link rel="icon"
    let iconLink = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!iconLink) {
      iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      document.head.appendChild(iconLink);
    }
    iconLink.href = formattedFavicon;

    // Actualizar o crear link rel="apple-touch-icon"
    let appleIconLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (!appleIconLink) {
      appleIconLink = document.createElement('link');
      appleIconLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleIconLink);
    }
    appleIconLink.href = formattedFavicon;

    // Actualizar o crear link rel="shortcut icon"
    let shortcutIconLink = document.querySelector<HTMLLinkElement>("link[rel='shortcut icon']");
    if (!shortcutIconLink) {
      shortcutIconLink = document.createElement('link');
      shortcutIconLink.rel = 'shortcut icon';
      document.head.appendChild(shortcutIconLink);
    }
    shortcutIconLink.href = formattedFavicon;

  }, [logoData?.faviconUrl]);

  return null;
}
