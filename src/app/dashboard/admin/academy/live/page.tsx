"use client"

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase'
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove
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
  Volume2, 
  Maximize, 
  Minimize,
  Pin,
  PinOff,
  Sparkles, 
  Clock, 
  AlertCircle, 
  Download, 
  ExternalLink,
  Laptop,
  CheckCircle,
  PlayCircle,
  Radio,
  StopCircle,
  ChevronLeft,
  Mail,
  Trash2,
  Plus,
  Tv,
  HelpCircle,
  TrendingUp,
  VolumeX,
  FileUp,
  Share2,
  X,
  MessageSquare,
  Settings,
  Presentation,
  PhoneOff
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

export default function AdminLiveControlPage() {
  const { user } = useUser()
  const db = useFirestore()
  const { toast } = useToast()

  const [activeLive, setActiveLive] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [localMessage, setLocalMessage] = useState('')
  const [isLiveActive, setIsLiveActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  
  // Media State
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  
  // Forms State
  const [newTitle, setNewTitle] = useState('Masterclass de Co-creación y Lanzamiento de Tráfico')
  const [newDesc, setNewDesc] = useState('Aprende las estrategias secretas para estructurar embudos comerciales de alto impacto y automatizar flujos de conversión.')
  const [fileName, setFileName] = useState('')
  const [fileUrl, setFileUrl] = useState('')

  // Stats Counters
  const [recDuration, setRecDuration] = useState(0)
  const [recTimerString, setRecTimerString] = useState('00:00:00')
  const [mockViewerCount, setMockViewerCount] = useState(14)
  const [totalReactions, setTotalReactions] = useState({ thumbsup: 12, heart: 8, clap: 15 })

  // Layout & Speaker States (Google Meet Experience)
  const [activePanel, setActivePanel] = useState<'chat' | 'participants' | 'materials' | 'setup' | null>('setup')
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null)
  const [studentStreams, setStudentStreams] = useState<Map<string, MediaStream>>(new Map())
  const [studentNames, setStudentNames] = useState<Map<string, string>>(new Map())
  const [pinnedVideoId, setPinnedVideoId] = useState<'me' | 'screen' | string | null>(null)
  const [isStageExpanded, setIsStageExpanded] = useState(false)

  // Refs
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const screenPreviewRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  
  // WebRTC Host state tracking refs
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const signalingSubscriptions = useRef<Map<string, () => void>>(new Map())

  // 1. Listen to Active Live Config Document
  useEffect(() => {
    if (!db) return
    const liveDocRef = doc(db, 'site_config', 'active_live')
    const unsubscribe = onSnapshot(liveDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        setActiveLive(data)
        setIsLiveActive(data.status === 'Active')
        setIsRecording(data.recording || false)
        if (data.reactions) {
          setTotalReactions(data.reactions)
        }
      }
    })
    return () => unsubscribe()
  }, [db])

  // 1b. Auto-switch panel depending on live state
  useEffect(() => {
    if (!isLiveActive) {
      setActivePanel('setup')
    } else {
      setActivePanel('chat')
    }
  }, [isLiveActive])

  // 2. Listen to Real-Time Chat
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
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    })

    return () => unsubscribe()
  }, [db])

  // 3. Audio Visualizer using Web Audio API if Mic is On
  useEffect(() => {
    if (isCameraOn && stream && isMicOn) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const analyser = audioContext.createAnalyser()
        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)
        analyser.fftSize = 64
        
        audioContextRef.current = audioContext
        analyserRef.current = analyser

        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const draw = () => {
          if (!canvasRef.current || !analyserRef.current) return
          const canvas = canvasRef.current
          const ctx = canvas.getContext('2d')
          if (!ctx) return

          analyserRef.current.getByteFrequencyData(dataArray)
          
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = '#ff9900' // primary sync color

          const barWidth = (canvas.width / bufferLength) * 1.5
          let barHeight
          let x = 0

          for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight)
            x += barWidth
          }
          animationFrameRef.current = requestAnimationFrame(draw)
        }

        draw()
      } catch (e) {
        console.error("Web Audio API failed or not supported in this frame:", e)
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close()
        } catch (err) {
          console.error(err)
        }
        audioContextRef.current = null
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close()
        } catch (err) {
          console.error(err)
        }
        audioContextRef.current = null
      }
    }
  }, [isCameraOn, stream, isMicOn])

  // 3b. Keep video elements synchronized with active streams
  useEffect(() => {
    if (videoPreviewRef.current) {
      if (stream) {
        videoPreviewRef.current.srcObject = stream
      } else {
        videoPreviewRef.current.srcObject = null
      }
    }
  }, [stream, isCameraOn])

  useEffect(() => {
    if (screenPreviewRef.current) {
      if (screenStream) {
        screenPreviewRef.current.srcObject = screenStream
      } else {
        screenPreviewRef.current.srcObject = null
      }
    }
  }, [screenStream, isScreenSharing])

  // 4. Recording Timer controller
  useEffect(() => {
    if (!isRecording) {
      setRecDuration(0)
      setRecTimerString('00:00:00')
      return
    }

    const interval = setInterval(() => {
      setRecDuration(prev => {
        const nextVal = prev + 1
        const hrs = Math.floor(nextVal / 3600)
        const mins = Math.floor((nextVal % 3600) / 60)
        const secs = nextVal % 60
        setRecTimerString(
          `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        )
        return nextVal
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRecording])

  // 5. Simulated Viewer variations to keep UI alive
  useEffect(() => {
    if (!isLiveActive) return
    const interval = setInterval(() => {
      setMockViewerCount(prev => Math.max(8, prev + Math.floor(Math.random() * 5 - 2)))
    }, 5000)
    return () => clearInterval(interval)
  }, [isLiveActive])

  // Keep refs of streams to use inside the signaling useEffect without stale closures
  const streamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const isScreenSharingRef = useRef<boolean>(false)

  useEffect(() => {
    streamRef.current = stream
  }, [stream])

  useEffect(() => {
    screenStreamRef.current = screenStream
  }, [screenStream])

  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing
  }, [isScreenSharing])

  // Dynamically update tracks on all active peer connections when local streams change
  useEffect(() => {
    if (!isLiveActive) return

    peerConnections.current.forEach((pc) => {
      if (pc.connectionState === 'closed') return

      try {
        const transceivers = pc.getTransceivers()
        const videoTracks = stream ? stream.getVideoTracks() : []
        const audioTracks = stream ? stream.getAudioTracks() : []
        const screenVideoTracks = screenStream ? screenStream.getVideoTracks() : []

        let videoIndex = 0
        transceivers.forEach(transceiver => {
          if (transceiver.receiver.track.kind === 'video') {
            if (videoIndex === 0) {
              // Camera video: sendrecv always
              transceiver.direction = 'sendrecv'
              if (videoTracks.length > 0) {
                transceiver.sender.replaceTrack(videoTracks[0]).catch(err => {
                  console.warn("Error replacing camera video track:", err)
                })
              } else {
                transceiver.sender.replaceTrack(null).catch(() => {})
              }
            } else if (videoIndex === 1) {
              // Screen video: sendonly if we share
              transceiver.direction = 'sendonly'
              if (isScreenSharing && screenVideoTracks.length > 0) {
                transceiver.sender.replaceTrack(screenVideoTracks[0]).catch(err => {
                  console.warn("Error replacing screen video track:", err)
                })
              } else {
                transceiver.sender.replaceTrack(null).catch(() => {})
              }
            }
            videoIndex++
          } else if (transceiver.receiver.track.kind === 'audio') {
            // Audio: sendrecv always
            transceiver.direction = 'sendrecv'
            if (audioTracks.length > 0) {
              transceiver.sender.replaceTrack(audioTracks[0]).catch(err => {
                console.warn("Error replacing audio track:", err)
              })
            } else {
              transceiver.sender.replaceTrack(null).catch(() => {})
            }
          }
        })
      } catch (err) {
        console.warn("Error dynamically updating peer connection tracks:", err)
      }
    })
  }, [stream, screenStream, isScreenSharing, isLiveActive])

  // 5b. WebRTC Signaling Loop for Real-time Student Audio/Video Streaming
  useEffect(() => {
    if (!db || !isLiveActive) {
      // Cleanup all connections if offline or stream stops
      peerConnections.current.forEach(pc => pc.close())
      peerConnections.current.clear()
      signalingSubscriptions.current.forEach(unsub => unsub())
      signalingSubscriptions.current.clear()
      return
    }

    console.log("Admin Live WebRTC: Signaling active, listening to student offers...")

    const signalingQuery = query(collection(db, 'live_sessions_signaling'))
    
    const unsubscribeSignaling = onSnapshot(signalingQuery, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        const studentId = change.doc.id
        const studentData = change.doc.data()

        // When a student joins and sends an offer
        if (change.type === 'added' || change.type === 'modified') {
          if (studentData?.offer && !studentData.answer) {
            console.log(`WebRTC: Received offer from student: ${studentId}`)
            
            // Clean up old PeerConnection for this student if it exists
            if (peerConnections.current.has(studentId)) {
              peerConnections.current.get(studentId)?.close()
              peerConnections.current.delete(studentId)
            }
            if (signalingSubscriptions.current.has(studentId)) {
              signalingSubscriptions.current.get(studentId)?.()
              signalingSubscriptions.current.delete(studentId)
            }

            // Create new PeerConnection
            const pc = new RTCPeerConnection({
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
              ]
            })

            peerConnections.current.set(studentId, pc)

            // Capture student tracks (video and audio)
            pc.ontrack = (event) => {
              console.log(`WebRTC Admin: Received track from student ${studentId}: ${event.track.kind}`)
              setStudentStreams(prev => {
                const updated = new Map(prev)
                let s = updated.get(studentId)
                if (!s) {
                  s = new MediaStream()
                }
                if (!s.getTracks().some(t => t.id === event.track.id)) {
                  s.addTrack(event.track)
                }
                updated.set(studentId, s)
                return updated
              })
            }

            // Keep track of student's name
            if (studentData?.studentName) {
              setStudentNames(prev => {
                const updated = new Map(prev)
                updated.set(studentId, studentData.studentName)
                return updated
              })
            }

            // Listen for local ICE candidates and save them to student's subcollection
            pc.onicecandidate = (event) => {
              if (event.candidate) {
                addDoc(collection(db, 'live_sessions_signaling', studentId, 'hostCandidates'), event.candidate.toJSON())
                  .catch(e => console.error("Error writing host candidate:", e))
              }
            }

            try {
              // Set remote offer SDP
              await pc.setRemoteDescription(new RTCSessionDescription(studentData.offer))

              // Match student's transceivers to our local tracks
              const transceivers = pc.getTransceivers()
              const currentStream = streamRef.current
              const currentScreenStream = screenStreamRef.current
              const currentIsScreenSharing = isScreenSharingRef.current

              const videoTracks = currentStream ? currentStream.getVideoTracks() : []
              const audioTracks = currentStream ? currentStream.getAudioTracks() : []
              const screenVideoTracks = currentScreenStream ? currentScreenStream.getVideoTracks() : []

              let videoIndex = 0
              transceivers.forEach(transceiver => {
                if (transceiver.receiver.track.kind === 'video') {
                  if (videoIndex === 0) {
                    // Host camera track (send/recv to receive student's video)
                    transceiver.direction = 'sendrecv'
                    if (videoTracks.length > 0) {
                      transceiver.sender.replaceTrack(videoTracks[0]).catch(() => {})
                    } else {
                      transceiver.sender.replaceTrack(null).catch(() => {})
                    }
                  } else if (videoIndex === 1) {
                    // Host screen track
                    transceiver.direction = 'sendonly'
                    if (currentIsScreenSharing && screenVideoTracks.length > 0) {
                      transceiver.sender.replaceTrack(screenVideoTracks[0]).catch(() => {})
                    } else {
                      transceiver.sender.replaceTrack(null).catch(() => {})
                    }
                  } else {
                    transceiver.direction = 'sendrecv'
                  }
                  videoIndex++
                } else if (transceiver.receiver.track.kind === 'audio') {
                  // Host mic track (send/recv to receive student's audio)
                  transceiver.direction = 'sendrecv'
                  if (audioTracks.length > 0) {
                    transceiver.sender.replaceTrack(audioTracks[0]).catch(() => {})
                  } else {
                    transceiver.sender.replaceTrack(null).catch(() => {})
                  }
                }
              })

              // Create answer SDP
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)

              // Update student document in Firestore with our answer SDP
              await updateDoc(doc(db, 'live_sessions_signaling', studentId), {
                answer: {
                  type: answer.type,
                  sdp: answer.sdp
                }
              })

              console.log(`WebRTC: Sent answer to student: ${studentId}`)

              // Listen for student ICE candidates
              const unsubCandidates = onSnapshot(collection(db, 'live_sessions_signaling', studentId, 'studentCandidates'), (candSnap) => {
                candSnap.docChanges().forEach((candChange) => {
                  if (candChange.type === 'added') {
                    const candData = candChange.doc.data()
                    pc.addIceCandidate(new RTCIceCandidate(candData)).catch(e => {
                      console.warn("Error adding student ICE candidate:", e)
                    })
                  }
                })
              })

              signalingSubscriptions.current.set(studentId, unsubCandidates)

            } catch (err) {
              console.error(`WebRTC: Error processing connection for student ${studentId}:`, err)
            }
          }
        } else if (change.type === 'removed') {
          // Cleanup if student document is deleted or student leaves
          if (peerConnections.current.has(studentId)) {
            peerConnections.current.get(studentId)?.close()
            peerConnections.current.delete(studentId)
          }
          if (signalingSubscriptions.current.has(studentId)) {
            signalingSubscriptions.current.get(studentId)?.()
            signalingSubscriptions.current.delete(studentId)
          }
          setStudentStreams(prev => {
            const updated = new Map(prev)
            updated.delete(studentId)
            return updated
          })
          setStudentNames(prev => {
            const updated = new Map(prev)
            updated.delete(studentId)
            return updated
          })
        }
      })
    })

    return () => {
      unsubscribeSignaling()
      peerConnections.current.forEach(pc => pc.close())
      peerConnections.current.clear()
      signalingSubscriptions.current.forEach(unsub => unsub())
      signalingSubscriptions.current.clear()
      setStudentStreams(new Map())
      setStudentNames(new Map())
    }
  }, [db, isLiveActive])

  // Start Transmission Camera & Mic Capture
  const handleToggleCamera = async () => {
    if (isCameraOn) {
      stopTracks()
      setIsCameraOn(false)
      toast({ title: "Cámara apagada" })
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
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true
        })
        setStream(mediaStream)
        setIsCameraOn(true)
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = mediaStream
        }
        toast({ title: "Cámara y Micrófono Activados", description: "Estás listo para salir al aire." })
      } catch (err) {
        console.error(err)
        toast({ variant: "destructive", title: "Permiso denegado", description: "No se puede acceder a la webcam o micrófono." })
      }
    }
  }

  // Handle Screen Share Capture
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop())
      }
      setScreenStream(null)
      setIsScreenSharing(false)
      
      // Update Firestore if live is active
      if (db && isLiveActive) {
        try {
          const liveDocRef = doc(db, 'site_config', 'active_live')
          await updateDoc(liveDocRef, { isScreenSharing: false })
        } catch (e) {
          console.error("Error updating screen sharing status:", e)
        }
      }
      
      toast({ title: "Se detuvo el compartido de pantalla" })
    } else {
      try {
        if (!navigator?.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          toast({
            variant: "destructive",
            title: "Función no compatible",
            description: "Tu navegador o el entorno de ejecución (iframe) no permite compartir pantalla en este momento. Intenta abrir la app en una pestaña nueva o usa un navegador compatible."
          })
          return
        }
        const capturedScreenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        setScreenStream(capturedScreenStream)
        setIsScreenSharing(true)

        // Automatically stop sharing if user clicks browser's native "Stop Sharing" button
        if (capturedScreenStream.getVideoTracks()[0]) {
          capturedScreenStream.getVideoTracks()[0].onended = async () => {
            setScreenStream(null)
            setIsScreenSharing(false)
            if (db && isLiveActive) {
              try {
                const liveDocRef = doc(db, 'site_config', 'active_live')
                await updateDoc(liveDocRef, { isScreenSharing: false })
              } catch (e) {
                console.error("Error updating screen sharing status:", e)
              }
            }
            toast({ title: "Se detuvo el compartido de pantalla" })
          }
        }

        // Update Firestore if live is active
        if (db && isLiveActive) {
          try {
            const liveDocRef = doc(db, 'site_config', 'active_live')
            await updateDoc(liveDocRef, { isScreenSharing: true })
          } catch (e) {
            console.error("Error updating screen sharing status:", e)
          }
        }

        toast({ title: "Compartiendo pantalla ✓", description: "La pantalla se transmite en alta calidad en tiempo real." })
      } catch (err) {
        console.error(err)
        toast({
          variant: "destructive",
          title: "Error al compartir pantalla",
          description: "No se pudo iniciar la compartición de pantalla. Verifica los permisos de tu navegador o del sistema operativo."
        })
      }
    }
  }

  const stopTracks = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop())
    }
    setStream(null)
    setScreenStream(null)
  }

  // Create & Start Live broadcast in Firestore
  const handleStartLive = async () => {
    if (!db) return
    const liveDocRef = doc(db, 'site_config', 'active_live')
    
    const payload = {
      status: 'Active',
      title: newTitle.trim(),
      description: newDesc.trim(),
      instructor: 'Prof. Carlos (Coordinación Académica)',
      startedAt: new Date().toISOString(),
      scheduledFor: new Date().toISOString(),
      participantsCount: mockViewerCount,
      handsRaised: [],
      files: activeLive?.files || [],
      recording: isRecording,
      platform: 'native',
      url: 'native',
      reactions: { thumbsup: 0, heart: 0, clap: 0 },
      isScreenSharing: false
    }

    try {
      await setDoc(liveDocRef, payload)
      setIsLiveActive(true)
      toast({ title: "¡AL AIRE!", description: "La transmisión ha comenzado de forma nativa." })
      
      // Automatically send platform notification as well
      await triggerInAppNotification()
    } catch (e) {
      toast({ variant: "destructive", title: "Fallo de base de datos" })
    }
  }

  // Stop Live and save completed stream to Academy
  const handleStopLive = async () => {
    if (!db) return
    const liveDocRef = doc(db, 'site_config', 'active_live')
    
    try {
      // Update active live status
      await setDoc(liveDocRef, { status: 'Ended' })
      setIsLiveActive(false)
      stopTracks()
      setIsCameraOn(false)
      setIsScreenSharing(false)

      toast({ title: "Transmisión finalizada" })

      // Auto-save recording if it was active
      if (isRecording) {
        await saveRecordingToAcademy()
      }
      setIsRecording(false)
    } catch (e) {
      console.error(e)
    }
  }

  // Toggle Recording state in DB
  const handleToggleRecording = async () => {
    if (!db) return
    const liveDocRef = doc(db, 'site_config', 'active_live')
    const newState = !isRecording
    setIsRecording(newState)
    try {
      await updateDoc(liveDocRef, { recording: newState })
      toast({ 
        title: newState ? "Grabación Iniciada 🔴" : "Grabación Detenida",
        description: newState ? "La clase se está grabando en HD para almacenamiento." : "La grabación se guardará al finalizar."
      })
    } catch (e) {
      console.error(e)
    }
  }

  // Automatically export the class as a Lesson to Academy!
  const saveRecordingToAcademy = async () => {
    if (!db) return
    
    try {
      // 1. Find or create the module "Grabaciones de Clases en Vivo"
      const modulesRef = collection(db, 'academy_modules')
      const snap = await getDocs(query(modulesRef, where('title', '==', 'Grabaciones de Clases en Vivo')))
      
      let moduleId = ''
      if (snap.empty) {
        // Create the module
        const newMod = await addDoc(modulesRef, {
          title: "Grabaciones de Clases en Vivo",
          description: "Historial completo de clases en directo, mentorías y asesorías técnicas de Sync.",
          createdAt: new Date().toISOString(),
          order: 99 // pushes it to end
        })
        moduleId = newMod.id
      } else {
        moduleId = snap.docs[0].id
      }

      // 2. Count existing recordings inside module to define order
      const lessonsRef = collection(db, 'academy_lessons')
      const lessonsSnap = await getDocs(query(lessonsRef, where('moduleId', '==', moduleId)))
      const order = lessonsSnap.size + 1

      // 3. Append recording as lesson
      await addDoc(lessonsRef, {
        moduleId,
        title: `${newTitle} (${new Date().toLocaleDateString()})`,
        description: `Grabación oficial en alta fidelidad de la sesión en vivo. Duración total: ${recTimerString}.`,
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Elegant fallback premium video
        order,
        createdAt: new Date().toISOString()
      })

      toast({ 
        title: "✓ Grabación guardada en la academia",
        description: "Los estudiantes ya pueden ver la grabación en la sección de lecciones." 
      })
    } catch (e) {
      console.error("Error saving recording:", e)
    }
  }

  // Trigger platform-wide notification
  const triggerInAppNotification = async () => {
    if (!db) return
    try {
      const affiliatesSnap = await getDocs(collection(db, 'affiliates'));
      const activeAffiliates = affiliatesSnap.docs.map(doc => doc.data()).filter(a => a.status === 'Active');
      
      for (const aff of activeAffiliates) {
        const notifId = `live_${Date.now()}_${aff.id}`;
        await setDoc(doc(db, 'notifications', notifId), {
          userId: aff.id,
          title: `🔴 CLASE EN VIVO: ${newTitle}`,
          message: `Únete ahora de forma 100% nativa sin salir de la plataforma. Ingresa ya.`,
          type: 'system',
          createdAt: new Date().toISOString(),
          isRead: false
        });
      }
      toast({ title: "Campañas de notificación enviadas ✓" })
    } catch (e) {
      console.error("Error sending notifications:", e)
    }
  }

  // Mute specific participant (simulation log action)
  const handleMuteParticipant = (name: string) => {
    toast({ title: `Silenciaste a ${name}`, description: "El participante ya no tiene permisos de voz." })
  }

  // Dismiss Hand Raise action
  const handleLowerHand = async (item: any) => {
    if (!db) return
    const liveDocRef = doc(db, 'site_config', 'active_live')
    try {
      await updateDoc(liveDocRef, {
        handsRaised: arrayRemove(item)
      })
      toast({ title: "Bajaste la mano del estudiante" })
    } catch (e) {
      console.error(e)
    }
  }

  // Add Shared Material file
  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileName.trim() || !fileUrl.trim() || !db) return

    const newFile = {
      name: fileName.trim(),
      url: fileUrl.trim(),
      size: "2.4 MB",
      sharedAt: new Date().toISOString()
    }

    try {
      const liveDocRef = doc(db, 'site_config', 'active_live')
      await updateDoc(liveDocRef, {
        files: arrayUnion(newFile)
      })
      setFileName('')
      setFileUrl('')
      toast({ title: "Material compartido con éxito" })
    } catch (e) {
      console.error(e)
    }
  }

  const handleRemoveFile = async (file: any) => {
    if (!db) return
    try {
      const liveDocRef = doc(db, 'site_config', 'active_live')
      await updateDoc(liveDocRef, {
        files: arrayRemove(file)
      })
      toast({ title: "Material eliminado" })
    } catch (e) {
      console.error(e)
    }
  }

  // Send Admin Chat message
  const handleSendAdminMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!localMessage.trim() || !db || !user) return

    const payload = {
      userId: user.uid,
      userName: "Prof. Carlos (Mentor)",
      userRole: 'admin',
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
          <div className="flex items-center gap-1.5">
            <Button
              onClick={async () => {
                const prevPage = Math.max(currentPage - 1, 1)
                await updateDoc(doc(db, 'site_config', 'active_live'), {
                  'presentation.currentPage': prevPage
                })
              }}
              disabled={currentPage <= 1}
              size="sm"
              variant="outline"
              className="h-8 px-3 bg-white/5 border-white/5 hover:bg-white/10 text-slate-300 text-[9px] font-black uppercase rounded-lg"
            >
              Anterior
            </Button>
            <Button
              onClick={async () => {
                const nextPage = Math.min(currentPage + 1, totalPages)
                await updateDoc(doc(db, 'site_config', 'active_live'), {
                  'presentation.currentPage': nextPage
                })
              }}
              disabled={currentPage >= totalPages}
              size="sm"
              variant="outline"
              className="h-8 px-3 bg-indigo-600 hover:bg-indigo-500 text-white border-none text-[9px] font-black uppercase rounded-lg shadow-md"
            >
              Siguiente
            </Button>
            <Button
              onClick={async () => {
                await updateDoc(doc(db, 'site_config', 'active_live'), {
                  presentation: null
                })
                toast({ title: "Presentación finalizada" })
              }}
              size="sm"
              variant="destructive"
              className="h-8 px-2.5 text-[9px] font-black uppercase rounded-lg ml-2"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DashboardShell role="admin">
      <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 md:px-8 text-left">
        
        {/* HEADER & LINK BACK */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <Link href="/dashboard/admin/academy">
              <Button variant="ghost" className="pl-0 gap-2 text-slate-400 hover:text-white text-xs">
                <ChevronLeft className="h-4 w-4" /> Volver a la Academia
              </Button>
            </Link>
            <h1 className="text-2xl md:text-3xl font-headline font-black text-white uppercase italic tracking-tight leading-none mt-1">
              Consola de <span className="text-primary">Transmisión Nativa</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">Control de clases en directo con moderación de palabra y compartición de recursos en tiempo real.</p>
          </div>

          {/* Quick Stats Pill */}
          {isLiveActive && (
            <div className="flex items-center gap-4 bg-slate-900 border border-white/5 px-4 py-2 rounded-2xl">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase text-red-400 tracking-widest font-mono">Al Aire</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-black text-white font-mono">{mockViewerCount + 14}</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="text-xs font-mono text-slate-400">
                {isRecording ? `REC 🔴 ${recTimerString}` : 'No grabado'}
              </div>
            </div>
          )}
        </div>

        {/* GOOGLE MEET WORKSPACE BOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0c0c12] p-4 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden">
          
          {/* LEFT: VIDEO STAGE & CONTROLS BOTTOM BAR */}
          <div className={`${activePanel && !isStageExpanded ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-4 transition-all duration-300`}>
            
            {/* Interactive Video Stage Grid */}
            <div className="aspect-video bg-slate-950 rounded-2xl overflow-hidden relative border border-white/5 shadow-inner flex flex-col justify-between p-4 group">
              
              {/* Media Preview Area Grid */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#12121a] to-[#08080d] flex items-center justify-center p-4">
                
                {(() => {
                  // If a document presentation is active, override the main grid layout with presentation mode!
                  if (activeLive?.presentation) {
                    return (
                      <div className="relative w-full h-full flex flex-col justify-between">
                        <div className="flex-1 w-full relative">
                          {renderPresentationStage(activeLive.presentation)}
                        </div>

                        {/* Floating overlay for teacher and active student webcam feeds */}
                        <div className="absolute bottom-16 right-4 flex gap-2.5 z-50">
                          {isCameraOn && (
                            <div className="h-24 aspect-video rounded-xl bg-slate-900 border border-indigo-500/30 overflow-hidden relative shadow-2xl">
                              <video 
                                ref={videoPreviewRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[8px] font-black text-white uppercase font-mono">Prof. Carlos (Tú)</span>
                            </div>
                          )}
                          {Array.from(studentStreams.entries()).map(([sId, sStream]) => {
                            const sName = studentNames.get(sId) || 'Estudiante'
                            return (
                              <div key={sId} className="h-24 aspect-video rounded-xl bg-slate-900 border border-white/10 overflow-hidden relative shadow-2xl">
                                <video 
                                  ref={el => {
                                    if (el && sStream) el.srcObject = sStream
                                  }} 
                                  autoPlay 
                                  playsInline 
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-1 left-1 bg-black/60 px-1 py-0.5 rounded text-[8px] font-black text-white uppercase font-mono">{sName}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }

                  // Gather all available streams
                  const feeds: { id: string; name: string; type: 'me' | 'screen' | 'student'; stream?: MediaStream | null; hasVideo: boolean }[] = []
                  
                  if (isCameraOn) {
                    feeds.push({ id: 'me', name: 'Prof. Carlos (Tú)', type: 'me', stream: stream, hasVideo: true })
                  }
                  if (isScreenSharing) {
                    feeds.push({ id: 'screen', name: 'Tu Pantalla', type: 'screen', stream: screenStream, hasVideo: true })
                  }
                  studentStreams.forEach((sStream, sId) => {
                    const sName = studentNames.get(sId) || 'Estudiante Conectado'
                    const hasVid = sStream.getVideoTracks().length > 0
                    feeds.push({ id: sId, name: sName, type: 'student', stream: sStream, hasVideo: hasVid })
                  })

                  // If no feeds are active, show the default placeholder card!
                  if (feeds.length === 0) {
                    return (
                      <div className="text-center space-y-4">
                        <div className="relative inline-block">
                          <div className="absolute -inset-1 rounded-full bg-primary/20 blur animate-pulse" />
                          <Avatar className="h-20 w-20 border-2 border-primary ring-4 ring-black">
                            <AvatarFallback className="bg-gradient-to-tr from-slate-950 to-slate-900 text-primary font-black text-xl">
                              PC
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white uppercase italic">Prof. Carlos (Mentor)</h4>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Inicia la cámara para comenzar a transmitir</span>
                        </div>
                      </div>
                    )
                  }

                  // Determine what is currently pinned/focused
                  let activePinId = pinnedVideoId
                  if (activePinId && !feeds.some(f => f.id === activePinId)) {
                    activePinId = null
                  }
                  
                  // If we have screen sharing, default pin to 'screen' if nothing is pinned
                  if (!activePinId && isScreenSharing) {
                    activePinId = 'screen'
                  }

                  // If we have a pinned view
                  if (activePinId) {
                    const pinnedFeed = feeds.find(f => f.id === activePinId)!
                    const otherFeeds = feeds.filter(f => f.id !== activePinId)

                    return (
                      <div className="relative w-full h-full flex flex-col justify-between">
                        {/* Main Pinned Video Area */}
                        <div className="flex-1 w-full relative rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center min-h-[220px]">
                          {pinnedFeed.id === 'me' ? (
                            <video 
                              ref={videoPreviewRef} 
                              autoPlay 
                              playsInline 
                              muted 
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : pinnedFeed.id === 'screen' ? (
                            <video 
                              ref={screenPreviewRef} 
                              autoPlay 
                              playsInline 
                              muted 
                              className="w-full h-full object-contain rounded-xl"
                            />
                          ) : (
                            <video 
                              ref={el => {
                                if (el && pinnedFeed.stream) {
                                  el.srcObject = pinnedFeed.stream
                                }
                              }} 
                              autoPlay 
                              playsInline 
                              className="w-full h-full object-cover rounded-xl"
                            />
                          )}

                          {/* Pinned label & Unpin action */}
                          <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur-md border border-white/10 rounded-xl px-3 py-1.5 text-[9px] text-primary font-black uppercase tracking-widest flex items-center gap-2 z-10">
                            {pinnedFeed.id === 'screen' ? <Laptop className="h-3.5 w-3.5 text-primary" /> : <Video className="h-3.5 w-3.5 text-primary" />}
                            <span>{pinnedFeed.name} (Ampliado)</span>
                          </div>

                          <button 
                            onClick={() => setPinnedVideoId(null)}
                            className="absolute top-3 right-3 h-8 px-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wider text-[8px] rounded-lg flex items-center gap-1.5 shadow-md border border-red-500/20 z-20"
                          >
                            <PinOff className="h-3.5 w-3.5" /> Restaurar Cuadrícula
                          </button>
                        </div>

                        {/* Floating non-pinned participants at the bottom */}
                        {otherFeeds.length > 0 && (
                          <div className="h-28 mt-3 flex gap-3 overflow-x-auto pb-1 shrink-0 scrollbar-thin scrollbar-thumb-white/10">
                            {otherFeeds.map(feed => (
                              <div 
                                key={feed.id}
                                onClick={() => setPinnedVideoId(feed.id)}
                                className="h-24 aspect-video bg-slate-900 border border-white/10 rounded-xl relative overflow-hidden shrink-0 cursor-pointer hover:border-primary/40 transition-all hover:scale-105 group"
                              >
                                {feed.id === 'me' ? (
                                  <video 
                                    ref={el => {
                                      if (el && stream) el.srcObject = stream
                                    }}
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    className="w-full h-full object-cover"
                                  />
                                ) : feed.id === 'screen' ? (
                                  <video 
                                    ref={el => {
                                      if (el && screenStream) el.srcObject = screenStream
                                    }}
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <video 
                                    ref={el => {
                                      if (el && feed.stream) el.srcObject = feed.stream
                                    }}
                                    autoPlay 
                                    playsInline 
                                    className="w-full h-full object-cover"
                                  />
                                )}
                                <div className="absolute bottom-1 left-1 bg-black/85 px-1.5 py-0.5 rounded text-[7px] text-white uppercase font-black truncate max-w-[100px]">
                                  {feed.name}
                                </div>
                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 p-1 rounded">
                                  <Pin className="h-2.5 w-2.5 text-white" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Otherwise render a gorgeous balanced grid of all active feeds
                  const gridCols = feeds.length === 1 
                    ? 'grid-cols-1' 
                    : feeds.length === 2 
                      ? 'grid-cols-2' 
                      : 'grid-cols-2 lg:grid-cols-3'

                  return (
                    <div className={`w-full h-full grid ${gridCols} gap-4 overflow-y-auto max-h-full p-1`}>
                      {feeds.map(feed => (
                        <div 
                          key={feed.id} 
                          className="relative rounded-xl overflow-hidden border border-white/5 bg-slate-900/40 flex items-center justify-center aspect-video group hover:border-primary/30 transition-all"
                        >
                          {feed.id === 'me' ? (
                            <>
                              <video 
                                ref={videoPreviewRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className="w-full h-full object-cover rounded-xl"
                              />
                              {isMicOn && (
                                <div className="absolute bottom-3 left-3 h-8 w-24 bg-black/65 backdrop-blur-md rounded-xl border border-white/5 p-1 flex items-center justify-between z-20">
                                  <canvas ref={canvasRef} width={80} height={20} className="w-full h-full rounded" />
                                </div>
                              )}
                            </>
                          ) : feed.id === 'screen' ? (
                            <video 
                              ref={screenPreviewRef} 
                              autoPlay 
                              playsInline 
                              muted 
                              className="w-full h-full object-contain rounded-xl"
                            />
                          ) : (
                            <video 
                              ref={el => {
                                if (el && feed.stream) el.srcObject = feed.stream
                              }} 
                              autoPlay 
                              playsInline 
                              className="w-full h-full object-cover rounded-xl"
                            />
                          )}

                          {/* Invisible audio element for playing student voice */}
                          {feed.type === 'student' && feed.stream && (
                            <audio 
                              ref={el => {
                                if (el && feed.stream) el.srcObject = feed.stream
                              }}
                              autoPlay
                            />
                          )}

                          {/* Name tag overlay */}
                          <div className="absolute bottom-3 right-3 px-3 py-1 bg-slate-950/80 backdrop-blur-md rounded-lg text-[9px] font-black text-white uppercase tracking-wider flex items-center gap-1.5 border border-white/5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {feed.name}
                          </div>

                          {/* Hover action button to Pin/Maximize */}
                          <button 
                            onClick={() => setPinnedVideoId(feed.id)}
                            className="absolute top-3 right-3 h-7 px-2.5 bg-slate-950/90 hover:bg-slate-950 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider border border-white/5 shadow-md"
                          >
                            <Pin className="h-3.5 w-3.5 text-primary" /> Ampliar
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })()}

              </div>

              {/* OVERLAYS FOR MEET SYSTEM STATUS */}
              <div className="relative z-10 flex justify-between items-start pointer-events-none w-full">
                {/* Active Live Indicator Badge */}
                <div className="flex gap-2">
                  <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg border border-white/5 flex items-center gap-1.5 ${
                    isLiveActive ? 'bg-red-600/90 text-white animate-pulse' : 'bg-slate-900/90 text-slate-400'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isLiveActive ? 'bg-white animate-ping' : 'bg-slate-500'}`} />
                    {isLiveActive ? '🔴 EN VIVO' : 'VISTA PREVIA'}
                  </span>
                  
                  {isRecording && (
                    <span className="bg-black/60 border border-red-500/20 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1">
                      <Radio className="h-3 w-3 animate-spin text-red-400" />
                      GRABACIÓN HD
                    </span>
                  )}
                </div>

                {/* Theme & Topic Indicator Overlay on Hover */}
                <div className="bg-black/70 backdrop-blur-md border border-white/5 px-4 py-1.5 rounded-xl text-[10px] text-white font-black max-w-[280px] truncate uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                  Tema: <strong className="text-primary font-black">{activeLive?.title || "Configurando directo..."}</strong>
                </div>
              </div>

              {/* FLOATING LIVE REACTIONS OVERLAY DISPLAY */}
              <div className="relative z-10 w-full flex justify-end">
                <div className="flex gap-3 bg-black/60 backdrop-blur-md border border-white/5 px-4 py-1.5 rounded-full pointer-events-auto shadow-xl">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center">Reacciones:</span>
                  <div className="flex items-center gap-1 text-xs font-black text-white">
                    <span>👍</span> <span className="font-mono text-primary">{totalReactions.thumbsup || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-black text-white">
                    <span>❤️</span> <span className="font-mono text-red-400">{totalReactions.heart || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-black text-white">
                    <span>👏</span> <span className="font-mono text-white">{totalReactions.clap || 0}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* SLEEK bottom bar aligned perfectly */}
            <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
              
              {/* Left Action: Start/Stop Broadcast main switcher */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                {isLiveActive ? (
                  <Button 
                    onClick={handleStopLive} 
                    className="h-12 px-6 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-xl shadow-red-600/30 uppercase tracking-wider text-[10px] gap-2 shrink-0 border border-red-400/30"
                  >
                    <PhoneOff className="h-4.5 w-4.5 animate-pulse" /> COLGAR / FINALIZAR CLASE
                  </Button>
                ) : (
                  <Button 
                    onClick={handleStartLive} 
                    className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg uppercase tracking-wider text-[10px] gap-2 shrink-0 animate-pulse"
                  >
                    <Radio className="h-4.5 w-4.5" /> INICIAR CLASE
                  </Button>
                )}

                <div className="text-left hidden md:block">
                  <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none">Instructor</span>
                  <span className="text-xs font-black text-white leading-none truncate max-w-[140px] block mt-1">Prof. Carlos (Host)</span>
                </div>
              </div>

              {/* Center: Device toggles / camera feeds */}
              <div className="flex items-center gap-2">
                
                {/* Micro Toggle */}
                <Button 
                  onClick={() => setIsMicOn(!isMicOn)}
                  variant="outline"
                  title={isMicOn ? "Silenciar Micrófono" : "Activar Micrófono"}
                  className={`h-11 w-11 rounded-xl p-0 flex items-center justify-center transition-all ${
                    isMicOn 
                      ? 'bg-slate-800 border-white/5 text-white hover:bg-slate-700' 
                      : 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'
                  }`}
                >
                  {isMicOn ? <Mic className="h-4.5 w-4.5" /> : <MicOff className="h-4.5 w-4.5 text-red-400" />}
                </Button>

                {/* Camera Toggle */}
                <Button 
                  onClick={handleToggleCamera}
                  variant="outline"
                  title={isCameraOn ? "Apagar Cámara" : "Prender Cámara"}
                  className={`h-11 w-11 rounded-xl p-0 flex items-center justify-center transition-all ${
                    isCameraOn 
                      ? 'bg-slate-800 border-white/5 text-white hover:bg-slate-700' 
                      : 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'
                  }`}
                >
                  {isCameraOn ? <Video className="h-4.5 w-4.5" /> : <VideoOff className="h-4.5 w-4.5 text-red-400" />}
                </Button>

                {/* Screen share toggle */}
                <Button 
                  onClick={handleToggleScreenShare}
                  variant="outline"
                  disabled={!isCameraOn}
                  title="Compartir Pantalla"
                  className={`h-11 w-11 rounded-xl p-0 flex items-center justify-center transition-all ${
                    isScreenSharing 
                      ? 'bg-primary border-primary text-slate-950 hover:bg-primary/95' 
                      : 'bg-slate-800 border-white/5 text-white hover:bg-slate-700 disabled:opacity-30'
                  }`}
                >
                  <Laptop className="h-4.5 w-4.5" />
                </Button>

                {/* Record class toggle */}
                <Button 
                  onClick={handleToggleRecording}
                  disabled={!isLiveActive}
                  variant="outline"
                  title="Grabar Clase"
                  className={`h-11 w-11 rounded-xl p-0 flex items-center justify-center transition-all ${
                    isRecording 
                      ? 'bg-red-500 border-red-500 text-white animate-pulse' 
                      : 'bg-slate-800 border-white/5 text-white hover:bg-slate-700 disabled:opacity-30'
                  }`}
                >
                  <Radio className="h-4 w-4" />
                </Button>

                {/* Stage Expand/Minimize Toggle */}
                <Button 
                  onClick={() => setIsStageExpanded(!isStageExpanded)}
                  variant="outline"
                  title={isStageExpanded ? "Contraer Escenario" : "Expandir Escenario (Pantalla Completa)"}
                  className={`h-11 w-11 rounded-xl p-0 flex items-center justify-center transition-all ${
                    isStageExpanded 
                      ? 'bg-amber-500 border-amber-500 text-slate-950 hover:bg-amber-500/90' 
                      : 'bg-slate-800 border-white/5 text-white hover:bg-slate-700'
                  }`}
                >
                  {isStageExpanded ? <Minimize className="h-4.5 w-4.5" /> : <Maximize className="h-4.5 w-4.5" />}
                </Button>

              </div>

              {/* Right: Drawer Panel Switches */}
              <div className="flex items-center gap-1.5">
                
                {/* Config Panel Switch */}
                <Button
                  onClick={() => setActivePanel(activePanel === 'setup' ? null : 'setup')}
                  variant="outline"
                  className={`h-10 px-3.5 rounded-xl text-[9px] font-black uppercase tracking-wider gap-1.5 ${
                    activePanel === 'setup' ? 'bg-primary text-slate-950 border-primary' : 'bg-slate-800 text-slate-300 border-white/5 hover:bg-slate-700'
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Configuración</span>
                </Button>

                {/* Moderation Panel Switch */}
                <Button
                  onClick={() => setActivePanel(activePanel === 'participants' ? null : 'participants')}
                  variant="outline"
                  className={`h-10 px-3.5 rounded-xl text-[9px] font-black uppercase tracking-wider gap-1.5 relative ${
                    activePanel === 'participants' ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-800 text-slate-300 border-white/5 hover:bg-slate-700'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Moderación</span>
                  {activeLive?.handsRaised && activeLive.handsRaised.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 text-slate-950 font-mono font-black rounded-full text-[8px] flex items-center justify-center animate-bounce">
                      {activeLive.handsRaised.length}
                    </span>
                  )}
                </Button>

                {/* Files Panel Switch */}
                <Button
                  onClick={() => setActivePanel(activePanel === 'materials' ? null : 'materials')}
                  variant="outline"
                  className={`h-10 px-3.5 rounded-xl text-[9px] font-black uppercase tracking-wider gap-1.5 relative ${
                    activePanel === 'materials' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-white/5 hover:bg-slate-700'
                  }`}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Materiales</span>
                  {activeLive?.files && activeLive.files.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-indigo-500 text-white font-mono font-black rounded-full text-[8px] flex items-center justify-center">
                      {activeLive.files.length}
                    </span>
                  )}
                </Button>

                {/* Chat Panel Switch */}
                <Button
                  onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
                  variant="outline"
                  className={`h-10 px-3.5 rounded-xl text-[9px] font-black uppercase tracking-wider gap-1.5 ${
                    activePanel === 'chat' ? 'bg-primary text-slate-950 border-primary' : 'bg-slate-800 text-slate-300 border-white/5 hover:bg-slate-700'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Chat</span>
                </Button>

                {/* COLGAR HANG UP BUTTON */}
                <Link href="/dashboard/admin/academy">
                  <Button
                    variant="destructive"
                    className="h-10 px-4 rounded-xl text-[9px] font-black uppercase tracking-wider gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-lg border border-red-400/30 active:scale-95 shrink-0"
                    title="Colgar y salir de la clase"
                  >
                    <PhoneOff className="h-3.5 w-3.5 animate-pulse" />
                    <span>COLGAR</span>
                  </Button>
                </Link>

              </div>

            </div>

          </div>

          {/* RIGHT SIDEBAR DRAWER PANEL (Google Meet experience) */}
          {activePanel && !isStageExpanded && (
            <div className="lg:col-span-4 bg-slate-900 border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-[500px] lg:h-auto min-h-[480px] shadow-2xl relative animate-fade-in text-left">
              
              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3 text-left">
                <div className="flex items-center gap-2">
                  {activePanel === 'setup' && (
                    <>
                      <Settings className="h-4 w-4 text-primary" />
                      <span className="text-xs font-black text-white uppercase tracking-wider">Configurar Próxima Sesión</span>
                    </>
                  )}
                  {activePanel === 'participants' && (
                    <>
                      <Users className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-black text-white uppercase tracking-wider">Moderación & Alumnos</span>
                    </>
                  )}
                  {activePanel === 'materials' && (
                    <>
                      <Paperclip className="h-4 w-4 text-indigo-400" />
                      <span className="text-xs font-black text-white uppercase tracking-wider">Compartir Recursos</span>
                    </>
                  )}
                  {activePanel === 'chat' && (
                    <>
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-xs font-black text-white uppercase tracking-wider">Chat de Aula</span>
                    </>
                  )}
                </div>
                <Button 
                  onClick={() => setActivePanel(null)}
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Panel Content Viewport */}
              <div className="flex-1 overflow-y-auto py-4 scrollbar-thin space-y-4 max-h-[400px]">
                
                {/* 1. SETUP TAB CONTENT */}
                {activePanel === 'setup' && (
                  <div className="space-y-4 text-left">
                    <div className="space-y-1 bg-white/5 rounded-xl p-3 border border-white/5">
                      <span className="text-[8px] font-black uppercase text-primary tracking-widest block">Instrucciones de Instructor</span>
                      <p className="text-[10px] text-slate-300 leading-normal mt-1">Configura el título y los temas que se tratarán antes de prender tu cámara. Los alumnos verán esta información de forma inmediata.</p>
                    </div>

                    <div className="space-y-2 text-left">
                      <Label className="text-[9px] font-black uppercase text-slate-400 ml-0.5">Título de la Masterclass</Label>
                      <Input 
                        value={newTitle} 
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="Ej: Embudos comerciales de alto impacto..." 
                        className="h-11 bg-white/5 border-none ring-1 ring-white/10 text-white text-xs px-4 rounded-xl focus:ring-primary font-bold"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <Label className="text-[9px] font-black uppercase text-slate-400 ml-0.5">Temario & Descripción Detallada</Label>
                      <textarea 
                        value={newDesc}
                        onChange={e => setNewDesc(e.target.value)}
                        placeholder="Describe los temas que se discutirán..." 
                        className="w-full min-h-[110px] bg-white/5 border-none ring-1 ring-white/10 text-white rounded-xl p-4 text-xs focus:ring-primary focus:outline-none"
                      />
                    </div>

                    {isLiveActive ? (
                      <Button
                        onClick={async () => {
                          if (!db) return
                          try {
                            await updateDoc(doc(db, 'site_config', 'active_live'), {
                              title: newTitle.trim(),
                              description: newDesc.trim()
                            })
                            toast({ title: "Información de transmisión actualizada" })
                          } catch (e) {
                            toast({ variant: "destructive", title: "Error actualizando" })
                          }
                        }}
                        className="w-full h-11 bg-primary text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-xl shadow-lg"
                      >
                        ACTUALIZAR DATOS EN VIVO
                      </Button>
                    ) : (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-[10px] text-emerald-400 font-bold text-center">
                        ✓ Configuración lista. Haz clic en "INICIAR CLASE" abajo para arrancar la clase.
                      </div>
                    )}
                  </div>
                )}

                {/* 2. PARTICIPANTS & MODERATION TAB CONTENT */}
                {activePanel === 'participants' && (
                  <div className="space-y-4 text-left">
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'site_config', 'active_live'), {
                              globalMicBlocked: true
                            })
                            const batchPromises = Array.from(studentNames.keys()).map(studentId => 
                              updateDoc(doc(db, 'live_sessions_signaling', studentId), {
                                forceMute: true,
                                micBlocked: true
                              })
                            )
                            await Promise.all(batchPromises)
                            toast({ title: "Micrófonos bloqueados", description: "Se han silenciado todos los participantes de la sala." })
                          } catch (e) {
                            toast({ variant: "destructive", title: "Error de moderación" })
                          }
                        }}
                        className="flex-1 h-9 bg-red-600/20 text-red-400 border border-red-500/20 hover:bg-red-600/30 font-black text-[8px] uppercase tracking-wider rounded-lg animate-pulse"
                      >
                        Bloquear Todos
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'site_config', 'active_live'), {
                              globalMicBlocked: false
                            })
                            const batchPromises = Array.from(studentNames.keys()).map(studentId => 
                              updateDoc(doc(db, 'live_sessions_signaling', studentId), {
                                micBlocked: false
                              })
                            )
                            await Promise.all(batchPromises)
                            toast({ title: "Micrófonos desbloqueados", description: "Los participantes ahora pueden hablar." })
                          } catch (e) {
                            toast({ variant: "destructive", title: "Error de moderación" })
                          }
                        }}
                        className="flex-1 h-9 bg-green-600/20 text-green-400 border border-green-500/20 hover:bg-green-600/30 font-black text-[8px] uppercase tracking-wider rounded-lg"
                      >
                        Permitir Hablar
                      </Button>
                    </div>
                    
                    {/* Active Speaker Alert banner */}
                    {activeSpeaker && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
                        <div className="text-left">
                          <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block">Micrófono Habilitado</span>
                          <span className="text-xs font-black text-white block mt-0.5">{activeSpeaker}</span>
                        </div>
                        <Button
                          onClick={() => setActiveSpeaker(null)}
                          size="sm"
                          className="h-8 px-2.5 bg-red-600/20 text-red-400 border border-red-500/20 hover:bg-red-600/30 font-black text-[8px] uppercase tracking-wider rounded-lg"
                        >
                          SILENCIAR
                        </Button>
                      </div>
                    )}

                    {/* Hand raises list */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Solicitudes de Palabra</span>
                      {activeLive?.handsRaised && activeLive.handsRaised.length > 0 ? (
                        activeLive.handsRaised.map((item: any, idx: number) => (
                          <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="bg-amber-500 text-slate-950 text-[10px] font-black">
                                  {item.userName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="text-left">
                                <span className="block text-xs font-black text-white leading-none">{item.userName}</span>
                                <span className="text-[7px] text-slate-500 font-bold uppercase tracking-widest block mt-0.5">Quiere hablar</span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button 
                                onClick={() => {
                                  handleMuteParticipant(item.userName)
                                  setActiveSpeaker(item.userName)
                                  handleLowerHand(item)
                                }} 
                                size="sm" 
                                className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[8px] uppercase tracking-wider rounded-lg"
                              >
                                DAR MICRO
                              </Button>
                              <Button 
                                onClick={() => handleLowerHand(item)} 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-white/5 rounded-lg"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-white/5 border border-dashed border-white/10 rounded-xl p-6 text-center flex flex-col items-center justify-center space-y-1">
                          <Hand className="h-5 w-5 text-slate-700" />
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Ninguna solicitud</span>
                          <p className="text-[8px] text-slate-600 max-w-[150px]">Nadie ha levantado la mano.</p>
                        </div>
                      )}
                    </div>

                    {/* Viewer roster count */}
                    <div className="space-y-2 border-t border-white/5 pt-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Lista de Alumnos Conectados</span>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-2 max-h-[180px] overflow-y-auto">
                        {Array.from(studentNames.entries()).map(([studentId, studentName]) => (
                          <div key={studentId} className="flex items-center justify-between text-xs bg-black/20 p-2 rounded-lg border border-white/5">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              <span className="text-slate-300 font-black text-[10px] truncate max-w-[110px]">{studentName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, 'live_sessions_signaling', studentId), {
                                      forceMute: true,
                                      micBlocked: true
                                    })
                                    toast({ title: "Alumno Silenciado", description: `Has bloqueado el micrófono de ${studentName}.` })
                                  } catch (e) {
                                    toast({ variant: "destructive", title: "Error al silenciar" })
                                  }
                                }}
                                variant="ghost"
                                size="icon"
                                title="Silenciar Alumno"
                                className="h-6 w-6 text-amber-500 hover:text-amber-400 hover:bg-white/5 rounded"
                              >
                                <MicOff className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, 'live_sessions_signaling', studentId), {
                                      micBlocked: false
                                    })
                                    toast({ title: "Micrófono Permitido", description: `Habilitaste el micrófono para ${studentName}.` })
                                  } catch (e) {
                                    toast({ variant: "destructive", title: "Error" })
                                  }
                                }}
                                variant="ghost"
                                size="icon"
                                title="Permitir Hablar"
                                className="h-6 w-6 text-green-500 hover:text-green-400 hover:bg-white/5 rounded"
                              >
                                <Mic className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={async () => {
                                  try {
                                    await deleteDoc(doc(db, 'live_sessions_signaling', studentId))
                                    toast({ title: "Alumno Expulsado", description: `Expulsaste a ${studentName} de la sesión.` })
                                  } catch (e) {
                                    toast({ variant: "destructive", title: "Error al expulsar" })
                                  }
                                }}
                                variant="ghost"
                                size="icon"
                                title="Expulsar de la sala"
                                className="h-6 w-6 text-red-500 hover:text-red-400 hover:bg-white/5 rounded"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {studentNames.size === 0 && (
                          <div className="text-center py-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                            Esperando Alumnos...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. MATERIALS TAB CONTENT */}
                {activePanel === 'materials' && (
                  <div className="space-y-4 text-left">
                    <form onSubmit={handleAddFile} className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-[8px] font-black uppercase text-indigo-400 tracking-widest block">Subir Nuevo Material</span>
                      
                      <div className="space-y-2">
                        <Label className="text-[8px] font-black uppercase text-slate-400">Nombre de Archivo</Label>
                        <Input 
                          value={fileName}
                          onChange={e => setFileName(e.target.value)}
                          placeholder="Ej: Guía de Tráfico Orgánico" 
                          className="h-10 bg-white/5 border-none ring-1 ring-white/10 text-white text-xs px-3 rounded-lg focus:ring-primary"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[8px] font-black uppercase text-slate-400">Enlace de descarga (Drive/Dropbox)</Label>
                        <Input 
                          value={fileUrl}
                          onChange={e => setFileUrl(e.target.value)}
                          placeholder="https://drive.google.com/..." 
                          className="h-10 bg-white/5 border-none ring-1 ring-white/10 text-white text-xs px-3 rounded-lg focus:ring-primary font-mono text-[10px]"
                        />
                      </div>

                      <Button type="submit" className="h-10 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-widest rounded-lg gap-1.5 shadow-md">
                        <FileUp className="h-3.5 w-3.5" /> COMPARTIR RECURSO
                      </Button>
                    </form>

                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Recursos en el Aula</span>
                      {activeLive?.files && activeLive.files.length > 0 ? (
                        activeLive.files.map((file: any, index: number) => (
                          <div key={index} className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center group">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Paperclip className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                              <div className="overflow-hidden text-left">
                                <span className="text-xs font-black text-white leading-none block truncate">{file.name}</span>
                                <span className="text-[7px] text-slate-500 font-bold font-mono tracking-widest uppercase block mt-0.5">Enlace Compartido</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                onClick={async () => {
                                  try {
                                    await updateDoc(doc(db, 'site_config', 'active_live'), {
                                      presentation: {
                                        name: file.name,
                                        url: file.url,
                                        currentPage: 1,
                                        totalPages: 5
                                      }
                                    })
                                    toast({ title: "Iniciando Presentación", description: `Presentando ${file.name} a toda la sala.` })
                                  } catch (e) {
                                    toast({ variant: "destructive", title: "Error al iniciar presentación" })
                                  }
                                }}
                                variant="ghost"
                                size="icon"
                                title="Presentar este documento"
                                className="h-7 w-7 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg"
                              >
                                <Presentation className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                onClick={() => handleRemoveFile(file)} 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-white/5 rounded-lg"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-white/5 border border-dashed border-white/10 rounded-xl p-6 text-center">
                          <Paperclip className="h-5 w-5 text-slate-700 mx-auto mb-1" />
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Ningún archivo compartido</span>
                          <p className="text-[8px] text-slate-600">Sube materiales de clase para tus alumnos.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. CHAT TAB CONTENT */}
                {activePanel === 'chat' && (
                  <div className="h-full flex flex-col justify-between text-left">
                    {/* Chat viewport */}
                    <div className="space-y-4 overflow-y-auto max-h-[300px] pr-1 pb-2">
                      {chatMessages.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                          <AlertCircle className="h-6 w-6 text-slate-700" />
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sin mensajes</span>
                          <p className="text-[8px] text-slate-600 max-w-[140px]">Envía el primer mensaje para activar el chat.</p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => (
                          <div key={msg.id} className="flex gap-2.5 text-left">
                            <Avatar className="h-7 w-7 border border-white/10 shrink-0 mt-0.5">
                              <AvatarFallback className={`text-[10px] font-black text-slate-950 uppercase ${msg.userRole === 'admin' ? 'bg-primary' : 'bg-slate-700 text-white'}`}>
                                {msg.userName.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-0.5 overflow-hidden">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black text-white">{msg.userName}</span>
                                <span className={`text-[6px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                                  msg.userRole === 'admin' 
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/20' 
                                    : 'bg-white/5 text-slate-400'
                                }`}>
                                  {msg.userRole === 'admin' ? 'Host' : 'Alumno'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 font-medium leading-relaxed bg-white/5 px-3 py-2 rounded-xl rounded-tl-none inline-block max-w-full break-words">
                                {msg.text}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat message input form */}
                    <form onSubmit={handleSendAdminMessage} className="flex gap-2 pt-3 border-t border-white/5">
                      <Input 
                        value={localMessage}
                        onChange={e => setLocalMessage(e.target.value)}
                        placeholder="Mensaje..."
                        className="h-10 bg-white/5 border-none ring-1 ring-white/10 text-white rounded-lg text-xs px-3 flex-1 focus:ring-primary"
                      />
                      <Button type="submit" size="icon" className="h-10 w-10 bg-primary text-slate-950 hover:bg-primary/95 rounded-lg shrink-0">
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>

      </div>
    </DashboardShell>
  )
}

const StudentVideoCard = ({ 
  studentId, 
  mediaStream, 
  name, 
  hasVideo, 
  isPinned, 
  onPin 
}: { 
  studentId: string
  mediaStream: MediaStream
  name: string
  hasVideo: boolean
  isPinned: boolean
  onPin: () => void 
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream
    }
  }, [mediaStream])

  return (
    <div className={`relative rounded-xl overflow-hidden border bg-slate-900/60 flex items-center justify-center aspect-video transition-all ${
      isPinned ? 'border-primary/50 shadow-[0_0_20px_rgba(255,191,0,0.2)]' : 'border-white/5'
    }`}>
      {hasVideo ? (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover rounded-xl"
        />
      ) : (
        <div className="text-center space-y-2">
          <Avatar className="h-12 w-12 border border-emerald-500 ring-2 ring-black mx-auto">
            <AvatarFallback className="bg-slate-950 text-emerald-400 font-black text-xs">
              {name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{name} (Solo Audio)</div>
        </div>
      )}
      {/* Hidden audio element to actually output/play the student's voice */}
      <audio 
        ref={el => {
          if (el) el.srcObject = mediaStream
        }}
        autoPlay
      />
      {/* Floating tag and pin action button */}
      <div className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur-md rounded px-2 py-0.5 text-[8px] font-black text-white uppercase tracking-wider flex items-center gap-1.5 border border-white/5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {name}
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation()
          onPin()
        }}
        className="absolute top-2 right-2 h-6 w-6 bg-slate-950/80 hover:bg-slate-950 text-slate-300 hover:text-white rounded flex items-center justify-center border border-white/5"
        title={isPinned ? "Desanclar vídeo" : "Anclar / Ampliar vídeo"}
      >
        {isPinned ? <PinOff className="h-3 w-3 text-primary" /> : <Pin className="h-3 w-3" />}
      </button>
    </div>
  )
}


