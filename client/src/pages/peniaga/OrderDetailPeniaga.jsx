import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import MerchantLayout from '../../components/MerchantLayout'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import SuccessMessage from '../../components/shared/SuccessMessage'
import api from '../../services/api'

const STATUS_FLOW = [
  'Diterima',
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

function getNextStatus(currentStatus) {
  const idx = STATUS_FLOW.indexOf(currentStatus)
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null
  return STATUS_FLOW[idx + 1]
}

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

export default function OrderDetailPeniaga() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchOrder = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/api/peniaga/tempahan/${id}`)
      setOrder(res.data.data)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan butiran tempahan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  }, [id])

  const handleAdvanceStatus = async () => {
    setActionLoading(true)
    setError('')
    try {
      await api.put(`/api/peniaga/tempahan/${id}/status`)
      setSuccess('Status tempahan berjaya dikemaskini.')
      fetchOrder()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal mengemaskini status.')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePaymentStatusChange = async (newStatus) => {
    setActionLoading(true)
    setError('')
    try {
      await api.put(`/api/peniaga/tempahan/${id}/status-bayaran`, {
        statusBayaran: newStatus,
      })
      setSuccess('Status bayaran berjaya dikemaskini.')
      fetchOrder()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal mengemaskini status bayaran.')
    } finally {
      setActionLoading(false)
    }
  }

  const isDisabledPayment = order?.status === 'Ditolak' || order?.status === 'Dibatalkan'
  const nextStatus = order ? getNextStatus(order.status) : null

  if (loading) {
    return (
      <MerchantLayout title="Butiran Tempahan">
        <LoadingSpinner />
      </MerchantLayout>
    )
  }

  if (!order) {
    return (
      <MerchantLayout title="Butiran Tempahan">
        <ErrorMessage message={error || 'Tempahan tidak ditemui.'} />
        <button
          onClick={() => navigate('/peniaga/tempahan')}
          className="mt-4 px-5 py-2 text-sm font-medium bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors"
        >
          Kembali ke Senarai
        </button>
      </MerchantLayout>
    )
  }

  return (
    <MerchantLayout title={`Tempahan #${order.tempahanId}`} subtitle="Butiran lengkap tempahan.">
      <div className="space-y-6">
        <SuccessMessage message={success} />
        <ErrorMessage message={error} />

        {/* Back button */}
        <button
          onClick={() => navigate('/peniaga/tempahan')}
          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
        >
          ← Kembali ke Senarai Tempahan
        </button>

        {/* Status & Payment Controls */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Kawalan Status</h2>
          <div className="flex flex-wrap gap-6">
            {/* Current Status */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Status Semasa</p>
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>

            {/* Advance Status */}
            {nextStatus && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Status Seterusnya</p>
                <button
                  onClick={handleAdvanceStatus}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  Kemaskini ke: {nextStatus}
                </button>
              </div>
            )}

            {/* Payment Status */}
            <div>
              <p className="text-sm text-gray-500 mb-1">Status Bayaran</p>
              <select
                value={order.statusBayaran || ''}
                onChange={(e) => handlePaymentStatusChange(e.target.value)}
                disabled={isDisabledPayment || actionLoading}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Maklumat Pelanggan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Nama</p>
              <p className="font-medium text-gray-800">{order.namaPelanggan || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">No. Telefon</p>
              <p className="font-medium text-gray-800">{order.noTelefonPelanggan || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Emel</p>
              <p className="font-medium text-gray-800">{order.emelPelanggan || '-'}</p>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Butiran Tempahan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Tarikh Tempahan</p>
              <p className="font-medium text-gray-800">
                {order.tarikhTempahan ? new Date(order.tarikhTempahan).toLocaleDateString('ms-MY') : '-'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Tarikh Siap/Ambil</p>
              <p className="font-medium text-gray-800">
                {order.tarikhSiap ? new Date(order.tarikhSiap).toLocaleDateString('ms-MY') : '-'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Kaedah Penghantaran</p>
              <p className="font-medium text-gray-800">{order.kaedahPenghantaran || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Jumlah Harga</p>
              <p className="font-medium text-gray-800">RM {Number(order.jumlahHarga || 0).toFixed(2)}</p>
            </div>
            {order.alamatPenghantaran && (
              <div className="md:col-span-2">
                <p className="text-gray-500">Alamat Penghantaran</p>
                <p className="font-medium text-gray-800">{order.alamatPenghantaran}</p>
              </div>
            )}
            {order.catatan && (
              <div className="md:col-span-2">
                <p className="text-gray-500">Catatan</p>
                <p className="font-medium text-gray-800">{order.catatan}</p>
              </div>
            )}
          </div>
        </div>

        {/* Specifications */}
        {order.butiran && order.butiran.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Spesifikasi Kek</h2>
            <div className="space-y-2">
              {order.butiran.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.namaKategori}</p>
                    <p className="text-xs text-gray-500">{item.namaPilihan}</p>
                  </div>
                  {item.hargaTambahan > 0 && (
                    <span className="text-sm text-gray-600">+RM {Number(item.hargaTambahan).toFixed(2)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Images */}
        {order.imej && order.imej.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Imej Rujukan</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {order.imej.map((img, idx) => (
                <img
                  key={idx}
                  src={img.urlImej}
                  alt={`Rujukan ${idx + 1}`}
                  className="w-full h-32 object-cover rounded-xl border border-gray-200"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </MerchantLayout>
  )
}
