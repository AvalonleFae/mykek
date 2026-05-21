import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import SuccessMessage from '../../components/shared/SuccessMessage'
import api from '../../services/api'

export default function ProfilePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profile, setProfile] = useState({ nama: '', noTelefon: '', alamat: '' })
  const [form, setForm] = useState({ nama: '', alamat: '' })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/pelanggan/profil')
      const data = res.data.data || res.data
      setProfile(data)
      setForm({ nama: data.nama || '', alamat: data.alamat || '' })
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan profil.')
    } finally {
      setLoading(false)
    }
  }

  const validate = () => {
    if (form.nama.length < 2 || form.nama.length > 100) {
      setError('Nama mestilah antara 2 hingga 100 aksara.')
      return false
    }
    if (form.alamat.length > 500) {
      setError('Alamat tidak boleh melebihi 500 aksara.')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validate()) return

    setSaving(true)
    try {
      await api.put('/api/pelanggan/profil', {
        nama: form.nama,
        alamat: form.alamat,
      })
      setSuccess('Profil berjaya dikemaskini!')
      setProfile((prev) => ({ ...prev, nama: form.nama, alamat: form.alamat }))
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal mengemaskini profil.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({ nama: profile.nama || '', alamat: profile.alamat || '' })
    setError('')
    setSuccess('')
    navigate('/pelanggan')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header with back arrow and Profil badge */}
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b shadow-sm">
        <div className="flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-7 h-7 text-orange-500"
          >
            <path d="M12 2L2 19h20L12 2z" />
          </svg>
          <span className="text-lg font-bold text-gray-800">MyKek</span>
          <button
            onClick={() => navigate('/pelanggan')}
            className="ml-2 text-gray-600 hover:text-orange-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>
        <span className="px-4 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-full">
          Profil
        </span>
      </header>

      <main className="flex-1" style={{ backgroundColor: '#FFF5EE' }}>
        <div className="max-w-lg mx-auto px-4 py-6">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              {/* Avatar Section */}
              <div className="bg-orange-100 rounded-t-2xl py-8 flex justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-orange-300 flex items-center justify-center bg-white">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-orange-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
              </div>

              {/* Form Section */}
              <div className="bg-white rounded-b-2xl shadow-md px-6 py-6">
                {error && <div className="mb-4"><ErrorMessage message={error} /></div>}
                {success && <div className="mb-4"><SuccessMessage message={success} /></div>}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Nama Penuh
                    </label>
                    <input
                      type="text"
                      value={form.nama}
                      onChange={(e) => setForm({ ...form, nama: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Nama ini akan digunakan untuk label tempahan.
                    </p>
                  </div>

                  {/* Phone (read-only) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      No Telefon
                    </label>
                    <input
                      type="text"
                      value={profile.noTelefon || ''}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Nombor telefon ini akan digunakan untuk log masuk dan mesej peniaga.
                    </p>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Alamat Rumah
                    </label>
                    <textarea
                      value={form.alamat}
                      onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                      rows={4}
                      placeholder="No 123, Jalan Baru, Sarawak"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Alamat ini akan menjadi alamat asal untuk penghantaran kek.
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4 pt-2">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-lg text-sm transition-colors"
                    >
                      {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
