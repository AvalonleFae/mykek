import { useRef, useEffect } from 'react'
import { useChat } from './ChatContext'
import ChatMessage from './ChatMessage'

export default function MessageList({ onFormAction }) {
  const { messages } = useChat()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" role="log" aria-live="polite">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} onFormAction={onFormAction} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
