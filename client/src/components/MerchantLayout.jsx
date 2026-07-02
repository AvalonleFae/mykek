import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { label: 'Laman Utama', path: '/peniaga' },
  { label: 'Senarai Tempahan', path: '/peniaga/tempahan' },
  { label: 'Kemas Kini Spesifikasi', path: '/peniaga/spesifikasi' },
  { label: 'Kalendar Cuti', path: '/peniaga/kalendar' },
  { label: 'Laporan dan Analisis', path: '/peniaga/laporan' },
  { label: 'Kemas kini Perniagaan', path: '/peniaga/perniagaan' },
  { label: 'Sambung ke WhatsApp', path: '/peniaga/whatsapp' },
]

export default function MerchantLayout({ children, title, subtitle }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleNavClick = (path) => {
    navigate(path)
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static z-30 inset-y-0 left-0 w-64 bg-white border-r flex flex-col shrink-0 transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
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
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.path)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Orange Header Banner */}
        <div className="bg-orange-500 px-4 md:px-8 py-5 md:py-8 flex items-start gap-3">
          {/* Mobile hamburger */}
          <button
            className="md:hidden mt-0.5 shrink-0 text-white"
            onClick={() => setSidebarOpen(true)}
            aria-label="Buka menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">
              {title || `Selamat Datang, ${user?.nama || 'Peniaga'}!`}
            </h1>
            {subtitle && <p className="text-orange-100 mt-1 text-sm">{subtitle}</p>}
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8" style={{ backgroundColor: '#FFF5EE' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
