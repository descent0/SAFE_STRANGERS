import { useEffect, useRef, useCallback } from 'react'
import * as nsfwjs from 'nsfwjs'

const NSFW_THRESHOLD = 0.6
const FRAME_INTERVAL = 500 // ms

export default function useNSFWDetection(remoteVideoRef, onNSFWDetected, enabled = true) {
  console.log("useNSFWDetection called, enabled:", enabled);
  
  const nsfwModelRef = useRef(null)
  const detectionActiveRef = useRef(false) // Start as false
  const canvasRef = useRef(null)
  const intervalRef = useRef(null)

  // Update detection active state when enabled changes
  useEffect(() => {
    detectionActiveRef.current = enabled
    console.log('[NSFW] Detection active:', enabled)
  }, [enabled])

  // Memoize the detection callback
  const handleNSFWDetected = useCallback(() => {
    detectionActiveRef.current = false
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
    onNSFWDetected?.()
  }, [onNSFWDetected])

  // Load NSFW model only when needed
  useEffect(() => {
    if (!enabled) return
    
    let isMounted = true
    console.log('[NSFW] Loading NSFWJS model...')
    
    nsfwjs.load().then(model => {
      if (isMounted && enabled) {
        nsfwModelRef.current = model
        console.log('[NSFW] NSFWJS model loaded.')
      }
    }).catch(error => {
      console.error('[NSFW] Failed to load model:', error)
    })

    return () => { 
      isMounted = false
    }
  }, [enabled])

  // Start/stop detection based on enabled state and video availability
  useEffect(() => {
    // Clear any existing detection
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }

    // Don't start detection if disabled or no video ref
    if (!enabled || !remoteVideoRef?.current) {
      detectionActiveRef.current = false
      return
    }

    // Create canvas if it doesn't exist
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
      console.log('[NSFW] Created hidden canvas for frame capture.')
    }

    const detectFrame = async () => {
      try {
        if (!detectionActiveRef.current || !nsfwModelRef.current || !enabled) return

        const video = remoteVideoRef.current
        if (!video || video.readyState < 2) {
          // Video not ready, try again later
          if (detectionActiveRef.current && enabled) {
            intervalRef.current = setTimeout(detectFrame, FRAME_INTERVAL)
          }
          return
        }

        const canvas = canvasRef.current
        canvas.width = video.videoWidth || 320
        canvas.height = video.videoHeight || 240
        
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        console.log('[NSFW] Captured frame for analysis.')
        const predictions = await nsfwModelRef.current.classify(canvas)
        console.log('[NSFW] Predictions:', predictions)
        
        const pornProb = predictions.find(p => p.className === 'Pornography')?.probability || 0
        const sexyProb = predictions.find(p => p.className === 'Sexy')?.probability || 0
        console.log(`[NSFW] Pornography: ${pornProb}, Sexy: ${sexyProb}`)

        if (pornProb > NSFW_THRESHOLD || sexyProb > NSFW_THRESHOLD) {
          console.warn('[NSFW] NSFW content detected! Disconnecting user.')
          alert("nudity detected");
          handleNSFWDetected()
          return
        }

        // Schedule next detection
        if (detectionActiveRef.current && enabled) {
          intervalRef.current = setTimeout(detectFrame, FRAME_INTERVAL)
        }
      } catch (error) {
        console.error('[NSFW] Detection error:', error)
        // Continue detection despite errors
        if (detectionActiveRef.current && enabled) {
          intervalRef.current = setTimeout(detectFrame, FRAME_INTERVAL)
        }
      }
    }

    // Start detection
    detectionActiveRef.current = true
    intervalRef.current = setTimeout(detectFrame, FRAME_INTERVAL)

    // Cleanup function
    return () => {
      detectionActiveRef.current = false
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [remoteVideoRef, handleNSFWDetected, enabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      detectionActiveRef.current = false
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])
}