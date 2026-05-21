import { createContext, useContext, useState } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

const api = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true,
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const loginPelanggan = async (noTelefon) => {
    const response = await api.post('/api/auth/pelanggan/log-masuk', { noTelefon })
    const data = response.data
    setUser({ role: 'pelanggan', nama: data.data.nama, id: data.data.pelangganId })
    setIsAuthenticated(true)
    return data
  }

  const registerPelanggan = async ({ noTelefon, nama, alamat }) => {
    const response = await api.post('/api/auth/pelanggan/daftar', { noTelefon, nama, alamat })
    return response.data
  }

  const loginPeniaga = async (namaPenggunaAdmin, kataLaluan) => {
    const response = await api.post('/api/auth/peniaga/log-masuk', { namaPenggunaAdmin, kataLaluan })
    const data = response.data
    setUser({ role: 'peniaga', nama: data.data.namaKedai, id: data.data.peniagaId })
    setIsAuthenticated(true)
    return data
  }

  const logout = async () => {
    try {
      if (user?.role === 'pelanggan') {
        await api.post('/api/auth/pelanggan/log-keluar')
      } else if (user?.role === 'peniaga') {
        await api.post('/api/auth/peniaga/log-keluar')
      }
    } catch (error) {
      // Proceed with local logout even if API call fails
    }
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, loginPelanggan, registerPelanggan, loginPeniaga, logout }}
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
