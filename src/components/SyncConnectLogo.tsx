"use client"

import React from 'react';
import { cn, getGoogleDriveDirectLink } from '@/lib/utils';
import Image from 'next/image';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface SyncConnectLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
  useImage?: boolean;
  customImageUrl?: string;
}

export function SyncConnectLogo({ 
  className, 
  showText = true, 
  size = 'md',
  variant = 'dark',
  useImage = false,
  customImageUrl
}: SyncConnectLogoProps) {
  const db = useFirestore();
  const logoConfigRef = useMemoFirebase(() => (db ? doc(db, 'site_config', 'site-logo') : null), [db]);
  const { data: logoOverride } = useDoc(logoConfigRef);

  const activeImageUrl = customImageUrl || logoOverride?.imageUrl;
  const directLink = getGoogleDriveDirectLink(activeImageUrl);

  const sizeMap = {
    sm: { icon: 32, text: 'text-base', sub: 'text-[8px]', height: 'h-8' },
    md: { icon: 42, text: 'text-xl', sub: 'text-[10px]', height: 'h-10' },
    lg: { icon: 56, text: 'text-2xl', sub: 'text-[12px]', height: 'h-14' },
    xl: { icon: 80, text: 'text-4xl', sub: 'text-[16px]', height: 'h-20' },
  };

  const dim = sizeMap[size] || sizeMap.md;

  if (useImage || directLink) {
    const finalSrc = directLink || "/logo.png";
    return (
      <div className={cn("inline-flex items-center gap-3 select-none group cursor-pointer", className)}>
        {/* Rendered custom or default image logo */}
        <div className="relative shrink-0 flex items-center justify-center rounded-xl overflow-hidden" style={{ width: dim.icon, height: dim.icon }}>
          <img 
            src={finalSrc} 
            alt="Logo" 
            className="w-full h-full object-contain drop-shadow-md"
          />
        </div>
        {showText && (
          <div className="flex flex-col justify-center leading-none tracking-tight">
            <span className={cn(
              "font-black tracking-wider uppercase font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
              dim.text,
              variant === 'light' ? 'text-slate-900' : 'text-white'
            )}>
              {logoOverride?.brandName || 'SYNC'}
            </span>
            <span className={cn(
              "font-black tracking-[0.3em] text-[#00D8FF] uppercase mt-0.5 drop-shadow-[0_0_8px_rgba(0,216,255,0.4)]",
              dim.sub
            )}>
              {logoOverride?.brandSub || 'CONNECT'}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-3 select-none group cursor-pointer", className)}>
      {/* Neon Blue Interconnected 'S' Emblem */}
      <div 
        className="relative shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform drop-shadow-[0_0_12px_rgba(0,216,255,0.6)]"
        style={{ width: dim.icon, height: dim.icon }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="neonCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="50%" stopColor="#00D8FF" />
              <stop offset="100%" stopColor="#0099FF" />
            </linearGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Upper Loop of 'S' */}
          <path 
            d="M 68 32 C 68 20, 55 12, 38 18 C 24 23, 18 36, 24 48 C 30 58, 48 62, 60 68 C 74 74, 82 85, 74 98 C 65 110, 42 106, 28 95" 
            fill="none" 
            stroke="url(#neonCyanGrad)" 
            strokeWidth="11" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            filter="url(#neonGlow)"
          />
          {/* Lower Loop / Interconnecting Arc */}
          <path 
            d="M 32 68 C 32 80, 45 88, 62 82 C 76 77, 82 64, 76 52 C 70 42, 52 38, 40 32 C 26 26, 18 15, 26 2 C 35 -10, 58 -6, 72 5" 
            fill="none" 
            stroke="url(#neonCyanGrad)" 
            strokeWidth="11" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            filter="url(#neonGlow)"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col justify-center leading-none tracking-tight">
          <span className={cn(
            "font-black tracking-wider uppercase font-sans text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]",
            dim.text,
            variant === 'light' ? 'text-slate-900' : 'text-white'
          )}>
            SYNC
          </span>
          <span className={cn(
            "font-black tracking-[0.3em] text-[#00D8FF] uppercase mt-0.5 drop-shadow-[0_0_8px_rgba(0,216,255,0.4)]",
            dim.sub
          )}>
            CONNECT
          </span>
        </div>
      )}
    </div>
  );
}



