import { useChat } from './ChatContext'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import TypingIndicator from './TypingIndicator'
import { PANEL_MAX_WIDTH, PANEL_MAX_HEIGHT, MOBILE_BREAKPOINT } from './types.js'

export default function ChatPanel({ onFormAction }) {
  const { isOpen, isLoading, togglePanel } = useChat()

  if (!isOpen) return null

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 sm:hidden"
        onClick={togglePanel}
        aria-hidden="true"
      />

      {/* Chat panel */}
      <div
        className="fixed z-50 bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden border border-gray-200
          bottom-0 left-0 right-0 top-0 rounded-none
          sm:bottom-20 sm:right-4 sm:left-auto sm:top-auto sm:rounded-2xl"
        style={{
          maxWidth: typeof window !== 'undefined' && window.innerWidth >= MOBILE_BREAKPOINT
            ? `${PANEL_MAX_WIDTH}px`
            : '100%',
          maxHeight: typeof window !== 'undefined' && window.innerWidth >= MOBILE_BREAKPOINT
            ? `${PANEL_MAX_HEIGHT}px`
            : '100%',
          width: typeof window !== 'undefined' && window.innerWidth >= MOBILE_BREAKPOINT
            ? `${PANEL_MAX_WIDTH}px`
            : '100%',
          height: typeof window !== 'undefined' && window.innerWidth >= MOBILE_BREAKPOINT
            ? `${PANEL_MAX_HEIGHT}px`
            : '100%',
        }}
        role="dialog"
        aria-label="Pembantu Pesanan"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-orange-500 text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
            <span className="font-semibold text-sm">Pembantu Pesanan</span>
          </div>
          <button
            onClick={togglePanel}
            aria-label="Tutup chat"
            className="p-1 hover:bg-orange-600 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <MessageList onFormAction={onFormAction} />

        {/* Typing indicator */}
        {isLoading && <TypingIndicator />}

        {/* Input */}
        <MessageInput />
      </div>
    </>
  )
}
