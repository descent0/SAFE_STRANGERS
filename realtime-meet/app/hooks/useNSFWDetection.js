import { useEffect, useRef, useCallback } from 'react'
import * as nsfwjs from 'nsfwjs'

const NSFW_THRESHOLD = 0.8
const FRAME_INTERVAL = 250

export default function useNSFWDetection(remoteVideoRef, onNSFWDetected, enabled = true) {
  const nsfwModelRef = useRef(null)
  const detectionActiveRef = useRef(false)
  const canvasRef = useRef(null)
  const intervalRef = useRef(null)
  const modelLoadedRef = useRef(false)

  // Sync detection active state with `enabled`
  useEffect(() => {
    detectionActiveRef.current = enabled
  }, [enabled])

  const stopDetection = useCallback(() => {
    detectionActiveRef.current = false
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const handleNSFWDetected = useCallback(() => {
    stopDetection()
    onNSFWDetected?.()
  }, [stopDetection, onNSFWDetected])

  // Load model (InceptionV3 → MobileNetV2Mid → Default)
  useEffect(() => {
    if (!enabled || modelLoadedRef.current) return
    let isMounted = true

    const loadModel = async () => {
      try {
        const model = await nsfwjs.load('InceptionV3', { size: 299 })
        if (isMounted) {
          nsfwModelRef.current = model
          modelLoadedRef.current = true
        }
      } catch (err1) {
        console.warn('[NSFW] InceptionV3 failed, falling back to MobileNetV2Mid')
        try {
          const model = await nsfwjs.load('MobileNetV2Mid')
          if (isMounted) {
            nsfwModelRef.current = model
            modelLoadedRef.current = true
          }
        } catch (err2) {
          console.warn('[NSFW] MobileNetV2Mid failed, using default model')
          const model = await nsfwjs.load()
          if (isMounted) {
            nsfwModelRef.current = model
            modelLoadedRef.current = true
          }
        }
      }
    }

    loadModel()
    return () => { isMounted = false }
  }, [enabled])

  // Detection loop
  useEffect(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }

    if (!enabled || !remoteVideoRef?.current) {
      detectionActiveRef.current = false
      return
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }

    const detectFrame = async () => {
      try {
        if (!detectionActiveRef.current || !enabled) return
        if (!nsfwModelRef.current || !modelLoadedRef.current) {
          intervalRef.current = setTimeout(detectFrame, FRAME_INTERVAL)
          return
        }

        const video = remoteVideoRef.current
        if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
          intervalRef.current = setTimeout(detectFrame, FRAME_INTERVAL)
          return
        }

        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const predictions = await nsfwModelRef.current.classify(canvas)
        const nsfwProb = Math.max(
          predictions.find(p => p.className === 'Porn')?.probability || 0,
          predictions.find(p => p.className === 'Sexy')?.probability || 0,
          predictions.find(p => p.className === 'Hentai')?.probability || 0
        )

        console.log(`[NSFW] Max probability: ${(nsfwProb * 100).toFixed(2)}%`)

        if (nsfwProb > NSFW_THRESHOLD) {
          console.warn(`[NSFW] NSFW content detected!`)
          handleNSFWDetected()
          return
        }

        intervalRef.current = setTimeout(detectFrame, FRAME_INTERVAL)
      } catch (error) {
        console.error('[NSFW] Detection error:', error)
        intervalRef.current = setTimeout(detectFrame, FRAME_INTERVAL * 2)
      }
    }

    detectionActiveRef.current = true
    intervalRef.current = setTimeout(detectFrame, 1000)

    return () => {
      stopDetection()
    }
  }, [remoteVideoRef, handleNSFWDetected, enabled, stopDetection])

  useEffect(() => () => stopDetection(), [stopDetection])
}
