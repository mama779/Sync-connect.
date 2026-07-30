import { Firestore, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

export interface FreeSpotInfo {
  enabled: boolean;
  totalFreeSpots: number;
  usedFreeSpots: number;
  remainingFreeSpots: number;
  isFreeEligible: boolean;
  affiliatePrice: number;
  sellerPrice: number;
  currency: string;
}

/**
 * Checks free spots and activation pricing configuration in `site_config/free_invitations`.
 */
export async function getFreeSpotsInfo(db: Firestore | null): Promise<FreeSpotInfo> {
  const defaults: FreeSpotInfo = {
    enabled: false,
    totalFreeSpots: 6,
    usedFreeSpots: 0,
    remainingFreeSpots: 6,
    isFreeEligible: false,
    affiliatePrice: 6,
    sellerPrice: 7,
    currency: 'USD'
  };

  if (!db) {
    return { ...defaults, usedFreeSpots: 6, remainingFreeSpots: 0 };
  }

  try {
    const docRef = doc(db, 'site_config', 'free_invitations');
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      const enabled = Boolean(data.enabled);
      const totalFreeSpots = typeof data.totalSpots === 'number' ? data.totalSpots : 6;
      const usedFreeSpots = typeof data.usedSpots === 'number' ? data.usedSpots : 0;
      const remainingFreeSpots = Math.max(0, totalFreeSpots - usedFreeSpots);
      const isFreeEligible = enabled && remainingFreeSpots > 0;
      const affiliatePrice = typeof data.affiliatePrice === 'number' ? data.affiliatePrice : 6;
      const sellerPrice = typeof data.sellerPrice === 'number' ? data.sellerPrice : 7;
      const currency = data.currency || 'USD';

      return {
        enabled,
        totalFreeSpots,
        usedFreeSpots,
        remainingFreeSpots,
        isFreeEligible,
        affiliatePrice,
        sellerPrice,
        currency
      };
    } else {
      return defaults;
    }
  } catch (error) {
    console.error("Error fetching free spots info:", error);
    return { ...defaults, usedFreeSpots: 6, remainingFreeSpots: 0 };
  }
}

/**
 * Updates free invitations and activation prices configuration (Admin control).
 */
export async function setFreeInvitationsConfig(
  db: Firestore | null,
  config: { 
    enabled?: boolean; 
    totalSpots?: number; 
    usedSpots?: number;
    affiliatePrice?: number;
    sellerPrice?: number;
    currency?: string;
  }
): Promise<boolean> {
  if (!db) return false;
  try {
    const docRef = doc(db, 'site_config', 'free_invitations');
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error updating free invitations config:", error);
    return false;
  }
}

/**
 * Checks if free spot is available, consumes it by incrementing usedSpots counter, and returns true.
 */
export async function consumeFreeSpotIfEligible(db: Firestore | null, uid: string, email: string): Promise<boolean> {
  if (!db) return false;
  try {
    const info = await getFreeSpotsInfo(db);
    if (info.isFreeEligible) {
      const docRef = doc(db, 'site_config', 'free_invitations');
      await updateDoc(docRef, {
        usedSpots: increment(1),
        updatedAt: new Date().toISOString()
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error consuming free spot:", error);
    return false;
  }
}
