/**
 * ChatWidget — Main chatbot widget component.
 * Wraps ChatProvider, ChatButton, and ChatPanel.
 * Handles sending messages to the API and processing responses.
 */

import { useEffect, useCallback, useRef } from 'react'
import { ChatProvider, useChat } from './ChatContext'
import ChatButton from './ChatButton'
import ChatPanel from './ChatPanel'
import { sendMessage } from './chatbotApi'
import { MAX_SENT_MESSAGES } from './types.js'

/**
 * Inner component that handles chatbot logic within the ChatProvider context.
 */
function ChatWidgetInner({ formState, categories, onFormAction }) {
  const {
    messages,
    isLoading,
    messageCount,
    addMessage,
    setLoading,
    setError,
    clearError,
  } = useChat()

  const prevMessageCountRef = useRef(0)

  // Build form context from current form state
  const buildFormContext = useCallback(() => {
    const pilihanDipilih = Object.entries(formState.selections || {}).map(
      ([kategoriId, pilihanId]) => ({
        kategoriId: Number(kategoriId),
        pilihanId: Number(pilihanId),
      })
    )

    // Calculate total price
    let jumlahHarga = 0
    if (categories) {
      categories.forEach((cat) => {
        const catId = cat.id || cat.kategoriId
        const selectedOptionId = formState.selections?.[catId]
        if (selectedOptionId) {
          const option = (cat.pilihan || cat.options || []).find(
            (o) => (o.id || o.pilihanId) === selectedOptionId
          )
          if (option) {
            jumlahHarga += Number(option.harga || option.hargaTambahan || option.price || 0)
          }
        }
      })
    }

    // Determine empty fields
    const medanKosong = []
    if (categories) {
      categories.forEach((cat) => {
        const catId = cat.id || cat.kategoriId
        if (!formState.selections?.[catId]) {
          medanKosong.push(cat.nama || cat.name || `Kategori ${catId}`)
        }
      })
    }
    if (!formState.tarikhAmbil) medanKosong.push('Tarikh Ambil')
    if (formState.kaedahPenghantaran === 'delivery' && !formState.alamatPenghantaran) {
      medanKosong.push('Alamat Penghantaran')
    }

    return {
      pilihanDipilih,
      kaedahPenghantaran: formState.kaedahPenghantaran === 'delivery' ? 'Penghantaran' : 'Ambil Sendiri',
      tarikhAmbil: formState.tarikhAmbil || null,
      jumlahHarga,
      medanKosong,
    }
  }, [formState, categories])

  // Build history from messages (last 10)
  const buildHistory = useCallback(() => {
    const relevantMessages = messages
      .filter((m) => m.id !== 'welcome')
      .slice(-10)
      .map((m) => ({
        peranan: m.sender,
        kandungan: m.content,
      }))
    return relevantMessages
  }, [messages])

  // Watch for new customer messages and send to API
  useEffect(() => {
    const customerMessages = messages.filter((m) => m.sender === 'customer')
    const currentCount = customerMessages.length

    if (currentCount > prevMessageCountRef.current && !isLoading) {
      const lastCustomerMessage = customerMessages[customerMessages.length - 1]
      if (lastCustomerMessage) {
        handleSendToApi(lastCustomerMessage.content)
      }
    }

    prevMessageCountRef.current = currentCount
  }, [messages])

  const handleSendToApi = async (mesej) => {
    setLoading(true)
    clearError()

    try {
      const sejarah = buildHistory()
      // Remove the last customer message from history since it's the current message
      const historyWithoutCurrent = sejarah.slice(0, -1)
      const konteksBoring = buildFormContext()

      const response = await sendMessage({
        mesej,
        sejarah: historyWithoutCurrent,
        konteksBoring,
      })

      // Add bot response message
      const botMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        sender: 'bot',
        content: response.balasan,
        timestamp: new Date(),
        suggestions: null,
      }
      addMessage(botMessage)
    } catch (error) {
      let errorMessage = 'Maaf, pembantu pesanan tidak tersedia buat masa ini. Sila cuba lagi sebentar.'

      if (error.message === 'TIMEOUT') {
        errorMessage = 'Maaf, permintaan mengambil masa terlalu lama. Sila cuba lagi.'
      } else if (error.message === 'NETWORK_ERROR') {
        errorMessage = 'Sambungan rangkaian terputus. Sila semak sambungan internet anda.'
      }

      // Add error as bot message
      const errorBotMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'bot',
        content: errorMessage,
        timestamp: new Date(),
      }
      addMessage(errorBotMessage)
    } finally {
      setLoading(false)
    }
  }

  // Handle form action from suggestion cards
  const handleFormAction = useCallback((action) => {
    if (onFormAction && action) {
      onFormAction(action)
    }
  }, [onFormAction])

  return (
    <>
      <ChatButton />
      <ChatPanel onFormAction={handleFormAction} />
    </>
  )
}

/**
 * ChatWidget — Exported component that wraps everything in ChatProvider.
 * @param {Object} props
 * @param {Object} props.formState - Current order form state
 * @param {Array} props.categories - Active cake spec categories
 * @param {Function} props.onFormAction - Callback to apply form actions
 */
export default function ChatWidget({ formState, categories, onFormAction }) {
  return (
    <ChatProvider>
      <ChatWidgetInner
        formState={formState}
        categories={categories}
        onFormAction={onFormAction}
      />
    </ChatProvider>
  )
}
