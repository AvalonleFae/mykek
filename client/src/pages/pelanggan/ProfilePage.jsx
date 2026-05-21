import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 p-6 md:p-10" style={{ backgroundColor: '#FFF5EE' }}>
        <div className="max-w-lg mx-auto">
          {/* Back button */}
          <button
            onClick={() => navigate('/pelanggan')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-500 mb-6 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Kembali ke Menu Utama
          </button>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <h1 className="text-xl font-bold text-gray-800 mb-6">Profil Saya</h1>

            {loading ? (
              <LoadingSpinner />
            ) : (
              <>
                {error && <div className="mb-4"><ErrorMessage message={error} /></div>}
                {success && <div className="mb-4"><SuccessMessage message={success} /></div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Phone (read-only) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      No. Telefon
                    </label>
                    <input
                      type="text"
                      value={profile.noTelefon || ''}
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-full text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Nama
                    </label>
                    <input
                      type="text"
                      value={form.nama}
                      onChange={(e) => setForm({ ...form, nama: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">2-100 aksara</p>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Alamat
                    </label>
                    <textarea
                      value={form.alamat}
                      onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Maksimum 500 aksara ({form.alamat.length}/500)</p>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-full transition-colors text-sm"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
