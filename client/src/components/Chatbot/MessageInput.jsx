import { useState } from 'react'
import { useChat } from './ChatContext'
import { MAX_MESSAGE_LENGTH, MAX_SENT_MESSAGES } from './types.js'

export default function MessageInput() {
  const [text, setText] = useState('')
  const { isDisabled, isLoading, messageCount, error, addMessage, setLoading, incrementCount, setError, clearError, messages } = useChat()

  const isRateLimited = messageCount >= MAX_SENT_MESSAGES
  const canSend = text.trim().length > 0 && text.length <= MAX_MESSAGE_LENGTH && !isDisabled && !isLoading

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH || isDisabled || isLoading) return

    // Clear any previous error
    if (error) clearError()

    // Add customer message
    const customerMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      sender: 'customer',
      content: trimmed,
      timestamp: new Date(),
    }
    addMessage(customerMessage)
    incrementCount()
    setText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e) => {
    const value = e.target.value
    if (value.length <= MAX_MESSAGE_LENGTH) {
      setText(value)
    }
  }

  return (
    <div className="flex-shrink-0 border-t border-gray-200 px-3 py-2">
      {isRateLimited && (
        <p className="text-xs text-red-500 mb-1 px-1">
          Anda telah mencapai had mesej. Sila lengkapkan borang secara manual atau hubungi kedai.
        </p>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isRateLimited ? 'Had mesej dicapai' : 'Taip mesej anda...'}
          disabled={isDisabled || isLoading}
          maxLength={MAX_MESSAGE_LENGTH}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
          aria-label="Mesej kepada pembantu pesanan"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Hantar mesej"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-orange-500 text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
      </div>
      {text.length > 0 && (
        <p className={`text-xs mt-1 px-1 ${text.length > MAX_MESSAGE_LENGTH * 0.9 ? 'text-orange-500' : 'text-gray-400'}`}>
          {text.length}/{MAX_MESSAGE_LENGTH}
        </p>
      )}
    </div>
  )
}
