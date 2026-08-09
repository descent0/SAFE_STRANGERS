'use client'

import React from 'react'
import VideoWaiting from './waiting/VideoWaiting'
import { getStatusMessage } from '../const/statusMessages'

export default function VideoPanel({
  mode,
  isMatched,
  rtcStatus,
  connectionStatus,
  localVideoRef,
  remoteVideoRef,
  remoteStream,
  isVideoOff,
}) {
  const statusLabel = isMatched
    ? rtcStatus === 'connected'
      ? 'Connected'
      : rtcStatus === 'connecting'
        ? 'Connecting'
        : 'Disconnected'
    : getStatusMessage(connectionStatus)

  const statusToneClass = isMatched
    ? rtcStatus === 'connected'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
      : rtcStatus === 'connecting'
        ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
        : 'border-rose-400/30 bg-rose-400/10 text-rose-200'
    : 'border-sky-400/30 bg-sky-400/10 text-sky-200'

  return (
    <div className={`relative flex-1 min-h-[24rem] overflow-hidden ${mode === 'text' ? 'hidden' : ''}`}>
     
      <div className="relative flex h-full min-h-[24rem] flex-col sm:min-h-[30rem]">

        <div className="relative flex min-h-[18rem] flex-1 overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-slate-900/80 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:min-h-0">
         
          {remoteStream && (mode === 'video' || mode === 'voice') ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`h-full w-full object-cover ${mode === 'voice' ? 'hidden' : ''}`}
            />
          ) : (
            <VideoWaiting
              mode={mode}
              connectionStatus={connectionStatus}
            />
          )}

          {(mode === 'video' || mode === 'voice') && (
            <div className="absolute right-3 top-3 z-10 w-28 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/75 shadow-2xl backdrop-blur-xl sm:right-4 sm:top-4 sm:w-40 md:w-44">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
              
                <span>You</span>
                <span>Preview</span>
              </div>
              <div className="relative aspect-[4/3] bg-slate-900">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${mode === 'voice' || isVideoOff ? 'hidden' : ''}`}
                />
                {(mode === 'voice' || isVideoOff) && (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-3xl">
                    🎤
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="absolute left-3 top-3 z-10 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur-xl sm:left-4 sm:top-4">
            Secure session
          </div>
           <div
            className={`absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur-xl ${statusToneClass}`}
          >
            {statusLabel}
          </div>

          <div className="absolute bottom-3 left-3 z-10 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs font-medium text-slate-200 backdrop-blur-xl sm:bottom-4 sm:left-4">
            {mode === 'video' ? 'Camera + mic' : mode === 'voice' ? 'Mic only' : 'Text only'}
          </div>
        </div>
      </div>
    </div>
  )
}
