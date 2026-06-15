export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2" aria-label="Pembantu sedang menaip">
      <div className="flex items-center gap-1 bg-gray-100 px-3 py-2 rounded-2xl rounded-bl-md">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
