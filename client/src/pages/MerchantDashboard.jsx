import { useState, useEffect } from 'react'
import MerchantLayout from '../components/MerchantLayout'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function MerchantDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ pending: 0, active: 0, revenue: 0 })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch all orders to calculate stats
      const res = await api.get('/api/peniaga/tempahan')
      const orders = res.data.data || []

      const pending = orders.filter(o => o.statusTempahan === 'Menunggu Pengesahan').length
      const active = orders.filter(o => ['Diterima', 'Sedang Dibuat', 'Siap'].includes(o.statusTempahan)).length

      // Get current month revenue from report
      const now = new Date()
      let revenue = 0
      try {
        const reportRes = await api.get('/api/peniaga/laporan-jualan', {
          params: { bulan: now.getMonth() + 1, tahun: now.getFullYear() }
        })
        revenue = reportRes.data.data?.jumlahHasil || 0
      } catch { /* ignore */ }

      setStats({ pending, active, revenue })
    } catch {
      // Use defaults if API fails
    }
  }

  return (
    <MerchantLayout
      title={`Selamat Datang, ${user?.nama || 'Peniaga'}!`}
      subtitle="Berikut adalah ringkasan perniagaan anda hari ini."
    >
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Menunggu Pengesahan</h3>
          <p className="text-3xl font-bold text-gray-800">{stats.pending}</p>
          <p className="text-xs text-gray-400 mt-1">Perlu tindakan segera</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Tempahan Masih Aktif</h3>
          <p className="text-3xl font-bold text-gray-800">{stats.active}</p>
          <p className="text-xs text-gray-400 mt-1">Untuk dihantar/diambil</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Jualan Bulan Ini</h3>
          <p className="text-3xl font-bold text-gray-800">RM {Number(stats.revenue).toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">Jumlah hasil bulan ini</p>
        </div>
      </div>
    </MerchantLayout>
  )
}
