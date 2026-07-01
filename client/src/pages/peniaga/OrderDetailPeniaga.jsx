import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import SuccessMessage from '../../components/shared/SuccessMessage'
import api from '../../services/api'

const API_BASE = 'http://localhost:3001'
function getImageUrl(url) { if (!url) return ''; if (url.startsWith('http') || url.startsWith('data:')) return url; return API_BASE + url; }

const STATUS_FLOW = [
  'Diterima',
  'Sedang Dibuat',
  'Siap',
  'Selesai',
]

const STATUS_LABELS = [
  'Diterima',
  'Sedang Dibuat',
  'Siap',
  'Selesai',
]

const PAYMENT_STATUSES = [
  'Belum Dibayar',
  'Deposit Dibayar',
  'Telah Dibayar',
]

function getStatusIndex(status) {
  const idx = STATUS_FLOW.indexOf(status)
  return idx === -1 ? 0 : idx
}

function getNextStatus(currentStatus) {
  const idx = STATUS_FLOW.indexOf(currentStatus)
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null
  return STATUS_FLOW[idx + 1]
}

function getPaymentColor(status) {
  switch (status) {
    case 'Belum Dibayar': return 'bg-red-100 text-red-700'
    case 'Deposit Dibayar': return 'bg-yellow-100 text-yellow-700'
    case 'Telah Dibayar': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export default function OrderDetailPeniaga() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')

  const fetchOrder = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/api/peniaga/tempahan/${id}`)
      setOrder(res.data.data)
      setSelectedPayment(res.data.data?.statusBayaran || 'Belum Dibayar')
      setSelectedStatus(res.data.data?.statusTempahan || '')
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
    if (!selectedStatus) { setError('Sila pilih status.'); return }
    setStatusLoading(true)
    setError('')
    try {
      // Advance status step by step until we reach the selected status
      let currentStatus = order.statusTempahan
      const targetIndex = STATUS_FLOW.indexOf(selectedStatus)
      const currentIndex = STATUS_FLOW.indexOf(currentStatus)

      if (targetIndex <= currentIndex) {
        setError('Status yang dipilih mestilah lebih tinggi daripada status semasa.')
        setStatusLoading(false)
        return
      }

      // Call advance for each step
      for (let i = currentIndex; i < targetIndex; i++) {
        await api.put(`/api/peniaga/tempahan/${id}/status`)
      }

      setSuccess('Status tempahan berjaya dikemaskini.')
      fetchOrder()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal mengemaskini status.')
    } finally {
      setStatusLoading(false)
    }
  }

  const handlePaymentUpdate = async () => {
    setPaymentLoading(true)
    setError('')
    try {
      await api.put(`/api/peniaga/tempahan/${id}/status-bayaran`, {
        statusBayaran: selectedPayment,
      })
      setSuccess('Status bayaran berjaya dikemaskini.')
      fetchOrder()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal mengemaskini status bayaran.')
    } finally {
      setPaymentLoading(false)
    }
  }

  const nextStatus = order ? getNextStatus(order.statusTempahan) : null
  const currentStepIndex = order ? getStatusIndex(order.statusTempahan) : 0
  const isDitolak = order?.statusTempahan === 'Ditolak'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <ErrorMessage message={error || 'Tempahan tidak ditemui.'} />
        <button
          onClick={() => navigate('/peniaga/tempahan')}
          className="mt-4 px-5 py-2 text-sm font-medium bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors"
        >
          Kembali ke Senarai
        </button>
      </div>
    )
  }

  // Get specs
  const perisa = order.butiran?.find((b) => b.namaKategori?.toLowerCase().includes('perisa'))
  const saiz = order.butiran?.find((b) => b.namaKategori?.toLowerCase().includes('saiz'))

  // Get image info
  const mainImage = order.imej && order.imej.length > 0 ? order.imej[0] : null
  const imageType = mainImage?.jenisImej || 'Muat Naik'
  const isAI = imageType?.toLowerCase().includes('ai') || imageType?.toLowerCase().includes('janaan')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Orange Header Banner */}
      <div className="bg-orange-500 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-white">
            Tempahan #{order.tempahanId}
          </h1>
          <p className="text-orange-100 text-sm mt-1">
            {order.namaPelanggan || 'Pelanggan'} - {order.noTelefon || 'Tiada No. Telefon'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/peniaga/tempahan')}
          className="mb-6 flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Kembali
        </button>

        <SuccessMessage message={success} />
        <ErrorMessage message={error} />

        {/* Top section - Status & Payment cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left card - Kemas Kini Status Tempahan */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">Kemas Kini Status Tempahan</h2>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                {STATUS_LABELS.map((label, idx) => {
                  const isCompleted = idx <= currentStepIndex
                  const isCurrent = idx === currentStepIndex
                  return (
                    <div key={label} className="flex flex-col items-center flex-1">
                      <div className="flex items-center w-full">
                        {idx > 0 && (
                          <div className={`flex-1 h-0.5 ${idx <= currentStepIndex ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
                        )}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                            isCompleted
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {isCompleted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : (
                            idx + 1
                          )}
                        </div>
                        {idx < STATUS_LABELS.length - 1 && (
                          <div className={`flex-1 h-0.5 ${idx < currentStepIndex ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
                        )}
                      </div>
                      <span className={`text-xs mt-2 text-center ${isCurrent ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Next status action */}
            {isDitolak ? (
              <p className="text-sm text-red-500 font-medium">Tempahan ini telah ditolak.</p>
            ) : order.statusTempahan !== 'Selesai' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Tukar Status Kepada:</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="mt-1 w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    {STATUS_FLOW.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAdvanceStatus}
                  disabled={statusLoading || selectedStatus === order.statusTempahan}
                  className="px-6 py-2 text-sm font-medium bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {statusLoading ? 'Memproses...' : 'Simpan'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Tempahan telah selesai.</p>
            )}
          </div>

          {/* Right card - Kemas Kini Status Pembayaran */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">Kemas Kini Status Pembayaran</h2>

            {/* Current payment status */}
            <div className="mb-4">
              <label className="text-sm text-gray-600">Status Semasa:</label>
              <div className="mt-1 flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentColor(order.statusBayaran)}`}>
                  {order.statusBayaran || 'Belum Dibayar'}
                </span>
                {/* View Receipt Button */}
                {order.imej && order.imej.find(img => img.jenisImej === 'Resit') && (
                  <a
                    href={getImageUrl(order.imej.find(img => img.jenisImej === 'Resit').urlImej)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-full hover:bg-orange-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                    Lihat Resit
                  </a>
                )}
              </div>
            </div>

            {/* Payment dropdown */}
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Tukar Status Kepada:</label>
                <select
                  value={selectedPayment}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                  disabled={isDitolak}
                  className="mt-1 w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handlePaymentUpdate}
                disabled={paymentLoading || isDitolak}
                className="px-6 py-2 text-sm font-medium bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paymentLoading ? 'Memproses...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom section - Order info & Image */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left card - Maklumat Tempahan */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">Maklumat Tempahan</h2>

            <div className="space-y-4">
              {/* Spesifikasi Kek */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Spesifikasi Kek</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Perisa:</span> {perisa?.namaPilihan || '-'}</p>
                  <p><span className="font-medium">Saiz:</span> {saiz?.namaPilihan || '-'}</p>
                  {order.butiran && order.butiran.filter((b) => !b.namaKategori?.toLowerCase().includes('perisa') && !b.namaKategori?.toLowerCase().includes('saiz')).map((item, idx) => (
                    <p key={idx}><span className="font-medium">{item.namaKategori}:</span> {item.namaPilihan}</p>
                  ))}
                </div>
              </div>

              {/* Maklumat Penghantaran */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Maklumat Penghantaran</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Tarikh Ambil:</span>{' '}
                    {order.tarikhAmbil ? new Date(order.tarikhAmbil).toLocaleDateString('ms-MY') : '-'}
                  </p>
                  <p>
                    <span className="font-medium">Kaedah:</span>{' '}
                    {order.kaedahPenghantaran || '-'}
                  </p>
                  {order.alamatPenghantaran && (
                    <p>
                      <span className="font-medium">Alamat:</span>{' '}
                      {order.alamatPenghantaran}
                    </p>
                  )}
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Catatan Tambahan</h3>
                <p className="text-sm text-gray-600">{order.nota || 'Tiada catatan'}</p>
              </div>
            </div>
          </div>

          {/* Right card - Rujukan Imej Kek */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4">Rujukan Imej Kek</h2>

            {mainImage ? (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">Jenis:</span>{' '}
                  {isAI ? 'Janaan AI' : 'Muat Naik'}
                </p>
                <img
                  src={getImageUrl(mainImage.urlImej)}
                  alt="Rujukan Kek"
                  className="w-full h-64 object-contain rounded-lg border border-gray-200 bg-gray-50"
                />
                <a
                  href={getImageUrl(mainImage.urlImej)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-orange-600 hover:text-orange-700 mt-3 inline-block font-medium"
                >
                  Lihat imej penuh
                </a>
                {isAI && mainImage.promptAI && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-1">Deskripsi Prompt:</p>
                    <p className="text-sm text-gray-600">{mainImage.promptAI}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Tiada imej rujukan</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
