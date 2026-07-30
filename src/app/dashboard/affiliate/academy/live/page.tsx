"use client"

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  arrayUnion, 
  arrayRemove, 
  serverTimestamp 
} from 'firebase/firestore'
import { 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  Send, 
  Users, 
  Paperclip, 
  Hand, 
  Flame, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Sparkles, 
  GraduationCap, 
  ChevronLeft, 
  Clock, 
  AlertCircle, 
  Download, 
  ExternalLink,
  Laptop,
  CheckCircle,
  TrendingUp,
  X,
  Loader2,
  MessageSquare,
  Info,
  PhoneOff,
  MoreVertical,
  Smile,
  Share2,
  LayoutGrid,
  Presentation
} from 'lucide-react'
import Link from 'next/link'

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  text: string;
  createdAt: any;
}

interface LiveReaction {
  id: string;
  type: 'thumbsup' | 'heart' | 'clap' | 'party' | 'fire';
  x: number; // For float rendering
}

export default function StudentLivePage() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  // Google Meet layout states
  const [activeRightPanel, setActiveRightPanel] = useState<'chat' | 'members' | 'files' | 'info' | null>('chat')
  const [isMicOn, setIsMicOn] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const [activeSpeaker, setActiveSpeaker] = useState<'instructor' | 'lucia' | 'student' | 'marcos'>('instructor')
  const [showReactionsPopover, setShowReactionsPopover] = useState(false)
  const [meetingCode] = useState('tup-srmi-oqq')
  const [hasJoined, setHasJoined] = useState(false)
  const [hasBackgroundBlur, setHasBackgroundBlur] = useState(false)
  const [zoomViewMode, setZoomViewMode] = useState<'gallery' | 'speaker'>('gallery')

  // Real-time states
  const [activeLive, setActiveLive] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [localMessage, setLocalMessage] = useState('')
  const [handRaised, setHandRaised] = useState(false)
  const [streamQuality, setStreamQuality] = useState('Auto')
  const [bitrate, setBitrate] = useState(4820)
  const [latency, setLatency] = useState(1.4)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [floatingReactions, setFloatingReactions] = useState<LiveReaction[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  
  // Real camera simulation for student if they want to participate
  const [studentStream, setStudentStream] = useState<MediaStream | null>(null)
  const [isStudentCameraOn, setIsStudentCameraOn] = useState(false)
  const studentVideoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  // Countdown State
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })

  // WebRTC Student States and Refs
  const [teacherStream, setTeacherStream] = useState<MediaStream | null>(null)
  const [teacherScreenStream, setTeacherScreenStream] = useState<MediaStream | null>(null)
  const teacherVideoRef = useRef<HTMLVideoElement | null>(null)
  const teacherScreenVideoRef = useRef<HTMLVideoElement | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)

  // 1. Digital Clock effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Keep teacher stream synchronized
  useEffect(() => {
    if (teacherVideoRef.current) {
      if (teacherStream) {
        teacherVideoRef.current.srcObject = teacherStream
      } else {
        teacherVideoRef.current.srcObject = null
      }
    }
  }, [teacherStream])

  // Keep teacher screen stream synchronized
  useEffect(() => {
    if (teacherScreenVideoRef.current) {
      if (teacherScreenStream) {
        teacherScreenVideoRef.current.srcObject = teacherScreenStream
      } else {
        teacherScreenVideoRef.current.srcObject = null
      }
    }
  }, [teacherScreenStream])

  // 2. Active Speaker Simulation loop
  useEffect(() => {
    const speakers: ('instructor' | 'lucia' | 'student' | 'marcos')[] = ['instructor', 'lucia', 'instructor', 'marcos']
    let index = 0
    const timer = setInterval(() => {
      // Rotate active speaker to give visual activity
      const nextSpeaker = speakers[index % speakers.length]
      if (nextSpeaker === 'student' && !isMicOn) {
        setActiveSpeaker('instructor')
      } else {
        setActiveSpeaker(nextSpeaker)
      }
      index++
    }, 8000)
    return () => clearInterval(timer)
  }, [isMicOn])

  // 3. Listen to Active Live Config Document
  useEffect(() => {
    if (!db) return
    const liveDocRef = doc(db, 'site_config', 'active_live')
    const unsubscribe = onSnapshot(liveDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        setActiveLive(data)
        
        // Match local handRaised state with Firestore array
        if (user && data.handsRaised) {
          const raised = data.handsRaised.some((p: any) => p.userId === user.uid)
          setHandRaised(raised)
        }

        // Trigger floating emoji reaction from latest document update
        if (data.latestReaction && data.latestReaction.timestamp > (Date.now() - 5000)) {
          triggerReactionAnim(data.latestReaction.type)
        }
      }
    })
    return () => unsubscribe()
  }, [db, user])

  // 4. Listen to Real-Time Chat
  useEffect(() => {
    if (!db) return
    const chatQuery = query(
      collection(db, 'live_chat_messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    )
    
    const unsubscribe = onSnapshot(chatQuery, (snap) => {
      const msgs: ChatMessage[] = []
      snap.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage)
      })
      setChatMessages(msgs)
      
      // Auto-scroll to bottom of chat
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 150)
    })
    return () => unsubscribe()
  }, [db])

  // 5. Countdown timer to Live Class scheduling
  useEffect(() => {
    if (!activeLive || !activeLive.scheduledFor) return
    
    const interval = setInterval(() => {
      const target = new Date(activeLive.scheduledFor).getTime()
      const now = new Date().getTime()
      const diff = target - now

      if (diff <= 0) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 })
        clearInterval(interval)
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setCountdown({ hours, minutes, seconds })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [activeLive])

  // Simulate Bitrate variation
  useEffect(() => {
    const interval = setInterval(() => {
      if (streamQuality === 'Auto') {
        setBitrate(Math.floor(3200 + Math.random() * 2000))
        setLatency(parseFloat((1.1 + Math.random() * 0.4).toFixed(2)))
      } else if (streamQuality === '1080p') {
        setBitrate(5400)
        setLatency(1.8)
      } else if (streamQuality === '720p') {
        setBitrate(2800)
        setLatency(1.2)
      } else {
        setBitrate(1200)
        setLatency(0.8)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [streamQuality])

  // WebRTC Connection Effect for Receiving Instructor's Stream
  useEffect(() => {
    if (!db || !user || !activeLive || activeLive.status !== 'Active') {
      setTeacherStream(null)
      if (pcRef.current) {
        pcRef.current.close()
        pcRef.current = null
      }
      return
    }

    const studentUserId = user.uid
    let isCancelled = false
    let unsubDoc: (() => void) | null = null
    let unsubHostCand: (() => void) | null = null

    console.log("Student Live WebRTC: Active live detected. Establishing connection...")

    const connectToTeacher = async () => {
      try {
        // Pre-cleanup any stale signaling
        try {
          await deleteDoc(doc(db, 'live_sessions_signaling', studentUserId))
          const studentCandSnap = await getDocs(collection(db, 'live_sessions_signaling', studentUserId, 'studentCandidates'))
          studentCandSnap.forEach(async (d) => {
            await deleteDoc(doc(db, 'live_sessions_signaling', studentUserId, 'studentCandidates', d.id))
          })
          const hostCandSnap = await getDocs(collection(db, 'live_sessions_signaling', studentUserId, 'hostCandidates'))
          hostCandSnap.forEach(async (d) => {
            await deleteDoc(doc(db, 'live_sessions_signaling', studentUserId, 'hostCandidates', d.id))
          })
        } catch (e) {
          console.warn("Signaling cleanup info:", e)
        }

        if (isCancelled) return

        // Create peer connection
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        })
        pcRef.current = pc

        // Add transceivers (support two video tracks: student camera & teacher screen share, plus bidirectional audio)
        const vTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' })
        pc.addTransceiver('video', { direction: 'recvonly' })
        const aTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' })

        // Attach local student tracks if available
        if (studentStream) {
          const vTrack = studentStream.getVideoTracks()[0]
          const aTrack = studentStream.getAudioTracks()[0]
          if (vTrack && isStudentCameraOn) vTransceiver.sender.replaceTrack(vTrack).catch(e => console.warn(e))
          if (aTrack && isMicOn) aTransceiver.sender.replaceTrack(aTrack).catch(e => console.warn(e))
        }

        // Track received handler
        pc.ontrack = (event) => {
          console.log("WebRTC Student: Received remote track", event.track.kind)
          if (isCancelled) return
          
          const transceivers = pc.getTransceivers()
          const index = transceivers.indexOf(event.transceiver)

          if (index === 0) {
            // First video transceiver -> Camera Video Track
            setTeacherStream(prev => {
              if (prev) {
                const tracks = prev.getTracks().filter(t => t.kind !== 'video')
                tracks.push(event.track)
                return new MediaStream(tracks)
              }
              return new MediaStream([event.track])
            })
          } else if (index === 1) {
            // Second video transceiver -> Screen Share Video Track
            setTeacherScreenStream(new MediaStream([event.track]))
          } else if (index === 2) {
            // Audio transceiver -> Microphone Audio Track
            setTeacherStream(prev => {
              if (prev) {
                const tracks = prev.getTracks().filter(t => t.kind !== 'audio')
                tracks.push(event.track)
                return new MediaStream(tracks)
              }
              return new MediaStream([event.track])
            })
          }
        }

        // ICE candidate generation handler
        pc.onicecandidate = (event) => {
          if (event.candidate && !isCancelled) {
            addDoc(collection(db, 'live_sessions_signaling', studentUserId, 'studentCandidates'), event.candidate.toJSON())
              .catch(e => console.error("Error writing student ICE candidate:", e))
          }
        }

        // Create SDP offer
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        if (isCancelled) {
          pc.close()
          return
        }

        // Save offer to Firestore to trigger instructor response
        await setDoc(doc(db, 'live_sessions_signaling', studentUserId), {
          offer: {
            type: offer.type,
            sdp: offer.sdp
          },
          studentName: user.email?.split('@')[0] || 'Estudiante',
          timestamp: new Date().toISOString()
        })

        // Listen for host SDP answer & remote moderation updates
        unsubDoc = onSnapshot(doc(db, 'live_sessions_signaling', studentUserId), async (snapshot) => {
          const data = snapshot.data()
          if (!data) return;

          if (data.answer && pc.signalingState !== 'stable' && !isCancelled) {
            console.log("WebRTC Student: Setting remote answer SDP")
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
          }

          // Handle real-time moderation actions from instructor
          if (data.forceMute) {
            setIsMicOn(false)
            if (studentStream) {
              studentStream.getAudioTracks().forEach(track => track.enabled = false)
            }
            updateDoc(doc(db, 'live_sessions_signaling', studentUserId), { forceMute: false }).catch(() => {})
            toast({
              variant: "destructive",
              title: "Micrófono Silenciado",
              description: "El instructor de la mentoría ha silenciado tu micrófono."
            })
          }

          if (data.micBlocked !== undefined) {
            setIsMicBlocked(data.micBlocked)
            if (data.micBlocked && isMicOn) {
              setIsMicOn(false)
              if (studentStream) {
                studentStream.getAudioTracks().forEach(track => track.enabled = false)
              }
              toast({
                variant: "destructive",
                title: "Micrófono Deshabilitado",
                description: "El instructor ha bloqueado los micrófonos de los participantes."
              })
            }
          }
        })

        // Listen for host ICE candidates
        unsubHostCand = onSnapshot(collection(db, 'live_sessions_signaling', studentUserId, 'hostCandidates'), (candSnap) => {
          candSnap.docChanges().forEach((change) => {
            if (change.type === 'added' && !isCancelled) {
              const candData = change.doc.data()
              pc.addIceCandidate(new RTCIceCandidate(candData)).catch(e => {
                console.warn("WebRTC Student: Error adding host candidate", e)
              })
            }
          })
        })

      } catch (err) {
        console.error("WebRTC student connection setup failed:", err)
      }
    }

    connectToTeacher()

    return () => {
      isCancelled = true
      if (unsubDoc) unsubDoc()
      if (unsubHostCand) unsubHostCand()
      setTeacherStream(null)
      setTeacherScreenStream(null)
      if (pcRef.current) {
        pcRef.current.close()
        pcRef.current = null
      }
      // Delete signaling files on exit
      deleteDoc(doc(db, 'live_sessions_signaling', studentUserId)).catch(() => {})
    }
  }, [db, user, activeLive])

  // Generate simulated participant lists
  useEffect(() => {
    const defaultParticipants = [
      { name: "Lucia Fernandez", role: "affiliate", handRaised: true, camera: false, speaking: false },
      { name: "Marcos Diaz", role: "affiliate", handRaised: false, camera: false, speaking: false },
      { name: "Juan Pérez", role: "affiliate", handRaised: false, camera: true, speaking: false },
      { name: "Andrea Gómez", role: "affiliate", handRaised: false, camera: false, speaking: false },
    ]
    setParticipants(defaultParticipants)
  }, [])

  // Synchronize student local media tracks with WebRTC peer connection transceivers
  useEffect(() => {
    const pc = pcRef.current;
    if (!pc || pc.connectionState === 'closed') return;

    try {
      const transceivers = pc.getTransceivers();
      
      const videoTrack = studentStream && isStudentCameraOn ? studentStream.getVideoTracks()[0] : null;
      const audioTrack = studentStream && isMicOn ? studentStream.getAudioTracks()[0] : null;

      // Update transceiver directions based on media track state
      let videoIndex = 0;
      transceivers.forEach(transceiver => {
        if (transceiver.receiver.track.kind === 'video') {
          if (videoIndex === 0) {
            // First video transceiver handles webcam
            transceiver.direction = videoTrack ? 'sendrecv' : 'recvonly';
            transceiver.sender.replaceTrack(videoTrack).catch(err => {
              console.warn("Student WebRTC: Error replacing camera video track:", err);
            });
          } else if (videoIndex === 1) {
            // Second video transceiver handles teacher screen sharing
            transceiver.direction = 'recvonly';
          }
          videoIndex++;
        } else if (transceiver.receiver.track.kind === 'audio') {
          // Audio transceiver
          transceiver.direction = audioTrack ? 'sendrecv' : 'recvonly';
          transceiver.sender.replaceTrack(audioTrack).catch(err => {
            console.warn("Student WebRTC: Error replacing mic audio track:", err);
          });
        }
      });
    } catch (err) {
      console.error("Error updating student tracks on peer connection:", err);
    }
  }, [studentStream, isStudentCameraOn, isMicOn]);

  // Camera capture toggler for students (Participation)
  const toggleStudentCamera = async () => {
    if (isStudentCameraOn) {
      if (studentStream) {
        studentStream.getTracks().forEach(track => track.stop())
      }
      setStudentStream(null)
      setIsStudentCameraOn(false)
      toast({ title: "Cámara desactivada" })
    } else {
      try {
        if (!navigator?.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          toast({
            variant: "destructive",
            title: "Función no compatible",
            description: "Tu navegador o el entorno de ejecución (iframe) no permite acceder a la cámara y micrófono. Intenta abrir la aplicación en una pestaña nueva o usa un navegador compatible con HTTPS."
          })
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        setStudentStream(stream)
        setIsStudentCameraOn(true)
        setTimeout(() => {
          if (studentVideoRef.current) {
            studentVideoRef.current.srcObject = stream
          }
        }, 100)
        toast({ title: "Cámara y Micrófono listos para participar" })
      } catch (err) {
        console.error(err)
        toast({ variant: "destructive", title: "Error de permisos", description: "No se pudo acceder a la cámara o micrófono." })
      }
    }
  }

  // Raise Hand Firestore sync
  const toggleRaiseHand = async () => {
    if (!db || !user) return
    const liveDocRef = doc(db, 'site_config', 'active_live')
    
    const participantInfo = {
      userId: user.uid,
      userName: user.email?.split('@')[0] || 'Afiliado',
      raisedAt: new Date().toISOString()
    }

    try {
      if (handRaised) {
        await updateDoc(liveDocRef, {
          handsRaised: arrayRemove(participantInfo)
        })
        setHandRaised(false)
        toast({ title: "Bajaste la mano" })
      } else {
        await updateDoc(liveDocRef, {
          handsRaised: arrayUnion(participantInfo)
        })
        setHandRaised(true)
        toast({ title: "Levantaste la mano", description: "El instructor verá tu solicitud para hablar." })
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Send Chat message to Firestore
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!localMessage.trim() || !db || !user) return

    const payload = {
      userId: user.uid,
      userName: user.email?.split('@')[0] || 'Afiliado',
      userRole: 'affiliate',
      text: localMessage.trim(),
      createdAt: new Date().toISOString()
    }

    setLocalMessage('')
    try {
      await addDoc(collection(db, 'live_chat_messages'), payload)
    } catch (err) {
      console.error("Error writing message:", err)
    }
  }

  // React button click trigger - saves to Firestore and adds local animation instantly
  const sendReaction = async (type: 'thumbsup' | 'heart' | 'clap' | 'party' | 'fire') => {
    if (!db) return
    
    // Add locally for instant feeling
    triggerReactionAnim(type)

    // Sync to Firestore so other viewers see it too
    const liveDocRef = doc(db, 'site_config', 'active_live')
    try {
      await updateDoc(liveDocRef, {
        [`reactions.${type}`]: (activeLive?.reactions?.[type] || 0) + 1,
        latestReaction: {
          type,
          timestamp: Date.now(),
          randomId: Math.random() // forces document change trigger
        }
      })
    } catch (e) {
      console.error("Reaction sync error:", e)
    }
  }

  const triggerReactionAnim = (type: 'thumbsup' | 'heart' | 'clap' | 'party' | 'fire') => {
    const newRx: LiveReaction = {
      id: Math.random().toString(),
      type,
      x: 10 + Math.random() * 80 // Random horizontal percentage
    }
    setFloatingReactions(prev => [...prev, newRx])
    // Clear out after animation ends
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== newRx.id))
    }, 3000)
  }

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleToggleMic = async () => {
    if (isMicBlocked && !isMicOn) {
      toast({
        variant: "destructive",
        title: "Micrófono Bloqueado",
        description: "El instructor ha bloqueado los micrófonos de los participantes."
      })
      return
    }

    const nextState = !isMicOn
    setIsMicOn(nextState)

    if (nextState && (!studentStream || studentStream.getAudioTracks().length === 0)) {
      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isStudentCameraOn })
          setStudentStream(micStream)
          const aTrack = micStream.getAudioTracks()[0]
          if (pcRef.current && aTrack) {
            const transceivers = pcRef.current.getTransceivers()
            const aTransceiver = transceivers.find(t => t.receiver.track.kind === 'audio')
            if (aTransceiver) {
              aTransceiver.direction = 'sendrecv'
              aTransceiver.sender.replaceTrack(aTrack).catch(e => console.warn(e))
            }
          }
        }
      } catch (err) {
        console.error("Error activating mic:", err)
      }
    } else if (studentStream) {
      studentStream.getAudioTracks().forEach(track => {
        track.enabled = nextState
      })
    }

    toast({ 
      title: nextState ? "Micrófono activado" : "Micrófono silenciado", 
      description: nextState ? "Ahora los participantes pueden escucharte." : "Silenciaste tu micrófono local."
    })
  }

  const handleToggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing)
    toast({ 
      title: !isScreenSharing ? "Presentando pantalla" : "Dejaste de presentar", 
      description: !isScreenSharing ? "Tu pantalla simulada está visible en la sala." : "Volviste a la vista normal."
    })
  }

  // Emojis mapping
  const emojiLabels: Record<string, string> = {
    thumbsup: '👍',
    heart: '💖',
    clap: '👏',
    party: '🎉',
    fire: '🔥'
  }

  const [isMicBlocked, setIsMicBlocked] = useState(false)

  const renderPresentationStage = (presentation: any) => {
    const customSlides = presentation?.customSlides
    const slides = customSlides && customSlides.length > 0 ? customSlides : [
      {
        title: "Bienvenida a Sync Connect v3",
        subtitle: "La nueva era del Marketing de Afiliados y Tráfico de Conversión",
        bullets: [
          "Plataforma de mentorías y aulas WebRTC en alta definición",
          "Embudos de venta automatizados y comisiones instantáneas",
          "Asistencia interactiva mediante copiloto de WhatsApp inteligente"
        ]
      },
      {
        title: "Estrategias de Tráfico de Conversión",
        subtitle: "Cómo captar leads calificados sin presupuesto publicitario",
        bullets: [
          "Uso de bots automatizados de WhatsApp para cierres masivos",
          "Páginas de captura magnéticas optimizadas para móviles",
          "Mentoría uno a uno guiada por expertos en marketing"
        ]
      },
      {
        title: "Arquitectura Comercial Integrada",
        subtitle: "El camino de compra del cliente paso a paso",
        bullets: [
          "Fase 1: Atracción de tráfico orgánico y webinars en vivo",
          "Fase 2: Educación y demostración en la Sync Academy Live",
          "Fase 3: Conversión de pagos mediante Checkout Express"
        ]
      }
    ]

    const totalPages = presentation?.totalPages || slides.length || 1
    const currentPage = presentation?.currentPage || 1
    const slideIdx = Math.min(Math.max(currentPage - 1, 0), slides.length - 1)
    const currentSlide = slides[slideIdx] || slides[0]

    return (
      <div className="w-full h-full flex flex-col justify-between bg-[#0e0f14] p-6 rounded-2xl relative overflow-hidden border border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.15)] select-none">
        {/* Slide Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Presentation className="h-5 w-5 text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase text-indigo-300 tracking-widest font-mono truncate max-w-[280px]">
              Presentación: {presentation?.name || "Guía de Capacitación"}
            </span>
          </div>
          <div className="text-[10px] font-black text-slate-400 font-mono bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
            SLIDE {currentPage} DE {totalPages}
          </div>
        </div>

        {/* Slide Content */}
        {presentation?.type === 'image' && presentation?.fileUrl ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={presentation.fileUrl} alt="Diapositiva" className="max-h-[360px] object-contain rounded-xl border border-white/10 shadow-2xl" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center py-4 px-2 text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tight">{currentSlide.title}</h2>
            {currentSlide.subtitle && (
              <p className="text-[10px] md:text-xs text-indigo-300 font-bold uppercase tracking-widest">{currentSlide.subtitle}</p>
            )}
            <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-indigo-500 to-transparent mx-auto" />
            {currentSlide.bullets && currentSlide.bullets.length > 0 && (
              <ul className="space-y-2 text-left max-w-md mx-auto pt-2">
                {currentSlide.bullets.map((bullet: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 font-medium leading-relaxed">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
            {currentSlide.content && (
              <p className="text-xs text-slate-300 leading-relaxed max-w-lg mx-auto">{currentSlide.content}</p>
            )}
          </div>
        )}

        {/* Slide Footer */}
        <div className="flex items-center justify-between border-t border-white/5 pt-3 shrink-0">
          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">
            SYNC ENGINE SLIDE PRESENTATION V3
          </div>
          <div className="text-[9px] font-black text-indigo-300 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Transmitiendo en tiempo real
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardShell role="affiliate">
      <div className="max-w-7xl mx-auto space-y-4 pb-12 px-4 md:px-8 text-left">
        
        {/* COMPACT TOP HEADER */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/affiliate/academy">
              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white rounded-xl hover:bg-white/5">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Zoom HD Mode</span>
              </div>
              <h2 className="text-xl font-headline font-black text-white uppercase italic leading-none mt-0.5">
                {activeLive?.title || "Cargando sesión..."}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-black">CALIDAD:</span>
            <select 
              value={streamQuality} 
              onChange={e => setStreamQuality(e.target.value)}
              className="bg-slate-900 text-primary border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold focus:outline-none"
            >
              <option value="Auto">AUTOMÁTICO ({bitrate} kbps)</option>
              <option value="1080p">1080p FHD (Fijo)</option>
              <option value="720p">720p HD</option>
              <option value="360p">360p SD</option>
            </select>
          </div>
        </div>

        {/* CONDITION 1: WAITING SCREEN */}
        {(!activeLive || activeLive.status === 'Waiting') && (
          <div className="min-h-[500px] bg-slate-900 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            
            <div className="space-y-6 max-w-lg z-10">
              <div className="inline-flex h-14 w-14 bg-primary/10 border border-primary/20 text-primary rounded-2xl items-center justify-center animate-pulse mb-2">
                <Clock className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black tracking-[0.3em] text-primary uppercase block">PRÓXIMA CLASE PROGRAMADA</span>
                <h3 className="text-2xl md:text-3xl font-black text-white leading-tight uppercase italic">{activeLive?.title || "Siguiente sesión del curso"}</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
                  {activeLive?.description || "Aprende de primera mano las metodologías más avanzadas de automatización con nuestro equipo fundador."}
                </p>
              </div>

              {/* COUNTDOWN TILES */}
              <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto pt-4">
                <div className="bg-white/5 border border-white/5 p-3 rounded-2xl">
                  <span className="block text-2xl font-black font-mono text-white">{String(countdown.hours).padStart(2, '0')}</span>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 block">Horas</span>
                </div>
                <div className="bg-white/5 border border-white/5 p-3 rounded-2xl">
                  <span className="block text-2xl font-black font-mono text-primary">{String(countdown.minutes).padStart(2, '0')}</span>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 block">Minutos</span>
                </div>
                <div className="bg-white/5 border border-white/5 p-3 rounded-2xl">
                  <span className="block text-2xl font-black font-mono text-white">{String(countdown.seconds).padStart(2, '0')}</span>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 block">Segundos</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button className="w-full sm:w-auto h-12 px-8 bg-primary hover:bg-primary/95 text-slate-950 font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl transition-all">
                  AGREGAR A GOOGLE CALENDAR
                </Button>
                <Link href="/dashboard/affiliate/academy" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full h-12 px-6 border-white/10 text-slate-300 hover:bg-white/5 font-black text-[10px] uppercase tracking-widest rounded-xl">
                    VOLVER AL TEMARIO
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* CONDITION 2: ACTIVE SESSION SCREEN (Google Meet UI) */}
        {activeLive?.status === 'Active' && (
          <AnimatePresence mode="wait">
            {!hasJoined ? (
              <motion.div
                key="lobby"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-sm mx-auto flex flex-col items-center justify-between min-h-[720px] bg-[#111214] text-white rounded-[32px] border border-white/5 shadow-2xl relative overflow-hidden p-4"
              >
                {/* Header */}
                <div className="w-full flex items-center justify-between pt-1 px-1 shrink-0">
                  <Link href="/dashboard/affiliate/academy">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-white rounded-full hover:bg-white/5">
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                  </Link>
                  <div className="flex items-center gap-1.5 bg-[#3c4043]/30 px-3 py-1.5 rounded-full border border-white/5">
                    <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-sm font-mono tracking-tight text-slate-100 font-semibold">{meetingCode}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-white rounded-full hover:bg-white/5">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>

                {/* Status Indicator */}
                <div className="my-2 text-center shrink-0">
                  <p className="text-sm text-slate-300 font-medium tracking-tight">
                    {activeLive?.participantsCount && activeLive.participantsCount > 0 
                      ? `El mentor Carlos y ${activeLive.participantsCount} personas más están en la llamada.`
                      : "Aún no hay nadie en la llamada."
                    }
                  </p>
                </div>

                {/* Vertical rounded-3xl camera preview container */}
                <div className="relative w-full max-w-[280px] h-[360px] sm:h-[400px] bg-[#202124] rounded-[32px] overflow-hidden shadow-xl border border-white/5 flex flex-col justify-between p-4 group shrink-0">
                  
                  {/* Background camera or placeholder */}
                  <div className="absolute inset-0">
                    {isStudentCameraOn && studentStream ? (
                      <video
                        ref={(el) => {
                          if (el && studentStream) {
                            el.srcObject = studentStream;
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transform -scale-x-100 transition-all duration-500 ${hasBackgroundBlur ? 'blur-[8px] scale-110' : ''}`}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-b from-[#3c4043] to-[#1c1d1f] flex flex-col items-center justify-center space-y-4">
                        <div className="h-20 w-20 rounded-full bg-[#1e2022] border-2 border-white/15 flex items-center justify-center text-slate-300 font-headline font-black text-2xl uppercase">
                          {user?.email ? user.email.substring(0, 2) : 'AS'}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cámara Desactivada</span>
                      </div>
                    )}
                    
                    {/* Background blur overlay if active */}
                    {isStudentCameraOn && hasBackgroundBlur && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
                        <span className="bg-black/60 backdrop-blur-md text-[8px] font-black tracking-widest text-primary uppercase px-3 py-1.5 rounded-xl border border-white/10">
                          Efectos Activos ✨
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Micro Indicators */}
                  <div className="relative z-10 flex justify-end">
                    {isMicOn && (
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse m-2 shadow-lg" />
                    )}
                  </div>

                  {/* Overlay Controls & User Identifier inside Card */}
                  <div className="relative z-10 flex flex-col items-center space-y-3 w-full bg-gradient-to-t from-black/85 via-black/30 to-transparent pt-12 pb-2 rounded-b-[32px]">
                    
                    {/* Circular Controls */}
                    <div className="flex items-center justify-center gap-3">
                      
                      {/* Video Camera Toggle */}
                      <button
                        onClick={toggleStudentCamera}
                        className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shadow-md ${
                          isStudentCameraOn 
                            ? 'bg-[#3c4043]/90 hover:bg-[#4a4f54] text-white border border-white/10' 
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                        title={isStudentCameraOn ? "Apagar cámara" : "Encender cámara"}
                      >
                        {isStudentCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                      </button>

                      {/* Sparkles filter Toggle */}
                      <button
                        onClick={() => {
                          setHasBackgroundBlur(!hasBackgroundBlur)
                          toast({ 
                            title: !hasBackgroundBlur ? "Fondo desenfocado" : "Desenfoque desactivado",
                            description: !hasBackgroundBlur ? "Se ha aplicado el filtro estético de desenfoque de fondo." : "Volviste a la vista normal."
                          })
                        }}
                        className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shadow-md ${
                          hasBackgroundBlur 
                            ? 'bg-[#1a73e8] text-white border border-blue-500/30' 
                            : 'bg-[#3c4043]/90 hover:bg-[#4a4f54] text-white border border-white/10'
                        }`}
                        title="Filtros y efectos"
                      >
                        <Sparkles className="h-5 w-5" />
                      </button>

                      {/* Mic Toggle */}
                      <button
                        onClick={handleToggleMic}
                        className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shadow-md ${
                          isMicOn 
                            ? 'bg-[#3c4043]/90 hover:bg-[#4a4f54] text-white border border-white/10' 
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                        title={isMicOn ? "Silenciar micrófono" : "Activar micrófono"}
                      >
                        {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                      </button>
                    </div>

                    {/* AffiliateSync User Name label inside the card */}
                    <span className="text-sm font-bold text-white tracking-tight drop-shadow-md select-none">
                      AffiliateSync
                    </span>
                  </div>

                </div>

                {/* Personalised User Account Pill Badge bar */}
                <div className="w-full max-w-[280px] my-3 shrink-0">
                  <div className="bg-[#202124] border border-white/5 rounded-full p-1.5 flex items-center justify-between gap-2 shadow-md">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Fire gradient Sync Connect Icon logo */}
                      <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-orange-500 to-rose-600 flex items-center justify-center text-white shadow-inner shrink-0 text-sm font-bold select-none">
                        🔥
                      </div>
                      <div className="min-w-0 text-left">
                        <span className="block text-[11px] font-black text-slate-100 truncate leading-tight">
                          {user?.email ? `${user.email.split('@')[0]}...` : 'urielroques604...'}
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono font-bold block leading-none mt-0.5">
                          {user?.email ? user.email.split('@')[0] : 'urielroques604'} • +505 8806 2712
                        </span>
                      </div>
                    </div>
                    <div className="bg-primary/20 border border-primary/20 text-primary text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shrink-0 select-none mr-1">
                      aff
                    </div>
                  </div>
                </div>

                {/* Join bottom drawer sheet */}
                <div className="w-full bg-[#202124] border-t border-white/10 rounded-t-[32px] p-5 pb-6 shrink-0 mt-auto flex flex-col items-center">
                  
                  {/* Drag Handle line */}
                  <div className="w-12 h-1 bg-white/10 rounded-full mb-5" />

                  {/* High Contrast Join Button */}
                  <Button 
                    onClick={() => {
                      setHasJoined(true)
                      toast({ 
                        title: "¡Te uniste a la clase!", 
                        description: "Conexión WebRTC establecida con la sala del mentor Carlos." 
                      })
                    }}
                    className="w-full h-14 bg-[#1a73e8] hover:bg-blue-600 text-white font-black rounded-full shadow-lg text-sm tracking-wide gap-2.5 transition-transform active:scale-95 mb-4"
                  >
                    <Video className="h-5 w-5" />
                    Unirse
                  </Button>

                  {/* Complementary and screen sharing options */}
                  <div className="w-full grid grid-cols-2 gap-3">
                    <Button 
                      variant="ghost"
                      onClick={() => {
                        toast({ title: "Modo complementario activo", description: "Dispositivo secundario enlazado para visualización estéril." })
                      }}
                      className="h-11 bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 border border-white/5 font-bold text-[10px] uppercase tracking-wider rounded-full flex items-center justify-center gap-1.5"
                    >
                      <Laptop className="h-4 w-4 text-slate-400" />
                      <span className="truncate text-[9px]">Modo complementario</span>
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={() => {
                        handleToggleScreenShare()
                        setHasJoined(true)
                      }}
                      className="h-11 bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 border border-white/5 font-bold text-[10px] uppercase tracking-wider rounded-full flex items-center justify-center gap-1.5"
                    >
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span className="truncate text-[9px]">Compartir pantalla</span>
                    </Button>
                  </div>

                </div>

              </motion.div>
            ) : (
              <motion.div
                key="call"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                ref={containerRef}
                className="w-full min-h-[600px] xl:h-[700px] bg-[#121212] rounded-3xl overflow-hidden shadow-2xl relative border border-white/5 flex flex-col"
              >
            {/* FLOATING REACTION STREAM */}
            <div className="absolute inset-x-0 bottom-24 h-64 pointer-events-none z-30 overflow-hidden">
              <AnimatePresence>
                {floatingReactions.map((rx) => (
                  <motion.div
                    key={rx.id}
                    initial={{ y: 250, opacity: 0, scale: 0.5 }}
                    animate={{ 
                      y: [250, 100, 0], 
                      x: [rx.x + "%", (rx.x + (Math.random() * 20 - 10)) + "%"],
                      opacity: [0, 1, 1, 0],
                      scale: [0.6, 1.2, 1] 
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 3, ease: "easeOut" }}
                    className="absolute text-3xl select-none"
                    style={{ left: `${rx.x}%` }}
                  >
                    {emojiLabels[rx.type] || '👍'}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* ZOOM TOP STATUS BAR */}
            <div className="bg-[#1a1a1a] border-b border-white/5 px-6 py-3 flex items-center justify-between text-white shrink-0 z-20">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-300">ZOOM MEETING EN VIVO</span>
                <span className="text-white/20">|</span>
                <span className="text-xs text-slate-400 truncate max-w-[200px] md:max-w-none">
                  Tema: <strong className="text-white font-black">{activeLive?.title || "Masterclass Directa"}</strong>
                </span>
              </div>

              {/* View toggle (Gallery vs Speaker) */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-2 hidden sm:inline">Vista de Pantalla:</span>
                <div className="bg-[#2a2a2a] p-0.5 rounded-lg border border-white/5 flex">
                  <button
                    onClick={() => {
                      setZoomViewMode('speaker')
                      toast({ title: "Modo Hablante Activo", description: "Enfocado en la cara y pantalla del mentor." })
                    }}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      zoomViewMode === 'speaker' ? 'bg-primary text-slate-950 shadow-md font-extrabold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="h-3 w-3" />
                    Hablante
                  </button>
                  <button
                    onClick={() => {
                      setZoomViewMode('gallery')
                      toast({ title: "Modo Galería Activo", description: "Visualización grupal completa de todos los afiliados." })
                    }}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      zoomViewMode === 'gallery' ? 'bg-primary text-slate-950 shadow-md font-extrabold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="h-3 w-3" />
                    Galería
                  </button>
                </div>
              </div>
            </div>

            {/* Direct audio track element for guaranteed teacher audio playback */}
            {teacherStream && (
              <audio
                ref={(el) => {
                  if (el && teacherStream) {
                    el.srcObject = teacherStream;
                    el.muted = isAudioMuted;
                    el.play().catch(err => console.warn("Teacher audio auto-play:", err));
                  }
                }}
                autoPlay
                playsInline
              />
            )}

            {/* UNMUTE AUDIO BANNER INDICATOR */}
            {isAudioMuted && (
              <div className="bg-amber-500/25 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-amber-300 text-xs font-bold animate-in fade-in duration-300 shrink-0 z-20">
                <span className="flex items-center gap-2">
                  <VolumeX className="h-4 w-4 animate-bounce text-amber-400" />
                  <span>Tu audio de la clase está silenciado. ¡Haz clic en el botón de audio abajo para escuchar al Mentor Carlos explicar las estrategias!</span>
                </span>
                <Button 
                  size="sm" 
                  onClick={() => {
                    setIsAudioMuted(false)
                    toast({ title: "¡Audio activado!", description: "Ahora puedes oír la explicación en vivo." })
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[9px] uppercase tracking-wider h-7 px-3 rounded-md"
                >
                  OÍR CLASE
                </Button>
              </div>
            )}

            {/* MAIN ZOOM MEETING WORKSPACE (GRID + SIDE PANEL) */}
            <div className="flex-1 flex flex-col xl:flex-row overflow-hidden min-h-0 relative">
              
              {/* MEETING CALL PARTICIPANTS ZOOM GRID */}
              <div className="flex-1 p-6 bg-[#0c0c0e] flex flex-col justify-center overflow-y-auto min-h-0 relative scrollbar-thin">
                
                {/* Presentation Banner */}
                {isScreenSharing && (
                  <div className="w-full bg-blue-500/10 border border-blue-500/20 px-4 py-2.5 rounded-xl text-xs font-semibold text-blue-300 flex items-center justify-between gap-3 mb-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <Laptop className="h-4 w-4 animate-bounce" />
                      <span>Estás compartiendo tu pantalla simulada en la videollamada.</span>
                    </div>
                    <Button 
                      onClick={handleToggleScreenShare}
                      variant="ghost" 
                      className="h-7 px-2.5 bg-blue-500/15 hover:bg-blue-500/30 text-white text-[9px] font-bold rounded-lg uppercase tracking-wider"
                    >
                      Dejar de compartir
                    </Button>
                  </div>
                )}

                {/* ZOOM DYNAMIC VIEW LAYOUTS */}
                {activeLive?.presentation ? (
                  /* GOOGLE MEET SYNCHRONIZED PRESENTATION VIEW */
                  <div className="relative w-full h-full min-h-[420px] flex items-center justify-center p-2">
                    {/* Synchronized Presentation Slide */}
                    <div className="relative w-full h-full aspect-video bg-[#0c0c0e] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
                      {renderPresentationStage(activeLive.presentation)}
                    </div>

                    {/* Floating PIP Instructor Camera Overlay */}
                    <div className="absolute bottom-4 right-4 w-40 md:w-56 aspect-video bg-[#1a1a1e] rounded-xl overflow-hidden shadow-2xl border-2 border-primary/40 z-20 transition-all hover:scale-105">
                      {teacherStream ? (
                        <video 
                          ref={(el) => {
                            teacherVideoRef.current = el;
                            if (el && teacherStream) {
                              el.srcObject = teacherStream;
                            }
                          }}
                          autoPlay 
                          playsInline 
                          muted={isAudioMuted}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src="https://assets.mixkit.co/videos/preview/mixkit-man-explaining-a-marketing-strategy-on-a-tablet-41617-large.mp4"
                          autoPlay
                          loop
                          playsInline
                          muted={isAudioMuted}
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      {/* PIP label */}
                      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg text-white text-[9px] font-bold">
                        {activeLive?.instructor || 'Carlos (Mentor)'}
                      </div>
                    </div>

                    {/* Floating Student Camera PIP (If Camera is turned on) */}
                    {isStudentCameraOn && (
                      <div className="absolute bottom-4 left-4 w-28 md:w-40 aspect-video bg-[#1a1a1e] rounded-xl overflow-hidden shadow-2xl border-2 border-green-500/40 z-20 transition-all hover:scale-105">
                        {studentStream ? (
                          <video 
                            ref={(el) => {
                              if (el && studentStream) el.srcObject = studentStream;
                            }}
                            autoPlay 
                            playsInline 
                            muted
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-bold uppercase font-mono">
                            Tu Cámara
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg text-white text-[9px] font-bold">
                          Tú (Estudiante)
                        </div>
                      </div>
                    )}
                  </div>
                ) : activeLive?.isScreenSharing ? (
                  /* GOOGLE MEET SCREEN SHARING VIEW (Main screen share + Floating PIP Camera) */
                  <div className="relative w-full h-full min-h-[420px] flex items-center justify-center p-2">
                    {/* Main Screen Share View */}
                    <div className="relative w-full h-full aspect-video bg-[#0c0c0e] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
                      {teacherScreenStream ? (
                        <video 
                          ref={(el) => {
                            teacherScreenVideoRef.current = el;
                            if (el && teacherScreenStream) {
                              el.srcObject = teacherScreenStream;
                            }
                          }}
                          autoPlay 
                          playsInline 
                          muted={isAudioMuted}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        /* Fallback high-quality screen share simulation video */
                        <video
                          src="https://assets.mixkit.co/videos/preview/mixkit-hand-holding-smartphone-with-analytics-dashboard-41566-large.mp4"
                          autoPlay
                          loop
                          playsInline
                          muted={isAudioMuted}
                          className="w-full h-full object-contain"
                        />
                      )}
                      
                      {/* Overlay label */}
                      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl text-white text-xs font-black z-10 flex items-center gap-2 border border-white/10">
                        <Laptop className="h-4 w-4 text-primary animate-pulse" />
                        <span>PANTALLA DE: {activeLive?.instructor || 'Carlos (Mentor de Tráfico)'}</span>
                        <span className="bg-primary/20 border border-primary/20 text-primary text-[8px] font-black uppercase px-2 py-0.5 rounded-md font-mono">Compartiendo</span>
                      </div>
                    </div>

                    {/* Floating PIP Instructor Camera Overlay */}
                    <div className="absolute bottom-4 right-4 w-40 md:w-56 aspect-video bg-[#1a1a1e] rounded-xl overflow-hidden shadow-2xl border-2 border-primary/40 z-20 transition-all hover:scale-105">
                      {teacherStream ? (
                        <video 
                          ref={(el) => {
                            teacherVideoRef.current = el;
                            if (el && teacherStream) {
                              el.srcObject = teacherStream;
                            }
                          }}
                          autoPlay 
                          playsInline 
                          muted={isAudioMuted}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src="https://assets.mixkit.co/videos/preview/mixkit-man-explaining-a-marketing-strategy-on-a-tablet-41617-large.mp4"
                          autoPlay
                          loop
                          playsInline
                          muted={isAudioMuted}
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      {/* PIP label */}
                      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-wider">
                        {activeLive?.instructor?.split(' ')[1] || 'Carlos'}
                      </div>
                    </div>
                  </div>
                ) : zoomViewMode === 'gallery' ? (
                  /* ZOOM GALLERY VIEW (Grid mode showing everyone equally) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl mx-auto auto-rows-fr">
                    
                    {/* TILE 1: CARLOS (INSTRUCTOR - MAIN HOST) */}
                    <div 
                      className={`aspect-video bg-[#1a1a1e] rounded-2xl overflow-hidden relative shadow-xl transition-all duration-300 flex flex-col justify-between ${
                        activeSpeaker === 'instructor' 
                          ? 'ring-4 ring-green-500 shadow-[0_0_25px_rgba(34,197,94,0.4)] scale-[1.01]' 
                          : 'border border-white/5'
                      }`}
                    >
                      {/* Video Player */}
                      <div className="absolute inset-0">
                        {teacherStream ? (
                          <video 
                            ref={(el) => {
                              teacherVideoRef.current = el;
                              if (el && teacherStream) {
                                el.srcObject = teacherStream;
                              }
                            }}
                            autoPlay 
                            playsInline 
                            muted={isAudioMuted}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          /* High fidelity direct marketing presentation placeholder video of Carlos with voice tracks */
                          <video
                            src="https://assets.mixkit.co/videos/preview/mixkit-man-explaining-a-marketing-strategy-on-a-tablet-41617-large.mp4"
                            autoPlay
                            loop
                            playsInline
                            muted={isAudioMuted}
                            className="w-full h-full object-cover"
                          />
                        )}

                        {/* Speaking green halo animation */}
                        {activeSpeaker === 'instructor' && (
                          <div className="absolute inset-0 border-4 border-green-500 pointer-events-none rounded-2xl animate-pulse" />
                        )}
                      </div>

                      {/* Microphone Level overlay indicator */}
                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md p-2 rounded-full z-10 flex items-center justify-center">
                        <Mic className="h-3.5 w-3.5 text-green-400" />
                      </div>

                      {/* Info label bottom-left */}
                      <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-[11px] font-bold z-10 flex items-center gap-2 border border-white/5">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="uppercase tracking-wide">{activeLive?.instructor || 'Carlos (Mentor Principal)'}</span>
                        <span className="text-primary text-[8px] font-black uppercase px-1.5 py-0.5 bg-primary/20 border border-primary/20 rounded-md">ANFITRIÓN</span>
                      </div>
                    </div>

                    {/* TILE 2: TÚ (STUDENT) */}
                    <div 
                      className={`aspect-video bg-[#1a1a1e] rounded-2xl overflow-hidden relative shadow-xl transition-all duration-300 flex flex-col justify-between ${
                        activeSpeaker === 'student' 
                          ? 'ring-4 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                          : 'border border-white/5'
                      }`}
                    >
                      <div className="absolute inset-0">
                        {isStudentCameraOn && studentStream ? (
                          <video 
                            ref={(el) => {
                              studentVideoRef.current = el;
                              if (el && studentStream) {
                                el.srcObject = studentStream;
                              }
                            }}
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1b1c1e] to-[#0d0d0f] gap-3">
                            <Avatar className="h-16 w-16 border-2 border-white/10 shadow-lg">
                              <AvatarFallback className="bg-primary text-slate-950 font-black text-lg">
                                {user?.email ? user.email.substring(0, 2).toUpperCase() : 'TÚ'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cámara Desactivada</span>
                          </div>
                        )}
                        {activeSpeaker === 'student' && isMicOn && (
                          <div className="absolute inset-0 border-4 border-green-500 pointer-events-none rounded-2xl animate-pulse" />
                        )}
                      </div>

                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md p-2 rounded-full z-10">
                        {isMicOn ? (
                          <Mic className="h-3.5 w-3.5 text-green-400" />
                        ) : (
                          <MicOff className="h-3.5 w-3.5 text-red-500" />
                        )}
                      </div>

                      {handRaised && (
                        <div className="absolute top-3 left-3 bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg z-10 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider shadow-md">
                          <Hand className="h-3.5 w-3.5 animate-bounce" /> MANO ALTA
                        </div>
                      )}

                      <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-[11px] font-bold z-10 flex items-center gap-2 border border-white/5">
                        <span className="uppercase tracking-wide">Tú (Afiliado)</span>
                      </div>
                    </div>

                    {/* TILE 3: LUCIA FERNANDEZ */}
                    <div 
                      className={`aspect-video bg-[#1a1a1e] rounded-2xl overflow-hidden relative shadow-xl transition-all duration-300 flex flex-col justify-between ${
                        activeSpeaker === 'lucia' 
                          ? 'ring-4 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                          : 'border border-white/5'
                      }`}
                    >
                      <div className="absolute inset-0">
                        {/* Simulated student with video or beautiful looping portrait avatar */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1b1c1e] to-[#0d0d0f] gap-3">
                          <Avatar className="h-16 w-16 border-2 border-white/10 shadow-lg">
                            <AvatarFallback className="bg-sky-600 text-white font-black text-lg">LF</AvatarFallback>
                          </Avatar>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cámara Desactivada</span>
                        </div>
                        {activeSpeaker === 'lucia' && (
                          <div className="absolute inset-0 border-4 border-green-500 pointer-events-none rounded-2xl animate-pulse" />
                        )}
                      </div>

                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md p-2 rounded-full z-10">
                        <MicOff className="h-3.5 w-3.5 text-red-500" />
                      </div>

                      <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-[11px] font-bold z-10 flex items-center gap-2 border border-white/5">
                        <span className="uppercase tracking-wide">Lucia Fernandez</span>
                      </div>
                    </div>

                    {/* TILE 4: MARCOS DIAZ */}
                    <div 
                      className={`aspect-video bg-[#1a1a1e] rounded-2xl overflow-hidden relative shadow-xl transition-all duration-300 flex flex-col justify-between ${
                        activeSpeaker === 'marcos' 
                          ? 'ring-4 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                          : 'border border-white/5'
                      }`}
                    >
                      <div className="absolute inset-0">
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1b1c1e] to-[#0d0d0f] gap-3">
                          <Avatar className="h-16 w-16 border-2 border-white/10 shadow-lg">
                            <AvatarFallback className="bg-amber-600 text-white font-black text-lg">MD</AvatarFallback>
                          </Avatar>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cámara Desactivada</span>
                        </div>
                        {activeSpeaker === 'marcos' && (
                          <div className="absolute inset-0 border-4 border-green-500 pointer-events-none rounded-2xl animate-pulse" />
                        )}
                      </div>

                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md p-2 rounded-full z-10">
                        <MicOff className="h-3.5 w-3.5 text-red-500" />
                      </div>

                      <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-[11px] font-bold z-10 flex items-center gap-2 border border-white/5">
                        <span className="uppercase tracking-wide">Marcos Diaz</span>
                      </div>
                    </div>

                    {/* TILE 5: JUAN PEREZ */}
                    <div className="aspect-video bg-[#1a1a1e] rounded-2xl overflow-hidden relative shadow-xl border border-white/5 flex flex-col justify-between">
                      <div className="absolute inset-0">
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1b1c1e] to-[#0d0d0f] gap-3">
                          <Avatar className="h-16 w-16 border-2 border-white/10 shadow-lg">
                            <AvatarFallback className="bg-indigo-600 text-white font-black text-lg">JP</AvatarFallback>
                          </Avatar>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cámara Desactivada</span>
                        </div>
                      </div>

                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md p-2 rounded-full z-10">
                        <MicOff className="h-3.5 w-3.5 text-red-500" />
                      </div>

                      <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-[11px] font-bold z-10 flex items-center gap-2 border border-white/5">
                        <span className="uppercase tracking-wide">Juan Pérez</span>
                      </div>
                    </div>

                    {/* TILE 6: ANDREA GOMEZ */}
                    <div className="aspect-video bg-[#1a1a1e] rounded-2xl overflow-hidden relative shadow-xl border border-white/5 flex flex-col justify-between">
                      <div className="absolute inset-0">
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1b1c1e] to-[#0d0d0f] gap-3">
                          <Avatar className="h-16 w-16 border-2 border-white/10 shadow-lg">
                            <AvatarFallback className="bg-rose-600 text-white font-black text-lg">AG</AvatarFallback>
                          </Avatar>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cámara Desactivada</span>
                        </div>
                      </div>

                      <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md p-2 rounded-full z-10">
                        <MicOff className="h-3.5 w-3.5 text-red-500" />
                      </div>

                      <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-[11px] font-bold z-10 flex items-center gap-2 border border-white/5">
                        <span className="uppercase tracking-wide">Andrea Gómez</span>
                      </div>
                    </div>

                  </div>
                ) : (
                  /* ZOOM SPEAKER VIEW (Massive main view for Carlos, small slider for students) */
                  <div className="w-full h-full flex flex-col gap-6 justify-center">
                    
                    {/* Horizontal top bar of other participants thumbnails */}
                    <div className="flex justify-center gap-3 overflow-x-auto py-1 shrink-0 scrollbar-none">
                      
                      {/* You Thumbnail */}
                      <div className={`h-20 aspect-video bg-[#1a1a1e] rounded-xl relative shrink-0 overflow-hidden border ${activeSpeaker === 'student' ? 'border-green-500 ring-2 ring-green-500' : 'border-white/10'}`}>
                        {isStudentCameraOn && studentStream ? (
                          <video 
                            ref={(el) => {
                              if (el && studentStream) el.srcObject = studentStream;
                            }}
                            autoPlay 
                            playsInline 
                            muted 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0f]">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary text-slate-950 font-black text-[10px]">TÚ</AvatarFallback>
                            </Avatar>
                          </div>
                        )}
                        <span className="absolute bottom-1 left-1 bg-black/70 px-1 py-0.5 rounded text-[8px] text-white">Tú</span>
                      </div>

                      {/* Lucia Thumbnail */}
                      <div className="h-20 aspect-video bg-[#1a1a1e] rounded-xl relative shrink-0 overflow-hidden border border-white/10">
                        <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0f]">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-sky-600 text-white font-black text-[10px]">LF</AvatarFallback>
                          </Avatar>
                        </div>
                        <span className="absolute bottom-1 left-1 bg-black/70 px-1 py-0.5 rounded text-[8px] text-white">Lucia</span>
                      </div>

                      {/* Marcos Thumbnail */}
                      <div className="h-20 aspect-video bg-[#1a1a1e] rounded-xl relative shrink-0 overflow-hidden border border-white/10">
                        <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0f]">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-amber-600 text-white font-black text-[10px]">MD</AvatarFallback>
                          </Avatar>
                        </div>
                        <span className="absolute bottom-1 left-1 bg-black/70 px-1 py-0.5 rounded text-[8px] text-white">Marcos</span>
                      </div>

                      {/* Juan Thumbnail */}
                      <div className="h-20 aspect-video bg-[#1a1a1e] rounded-xl relative shrink-0 overflow-hidden border border-white/10">
                        <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0f]">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-indigo-600 text-white font-black text-[10px]">JP</AvatarFallback>
                          </Avatar>
                        </div>
                        <span className="absolute bottom-1 left-1 bg-black/70 px-1 py-0.5 rounded text-[8px] text-white">Juan</span>
                      </div>

                    </div>

                    {/* MASSIVE SPEAKER SCREEN FOR MENTOR CARLOS */}
                    <div 
                      className={`relative w-full max-w-4xl mx-auto aspect-video bg-[#1a1a1e] rounded-3xl overflow-hidden shadow-2xl flex-1 ${
                        activeSpeaker === 'instructor' 
                          ? 'ring-4 ring-green-500 shadow-[0_0_30px_rgba(34,197,94,0.35)]' 
                          : 'border border-white/5'
                      }`}
                    >
                      {teacherStream ? (
                        <video 
                          ref={(el) => {
                            teacherVideoRef.current = el;
                            if (el && teacherStream) {
                              el.srcObject = teacherStream;
                            }
                          }}
                          autoPlay 
                          playsInline 
                          muted={isAudioMuted}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src="https://assets.mixkit.co/videos/preview/mixkit-man-explaining-a-marketing-strategy-on-a-tablet-41617-large.mp4"
                          autoPlay
                          loop
                          playsInline
                          muted={isAudioMuted}
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Speak border overlay */}
                      {activeSpeaker === 'instructor' && (
                        <div className="absolute inset-0 border-4 border-green-500 pointer-events-none rounded-3xl animate-pulse" />
                      )}

                      {/* Overlay label */}
                      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl text-white text-xs font-black z-10 flex items-center gap-2 border border-white/10">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                        <span>PRESENTANDO: {activeLive?.instructor || 'Carlos (Mentor de Tráfico Directo)'}</span>
                        <span className="bg-primary/20 border border-primary/20 text-primary text-[8px] font-black uppercase px-2 py-0.5 rounded-md">ANFITRIÓN</span>
                      </div>

                      <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md p-2.5 rounded-full z-10">
                        <Mic className="h-4 w-4 text-green-400" />
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* COLLAPSIBLE RIGHT PANEL (ZOOM DARK SIDEBAR) */}
              <AnimatePresence>
                {activeRightPanel && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 340, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 120 }}
                    className="h-full bg-[#16161a] border-l border-white/5 flex flex-col text-white shrink-0 relative z-20"
                  >
                    
                    {/* Panel Header */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                        {activeRightPanel === 'chat' && 'Chat del Grupo'}
                        {activeRightPanel === 'members' && `Participantes (${participants.length + (user ? 2 : 1)})`}
                        {activeRightPanel === 'files' && 'Archivos Compartidos'}
                        {activeRightPanel === 'info' && 'Detalles de la Sala'}
                      </h4>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setActiveRightPanel(null)}
                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Panel Content (Scroll Area) */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-thin">
                      
                      {/* 1. CHAT PANEL CONTENT */}
                      {activeRightPanel === 'chat' && (
                        <div className="h-full flex flex-col justify-between">
                          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[420px] scrollbar-thin">
                            {chatMessages.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center py-12 text-center space-y-2">
                                <AlertCircle className="h-7 w-7 text-slate-600" />
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aún no hay mensajes. ¡Di algo!</p>
                              </div>
                            ) : (
                              chatMessages.map((msg) => (
                                <div key={msg.id} className="flex gap-2.5 text-left">
                                  <Avatar className="h-7 w-7 border border-white/10 mt-0.5">
                                    <AvatarFallback className={`text-[10px] font-black text-slate-950 uppercase ${msg.userRole === 'admin' ? 'bg-primary' : 'bg-slate-700 text-white'}`}>
                                      {msg.userName.substring(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] font-black text-white truncate max-w-[120px]">{msg.userName}</span>
                                      <span className={`text-[6px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                                        msg.userRole === 'admin' 
                                          ? 'bg-red-500/20 text-red-400' 
                                          : 'bg-white/5 text-slate-400'
                                      }`}>
                                        {msg.userRole === 'admin' ? 'Mentor' : 'Estudiante'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-300 font-medium leading-relaxed bg-white/5 p-2.5 rounded-xl rounded-tl-none mt-1 inline-block max-w-full break-words">
                                      {msg.text}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                            <div ref={chatEndRef} />
                          </div>

                          <form onSubmit={handleSendMessage} className="flex gap-2 pt-3 border-t border-white/5 mt-auto bg-[#16161a]">
                            <Input 
                              value={localMessage}
                              onChange={e => setLocalMessage(e.target.value)}
                              placeholder="Escribe un mensaje de Zoom..."
                              className="h-10 bg-white/5 border-none ring-1 ring-white/10 text-white rounded-xl text-xs px-3 flex-1 focus:ring-primary"
                            />
                            <Button type="submit" size="icon" className="h-10 w-10 bg-primary text-slate-950 hover:bg-primary/90 rounded-xl shrink-0">
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          </form>
                        </div>
                      )}

                      {/* 2. MEMBERS PANEL CONTENT */}
                      {activeRightPanel === 'members' && (
                        <div className="space-y-3 text-left">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block border-b border-white/5 pb-1">Integrantes de la Llamada</span>
                          
                          {/* Real current student */}
                          {user && (
                            <div className="flex justify-between items-center p-2 rounded-xl bg-white/5">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="h-7 w-7 border border-white/5">
                                  <AvatarFallback className="bg-emerald-500 text-slate-950 text-[10px] font-black">TÚ</AvatarFallback>
                                </Avatar>
                                <div>
                                  <span className="block text-xs font-black text-white">{user.email?.split('@')[0]}</span>
                                  <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest">Estudiante (Tú)</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {handRaised && <Hand className="h-3.5 w-3.5 text-amber-400 animate-bounce" />}
                                {isStudentCameraOn && <Video className="h-3.5 w-3.5 text-emerald-400" />}
                                {isMicOn && <Mic className="h-3.5 w-3.5 text-green-400" />}
                              </div>
                            </div>
                          )}

                          {/* Instructor */}
                          <div className="flex justify-between items-center p-2 rounded-xl bg-red-500/5 ring-1 ring-red-500/10">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-7 w-7 border border-red-500/20">
                                <AvatarFallback className="bg-red-600 text-white text-[10px] font-black">INST</AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="block text-xs font-black text-white">{activeLive?.instructor || "Prof. Carlos"}</span>
                                <span className="text-[7px] text-red-400 font-black uppercase tracking-widest">Instructor Principal</span>
                              </div>
                            </div>
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-2" />
                          </div>

                          {/* Simulated participants */}
                          {participants.map((m, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 rounded-xl hover:bg-white/5">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback className="bg-slate-800 text-slate-400 text-[10px] font-bold">{m.name.substring(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <span className="block text-xs font-black text-slate-300">{m.name}</span>
                                  <span className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Estudiante</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {m.handRaised && <Hand className="h-3.5 w-3.5 text-amber-400" />}
                                {m.camera && <Video className="h-3.5 w-3.5 text-emerald-400" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 3. MATERIAL DOWNLOADS PANEL CONTENT */}
                      {activeRightPanel === 'files' && (
                        <div className="space-y-3 text-left">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Materiales de Soporte</span>
                          <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Descarga las diapositivas de tráfico, plantillas de embudo y herramientas recomendadas por el mentor Carlos.</p>
                          
                          <div className="space-y-2 pt-2">
                            {activeLive?.files && activeLive.files.length > 0 ? (
                              activeLive.files.map((file: any, index: number) => (
                                <div key={index} className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3 transition-all group">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="h-8 w-8 bg-slate-950 border border-white/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                                      <Paperclip className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <span className="block text-xs font-black text-white leading-tight truncate">{file.name}</span>
                                      <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-0.5 block">{file.size || "1.4 MB"}</span>
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 shrink-0">
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))
                            ) : (
                              <div className="border border-dashed border-white/10 rounded-xl p-6 text-center flex flex-col items-center justify-center space-y-1">
                                <Paperclip className="h-5 w-5 text-slate-600 animate-pulse" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sin Materiales</span>
                                <p className="text-[8px] text-slate-500 leading-normal max-w-[150px]">El tutor aún no ha cargado diapositivas de clase.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 4. MEETING INFO PANEL */}
                      {activeRightPanel === 'info' && (
                        <div className="space-y-4 text-left">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block border-b border-white/5 pb-1">Detalles de la Sesión</span>
                          <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase text-primary">Tema Académico</span>
                            <p className="text-xs text-slate-300 font-bold leading-snug">{activeLive?.title}</p>
                          </div>
                          <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase text-slate-500">Descripción</span>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">{activeLive?.description || "Esta masterclass de Zoom te capacita para lanzar campañas efectivas de tráfico calificado y conversión."}</p>
                          </div>
                          <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase text-slate-500">Enlace de Zoom Privado</span>
                            <span className="block font-mono text-[11px] text-slate-300 bg-white/5 p-2 rounded-lg font-bold">{meetingCode}</span>
                          </div>
                        </div>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* CLASSIC ZOOM BOTTOM CONTROL BAR */}
            <div className="w-full bg-[#111113] border-t border-white/5 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 z-20 shrink-0">
              
              {/* Left Side Info */}
              <div className="flex items-center gap-3 text-white text-xs select-none order-2 md:order-1 font-bold">
                <span className="font-mono tracking-tight text-slate-300 bg-[#1e1e24] px-2.5 py-1 rounded-md border border-white/5">{currentTime || '12:00 PM'}</span>
                <span className="text-white/15">|</span>
                <span className="text-xs text-slate-400 font-mono tracking-wide lowercase bg-[#1e1e24] px-2.5 py-1 rounded-md border border-white/5">ID Zoom: {meetingCode}</span>
              </div>

              {/* Center Controls styled exactly like Zoom client toolbar */}
              <div className="flex items-center justify-center gap-3.5 order-1 md:order-2 relative">
                
                {/* Audio Track toggle (Mute/Unmute presentation sound for student) */}
                <button 
                  onClick={() => {
                    setIsAudioMuted(!isAudioMuted)
                    toast({
                      title: isAudioMuted ? "Audio Activado 🔊" : "Audio Silenciado 🔇",
                      description: isAudioMuted ? "Ahora escuchas al mentor Carlos hablar." : "Silenciaste el audio de la transmisión."
                    })
                  }}
                  className={`h-11 px-4 rounded-xl flex flex-col items-center justify-center transition-all min-w-[70px] ${
                    !isAudioMuted 
                      ? 'bg-[#1e1e24] text-[#22c55e] hover:bg-[#2e2e36] border border-white/5' 
                      : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20'
                  }`}
                  title={!isAudioMuted ? "Silenciar audio del Mentor" : "Escuchar audio del Mentor"}
                >
                  {!isAudioMuted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  <span className="text-[8px] font-black uppercase mt-1 tracking-wider leading-none">Audio Mentor</span>
                </button>

                {/* 1. MIC SWITCH */}
                <button 
                  onClick={handleToggleMic}
                  className={`h-11 px-4 rounded-xl flex flex-col items-center justify-center transition-all min-w-[70px] ${
                    isMicOn 
                      ? 'bg-[#1e1e24] text-white hover:bg-[#2e2e36] border border-white/5' 
                      : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20'
                  }`}
                  title={isMicOn ? "Silenciar mi micrófono" : "Activar mi micrófono"}
                >
                  {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  <span className="text-[8px] font-black uppercase mt-1 tracking-wider leading-none">Micrófono</span>
                </button>

                {/* 2. CAMERA SWITCH */}
                <button 
                  onClick={toggleStudentCamera}
                  className={`h-11 px-4 rounded-xl flex flex-col items-center justify-center transition-all min-w-[70px] ${
                    isStudentCameraOn 
                      ? 'bg-[#1e1e24] text-white hover:bg-[#2e2e36] border border-white/5' 
                      : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20'
                  }`}
                  title={isStudentCameraOn ? "Apagar mi cámara" : "Encender mi cámara"}
                >
                  {isStudentCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  <span className="text-[8px] font-black uppercase mt-1 tracking-wider leading-none">Cámara</span>
                </button>

                {/* 3. SCREEN SHARE */}
                <button 
                  onClick={handleToggleScreenShare}
                  className={`h-11 px-4 rounded-xl flex flex-col items-center justify-center transition-all min-w-[70px] ${
                    isScreenSharing 
                      ? 'bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e]' 
                      : 'bg-[#1e1e24] text-[#22c55e] hover:bg-[#2a2a30] border border-white/5'
                  }`}
                  title={isScreenSharing ? "Detener presentación" : "Compartir mi pantalla"}
                >
                  <Laptop className="h-4 w-4" />
                  <span className="text-[8px] font-black uppercase mt-1 tracking-wider leading-none">Compartir</span>
                </button>

                {/* 4. RAISE HAND */}
                <button 
                  onClick={toggleRaiseHand}
                  className={`h-11 px-4 rounded-xl flex flex-col items-center justify-center transition-all min-w-[70px] ${
                    handRaised 
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black' 
                      : 'bg-[#1e1e24] text-amber-400 hover:bg-[#2e2e36] border border-white/5'
                  }`}
                  title={handRaised ? "Bajar mi mano" : "Pedir palabra (Levantar Mano)"}
                >
                  <Hand className="h-4 w-4" />
                  <span className="text-[8px] font-black uppercase mt-1 tracking-wider leading-none">Levantar Mano</span>
                </button>

                {/* 5. EMOJI REACTION SWITCH */}
                <div className="relative">
                  <button 
                    onClick={() => setShowReactionsPopover(!showReactionsPopover)}
                    className={`h-11 px-4 rounded-xl flex flex-col items-center justify-center transition-all min-w-[70px] ${
                      showReactionsPopover ? 'bg-primary text-slate-950' : 'bg-[#1e1e24] text-white hover:bg-[#2e2e36] border border-white/5'
                    }`}
                    title="Enviar reacción emoji"
                  >
                    <Smile className="h-4 w-4" />
                    <span className="text-[8px] font-black uppercase mt-1 tracking-wider leading-none">Reacciones</span>
                  </button>

                  {/* Reaction Popover Overlay */}
                  <AnimatePresence>
                    {showReactionsPopover && (
                      <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: -10 }}
                        exit={{ opacity: 0, y: 15 }}
                        className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-[#2a2a30] border border-white/10 rounded-2xl p-2.5 flex items-center gap-2 shadow-2xl z-50 shrink-0"
                      >
                        {Object.entries(emojiLabels).map(([type, char]) => (
                          <button 
                            key={type}
                            onClick={() => {
                              sendReaction(type as any)
                              setShowReactionsPopover(false)
                            }}
                            className="h-10 w-10 text-xl hover:bg-white/10 active:scale-90 rounded-full flex items-center justify-center transition-transform"
                          >
                            {char}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 6. LEAVE CALL BUTTON (Red Phone hangup) */}
                <Link href="/dashboard/affiliate/academy">
                  <button 
                    onClick={() => {
                      try {
                        if (studentStream) studentStream.getTracks().forEach(t => t.stop());
                      } catch (e) {
                        console.error("Error stopping media tracks:", e);
                      }
                      toast({ title: "Saliste de la capacitación en vivo" })
                    }}
                    className="h-11 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center gap-2 font-black transition-all shadow-xl shadow-red-600/30 border border-red-400/30 active:scale-95"
                    title="Colgar y salir de la clase"
                  >
                    <PhoneOff className="h-4 w-4 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider">COLGAR</span>
                  </button>
                </Link>

              </div>

              {/* Right panel togglers: Info, Members, Chat, Files, Fullscreen */}
              <div className="flex items-center gap-2.5 order-3 md:order-3">
                
                {/* Fullscreen Button */}
                <button 
                  onClick={toggleFullscreen} 
                  className="h-10 w-10 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors border border-white/5"
                  title="Pantalla completa"
                >
                  <Maximize className="h-4.5 w-4.5" />
                </button>

                <span className="h-6 w-px bg-white/10 mx-1" />

                {/* Info Button */}
                <button 
                  onClick={() => setActiveRightPanel(activeRightPanel === 'info' ? null : 'info')}
                  className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors border border-white/5 ${
                    activeRightPanel === 'info' ? 'text-primary bg-white/5 border-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Detalles de reunión"
                >
                  <Info className="h-4.5 w-4.5" />
                </button>

                {/* Members Button */}
                <button 
                  onClick={() => setActiveRightPanel(activeRightPanel === 'members' ? null : 'members')}
                  className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors relative border border-white/5 ${
                    activeRightPanel === 'members' ? 'text-primary bg-white/5 border-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Participantes"
                >
                  <Users className="h-4.5 w-4.5" />
                  <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-primary text-[8px] font-black text-slate-950 flex items-center justify-center">
                    {participants.length + (user ? 2 : 1)}
                  </span>
                </button>

                {/* Chat Button */}
                <button 
                  onClick={() => setActiveRightPanel(activeRightPanel === 'chat' ? null : 'chat')}
                  className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors relative border border-white/5 ${
                    activeRightPanel === 'chat' ? 'text-primary bg-white/5 border-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Chatear con el grupo"
                >
                  <MessageSquare className="h-4.5 w-4.5" />
                  {chatMessages.length > 0 && activeRightPanel !== 'chat' && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse border-2 border-[#111113]" />
                  )}
                </button>

                {/* Files Button */}
                <button 
                  onClick={() => setActiveRightPanel(activeRightPanel === 'files' ? null : 'files')}
                  className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors relative border border-white/5 ${
                    activeRightPanel === 'files' ? 'text-primary bg-white/5 border-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Materiales de clase"
                >
                  <Paperclip className="h-4.5 w-4.5" />
                </button>

              </div>

            </div>

          </motion.div>
        )}
      </AnimatePresence>
    )}

        {/* CONDITION 3: ENDED SCREEN */}
        {activeLive?.status === 'Ended' && (
          <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center space-y-6 max-w-md mx-auto relative z-10">
            <div className="h-16 w-16 bg-slate-900 border border-white/10 text-slate-400 rounded-2xl flex items-center justify-center shadow-xl">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">SALA DE CAPACITACIÓN CERRADA</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Esta clase en vivo ha finalizado con éxito. La grabación se guardará y publicará en la sección de lecciones dentro de unas horas.
              </p>
            </div>
            <Link href="/dashboard/affiliate/academy">
              <Button className="h-12 px-6 bg-white hover:bg-slate-100 text-slate-950 font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl transition-all">
                VOLVER AL CURSO
              </Button>
            </Link>
          </div>
        )}

      </div>
    </DashboardShell>
  )
}
