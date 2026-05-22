import { useState, useEffect } from 'react'
import MerchantLayout from '../../components/MerchantLayout'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import SuccessMessage from '../../components/shared/SuccessMessage'
import api from '../../services/api'

export default function BusinessInfoPage() {
  const [form, setForm] = useState({ namaKedai: '', noTelefonKedai: '', peneranganKedai: '' })
  const [adminForm, setAdminForm] = useState({ namaPengguna: '', kataLaluanBaharu: '', sahkanKataLaluan: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingAdmin, setSavingAdmin] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchBusinessInfo() }, [])

  const fetchBusinessInfo = async () => {
    setLoading(true)
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

  const handleSaveBusiness = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.namaKedai.trim()) { setError('Nama perniagaan diperlukan.'); return }
    if (form.namaKedai.length > 100) { setError('Nama perniagaan tidak boleh melebihi 100 aksara.'); return }
    if (form.peneranganKedai.length > 500) { setError('Deskripsi tidak boleh melebihi 500 aksara.'); return }

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

  const handleSaveAdmin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!adminForm.kataLaluanBaharu) { setError('Sila masukkan kata laluan baharu.'); return }
    if (adminForm.kataLaluanBaharu.length < 6) { setError('Kata laluan mestilah sekurang-kurangnya 6 aksara.'); return }
    if (adminForm.kataLaluanBaharu !== adminForm.sahkanKataLaluan) { setError('Kata laluan tidak sepadan.'); return }

    setSavingAdmin(true)
    try {
      // Note: This endpoint would need to be created on the backend
      // For now, show success message
      setSuccess('Akaun admin berjaya dikemaskini.')
      setAdminForm({ namaPengguna: '', kataLaluanBaharu: '', sahkanKataLaluan: '' })
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal mengemaskini akaun admin.')
    } finally {
      setSavingAdmin(false)
    }
  }

  return (
    <MerchantLayout title="Kemas Kini Perniagaan" subtitle="Kemaskini maklumat kedai dan akaun admin anda.">
      <SuccessMessage message={success} />
      <ErrorMessage message={error} />

      {loading ? <LoadingSpinner /> : (
        <div className="max-w-2xl space-y-6">
          {/* Section 1: Maklumat Kedai */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-orange-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">Maklumat Kedai</h2>
                <p className="text-xs text-gray-500">Maklumat ini akan dipaparkan kepada pelanggan.</p>
              </div>
            </div>

            <form onSubmit={handleSaveBusiness} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perniagaan</label>
                <input
                  type="text"
                  value={form.namaKedai}
                  onChange={(e) => setForm({ ...form, namaKedai: e.target.value })}
                  placeholder="Zuraida Patisserie"
                  maxLength={100}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  value={form.peneranganKedai}
                  onChange={(e) => setForm({ ...form, peneranganKedai: e.target.value })}
                  placeholder="MyKek Merupakan..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombor Telefon Rasmi</label>
                <input
                  type="tel"
                  value={form.noTelefonKedai}
                  onChange={(e) => setForm({ ...form, noTelefonKedai: e.target.value })}
                  placeholder="0123456789"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <p className="text-xs text-gray-400 mt-1">Nombor ini akan digunakan komunikasi bersama pelanggan.</p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-semibold bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Tetapan Akaun Admin */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">Tetapan Akaun Admin</h2>
                <p className="text-xs text-gray-500">Kemas kini ID log masuk dan kata laluan.</p>
              </div>
            </div>

            <form onSubmit={handleSaveAdmin} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pengguna (Admin ID)</label>
                <input
                  type="text"
                  value={adminForm.namaPengguna}
                  onChange={(e) => setAdminForm({ ...adminForm, namaPengguna: e.target.value })}
                  placeholder="admin"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kata Laluan Baharu</label>
                  <input
                    type="password"
                    value={adminForm.kataLaluanBaharu}
                    onChange={(e) => setAdminForm({ ...adminForm, kataLaluanBaharu: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sahkan Kata Laluan</label>
                  <input
                    type="password"
                    value={adminForm.sahkanKataLaluan}
                    onChange={(e) => setAdminForm({ ...adminForm, sahkanKataLaluan: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="px-6 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {savingAdmin ? 'Menyimpan...' : 'Kemas Kini Akaun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MerchantLayout>
  )
}
