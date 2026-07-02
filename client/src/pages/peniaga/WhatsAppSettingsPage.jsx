import { useState, useEffect, useRef } from 'react'
import MerchantLayout from '../../components/MerchantLayout'
import api from '../../services/api'

export default function WhatsAppSettingsPage() {
  const [status, setStatus] = useState('initializing')
  const [qrCode, setQrCode] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState(null)
  const prevStatusRef = useRef(null)

  // Poll connection status every 5 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/api/peniaga/whatsapp/status')
        const newStatus = res.data.data.status
        
        // Show success message when transitioning to connected
        if (prevStatusRef.current && prevStatusRef.current !== 'connected' && newStatus === 'connected') {
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 5000)
        }
        
        prevStatusRef.current = newStatus
        setStatus(newStatus)
      } catch {
        setStatus('disconnected')
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fetch QR code when status is qr_required, auto-refresh every 60 seconds
  useEffect(() => {
    if (status !== 'qr_required') {
      setQrCode(null)
      return
    }

    const fetchQR = async () => {
      try {
        const res = await api.get('/api/peniaga/whatsapp/qr')
        setQrCode(res.data.data.qr)
      } catch {
        setQrCode(null)
      }
    }

    fetchQR()
    const interval = setInterval(fetchQR, 60000)
    return () => clearInterval(interval)
  }, [status])

  const handleReset = async () => {
    if (!window.confirm('Adakah anda pasti mahu menetapkan semula sambungan WhatsApp? Sesi semasa akan dipadamkan dan kod QR baharu akan dijana untuk diimbas.')) {
      return
    }

    setResetting(true)
    setResetError(null)
    try {
      const res = await api.post('/api/peniaga/whatsapp/reset')
      if (res.data.ralat) {
        setResetError(res.data.mesej)
      } else {
        setStatus('initializing')
        setQrCode(null)
      }
    } catch (err) {
      setResetError(
        err.response?.data?.mesej || 
        'Gagal menghubungi pelayan untuk menetapkan semula sambungan.'
      )
    } finally {
      setResetting(false)
    }
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            Tersambung
          </span>
        )
      case 'disconnected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            Terputus
          </span>
        )
      case 'qr_required':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            Menunggu Imbasan QR
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
            Memulakan...
          </span>
        )
    }
  }

  return (
    <MerchantLayout title="Tetapan WhatsApp" subtitle="Urus sambungan WhatsApp untuk notifikasi pelanggan.">
      <div className="max-w-2xl space-y-6">
        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="text-sm font-medium text-green-800">Sambungan Berjaya</p>
          </div>
        )}

        {/* Connection Status Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">Status Sambungan</h2>
              <p className="text-xs text-gray-500">Status semasa sambungan WhatsApp anda.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Status:</span>
              {getStatusBadge()}
            </div>
            
            <button
              onClick={handleReset}
              disabled={resetting}
              className="inline-flex items-center justify-center px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
            >
              {resetting ? 'Menetapkan semula...' : 'Tetapkan Semula Sambungan'}
            </button>
          </div>

          {resetError && (
            <p className="mt-3 text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg p-2">
              {resetError}
            </p>
          )}
        </div>

        {/* QR Code Card - shown when QR scan is required */}
        {status === 'qr_required' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-orange-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">Imbas Kod QR</h2>
                <p className="text-xs text-gray-500">Buka WhatsApp di telefon anda dan imbas kod QR di bawah untuk menyambung.</p>
              </div>
            </div>

            <div className="flex justify-center py-4">
              {qrCode ? (
                <img
                  src={qrCode}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64 border border-gray-200 rounded-lg"
                />
              ) : (
                <div className="w-64 h-64 border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
                  <p className="text-sm text-gray-400">Memuatkan kod QR...</p>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400 text-center mt-2">
              Kod QR akan dimuat semula secara automatik setiap 60 saat.
            </p>
          </div>
        )}
      </div>
    </MerchantLayout>
  )
}
