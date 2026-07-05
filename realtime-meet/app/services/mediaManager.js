import { MEDIA_CONSTRAINTS, SCREEN_SHARE_CONSTRAINTS } from "../const/mediaConst"

let stream = null
let mediaInitPromise = null

export const initializeMedia = async () => {
  if (stream) {
    return stream
  }

  if (mediaInitPromise) {
    return mediaInitPromise
  }

  mediaInitPromise = navigator.mediaDevices.getUserMedia(
    MEDIA_CONSTRAINTS
  )

  try {
    stream = await mediaInitPromise
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
  if (!stream) return

  stream.getTracks().forEach(track => {
    track.stop()
  })

  stream = null
}