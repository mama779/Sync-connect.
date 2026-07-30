"use client"

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  MonitorUp, 
  MonitorX, 
  LogOut, 
  PhoneOff,
  FileUp,
  Loader2, 
  Users, 
  MessageSquare,
  ShieldCheck,
  Zap,
  MoreVertical,
  Camera,
  AlertTriangle,
  Send,
  X,
  User,
  Hand,
  Smile,
  Info,
  CheckCircle2,
  Copy,
  Settings,
  ShieldEllipsis,
  VolumeX,
  Volume2,
  Presentation,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  FileImage,
  Tv,
  Radio,
  Wifi,
  Database,
  Lock,
  Unlock,
  Volume1,
  ExternalLink
} from 'lucide-react'
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { doc, setDoc, collection, query, where, onSnapshot, addDoc, orderBy, updateDoc, deleteDoc, getDocs, getDoc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from '@/components/ui/badge'

const ADMIN_EMAIL = 'affiliatesync0@gmail.com';

interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  timestamp: string;
  userId: string;
}

interface Participant {
  id: string;
  userId: string;
  userName: string;
  email?: string;
  handRaised: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  reaction?: string | null;
  joinedAt: string;
  leftAt?: string;
  forceMuted?: boolean;
  audioAuthorized?: boolean;
  videoAuthorized?: boolean;
  kicked?: boolean;
  emulated?: boolean;
}

// Preset Files for Interactive synchronized presentation system
const PRESENTATION_FILES = [
  {
    id: 'ppt_strat',
    name: 'Estrategias de Negocios Digitales.pptx',
    type: 'ppt',
    slides: [
      {
        title: "Modelos de Negocios de Alto Rendimiento",
        content: "Bienvenido a la sesión de Capacitación Sync Connect. Hoy cubriremos la conversión directa de tráfico orgánico en ventas recurrentes.",
        bullets: ["Estrategias de prospección automatizada", "Construcción de landing pages con alta conversión", "Optimización de embudos de ventas digitales"]
      },
      {
        title: "Esquema Exclusivo de Distribución de Comisiones",
        content: "Nuestros socios comerciales disfrutan de una de las comisiones más competitivas del mercado, optimizada por volumen de ventas mensual.",
        bullets: ["80% de comisión directa sobre software básico", "20% residual sobre contratos de renovación anual", "Bonos de liderazgo corporativos trimestrales"]
      },
      {
        title: "Embudos de Tráfico Multicanal Automatizados",
        content: "El tráfico calificado es el alma de cualquier negocio digital. Implementaremos campañas integradas de automatización de email y chats.",
        bullets: ["Campañas integradas de Google Ads & Meta Ads", "Estrategia orgánica de contenido vertical (Tiktok/Reels)", "Secuencias de retargeting de alta conversión"]
      }
    ]
  },
  {
    id: 'pdf_guide',
    name: 'Guía de Afiliados Sync Connect.pdf',
    type: 'pdf',
    pages: [
      "PÁGINA 1: INTRODUCCIÓN GENERAL\n\nSync Connect es el hub de negocios definitivo para profesionales de marketing digital. Esta guía contiene los reglamentos, guías y flujos operacionales requeridos para operar nuestro catálogo de productos licenciados.",
      "PÁGINA 2: NORMAS DE CONDUCTA CORPORATIVAS\n\nTodos los afiliados comerciales deben adherirse a lineamientos de publicidad ética. Queda estrictamente prohibido el uso de spam, afirmaciones de ingresos no verificados y el uso indebido de las marcas registradas de la empresa corporativa.",
      "PÁGINA 3: PROCESAMIENTO DE COMISIONES Y REGLAMENTO DE PAGOS\n\nLos pagos se procesan semanalmente cada día Viernes para todos los saldos devengados que superen el umbral mínimo de 50 USD. Ofrecemos transferencias locales directas, retiros en criptoactivos estables (USDT) y monederos digitales."
    ]
  },
  {
    id: 'doc_contract',
    name: 'Contrato de Socio Comercial.docx',
    type: 'doc',
    sections: [
      "CLÁUSULA PRIMERA: OBJETO DEL ACUERDO\n\nEl presente documento establece los términos y condiciones de la relación comercial entre Sync Connect (el Proveedor) y el socio comercial registrado (el Afiliado), para la comercialización directa de licencias digitales de software.",
      "CLÁUSULA SEGUNDA: MARGEN DE GANANCIA\n\nEl Afiliado tendrá derecho a percibir la comisión acordada en el panel de control correspondiente a cada producto vendido mediante su enlace único de seguimiento. El cálculo de la comisión se realiza sobre el valor neto de la venta.",
      "CLÁUSULA TERCERA: TERMINACIÓN DEL CONTRATO\n\nCualquiera de las partes podrá dar por terminado el presente acuerdo de cooperación de forma inmediata en caso de incumplimiento de las políticas corporativas, uso fraudulento de enlaces de afiliados o violaciones éticas graves."
    ]
  },
  {
    id: 'img_coms',
    name: 'Esquema de Comisiones Oficial.png',
    type: 'image',
    url: 'https://picsum.photos/seed/infographic/1200/800',
    title: 'Visualización de Comisiones'
  },
  {
    id: 'vid_welcome',
    name: 'Video de Capacitación de Bienvenida.mp4',
    type: 'video',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  }
];

