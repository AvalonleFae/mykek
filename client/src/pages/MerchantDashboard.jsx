import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { label: 'Laman Utama', active: true },
  { label: 'Senarai Tempahan', active: false },
  { label: 'Kemas Kini Spesifikasi', active: false },
  { label: 'Kalendar Cuti', active: false },
  { label: 'Laporan dan Analisis', active: false },
  { label: 'Kemas kini Perniagaan', active: false },
]

export default function MerchantDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 flex items-center gap-2 border-b">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-8 h-8 text-orange-500"
          >
            <path d="M12 2L2 19h20L12 2z" />
          </svg>
          <span className="text-lg font-bold text-gray-800">MyKek</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-4 py-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full transition-colors text-sm"
          >
            Log Keluar
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Orange Header Banner */}
        <div className="bg-orange-500 px-8 py-8">
          <h1 className="text-2xl font-bold text-white">
            Selamat Datang, {user?.nama || 'Peniaga'}!
          </h1>
          <p className="text-orange-100 mt-1">
            Berikut adalah ringkasan perniagaan anda hari ini.
          </p>
        </div>

        {/* Content Area */}
        <main className="flex-1 p-8" style={{ backgroundColor: '#FFF5EE' }}>
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
        </main>
      </div>
    </div>
  )
}
