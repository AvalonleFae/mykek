import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import api from '../../services/api'

const ACTIVE_STATUSES = ['Menunggu Pengesahan', 'Diterima', 'Sedang Diproses', 'Sedang Dihias', 'Sedia untuk Diambil/Dihantar']
const HISTORY_STATUSES = ['Selesai', 'Dibatalkan', 'Ditolak']

function getStatusColor(status) {
  switch (status) {
    case 'Menunggu Pengesahan': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
    case 'Diterima': return 'bg-blue-100 text-blue-700 border-blue-300'
    case 'Sedang Diproses': return 'bg-indigo-100 text-indigo-700 border-indigo-300'
    case 'Sedang Dihias': return 'bg-purple-100 text-purple-700 border-purple-300'
    case 'Sedia untuk Diambil/Dihantar': return 'bg-green-100 text-green-700 border-green-300'
    case 'Selesai': return 'bg-green-100 text-green-700 border-green-300'
    case 'Dibatalkan': return 'bg-red-100 text-red-700 border-red-300'
    case 'Ditolak': return 'bg-red-100 text-red-700 border-red-300'
    default: return 'bg-gray-100 text-gray-700 border-gray-300'
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'Menunggu Pengesahan': return 'Menunggu'
    case 'Sedia untuk Diambil/Dihantar': return 'Sedia'
    default: return status
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

export default function OrderListPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(null) // orderId to confirm cancel

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    try {
      const res = await api.get('/api/pelanggan/tempahan')
      setOrders(res.data.data || [])
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan senarai tempahan.')
    } finally {
      setLoading(false)
    }
  }

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.statusTempahan))
  const historyOrders = orders.filter(o => HISTORY_STATUSES.includes(o.statusTempahan))

  const handleViewDetail = async (orderId) => {
    setDetailLoading(true)
    try {
      const res = await api.get(`/api/pelanggan/tempahan/${orderId}`)
      setSelectedOrder(res.data.data)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan butiran.')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCancel = async (orderId) => {
    setCancelling(true)
    try {
      await api.put(`/api/pelanggan/tempahan/${orderId}/batal`)
      setSelectedOrder(null)
      fetchOrders()
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal membatalkan tempahan.')
    } finally {
      setCancelling(false)
    }
  }

  const canCancel = (order) => {
    if (order.statusTempahan === 'Menunggu Pengesahan') return true
    if (order.statusTempahan === 'Diterima' && order.tarikhTerima) {
      const diff = Date.now() - new Date(order.tarikhTerima).getTime()
      return diff <= 24 * 60 * 60 * 1000
    }
    return false
  }

  const getSpecsSummary = (order) => {
    if (order.butiran && order.butiran.length > 0) {
      return order.butiran.map(b => b.namaPilihan).join(', ')
    }
    return ''
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b shadow-sm">
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-orange-500">
            <path d="M12 2L2 19h20L12 2z" />
          </svg>
          <span className="text-lg font-bold text-gray-800">MyKek</span>
          <button onClick={() => navigate('/pelanggan')} className="ml-2 text-gray-600 hover:text-orange-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>
        <span className="px-4 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-full">
          Status Tempahan
        </span>
      </header>

      <main className="flex-1 p-4 md:p-8" style={{ backgroundColor: '#FFF5EE' }}>
        <div className="max-w-lg mx-auto">
          {loading ? <LoadingSpinner /> : error ? <ErrorMessage message={error} /> : (
            <div className="space-y-6">
              {/* Active Orders Section */}
              <div>
                <h2 className="text-sm font-bold text-gray-800 mb-3">Sedang Proses</h2>
                {activeOrders.length === 0 ? (
                  <p className="text-sm text-gray-400">Tiada tempahan aktif.</p>
                ) : (
                  <div className="space-y-3">
                    {activeOrders.map((order) => (
                      <div key={order.tempahanId} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex gap-3">
                          {/* Image placeholder */}
                          <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0 flex items-center justify-center">
                            {order.imej && order.imej.length > 0 ? (
                              <img src={order.imej[0].urlImej} alt="Kek" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 text-gray-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                              </svg>
                            )}
                          </div>
                          {/* Order info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-bold text-gray-800">ID #{order.tempahanId}</p>
                                <p className="text-xs text-gray-500 truncate">{getSpecsSummary(order)}</p>
                                <p className="text-xs font-semibold text-orange-500 mt-0.5">RM {Number(order.jumlahHarga || 0).toFixed(2)}</p>
                                <p className="text-xs text-gray-400">Ambil: {formatDate(order.tarikhAmbil)}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.statusTempahan)}`}>
                                {getStatusLabel(order.statusTempahan)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Action buttons */}
                        <div className="flex gap-2 mt-3 justify-end">
                          {canCancel(order) && (
                            <button
                              onClick={() => setCancelConfirm(order.tempahanId)}
                              className="px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 rounded-full hover:bg-red-50"
                            >
                              Batal Tempahan
                            </button>
                          )}
                          <button
                            onClick={() => handleViewDetail(order.tempahanId)}
                            className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50"
                          >
                            Lihat Status
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* History Section */}
              <div>
                <h2 className="text-sm font-bold text-gray-800 mb-3">Sejarah Tempahan</h2>
                {historyOrders.length === 0 ? (
                  <p className="text-sm text-gray-400">Tiada sejarah tempahan.</p>
                ) : (
                  <div className="space-y-3">
                    {historyOrders.map((order) => (
                      <div key={order.tempahanId} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex gap-3">
                          <div className="w-14 h-14 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center">
                            {order.imej && order.imej.length > 0 ? (
                              <img src={order.imej[0].urlImej} alt="Kek" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-6 h-6 text-gray-300">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-bold text-gray-800">ID #{order.tempahanId}</p>
                                <p className="text-xs text-gray-500">{getSpecsSummary(order)}</p>
                                <p className="text-xs text-gray-400">{formatDate(order.tarikhTempahan)}</p>
                                {order.statusTempahan === 'Selesai' && (
                                  <p className="text-xs text-green-500 font-medium">Pesanan Selesai</p>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.statusTempahan)}`}>
                                {getStatusLabel(order.statusTempahan)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => handleViewDetail(order.tempahanId)}
                            className="px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50"
                          >
                            Lihat Butiran
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {orders.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">Tiada tempahan</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Order Detail Modal */}
      {(selectedOrder || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedOrder(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
            {detailLoading ? (
              <div className="p-8"><LoadingSpinner /></div>
            ) : selectedOrder && (
              <div className="p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Butiran Tempahan</h2>

                {/* Image */}
                {selectedOrder.imej && selectedOrder.imej.length > 0 ? (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">
                      Imej Rujukan: {selectedOrder.imej[0].jenisImej === 'AI' ? 'Jana AI' : 'Muat Naik'}
                    </p>
                    <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                      <img
                        src={selectedOrder.imej[0].urlImej}
                        alt="Rujukan kek"
                        className="w-full rounded object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 bg-gray-100 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-400">Tiada imej rujukan</p>
                  </div>
                )}

                {/* Specs grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {selectedOrder.butiran && selectedOrder.butiran.map((item, idx) => (
                    <div key={idx}>
                      <p className="text-xs text-gray-400">{item.namaKategori}</p>
                      <p className="text-sm font-semibold text-gray-800">{item.namaPilihan}</p>
                    </div>
                  ))}
                </div>

                {/* Delivery info */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-400">Kaedah</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedOrder.kaedahPenghantaran}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Tarikh Ambil</p>
                    <p className="text-sm font-semibold text-gray-800">{formatDate(selectedOrder.tarikhAmbil)}</p>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.nota && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-400">Catatan Tambahan</p>
                    <p className="text-sm font-semibold text-gray-800">{selectedOrder.nota}</p>
                  </div>
                )}

                {/* Status & Price */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div>
                    <p className="text-xs text-gray-400">Status</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedOrder.statusTempahan)}`}>
                      {getStatusLabel(selectedOrder.statusTempahan)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Harga</p>
                    <p className="text-sm font-bold text-gray-800">RM {Number(selectedOrder.jumlahHarga || 0).toFixed(2)}</p>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full text-sm transition-colors"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Cancel Confirmation Modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCancelConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Batal Tempahan?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Adakah anda pasti ingin membatalkan tempahan ini? Tindakan ini tidak boleh dibuat semula.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(null)}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-full text-sm hover:bg-gray-50"
              >
                Tidak
              </button>
              <button
                onClick={() => { handleCancel(cancelConfirm); setCancelConfirm(null) }}
                disabled={cancelling}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold rounded-full text-sm transition-colors"
              >
                {cancelling ? 'Membatalkan...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
