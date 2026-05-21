import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MerchantLayout from '../../components/MerchantLayout'
import Pagination from '../../components/shared/Pagination'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import SuccessMessage from '../../components/shared/SuccessMessage'
import api from '../../services/api'

const ORDER_STATUSES = [
  'Menunggu Pengesahan',
  'Diterima',
  'Ditolak',
  'Dibatalkan',
  'Sedang Diproses',
  'Sedang Dihias',
  'Sedia untuk Diambil/Dihantar',
  'Selesai',
]

const PAYMENT_STATUSES = [
  'Belum Dibayar',
  'Deposit Dibayar',
  'Telah Dibayar',
]

function getStatusColor(status) {
  switch (status) {
    case 'Menunggu Pengesahan': return 'bg-yellow-100 text-yellow-800'
    case 'Diterima': return 'bg-blue-100 text-blue-800'
    case 'Ditolak': return 'bg-red-100 text-red-800'
    case 'Dibatalkan': return 'bg-gray-100 text-gray-800'
    case 'Sedang Diproses': return 'bg-indigo-100 text-indigo-800'
    case 'Sedang Dihias': return 'bg-purple-100 text-purple-800'
    case 'Sedia untuk Diambil/Dihantar': return 'bg-green-100 text-green-800'
    case 'Selesai': return 'bg-emerald-100 text-emerald-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function OrderManagementPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [rejectModal, setRejectModal] = useState({ open: false, orderId: null })
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page: currentPage }
      if (statusFilter) params.status = statusFilter
      if (paymentFilter) params.statusBayaran = paymentFilter

      const res = await api.get('/api/peniaga/tempahan', { params })
      setOrders(res.data.data || [])
      setTotalPages(res.data.jumlahMukaSurat || 1)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan senarai tempahan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [currentPage, statusFilter, paymentFilter])

  const handleAccept = async (orderId) => {
    setActionLoading(true)
    setError('')
    try {
      await api.put(`/api/peniaga/tempahan/${orderId}/terima`)
      setSuccess('Tempahan berjaya diterima.')
      fetchOrders()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal menerima tempahan.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Sila masukkan sebab penolakan.')
      return
    }
    setActionLoading(true)
    setError('')
    try {
      await api.put(`/api/peniaga/tempahan/${rejectModal.orderId}/tolak`, {
        sebabTolak: rejectReason.trim(),
      })
      setSuccess('Tempahan berjaya ditolak.')
      setRejectModal({ open: false, orderId: null })
      setRejectReason('')
      fetchOrders()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal menolak tempahan.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <MerchantLayout title="Senarai Tempahan" subtitle="Urus semua tempahan pelanggan anda.">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="">Semua Status</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1) }}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="">Semua Status Bayaran</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <SuccessMessage message={success} />
      <ErrorMessage message={error} />

      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-8 text-center text-gray-500">
          Tiada tempahan ditemui.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Pelanggan</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Tarikh</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Jumlah</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.tempahanId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium">#{order.tempahanId}</td>
                  <td className="px-6 py-4">{order.namaPelanggan || '-'}</td>
                  <td className="px-6 py-4">
                    {order.tarikhTempahan ? new Date(order.tarikhTempahan).toLocaleDateString('ms-MY') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">RM {Number(order.jumlahHarga || 0).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/peniaga/tempahan/${order.tempahanId}`)}
                        className="px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition-colors"
                      >
                        Lihat
                      </button>
                      {order.status === 'Menunggu Pengesahan' && (
                        <>
                          <button
                            onClick={() => handleAccept(order.tempahanId)}
                            disabled={actionLoading}
                            className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors disabled:opacity-50"
                          >
                            Terima
                          </button>
                          <button
                            onClick={() => setRejectModal({ open: true, orderId: order.tempahanId })}
                            disabled={actionLoading}
                            className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50"
                          >
                            Tolak
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRejectModal({ open: false, orderId: null })}></div>
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Tolak Tempahan</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Masukkan sebab penolakan..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none h-32"
              maxLength={500}
            />
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => { setRejectModal({ open: false, orderId: null }); setRejectReason('') }}
                className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-5 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors disabled:opacity-50"
              >
                Sahkan Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </MerchantLayout>
  )
}
