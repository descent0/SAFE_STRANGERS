
import { Suspense } from 'react'
import { ChatContent } from '../components/chat/ChatV2'

export default function Chat() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">Loading chat...</div>}>
      <ChatContent />
    </Suspense>
  )
}