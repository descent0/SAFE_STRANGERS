import { useEffect, useRef, useState, useCallback } from 'react'

import { WEBRTC_CONFIG, WEBRTC_STATES } from '../const/webRTCConst'
import { getLocalStream } from '../services/mediaManager'
import { getSocketInstance } from '../services/socket/socketManager'

export const useWebRTC = () => {
  const socket = getSocketInstance()

  const [remoteStream, setRemoteStream] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState(WEBRTC_STATES.DISCONNECTED)

  const peerConnectionRef = useRef(null)
  const iceCandidateQueue = useRef([])

  const removePeer = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    iceCandidateQueue.current = []
    setRemoteStream(null)
    setConnectionStatus(WEBRTC_STATES.DISCONNECTED)
  }, [])

  const createPeerConnection = useCallback(
    async (peerId, isInitiator = false) => {
      if (!socket) return null
      if (peerConnectionRef.current) return peerConnectionRef.current

      const stream = getLocalStream()
      if (!stream) {
        console.error('No local media stream available')
        return null
      }

      const pc = new RTCPeerConnection(WEBRTC_CONFIG)
      peerConnectionRef.current = pc
      setConnectionStatus(WEBRTC_STATES.CONNECTING)

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })
      pc.ontrack = (event) => {
        const incomingStream = event.streams?.[0]
        if (incomingStream) {
          setRemoteStream(incomingStream)
        }
      }
      pc.onicecandidate = (event) => {
        if (!event.candidate) return
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: peerId,
        })
      }
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState
        if (state === 'connecting') {
          setConnectionStatus(WEBRTC_STATES.CONNECTING)
        } else if (state === 'connected') {
          setConnectionStatus(WEBRTC_STATES.CONNECTED)
        } else if (['failed', 'disconnected'].includes(state)) {
          removePeer()
        }
      }

      for (const candidate of iceCandidateQueue.current) {
        try {
          await pc.addIceCandidate(candidate)
        } catch (err) {
          console.error('Failed to add queued ICE candidate:', err)
        }
      }
      iceCandidateQueue.current = []

      if (isInitiator) {
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          socket.emit('offer', {
            offer: pc.localDescription,
            to: peerId,
          })
        } catch (err) {
          console.error('Offer creation failed:', err)
        }
      }

      return pc
    },
    [socket, removePeer]
  )

  // FIX #6: this effect previously ran once with an empty deps array, so handleOffer/
  // handleAnswer/handleIceCandidate (and the socket.on/off calls themselves) closed over
  // stale references to `socket` and `createPeerConnection` if either ever changed
  // (e.g. after a disconnect/reconnect cycle). Now it re-subscribes whenever they change.
  useEffect(() => {
    if (!socket) return

    const handleOffer = async ({ offer, from }) => {
      const pc = await createPeerConnection(from, false)
      if (!pc) return

      try {
        await pc.setRemoteDescription(offer)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        socket.emit('answer', {
          answer: pc.localDescription,
          to: from,
        })
      } catch (err) {
        console.error('Error handling offer:', err)
      }
    }

    const handleAnswer = async ({ answer }) => {
      const pc = peerConnectionRef.current
      if (!pc) return

      try {
        await pc.setRemoteDescription(answer)
      } catch (err) {
        console.error('Failed to set remote description:', err)
      }
    }

    const handleIceCandidate = async ({ candidate }) => {
      const pc = peerConnectionRef.current

      if (!pc || !pc.remoteDescription?.type) {
        iceCandidateQueue.current.push(candidate)
        return
      }

      try {
        await pc.addIceCandidate(candidate)
      } catch (err) {
        console.error('Error handling ICE candidate:', err)
      }
    }

    socket.on('offer', handleOffer)
    socket.on('answer', handleAnswer)
    socket.on('ice-candidate', handleIceCandidate)

    return () => {
      removePeer()
      socket.off('offer', handleOffer)
      socket.off('answer', handleAnswer)
      socket.off('ice-candidate', handleIceCandidate)
    }
  }, [socket, createPeerConnection, removePeer])


  return {
    remoteStream,
    connectionStatus,
    createPeerConnection,
    removePeer,
  }
}