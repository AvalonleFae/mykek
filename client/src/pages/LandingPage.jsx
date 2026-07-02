import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import LoginCard from '../components/LoginCard'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'pelanggan') {
        navigate('/pelanggan', { replace: true })
      } else if (user.role === 'peniaga') {
        navigate('/peniaga', { replace: true })
      }
    }
  }, [isAuthenticated, user, navigate])

  const [shopInfo, setShopInfo] = useState({
    namaKedai: 'Zuraida Patisserie',
    noTelefonKedai: '0123456789',
    peneranganKedai: 'Kedai kek dan pastri di Sarawak. Menyediakan pelbagai jenis kek mengikut tempahan.',
  })

  useEffect(() => {
    // Fetch public shop info from API
    api.get('/api/awam/profil-kedai')
      .then((res) => {
        if (res.data?.data) {
          setShopInfo({
            namaKedai: res.data.data.namaKedai || 'Zuraida Patisserie',
            noTelefonKedai: res.data.data.noTelefonKedai || '0123456789',
            peneranganKedai: res.data.data.peneranganKedai || '',
          })
        }
      })
      .catch(() => {
        // Use defaults if API fails
      })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <main className="flex-1 relative">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200&q=80')`,
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between h-full min-h-[500px] px-6 md:px-16 py-8 md:py-12 gap-8">
          {/* Left - Shop Info */}
          <div className="text-white max-w-md text-center md:text-left">
            <p className="text-base md:text-xl font-medium mb-2">
              {shopInfo.peneranganKedai}
            </p>
            <p className="text-base font-semibold mt-4 md:mt-6 mb-3 md:mb-4">Hubungi Kami!</p>

            <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
              <span className="text-orange-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="text-base">{shopInfo.noTelefonKedai}</span>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-3">
              <span className="text-orange-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                  <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.432z" />
                </svg>
              </span>
              <span className="text-base">Pekan Song, Sarawak</span>
            </div>
          </div>

          {/* Right - Login Card */}
          <div className="w-full max-w-sm">
            <LoginCard />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-4 px-6 text-center text-sm text-gray-500 border-t">
        © 2026 MyKek - {shopInfo.namaKedai}. Hak Cipta Terpelihara.
      </footer>
    </div>
  )
}
