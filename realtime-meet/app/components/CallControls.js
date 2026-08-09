'use client'

import {
  FiHeart,
  FiMic,
  FiMicOff,
  FiPhoneOff,
  FiSkipForward,
  FiSmile,
  FiThumbsUp,
  FiVideo,
  FiVideoOff,
} from 'react-icons/fi'

export default function CallControls({
  mode,
  isMatched,
  isAudioMuted,
  isVideoOff,
  onToggleAudio,
  onToggleVideo,
  onSkip,
  onLeave,
  onReaction,
}) {
  return (
    <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-b-[1.75rem] px-3 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:px-4 sm:py-2">
      <button
        onClick={onToggleAudio}
        className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${
          isAudioMuted
            ? 'border-rose-400/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
            : 'border-white/10 bg-white/8 text-white/90 hover:bg-white/12'
        }`}
        aria-label="Toggle audio"
      >
        {isAudioMuted ? <FiMicOff size={18} /> : <FiMic size={18} />}
      </button>

      {mode === 'video' && (
        <button
          onClick={onToggleVideo}
          className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${
            isVideoOff
              ? 'border-rose-400/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
              : 'border-white/10 bg-white/8 text-white/90 hover:bg-white/12'
          }`}
          aria-label="Toggle video"
        >
          {isVideoOff ? <FiVideoOff size={18} /> : <FiVideo size={18} />}
        </button>
      )}

      <div className="hidden h-8 w-px bg-white/10 sm:block" />

      <button
        onClick={() => onReaction?.('❤️')}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8 text-xl transition hover:bg-white/12"
        aria-label="Send heart reaction"
      >
        <FiHeart size={18} />
      </button>

      <button
        onClick={() => onReaction?.('😂')}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8 text-xl transition hover:bg-white/12"
        aria-label="Send laugh reaction"
      >
        <FiSmile size={18} />
      </button>

      <button
        onClick={() => onReaction?.('👍')}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/8 text-xl transition hover:bg-white/12"
        aria-label="Send thumbs up reaction"
      >
        <FiThumbsUp size={18} />
      </button>

      {isMatched && (
        <button
          onClick={onSkip}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-100 transition hover:bg-amber-400/20"
          aria-label="Skip partner"
          title='Skip Partner'
        >
          <FiSkipForward size={18} />
        </button>
      )}

      <button
        onClick={onLeave}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20 transition hover:brightness-110"
        aria-label="Leave chat"
        title="Leave chat"
      >
        <FiPhoneOff size={18} />
      </button>
    </div>
  )
}
