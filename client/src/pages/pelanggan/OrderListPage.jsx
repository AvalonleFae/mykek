import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import api from '../../services/api'

const STATUS_COLORS = {
  'Menunggu Bayaran': 'bg-yellow-100 text-yellow-700',
  'Dalam Proses': 'bg-blue-100 text-blue-700',
  'Sedang Dibakar': 'bg-orange-100 text-orange-700',
  'Sedia Diambil': 'bg-green-100 text-green-700',
  'Selesai': 'bg-green-100 text-green-700',
  'Dibatalkan': 'bg-red-100 text-red-700',
}

export default function OrderListPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const res = await api.get('/api/pelanggan/tempahan')
      const data = res.data.data || res.data || []
      // Sort by date (most recent first)
      const sorted = [...data].sort((a, b) => {
        const dateA = new Date(a.tarikhTempahan || a.createdAt || 0)
        const dateB = new Date(b.tarikhTempahan || b.createdAt || 0)
        return dateB - dateA
      })
      setOrders(sorted)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan senarai tempahan.')
    } finally {
      setLoading(false)
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
            onClick={() => navigate('/pelanggan')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-500 mb-6 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Kembali ke Menu Utama
          </button>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <h1 className="text-xl font-bold text-gray-800 mb-6">Senarai Tempahan</h1>

            {loading ? (
              <LoadingSpinner />
            ) : error ? (
              <ErrorMessage message={error} />
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-300 mx-auto mb-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
                </svg>
                <p className="text-gray-500 text-sm">Tiada tempahan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const orderId = order.id || order.tempahanId
                  const status = order.status || 'Menunggu Bayaran'
                  const statusColor = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'

                  return (
                    <button
                      key={orderId}
                      onClick={() => navigate(`/pelanggan/tempahan/${orderId}`)}
                      className="w-full p-4 border border-gray-100 rounded-xl hover:border-orange-200 hover:bg-orange-50/30 transition-all text-left"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            Tempahan #{orderId}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(order.tarikhTempahan || order.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                            {status}
                          </span>
                          <p className="text-sm font-bold text-orange-600 mt-1">
                            RM {Number(order.jumlahHarga || order.totalPrice || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
