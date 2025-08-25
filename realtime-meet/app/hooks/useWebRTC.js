import { useEffect, useRef, useState, useCallback } from 'react'

// Constants for better maintainability
const WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
}

const MEDIA_CONSTRAINTS = {
  video: { 
    width: { ideal: 1280 }, 
    height: { ideal: 720 },
    facingMode: 'user'
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
}

const SCREEN_SHARE_CONSTRAINTS = {
  video: true,
  audio: true,
}

export const useWebRTC = (localVideoRef, onPartnerDisconnected) => {
  // State management
  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState(new Map())
  const [connectionStatus, setConnectionStatus] = useState('connecting') // 'connecting' | 'connected' | 'disconnected'
  const peerConnections = useRef(new Map())
  const isInitialized = useRef(false)
  
  // ICE candidate queue per peer
  const iceCandidateQueues = useRef(new Map())
  const connectionAttempts = useRef(new Map())
  const mediaInitPromise = useRef(null)

  // Critical fix: Wait for local stream to be ready
  const waitForLocalStream = useCallback(() => {
    return new Promise((resolve) => {
      if (localStream) {
        resolve(localStream)
        return
      }
      
      const checkStream = () => {
        if (localStream) {
          resolve(localStream)
        } else {
          setTimeout(checkStream, 100)
        }
      }
      checkStream()
    })
  }, [localStream])

  // Helper function to update local video element
  const updateLocalVideoElement = useCallback((stream) => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream
      // Ensure video plays
      localVideoRef.current.play().catch(e => console.warn('Local video play failed:', e))
      console.log('🎥 Local video element updated')
    }
  }, [localVideoRef])

  // Media initialization with better error handling and promise caching
  const initializeMedia = useCallback(async () => {
    // Return existing promise if already initializing
    if (mediaInitPromise.current) {
      return mediaInitPromise.current
    }

    if (isInitialized.current && localStream) {
      console.log('📹 Media already initialized, returning existing stream')
      return localStream
    }

    mediaInitPromise.current = (async () => {
      try {
        console.log('🚀 Initializing media devices...')
        const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS)
        
        console.log('✅ Media stream obtained:', {
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
          streamId: stream.id
        })

        setLocalStream(stream)
        updateLocalVideoElement(stream)
        isInitialized.current = true
        
        return stream
      } catch (error) {
        console.error('❌ Error accessing media devices:', error)
        mediaInitPromise.current = null
        throw error
      }
    })()

    return mediaInitPromise.current
  }, [localVideoRef, localStream, updateLocalVideoElement])

  // Helper function to add tracks to peer connection
  const addTracksToConnection = useCallback((pc, stream) => {
    if (!stream) {
      console.warn('⚠️ No stream available to add tracks')
      return
    }
    
    console.log('📹 Adding stream tracks to peer connection')
    stream.getTracks().forEach(track => {
      const sender = pc.addTrack(track, stream)
      console.log('➕ Added track:', track.kind, 'enabled:', track.enabled)
    })
  }, [])

  // Helper function to handle remote stream updates
  const handleRemoteStream = useCallback((peerId, stream) => {
    console.log('📺 Received remote stream from:', peerId)
    console.log('📊 Remote stream tracks:', stream.getTracks().map(t => ({ 
      kind: t.kind, 
      enabled: t.enabled,
      id: t.id 
    })))
    
    setRemoteStreams(prev => {
      const newMap = new Map(prev)
      newMap.set(peerId, stream)
      console.log('📊 Updated remote streams. Total:', newMap.size)
      return newMap
    })
  }, [])

  // Helper function to handle connection state changes
  const handleConnectionStateChange = useCallback((peerId, connectionState) => {
    console.log('🔄 Connection state changed for', peerId, ':', connectionState)
    if (connectionState === 'connected') {
      setConnectionStatus('connected')
      console.log('✅ WebRTC connection fully established with:', peerId)
      connectionAttempts.current.delete(peerId)
    } else if (connectionState === 'disconnected' || connectionState === 'failed') {
      setConnectionStatus('disconnected')
      console.log('❌ WebRTC connection lost with:', peerId)
      // Try ICE restart if failed
      const pc = peerConnections.current.get(peerId)
      if (pc && connectionState === 'failed') {
        try {
          console.log('🔄 Attempting ICE restart for:', peerId)
          pc.restartIce()
        } catch (err) {
          console.warn('⚠️ ICE restart failed:', err)
        }
        // Optionally, notify the other peer to re-negotiate
        // You may want to emit a custom socket event here
      } else {
        // Clean up this specific peer
        if (pc) {
          pc.close()
          peerConnections.current.delete(peerId)
        }
        setRemoteStreams(prev => {
          const newMap = new Map(prev)
          newMap.delete(peerId)
          return newMap
        })
        iceCandidateQueues.current.delete(peerId)
        connectionAttempts.current.delete(peerId)
        // Call partner disconnect callback if provided
        if (typeof onPartnerDisconnected === 'function') {
          onPartnerDisconnected()
        }
      }
    } else if (connectionState === 'connecting') {
      setConnectionStatus('connecting')
      console.log('🔗 WebRTC connection attempting for:', peerId)
    }
  }, [onPartnerDisconnected])

  // Helper function to handle ICE candidates
  const handleIceCandidateEvent = useCallback((event, peerId, socket) => {
    if (event.candidate) {
      console.log('🧊 Sending ICE candidate to:', peerId)
      socket.emit('ice-candidate', {
        candidate: event.candidate,
        to: peerId
      })
    } else {
      console.log('✅ ICE gathering complete for:', peerId)
    }
  }, [])

  // Create peer connection with better error handling and stream waiting
  const createPeerConnection = useCallback(async (peerId, socket, isInitiator = false) => {
    console.log('🔗 Creating peer connection:', { peerId, isInitiator, hasLocalStream: !!localStream })
    
    // Prevent duplicate connections
    if (peerConnections.current.has(peerId)) {
      console.warn('⚠️ Peer connection already exists for:', peerId)
      return peerConnections.current.get(peerId)
    }

    // Track connection attempts to prevent infinite loops
    const attempts = connectionAttempts.current.get(peerId) || 0
    if (attempts > 3) {
      console.error('❌ Too many connection attempts for:', peerId)
      if (typeof onPartnerDisconnected === 'function') {
        onPartnerDisconnected()
      }
      return null
    }
    connectionAttempts.current.set(peerId, attempts + 1)

    try {
      // CRITICAL: Wait for local stream to be ready
      const stream = await waitForLocalStream()
      
      if (!stream) {
        console.error('❌ No local stream available for peer connection')
        return null
      }

      const pc = new RTCPeerConnection(WEBRTC_CONFIG)
      
      // Add local stream tracks
      addTracksToConnection(pc, stream)

      // Set up event handlers
      pc.ontrack = (event) => {
        console.log('📥 Received track event:', event.track.kind)
        if (event.streams && event.streams[0]) {
          handleRemoteStream(peerId, event.streams[0])
        }
      }
      
      pc.onicecandidate = (event) => handleIceCandidateEvent(event, peerId, socket)
      
      pc.onconnectionstatechange = () => handleConnectionStateChange(peerId, pc.connectionState)
      
      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState, 'for peer:', peerId)
        if (pc.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed for:', peerId)
          // Try to restart ICE
          pc.restartIce()
        }
      }

      // Store peer connection
      peerConnections.current.set(peerId, pc)
      console.log('📊 Peer connections count:', peerConnections.current.size)

      // Flush any queued ICE candidates for this peer
      const queuedCandidates = iceCandidateQueues.current.get(peerId) || []
      if (queuedCandidates.length > 0) {
        console.log(`🧊 Flushing ${queuedCandidates.length} queued ICE candidates after peer connection creation`)
        for (const candidate of queuedCandidates) {
          try {
            await pc.addIceCandidate(candidate)
            console.log('✅ Added queued ICE candidate for:', peerId)
          } catch (error) {
            console.warn('⚠️ Error adding queued ICE candidate:', error)
          }
        }
        iceCandidateQueues.current.delete(peerId)
      }

      // Create offer if initiator
      if (isInitiator) {
        console.log('🚀 Creating offer as initiator for peer:', peerId)
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          })
          
          await pc.setLocalDescription(offer)
          console.log('📤 Setting local description and sending offer')
          console.log('📡 Emitting offer to peer:', peerId)
          
          socket.emit('offer', {
            offer: pc.localDescription,
            to: peerId
          })
        } catch (error) {
          console.error('❌ Error creating offer:', error)
          peerConnections.current.delete(peerId)
          return null
        }
      }

      return pc
    } catch (error) {
      console.error('❌ Error creating peer connection:', error)
      connectionAttempts.current.delete(peerId)
      return null
    }
  }, [localStream, waitForLocalStream, addTracksToConnection, handleRemoteStream, handleIceCandidateEvent, handleConnectionStateChange, onPartnerDisconnected])

  // Helper function to get peer connection safely
  const getPeerConnection = useCallback((peerId) => {
    const pc = peerConnections.current.get(peerId)
    if (!pc) {
      console.warn('⚠️ No peer connection found for:', peerId)
    }
    return pc
  }, [])

  // Handle WebRTC offer with improved error handling
  const handleOffer = useCallback(async (offer, from, socket) => {
    console.log('📥 Received offer from:', from)
    
    try {
      const pc = await createPeerConnection(from, socket, false)
      if (!pc) {
        console.error('❌ Failed to create peer connection for offer')
        return
      }

      console.log('🔧 Setting remote description and creating answer')
      await pc.setRemoteDescription(offer)
      
      // Flush queued ICE candidates
      const queued = iceCandidateQueues.current.get(from) || []
      if (queued.length > 0) {
        console.log(`🧊 Processing ${queued.length} queued ICE candidates`)
        for (const candidate of queued) {
          try {
            await pc.addIceCandidate(candidate)
            console.log('✅ Added queued ICE candidate for:', from)
          } catch (error) {
            console.warn('⚠️ Error adding queued ICE candidate:', error)
          }
        }
        iceCandidateQueues.current.delete(from)
      }

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      
      console.log('📤 Sending answer to:', from)
      socket.emit('answer', {
        answer: pc.localDescription,
        to: from
      })
    } catch (error) {
      console.error('❌ Error handling offer:', error)
      // Clean up on error
      peerConnections.current.delete(from)
    }
  }, [createPeerConnection])

  // Handle WebRTC answer with ICE candidate queue flush
  const handleAnswer = useCallback(async (answer, from) => {
    console.log('📥 Received answer from:', from)
    const pc = getPeerConnection(from)
    if (!pc) return

    try {
      console.log('🔧 Setting remote description from answer')
      await pc.setRemoteDescription(answer)
      
      // Flush queued ICE candidates
      const queued = iceCandidateQueues.current.get(from) || []
      if (queued.length > 0) {
        console.log(`🧊 Processing ${queued.length} queued ICE candidates after answer`)
        for (const candidate of queued) {
          try {
            await pc.addIceCandidate(candidate)
            console.log('✅ Added queued ICE candidate for:', from)
          } catch (error) {
            console.warn('⚠️ Error adding queued ICE candidate:', error)
          }
        }
        iceCandidateQueues.current.delete(from)
      }
      console.log('✅ WebRTC connection established with:', from)
    } catch (error) {
      console.error('❌ Error handling answer:', error)
    }
  }, [getPeerConnection])

  // ICE candidate handling: always queue if peer connection not ready
  const handleIceCandidate = useCallback(async (candidate, from) => {
    console.log('🧊 Received ICE candidate from:', from)
    let pc = getPeerConnection(from)
    // Always queue ICE candidates if peer connection is not ready
    if (!pc) {
      if (!iceCandidateQueues.current.has(from)) {
        iceCandidateQueues.current.set(from, [])
      }
      iceCandidateQueues.current.get(from).push(candidate)
      console.log('⏳ Queued ICE candidate for', from, '(no peer connection yet)')
      return
    }
    // If remoteDescription is not set, queue the candidate
    if (!pc.remoteDescription || !pc.remoteDescription.type) {
      if (!iceCandidateQueues.current.has(from)) {
        iceCandidateQueues.current.set(from, [])
      }
      iceCandidateQueues.current.get(from).push(candidate)
      console.log('⏳ Queued ICE candidate for', from, '(no remote description yet)')
      return
    }
    // Otherwise, add immediately
    try {
      await pc.addIceCandidate(candidate)
      console.log('✅ ICE candidate added for:', from)
    } catch (error) {
      console.warn('⚠️ Error adding ICE candidate:', error)
    }
  }, [getPeerConnection])

  // Remove peer connection and clean up
  const removePeer = useCallback((peerId) => {
    console.log('🧹 Removing peer:', peerId)
    
    const pc = peerConnections.current.get(peerId)
    if (pc) {
      pc.close()
      peerConnections.current.delete(peerId)
    }
    
    setRemoteStreams(prev => {
      const newMap = new Map(prev)
      newMap.delete(peerId)
      return newMap
    })
    
    iceCandidateQueues.current.delete(peerId)
    connectionAttempts.current.delete(peerId)
  }, [])

  // Helper function to get media track safely
  const getMediaTrack = useCallback((stream, kind) => {
    if (!stream) return null
    const tracks = kind === 'audio' ? stream.getAudioTracks() : stream.getVideoTracks()
    return tracks.length > 0 ? tracks[0] : null
  }, [])

  // Toggle audio with better error handling
  const toggleAudio = useCallback(() => {
    const audioTrack = getMediaTrack(localStream, 'audio')
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      console.log('🎙️ Audio toggled:', audioTrack.enabled ? 'ON' : 'OFF')
    } else {
      console.warn('⚠️ No audio track found')
    }
  }, [localStream, getMediaTrack])

  // Toggle video with better error handling
  const toggleVideo = useCallback(() => {
    const videoTrack = getMediaTrack(localStream, 'video')
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      console.log('📹 Video toggled:', videoTrack.enabled ? 'ON' : 'OFF')
    } else {
      console.warn('⚠️ No video track found')
    }
  }, [localStream, getMediaTrack])

  // Helper function to replace video track in all peer connections
  const replaceVideoTrackInConnections = useCallback((newVideoTrack) => {
    peerConnections.current.forEach(pc => {
      const sender = pc.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      )
      if (sender) {
        sender.replaceTrack(newVideoTrack)
      }
    })
  }, [])

  // Helper function to create new stream with video track
  const createStreamWithVideoTrack = useCallback((videoTrack) => {
    const audioTracks = localStream ? localStream.getAudioTracks() : []
    return new MediaStream([videoTrack, ...audioTracks])
  }, [localStream])

  // Start screen sharing with better modularity
  const startScreenShare = useCallback(async () => {
    try {
      console.log('🖥️ Starting screen share...')
      const screenStream = await navigator.mediaDevices.getDisplayMedia(SCREEN_SHARE_CONSTRAINTS)
      const videoTrack = screenStream.getVideoTracks()[0]
      
      if (!videoTrack) {
        throw new Error('No video track found in screen share')
      }

      // Replace video track in all peer connections
      replaceVideoTrackInConnections(videoTrack)

      // Update local stream
      const newLocalStream = createStreamWithVideoTrack(videoTrack)
      setLocalStream(newLocalStream)
      updateLocalVideoElement(newLocalStream)

      // Handle screen share end
      videoTrack.onended = () => {
        console.log('🖥️ Screen share ended by user')
        stopScreenShare()
      }

      console.log('✅ Screen share started successfully')
      return true
    } catch (error) {
      console.error('❌ Error starting screen share:', error)
      return false
    }
  }, [localStream, replaceVideoTrackInConnections, createStreamWithVideoTrack, updateLocalVideoElement])

  // Stop screen sharing and return to camera
  const stopScreenShare = useCallback(async () => {
    try {
      console.log('🎥 Returning to camera...')
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: MEDIA_CONSTRAINTS.video,
        audio: false
      })

      const videoTrack = videoStream.getVideoTracks()[0]
      
      if (!videoTrack) {
        throw new Error('No video track found from camera')
      }
      
      // Replace screen share track with camera track
      replaceVideoTrackInConnections(videoTrack)

      // Update local stream
      const newLocalStream = createStreamWithVideoTrack(videoTrack)
      setLocalStream(newLocalStream)
      updateLocalVideoElement(newLocalStream)
      
      console.log('✅ Returned to camera successfully')
    } catch (error) {
      console.error('❌ Error stopping screen share:', error)
    }
  }, [localStream, replaceVideoTrackInConnections, createStreamWithVideoTrack, updateLocalVideoElement])

  // Cleanup on unmount with better logging
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up WebRTC resources...')
      
      // Stop all local stream tracks
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop()
          console.log('🛑 Stopped track:', track.kind)
        })
      }
      
      // Close all peer connections
      peerConnections.current.forEach((pc, peerId) => {
        console.log('🔌 Closing peer connection:', peerId)
        pc.close()
      })
      
      peerConnections.current.clear()
      iceCandidateQueues.current.clear()
      connectionAttempts.current.clear()
      mediaInitPromise.current = null
      console.log('✅ WebRTC cleanup completed')
    }
  }, [localStream])

  // Return public API with organized structure
  return {
    // State
    localStream,
    remoteStreams,
    connectionStatus,
    // Core WebRTC functions
    initializeMedia,
    createPeerConnection,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    removePeer,
    // Media controls
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  }
}