import MerchantLayout from '../components/MerchantLayout'
import { useAuth } from '../context/AuthContext'

export default function MerchantDashboard() {
  const { user } = useAuth()

  return (
    <MerchantLayout
      title={`Selamat Datang, ${user?.nama || 'Peniaga'}!`}
      subtitle="Berikut adalah ringkasan perniagaan anda hari ini."
    >
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Menunggu Pengesahan</h3>
          <p className="text-3xl font-bold text-gray-800">3</p>
          <p className="text-xs text-gray-400 mt-1">Perlu tindakan segera</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Tempahan Masih Aktif</h3>
          <p className="text-3xl font-bold text-gray-800">5</p>
          <p className="text-xs text-gray-400 mt-1">Untuk dihantar/diambil</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Jualan Bulan Ini</h3>
          <p className="text-3xl font-bold text-gray-800">RM 2,450.00</p>
          <p className="text-xs text-green-500 mt-1">↑ 12% berbanding bulan lepas.</p>
        </div>
      </div>
    </MerchantLayout>
  )
}
