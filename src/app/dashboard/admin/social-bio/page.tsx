"use client";

import React, { useState, useEffect } from "react";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/button"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Globe, 
  Share2, 
  Plus, 
  Trash2, 
  Save, 
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
  Copy
} from "lucide-react";

interface SocialLink {
  id: string;
  title: string;
  url: string;
  platform: "whatsapp_channel" | "whatsapp_group" | "tiktok" | "facebook" | "instagram" | "youtube" | "telegram" | "spotify" | "custom";
  enabled: boolean;
}

export default function AdminSocialBioPage() {
  const db = useFirestore();
  const { toast } = useToast();

  const bioRef = useMemoFirebase(() => (db ? doc(db, "site_config", "social_bio") : null), [db]);
  const { data: bioData, isLoading } = useDoc(bioRef);

  const [title, setTitle] = useState("Sync Connect - Canales Oficiales");
  const [bio, setBio] = useState("Accede a nuestras comunidades VIP, canales de WhatsApp, TikTok, ofertas y redes sociales oficiales.");
  const [avatarUrl, setAvatarUrl] = useState("https://picsum.photos/seed/syncbio/400/400");
  const [theme, setTheme] = useState<"dark" | "gradient" | "emerald">("dark");
  const [links, setLinks] = useState<SocialLink[]>([
    { id: "1", title: "Canal Oficial de WhatsApp VIP", url: "https://whatsapp.com/channel/sync", platform: "whatsapp_channel", enabled: true },
    { id: "2", title: "Grupo de Ofertas & Estrategias WhatsApp", url: "https://chat.whatsapp.com/sync", platform: "whatsapp_group", enabled: true },
    { id: "3", title: "TikTok Oficial @SyncConnect", url: "https://tiktok.com/@syncconnect", platform: "tiktok", enabled: true },
    { id: "4", title: "Página Oficial de Facebook", url: "https://facebook.com/syncconnect", platform: "facebook", enabled: true },
    { id: "5", title: "Instagram @SyncConnect", url: "https://instagram.com/syncconnect", platform: "instagram", enabled: true },
    { id: "6", title: "Canal de YouTube Oficial", url: "https://youtube.com/@syncconnect", platform: "youtube", enabled: true },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bioData) {
      if (bioData.title) setTitle(bioData.title);
      if (bioData.bio) setBio(bioData.bio);
      if (bioData.avatarUrl) setAvatarUrl(bioData.avatarUrl);
      if (bioData.theme) setTheme(bioData.theme);
      if (bioData.links && Array.isArray(bioData.links)) setLinks(bioData.links);
    }
  }, [bioData]);

  const handleAddLink = () => {
    const newLink: SocialLink = {
      id: Date.now().toString(),
      title: "Nuevo Canal / Red Social",
      url: "https://",
      platform: "custom",
      enabled: true,
    };
    setLinks([...links, newLink]);
  };

  const handleRemoveLink = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
  };

  const handleSave = async () => {
    if (!db) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "site_config", "social_bio"), {
        title,
        bio,
        avatarUrl,
        theme,
        links,
        updatedAt: new Date().toISOString(),
      });
      toast({
        title: "¡Configuración Guardada!",
        description: "Su página de Redes Sociales y Canales Bio-Link ha sido actualizada exitosamente.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: err?.message || "Ocurrió un problema al guardar la página bio.",
      });
    } finally {
      setSaving(false);
    }
  };

  const bioPublicUrl = typeof window !== "undefined" ? `${window.location.origin}/bio` : "/bio";

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "whatsapp_channel":
      case "whatsapp_group":
        return <MessageCircle className="h-5 w-5 text-emerald-400" />;
      case "tiktok":
        return <Video className="h-5 w-5 text-pink-400" />;
      case "facebook":
        return <Facebook className="h-5 w-5 text-blue-400" />;
      case "instagram":
        return <Instagram className="h-5 w-5 text-purple-400" />;
      case "youtube":
        return <Youtube className="h-5 w-5 text-red-500" />;
      case "telegram":
        return <Send className="h-5 w-5 text-sky-400" />;
      case "spotify":
        return <Music className="h-5 w-5 text-green-400" />;
      default:
        return <Globe className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <DashboardShell role="admin">
      <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest mb-3">
              <Share2 className="h-3.5 w-3.5" /> ADMINISTRADOR DE REDES & BIO-LINK
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase italic">
              Página de <span className="text-primary">Redes & Canales</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2 font-medium max-w-2xl">
              Crea y administra la página oficial de enlace único con todos tus canales de WhatsApp, TikTok, Facebook, Instagram y YouTube.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(bioPublicUrl);
                toast({ title: "Enlace Copiado", description: bioPublicUrl });
              }}
              variant="outline"
              className="h-12 border-white/10 text-white hover:bg-white/5 font-bold text-xs gap-2 rounded-2xl"
            >
              <Copy className="h-4 w-4 text-primary" /> COPIAR ENLACE BIO
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-12 bg-primary hover:bg-primary/90 text-slate-950 font-black text-xs uppercase tracking-wider px-6 rounded-2xl shadow-xl gap-2"
            >
              <Save className="h-4 w-4" /> {saving ? "Guardando..." : "GUARDAR PÁGINA"}
            </Button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form: Settings & Links */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 bg-slate-900/60 rounded-3xl border border-white/10 space-y-6">
              <h3 className="text-lg font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Perfil Principal & Estilo
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Título de la Página
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-12 bg-slate-950 border-white/10 text-white font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Biografía / Descripción Descriptiva
                  </Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="min-h-[80px] bg-slate-950 border-white/10 text-white text-xs font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    URL de Foto de Perfil / Logo
                  </Label>
                  <Input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="h-12 bg-slate-950 border-white/10 text-white text-xs font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Tema Visual de la Página
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        theme === "dark"
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-white/10 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      🌙 Dark Tech
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("gradient")}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        theme === "gradient"
                          ? "border-purple-500 bg-purple-500/20 text-purple-300"
                          : "border-white/10 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      🔮 Neon Gradient
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("emerald")}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        theme === "emerald"
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                          : "border-white/10 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      ✳️ Emerald VIP
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Links Section */}
            <div className="p-6 bg-slate-900/60 rounded-3xl border border-white/10 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black uppercase italic tracking-tight text-white">
                    Canales & Redes Sociales ({links.length})
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Agrega, edita u reordena tus enlaces oficiales
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleAddLink}
                  size="sm"
                  className="h-10 bg-white/10 hover:bg-white/20 text-white font-bold text-xs gap-2 rounded-xl"
                >
                  <Plus className="h-4 w-4 text-primary" /> AGREGAR ENLACE
                </Button>
              </div>

              <div className="space-y-4">
                {links.map((link, idx) => (
                  <div
                    key={link.id}
                    className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(link.platform)}
                        <span className="text-xs font-bold text-slate-300">
                          #{idx + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={link.enabled}
                            onCheckedChange={(val) => {
                              const updated = [...links];
                              updated[idx].enabled = val;
                              setLinks(updated);
                            }}
                          />
                          <span className="text-[10px] font-bold uppercase text-slate-400">
                            {link.enabled ? "Activo" : "Oculto"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(link.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-slate-400">
                          Título Visible
                        </Label>
                        <Input
                          value={link.title}
                          onChange={(e) => {
                            const updated = [...links];
                            updated[idx].title = e.target.value;
                            setLinks(updated);
                          }}
                          className="h-10 bg-slate-900 border-white/10 text-white font-bold text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-slate-400">
                          Plataforma / Icono
                        </Label>
                        <select
                          value={link.platform}
                          onChange={(e: any) => {
                            const updated = [...links];
                            updated[idx].platform = e.target.value;
                            setLinks(updated);
                          }}
                          className="h-10 w-full bg-slate-900 border border-white/10 rounded-xl px-3 text-xs font-bold text-white focus:outline-none focus:border-primary"
                        >
                          <option value="whatsapp_channel">WhatsApp - Canal</option>
                          <option value="whatsapp_group">WhatsApp - Grupo VIP</option>
                          <option value="tiktok">TikTok</option>
                          <option value="facebook">Facebook</option>
                          <option value="instagram">Instagram</option>
                          <option value="youtube">YouTube</option>
                          <option value="telegram">Telegram</option>
                          <option value="spotify">Spotify</option>
                          <option value="custom">Sitio Web / Enlace Personalizado</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-slate-400">
                        URL del Enlace
                      </Label>
                      <Input
                        value={link.url}
                        onChange={(e) => {
                          const updated = [...links];
                          updated[idx].url = e.target.value;
                          setLinks(updated);
                        }}
                        className="h-10 bg-slate-900 border-white/10 text-slate-300 text-xs font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Live Mobile Preview */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-primary" /> VISTA PREVIA EN VIVO
                </span>
                <a
                  href="/bio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  Abrir /bio <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Mobile Device Frame */}
              <div className="mx-auto max-w-[360px] bg-slate-950 border-[8px] border-slate-800 rounded-[40px] p-6 shadow-2xl overflow-hidden min-h-[640px] flex flex-col justify-between relative">
                <div className="space-y-6 text-center pt-4">
                  {/* Avatar */}
                  <div className="relative inline-block mx-auto">
                    <img
                      src={avatarUrl}
                      alt="Avatar Bio"
                      className="h-24 w-24 rounded-full object-cover border-4 border-primary shadow-2xl mx-auto"
                    />
                    <div className="absolute bottom-0 right-0 h-6 w-6 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center text-slate-950">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Title & Bio */}
                  <div className="space-y-2">
                    <h2 className="text-lg font-black text-white uppercase italic leading-tight">
                      {title}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed px-2">
                      {bio}
                    </p>
                  </div>

                  {/* Links List */}
                  <div className="space-y-3 pt-2">
                    {links
                      .filter((l) => l.enabled)
                      .map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full h-12 bg-slate-900/90 hover:bg-slate-800 border border-white/10 rounded-2xl px-4 flex items-center justify-between transition-all group shadow-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getPlatformIcon(link.platform)}
                            <span className="text-xs font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                              {link.title}
                            </span>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-white transition-colors" />
                        </a>
                      ))}
                  </div>
                </div>

                <div className="text-center pt-8 border-t border-white/5 mt-6">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    SYNC CONNECT PLATFORM © 2026
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
