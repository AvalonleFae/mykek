import { useEffect, useRef, useCallback } from 'react'

const EXPIRY_HOURS = 24

export default function useFormPersistence(key, formData, setFormData) {
  const debounceTimer = useRef(null)
  const isRestored = useRef(false)

  // Restore form data on mount
  useEffect(() => {
    if (isRestored.current) return
    isRestored.current = true

    try {
      const stored = localStorage.getItem(key)
      if (!stored) return

      const { data, timestamp } = JSON.parse(stored)
      const now = Date.now()
      const hoursElapsed = (now - timestamp) / (1000 * 60 * 60)

      if (hoursElapsed >= EXPIRY_HOURS) {
        localStorage.removeItem(key)
        return
      }

      if (data && typeof data === 'object') {
        setFormData(data)
      }
    } catch {
      localStorage.removeItem(key)
    }
  }, [key, setFormData])

  // Save form data on change (debounced 2 seconds)
  useEffect(() => {
    if (!isRestored.current) return

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    debounceTimer.current = setTimeout(() => {
      try {
        const payload = {
          data: formData,
          timestamp: Date.now(),
        }
        localStorage.setItem(key, JSON.stringify(payload))
      } catch {
        // localStorage might be full, silently fail
      }
    }, 2000)

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [key, formData])

  // Clear stored data (call after successful submission)
  const clearPersistedData = useCallback(() => {
    localStorage.removeItem(key)
  }, [key])

  return { clearPersistedData }
}
