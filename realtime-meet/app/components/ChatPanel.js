'use client'

import React from 'react' // Added this to resolve the missing ReferenceError

export default function VideoPanel({
  mode,
  connectionStatus, // Received cleanly from parent props
  localVideoRef,
  remoteVideoRef,
  remoteStream,     // Received cleanly from parent props
  isVideoOff
}) {
  // Purely presentational - internal hook calls are completely stripped

  return (
    <div
      className={`flex-1 relative ${mode === 'text' ? 'hidden' : ''}`}
    >
      {/* Remote Video */}
      <div className="absolute inset-0">
        {remoteStream && (mode === 'video' || mode === 'voice') ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${mode === 'voice' ? 'hidden' : ''}`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4" />

              <div className="text-xl mb-2">
                Waiting for stranger...
              </div>

              <div className="text-gray-400">
                {mode === 'video'
                  ? 'Video chat'
                  : mode === 'voice'
                    ? 'Voice chat'
                    : 'Text chat'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Local Video */}
      {(mode === 'video' || mode === 'voice') && (
        <div className="absolute top-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-gray-600 z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              mode === 'voice' || isVideoOff ? 'hidden' : ''
            }`}
          />

          {(mode === 'voice' || isVideoOff) && (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <div className="text-4xl">
                🎤
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connection Status Indicator */}
      <div className="absolute top-4 left-4 z-10">
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            connectionStatus === 'connected'
              ? 'bg-green-600'
              : connectionStatus === 'connecting'
                ? 'bg-yellow-600'
                : 'bg-red-600'
          }`}
        >
          {connectionStatus === 'connected'
            ? '🟢 Connected'
            : connectionStatus === 'connecting'
              ? '🟡 Connecting...'
              : '🔴 Disconnected'}
        </div>
      </div>
    </div>
  )
}