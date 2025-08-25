'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAnonymousChat } from '../hooks/useAnonymousChat'
import { useWebRTC } from '../hooks/useWebRTC'
import MatchingQueue from '../components/MatchingQueue'

// Create a separate component that uses useSearchParams
function ChatContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('sessionId')
  // Use environment variable for default mode
  const mode = searchParams.get('mode') || process.env.NEXT_PUBLIC_CHAT_MODE || 'video'
  
  const [isMatched, setIsMatched] = useState(false)
  const [messages, setMessages] = useState([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [reactions, setReactions] = useState([])
  const [partnerSessionId, setPartnerSessionId] = useState(null)
  
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const chatContainerRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Move handlePartnerDisconnected definition above useWebRTC
  const handlePartnerDisconnected = useCallback(() => {
    console.log('[MATCHING] 💔 Partner disconnected - resetting match state')
    setIsMatched(false)
    setPartnerSessionId(null)
    setPartnerTyping(false)
    setMessages([])
    setReactions([])
    // Peer cleanup is handled inside useWebRTC
  }, [])

  const webRTCHandlers = useWebRTC(localVideoRef, handlePartnerDisconnected)
  const {
    localStream,
    remoteStreams,
    connectionStatus,
    toggleAudio,
    toggleVideo,
    initializeMedia,
    createPeerConnection,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    removePeer
  } = webRTCHandlers

  // Set up global functions for the anonymous chat hook
  useEffect(() => {
    window.setPartnerTyping = setPartnerTyping
    window.addReaction = (emoji) => {
      const reactionId = Date.now()
      setReactions(prev => [...prev, { id: reactionId, emoji }])
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== reactionId))
      }, 3000)
    }
    
    return () => {
      delete window.setPartnerTyping
      delete window.addReaction
    }
  }, [])

  const handleMessage = useCallback((message) => {
    console.log("message is being handled");
    setMessages(prev => [...prev, message])
  }, [])

  const handleMatchFound = useCallback(({ partnerId, partnerInterests, skipped }) => {
    console.log('[MATCHING] 🎯 Match found in chat page:', { partnerId, partnerInterests, skipped, mode })
    setPartnerSessionId(partnerId)
    setIsMatched(true)
    // Force UI update in case state is out of sync
    setTimeout(() => {
      console.log('[MATCHING] Forcing UI update after match found', { partnerId })
      setIsMatched(true)
      setPartnerSessionId(partnerId)
    }, 100)
    if (skipped) {
      console.log('[MATCHING] Partner skipped, clearing previous messages')
      setMessages([]) // Clear previous messages on skip
    }
  }, [mode])

  const {
    socket,
    isConnected,
    partner,
    queuePosition,
    joinAnonymousChat,
    sendMessage: sendAnonymousMessage,
    sendTyping,
    sendReaction,
    skipPartner,
    leaveChat
  } = useAnonymousChat(sessionId, mode, handleMatchFound, handlePartnerDisconnected, handleMessage)

  // Initialize media and join chat on component mount
  useEffect(() => {
    if (mode === 'video' || mode === 'voice') {
      console.log('[MEDIA] 🎥 Initializing media for mode:', mode)
      initializeMedia()
    }
  }, [mode, initializeMedia])

  // Separate effect for joining chat to avoid dependency loops
  useEffect(() => {
    if (isConnected && sessionId && !isMatched && connectionStatus !== 'queued' && connectionStatus !== 'joining') {
      // Get stored preferences from sessionStorage
      const interests = JSON.parse(sessionStorage.getItem('chatInterests') || '[]')
      const safeMode = sessionStorage.getItem('safeMode') === 'true'
      
      console.log('[MATCHING] 🚀 Joining anonymous chat with preferences:', { interests, mode, safeMode, sessionId })
      joinAnonymousChat(interests, safeMode)
    }
  }, [isConnected, sessionId, isMatched, connectionStatus])

  // Initialize WebRTC connection when match is found and socket is available
  useEffect(() => {
    if (isMatched && partnerSessionId && socket && (mode === 'video' || mode === 'voice')) {
      console.log('[WEBRTC] Checking if localStream is ready for peer connection:', { localStreamReady: !!localStream, partnerSessionId })
      if (localStream) {
        console.log('[WEBRTC] 🔗 Initializing WebRTC connection with partner:', partnerSessionId)
        createPeerConnection(partnerSessionId, socket, true)
      } else {
        console.log('[WEBRTC] ⏳ WebRTC delayed - waiting for local stream')
      }
    }
  }, [isMatched, partnerSessionId, socket, mode, localStream, createPeerConnection])

  // Handle WebRTC signaling through socket
  useEffect(() => {
    if (!socket) return

    socket.on('offer', ({ offer, from }) => {
      console.log('[WEBRTC] Received offer from:', from)
      handleOffer(offer, from, socket)
    })

    socket.on('answer', ({ answer, from }) => {
      console.log('[WEBRTC] Received answer from:', from)
      handleAnswer(answer, from)
    })

    socket.on('ice-candidate', ({ candidate, from }) => {
      console.log('[WEBRTC] Received ICE candidate from:', from)
      handleIceCandidate(candidate, from)
    })

    return () => {
      socket.off('offer')
      socket.off('answer')
      socket.off('ice-candidate')
    }
  }, [socket, handleOffer, handleAnswer, handleIceCandidate])

  // Handle remote video stream
  useEffect(() => {
    if (remoteStreams.size > 0 && remoteVideoRef.current) {
      const remoteStream = Array.from(remoteStreams.values())[0]
      console.log('[WEBRTC] Setting remote video stream:', remoteStream)
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStreams])

    // Handle local video stream
    useEffect(() => {
      if (localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        // Ensure video track is enabled
        const tracks = localStream.getVideoTracks();
        tracks.forEach(track => track.enabled = true);
      }
    }, [localStream]);
  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      console.log('[CHAT] Auto-scrolled chat to bottom')
    }
  }, [messages])

  const handleSendMessage = useCallback(() => {
    if (currentMessage.trim()) {
      console.log('[CHAT] Sending message:', currentMessage)
      const message = sendAnonymousMessage(currentMessage)
      if (message) {
        console.log('[CHAT] Message sent:', message)
        setMessages(prev => [...prev, message])
        setCurrentMessage('')
      } else {
        console.log('[CHAT] Message send failed')
      }
    }
  }, [currentMessage, sendAnonymousMessage])

  const handleTyping = useCallback((e) => {
    setCurrentMessage(e.target.value)
    console.log('[CHAT] Typing event:', e.target.value)
    if (!isTyping) {
      setIsTyping(true)
      sendTyping(true)
      console.log('[CHAT] Started typing')
    }
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false)
      setIsTyping(false)
      console.log('[CHAT] Stopped typing')
    }, 1000)
  }, [isTyping, sendTyping])

  const handleSkip = async () => {
  console.log('[MATCHING] 🔀 Skipping current partner');
  // Clean up WebRTC connections before skipping
  if (remoteStreams.size > 0) {
    await Promise.all(Array.from(remoteStreams.keys()).map(peerId => removePeer(peerId)));
  }
  // Clear current chat state
  setMessages([]);
  setReactions([]);
  setPartnerTyping(false);
  // Skip partner - let the server response handle isMatched state
  await skipPartner();
};

  const handleToggleAudio = () => {
    console.log('[MEDIA] Toggling audio. Current muted:', isAudioMuted)
    toggleAudio()
    setIsAudioMuted(prev => !prev)
  }

  const handleToggleVideo = () => {
    console.log('[MEDIA] Toggling video. Current video off:', isVideoOff)
    toggleVideo()
    setIsVideoOff(prev => !prev)
  }

  const handleReaction = (emoji) => {
    console.log('[CHAT] Sending reaction:', emoji)
    sendReaction(emoji)
    // Show local reaction immediately
    const reactionId = Date.now()
    setReactions(prev => [...prev, { id: reactionId, emoji }])
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reactionId))
    }, 3000)
  }

  const handleDisconnect = () => {
    console.log('[MATCHING] 🚪 Disconnecting and leaving chat')
    leaveChat()
    router.push('/')
  }

  const handleFindNewPartner = () => {
    console.log('[MATCHING] 🔍 Finding new partner after disconnect...')
    // Don't proceed if already in process or matched
    if (connectionStatus === 'joining' || connectionStatus === 'queued' || isMatched) {
      console.log('[MATCHING] ⚠️ Already finding partner or matched, ignoring request')
      return
    }
    // Clear current state
    setMessages([])
    setReactions([])
    setPartnerTyping(false)
    // Clean up WebRTC connections
    if (remoteStreams.size > 0) {
      Array.from(remoteStreams.keys()).forEach(peerId => {
        console.log('[WEBRTC] 🧹 Cleaning up peer connection before new search:', peerId)
        removePeer(peerId)
      })
    }
    // Rejoin the chat queue
    if (isConnected && sessionId) {
      const interests = JSON.parse(sessionStorage.getItem('chatInterests') || '[]')
      const safeMode = sessionStorage.getItem('safeMode') === 'true'
      console.log('[MATCHING] 🚀 Rejoining chat queue after disconnect', { interests, safeMode, sessionId })
      joinAnonymousChat(interests, safeMode)
    }
  }

  if (!sessionId) {
    router.push('/')
    return null
  }

  // Show matching queue if not matched
  if (!isMatched) {
    return (
      <MatchingQueue
        queuePosition={queuePosition}
        connectionStatus={connectionStatus}
        onCancel={handleDisconnect}
        onFindNew={handleFindNewPartner}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none z-30">
        {reactions.map(reaction => (
          <div
            key={reaction.id}
            className="absolute text-4xl animate-float"
            style={{
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 60 + 20}%`,
              animationDelay: '0s',
              animationDuration: '3s'
            }}
          >
            {reaction.emoji}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex h-screen">
        {/* Video/Voice Section */}
        <div className={`flex-1 relative ${mode === 'text' ? 'hidden' : ''}`}>
          {/* Remote Video */}
          <div className="absolute inset-0">
            {isConnected && (mode === 'video' || mode === 'voice') ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${mode === 'voice' ? 'hidden' : ''}`}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                  {(connectionStatus === 'queued' || connectionStatus === 'skipping' || connectionStatus === 'joining') ? (
                    <>
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                      <div className="text-xl mb-2">
                        {connectionStatus === 'skipping' ? 'Finding next person...' : 'Looking for someone to chat with...'}
                      </div>
                      <div className="text-gray-400">
                        {mode === 'video' ? 'Video chat' : mode === 'voice' ? 'Voice chat' : 'Text chat'}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl mb-4">📱</div>
                      <div className="text-xl">Waiting for {partner?.name || 'stranger'} to connect...</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Local Video (Picture-in-Picture) */}
          {(mode === 'video' || mode === 'voice') && (
            <div className="absolute top-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-gray-600 z-10">
                <video
                  ref={el => {
                    localVideoRef.current = el;
                    if (el) {
                      console.log('[VIDEO] Local video element rendered:', el);
                      if (localStream) {
                        console.log('[VIDEO] Assigning localStream to localVideoRef:', localStream);
                        el.srcObject = localStream;
                      } else {
                        console.log('[VIDEO] No localStream available for localVideoRef');
                      }
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${mode === 'voice' || isVideoOff ? 'hidden' : ''}`}
                />
              {(mode === 'voice' || isVideoOff) && (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <div className="text-4xl">🎤</div>
                </div>
              )}
            </div>
          )}

          {/* Connection Status */}
          <div className="absolute top-4 left-4 z-10">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              connectionStatus === 'connected' ? 'bg-green-600' : 
              connectionStatus === 'connecting' ? 'bg-yellow-600' :
              connectionStatus === 'disconnected' ? 'bg-red-600' :
              'bg-gray-600'
            }`}>
              {connectionStatus === 'connected' ? '🟢 Connected' :
               connectionStatus === 'connecting' ? '🟡 Connecting...' :
               connectionStatus === 'disconnected' ? '🔴 Disconnected' :
               '🟡 Connecting...'}
            </div>
          </div>
        </div>

        {/* Chat Section */}
        <div className={`${mode === 'text' ? 'flex-1' : 'w-80'} bg-gray-800 flex flex-col border-l border-gray-700`}>
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Chat</h3>
                <div className="text-sm text-gray-400">
                  {partner ? (
                    <>
                      Connected to {partner?.name || 'Stranger'}
                      {partnerTyping && <span className="ml-2 text-blue-400">typing...</span>}
                    </>
                  ) : (
                    isConnected ? 'Looking for someone to chat with...' : 'Waiting for connection...'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <div className="text-4xl mb-2">💬</div>
                <div>Start a conversation!</div>
                <div className="text-sm mt-1">Say hello to break the ice</div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'You' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg ${
                      message.sender === 'You'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">{message.sender}</div>
                    <div>{message.text}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={currentMessage}
                onChange={handleTyping}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!socket || !isConnected}
              />
              <button
                onClick={handleSendMessage}
                disabled={!currentMessage.trim() || !isConnected}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
        <div className="bg-black bg-opacity-50 backdrop-blur-sm rounded-full px-6 py-3 flex items-center space-x-4">
          {/* Audio Control */}
          {(mode === 'video' || mode === 'voice') && (
            <button
              onClick={handleToggleAudio}
              className={`p-3 rounded-full transition ${
                isAudioMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {isAudioMuted ? '🔇' : '🎤'}
            </button>
          )}

          {/* Video Control */}
          {mode === 'video' && (
            <button
              onClick={handleToggleVideo}
              className={`p-3 rounded-full transition ${
                isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {isVideoOff ? '📹' : '🎥'}
            </button>
          )}

          {/* Reactions */}
          <div className="flex space-x-1">
            {['👋', '😊', '😂', '❤️', '👍'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="p-2 hover:bg-gray-600 rounded-full transition"
                disabled={!isConnected}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Skip Button */}
          <button
            onClick={handleSkip}
            disabled={!isConnected || !isMatched || connectionStatus === 'skipping' || connectionStatus === 'disconnected'}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⏭️ Skip
          </button>

          {/* Disconnect Button */}
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-full font-medium"
          >
            🚪 Leave
          </button>
        </div>
      </div>

      {/* Custom CSS for floating animation */}
      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0px);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px);
            opacity: 0;
          }
        }
        .animate-float {
          animation: float 3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

// Loading component for the Suspense fallback
function ChatLoading() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
        <div className="text-xl">Loading chat...</div>
      </div>
    </div>
  )
}

// Main component that wraps ChatContent with Suspense
export default function Chat() {
  return (
    <Suspense fallback={<ChatLoading />}>
      <ChatContent />
    </Suspense>
  )
}