import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import Header from '../../components/Header'
import api from '../../services/api'

export default function QRPaymentPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // Get order data passed from the form (for new orders)
  const orderState = location.state || {}
  const { orderPayload, uploadedFile, aiImageUrl, aiPrompt } = orderState
  const isNewOrder = id === 'baharu' && orderPayload

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setError('Hanya fail JPEG atau PNG dibenarkan.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Saiz fail tidak boleh melebihi 5MB.')
      return
    }
    setError('')
    setProofFile(file)
    setProofPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!proofFile) {
      setError('Sila muat naik bukti pembayaran.')
      return
    }

    setUploading(true)
    setError('')

    try {
      let orderId = id

      // If this is a new order, create it first
      if (isNewOrder) {
        const res = await api.post('/api/pelanggan/tempahan', orderPayload)
        orderId = res.data.tempahanId || res.data.data?.tempahanId || res.data.id

        if (!orderId) {
          setError('Gagal mencipta tempahan.')
          setUploading(false)
          return
        }

        // Save uploaded cake reference image if provided
        if (uploadedFile) {
          try {
            const fd = new FormData()
            fd.append('imej', uploadedFile)
            fd.append('tempahanId', orderId)
            await api.post('/api/pelanggan/tempahan/muat-naik-imej', fd, {
              headers: { 'Content-Type': 'multipart/form-data' }
            })
          } catch { /* non-blocking */ }
        }

        // Save AI-generated image if provided
        if (aiImageUrl) {
          try {
            await api.post('/api/pelanggan/tempahan/simpan-imej-ai', {
              tempahanId: orderId,
              urlImej: aiImageUrl,
              promptAI: aiPrompt,
            })
          } catch { /* non-blocking */ }
        }
      }

      // Upload receipt
      try {
        const fd = new FormData()
        fd.append('imej', proofFile)
        fd.append('tempahanId', orderId)
        await api.post('/api/pelanggan/tempahan/muat-naik-resit', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } catch { /* non-blocking */ }

      navigate('/pelanggan/tempahan')
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal menghantar tempahan. Sila cuba lagi.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 p-6 md:p-10" style={{ backgroundColor: '#FFF5EE' }}>
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <h1 className="text-xl font-bold text-gray-800 mb-2">Bayaran</h1>
            <p className="text-sm text-gray-600 mb-6">
              Sila imbas kod QR untuk membuat bayaran
            </p>

            {/* QR Code Image */}
            <div className="flex justify-center mb-4">
              <img
                src="/qr-payment.jpeg"
                alt="Kod QR Bayaran"
                className="w-64 h-64 rounded-xl border border-gray-200 object-contain"
              />
            </div>

            {/* Order Info */}
            <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 mb-6">
              <p className="text-sm text-gray-600">
                {isNewOrder ? 'Tempahan Baharu' : `Tempahan #${id}`}
              </p>
            </div>

            {/* Upload Proof of Payment */}
            <div className="text-left mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bukti Pembayaran
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Sila muat naik tangkap layar (screenshot) bukti pembayaran anda.
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50"
              />
              {proofPreview && (
                <div className="mt-3">
                  <img
                    src={proofPreview}
                    alt="Bukti Pembayaran"
                    className="w-full max-w-xs rounded-lg border border-gray-200 mx-auto"
                  />
                </div>
              )}
              {error && (
                <p className="text-xs text-red-500 mt-2">{error}</p>
              )}
            </div>

            {/* Done Button */}
            <button
              onClick={handleSubmit}
              disabled={uploading || !proofFile}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors text-sm"
            >
              {uploading ? 'Menghantar...' : 'Sudah Bayar'}
            </button>

            <p className="text-xs text-gray-400 mt-4">
              Selepas pembayaran disahkan, status tempahan akan dikemaskini oleh peniaga.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
