import { useState, useEffect } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'
import MerchantLayout from '../../components/MerchantLayout'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import api from '../../services/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

const MONTHS = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
]

export default function ReportPage() {
  const today = new Date()
  const [bulan, setBulan] = useState(today.getMonth() + 1)
  const [tahun, setTahun] = useState(today.getFullYear())
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  const fetchReport = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/peniaga/laporan-jualan', {
        params: { bulan, tahun },
      })
      setReport(res.data.data)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan laporan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [bulan, tahun])

  const handleDownloadPDF = async () => {
    setDownloading(true)
    setError('')
    try {
      const res = await api.get('/api/peniaga/laporan-jualan/pdf', {
        params: { bulan, tahun },
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `laporan-jualan-${tahun}-${String(bulan).padStart(2, '0')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Gagal memuat turun PDF.')
    } finally {
      setDownloading(false)
    }
  }

  const barData = report?.mengikutStatus ? {
    labels: Object.keys(report.mengikutStatus),
    datasets: [{
      label: 'Bilangan Tempahan',
      data: Object.values(report.mengikutStatus),
      backgroundColor: [
        '#FCD34D', '#60A5FA', '#F87171', '#9CA3AF',
        '#818CF8', '#A78BFA', '#34D399', '#10B981',
      ],
      borderRadius: 8,
    }],
  } : null

  const pieData = report?.mengikutBayaran ? {
    labels: Object.keys(report.mengikutBayaran),
    datasets: [{
      data: Object.values(report.mengikutBayaran),
      backgroundColor: ['#F87171', '#FCD34D', '#34D399'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  } : null

  const hasData = report && (report.jumlahTempahan > 0 || report.jumlahHasil > 0)

  // Generate year options
  const yearOptions = []
  for (let y = 2024; y <= today.getFullYear() + 1; y++) {
    yearOptions.push(y)
  }

  return (
    <MerchantLayout title="Laporan dan Analisis" subtitle="Lihat prestasi jualan perniagaan anda.">
      <div className="space-y-6">
        <ErrorMessage message={error} />

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <select
            value={bulan}
            onChange={(e) => setBulan(Number(e.target.value))}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            {MONTHS.map((m, idx) => (
              <option key={idx} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={handleDownloadPDF}
            disabled={downloading || !hasData}
            className="px-5 py-2 text-sm font-medium bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {downloading ? 'Memuat turun...' : 'Muat Turun PDF'}
          </button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : !hasData ? (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center text-gray-500">
            Tiada data untuk bulan {MONTHS[bulan - 1]} {tahun}.
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Jumlah Tempahan</h3>
                <p className="text-3xl font-bold text-gray-800">{report.jumlahTempahan}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Jumlah Hasil (RM)</h3>
                <p className="text-3xl font-bold text-gray-800">RM {Number(report.jumlahHasil || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart - Orders by Status */}
              {barData && (
                <div className="bg-white rounded-2xl shadow-md p-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-4">Tempahan Mengikut Status</h3>
                  <Bar
                    data={barData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: false },
                      },
                      scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } },
                      },
                    }}
                  />
                </div>
              )}

              {/* Pie Chart - Payment Status */}
              {pieData && (
                <div className="bg-white rounded-2xl shadow-md p-6">
                  <h3 className="text-sm font-bold text-gray-800 mb-4">Status Bayaran</h3>
                  <div className="max-w-xs mx-auto">
                    <Pie
                      data={pieData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { position: 'bottom' },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MerchantLayout>
  )
}
