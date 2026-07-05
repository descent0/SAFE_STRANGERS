'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// Services and Constants
import { connectSocket, disconnectSocket, getSocketInstance } from '../../services/socket/socketManager'

import { initializeMedia, getLocalStream, stopMedia } from '../../services/mediaManager'

// Custom Hooks
import { useMatchUser } from '../../hooks/useMatchUser'
import { useChatMessaging } from '../../hooks/useChatSession'
import { useWebRTC } from '../../hooks/useWebRTC2'

// Component Subsections
import MatchingQueue from '../MatchingQueue'
import VideoPanel from '../VideoPanel'
import ChatPanel from '../ChatPanel'
import CallControls from '../CallControls'
import { CONNECTION_STATES } from '../../const/socket'

export function ChatContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const sessionId = searchParams.get('sessionId')
  const chatMode = searchParams.get('mode') || DEFAULT_CHAT_MODE

  // UI States managed directly by the panel wrapper
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [reactions, setReactions] = useState([])

  // DOM Refs for media presentation
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  // 1. Core Socket connection handling matching & queue lifecycle
  const {
    connectionStatus,
    partner,
    queuePosition,
    joinAnonymousChat,
    skipPartner,
    leaveChat
  } = useMatchUser(sessionId, chatMode)

  // Derived Match Flags
  const isMatched = connectionStatus === CONNECTION_STATES.MATCHED

  // 2. Core WebRTC hook handling media tracks & signaling
  const {
    remoteStream,
    connectionStatus: rtcStatus,
    createPeerConnection,
    removePeer,
  } = useWebRTC()

  // new state
const [isMediaReady, setIsMediaReady] = useState(false)

// Effect #3
useEffect(() => {
  if (chatMode === 'video' || chatMode === 'voice') {
    initializeMedia().then((stream) => {
      if (stream && localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      setIsMediaReady(!!stream)   // 👈 yeh trigger karega effect #4 ko
    }).catch(err => {
      console.error("Media permission denied or unavailable:", err)
      setIsMediaReady(false)
    })
  }

  return () => {
    stopMedia()
    setIsMediaReady(false)
  }
}, [chatMode])

// Effect #4 — ab isMediaReady pe depend karta hai
useEffect(() => {
  if (
    isMatched &&
    partner?.id &&
    isMediaReady &&
    (chatMode === 'video' || chatMode === 'voice')
  ) {
    const localStream = getLocalStream()
    if (localStream) {
      createPeerConnection(partner.id, partner.isWebRTCInitator)
    }
  }
}, [isMatched, partner, chatMode, isMediaReady, createPeerConnection])

  // 5. Mount Remote WebRTC stream payload onto real video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // 6. Handle Global Socket initialization lifecycle
  useEffect(() => {
    if (!sessionId) {
      router.push('/')
      return
    }

    // Auto-trigger entry matching sequence upon landing
    // (kept as a harmless first attempt — useMatchUser now also auto-joins
    // once the socket actually reports 'connected', see FIX #4)
    joinAnonymousChat()

    // Setup global reaction bus listeners safely
    window.addReaction = (emoji) => {
      const reactionId = Date.now()
      setReactions(prev => [...prev, { id: reactionId, emoji }])
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== reactionId))
      }, 3000)
    }

  }, [sessionId, router])

  // Call Control Action Callbacks
  const handleToggleAudio = () => {
    const localStream = getLocalStream()
    const audioTrack = localStream?.getAudioTracks()?.[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsAudioMuted(!audioTrack.enabled)
    }
  }

  const handleToggleVideo = () => {
    const localStream = getLocalStream()
    const videoTrack = localStream?.getVideoTracks()?.[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      setIsVideoOff(!videoTrack.enabled)
    }
  }

  const handleSkip = useCallback(() => {
    removePeer()
    skipPartner()
  }, [removePeer, skipPartner])

  const handleLeave = useCallback(() => {
    removePeer()
    stopMedia()
    leaveChat()
    router.push('/')
  }, [removePeer, leaveChat, router])

  const handleReactionEmit = (emoji) => {
    const socketInstance = getSocketInstance();
    if (!socketInstance?.connected || !partner?.id) return
    // Emit your socket packet to peer channel here
    socketInstance.emit('send-reaction', { to: partner.id, emoji })
    window.addReaction?.(emoji) // Trigger local float view instantly
  }

  // --- Render Conditional Guard Paths ---
  if (!sessionId) return null

  // Fallback to Queue Window View layout if looking for active connections
  if (!isMatched || connectionStatus === CONNECTION_STATES.JOINING) {
    return (
      <MatchingQueue
        queuePosition={queuePosition}
        connectionStatus={connectionStatus}
        onCancel={handleLeave}
        onFindNew={joinAnonymousChat}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden flex flex-col md:flex-row">

      {/* Floating Reactions overlay */}
      <div className="absolute inset-0 pointer-events-none z-30">
        {reactions.map(reaction => (
          <div
            key={reaction.id}
            className="absolute text-5xl animate-float"
            style={{
              left: `${Math.random() * 60 + 20}%`,
              top: `${Math.random() * 40 + 30}%`,
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      {/* Primary Video / Audio Screen Layout Block */}
      <VideoPanel
        mode={chatMode}
        connectionStatus={rtcStatus}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        remoteStream={remoteStream}
        isVideoOff={isVideoOff}
      />

      {/* Floating Panel Interaction Overlays */}
      <CallControls
        mode={chatMode}
        isMatched={isMatched}
        isAudioMuted={isAudioMuted}
        isVideoOff={isVideoOff}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onSkip={handleSkip}
        onLeave={handleLeave}
        onReaction={handleReactionEmit}
      />

      {/* Side Messaging Interface Block */}
      <ChatPanel
        partner={partner}
        sessionId={sessionId}
        isConnected={ isMatched}
      />

      {/* Animation Context Utilities Stylesheet injection */}
      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px) scale(0.6); opacity: 0; }
          15% { opacity: 1; transform: translateY(-20px) scale(1.2); }
          100% { transform: translateY(-140px) scale(0.8); opacity: 0; }
        }
        .animate-float {
          animation: float 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  )
}