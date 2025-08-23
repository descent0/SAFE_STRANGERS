import { useState, useEffect } from 'react'

export default function FloatingReactions({ socket, roomId }) {
  const [reactions, setReactions] = useState([])

  useEffect(() => {
    if (!socket) return

    socket.on('reaction', (reactionData) => {
      const reaction = {
        id: Date.now() + Math.random(),
        emoji: reactionData.emoji,
        user: reactionData.userName,
        x: Math.random() * 80 + 10, // Random position 10-90%
        y: 100
      }
      
      setReactions(prev => [...prev, reaction])
      
      // Remove reaction after animation
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== reaction.id))
      }, 3000)
    })

    return () => {
      socket.off('reaction')
    }
  }, [socket])

  const sendReaction = (emoji) => {
    if (socket) {
      socket.emit('reaction', { roomId, emoji, userName: 'You' })
    }
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute text-4xl animate-bounce pointer-events-none"
          style={{
            left: `${reaction.x}%`,
            bottom: `${reaction.y}%`,
            animation: `float-up 3s ease-out forwards`
          }}
        >
          {reaction.emoji}
        </div>
      ))}
      
      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-100px) scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-200px) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
