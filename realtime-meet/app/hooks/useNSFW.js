import { useEffect, useRef, useState, useCallback } from 'react'
import * as nsfwjs from 'nsfwjs'

const NSFW_THRESHOLD = 0.8
const FRAME_INTERVAL = 250

export default function useNSFWDetection(remoteVideoRef, enabled = true) {
  const [nsfwDetected, setNSFWDetected] = useState(false)

  const nsfwModelRef = useRef(null)
  const canvasRef = useRef(null)
  const contextRef = useRef(null)
  const intervalRef = useRef(null)

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const resetNSFWDetection = useCallback(() => {
    setNSFWDetected(false)
  }, [])

  useEffect(() => {
    if (!enabled || nsfwModelRef.current) return

    let isMounted = true

    const loadModel = async () => {
      try {
        const model = await nsfwjs.load('InceptionV3', { size: 299 })
        if (isMounted) nsfwModelRef.current = model
      } catch (err1) {
        console.warn('[NSFW] InceptionV3 failed, falling back to MobileNetV2Mid')
        try {
          const model = await nsfwjs.load('MobileNetV2Mid')
          if (isMounted) nsfwModelRef.current = model
        } catch (err2) {
          console.warn('[NSFW] MobileNetV2Mid failed, using default model')
          const model = await nsfwjs.load()
          if (isMounted) nsfwModelRef.current = model
        }
      }
    }

    loadModel()

    return () => {
      isMounted = false
    }
  }, [enabled])

  useEffect(() => {
    stopDetection()

    if (!enabled || !remoteVideoRef?.current) return

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
      contextRef.current = canvasRef.current.getContext('2d', {
        willReadFrequently: true,
      })
    }

    const detectFrame = async () => {
      try {
        if (!enabled) return

        if (!nsfwModelRef.current) {
          intervalRef.current = setTimeout(detectFrame, FRAME_INTERVAL)
          return
        }

        const video = remoteVideoRef.current

        if (
          !video ||
          video.readyState < 2 ||
          video.videoWidth === 0 ||
          video.videoHeight === 0
        ) {
          intervalRef.current = setTimeout(detectFrame, FRAME_INTERVAL)
          return
        }

        const canvas = canvasRef.current
        const ctx = contextRef.current

        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const predictions = await nsfwModelRef.current.classify(canvas)

        const nsfwProb = Math.max(
          predictions.find((p) => p.className === 'Porn')?.probability || 0,
          predictions.find((p) => p.className === 'Sexy')?.probability || 0,
          predictions.find((p) => p.className === 'Hentai')?.probability || 0
        )

        if (nsfwProb > NSFW_THRESHOLD) {
          console.warn('[NSFW] Content detected')
          setNSFWDetected(true)
          stopDetection()
          return
        }

        intervalRef.current = setTimeout(detectFrame, FRAME_INTERVAL)
      } catch (error) {
        console.error('[NSFW] Detection error:', error)
        intervalRef.current = setTimeout(detectFrame, FRAME_INTERVAL * 2)
      }
    }

    intervalRef.current = setTimeout(detectFrame, 1000)

    return () => {
      stopDetection()
    }
  }, [remoteVideoRef, enabled, stopDetection])

  useEffect(() => {
    if (!enabled) {
      setNSFWDetected(false)
    }
  }, [enabled])

  return {
    nsfwDetected,
    resetNSFWDetection,
  }
}