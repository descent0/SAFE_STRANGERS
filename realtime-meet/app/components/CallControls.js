'use client'

export default function CallControls({
  mode,
  isMatched,
  isAudioMuted,
  isVideoOff,
  onToggleAudio,
  onToggleVideo,
  onSkip,
  onLeave,
  onReaction
}) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-3 bg-gray-900/90 backdrop-blur-sm px-4 py-3 rounded-full border border-gray-700">

        {/* Audio */}
        <button
          onClick={onToggleAudio}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
            isAudioMuted
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isAudioMuted ? '🔇' : '🎤'}
        </button>

        {/* Video */}
        {mode === 'video' && (
          <button
            onClick={onToggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
              isVideoOff
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isVideoOff ? '📷❌' : '📷'}
          </button>
        )}

        {/* Reactions */}
        <button
          onClick={() => onReaction?.('❤️')}
          className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
        >
          ❤️
        </button>

        <button
          onClick={() => onReaction?.('😂')}
          className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
        >
          😂
        </button>

        <button
          onClick={() => onReaction?.('👍')}
          className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
        >
          👍
        </button>

        {/* Skip */}
        {isMatched && (
          <button
            onClick={onSkip}
            className="w-12 h-12 rounded-full bg-yellow-600 hover:bg-yellow-700 flex items-center justify-center"
          >
            ⏭️
          </button>
        )}

        {/* Leave */}
        <button
          onClick={onLeave}
          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center"
        >
          📞
        </button>
      </div>
    </div>
  )
}