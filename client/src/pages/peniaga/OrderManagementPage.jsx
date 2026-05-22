import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MerchantLayout from '../../components/MerchantLayout'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import SuccessMessage from '../../components/shared/SuccessMessage'
import api from '../../services/api'

const API_BASE = 'http://localhost:3001'
function getImageUrl(url) { if (!url) return ''; if (url.startsWith('http') || url.startsWith('data:')) return url; return API_BASE + url; }

const TABS = [
  { key: 'baharu', label: 'Tempahan Baharu', statuses: ['Menunggu Pengesahan'] },
  { key: 'aktif', label: 'Masih Aktif', statuses: ['Diterima', 'Sedang Dibuat', 'Siap'] },
  { key: 'selesai', label: 'Selesai', statuses: ['Selesai', 'Dibatalkan', 'Ditolak'] },
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
  const [activeTab, setActiveTab] = useState('baharu')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Detail modal state
  const [detailModal, setDetailModal] = useState({ open: false, order: null })
  const [detailLoading, setDetailLoading] = useState(false)
  const [tindakan, setTindakan] = useState('')
  const [sebabTolak, setSebabTolak] = useState('')

  const currentTab = TABS.find((t) => t.key === activeTab)

  const fetchOrders = async () => {
    setLoading(true)
    setError('')
    try {
      // Fetch all orders and filter client-side by tab
      const res = await api.get('/api/peniaga/tempahan')
      const allOrders = res.data.data || []
      // Filter by current tab statuses
      const filtered = allOrders.filter((o) => currentTab.statuses.includes(o.statusTempahan))
      setOrders(filtered)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan senarai tempahan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [activeTab])

  const openDetailModal = async (orderId) => {
    setDetailLoading(true)
    setDetailModal({ open: true, order: null })
    setTindakan('')
    setSebabTolak('')
    try {
      const res = await api.get(`/api/peniaga/tempahan/${orderId}`)
      setDetailModal({ open: true, order: res.data.data })
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan butiran tempahan.')
      setDetailModal({ open: false, order: null })
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetailModal = () => {
    setDetailModal({ open: false, order: null })
    setTindakan('')
    setSebabTolak('')
  }

  const handleSaveAction = async () => {
    if (!tindakan) {
      setError('Sila pilih tindakan.')
      return
    }
    const orderId = detailModal.order?.tempahanId
    if (!orderId) return

    setActionLoading(true)
    setError('')
    try {
      if (tindakan === 'Terima') {
        await api.put(`/api/peniaga/tempahan/${orderId}/terima`)
        setSuccess('Tempahan berjaya diterima.')
      } else if (tindakan === 'Tidak Terima') {
        if (!sebabTolak.trim()) {
          setError('Sila masukkan sebab penolakan.')
          setActionLoading(false)
          return
        }
        await api.put(`/api/peniaga/tempahan/${orderId}/tolak`, {
          sebabTolak: sebabTolak.trim(),
        })
        setSuccess('Tempahan berjaya ditolak.')
      }
      closeDetailModal()
      fetchOrders()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memproses tindakan.')
    } finally {
      setActionLoading(false)
    }
  }

  const getButiranSummary = (order) => {
    // The list API doesn't include butiran, show price as summary
    return `RM ${Number(order.jumlahHarga || 0).toFixed(2)}`
  }

  return (
    <MerchantLayout title="Senarai Tempahan" subtitle="Urus semua tempahan pelanggan anda.">
      <SuccessMessage message={success} />
      <ErrorMessage message={error} />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"></span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          Tiada tempahan ditemui.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-600">ID / Nama Pelanggan</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Perincian Kek</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Tarikh Diperlukan</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Kaedah</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Status Tempahan</th>
                {activeTab === 'selesai' && (
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Status Bayaran</th>
                )}
                <th className="text-left px-6 py-3 font-medium text-gray-600">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.tempahanId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-800">{order.namaPelanggan || '-'}</p>
                    <p className="text-xs text-gray-500">#{order.tempahanId}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {getButiranSummary(order)}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {order.tarikhAmbil ? new Date(order.tarikhAmbil).toLocaleDateString('ms-MY') : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {order.kaedahPenghantaran || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.statusTempahan)}`}>
                      {order.statusTempahan}
                    </span>
                  </td>
                  {activeTab === 'selesai' && (
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        order.statusBayaran === 'Telah Dibayar' ? 'bg-green-100 text-green-700' :
                        order.statusBayaran === 'Deposit Dibayar' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {order.statusBayaran || 'Belum Dibayar'}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    {activeTab === 'baharu' && (
                      <button
                        onClick={() => openDetailModal(order.tempahanId)}
                        className="px-4 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors"
                      >
                        Lihat
                      </button>
                    )}
                    {activeTab === 'aktif' && (
                      <button
                        onClick={() => navigate(`/peniaga/tempahan/${order.tempahanId}`)}
                        className="px-4 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors"
                      >
                        Kemas Kini
                      </button>
                    )}
                    {activeTab === 'selesai' && (
                      <button
                        onClick={() => navigate(`/peniaga/tempahan/${order.tempahanId}`)}
                        className="px-4 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                      >
                        Perincian
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {detailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeDetailModal}></div>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            {detailLoading ? (
              <div className="p-8">
                <LoadingSpinner />
              </div>
            ) : detailModal.order ? (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800">
                    {detailModal.order.namaPelanggan || 'Pelanggan'} - {detailModal.order.noTelefon || 'Tiada No. Telefon'}
                  </h3>
                  <button
                    onClick={closeDetailModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left side */}
                    <div className="space-y-4">
                      {/* Spesifikasi Kek */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Spesifikasi Kek</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          {detailModal.order.butiran && detailModal.order.butiran.length > 0 ? (
                            detailModal.order.butiran.map((item, idx) => (
                              <p key={idx}>
                                <span className="font-medium">{item.namaKategori}:</span> {item.namaPilihan}
                              </p>
                            ))
                          ) : (
                            <p>Tiada spesifikasi</p>
                          )}
                        </div>
                      </div>

                      {/* Maklumat Penghantaran */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Maklumat Penghantaran</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            <span className="font-medium">Tarikh Ambil:</span>{' '}
                            {detailModal.order.tarikhAmbil ? new Date(detailModal.order.tarikhAmbil).toLocaleDateString('ms-MY') : '-'}
                          </p>
                          <p>
                            <span className="font-medium">Kaedah:</span>{' '}
                            {detailModal.order.kaedahPenghantaran || '-'}
                          </p>
                          {detailModal.order.alamatPenghantaran && (
                            <p>
                              <span className="font-medium">Alamat:</span>{' '}
                              {detailModal.order.alamatPenghantaran}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Catatan Tambahan */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Catatan Tambahan</h4>
                        <p className="text-sm text-gray-600">
                          {detailModal.order.nota || 'Tiada catatan'}
                        </p>
                      </div>
                    </div>

                    {/* Right side - Image */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-2">Imej Rujukan</h4>
                      {detailModal.order.imej && detailModal.order.imej.length > 0 ? (
                        <div>
                          <img
                            src={getImageUrl(detailModal.order.imej[0].urlImej)}
                            alt="Rujukan Kek"
                            className="w-full h-48 object-contain rounded-lg border border-gray-200 bg-gray-50"
                          />
                          <a
                            href={getImageUrl(detailModal.order.imej[0].urlImej)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-orange-600 hover:text-orange-700 mt-2 inline-block"
                          >
                            Lihat imej penuh
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Tiada imej rujukan</p>
                      )}
                    </div>
                  </div>

                  {/* Tindakan */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Tindakan</h4>
                    <div className="space-y-3">
                      <select
                        value={tindakan}
                        onChange={(e) => setTindakan(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                      >
                        <option value="">-- Pilih Tindakan --</option>
                        <option value="Terima">Terima</option>
                        <option value="Tidak Terima">Tidak Terima</option>
                      </select>

                      {tindakan === 'Tidak Terima' && (
                        <textarea
                          value={sebabTolak}
                          onChange={(e) => setSebabTolak(e.target.value)}
                          placeholder="Masukkan sebab penolakan..."
                          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none h-24"
                          maxLength={500}
                        />
                      )}

                      <button
                        onClick={handleSaveAction}
                        disabled={actionLoading || !tindakan}
                        className="px-6 py-2 text-sm font-medium bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading ? 'Memproses...' : 'Simpan dan Kemas Kini'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </MerchantLayout>
  )
}
