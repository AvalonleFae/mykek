import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginCard() {
  const [activeTab, setActiveTab] = useState('pelanggan') // 'pelanggan' or 'peniaga'
  const [isRegistering, setIsRegistering] = useState(false)

  // Customer login/register fields
  const [noTelefon, setNoTelefon] = useState('')
  const [nama, setNama] = useState('')
  const [alamat, setAlamat] = useState('')

  // Merchant login fields
  const [namaPengguna, setNamaPengguna] = useState('')
  const [kataLaluan, setKataLaluan] = useState('')

  // UI state
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { loginPelanggan, registerPelanggan, loginPeniaga } = useAuth()
  const navigate = useNavigate()

  const handleCustomerSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setIsLoading(true)

    try {
      if (isRegistering) {
        await registerPelanggan({ noTelefon, nama, alamat })
        setSuccessMsg('Pendaftaran berjaya! Sila log masuk.')
        setIsRegistering(false)
        setNama('')
        setAlamat('')
      } else {
        await loginPelanggan(noTelefon)
        navigate('/pelanggan')
      }
    } catch (err) {
      const message = err.response?.data?.mesej || err.response?.data?.message || 'Ralat berlaku. Sila cuba lagi.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMerchantSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setIsLoading(true)

    try {
      await loginPeniaga(namaPengguna, kataLaluan)
      navigate('/peniaga')
    } catch (err) {
      const message = err.response?.data?.mesej || err.response?.data?.message || 'Ralat berlaku. Sila cuba lagi.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Selamat Datang!</h2>
      <p className="text-lg text-gray-600 mb-5">Log Masuk</p>

      {/* Tabs */}
      <div className="flex gap-6 mb-6">
        <button
          onClick={() => {
            setActiveTab('pelanggan')
            setIsRegistering(false)
            setError('')
            setSuccessMsg('')
          }}
          className={`pb-1 text-sm font-medium transition-colors ${
            activeTab === 'pelanggan'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Pelanggan
        </button>
        <button
          onClick={() => {
            setActiveTab('peniaga')
            setIsRegistering(false)
            setError('')
            setSuccessMsg('')
          }}
          className={`pb-1 text-sm font-medium transition-colors ${
            activeTab === 'peniaga'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Peniaga
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
          {successMsg}
        </div>
      )}

      {/* Customer Tab */}
      {activeTab === 'pelanggan' && (
        <form onSubmit={handleCustomerSubmit} className="space-y-4">
          {/* Phone Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              No. Telefon
            </label>
            <input
              type="tel"
              placeholder="0112345678"
              value={noTelefon}
              onChange={(e) => setNoTelefon(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              required
            />
          </div>

          {/* Registration fields */}
          {isRegistering && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nama
                </label>
                <input
                  type="text"
                  placeholder="Ali bin Abu"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Alamat Rumah
                </label>
                <textarea
                  placeholder="Lot 123, Jalan ABC"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                  required
                />
              </div>
            </>
          )}

          {/* Toggle link */}
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering)
              setError('')
              setSuccessMsg('')
            }}
            className="text-xs text-orange-500 underline hover:text-orange-600"
          >
            {isRegistering ? 'Tekan sini untuk Log Masuk!' : 'Tekan sini untuk daftar!'}
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-full transition-colors text-sm mt-2"
          >
            {isLoading ? 'Memproses...' : isRegistering ? 'Daftar' : 'Log Masuk'}
          </button>
        </form>
      )}

      {/* Merchant Tab */}
      {activeTab === 'peniaga' && (
        <form onSubmit={handleMerchantSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nama Pengguna
            </label>
            <input
              type="text"
              placeholder="Nama"
              value={namaPengguna}
              onChange={(e) => setNamaPengguna(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Kata Laluan
            </label>
            <input
              type="password"
              placeholder="••••••"
              value={kataLaluan}
              onChange={(e) => setKataLaluan(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-full transition-colors text-sm mt-2"
          >
            {isLoading ? 'Memproses...' : 'Log Masuk'}
          </button>
        </form>
      )}
    </div>
  )
}
