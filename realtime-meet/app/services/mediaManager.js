import { MEDIA_CONSTRAINTS, SCREEN_SHARE_CONSTRAINTS } from "../const/mediaConst"

let stream = null
let mediaInitPromise = null
let mediaRequestId = 0

export const initializeMedia = async () => {
  if (stream) {
    return stream
  }

  if (mediaInitPromise) {
    return mediaInitPromise
  }

  const requestId = ++mediaRequestId
  mediaInitPromise = navigator.mediaDevices.getUserMedia(
    MEDIA_CONSTRAINTS
  )

  try {
    const nextStream = await mediaInitPromise
    if (requestId !== mediaRequestId) {
      nextStream.getTracks().forEach(track => track.stop())
      return null
    }

    stream = nextStream
    return stream
  } finally {
    mediaInitPromise = null
  }
}

export const getLocalStream = () => {
  return stream
}

export const toggleAudio = () => {
  const audioTrack = stream?.getAudioTracks()?.[0]

  if (!audioTrack) return false

  audioTrack.enabled = !audioTrack.enabled

  return audioTrack.enabled
}

export const toggleVideo = () => {
  const videoTrack = stream?.getVideoTracks()?.[0]

  if (!videoTrack) return false

  videoTrack.enabled = !videoTrack.enabled

  return videoTrack.enabled
}

export const startScreenShare = async () => {
  const screenStream =
    await navigator.mediaDevices.getDisplayMedia(
      SCREEN_SHARE_CONSTRAINTS
    )

  return screenStream
}

export const stopMedia = () => {
  mediaRequestId += 1

  if (!stream) return

  stream.getTracks().forEach(track => {
    track.stop()
  })

  stream = null
}