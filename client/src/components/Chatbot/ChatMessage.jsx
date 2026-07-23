import SuggestionCard from './SuggestionCard'

export default function ChatMessage({ message, onFormAction }) {
  const isCustomer = message.sender === 'customer'

  return (
    <div className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] space-y-2`}>
        <div
          className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
            isCustomer
              ? 'bg-orange-500 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-800 rounded-bl-md'
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  )
}
