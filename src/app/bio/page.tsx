"use client";

import React from "react";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { 
  Globe, 
  ExternalLink, 
  MessageCircle, 
  Video, 
  Instagram, 
  Facebook, 
  Youtube, 
  Send, 
  Music, 
  CheckCircle2, 
  Sparkles,
  ArrowUpRight
} from "lucide-react";

export default function PublicBioPage() {
  const db = useFirestore();
  const bioRef = useMemoFirebase(() => (db ? doc(db, "site_config", "social_bio") : null), [db]);
  const { data: bioData, isLoading } = useDoc(bioRef);

  const title = bioData?.title || "Sync Connect - Canales Oficiales";
  const bio = bioData?.bio || "Accede a nuestras comunidades VIP, canales de WhatsApp, TikTok, ofertas y redes sociales oficiales.";
  const avatarUrl = bioData?.avatarUrl || "https://picsum.photos/seed/syncbio/400/400";
  const theme = bioData?.theme || "dark";
  const links = (bioData?.links || [
    { id: "1", title: "Canal Oficial de WhatsApp VIP", url: "https://whatsapp.com/channel/sync", platform: "whatsapp_channel", enabled: true },
    { id: "2", title: "Grupo de Ofertas & Estrategias WhatsApp", url: "https://chat.whatsapp.com/sync", platform: "whatsapp_group", enabled: true },
    { id: "3", title: "TikTok Oficial @SyncConnect", url: "https://tiktok.com/@syncconnect", platform: "tiktok", enabled: true },
    { id: "4", title: "Página Oficial de Facebook", url: "https://facebook.com/syncconnect", platform: "facebook", enabled: true },
    { id: "5", title: "Instagram @SyncConnect", url: "https://instagram.com/syncconnect", platform: "instagram", enabled: true },
    { id: "6", title: "Canal de YouTube Oficial", url: "https://youtube.com/@syncconnect", platform: "youtube", enabled: true },
  ]).filter((l: any) => l.enabled);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "whatsapp_channel":
      case "whatsapp_group":
        return <MessageCircle className="h-6 w-6 text-emerald-400" />;
      case "tiktok":
        return <Video className="h-6 w-6 text-pink-400" />;
      case "facebook":
        return <Facebook className="h-6 w-6 text-blue-400" />;
      case "instagram":
        return <Instagram className="h-6 w-6 text-purple-400" />;
      case "youtube":
        return <Youtube className="h-6 w-6 text-red-500" />;
      case "telegram":
        return <Send className="h-6 w-6 text-sky-400" />;
      case "spotify":
        return <Music className="h-6 w-6 text-green-400" />;
      default:
        return <Globe className="h-6 w-6 text-primary" />;
    }
  };

  const getBgClass = () => {
    if (theme === "gradient") return "bg-gradient-to-b from-purple-950 via-slate-950 to-slate-950";
    if (theme === "emerald") return "bg-gradient-to-b from-emerald-950 via-slate-950 to-slate-950";
    return "bg-[#0a0a0f]";
  };

  return (
    <div className={`min-h-screen ${getBgClass()} text-white flex flex-col justify-between p-4 md:p-8 font-sans`}>
      <div className="max-w-md w-full mx-auto space-y-8 pt-8 md:pt-12">
        {/* Profile Header */}
        <div className="text-center space-y-4">
          <div className="relative inline-block mx-auto">
            <img
              src={avatarUrl}
              alt={title}
              className="h-28 w-28 md:h-32 md:w-32 rounded-full object-cover border-4 border-primary/80 shadow-2xl mx-auto"
            />
            <div className="absolute bottom-1 right-1 h-7 w-7 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center text-slate-950">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-white leading-tight">
              {title}
            </h1>
            <p className="text-sm text-slate-300 font-medium leading-relaxed px-4">
              {bio}
            </p>
          </div>
        </div>

        {/* Links List */}
        <div className="space-y-4">
          {links.map((link: any) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[60px] p-4 bg-slate-900/90 hover:bg-slate-800/90 border border-white/10 hover:border-primary/50 rounded-2xl flex items-center justify-between transition-all duration-300 group shadow-xl hover:scale-[1.02]"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-950 rounded-xl border border-white/5">
                  {getPlatformIcon(link.platform)}
                </div>
                <span className="text-sm md:text-base font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                  {link.title}
                </span>
              </div>
              <ArrowUpRight className="h-5 w-5 text-slate-500 group-hover:text-primary transition-colors" />
            </a>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center space-y-2 border-t border-white/5 mt-12">
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> SYNC CONNECT OFFICIAL HUB
        </p>
      </footer>
    </div>
  );
}