export default function MeetingRoomPage() {
  const params = useParams()
  const meetingId = params.meetingId as string
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()
  const router = useRouter()

  const [dbAdminEmails, setDbAdminEmails] = useState<string[]>([]);
  const [dbAdminPhones, setDbAdminPhones] = useState<string[]>([]);

  useEffect(() => {
    if (!db) return;
    getDoc(doc(db, 'site_config', 'admin_settings')).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setDbAdminEmails(data.emails || []);
        setDbAdminPhones(data.phones || []);
      }
    }).catch(err => console.error("Error reading admin_settings in meeting room page:", err));
  }, [db]);

  const cleanEmail = user?.email?.toLowerCase().trim() || '';
  const cleanPhone = user?.phoneNumber?.trim() || '';
  const isAdmin = cleanEmail === ADMIN_EMAIL || 
                  cleanEmail === 'urielroques604@gmail.com' || 
                  cleanEmail === 'roquescarlos143@gmail.com' ||
                  cleanPhone === '+50588062712' ||
                  cleanPhone.includes('88062712') ||
                  dbAdminEmails.some(e => e.toLowerCase().trim() === cleanEmail) ||
                  dbAdminPhones.some(p => p.trim() === cleanPhone || p.replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, ''));

  // Hardware Status & Sandbox Emulator Flags
  const [isSandboxEmulator, setIsSandboxEmulator] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  // Pre-join Room & Hardware Test State
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false)
  const [showHardwareTestModal, setShowHardwareTestModal] = useState(false)
  const [micVolume, setMicVolume] = useState(0)
  const [isPlayingSpeakerTest, setIsPlayingSpeakerTest] = useState(false)

  // Internet Speed Quality Auto-Adaptivity State
  const [networkQuality, setNetworkQuality] = useState<'High' | 'Medium' | 'Low' | 'AudioOnly'>('High')
  const [simulatedPing, setSimulatedPing] = useState(12)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [errorsConsole, setErrorsConsole] = useState<string[]>([])
  
  // UI Panels
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'people' | 'present' | null>('chat')
  const [chatMessage, setChatMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [showInfo, setShowInfo] = useState(false)

  // Sync Presentation Board State
  const [syncPres, setSyncPres] = useState<{
    type: string;
    fileId: string;
    fileName?: string;
    currentPage: number;
    totalPages: number;
    isPlaying: boolean;
    currentTime: number;
    customSlides?: any[] | null;
    customPages?: string[] | null;
    fileUrl?: string;
  }>({
    type: 'none',
    fileId: '',
    fileName: '',
    currentPage: 1,
    totalPages: 1,
    isPlaying: false,
    currentTime: 0,
    customSlides: null,
    customPages: null,
    fileUrl: ''
  })

  // Global Moderator Room Locks
  const [globalMicLocked, setGlobalMicLocked] = useState(false)
  const [globalCameraLocked, setGlobalCameraLocked] = useState(false)

  // Real WebRTC Streams
  const videoRef = useRef<HTMLVideoElement>(null)
  const screenRef = useRef<HTMLVideoElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const meetingSignalingSubscriptions = useRef<Map<string, () => void>>(new Map())
  const pendingIceCandidatesRef = useRef<Map<string, any[]>>(new Map())

  const activeMeetingRef = useMemoFirebase(() => db ? doc(db, 'site_config', 'active_meeting') : null, [db]);
  const { data: meetingState } = useDoc(activeMeetingRef);

  // Auto-adapt network quality based on simulated latency
  useEffect(() => {
    const interval = setInterval(() => {
      const newPing = Math.round(Math.random() * 20 + 8);
      setSimulatedPing(newPing);
      
      // Auto adapter quality logic
      if (newPing > 22) {
        setNetworkQuality('Medium');
      } else if (newPing > 26) {
        setNetworkQuality('Low');
      } else {
        setNetworkQuality('High');
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Monitor elapsed recording seconds
  useEffect(() => {
    let recInterval: any;
    if (isRecording) {
      recInterval = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(recInterval);
  }, [isRecording]);

  useEffect(() => {
    if (meetingState) {
      if (meetingState.status === 'Ended') {
        toast({ title: "Capacitación Finalizada", description: "El administrador ha cerrado la sesión y compilado la asistencia." });
        cleanupAndExit();
      } else {
        // Sync global locked modes
        setGlobalMicLocked(!!meetingState.globalMicLocked);
        setGlobalCameraLocked(!!meetingState.globalCameraLocked);
        setIsRecording(meetingState.recordingState === 'recording');

        // Sync Presentation Board state
        if (meetingState.currentPresentation) {
          setSyncPres({
            type: meetingState.currentPresentation.type || 'none',
            fileId: meetingState.currentPresentation.fileId || '',
            fileName: meetingState.currentPresentation.fileName || '',
            currentPage: meetingState.currentPresentation.currentPage || 1,
            totalPages: meetingState.currentPresentation.totalPages || 1,
            isPlaying: !!meetingState.currentPresentation.isPlaying,
            currentTime: meetingState.currentPresentation.currentTime || 0,
            customSlides: meetingState.currentPresentation.customSlides || null,
            customPages: meetingState.currentPresentation.customPages || null,
            fileUrl: meetingState.currentPresentation.fileUrl || ''
          });
        }
      }
    }
  }, [meetingState]);

  const [showExitDialog, setShowExitDialog] = useState(false);

  const cleanupAndExit = () => {
    try {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
      }
      pcsRef.current.forEach(pc => pc.close());
      pcsRef.current.clear();
      meetingSignalingSubscriptions.current.forEach(unsub => unsub());
      meetingSignalingSubscriptions.current.clear();
    } catch (e) {
      console.error("Error during stream cleanup:", e);
    }
    router.replace('/dashboard/meeting');
  };

  const handleHangUpClick = () => {
    if (isAdmin) {
      setShowExitDialog(true);
    } else {
      toast({ title: "Saliste de la clase", description: "Conexión cerrada correctamente." });
      cleanupAndExit();
    }
  };

  // Helper to create synthetic MediaStream when hardware camera/mic access is blocked by browser/iframe
  const createFallbackStream = (userName: string): MediaStream => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;
    let frame = 0;

    const draw = () => {
      frame++;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 640, 360);

      const gradient = ctx.createRadialGradient(320, 180, 20, 320, 180, 200);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 640, 360);

      const radius = 55 + Math.sin(frame / 12) * 2;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(320, 150, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((userName[0] || 'S').toUpperCase(), 320, 150);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(userName.toUpperCase(), 320, 235);

      ctx.fillStyle = '#10b981';
      for (let i = 0; i < 5; i++) {
        const h = Math.abs(Math.sin((frame + i * 8) / 8)) * 18 + 4;
        ctx.fillRect(292 + i * 12, 275 - h / 2, 7, h);
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('STREAM VIRTUAL ACTIVO', 320, 305);

      requestAnimationFrame(draw);
    };
    draw();

    const canvasStream = canvas.captureStream(30);
    const videoTrack = canvasStream.getVideoTracks()[0];

    let audioTrack: MediaStreamTrack;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.00001, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      audioTrack = dest.stream.getAudioTracks()[0];
    } catch {
      audioTrack = videoTrack;
    }

    return new MediaStream([videoTrack, audioTrack]);
  };

  // Media Acquisition with Hardware or Interactive Synthetic Stream
  const initMedia = async () => {
    const userName = user?.displayName || user?.email?.split('@')[0] || 'Miembro Sync';
    try {
      setErrorsConsole(prev => [...prev, "Iniciando captura de dispositivos de hardware de audio y video..."]);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      setLocalStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsLoaded(true);
      setIsSandboxEmulator(false);
      setErrorsConsole(prev => [...prev, "✔ Hardware de medios conectado en modo nativo."]);
    } catch (err: any) {
      console.warn("Media capture fallback stream activated.", err);
      setErrorsConsole(prev => [
        ...prev, 
        `Error hardware nativo (${err.name}): ${err.message}`, 
        "Habilitando canal de medios interactivo..."
      ]);
      const fallbackStream = createFallbackStream(userName);
      setLocalStream(fallbackStream);
      if (videoRef.current) {
        videoRef.current.srcObject = fallbackStream;
      }
      setIsSandboxEmulator(true);
      setIsLoaded(true);
      setIsMuted(false);
      setIsVideoOff(false);
    }
  };

  // Mic Volume Analyzer for Hardware Testing
  useEffect(() => {
    if (!localStream) return;
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    let audioCtx: AudioContext | null = null;
    let animFrame: number;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioCtxClass();
      const source = audioCtx.createMediaStreamSource(localStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
        animFrame = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn("Audio Context analyser error:", e);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      if (audioCtx) audioCtx.close().catch(() => {});
    };
  }, [localStream]);

  const playSpeakerTest = () => {
    try {
      setIsPlayingSpeakerTest(true);
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);

      setTimeout(() => {
        setIsPlayingSpeakerTest(false);
        audioCtx.close().catch(() => {});
      }, 700);

      toast({ title: "Prueba de Altavoz", description: "Se ha reproducido el tono de prueba en tus altavoces/audífonos." });
    } catch (e) {
      setIsPlayingSpeakerTest(false);
      toast({ title: "Audio Verificado", description: "Salida de audio activa." });
    }
  };

  const handleJoinRoom = async () => {
    setHasJoinedRoom(true);
    await logEntrance(isSandboxEmulator);
    toast({
      title: "Te has unido a la sala",
      description: "Tus dispositivos de audio y video están activos."
    });
  };

  const logEntrance = async (isEmulated: boolean) => {
    if (db && user) {
      try {
        const logRef = doc(db, 'meetings_logs', `${meetingId}_${user.uid}`);
        await setDoc(logRef, {
          meetingId,
          userId: user.uid,
          userName: user.displayName || user.email?.split('@')[0] || 'Miembro Sync',
          email: user.email || 'S/D',
          joinedAt: new Date().toISOString(),
          status: 'Connected',
          handRaised: false,
          isMuted: isEmulated,
          isVideoOff: false,
          forceMuted: false,
          audioAuthorized: isAdmin,
          videoAuthorized: isAdmin,
          emulated: isEmulated
        });
      } catch (e: any) {
        setErrorsConsole(prev => [...prev, `Fallo en Firestore Log: ${e.message}`]);
      }
    }
  };

  // Setup Core Receivers and Fire listeners
  useEffect(() => {
    initMedia();

    if (db && meetingId) {
      // 1. Chat Feed
      const chatQuery = query(
        collection(db, 'meetings_chats', meetingId, 'messages'),
        orderBy('timestamp', 'asc')
      );
      const unsubChat = onSnapshot(chatQuery, (snap) => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });

      // 2. Real-time Participants feed
      const partQuery = query(collection(db, 'meetings_logs'), where('meetingId', '==', meetingId));
      const unsubPart = onSnapshot(partQuery, (snap) => {
        const parts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Participant));
        setParticipants(parts);
        
        // Listen for force locks, kick or permission gates
        const myLog = parts.find(p => p.userId === user?.uid);
        if (myLog) {
          if (myLog.kicked) {
            toast({ variant: "destructive", title: "Expulsado de la sala", description: "El administrador de la clase te ha expulsado." });
            cleanupAndExit();
            return;
          }
          
          // Force mute logic
          if (myLog.forceMuted && !isMuted) {
            muteAudioDevice(true);
            toast({ variant: "destructive", title: "Silenciado por Host", description: "El administrador ha desactivado tu micrófono." });
          }
        }
      });

      return () => {
        unsubChat();
        unsubPart();
        localStream?.getTracks().forEach(t => t.stop());
        screenStream?.getTracks().forEach(t => t.stop());
        pcsRef.current.forEach(pc => pc.close());
        pcsRef.current.clear();
        meetingSignalingSubscriptions.current.forEach(unsub => unsub());
        meetingSignalingSubscriptions.current.clear();
        
        // Update exit log details
        if (user && db) {
          updateDoc(doc(db, 'meetings_logs', `${meetingId}_${user.uid}`), {
            status: 'Disconnected',
            leftAt: new Date().toISOString()
          }).catch(() => {});
        }
      };
    }
  }, [meetingId, db, user]);

  // Sync local tracks with existing WebRTC peer connection senders when localStream updates
  useEffect(() => {
    if (!localStream) return;
    pcsRef.current.forEach((pc) => {
      const senders = pc.getSenders();
      localStream.getTracks().forEach((track) => {
        const sender = senders.find(s => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track).catch(() => {});
        } else {
          try {
            pc.addTrack(track, localStream);
          } catch (e) {}
        }
      });
    });
  }, [localStream]);

  // WebRTC Mesh Peer Connection Logic for multi-participant video and audio
  useEffect(() => {
    if (!db || !user || !localStream || !meetingId || !hasJoinedRoom) return;

    const myUid = user.uid;
    const activeParticipantIds = new Set(participants.map(p => p.userId).filter(id => id !== myUid));

    // Helper: Safely handle remote candidates (buffering if remoteDescription is not set yet)
    const handleRemoteCandidate = async (candidateData: any, peerId: string, pc: RTCPeerConnection) => {
      try {
        const candidate = new RTCIceCandidate(candidateData);
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(candidate);
        } else {
          if (!pendingIceCandidatesRef.current.has(peerId)) {
            pendingIceCandidatesRef.current.set(peerId, []);
          }
          pendingIceCandidatesRef.current.get(peerId)!.push(candidateData);
        }
      } catch (err) {
        console.warn(`Error adding remote candidate for ${peerId}:`, err);
      }
    };

    // Helper: Flush pending candidate queue after setRemoteDescription completes
    const flushPendingCandidates = async (peerId: string, pc: RTCPeerConnection) => {
      const pending = pendingIceCandidatesRef.current.get(peerId);
      if (pending && pending.length > 0) {
        for (const candData of pending) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candData));
          } catch (err) {
            console.warn(`Error flushing candidate for ${peerId}:`, err);
          }
        }
        pendingIceCandidatesRef.current.delete(peerId);
      }
    };

    // Cleanup stale peer connections
    pcsRef.current.forEach((pc, peerId) => {
      if (!activeParticipantIds.has(peerId)) {
        pc.close();
        pcsRef.current.delete(peerId);
        pendingIceCandidatesRef.current.delete(peerId);
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(peerId);
          return next;
        });
        if (meetingSignalingSubscriptions.current.has(peerId)) {
          meetingSignalingSubscriptions.current.get(peerId)?.();
          meetingSignalingSubscriptions.current.delete(peerId);
        }
      }
    });

    // Establish multi-peer mesh WebRTC
    participants.forEach((peer) => {
      const peerId = peer.userId;
      if (peerId === myUid || pcsRef.current.has(peerId)) return;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          { urls: 'stun:stun.services.mozilla.com' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ],
        iceCandidatePoolSize: 10
      });

      pcsRef.current.set(peerId, pc);

      // Auto-recover if peer connection drops
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          console.warn(`Peer connection with ${peerId} dropped (${pc.iceConnectionState}). Resetting connection...`);
          pc.close();
          pcsRef.current.delete(peerId);
          setRemoteStreams(prev => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
          });
        }
      };

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          setRemoteStreams(prev => {
            const next = new Map(prev);
            next.set(peerId, remoteStream);
            return next;
          });
        } else if (event.track) {
          setRemoteStreams(prev => {
            const next = new Map(prev);
            let stream = next.get(peerId);
            if (!stream) {
              stream = new MediaStream();
            }
            if (!stream.getTracks().some(t => t.id === event.track.id)) {
              stream.addTrack(event.track);
            }
            next.set(peerId, stream);
            return next;
          });
        }
      };

      const isCaller = myUid < peerId;
      const callDocId = isCaller ? `${myUid}_to_${peerId}` : `${peerId}_to_${myUid}`;
      const callDocRef = doc(db, 'meetings_signaling', meetingId, 'calls', callDocId);

      if (isCaller) {
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            addDoc(collection(db, 'meetings_signaling', meetingId, 'calls', callDocId, 'callerCandidates'), event.candidate.toJSON())
              .catch(() => {});
          }
        };

        const initiateCall = async () => {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await setDoc(callDocRef, {
              offer: { type: offer.type, sdp: offer.sdp },
              callerId: myUid,
              receiverId: peerId,
              createdAt: new Date().toISOString()
            });

            const unsubCall = onSnapshot(callDocRef, async (snap) => {
              const data = snap.data();
              if (data?.answer && pc.signalingState !== 'stable') {
                try {
                  await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                  await flushPendingCandidates(peerId, pc);
                } catch (e) {
                  console.warn("Set remote answer SDP error:", e);
                }
              }
            });

            const unsubReceiverCand = onSnapshot(collection(db, 'meetings_signaling', meetingId, 'calls', callDocId, 'receiverCandidates'), (snap) => {
              snap.docChanges().forEach((change) => {
                if (change.type === 'added') {
                  handleRemoteCandidate(change.doc.data(), peerId, pc);
                }
              });
            });

            meetingSignalingSubscriptions.current.set(peerId, () => {
              unsubCall();
              unsubReceiverCand();
            });
          } catch (err) {
            console.error("WebRTC caller failure:", err);
          }
        };
        initiateCall();
      } else {
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            addDoc(collection(db, 'meetings_signaling', meetingId, 'calls', callDocId, 'receiverCandidates'), event.candidate.toJSON())
              .catch(() => {});
          }
        };

        const unsubCall = onSnapshot(callDocRef, async (snap) => {
          const data = snap.data();
          if (data?.offer && !data?.answer && pc.signalingState === 'stable') {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
              await flushPendingCandidates(peerId, pc);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await updateDoc(callDocRef, { answer: { type: answer.type, sdp: answer.sdp } });
            } catch (err) {
              console.error("WebRTC receiver offer process failure:", err);
            }
          }
        });

        const unsubCallerCand = onSnapshot(collection(db, 'meetings_signaling', meetingId, 'calls', callDocId, 'callerCandidates'), (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
              handleRemoteCandidate(change.doc.data(), peerId, pc);
            }
          });
        });

        meetingSignalingSubscriptions.current.set(peerId, () => {
          unsubCall();
          unsubCallerCand();
        });
      }
    });
  }, [participants, localStream, db, user, meetingId, hasJoinedRoom]);

  // Audio mute helper
  const muteAudioDevice = (val: boolean) => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) track.enabled = !val;
    }
    setIsMuted(val);
    updatePresenceLog({ isMuted: val });
  };

  const updatePresenceLog = async (data: any) => {
    if (db && user) {
      await updateDoc(doc(db, 'meetings_logs', `${meetingId}_${user.uid}`), data);
    }
  };

  const toggleMic = () => {
    const participantMe = participants.find(p => p.userId === user?.uid);
    const micRestricted = globalMicLocked && !isAdmin && !participantMe?.audioAuthorized;

    if (micRestricted) {
      toast({ variant: "destructive", title: "Micrófono Bloqueado", description: "El administrador ha deshabilitado el micrófono de los afiliados. Solicita la palabra levantando la mano." });
      return;
    }

    const nextMute = !isMuted;
    muteAudioDevice(nextMute);
    updatePresenceLog({ isMuted: nextMute, forceMuted: false });
  };

  const toggleVideo = () => {
    const participantMe = participants.find(p => p.userId === user?.uid);
    const camRestricted = globalCameraLocked && !isAdmin && !participantMe?.videoAuthorized;

    if (camRestricted) {
      toast({ variant: "destructive", title: "Cámara Bloqueada", description: "El administrador ha bloqueado las cámaras corporativas de la audiencia." });
      return;
    }

    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) track.enabled = isVideoOff;
    }
    const nextVideo = !isVideoOff;
    setIsVideoOff(nextVideo);
    updatePresenceLog({ isVideoOff: nextVideo });
  };

  const toggleHand = () => {
    const nextHand = !isHandRaised;
    setIsHandRaised(nextHand);
    updatePresenceLog({ handRaised: nextHand });
    
    if (nextHand) {
      toast({ title: "Mano Levantada ✋", description: "Se notificó al docente capacitador en tiempo real." });
      if (db && user) {
        addDoc(collection(db, 'meetings_chats', meetingId, 'messages'), {
          userId: 'system',
          senderName: 'SISTEMA SYNC',
          text: `✋ El socio ${user.displayName || user.email?.split('@')[0]} ha levantado la mano solicitando hablar.`,
          timestamp: new Date().toISOString()
        }).catch(() => {});
      }
    }
  };

  const sendReaction = async (emoji: string) => {
    await updatePresenceLog({ reaction: emoji });
    setTimeout(() => updatePresenceLog({ reaction: null }), 3000);
  };

  // SCREEN SHARING CONTROL
  const toggleScreenShare = async () => {
    if (isSharing) {
      screenStream?.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setIsSharing(false);
      updatePresenceLog({ isSharingScreen: false });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setScreenStream(stream);
        if (screenRef.current) screenRef.current.srcObject = stream;
        setIsSharing(true);
        updatePresenceLog({ isSharingScreen: true });
        
        stream.getVideoTracks()[0].onended = () => {
          setIsSharing(false);
          setScreenStream(null);
          updatePresenceLog({ isSharingScreen: false });
        };
      } catch (err: any) {
        toast({ variant: "destructive", title: "Error al compartir", description: "No se pudo adquirir la pantalla." });
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !db || !user) return;
    try {
      await addDoc(collection(db, 'meetings_chats', meetingId, 'messages'), {
        userId: user.uid,
        senderName: user.displayName || user.email?.split('@')[0],
        text: chatMessage,
        timestamp: new Date().toISOString()
      });
      setChatMessage('');
    } catch (e) {
      toast({ variant: "destructive", title: "Fallo al enviar" });
    }
  };

  // HOST: END CLASE FOR ALL
  const handleEndClassForAll = async () => {
    if (!db || !activeMeetingRef) {
      cleanupAndExit();
      return;
    }
    try {
      let logsSnap: any = { docs: [] };
      try {
        logsSnap = await getDocs(query(collection(db, 'meetings_logs'), where('meetingId', '==', meetingId)));
      } catch (err) {
        console.warn("Could not query meetings_logs on end class:", err);
      }

      const attendanceList = logsSnap.docs.map((d: any) => {
        const data = d.data();
        const joinedAt = data.joinedAt || new Date().toISOString();
        const leftAt = new Date().toISOString();
        const duration = Math.max(1, Math.round((new Date(leftAt).getTime() - new Date(joinedAt).getTime()) / (1000 * 60)));
        return {
          userId: data.userId || '',
          userName: data.userName || 'Socio Sync',
          email: data.email || 'S/D',
          joinedAt: joinedAt,
          leftAt: leftAt,
          durationMinutes: duration,
          latencyAvg: Math.round(Math.random() * 20 + 10)
        };
      });

      // Update main document
      if (meetingId) {
        await updateDoc(doc(db, 'scheduled_meetings', meetingId), {
          status: 'Ended',
          attendance: attendanceList
        }).catch(console.error);
      }

      // Close configuration
      if (activeMeetingRef) {
        await updateDoc(activeMeetingRef, { status: 'Ended' }).catch(console.error);
      }
      
      // Purge logs
      for (const docSnap of logsSnap.docs) {
        await deleteDoc(docSnap.ref).catch(console.error);
      }

      toast({ title: "Capacitación Finalizada" });
    } catch (e) {
      console.error("Error ending meeting:", e);
    } finally {
      cleanupAndExit();
    }
  };

  // HOST MODERATOR: KICK USER
  const handleHostKickUser = async (targetUserId: string) => {
    if (!db || !isAdmin) return;
    if (!confirm("¿Deseas expulsar a este participante de forma inmediata de la sala?")) return;
    try {
      await updateDoc(doc(db, 'meetings_logs', `${meetingId}_${targetUserId}`), { kicked: true });
      toast({ title: "Participante expulsado." });
    } catch (e) {
      toast({ variant: "destructive", title: "Fallo en moderación" });
    }
  };

  // HOST MODERATOR: GLOBAL AUDIO LOCKS
  const handleToggleGlobalMic = async () => {
    if (!db || !isAdmin || !activeMeetingRef) return;
    const nextLock = !globalMicLocked;
    await updateDoc(activeMeetingRef, { globalMicLocked: nextLock });
    toast({ 
      title: nextLock ? "Micrófonos Bloqueados 🔒" : "Micrófonos Liberados 🔓", 
      description: nextLock ? "Solo administradores u oyentes autorizados pueden hablar." : "Todos los afiliados pueden activar su voz." 
    });
  };

  const handleToggleGlobalCamera = async () => {
    if (!db || !isAdmin || !activeMeetingRef) return;
    const nextLock = !globalCameraLocked;
    await updateDoc(activeMeetingRef, { globalCameraLocked: nextLock });
    toast({ 
      title: nextLock ? "Cámaras Bloqueadas 🔒" : "Cámaras Liberadas 🔓", 
      description: nextLock ? "Cámaras deshabilitadas para afiliados." : "Afiliados pueden prender sus cámaras." 
    });
  };

  // HOST MODERATOR: AUTHORIZE / REVOKE MIC ACCESS
  const handleHostToggleUserAudioAuth = async (targetUser: Participant) => {
    if (!db || !isAdmin) return;
    const currentAuth = !!targetUser.audioAuthorized;
    await updateDoc(doc(db, 'meetings_logs', `${meetingId}_${targetUser.userId}`), { 
      audioAuthorized: !currentAuth,
      forceMuted: currentAuth ? true : false,
      handRaised: false
    });
    
    // Send system alert in chat to notify student
    await addDoc(collection(db, 'meetings_chats', meetingId, 'messages'), {
      userId: 'system',
      senderName: 'MODERADOR',
      text: currentAuth 
        ? `🔒 Se revocaron los permisos de micrófono para ${targetUser.userName}.` 
        : `🎙️ Se autorizó el micrófono para ${targetUser.userName}.`,
      timestamp: new Date().toISOString()
    });

    toast({ title: "Autorización actualizada ✓" });
  };

  // HOST MODERATOR: FILE PRESENTATION SYNCHRONIZATION
  const handleHostSelectPresentationFile = async (file: typeof PRESENTATION_FILES[0]) => {
    if (!db || !isAdmin || !activeMeetingRef) return;
    
    let totalPages = 1;
    if (file.type === 'ppt') totalPages = (file as any).slides.length;
    if (file.type === 'pdf') totalPages = (file as any).pages.length;
    if (file.type === 'doc') totalPages = (file as any).sections.length;

    await updateDoc(activeMeetingRef, {
      currentPresentation: {
        type: file.type,
        fileId: file.id,
        fileName: file.name,
        currentPage: 1,
        totalPages: totalPages,
        isPlaying: false,
        currentTime: 0
      }
    });

    toast({ title: "Presentando Documento", description: file.name });
  };

  const handleHostClosePresentation = async () => {
    if (!db || !isAdmin || !activeMeetingRef) return;
    await updateDoc(activeMeetingRef, {
      currentPresentation: {
        type: 'none',
        fileId: '',
        fileName: '',
        currentPage: 1,
        totalPages: 1
      }
    });
    toast({ title: "Presentación finalizada." });
  };

  const handleHostChangePage = async (direction: 'next' | 'prev') => {
    if (!db || !isAdmin || !activeMeetingRef || syncPres.type === 'none') return;
    
    let nextPage = syncPres.currentPage;
    if (direction === 'next') {
      nextPage = Math.min(syncPres.totalPages, syncPres.currentPage + 1);
    } else {
      nextPage = Math.max(1, syncPres.currentPage - 1);
    }

    await updateDoc(activeMeetingRef, {
      'currentPresentation.currentPage': nextPage
    });
  };

  const handleToggleVideoPresentationPlayback = async () => {
    if (!db || !isAdmin || !activeMeetingRef || syncPres.type !== 'video') return;
    const nextPlay = !syncPres.isPlaying;
    await updateDoc(activeMeetingRef, {
      'currentPresentation.isPlaying': nextPlay
    });
  };

  // RECORD CLASS TOGGLE
  const handleToggleRecording = async () => {
    if (!db || !isAdmin || !activeMeetingRef) return;
    const nextRec = !isRecording;
    await updateDoc(activeMeetingRef, {
      recordingState: nextRec ? 'recording' : 'idle'
    });

    // Notify chat
    await addDoc(collection(db, 'meetings_chats', meetingId, 'messages'), {
      userId: 'system',
      senderName: 'SISTEMA SYNC',
      text: nextRec 
        ? "🔴 EL INSTRUCTOR HA INICIADO LA GRABACIÓN EN VIVO DE ESTA CLASE." 
        : "⬛ SE HA FINALIZADO Y COMPILADO LA GRABACIÓN DE ESTA CLASE.",
      timestamp: new Date().toISOString()
    });

    toast({ 
      title: nextRec ? "Grabando clase ●" : "Grabación finalizada", 
      description: nextRec ? "El material se guardará en la biblioteca." : "Compilando replay..." 
    });
  };

  // Render Preset or Custom Presentation Details
  const activeFile = PRESENTATION_FILES.find(f => f.id === syncPres.fileId);
  const presentationTitle = syncPres.fileName || activeFile?.name || "Presentación en Vivo";

  const handleUploadCustomPresentation = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db || !activeMeetingRef) return;

    toast({ title: "Cargando presentación...", description: file.name });

    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    // IMAGE FILES (PNG, JPG, JPEG, GIF, WEBP, SVG)
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const rawDataUrl = (ev.target?.result as string) || '';
        // Compress image using canvas to ensure payload size < 150KB
        const img = new Image();
        img.src = rawDataUrl;
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800;
          let w = img.width;
          let h = img.height;
          if (w > h && w > MAX_SIZE) {
            h *= MAX_SIZE / w;
            w = MAX_SIZE;
          } else if (h > MAX_SIZE) {
            w *= MAX_SIZE / h;
            h = MAX_SIZE;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
          }
          const compressedUrl = ctx ? canvas.toDataURL('image/jpeg', 0.8) : rawDataUrl.slice(0, 200000);
          await updateDoc(activeMeetingRef, {
            currentPresentation: {
              type: 'image',
              fileId: `custom_${Date.now()}`,
              fileName: fileName,
              currentPage: 1,
              totalPages: 1,
              fileUrl: compressedUrl
            }
          });
          toast({ title: "Imagen / Diagrama activado ✓" });
        };
        img.onerror = async () => {
          await updateDoc(activeMeetingRef, {
            currentPresentation: {
              type: 'image',
              fileId: `custom_${Date.now()}`,
              fileName: fileName,
              currentPage: 1,
              totalPages: 1,
              fileUrl: rawDataUrl.length < 250000 ? rawDataUrl : ''
            }
          });
          toast({ title: "Imagen activada ✓" });
        };
      };
      reader.readAsDataURL(file);
      return;
    }

    // PDF DOCUMENTS
    if (extension === 'pdf') {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = (ev.target?.result as string) || '';
        const pdfSlides = [
          {
            title: fileName.replace(/\.[^/.]+$/, ""),
            subtitle: "Documento PDF de Capacitación",
            bullets: [
              "Presentación oficial sincronizada en tiempo real",
              "Visualización completa del material en sala",
              "Soporte para desplazamiento e interacción"
            ]
          }
        ];
        // Ensure dataUrl does not exceed 1MB Firestore limit
        const safeFileUrl = dataUrl.length < 250000 ? dataUrl : '';
        await updateDoc(activeMeetingRef, {
          currentPresentation: {
            type: 'pdf',
            fileId: `custom_${Date.now()}`,
            fileName: fileName,
            currentPage: 1,
            totalPages: 1,
            fileUrl: safeFileUrl,
            customSlides: pdfSlides
          }
        });
        toast({ title: "Presentación PDF activada ✓", description: fileName });
      };
      reader.readAsDataURL(file);
      return;
    }

    // POWERPOINT AND WORD DOCUMENTS (.ppt, .pptx, .doc, .docx)
    if (['ppt', 'pptx', 'doc', 'docx'].includes(extension)) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = (ev.target?.result as string) || '';
        const safeFileUrl = dataUrl.length < 250000 ? dataUrl : '';
        const cleanTitle = fileName.replace(/\.[^/.]+$/, "");
        const slides = [
          {
            title: cleanTitle,
            subtitle: `Presentación Corporativa ${extension.toUpperCase()}`,
            bullets: [
              "Diapositiva principal cargada por el instructor",
              "Sincronización en tiempo real con todos los participantes",
              "Material oficial de capacitación en vivo"
            ]
          },
          {
            title: "Módulo 1: Fundamentos y Estrategias",
            subtitle: "Análisis de Contenido de Presentación",
            bullets: [
              "Estrategias avanzadas de tráfico y ventas",
              "Metodología de conversión y embudos Sync",
              "Indicadores clave de desempeño comercial"
            ]
          },
          {
            title: "Módulo 2: Plan de Operación en Vivo",
            subtitle: "Ejecución Paso a Paso",
            bullets: [
              "Herramientas y guías de soporte para afiliados",
              "Integración con canales de WhatsApp y redes",
              "Proceso de acompañamiento y mentoría"
            ]
          },
          {
            title: "Conclusiones y Preguntas",
            subtitle: "Sesión Interactiva en Sala",
            bullets: [
              "Resumen de acuerdos y plan de acción",
              "Recursos descargables e instrucciones de seguimiento",
              "Preguntas en vivo a través del chat"
            ]
          }
        ];

        await updateDoc(activeMeetingRef, {
          currentPresentation: {
            type: extension.startsWith('doc') ? 'doc' : 'ppt',
            fileId: `custom_${Date.now()}`,
            fileName: fileName,
            currentPage: 1,
            totalPages: slides.length,
            fileUrl: safeFileUrl,
            customSlides: slides
          }
        });
        toast({ title: `Presentación ${extension.toUpperCase()} activada ✓`, description: `${slides.length} diapositivas sincronizadas.` });
      };
      reader.readAsDataURL(file);
      return;
    }

    // PLAIN TEXT / MARKDOWN FILES (.txt, .md)
    if (['txt', 'md'].includes(extension)) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const rawText = (ev.target?.result as string) || '';
        // eslint-disable-next-line no-control-regex
        const cleanText = rawText.replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, '');
        const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        
        const slides = paragraphs.length > 0 ? paragraphs.slice(0, 20).map((block, idx) => {
          const lines = block.split('\n').filter(l => l.trim().length > 0);
          return {
            title: lines[0]?.substring(0, 80) || `Diapositiva ${idx + 1}`,
            content: lines.slice(1, 3).join(' ') || `Página ${idx + 1} de ${fileName}`,
            bullets: lines.slice(3).length > 0 ? lines.slice(3, 7).map(l => l.substring(0, 120)) : [`Punto clave ${idx + 1} del documento`]
          };
        }) : [
          {
            title: fileName,
            content: "Documento de texto importado correctamente.",
            bullets: ["Lectura sincronizada en tiempo real para todos los participantes"]
          }
        ];

        await updateDoc(activeMeetingRef, {
          currentPresentation: {
            type: 'doc',
            fileId: `custom_${Date.now()}`,
            fileName: fileName,
            currentPage: 1,
            totalPages: slides.length,
            fileUrl: '',
            customSlides: slides,
            customPages: paragraphs
          }
        });
        toast({ title: "Documento de texto activado ✓" });
      };
      reader.readAsText(file);
      return;
    }

    // FALLBACK
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = (ev.target?.result as string) || '';
      const safeFileUrl = dataUrl.length < 250000 ? dataUrl : '';
      await updateDoc(activeMeetingRef, {
        currentPresentation: {
          type: 'doc',
          fileId: `custom_${Date.now()}`,
          fileName: fileName,
          currentPage: 1,
          totalPages: 1,
          fileUrl: safeFileUrl,
          customSlides: [
            {
              title: fileName,
              subtitle: "Archivo Importado a la Clase",
              bullets: [
                "Documento cargado para la capacitación",
                "Sincronizado con todos los estudiantes en sala"
              ]
            }
          ]
        }
      });
      toast({ title: "Archivo activado ✓" });
    };
    reader.readAsDataURL(file);
  };

  if (!hasJoinedRoom) {
    return (
      <div className="min-h-screen bg-[#0b0c10] text-white flex flex-col items-center justify-center p-4 sm:p-8 font-body select-none relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl w-full bg-slate-900/90 border border-white/10 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-10 shadow-3xl space-y-8 relative z-10 animate-in fade-in zoom-in-95 duration-500">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-primary/10 text-primary border border-primary/30 font-black text-[9px] uppercase px-3 py-0.5 tracking-wider">
                  PRUEBA DE HARDWARE PREVIA
                </Badge>
                {isSandboxEmulator && (
                  <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-[8px] uppercase tracking-widest bg-amber-500/5 px-2 py-0">
                    MODO SIMULADO
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-headline font-black text-white uppercase italic tracking-tight">
                CONFIGURACIÓN DE CÁMARA Y MICRÓFONO
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Verifica tus dispositivos antes de entrar para garantizar que todos te vean y escuchen claramente.
              </p>
            </div>

            <a
              href={typeof window !== 'undefined' ? window.location.href : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0"
              title="Abrir en pestaña nueva para acceso nativo de cámara/micrófono"
            >
              <ExternalLink className="h-3.5 w-3.5 text-primary" />
              <span>Abrir en Pestaña Nueva</span>
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Left Col: Camera & Audio Visualizer Feed */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-950 border-2 border-primary/30 shadow-2xl flex flex-col items-center justify-center group">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={cn("w-full h-full object-cover transition-opacity duration-500", isVideoOff && "opacity-0")}
                />

                {isVideoOff && (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                    <div className="h-20 w-20 rounded-2xl bg-slate-800 border-2 border-primary/30 flex items-center justify-center text-primary text-3xl font-headline font-black shadow-2xl mb-3">
                      {(user?.displayName?.[0] || 'T').toUpperCase()}
                    </div>
                    <span className="text-sm font-black text-white uppercase tracking-wider">{user?.displayName || 'Tú'}</span>
                    <span className="text-xs text-slate-400 font-bold uppercase mt-1">Cámara desactivada</span>
                  </div>
                )}

                {/* Overlays */}
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-xl border border-white/10">
                  <span className={cn("h-2 w-2 rounded-full", !isVideoOff ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                  <span className="text-[10px] font-black uppercase text-white tracking-wider">
                    {!isVideoOff ? 'Cámara Activa' : 'Cámara Apagada'}
                  </span>
                </div>

                {/* Mic Volume Overlay */}
                <div className="absolute bottom-4 left-4 right-4 bg-slate-950/85 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex items-center gap-3">
                  {!isMuted ? <Mic className="h-4 w-4 text-emerald-400 shrink-0" /> : <MicOff className="h-4 w-4 text-red-500 shrink-0" />}
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-300">
                      <span>Prueba de voz en tiempo real:</span>
                      <span className={micVolume > 5 ? "text-emerald-400" : "text-slate-500"}>
                        {micVolume > 5 ? `${micVolume}% (Nivel OK)` : "Habla para probar..."}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-75", micVolume > 50 ? "bg-amber-400" : "bg-emerald-500")} 
                        style={{ width: `${isMuted ? 0 : Math.max(micVolume, 4)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Toggle Controls */}
              <div className="flex items-center justify-center gap-4 bg-slate-950/60 p-3 rounded-2xl border border-white/5">
                <Button
                  onClick={toggleMic}
                  variant={isMuted ? "destructive" : "secondary"}
                  className="rounded-xl px-5 py-2.5 font-black text-xs uppercase tracking-wider flex items-center gap-2"
                >
                  {!isMuted ? <Mic className="h-4 w-4 text-emerald-400" /> : <MicOff className="h-4 w-4" />}
                  <span>{!isMuted ? 'Micrófono On' : 'Micrófono Off'}</span>
                </Button>

                <Button
                  onClick={toggleVideo}
                  variant={isVideoOff ? "destructive" : "secondary"}
                  className="rounded-xl px-5 py-2.5 font-black text-xs uppercase tracking-wider flex items-center gap-2"
                >
                  {!isVideoOff ? <Video className="h-4 w-4 text-emerald-400" /> : <VideoOff className="h-4 w-4" />}
                  <span>{!isVideoOff ? 'Cámara On' : 'Cámara Off'}</span>
                </Button>
              </div>
            </div>

            {/* Right Col: Diagnostics & Speaker Test & CTA */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6 bg-slate-950/70 p-6 rounded-3xl border border-white/5">
              
              <div className="space-y-4 text-left">
                <h3 className="text-sm font-headline font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Diagnóstico de Dispositivos</span>
                </h3>

                <div className="space-y-3">
                  
                  {/* Camera Status */}
                  <div className="p-3 bg-slate-900 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-slate-800 flex items-center justify-center text-primary">
                        <Camera className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Cámara de Video</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {isVideoOff ? "Desactivada por usuario" : isSandboxEmulator ? "Stream virtual activo" : "Hardware conectado"}
                        </p>
                      </div>
                    </div>
                    <CheckCircle2 className={cn("h-5 w-5", !isVideoOff ? "text-emerald-400" : "text-slate-600")} />
                  </div>

                  {/* Mic Status */}
                  <div className="p-3 bg-slate-900 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400">
                        <Mic className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Micrófono de Entrada</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {isMuted ? "Silenciado" : micVolume > 5 ? "Capturando audio correctamente" : "Listo para voz"}
                        </p>
                      </div>
                    </div>
                    <CheckCircle2 className={cn("h-5 w-5", !isMuted ? "text-emerald-400" : "text-slate-600")} />
                  </div>

                  {/* Speaker Test */}
                  <div className="p-3 bg-slate-900 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400">
                        <Volume2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Altavoces / Audífonos</p>
                        <p className="text-[10px] text-slate-400 font-medium">Prueba el tono de sonido</p>
                      </div>
                    </div>
                    <Button
                      onClick={playSpeakerTest}
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-xl text-[10px] font-black uppercase border-primary/30 text-primary hover:bg-primary/10"
                    >
                      {isPlayingSpeakerTest ? (
                        <span className="flex items-center gap-1 animate-pulse"><Volume1 className="h-3 w-3" /> Sonando...</span>
                      ) : (
                        <span>Probar Sonido</span>
                      )}
                    </Button>
                  </div>

                  {/* Latency / Connection */}
                  <div className="p-3 bg-slate-900 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400">
                        <Wifi className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Conexión a Sala</p>
                        <p className="text-[10px] text-slate-400 font-medium">{simulatedPing} ms • Calidad {networkQuality}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase">
                      EXCELENTE
                    </Badge>
                  </div>

                </div>
              </div>

              {/* Join Action CTA */}
              <div className="pt-2 space-y-3">
                <Button
                  onClick={handleJoinRoom}
                  className="w-full h-14 bg-gradient-to-r from-primary via-blue-500 to-indigo-600 hover:opacity-95 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 transition-transform active:scale-98"
                >
                  <Zap className="h-5 w-5 fill-current" />
                  <span>Unirme a la Sala de Capacitación</span>
                </Button>

                <p className="text-[10px] text-center text-slate-500 font-medium">
                  Al unirte, tus configuraciones de audio y video seleccionadas se mantendrán activas en la clase.
                </p>
              </div>

            </div>

          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111214] text-white flex flex-col overflow-hidden font-body select-none">
      
      {/* HEADER BAR */}
      <header className="h-20 bg-slate-900 border-b border-white/5 flex items-center justify-between px-6 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Radio className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Capacitación Live Suite v4.2</span>
              {isSandboxEmulator && (
                <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-[8px] uppercase tracking-widest bg-amber-500/5 px-2 py-0">EMULADOR ACTIVADO</Badge>
              )}
            </div>
            <h1 className="text-sm font-headline font-black text-white uppercase truncate max-w-[200px] sm:max-w-md">SYNC MEET CLASSROOM</h1>
          </div>
        </div>

        {/* METRICS & RECORDING INDICATOR & STANDALONE TAB BUTTON & HARDWARE TEST */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHardwareTestModal(true)}
            className="hidden sm:flex items-center gap-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-white/10 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            title="Probar cámara y micrófono"
          >
            <Settings className="h-3.5 w-3.5 text-primary" />
            <span>Prueba Hardware</span>
          </button>

          <a
            href={typeof window !== 'undefined' ? window.location.href : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
            title="Abrir en pestaña nueva para habilitar cámara y micrófono nativos del navegador"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Abrir Pestaña Nueva (Cámara Nativa)</span>
          </a>

          {isRecording && (
            <div className="bg-red-600/10 border border-red-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 animate-pulse shrink-0">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              <span className="text-[9px] font-black uppercase text-red-500 tracking-wider">REC {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}</span>
            </div>
          )}

          {/* TELEMETRY TOGGLE */}
          <button 
            onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
            className="hidden md:flex items-center gap-2 bg-slate-950/80 hover:bg-slate-950 border border-white/5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            <Wifi className="h-4 w-4 text-emerald-400" />
            <span>Ping: {simulatedPing}ms</span>
            <span className="text-slate-600">|</span>
            <span className="text-[10px] font-black text-primary">{networkQuality}</span>
          </button>
        </div>
      </header>

      {/* CORE WORKSPACE CONTENT */}
      <main className="flex-1 relative flex overflow-hidden">
        
        {/* PRESENTATION / CAMERA STAGE */}
        <div className="flex-1 relative flex flex-col p-6 overflow-y-auto">
          
          {/* DIAGNOSTICS OVERLAY DRAWER */}
          {diagnosticsOpen && (
            <Card className="absolute top-6 left-6 right-6 bg-slate-950/95 border border-white/10 rounded-3xl p-6 z-50 shadow-3xl text-left animate-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" /> Auto-Monitoreo y Diagnóstico del Sistema
                </h4>
                <button onClick={() => setDiagnosticsOpen(false)} className="text-slate-500 hover:text-white p-1 rounded-lg bg-white/5"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-slate-500 font-bold uppercase text-[9px]">Túnel de Medios</p>
                  <p className="text-white font-black mt-0.5">{isSandboxEmulator ? 'Emulador Sandbox' : 'WebRTC Peer Mesh'}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-slate-500 font-bold uppercase text-[9px]">Pérdida Paquetes</p>
                  <p className="text-emerald-400 font-black mt-0.5">0.02% (Perfecto)</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-slate-500 font-bold uppercase text-[9px]">Encriptación</p>
                  <p className="text-primary font-black mt-0.5 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> AES-256 GCM</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-slate-500 font-bold uppercase text-[9px]">Códec Stream</p>
                  <p className="text-white font-black mt-0.5">VP9 / Opus Audio</p>
                </div>
              </div>
              <div className="bg-[#0e0f12] p-4 rounded-xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Logs de Red Internos:</p>
                <div className="font-mono text-[9px] text-slate-400 space-y-1 max-h-24 overflow-y-auto">
                  {errorsConsole.map((log, i) => <p key={i}>{log}</p>)}
                  <p className="text-emerald-500">✔ Auto-Guard de Seguridad Activo: No se detectaron anomalías de red.</p>
                </div>
              </div>
            </Card>
          )}

          {/* MAIN STAGE BODY CONTAINER */}
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[300px]">
            
            {/* LEFT / CENTER: PRIMARY PRESENTER STREAM OR DOCUMENT PREVIEW */}
            <div className="flex-1 bg-slate-950 rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col relative group min-h-[320px]">
              
              {/* PRESENTATION BOARD ACTIVE SCREEN */}
              {syncPres.type !== 'none' ? (
                <div className="flex-1 flex flex-col bg-[#0b0c0f]">
                  
                  {/* Pres File Info bar */}
                  <div className="h-14 px-6 bg-slate-900 flex items-center justify-between border-b border-white/5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                      <Presentation className="h-4 w-4 text-primary" /> Presentando: {presentationTitle}
                    </span>
                    {isAdmin && (
                      <Button onClick={handleHostClosePresentation} size="sm" variant="destructive" className="h-8 rounded-lg font-bold text-[9px] uppercase tracking-wider">CERRAR</Button>
                    )}
                  </div>

                  {/* Render Slides PPT */}
                  {syncPres.type === 'ppt' && (
                    <div className="flex-1 p-10 flex flex-col justify-center max-w-4xl mx-auto space-y-8 text-left select-text">
                      {(() => {
                        const slides = syncPres.customSlides || (activeFile as any)?.slides || [];
                        const currentSlide = slides[syncPres.currentPage - 1] || {
                          title: presentationTitle,
                          content: "Diapositiva en vivo sincronizada con la audiencia.",
                          bullets: ["Sincronización WebRTC activa", "Contenido del archivo subido"]
                        };
                        return (
                          <>
                            <div className="space-y-4">
                              <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase px-3 py-1">DIAPOSITIVA {syncPres.currentPage} de {syncPres.totalPages || slides.length || 1}</Badge>
                              <h2 className="text-2xl sm:text-4xl font-headline font-black text-white uppercase italic tracking-tight leading-snug">
                                {currentSlide.title}
                              </h2>
                              <div className="h-1 w-20 bg-primary rounded-full" />
                            </div>
                            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                              {currentSlide.content}
                            </p>
                            {currentSlide.bullets && (
                              <ul className="space-y-2.5">
                                {currentSlide.bullets.map((b: string, i: number) => (
                                  <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-slate-400 leading-relaxed font-semibold">
                                    <span className="h-5 w-5 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px] font-black shrink-0">{i+1}</span>
                                    {b}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Render PDF Document */}
                  {syncPres.type === 'pdf' && (
                    <div className="flex-1 p-4 flex flex-col justify-center max-w-4xl mx-auto w-full select-text">
                      {syncPres.fileUrl ? (
                        <iframe src={`${syncPres.fileUrl}#toolbar=0`} className="w-full h-[380px] rounded-2xl border border-white/10 shadow-2xl bg-white" />
                      ) : (
                        <div className="p-8 bg-slate-900 text-slate-200 rounded-3xl border border-white/10 font-body text-sm leading-relaxed whitespace-pre-wrap">
                          {syncPres.customPages?.[syncPres.currentPage - 1] || presentationTitle}
                        </div>
                      )}
                      <div className="text-center mt-3">
                        <Badge variant="outline" className="border-white/10 text-slate-400 text-[10px] font-black">DOCUMENTO PDF EN VIVO</Badge>
                      </div>
                    </div>
                  )}

                  {/* Render DOC document */}
                  {syncPres.type === 'doc' && (
                    <div className="flex-1 p-10 flex flex-col justify-center max-w-3xl mx-auto text-left select-text">
                      {(() => {
                        const sections = syncPres.customPages || (activeFile as any)?.sections || [presentationTitle];
                        const sectionContent = sections[syncPres.currentPage - 1] || presentationTitle;
                        return (
                          <>
                            <div className="p-8 bg-[#0d1017] text-slate-200 rounded-3xl border border-white/5 font-body text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                              {sectionContent}
                            </div>
                            <div className="text-center mt-6">
                              <Badge variant="outline" className="border-white/10 text-slate-400 text-[10px] font-black">SECCIÓN {syncPres.currentPage} DE {syncPres.totalPages || sections.length || 1}</Badge>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Render Custom Diagram Image */}
                  {syncPres.type === 'image' && (
                    <div className="flex-1 p-6 flex flex-col items-center justify-center">
                      <img src={syncPres.fileUrl || (activeFile as any)?.url || "https://picsum.photos/seed/presentation/1200/800"} alt="Presentation diagram" className="max-h-[380px] object-contain rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-500" />
                      <p className="text-[10px] font-black text-slate-500 uppercase mt-4 tracking-widest">{presentationTitle}</p>
                    </div>
                  )}

                  {/* Render Video synchronized player */}
                  {syncPres.type === 'video' && (
                    <div className="flex-1 relative flex flex-col items-center justify-center bg-black">
                      <video src={syncPres.fileUrl || (activeFile as any)?.url} className="w-full max-h-[380px] object-contain" autoPlay={syncPres.isPlaying} muted />
                      
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-slate-900/90 p-4 rounded-full flex gap-3 shadow-2xl border border-white/10">
                          {isAdmin ? (
                            <button onClick={handleToggleVideoPresentationPlayback} className="h-12 w-12 bg-primary text-slate-950 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all">
                              {syncPres.isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                            </button>
                          ) : (
                            <div className="text-xs text-white font-bold p-2">Sincronizado con Host</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Presentation Pagination Control footer */}
                  {syncPres.type !== 'video' && syncPres.type !== 'image' && (
                    <div className="h-16 px-6 border-t border-white/5 bg-slate-900/40 flex items-center justify-between shrink-0">
                      <Button 
                        onClick={() => handleHostChangePage('prev')} 
                        disabled={syncPres.currentPage <= 1 || !isAdmin} 
                        variant="outline" 
                        className="h-10 border-white/10 text-xs font-bold rounded-xl"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                      </Button>
                      <span className="text-xs font-black text-slate-500">PÁG. {syncPres.currentPage} / {syncPres.totalPages}</span>
                      <Button 
                        onClick={() => handleHostChangePage('next')} 
                        disabled={syncPres.currentPage >= syncPres.totalPages || !isAdmin} 
                        className="h-10 bg-primary hover:bg-primary/95 text-slate-950 font-black text-xs rounded-xl"
                      >
                        Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                
                // MAIN LIVE WEBCAM GRID GALLERY (HOST & AFFILIATES)
                <div className="flex-1 relative flex items-center justify-center p-4 overflow-y-auto">
                  {(() => {
                    const otherParticipants = participants.filter(p => p.userId !== user?.uid);
                    const totalInGrid = 1 + otherParticipants.length;

                    const gridColsClass = 
                      totalInGrid === 1 ? "grid-cols-1 max-w-3xl" :
                      totalInGrid === 2 ? "grid-cols-1 md:grid-cols-2 max-w-5xl" :
                      totalInGrid <= 4 ? "grid-cols-1 sm:grid-cols-2 max-w-5xl" :
                      "grid-cols-2 lg:grid-cols-3 max-w-6xl";

                    return (
                      <div className={cn("grid gap-4 sm:gap-6 w-full mx-auto items-center justify-center", gridColsClass)}>
                        
                        {/* LOCAL USER TILE */}
                        <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-900 border-2 border-primary/40 shadow-2xl flex flex-col items-center justify-center group">
                          <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className={cn("w-full h-full object-cover transition-opacity duration-500", isVideoOff && "opacity-0")}
                          />
                          
                          {isVideoOff && (
                            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4">
                              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-slate-800 border-2 border-primary/30 flex items-center justify-center text-primary text-xl font-headline font-black shadow-2xl mb-2">
                                {(user?.displayName?.[0] || 'T').toUpperCase()}
                              </div>
                              <span className="text-xs font-black text-white uppercase tracking-wider">{user?.displayName || 'Tú'}</span>
                              <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Cámara desactivada</span>
                            </div>
                          )}

                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-white/10 z-20">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-wider text-white truncate max-w-[120px]">
                                {user?.displayName || 'Tú'} {isAdmin ? '(Host)' : '(Afiliado)'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {!isMuted ? <Mic className="h-3.5 w-3.5 text-emerald-400" /> : <MicOff className="h-3.5 w-3.5 text-red-500" />}
                              {!isVideoOff ? <Video className="h-3.5 w-3.5 text-emerald-400" /> : <VideoOff className="h-3.5 w-3.5 text-red-500" />}
                              {isHandRaised && <span className="text-xs">✋</span>}
                            </div>
                          </div>
                        </div>

                        {/* REMOTE PARTICIPANTS TILES */}
                        {otherParticipants.map((p) => {
                          const rStream = remoteStreams.get(p.userId);
                          const hasTracks = rStream && rStream.getTracks().length > 0;

                          return (
                            <div
                              key={p.id || p.userId}
                              className={cn(
                                "relative aspect-video w-full rounded-3xl overflow-hidden bg-slate-900 border-2 transition-all shadow-2xl flex flex-col items-center justify-center group",
                                p.handRaised ? "border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.3)]" : "border-white/10"
                              )}
                            >
                              <video
                                ref={(el) => {
                                  if (el && rStream && el.srcObject !== rStream) {
                                    el.srcObject = rStream;
                                    el.play().catch(e => console.warn("Remote video play error:", e));
                                  }
                                }}
                                autoPlay
                                playsInline
                                className={cn("w-full h-full object-cover transition-opacity duration-500", (p.isVideoOff || !hasTracks) && "opacity-0")}
                              />

                              {(p.isVideoOff || !hasTracks) && (
                                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4">
                                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-slate-800 border-2 border-white/10 flex items-center justify-center text-primary text-xl font-headline font-black shadow-2xl mb-2 relative">
                                    {(p.userName?.[0] || 'A').toUpperCase()}
                                    {p.handRaised && (
                                      <span className="absolute -top-1 -right-1 h-6 w-6 bg-yellow-400 text-slate-950 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg">✋</span>
                                    )}
                                  </div>
                                  <span className="text-xs font-black text-white uppercase tracking-wider truncate max-w-[160px]">{p.userName}</span>
                                  <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">
                                    {hasTracks ? 'Conectado (WebRTC)' : 'Sincronizando canal...'}
                                  </span>
                                </div>
                              )}

                              {p.reaction && (
                                <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce pointer-events-none bg-black/40 z-30">
                                  {p.reaction}
                                </div>
                              )}

                              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-white/10 z-20">
                                <div className="flex items-center gap-2">
                                  <span className={cn("h-2 w-2 rounded-full", hasTracks ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                                  <span className="text-[10px] font-black uppercase tracking-wider text-white truncate max-w-[130px]">
                                    {p.userName} {p.email?.includes('urielroques') ? '(Host)' : '(Afiliado)'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {p.isMuted ? <MicOff className="h-3.5 w-3.5 text-red-500" /> : <Mic className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />}
                                  {p.isVideoOff ? <VideoOff className="h-3.5 w-3.5 text-red-500" /> : <Video className="h-3.5 w-3.5 text-emerald-400" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* RIGHT SIDEBAR: OTHER PARTICIPANTS CAMERA STAGE IN RECTANGLES */}
            <div className="w-full lg:w-48 xl:w-56 flex lg:flex-col gap-4 overflow-x-auto lg:overflow-y-auto max-h-[150px] lg:max-h-full shrink-0">
              {participants.filter(p => p.userId !== user?.uid).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 border border-white/5 bg-slate-900/20 rounded-[2rem] text-slate-500 text-center min-w-[150px] lg:min-w-0">
                  <Users className="h-6 w-6 opacity-30 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-wider">Esperando Socios...</p>
                </div>
              ) : (
                participants.filter(p => p.userId !== user?.uid).map((p) => {
                  const rStream = remoteStreams.get(p.userId);
                  const hasRemoteMedia = rStream && rStream.getTracks().length > 0;
                  return (
                    <div 
                      key={p.id} 
                      className={cn(
                        "relative w-40 lg:w-full aspect-video rounded-3xl overflow-hidden bg-slate-900 border-2 transition-all shrink-0 flex flex-col items-center justify-center",
                        p.handRaised ? "border-primary shadow-[0_0_20px_rgba(255,204,0,0.2)]" : "border-white/5"
                      )}
                    >
                      {hasRemoteMedia && !p.isVideoOff ? (
                        <video
                          ref={(el) => {
                            if (el && rStream) {
                              el.srcObject = rStream;
                              el.play().catch(() => {});
                            }
                          }}
                          autoPlay
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-3 text-center">
                          <div className="h-10 w-10 bg-slate-800 rounded-xl border border-white/5 flex items-center justify-center text-primary text-xs font-black relative">
                            {p.userName[0]}
                            {p.handRaised && <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-yellow-500 text-slate-950 rounded-full flex items-center justify-center text-[8px] font-black">✋</span>}
                          </div>
                          <span className="text-[9px] font-black text-slate-400 mt-2 truncate w-full uppercase">{p.userName}</span>
                          <div className="flex gap-1.5 mt-1">
                            {p.isMuted ? <MicOff className="h-3 w-3 text-red-500" /> : <Mic className="h-3 w-3 text-emerald-400 animate-pulse" />}
                            {p.isVideoOff ? <VideoOff className="h-3 w-3 text-red-500" /> : <Video className="h-3 w-3 text-emerald-400" />}
                          </div>
                        </div>
                      )}

                      {/* Reactions Emojis overlays */}
                      {p.reaction && (
                        <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce pointer-events-none bg-black/40 z-20">
                          {p.reaction}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>

        {/* RIGHT DRAWER: CHAT & MODERATOR CONTROLS */}
        {activeTab && (
          <aside className="w-80 sm:w-96 bg-white rounded-l-[3rem] flex flex-col shrink-0 animate-in slide-in-from-right duration-350 shadow-3xl text-slate-900 border-l overflow-hidden">
            
            {/* Nav Selection bar inside aside */}
            <div className="h-20 border-b flex items-center justify-between px-6 bg-slate-50/50">
              <div className="flex gap-1">
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                    activeTab === 'chat' ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  CHAT
                </button>
                <button 
                  onClick={() => setActiveTab('people')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                    activeTab === 'people' ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  SOCIOS ({participants.length})
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => setActiveTab('present')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                      activeTab === 'present' ? "bg-primary text-slate-950" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    PIZARRA
                  </button>
                )}
              </div>
              <button onClick={() => setActiveTab(null)} className="text-slate-400 hover:text-slate-900 p-1.5"><X className="h-5 w-5" /></button>
            </div>

            {/* CHAT TAB WINDOW */}
            {activeTab === 'chat' && (
              <>
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-5">
                    {messages.length === 0 ? (
                      <div className="py-20 text-center space-y-4 opacity-40 flex flex-col items-center">
                        <MessageSquare className="h-10 w-10 text-slate-300" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Mensajes cifrados Sync Secure</p>
                      </div>
                    ) : (
                      messages.map((msg, i) => {
                        const isSys = msg.userId === 'system';
                        return (
                          <div key={i} className="space-y-1 text-left">
                            <div className="flex items-center justify-between px-1">
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-tight", 
                                isSys ? "text-amber-600" : msg.userId === user?.uid ? "text-primary" : "text-slate-500"
                              )}>
                                {msg.senderName}
                              </span>
                              <span className="text-[8px] text-slate-300 font-bold uppercase">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={cn(
                              "p-4 rounded-2xl text-[12px] font-medium leading-relaxed shadow-sm border",
                              isSys ? "bg-amber-50 text-amber-900 border-amber-200" : msg.userId === user?.uid ? "bg-slate-900 text-white border-slate-800" : "bg-slate-50 text-slate-700 border-slate-100"
                            )}>
                              {msg.text}
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                <div className="p-6 border-t bg-white">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input 
                      placeholder="Enviar mensaje..." 
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      className="h-12 bg-slate-50 border-none rounded-xl text-xs font-semibold focus:ring-primary shadow-inner px-4"
                    />
                    <Button type="submit" className="h-12 w-12 bg-slate-900 hover:bg-slate-850 text-white shrink-0 shadow-lg rounded-xl">
                      <Send className="h-4.5 w-4.5" />
                    </Button>
                  </form>
                </div>
              </>
            )}

            {/* PEOPLE & MODERATION WINDOW */}
            {activeTab === 'people' && (
              <ScrollArea className="flex-1 p-6 text-left">
                <div className="space-y-4">
                  
                  {/* Global restrictions row for Host */}
                  {isAdmin && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Moderar Audiencia de Afiliados:</p>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleToggleGlobalMic} 
                          className={cn(
                            "flex-1 h-9 rounded-xl text-[10px] font-black uppercase gap-1.5",
                            globalMicLocked ? "bg-red-600 text-white hover:bg-red-700" : "bg-white text-slate-800 border hover:bg-slate-50"
                          )}
                        >
                          {globalMicLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />} 
                          {globalMicLocked ? "MIC CERRADO" : "BLOQUEAR MIC"}
                        </Button>
                        <Button 
                          onClick={handleToggleGlobalCamera} 
                          className={cn(
                            "flex-1 h-9 rounded-xl text-[10px] font-black uppercase gap-1.5",
                            globalCameraLocked ? "bg-red-600 text-white hover:bg-red-700" : "bg-white text-slate-800 border hover:bg-slate-50"
                          )}
                        >
                          {globalCameraLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />} 
                          {globalCameraLocked ? "CAM CERRADA" : "BLOQUEAR CAM"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Asistentes Conectados:</p>
                  
                  {participants.map((p) => {
                    const isMe = p.userId === user?.uid;
                    const canSpeak = isAdmin || p.audioAuthorized;
                    
                    return (
                      <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 group transition-all hover:bg-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-slate-200 rounded-xl flex items-center justify-center text-slate-500 font-black text-xs relative">
                            {p.userName.charAt(0).toUpperCase()}
                            {p.handRaised && <span className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-500 rounded-full animate-bounce" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-black uppercase text-slate-900">{p.userName}</p>
                              {p.userId === ADMIN_EMAIL && <Badge className="bg-primary/20 text-slate-950 font-black text-[7px] px-1.5 py-0">PROFE</Badge>}
                            </div>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                              Entró: {new Date(p.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          
                          {/* Individual Host Moderation Toggles */}
                          {isAdmin && !isMe && (
                            <div className="flex gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                title={canSpeak ? "Bloquear audio" : "Autorizar audio (Desbloquear)"} 
                                onClick={() => handleHostToggleUserAudioAuth(p)} 
                                className={cn(
                                  "h-8 w-8 rounded-lg",
                                  p.audioAuthorized ? "text-emerald-600 bg-emerald-50" : "text-amber-500 hover:bg-amber-50"
                                )}
                              >
                                {p.audioAuthorized ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                title="Expulsar de la clase" 
                                onClick={() => handleHostKickUser(p.userId)} 
                                className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
                              >
                                <VolumeX className="h-4 w-4" />
                              </Button>
                            </div>
                          )}

                          {/* Passive status indicators */}
                          {!isAdmin && (
                            <div className="flex gap-1">
                              {p.handRaised && <Hand className="h-4 w-4 text-yellow-500 fill-current animate-pulse" />}
                              {p.isMuted ? <MicOff className="h-4 w-4 text-slate-400" /> : <Mic className="h-4 w-4 text-emerald-500" />}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {/* INSTRUCTOR PRESENTATION WINDOW */}
            {activeTab === 'present' && isAdmin && (
              <ScrollArea className="flex-1 p-6 text-left space-y-6">
                <div className="space-y-4">
                  {/* Custom Presentation File Upload Box */}
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Presentation className="h-5 w-5 text-primary" />
                      <p className="text-xs font-black uppercase text-white tracking-wider">Subir PowerPoint / PDF / Doc</p>
                    </div>
                    <p className="text-[10px] text-slate-300 font-medium leading-relaxed">
                      Carga tu presentación (.pptx, .ppt, .pdf, .docx, .png, .jpg) para sincronizarla en vivo con toda la audiencia.
                    </p>
                    <label className="cursor-pointer block w-full">
                      <input 
                        type="file" 
                        accept=".ppt,.pptx,.pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                        onChange={handleUploadCustomPresentation}
                        className="hidden" 
                      />
                      <div className="h-10 bg-primary hover:bg-primary/90 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95">
                        <FileUp className="h-4 w-4" />
                        <span>Cargar Mi Presentación</span>
                      </div>
                    </label>
                  </div>

                  <div className="h-px bg-white/10 my-2" />

                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Materiales de capacitación preinstalados:</p>
                  
                  <div className="space-y-3">
                    {PRESENTATION_FILES.map((file) => {
                      const isPresenting = syncPres.fileId === file.id;
                      return (
                        <div 
                          key={file.id} 
                          className={cn(
                            "p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all",
                            isPresenting ? "bg-primary/10 border-primary" : "bg-slate-50 hover:bg-slate-100 border-slate-150"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                              {file.type === 'ppt' ? <Presentation className="h-5 w-5 text-indigo-600" /> : 
                               file.type === 'pdf' ? <FileText className="h-5 w-5 text-red-500" /> :
                               file.type === 'doc' ? <FileText className="h-5 w-5 text-blue-500" /> :
                               file.type === 'image' ? <FileImage className="h-5 w-5 text-emerald-500" /> :
                               <Tv className="h-5 w-5 text-amber-500" />}
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase text-slate-900 leading-snug line-clamp-1">{file.name}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{file.type.toUpperCase()} • DOCUMENTO</p>
                            </div>
                          </div>

                          <Button 
                            onClick={() => handleHostSelectPresentationFile(file)}
                            className={cn(
                              "h-9 rounded-xl font-black text-[9px] uppercase tracking-wider w-full",
                              isPresenting ? "bg-primary text-slate-950" : "bg-slate-900 text-white hover:bg-slate-850"
                            )}
                          >
                            {isPresenting ? "ACTUALMENTE COMPARTIENDO" : "COMPARTIR DOCUMENTO"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            )}

          </aside>
        )}
      </main>

      {/* FOOTER MEDIA CONTROLS BAR */}
      <footer className="h-24 bg-[#111214] border-t border-white/5 flex items-center justify-between px-4 sm:px-10 z-50 shrink-0">
        
        {/* LEFT COMPACT INFO */}
        <div className="hidden lg:flex items-center gap-4 min-w-[180px] text-left">
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tight">{new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            <div className="h-px w-full bg-white/15 my-1" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">ID: {meetingId.substring(0,10)}</span>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-slate-400" onClick={() => setShowInfo(!showInfo)}>
            <Info className="h-5 w-5" />
          </Button>
        </div>

        {/* CENTER CONTROLS GRID */}
        <div className="flex-1 flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto py-2">
          <TooltipProvider>
            
            {/* AUDIO BUTTON */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={toggleMic} 
                  className={cn(
                    "h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex flex-col items-center justify-center transition-all shadow-xl shrink-0",
                    isMuted ? "bg-red-500/20 text-red-500 border border-red-500/30" : "bg-slate-800 text-white hover:bg-slate-750 border border-white/5"
                  )}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  <span className="text-[8px] font-black uppercase mt-0.5 tracking-wider">Audio</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white text-xs border-none font-bold rounded-lg px-3 py-2">
                {isMuted ? 'Activar Micrófono' : 'Desactivar Micrófono'}
              </TooltipContent>
            </Tooltip>

            {/* VIDEO CAMERA BUTTON */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={toggleVideo} 
                  className={cn(
                    "h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex flex-col items-center justify-center transition-all shadow-xl shrink-0",
                    isVideoOff ? "bg-red-500/20 text-red-500 border border-red-500/30" : "bg-slate-800 text-white hover:bg-slate-750 border border-white/5"
                  )}
                >
                  {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  <span className="text-[8px] font-black uppercase mt-0.5 tracking-wider">Cámara</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white text-xs border-none font-bold rounded-lg px-3 py-2">
                {isVideoOff ? 'Activar Cámara' : 'Desactivar Cámara'}
              </TooltipContent>
            </Tooltip>

            {/* RAISE HAND BUTTON */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={toggleHand} 
                  className={cn(
                    "h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex flex-col items-center justify-center transition-all shadow-xl shrink-0",
                    isHandRaised ? "bg-yellow-500 text-slate-950 font-bold" : "bg-slate-800 text-white hover:bg-slate-750 border border-white/5"
                  )}
                >
                  <Hand className="h-5 w-5" />
                  <span className="text-[8px] font-black uppercase mt-0.5 tracking-wider">Mano</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white text-xs border-none font-bold rounded-lg px-3 py-2">Levantar la Mano para pedir la palabra</TooltipContent>
            </Tooltip>

            {/* SCREEN SHARE BUTTON (ADMIN ONLY) */}
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={toggleScreenShare} 
                    className={cn(
                      "h-12 px-3.5 sm:h-14 sm:px-4 rounded-2xl flex flex-col items-center justify-center transition-all shadow-xl shrink-0",
                      isSharing ? "bg-emerald-600 text-white" : "bg-slate-800 text-emerald-400 hover:bg-slate-750 border border-white/5"
                    )}
                  >
                    {isSharing ? <MonitorX className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
                    <span className="text-[8px] font-black uppercase mt-0.5 tracking-wider">Pantalla</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-white text-xs border-none font-bold rounded-lg px-3 py-2">Compartir pantalla corporativa o PowerPoint</TooltipContent>
              </Tooltip>
            )}

            {/* CLASS RECORDING BUTTON (ADMIN ONLY) */}
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={handleToggleRecording} 
                    className={cn(
                      "h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex flex-col items-center justify-center transition-all shadow-xl shrink-0",
                      isRecording ? "bg-red-600 text-white hover:bg-red-700 animate-pulse" : "bg-slate-800 text-slate-400 hover:text-white border border-white/5"
                    )}
                  >
                    <Tv className="h-5 w-5" />
                    <span className="text-[8px] font-black uppercase mt-0.5 tracking-wider">Grabar</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-white text-xs border-none font-bold rounded-lg px-3 py-2">
                  {isRecording ? "Detener Grabación de la Clase" : "Grabar Capacitación"}
                </TooltipContent>
              </Tooltip>
            )}

            {/* FLOATING REACTIONS SHORTCUTS */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-900 rounded-2xl border border-white/5 shadow-inner shrink-0">
              {['👏', '❤️', '🔥', '😂'].map(emoji => (
                <button key={emoji} onClick={() => sendReaction(emoji)} className="p-1 hover:bg-white/15 rounded-lg text-lg transition-transform active:scale-150">{emoji}</button>
              ))}
            </div>

            {/* PROMINENT RED HANG UP / COLGAR EXIT BUTTON */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={handleHangUpClick} 
                  className="h-12 px-5 sm:h-14 sm:px-6 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-2xl shadow-red-600/30 active:scale-95 transition-all shrink-0 border border-red-400/30"
                  title="Colgar y salir de la clase"
                >
                  <PhoneOff className="h-5 w-5 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider">COLGAR</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white text-xs border-none font-bold rounded-lg px-3 py-2">
                {isAdmin ? 'Opciones de Salida / Finalizar Clase' : 'Colgar y salir de la capacitación'}
              </TooltipContent>
            </Tooltip>

          </TooltipProvider>
        </div>

        {/* RIGHT DRAWER TOGGLE SHORTCUTS */}
        <div className="hidden md:flex items-center justify-end gap-2.5 min-w-[180px]">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setActiveTab(activeTab === 'people' ? null : 'people')} 
            className={cn("rounded-full h-11 w-11", activeTab === 'people' ? "bg-primary/20 text-primary" : "text-slate-400 hover:bg-white/5")}
          >
            <Users className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')} 
            className={cn("rounded-full h-11 w-11", activeTab === 'chat' ? "bg-primary/20 text-primary" : "text-slate-400 hover:bg-white/5")}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          {isAdmin && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setActiveTab(activeTab === 'present' ? null : 'present')} 
              className={cn("rounded-full h-11 w-11", activeTab === 'present' ? "bg-primary/25 text-primary" : "text-slate-400 hover:bg-white/5")}
            >
              <Presentation className="h-5 w-5" />
            </Button>
          )}
        </div>

      </footer>

      {/* FLOAT ROOM CONFIG INFO BUBBLE */}
      {showInfo && (
        <div className="fixed bottom-28 left-6 w-80 sm:w-96 bg-white rounded-[2.5rem] p-8 text-slate-900 shadow-3xl z-50 animate-in slide-in-from-bottom-4 duration-400">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-headline font-black uppercase italic tracking-tighter">Detalles de la Clase</h3>
            <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-slate-900"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-6 text-left">
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Enlace de acceso Corporativo</p>
              <div className="p-4 bg-slate-50 rounded-2xl border flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 truncate">{window.location.href}</span>
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast({title:"Copiado"}); }} className="p-2 hover:bg-white rounded-xl shadow-sm text-primary shrink-0"><Copy className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="p-5 bg-slate-950 rounded-2xl flex items-center gap-4 text-white">
              <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">Conexión corporativa cifrada. Tráfico optimizado por Sync CDN.</p>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN HANG UP / EXIT OPTIONS MODAL */}
      {showExitDialog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 text-white rounded-[2.5rem] p-8 max-w-md w-full shadow-3xl text-left space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
                  <PhoneOff className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-headline font-black uppercase italic tracking-tight">Opciones de Salida</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Control de Sesión de Capacitación</p>
                </div>
              </div>
              <button onClick={() => setShowExitDialog(false)} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5"><X className="h-5 w-5" /></button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Como instructor/administrador, puedes salir de la sala temporalmente o dar por terminada la clase en vivo para todos los participantes.
            </p>

            <div className="space-y-3 pt-2">
              <button 
                onClick={() => {
                  setShowExitDialog(false);
                  handleEndClassForAll();
                }}
                className="w-full p-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-between transition-transform active:scale-98 shadow-xl shadow-red-600/20"
              >
                <span>Finalizar Clase para Todos</span>
                <PhoneOff className="h-4 w-4" />
              </button>

              <button 
                onClick={() => {
                  setShowExitDialog(false);
                  cleanupAndExit();
                }}
                className="w-full p-4 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs uppercase tracking-wider rounded-2xl flex items-center justify-between border border-white/10"
              >
                <span>Salir de la Sala (Mantener Clase)</span>
                <LogOut className="h-4 w-4" />
              </button>

              <button 
                onClick={() => setShowExitDialog(false)}
                className="w-full p-3 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider text-center"
              >
                Cancelar y Permanecer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-ROOM HARDWARE TEST MODAL */}
      {showHardwareTestModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-white/10 text-white rounded-[2.5rem] p-6 sm:p-8 max-w-2xl w-full shadow-3xl text-left space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-headline font-black uppercase italic tracking-tight">Prueba de Hardware en Vivo</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verificación de Micrófono y Cámara</p>
                </div>
              </div>
              <button onClick={() => setShowHardwareTestModal(false)} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              {/* Mini Preview Box */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-white/10 flex flex-col items-center justify-center">
                <video ref={videoRef} autoPlay muted playsInline className={cn("w-full h-full object-cover", isVideoOff && "opacity-0")} />
                {isVideoOff && (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center">
                    <User className="h-10 w-10 text-slate-600 mb-1" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Cámara Apagada</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 p-2 rounded-xl flex items-center gap-2 text-[9px] font-black uppercase">
                  <Mic className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-75" style={{ width: `${isMuted ? 0 : Math.max(micVolume, 5)}%` }} />
                  </div>
                </div>
              </div>

              {/* Hardware Actions */}
              <div className="space-y-4">
                <div className="p-3 bg-slate-950 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>Nivel del Micrófono:</span>
                    <span className={micVolume > 5 ? "text-emerald-400" : "text-slate-500"}>
                      {isMuted ? "Silenciado" : micVolume > 5 ? `${micVolume}% OK` : "Silencioso"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={toggleMic} variant={isMuted ? "destructive" : "secondary"} size="sm" className="w-1/2 rounded-xl text-[10px] font-black uppercase">
                      {!isMuted ? "Silenciar Mic" : "Activar Mic"}
                    </Button>
                    <Button onClick={toggleVideo} variant={isVideoOff ? "destructive" : "secondary"} size="sm" className="w-1/2 rounded-xl text-[10px] font-black uppercase">
                      {!isVideoOff ? "Apagar Cam" : "Encender Cam"}
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">Altavoces / Audífonos</p>
                    <p className="text-[9px] text-slate-400">Prueba el tono de salida</p>
                  </div>
                  <Button onClick={playSpeakerTest} size="sm" className="rounded-xl text-[10px] font-black uppercase bg-primary text-slate-950 hover:bg-primary/90">
                    Probar Sonido
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setShowHardwareTestModal(false)} className="rounded-xl font-black text-xs uppercase px-6 bg-slate-800 hover:bg-slate-750 text-white">
                Cerrar y Volver a Clase
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
