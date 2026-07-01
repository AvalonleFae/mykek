import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

// Restore user from localStorage on init
function getStoredUser() {
  try {
    const stored = localStorage.getItem('mykek_user')
    if (stored) return JSON.parse(stored)
  } catch {}
  return null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)
  const [isAuthenticated, setIsAuthenticated] = useState(!!getStoredUser())
  const [loading, setLoading] = useState(true)

  // Verify session is still valid on mount
  useEffect(() => {
    const verifySession = async () => {
      const storedUser = getStoredUser()
      if (!storedUser) {
        setLoading(false)
        return
      }

      try {
        // Try to access a protected endpoint to verify session
        if (storedUser.role === 'pelanggan') {
          const res = await api.get('/api/pelanggan/profil')
          if (res.data?.data) {
            setUser(storedUser)
            setIsAuthenticated(true)
          }
        } else if (storedUser.role === 'peniaga') {
          const res = await api.get('/api/peniaga/profil-perniagaan')
          if (res.data?.data) {
            setUser(storedUser)
            setIsAuthenticated(true)
          }
        }
      } catch {
        // Session expired — clear stored user
        localStorage.removeItem('mykek_user')
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    verifySession()
  }, [])

  const loginPelanggan = async (noTelefon) => {
    const response = await api.post('/api/auth/pelanggan/log-masuk', { noTelefon })
    const data = response.data
    const userData = { role: 'pelanggan', nama: data.data.nama, id: data.data.pelangganId }
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem('mykek_user', JSON.stringify(userData))
    return data
  }

  const registerPelanggan = async ({ noTelefon, nama, alamat }) => {
    const response = await api.post('/api/auth/pelanggan/daftar', { noTelefon, nama, alamat })
    return response.data
  }

  const loginPeniaga = async (namaPenggunaAdmin, kataLaluan) => {
    const response = await api.post('/api/auth/peniaga/log-masuk', { namaPenggunaAdmin, kataLaluan })
    const data = response.data
    const userData = { role: 'peniaga', nama: data.data.namaKedai, id: data.data.peniagaId }
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem('mykek_user', JSON.stringify(userData))
    return data
  }

  const logout = async () => {
    try {
      if (user?.role === 'pelanggan') {
        await api.post('/api/auth/pelanggan/log-keluar')
      } else if (user?.role === 'peniaga') {
        await api.post('/api/auth/peniaga/log-keluar')
      }
    } catch {}
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('mykek_user')
  }

  // Show nothing while verifying session
  if (loading) {
    return (
      <AuthContext.Provider value={{ user: null, isAuthenticated: false, loading: true, loginPelanggan, registerPelanggan, loginPeniaga, logout }}>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-500 text-sm">Memuatkan...</p>
        </div>
      </AuthContext.Provider>
    )
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, loading, loginPelanggan, registerPelanggan, loginPeniaga, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
