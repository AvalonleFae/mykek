import { useState, useEffect } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Title, Tooltip, Legend } from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import MerchantLayout from '../../components/MerchantLayout'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import api from '../../services/api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Title, Tooltip, Legend)

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
      const res = await api.get('/api/peniaga/laporan-jualan', { params: { bulan, tahun } })
      setReport(res.data.data)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan laporan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReport() }, [bulan, tahun])

  const handleDownloadPDF = async () => {
    setDownloading(true)
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
    } catch {
      setError('Gagal memuat turun PDF.')
    } finally {
      setDownloading(false)
    }
  }

  const hasData = report && report.jumlahTempahan > 0

  // Line chart data - weekly sales from real database data
  const lineData = hasData ? (() => {
    const labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4']
    const data = report.jualanMingguan || [0, 0, 0, 0]

    return {
      labels,
      datasets: [{
        label: 'Jualan Mingguan (RM)',
        data,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#f97316',
      }],
    }
  })() : null

  // Doughnut chart - most popular cake options
  const doughnutData = hasData && report.kekPopular && report.kekPopular.length > 0 ? {
    labels: report.kekPopular.map(k => k.namaPilihan),
    datasets: [{
      data: report.kekPopular.map(k => k.bilangan),
      backgroundColor: ['#f97316', '#60a5fa', '#f87171', '#34d399', '#818cf8', '#fbbf24', '#a78bfa', '#fb923c', '#4ade80', '#f472b6'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  } : null

  // Year options
  const yearOptions = []
  for (let y = 2024; y <= today.getFullYear() + 1; y++) yearOptions.push(y)

  return (
    <MerchantLayout title="Laporan dan Analisis" subtitle="Lihat prestasi jualan perniagaan anda.">
      <ErrorMessage message={error} />

      {/* Top bar - Month/Year selector + PDF button */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-sm text-gray-600">Tempoh:</span>
        <select
          value={bulan}
          onChange={(e) => setBulan(Number(e.target.value))}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          {MONTHS.map((m, idx) => (
            <option key={idx} value={idx + 1}>{m}</option>
          ))}
        </select>
        <select
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value))}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={fetchReport}
          className="px-4 py-1.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Tapis
        </button>
        <div className="flex-1"></div>
        <button
          onClick={handleDownloadPDF}
          disabled={downloading || !hasData}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          PDF
        </button>
      </div>

      {loading ? <LoadingSpinner /> : !hasData ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          Tiada data untuk bulan {MONTHS[bulan - 1]} {tahun}.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Jumlah Jualan */}
            <div className="bg-orange-500 rounded-xl p-5 text-white">
              <p className="text-xs opacity-80">Jumlah Jualan</p>
              <p className="text-2xl font-bold mt-1">RM {Number(report.jumlahHasil || 0).toFixed(2)}</p>
            </div>
            {/* Bilangan Tempahan */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500">Bilangan Tempahan</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{report.jumlahTempahan}</p>
              <p className="text-xs text-gray-400 mt-1">
                {report.pecahanStatus?.Selesai || 0} Selesai · {report.pecahanStatus?.Dibatalkan || 0} Dibatalkan
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Line Chart - Trend Jualan Harian */}
            {lineData && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-4">
                  Trend Jualan Mingguan ({MONTHS[bulan - 1]} {tahun})
                </h3>
                <Line
                  data={lineData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: {
                        grid: { display: false },
                        title: { display: true, text: 'Minggu', font: { size: 11, weight: 'bold' } },
                      },
                      y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Jualan (RM)', font: { size: 11, weight: 'bold' } },
                      },
                    },
                  }}
                />
              </div>
            )}

            {/* Doughnut Chart - Kek Paling Laris */}
            {doughnutData && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-800 mb-4">
                  Kek Paling Laris (Mengikut Kategori)
                </h3>
                <div className="max-w-[250px] mx-auto">
                  <Doughnut
                    data={doughnutData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } },
                      },
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </MerchantLayout>
  )
}
