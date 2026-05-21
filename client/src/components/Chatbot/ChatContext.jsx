import { createContext, useContext, useReducer, useCallback } from 'react'
import { MAX_MESSAGES, MAX_SENT_MESSAGES } from './types.js'

const ChatContext = createContext(null)

const WELCOME_MESSAGE = {
  id: 'welcome',
  sender: 'bot',
  content: 'Hai! Saya Pembantu Pesanan MyKek. Saya boleh bantu anda pilih saiz, perisa, tema kek dan banyak lagi. Apa yang anda ingin tahu?',
  timestamp: new Date(),
  suggestions: null,
}

const initialState = {
  messages: [],
  isOpen: false,
  isLoading: false,
  messageCount: 0,
  error: null,
  isDisabled: false,
  hasWelcomed: false,
}

function chatReducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_PANEL': {
      const isOpen = !state.isOpen
      // Add welcome message on first open
      if (isOpen && !state.hasWelcomed) {
        return {
          ...state,
          isOpen,
          hasWelcomed: true,
          messages: [WELCOME_MESSAGE],
        }
      }
      return { ...state, isOpen }
    }

    case 'ADD_MESSAGE': {
      const newMessages = [...state.messages, action.payload]
      // FIFO eviction when exceeding MAX_MESSAGES
      const trimmed = newMessages.length > MAX_MESSAGES
        ? newMessages.slice(newMessages.length - MAX_MESSAGES)
        : newMessages
      return { ...state, messages: trimmed }
    }

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload, isDisabled: !!action.payload }

    case 'INCREMENT_COUNT': {
      const newCount = state.messageCount + 1
      const isDisabled = newCount >= MAX_SENT_MESSAGES
      return { ...state, messageCount: newCount, isDisabled }
    }

    case 'CLEAR_ERROR':
      return { ...state, error: null, isDisabled: state.messageCount >= MAX_SENT_MESSAGES }

    default:
      return state
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)

  const addMessage = useCallback((message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message })
  }, [])

  const togglePanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_PANEL' })
  }, [])

  const setLoading = useCallback((loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading })
  }, [])

  const setError = useCallback((error) => {
    dispatch({ type: 'SET_ERROR', payload: error })
  }, [])

  const incrementCount = useCallback(() => {
    dispatch({ type: 'INCREMENT_COUNT' })
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const value = {
    ...state,
    addMessage,
    togglePanel,
    setLoading,
    setError,
    incrementCount,
    clearError,
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

export { chatReducer, initialState }
export default ChatContext
