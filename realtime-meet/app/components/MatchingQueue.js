'use client'

import { useState, useEffect, useCallback } from 'react'

// Constants for better maintainability
const ANIMATION_CONFIG = {
  DOTS_INTERVAL: 1000,
  TIME_UPDATE_INTERVAL: 1000,
}

const STATUS_MESSAGES = {
  queued: 'Looking for someone to chat with',
  skipping: 'Finding your next chat partner',
  'finding-new': 'Looking for a new person to chat with',
  joining: 'Connecting to the matching service',
  matched: 'Match found! Connecting...',
  'partner-left': 'Your chat partner left.',
  'partner-skipped': 'Your chat partner moved on.',
  error: 'Connection error. Retrying...',
  expired: 'Session expired. Please refresh the page.',
  default: 'Connecting',
}

const STATUS_COLORS = {
  matched: 'text-green-400',
  error: 'text-red-400',
  expired: 'text-red-400',
  'partner-left': 'text-yellow-400',
  'partner-skipped': 'text-yellow-400',
  default: 'text-blue-400',
}

export default function MatchingQueue({ 
  queuePosition, 
  connectionStatus, 
  estimatedWait, 
  onCancel,
  onFindNew
}) {
  const [dots, setDots] = useState('')
  const [timeInQueue, setTimeInQueue] = useState(0)

  // Memoized status message generator
  const getStatusMessage = useCallback(() => {
    const baseMessage = STATUS_MESSAGES[connectionStatus] || STATUS_MESSAGES.default
    return `${baseMessage}${dots}`
  }, [connectionStatus, dots])

  // Memoized status color generator  
  const getStatusColor = useCallback(() => {
    return STATUS_COLORS[connectionStatus] || STATUS_COLORS.default
  }, [connectionStatus])

  // Format time helper
  const formatTime = useCallback((timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = (timeInSeconds % 60).toString().padStart(2, '0')
    return `${minutes}:${seconds}`
  }, [])

  // Animation effect for dots and timer
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
      setTimeInQueue(prev => prev + 1)
    }, ANIMATION_CONFIG.DOTS_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  // Check if we should show "Find New" buttons
  const shouldShowFindNewButton = connectionStatus === 'partner-left' || connectionStatus === 'partner-skipped'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
      <div className="text-center text-white max-w-md mx-auto p-8">
        {/* Animated matching icon */}
        <div className="mb-8">
          <div className="relative">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-4xl animate-pulse">
              🎯
            </div>
            <div className="absolute inset-0 w-24 h-24 mx-auto border-4 border-blue-500 rounded-full animate-spin opacity-30"></div>
          </div>
        </div>

        {/* Status message */}
        <h2 className={`text-2xl font-bold mb-4 ${getStatusColor()}`}>
          {getStatusMessage()}
        </h2>

        {/* Queue information */}
        {queuePosition && connectionStatus === 'queued' && (
          <div className="mb-6 space-y-2">
            <div className="text-gray-300">
              Position in queue: <span className="font-semibold text-white">{queuePosition}</span>
            </div>
            {estimatedWait && (
              <div className="text-gray-300">
                Estimated wait: <span className="font-semibold text-white">{estimatedWait}s</span>
              </div>
            )}
          </div>
        )}

        {/* Time in queue */}
        <div className="mb-8 text-gray-400 text-sm">
          Time waiting: {formatTime(timeInQueue)}
        </div>

        {/* Tips while waiting */}
        <div className="mb-8 bg-black bg-opacity-30 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 text-yellow-400">💡 While you wait...</h3>
          <div className="text-sm text-gray-300 space-y-2">
            <div>• Make sure your camera and microphone are working</div>
            <div>• Think of interesting conversation starters</div>
            <div>• Remember to be respectful and kind</div>
            <div>• You can skip to the next person anytime</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {shouldShowFindNewButton ? (
            <div className="space-y-3">
              <button
                onClick={onFindNew}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition duration-200 w-full"
              >
                Find New Chat Partner
              </button>
              <button
                onClick={onCancel}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition duration-200 w-full"
              >
                Back to Home
              </button>
            </div>
          ) : (
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition duration-200"
            >
              Cancel Matching
            </button>
          )}
        </div>

        {/* Safety reminder */}
        <div className="mt-8 text-xs text-gray-400 bg-black bg-opacity-20 rounded p-3">
          🛡️ <strong>Stay Safe:</strong> Never share personal information like your real name, 
          address, phone number, or social media accounts with strangers.
        </div>
      </div>
    </div>
  )
}
