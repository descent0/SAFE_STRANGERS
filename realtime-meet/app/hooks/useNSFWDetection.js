import { useEffect, useRef } from 'react'
import * as nsfwjs from 'nsfwjs'

const NSFW_THRESHOLD = 0.6
const FRAME_INTERVAL = 500 // ms

export default function useNSFWDetection(remoteVideoRef, onNSFWDetected) {
  console.log("fucntion called");
  const nsfwModelRef = useRef(null)
  const detectionActiveRef = useRef(true)
  const canvasRef = useRef(null)

  useEffect(() => {
    let isMounted = true
    console.log('[NSFW] Loading NSFWJS model...')
    nsfwjs.load().then(model => {
      if (isMounted) {
        nsfwModelRef.current = model
        console.log('[NSFW] NSFWJS model loaded.')
      }
    })
    return () => { isMounted = false; detectionActiveRef.current = false }
  }, [])

  useEffect(() => {
    if (!remoteVideoRef.current) return
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
      console.log('[NSFW] Created hidden canvas for frame capture.')
    }

    const detectFrame = async () => {
      if (!detectionActiveRef.current || !nsfwModelRef.current) return

      const video = remoteVideoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      console.log('[NSFW] Captured frame for analysis.')
      const predictions = await nsfwModelRef.current.classify(canvas)
      console.log('[NSFW] Predictions:', predictions)
      const pornProb = predictions.find(p => p.className === 'Pornography')?.probability || 0
      const sexyProb = predictions.find(p => p.className === 'Sexy')?.probability || 0
      console.log(`[NSFW] Pornography probability: ${pornProb}, Sexy probability: ${sexyProb}`)

      if (pornProb > NSFW_THRESHOLD || sexyProb > NSFW_THRESHOLD) {
        detectionActiveRef.current = false
        console.warn('[NSFW] NSFW content detected! Disconnecting user.')
        onNSFWDetected?.()
        return
      }
      setTimeout(detectFrame, FRAME_INTERVAL)
    }
    setTimeout(detectFrame, FRAME_INTERVAL)
  }, [remoteVideoRef, onNSFWDetected])
}
