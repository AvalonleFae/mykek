import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../../components/Header'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import SuccessMessage from '../../components/shared/SuccessMessage'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import api from '../../services/api'

const STATUS_COLORS = {
  'Menunggu Bayaran': 'bg-yellow-100 text-yellow-700',
  'Dalam Proses': 'bg-blue-100 text-blue-700',
  'Sedang Dibakar': 'bg-orange-100 text-orange-700',
  'Sedia Diambil': 'bg-green-100 text-green-700',
  'Selesai': 'bg-green-100 text-green-700',
  'Dibatalkan': 'bg-red-100 text-red-700',
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [order, setOrder] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/api/pelanggan/tempahan/${id}`)
      setOrder(res.data.data || res.data)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan butiran tempahan.')
    } finally {
      setLoading(false)
    }
  }

  const canCancel = () => {
    if (!order) return false
    const status = order.status || ''
    // Can cancel if status is pending payment or in process
    return ['Menunggu Bayaran', 'Dalam Proses'].includes(status)
  }

  const handleCancel = async () => {
    setShowConfirm(false)
    setCancelling(true)
    setError('')
    try {
      await api.put(`/api/pelanggan/tempahan/${id}/batal`)
      setSuccess('Tempahan berjaya dibatalkan.')
      setOrder((prev) => (prev ? { ...prev, status: 'Dibatalkan' } : prev))
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal membatalkan tempahan.')
    } finally {
      setCancelling(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ms-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 p-6 md:p-10" style={{ backgroundColor: '#FFF5EE' }}>
        <div className="max-w-2xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate('/pelanggan/tempahan')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-500 mb-6 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Kembali ke Senarai Tempahan
          </button>

          <div className="bg-white rounded-2xl shadow-md p-6">
            {loading ? (
              <LoadingSpinner />
            ) : error && !order ? (
              <ErrorMessage message={error} />
            ) : order ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-bold text-gray-800">
                      Tempahan #{order.id || order.tempahanId}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(order.tarikhTempahan || order.createdAt)}
                    </p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status || 'Tidak Diketahui'}
                  </span>
                </div>

                {error && <ErrorMessage message={error} />}
                {success && <SuccessMessage message={success} />}

                {/* Order Specs */}
                {(order.butiran || order.details || []).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Spesifikasi Kek</h3>
                    <div className="space-y-2">
                      {(order.butiran || order.details || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                          <div>
                            <p className="text-sm text-gray-600">{item.namaKategori || item.categoryName || '-'}</p>
                            <p className="text-sm font-medium text-gray-800">{item.namaPilihan || item.optionName || '-'}</p>
                          </div>
                          <p className="text-sm font-medium text-orange-600">
                            RM {Number(item.harga || item.price || 0).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Images */}
                {(order.imej || order.images || []).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Imej Rujukan</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {(order.imej || order.images || []).map((img, idx) => (
                        <img
                          key={idx}
                          src={img.url || img.imageUrl || img}
                          alt={`Rujukan ${idx + 1}`}
                          className="w-full rounded-xl border border-gray-200"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Delivery Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Maklumat Penghantaran</h3>
                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Kaedah:</span>{' '}
                      {order.kaedahPenghantaran || '-'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Tarikh:</span>{' '}
                      {formatDate(order.tarikhAmbil || order.pickupDate)}
                    </p>
                    {order.alamatPenghantaran && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Alamat:</span>{' '}
                        {order.alamatPenghantaran}
                      </p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {order.catatan && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Catatan</h3>
                    <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-xl">{order.catatan}</p>
                  </div>
                )}

                {/* Total */}
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Jumlah Harga:</span>
                    <span className="text-lg font-bold text-orange-600">
                      RM {Number(order.jumlahHarga || order.totalPrice || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Status Bayaran:</span>{' '}
                    {order.statusBayaran || order.paymentStatus || 'Belum Dibayar'}
                  </p>
                </div>

                {/* Cancel Button */}
                {canCancel() && (
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={cancelling}
                    className="w-full py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold rounded-full transition-colors text-sm"
                  >
                    {cancelling ? 'Membatalkan...' : 'Batal Tempahan'}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Batal Tempahan"
        message="Adakah anda pasti ingin membatalkan tempahan ini? Tindakan ini tidak boleh dibuat semula."
        onConfirm={handleCancel}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}
