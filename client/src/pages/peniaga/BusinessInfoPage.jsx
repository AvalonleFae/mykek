import { useState, useEffect } from 'react'
import MerchantLayout from '../../components/MerchantLayout'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import SuccessMessage from '../../components/shared/SuccessMessage'
import api from '../../services/api'

export default function BusinessInfoPage() {
  const [form, setForm] = useState({
    namaKedai: '',
    noTelefonKedai: '',
    peneranganKedai: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchBusinessInfo = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/peniaga/profil-perniagaan')
      const data = res.data.data
      setForm({
        namaKedai: data.namaKedai || '',
        noTelefonKedai: data.noTelefonKedai || '',
        peneranganKedai: data.peneranganKedai || '',
      })
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan maklumat perniagaan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBusinessInfo()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Client-side validation
    if (!form.namaKedai.trim()) {
      setError('Nama kedai diperlukan.')
      return
    }
    if (form.namaKedai.trim().length > 100) {
      setError('Nama kedai tidak boleh melebihi 100 aksara.')
      return
    }
    if (form.noTelefonKedai && !/^[0-9]{10,11}$/.test(form.noTelefonKedai.replace(/[-\s]/g, ''))) {
      setError('Format nombor telefon tidak sah. Sila masukkan 10-11 digit.')
      return
    }
    if (form.peneranganKedai.length > 500) {
      setError('Penerangan kedai tidak boleh melebihi 500 aksara.')
      return
    }

    setSaving(true)
    try {
      await api.put('/api/peniaga/profil-perniagaan', {
        namaKedai: form.namaKedai.trim(),
        noTelefonKedai: form.noTelefonKedai.trim() || null,
        peneranganKedai: form.peneranganKedai.trim() || null,
      })
      setSuccess('Maklumat perniagaan berjaya dikemaskini.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal mengemaskini maklumat perniagaan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <MerchantLayout title="Maklumat Perniagaan" subtitle="Kemaskini maklumat kedai anda.">
      <div className="max-w-xl">
        <SuccessMessage message={success} />
        <ErrorMessage message={error} />

        {loading ? (
          <LoadingSpinner />
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-5 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Kedai <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.namaKedai}
                onChange={(e) => setForm({ ...form, namaKedai: e.target.value })}
                maxLength={100}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="Masukkan nama kedai"
              />
              <p className="text-xs text-gray-400 mt-1">{form.namaKedai.length}/100 aksara</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                No. Telefon Kedai
              </label>
              <input
                type="tel"
                value={form.noTelefonKedai}
                onChange={(e) => setForm({ ...form, noTelefonKedai: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                placeholder="cth: 0123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Penerangan Kedai
              </label>
              <textarea
                value={form.peneranganKedai}
                onChange={(e) => setForm({ ...form, peneranganKedai: e.target.value })}
                maxLength={500}
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                placeholder="Masukkan penerangan kedai anda"
              />
              <p className="text-xs text-gray-400 mt-1">{form.peneranganKedai.length}/500 aksara</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 text-sm font-semibold bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        )}
      </div>
    </MerchantLayout>
  )
}
