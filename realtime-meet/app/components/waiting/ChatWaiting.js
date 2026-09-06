'use client'

import React from 'react'
import { FiMessageCircle } from 'react-icons/fi'
import { getStatusMessage } from '../../const/statusMessages'

// Same accent used in VideoWaiting — indigo while searching, emerald once matched
// (kept as a real status signal, not decoration).
const STATE = {
  matched: {
    bar: 'bg-emerald-300',
    glow: 'rgba(52,211,153,0.35)',
    text: 'text-emerald-300',
  },
  default: {
    bar: 'bg-indigo-300',
    glow: 'rgba(129,140,248,0.35)',
    text: 'text-indigo-300',
  },
}

// Chat icon inside a circle avatar, paired with a horizontal indeterminate
// loader bar that slides back and forth beneath the status text.
export default function ChatWaiting({ connectionStatus = 'queued' }) {
  const state = connectionStatus === 'matched' ? STATE.matched : STATE.default

  return (
    <div className="inline-flex items-center gap-2.5">
      {/* Icon in a circle, subtle glow */}
      <div
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] backdrop-blur-md"
        style={{ boxShadow: `0 0 10px 1px ${state.glow}` }}
      >
        <FiMessageCircle className="h-4 w-4 text-white/85" />
      </div>

      <div className="flex flex-col gap-1">
        <span className={`text-xs font-semibold tracking-wide ${state.text}`}>
          {getStatusMessage(connectionStatus)}
        </span>

        {/* Horizontal indeterminate loader track */}
        <span className="relative block h-1 w-24 overflow-hidden rounded-full bg-white/10">
          <span
            className={`absolute inset-y-0 w-1/2 animate-chatwaiting-slide rounded-full ${state.bar}`}
          />
        </span>
      </div>

      <style>{`
        @keyframes chatwaiting-slide {
          0% { left: -50%; }
          100% { left: 100%; }
        }
        .animate-chatwaiting-slide {
          animation: chatwaiting-slide 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-chatwaiting-slide {
            animation: none !important;
            left: 0;
          }
        }
      `}</style>
    </div>
  )
}

// Optional: fills the blank message-list area while no partner has joined yet.
export function ChatEmptyState({ connectionStatus = 'queued' }) {
  const state = connectionStatus === 'matched' ? STATE.matched : STATE.default

  return (
    <div className="flex h-full min-h-[280px] w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] backdrop-blur-md"
        style={{ boxShadow: `0 0 14px 2px ${state.glow}` }}
      >
        <FiMessageCircle className="h-6 w-6 text-white/85" />
      </div>

      <div className="w-full max-w-[180px]">
        <p className="mb-2 text-sm font-medium text-white">
          {getStatusMessage(connectionStatus)}
        </p>
        <span className="relative block h-1 w-full overflow-hidden rounded-full bg-white/10">
          <span
            className={`absolute inset-y-0 w-1/2 animate-chatwaiting-slide rounded-full ${state.bar}`}
          />
        </span>
        <p className="mt-3 text-xs text-slate-400">
          Messages will show up here once you&apos;re connected.
        </p>
      </div>

      <style>{`
        @keyframes chatwaiting-slide {
          0% { left: -50%; }
          100% { left: 100%; }
        }
        .animate-chatwaiting-slide {
          animation: chatwaiting-slide 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-chatwaiting-slide {
            animation: none !important;
            left: 0;
          }
        }
      `}</style>
    </div>
  )
}