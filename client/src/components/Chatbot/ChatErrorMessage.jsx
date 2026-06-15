import RetryButton from './RetryButton'

export default function ChatErrorMessage({ message, onRetry }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] space-y-2">
        <div className="px-3 py-2 rounded-2xl rounded-bl-md text-sm bg-red-50 text-red-600 border border-red-200">
          {message}
        </div>
        {onRetry && <RetryButton onRetry={onRetry} />}
      </div>
    </div>
  )
}
