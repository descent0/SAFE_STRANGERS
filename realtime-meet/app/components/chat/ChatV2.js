'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

import { getSocketInstance } from '../../services/socketManager'
import { initializeMedia, getLocalStream, stopMedia } from '../../services/mediaManager'
import { useMatchUser } from '../../hooks/useMatchUser'
import { useChatMessaging } from '../../hooks/useChatSession'
import { useWebRTC } from '../../hooks/useWebRTC2'
import VideoPanel from '../VideoPanel'
import ChatPanel from '../ChatPanel'
import CallControls from '../CallControls'
import { CONNECTION_STATES } from '../../const/socket'
import { DEFAULT_CHAT_MODE } from '../../const/commonConst'

export function ChatContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const sessionId = searchParams.get('sessionId')
    const chatMode = searchParams.get('mode') || DEFAULT_CHAT_MODE

    const [isAudioMuted, setIsAudioMuted] = useState(false)
    const [isVideoOff, setIsVideoOff] = useState(false)
    const [reactions, setReactions] = useState([])
    const [currentMessage, setCurrentMessage] = useState('')
    const [isMediaReady, setIsMediaReady] = useState(false)

    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)
    const typingTimeoutRef = useRef(null)

    const {
        connectionStatus,
        partner,
        queuePosition,
        joinAnonymousChat,
        skipPartner,
        leaveChat,
    } = useMatchUser(sessionId, chatMode)

    const isMatched = connectionStatus === CONNECTION_STATES.MATCHED

    const {
        messages,
        isPartnerTyping,
        sendMessage,
        sendTyping,
    } = useChatMessaging(sessionId, partner)

    const {
        remoteStream,
        connectionStatus: rtcStatus,
        createPeerConnection,
        removePeer,
    } = useWebRTC()

    useEffect(() => {
        if (chatMode === 'video' || chatMode === 'voice') {
            initializeMedia()
                .then((stream) => {
                    if (stream && localVideoRef.current) {
                        localVideoRef.current.srcObject = stream
                    }
                    setIsMediaReady(!!stream)
                })
                .catch((err) => {
                    console.error('Media permission denied or unavailable:', err)
                    setIsMediaReady(false)
                })
        }

        return () => {
            stopMedia()
            setIsMediaReady(false)
        }
    }, [chatMode])

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

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream
        }
    }, [remoteStream])

    useEffect(() => {
        if (!sessionId) {
            router.push('/')
            return
        }

        joinAnonymousChat()

        window.addReaction = (emoji) => {
            const reactionId = Date.now()
            setReactions(prev => [
                ...prev,
                {
                    id: reactionId,
                    emoji,
                    left: Math.random() * 56 + 20,
                    top: Math.random() * 28 + 52,
                    drift: Math.random() * 20 - 10,
                },
            ])

            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== reactionId))
            }, 3000)
        }

        return () => {
            delete window.addReaction
            clearTimeout(typingTimeoutRef.current)
        }
    }, [sessionId, router, joinAnonymousChat])

    useEffect(() => () => {
        clearTimeout(typingTimeoutRef.current)
    }, [])

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

    const handleMessageChange = (event) => {
        const value = event.target.value
        setCurrentMessage(value)

        clearTimeout(typingTimeoutRef.current)

        if (!value.trim()) {
            sendTyping(false)
            return
        }

        sendTyping(true)
        typingTimeoutRef.current = setTimeout(() => {
            sendTyping(false)
        }, 1000)
    }

    const handleSendMessage = () => {
        const text = currentMessage.trim()
        if (!text) return

        sendMessage(text)
        setCurrentMessage('')
        sendTyping(false)
        clearTimeout(typingTimeoutRef.current)
    }

    const handleReactionEmit = (emoji) => {
        const socketInstance = getSocketInstance()
        if (!socketInstance?.connected || !partner?.id) return

        socketInstance.emit('send-reaction', { to: partner.id, emoji })
        window.addReaction?.(emoji)
    }

    if (!sessionId) return null
    
    return (
        <div className="relative h-screen flex flex-row  gap-4  bg-slate-900/80 overflow-hidden p-5  text-white">

                <div className="min-w-0 flex flex-[2] flex-col   rounded-[1.75rem] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_42%),linear-gradient(180deg,_rgba(15,23,42,0.92),_rgba(2,6,23,0.98))] ">
                 
                        <VideoPanel
                            mode={chatMode}
                            isMatched={isMatched}
                            connectionStatus={connectionStatus}
                            rtcStatus={rtcStatus}
                            localVideoRef={localVideoRef}
                            remoteVideoRef={remoteVideoRef}
                            remoteStream={remoteStream}
                            isVideoOff={isVideoOff}
                        />


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
                    
             
                </div>

                <div className="min-w-0 flex-1  rounded-[1.75rem] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_42%),linear-gradient(180deg,_rgba(15,23,42,0.92),_rgba(2,6,23,0.98))]">
                    <div className="relative flex min-h-[30rem] h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/55 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                        <ChatPanel
                            partner={partner}
                            sessionId={sessionId}
                            isConnected={isMatched}
                            messages={messages}
                            currentMessage={currentMessage}
                            onChangeMessage={handleMessageChange}
                            onSendMessage={handleSendMessage}
                            onQuickReaction={handleReactionEmit}
                            isPartnerTyping={isPartnerTyping}
                            connectionStatus={connectionStatus}
                        />
                    </div>
                </div>
            </div>

        
    )
}
