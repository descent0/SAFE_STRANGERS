'use client'

import React, { useEffect, useState, useRef } from 'react'
import { FiVideo, FiMic, FiSearch } from 'react-icons/fi'
import { HiSparkles } from 'react-icons/hi2'
import { getStatusMessage, waitingMessages } from '../../const/statusMessages'

// Single accent color used throughout — swap this one value to re-theme the whole component.
const ACCENT = {
  text: 'text-indigo-300',
  border: 'border-indigo-300/70',
  bg: 'bg-indigo-400',
  glow: 'rgba(129,140,248,0.45)',
  glowSoft: 'rgba(129,140,248,0.25)',
}

export default function VideoWaiting({
  mode = 'video',
  connectionStatus = 'queued',
}) {
  const [tipIndex, setTipIndex] = useState(0)
  const [tipVisible, setTipVisible] = useState(true)
  const [dotCount, setDotCount] = useState(0)
  const rotateRef = useRef(null)

  // Auto-rotate tips with a fade out/in
  useEffect(() => {
    const rotate = () => {
      setTipVisible(false)
      window.setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % waitingMessages.length)
        setTipVisible(true)
      }, 350)
    }
    rotateRef.current = window.setInterval(rotate, 4200)
    return () => window.clearInterval(rotateRef.current)
  }, [])

  // Animated "Searching..." dots
  useEffect(() => {
    const id = window.setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4)
    }, 450)
    return () => window.clearInterval(id)
  }, [])

  const ModeIcon = mode === 'video' ? FiVideo : FiMic

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-6 text-center">
      {/* Ambient blobs: neutral grey + one accent glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[10%] -top-[15%] h-[60%] w-[60%] animate-blob-a rounded-full bg-slate-400/10 blur-[90px]" />
        <div className="absolute -right-[15%] top-[15%] h-[55%] w-[55%] animate-blob-b rounded-full bg-indigo-400/20 blur-[90px]" />
        <div className="absolute bottom-[-22%] left-[15%] h-[50%] w-[50%] animate-blob-c rounded-full bg-slate-500/10 blur-[85px]" />
      </div>

      <div className="relative z-10 w-full max-w-md text-left text-white">
        {/* Scanner: rotating sweep + pulse rings + orbiting particles, grayscale with one accent */}
        <div className="relative mx-auto mb-7 flex h-40 w-40 items-center justify-center">
          {/* Rotating conic sweep — accent only */}
          <div
            className="absolute inset-0 animate-spin-slow rounded-full opacity-80"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, ${ACCENT.glow} 40deg, transparent 110deg)`,
            }}
          />

          {/* Pulse rings: two neutral, one accent */}
          <span className="absolute inset-0 animate-ripple rounded-full border-2 border-white/25" />
          <span className="absolute inset-0 animate-ripple [animation-delay:0.9s] rounded-full border-2 border-white/15" />
          <span
            className={`absolute inset-0 animate-ripple [animation-delay:1.8s] rounded-full border-2 ${ACCENT.border}`}
            style={{ boxShadow: `0 0 18px 2px ${ACCENT.glowSoft}` }}
          />

          {/* Orbiting particles: two neutral, one accent */}
          <div className="absolute inset-0 animate-spin-slow">
            <span className="absolute left-1/2 top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-white/70" />
          </div>
          <div className="absolute inset-0 animate-spin-slow-reverse">
            <span className="absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/40" />
          </div>
          <div className="absolute inset-0 animate-spin-slower">
            <span
              className={`absolute left-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${ACCENT.bg}`}
              style={{ boxShadow: `0 0 12px 4px ${ACCENT.glow}` }}
            />
          </div>

          {/* Center icon badge, gently floating */}
          <div
            className="relative flex h-20 w-20 animate-float items-center justify-center rounded-full bg-white/[0.06] backdrop-blur-md"
            style={{ boxShadow: `0 0 28px 6px ${ACCENT.glowSoft}` }}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-slate-900/70 text-white shadow-inner">
              <ModeIcon className="h-7 w-7" />
            </div>
          </div>
        </div>

        <h2 className="mb-1 text-center text-2xl font-bold tracking-tight text-white">
          {getStatusMessage(connectionStatus)}
        </h2>

        {/* Animated searching indicator */}
        <div className={`mb-4 flex items-center justify-center gap-1.5 text-sm font-medium ${ACCENT.text}`}>
          <FiSearch className="h-4 w-4" />
          <span>Searching{'.'.repeat(dotCount)}<span className="invisible">...</span></span>
        </div>

        <p className="mb-5 text-center text-sm leading-6 text-slate-300">
          Your room is ready. We&apos;ll connect you to a partner as soon as one is available.
        </p>

        {/* Glassmorphism tip card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] p-2 shadow-2xl backdrop-blur-xl">
          <div className={`absolute inset-x-0 top-0 h-[2px] ${ACCENT.bg}`} />
          <p
            className={` text-sm leading-6 text-center text-slate-100 transition-opacity duration-300 ${
              tipVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {waitingMessages[tipIndex].trim()}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes ripple {
          0% { transform: scale(0.35); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .animate-ripple {
          animation: ripple 2.4s cubic-bezier(0.2, 0.6, 0.4, 1) infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-float {
          animation: float 3.2s ease-in-out infinite;
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 5s linear infinite;
        }
        .animate-spin-slow-reverse {
          animation: spin-slow 7s linear infinite reverse;
        }
        .animate-spin-slower {
          animation: spin-slow 9s linear infinite;
        }

        @keyframes blob-move-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(8%, 10%) scale(1.15); }
        }
        @keyframes blob-move-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-10%, 6%) scale(1.2); }
        }
        @keyframes blob-move-c {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(6%, -8%) scale(1.1); }
        }
        .animate-blob-a { animation: blob-move-a 8s ease-in-out infinite; }
        .animate-blob-b { animation: blob-move-b 10s ease-in-out infinite; }
        .animate-blob-c { animation: blob-move-c 12s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .animate-ripple,
          .animate-float,
          .animate-spin-slow,
          .animate-spin-slow-reverse,
          .animate-spin-slower,
          .animate-blob-a,
          .animate-blob-b,
          .animate-blob-c {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}