'use client'

import { useEffect, useRef, useCallback } from 'react'
import ChatWaiting from './waiting/ChatWaiting'
import { FiSend } from 'react-icons/fi'
import { getStatusMessage } from '../const/statusMessages'

export default function ChatPanel({
  partner,
  sessionId,
  isConnected,
  messages = [],
  currentMessage = '',
  onChangeMessage,
  onSendMessage,
  onQuickReaction,
  isPartnerTyping,
  connectionStatus,
}) {
  const feedRef = useRef(null)
  const partnerName = partner?.name || 'Stranger'

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [messages, isPartnerTyping])
  



  return (
    <div className="flex h-full min-h-[30rem] flex-col bg-slate-950/80 text-white">
      <div className="border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Messages</div>
         
            <div className="mt-1">
              {isConnected ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className={`h-2 w-2 rounded-full bg-emerald-400`} />
                  Connected
                  {isPartnerTyping && <span className="text-sky-300">typing...</span>}
                </div>
              ) : (
                 <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className={`h-2 w-2 rounded-full bg-yellow-400`} />
                   {getStatusMessage(connectionStatus)}
                </div>
              )}
            </div>
          </div>

        </div>

  
      </div>
 
      <div ref={feedRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
        {isConnected?(
        messages.length === 0 ? (
          <div className="flex h-full min-h-[18rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-white/5 px-6 text-center text-slate-400">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl">
              💬
            </div>
            <div className="text-lg font-medium text-white">Start the conversation</div>
            <div className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
              Say hello, share a thought, or send a quick reaction to break the ice.
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isYou = message.sender === 'You'

            return (
              <div key={message.id} className={`flex ${isYou ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-[1.35rem] px-4 py-3 shadow-lg ${isYou ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white' : 'border border-white/10 bg-white/8 text-white/90'}`}>
                  <div className="mb-1 text-[10px] uppercase tracking-[0.22em] text-white/60">
                    {isYou ? 'You' : partnerName}
                  </div>
                  <div className="text-sm leading-6">{message.text}</div>
                </div>
              </div>
            )
          })
        )
      ):(
       <ChatWaiting
                  connectionStatus={connectionStatus}
                />
      )}
   
      </div>

      <div className="border-t border-white/10 bg-slate-950/90 p-3">
        <div className="flex gap-3 rounded-[1.35rem] border border-white/10 bg-white/5 p-1 items-center shadow-inner shadow-black/20">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/90 transition hover:bg-white/15"
            onClick={() => onQuickReaction?.('👋')}
            aria-label="Send wave"
          >
            👋
          </button>

          <input
            type="text"
            value={currentMessage}
            onChange={onChangeMessage}
            onKeyDown={(event) => event.key === 'Enter' && onSendMessage?.()}
            placeholder={isConnected ? 'Write a message here' : 'Waiting for a match'}
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
            disabled={!isConnected}
          />

          <button
            type="button"
            onClick={onSendMessage}
            disabled={!isConnected || !currentMessage.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
            title="Send message"
          >
            <FiSend size={16} />
          </button>
        </div>

       
      </div>
    </div>
  )
}
