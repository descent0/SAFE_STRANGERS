import { useEffect, useRef, useState, useCallback } from 'react'
import * as nsfwjs from 'nsfwjs'
import * as tf from '@tensorflow/tfjs'

// Constants for better maintainability
const WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

const MEDIA_CONSTRAINTS = {
  video: { width: 1280, height: 720 },
  audio: true,
}

const SCREEN_SHARE_CONSTRAINTS = {
  video: true,
  audio: true,
}

export const useWebRTC = (localVideoRef, onPartnerDisconnected) => {
  // State management
  const nsfwModelRef = useRef(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState(new Map())
  const peerConnections = useRef(new Map())
  const isInitialized = useRef(false)
  const frameLoggerRef = useRef(null)

  // ICE candidate queue per peer
  const iceCandidateQueues = useRef(new Map())

  // Remove peer connection and clean up (moved up)
  // Duplicate declaration removed

  // Function to analyze each frame for offensive content
  const analyzeLocalVideoFrames = useCallback((stream) => {
    if (!stream || !nsfwModelRef.current) return;
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    video.play();
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    let running = true;
    async function analyzeFrame() {
      if (!running) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const predictions = await nsfwModelRef.current.classify(canvas);
      // Block if any offensive category is detected above 0.7
    
      const offensive = predictions.some(pred =>
        ['Porn', 'Hentai', 'Sexy'].includes(pred.className) && pred.probability > 0.7
      );
      if (offensive) {
        alert('Offensive content detected! Your video connection has been blocked.');
        console.warn('Offensive content detected! Blocking connection.');
        // Remove all peers and stop local stream
        peerConnections.current.forEach((_, peerId) => removePeer(peerId));
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
        }
        running = false;
        return;
      }
      frameLoggerRef.current = requestAnimationFrame(analyzeFrame);
    }
    video.onloadeddata = () => {
      analyzeFrame();
    };
    // Cleanup function
    return () => {
      running = false;
      if (frameLoggerRef.current) {
        cancelAnimationFrame(frameLoggerRef.current);
      }
      video.srcObject = null;
    };
  }, [setLocalStream]);

  // Helper function to update local video element
  const updateLocalVideoElement = useCallback((stream) => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream
      console.log('📺 Local video element updated')
    }
  }, [localVideoRef])

  // Media initialization with better error handling
  const initializeMedia = useCallback(async () => {
    if (isInitialized.current && localStream) {
      console.log('📹 Media already initialized')
      return localStream
    }

    try {
      console.log('🚀 Initializing media devices...')
      // Load NSFWJS model if not loaded
      if (!nsfwModelRef.current) {
        console.log('⏳ Loading NSFWJS model...')
        nsfwModelRef.current = await nsfwjs.load();
        console.log('✅ NSFWJS model loaded')
      }
      const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS)
      console.log('✅ Media stream obtained:', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      })
  setLocalStream(stream)
  updateLocalVideoElement(stream)
  // Start analyzing frames for offensive content
  analyzeLocalVideoFrames(stream)
  isInitialized.current = true
  return stream
    } catch (error) {
      console.error('❌ Error accessing media devices:', error)
      alert('Failed to access camera/microphone. Please check permissions.')
      throw error
    }
  }, [localVideoRef, localStream, updateLocalVideoElement])

  // Helper function to add tracks to peer connection
  const addTracksToConnection = useCallback((pc, stream) => {
    if (!stream) {
      console.warn('⚠️ No stream available to add tracks')
      return
    }
    
    console.log('📹 Adding stream tracks to peer connection')
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream)
      console.log('➕ Added track:', track.kind)
    })
  }, [])

  // Helper function to handle remote stream updates
  const handleRemoteStream = useCallback((peerId, stream) => {
    console.log('📺 Received remote stream from:', peerId)
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
      console.log('✅ WebRTC connection fully established with:', peerId)
    } else if (connectionState === 'disconnected' || connectionState === 'failed') {
      console.log('❌ WebRTC connection lost with:', peerId)
      setRemoteStreams(prev => {
        const newMap = new Map(prev)
        newMap.delete(peerId)
        return newMap
      })
      peerConnections.current.delete(peerId)
      // Call partner disconnect callback if provided
      if (typeof onPartnerDisconnected === 'function') {
        onPartnerDisconnected()
      }
    }
  }, [])

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

  // Create peer connection with modularized event handlers
  const createPeerConnection = useCallback((peerId, socket, isInitiator = false) => {
    console.log('� Creating peer connection:', { peerId, isInitiator, hasLocalStream: !!localStream })
    
    const pc = new RTCPeerConnection(WEBRTC_CONFIG)
    
    // Add local stream tracks
    addTracksToConnection(pc, localStream)

    // Set up event handlers
    pc.ontrack = (event) => handleRemoteStream(peerId, event.streams[0])
    pc.onicecandidate = (event) => handleIceCandidateEvent(event, peerId, socket)
    pc.onconnectionstatechange = () => handleConnectionStateChange(peerId, pc.connectionState)

    // Store peer connection
    peerConnections.current.set(peerId, pc)
    console.log('📊 Peer connections count:', peerConnections.current.size)

    // Create offer if initiator
    if (isInitiator) {
      console.log('🚀 Creating offer as initiator for peer:', peerId)
      pc.createOffer()
        .then(offer => {
          console.log('📤 Setting local description and sending offer')
          return pc.setLocalDescription(offer)
        })
        .then(() => {
          console.log('📡 Emitting offer to peer:', peerId)
          socket.emit('offer', {
            offer: pc.localDescription,
            to: peerId
          })
        })
        .catch(error => {
          console.error('❌ Error creating offer:', error)
        })
    }

    return pc
  }, [localStream, addTracksToConnection, handleRemoteStream, handleIceCandidateEvent, handleConnectionStateChange])

  // Helper function to get peer connection safely
  const getPeerConnection = useCallback((peerId) => {
    const pc = peerConnections.current.get(peerId)
    if (!pc) {
      console.warn('⚠️ No peer connection found for:', peerId)
    }
    return pc
  }, [])

  // Handle WebRTC offer with ICE candidate queue flush
  const handleOffer = useCallback(async (offer, from, socket) => {
    console.log('📥 Received offer from:', from)
    const pc = createPeerConnection(from, socket, false)
    try {
      console.log('🔧 Setting remote description and creating answer')
      await pc.setRemoteDescription(offer)
      // Flush queued ICE candidates
      const queued = iceCandidateQueues.current.get(from)
      if (queued && queued.length) {
        for (const candidate of queued) {
          try {
            await pc.addIceCandidate(candidate)
            console.log('✅ Flushed queued ICE candidate for:', from)
          } catch (error) {
            console.error('❌ Error adding queued ICE candidate:', error)
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
      const queued = iceCandidateQueues.current.get(from)
      if (queued && queued.length) {
        for (const candidate of queued) {
          try {
            await pc.addIceCandidate(candidate)
            console.log('✅ Flushed queued ICE candidate for:', from)
          } catch (error) {
            console.error('❌ Error adding queued ICE candidate:', error)
          }
        }
        iceCandidateQueues.current.delete(from)
      }
      console.log('✅ WebRTC connection established with:', from)
    } catch (error) {
      console.error('❌ Error handling answer:', error)
    }
  }, [getPeerConnection])

  // Handle ICE candidate with queuing
  const handleIceCandidate = useCallback(async (candidate, from) => {
    console.log('🧊 Received ICE candidate from:', from)
    const pc = getPeerConnection(from)
    if (!pc) return

    // If remoteDescription is not set, queue the candidate
    if (!pc.remoteDescription || !pc.remoteDescription.type) {
      if (!iceCandidateQueues.current.has(from)) {
        iceCandidateQueues.current.set(from, [])
      }
      iceCandidateQueues.current.get(from).push(candidate)
      console.log('⏳ Queued ICE candidate for', from)
      return
    }
    // Otherwise, add immediately
    try {
      await pc.addIceCandidate(candidate)
      console.log('✅ ICE candidate added for:', from)
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error)
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
      // Stop frame logger
      if (frameLoggerRef.current) {
        cancelAnimationFrame(frameLoggerRef.current);
      }
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
      console.log('✅ WebRTC cleanup completed')
    }
  }, [localStream])

  // Return public API with organized structure
  return {
    // State
    localStream,
    remoteStreams,
    
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
