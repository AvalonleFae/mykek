import { useState, useEffect, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { puter } from '@heyputer/puter.js'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import useFormPersistence from '../../hooks/useFormPersistence'
import api from '../../services/api'

const ChatWidget = lazy(() => import('../../components/Chatbot/ChatWidget'))

const INITIAL_FORM = {
  selections: {},
  tarikhAmbil: '',
  kaedahPenghantaran: 'pickup',
  alamatPenghantaran: '',
  catatan: '',
  imageMode: 'ai',
  aiPrompt: '',
  aiImageUrl: '',
  uploadedFile: null,
  uploadPreview: '',
}

export default function OrderFormPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState([])
  const [closedDates, setClosedDates] = useState([])
  const [generatingImage, setGeneratingImage] = useState(false)
  const [profileAddress, setProfileAddress] = useState('')

  const [form, setForm] = useState(INITIAL_FORM)
  const { clearPersistedData } = useFormPersistence('mykek-order-form', form, setForm)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [specsRes, datesRes, profileRes] = await Promise.all([
        api.get('/api/pelanggan/spesifikasi-kek'),
        api.get('/api/pelanggan/tarikh-tutup'),
        api.get('/api/pelanggan/profil'),
      ])
      setCategories(specsRes.data.data || [])
      setClosedDates(datesRes.data.data || [])
      setProfileAddress(profileRes.data.data?.alamat || '')
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan data.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectionChange = (categoryId, optionId) => {
    setForm((prev) => ({
      ...prev,
      selections: { ...prev.selections, [categoryId]: optionId },
    }))
  }

  // Clear stale selections that don't match current categories
  useEffect(() => {
    if (categories.length > 0 && Object.keys(form.selections).length > 0) {
      const validCatIds = categories.map(c => String(c.kategoriId || c.id))
      const cleanedSelections = {}
      for (const [catId, optId] of Object.entries(form.selections)) {
        if (validCatIds.includes(String(catId))) {
          // Also verify the option exists in this category
          const cat = categories.find(c => String(c.kategoriId || c.id) === String(catId))
          const options = cat?.pilihan || []
          const optionExists = options.some(o => String(o.pilihanId || o.id) === String(optId))
          if (optionExists) {
            cleanedSelections[catId] = optId
          }
        }
      }
      if (Object.keys(cleanedSelections).length !== Object.keys(form.selections).length) {
        setForm(prev => ({ ...prev, selections: cleanedSelections }))
      }
    }
  }, [categories])

  const calculateTotal = () => {
    let total = 0
    categories.forEach((cat) => {
      const catId = cat.kategoriId || cat.id
      const selectedOptionId = form.selections[catId]
      if (selectedOptionId) {
        const option = (cat.pilihan || []).find((o) => String(o.pilihanId || o.id) === String(selectedOptionId))
        if (option) total += Number(option.hargaTambahan || option.harga || 0)
      }
    })
    return total
  }

  const getMinDate = () => {
    const d = new Date(); d.setDate(d.getDate() + 2)
    return d.toISOString().split('T')[0]
  }

  const isDateClosed = (dateStr) => closedDates.some((d) => (d.tarikh || '').split('T')[0] === dateStr)

  const handleGenerateAI = async () => {
    if (form.aiPrompt.length < 10 || form.aiPrompt.length > 500) {
      setError('Penerangan imej mestilah antara 10 hingga 500 aksara.')
      return
    }
    setError('')
    setGeneratingImage(true)
    try {
      const imageElement = await puter.ai.txt2img(
        `A realistic custom cake design: ${form.aiPrompt}`,
        { model: 'flux-schnell' }
      )
      const imageUrl = imageElement.src || imageElement.getAttribute('src')
      setForm((prev) => ({ ...prev, aiImageUrl: imageUrl }))
    } catch (err) {
      console.error('Image generation error:', err)
      if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('throttled')) {
        setError('Had penjanaan imej dicapai. Sila tunggu 10 saat dan cuba lagi.')
      } else {
        setError('Gagal menjana imej. Sila cuba lagi atau muat naik imej rujukan.')
      }
    } finally {
      setGeneratingImage(false)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setError('Hanya fail JPEG atau PNG dibenarkan.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Saiz fail tidak boleh melebihi 5MB.'); return }
    setError('')
    setForm((prev) => ({ ...prev, uploadedFile: file, uploadPreview: URL.createObjectURL(file) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const requiredCats = categories.filter((c) => (c.pilihan || []).length > 0)
    for (const cat of requiredCats) {
      if (!form.selections[cat.kategoriId || cat.id]) {
        setError(`Sila pilih pilihan untuk "${cat.nama}".`); return
      }
    }
    if (!form.tarikhAmbil) { setError('Sila pilih tarikh ambil/penghantaran.'); return }
    if (form.tarikhAmbil < getMinDate()) { setError('Tarikh mestilah sekurang-kurangnya 2 hari dari hari ini.'); return }
    if (isDateClosed(form.tarikhAmbil)) { setError('Tarikh yang dipilih adalah hari tutup.'); return }
    // For delivery: use typed address, or fall back to profile address
    if (form.kaedahPenghantaran === 'delivery' && !form.alamatPenghantaran.trim() && !profileAddress) {
      setError('Sila masukkan alamat penghantaran atau kemaskini alamat di profil anda.'); return
    }

    setSubmitting(true)
    try {
      const butiran = Object.entries(form.selections).map(([kategoriId, pilihanId]) => ({
        kategoriId, pilihanId,
      }))
      // Use typed address or fallback to profile address
      const deliveryAddress = form.kaedahPenghantaran === 'delivery'
        ? (form.alamatPenghantaran.trim() || profileAddress)
        : undefined
      const payload = {
        butiran,
        tarikhAmbil: form.tarikhAmbil,
        kaedahPenghantaran: form.kaedahPenghantaran === 'delivery' ? 'Penghantaran' : 'Ambil Sendiri',
        alamatPenghantaran: deliveryAddress,
        catatan: form.catatan || undefined,
      }

      // Pass order data to payment page — order will be created after payment proof is uploaded
      clearPersistedData()
      navigate('/pelanggan/bayaran/baharu', {
        state: {
          orderPayload: payload,
          uploadedFile: form.uploadedFile || null,
          aiImageUrl: form.aiImageUrl || null,
          aiPrompt: form.aiPrompt || null,
        }
      })
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal menghantar tempahan.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChatbotFormAction = (action) => {
    if (action?.jenis === 'pilih_opsyen') handleSelectionChange(action.kategoriId, action.pilihanId)
  }

  const total = calculateTotal()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b shadow-sm">
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-orange-500">
            <path d="M12 2L2 19h20L12 2z" />
          </svg>
          <span className="text-lg font-bold text-gray-800">MyKek</span>
          <button onClick={() => navigate('/pelanggan')} className="ml-2 text-gray-600 hover:text-orange-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>
        <span className="px-4 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-full">
          Tempahan Kek Baharu
        </span>
      </header>

      <main className="flex-1 p-4 md:p-8" style={{ backgroundColor: '#FFF5EE' }}>
        <div className="max-w-lg mx-auto">
          {loading ? <LoadingSpinner /> : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <ErrorMessage message={error} />}

              {/* Section 1: Spesifikasi Kek */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-orange-500 font-semibold text-sm mb-4">1. Spesifikasi Kek</h2>

                {categories.map((cat) => {
                  const catId = cat.kategoriId || cat.id
                  const options = cat.pilihan || []
                  return (
                    <div key={catId} className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{cat.nama}</label>
                      <select
                        value={form.selections[catId] || ''}
                        onChange={(e) => handleSelectionChange(catId, e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none"
                      >
                        <option value="">-- Pilih --</option>
                        {options.map((opt) => (
                          <option key={opt.pilihanId || opt.id} value={opt.pilihanId || opt.id}>
                            {opt.nama} — RM {Number(opt.hargaTambahan || 0).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>

              {/* Section 2: Imej Rujukan Kek */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-orange-500 font-semibold text-sm mb-4">2. Imej Rujukan Kek</h2>

                <p className="text-sm font-semibold text-gray-700 mb-2">Jenis Imej Rujukan</p>
                <div className="flex gap-6 mb-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio" name="imageMode" value="ai"
                      checked={form.imageMode === 'ai'}
                      onChange={() => setForm((prev) => ({ ...prev, imageMode: 'ai' }))}
                      className="accent-orange-500"
                    />
                    Jana Imej AI
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio" name="imageMode" value="upload"
                      checked={form.imageMode === 'upload'}
                      onChange={() => setForm((prev) => ({ ...prev, imageMode: 'upload' }))}
                      className="accent-orange-500"
                    />
                    Muat Turun Sendiri
                  </label>
                </div>

                {/* AI Mode */}
                {form.imageMode === 'ai' && (
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      Deskripsi Reka Bentuk Kek (Prompt AI)
                    </label>
                    <textarea
                      value={form.aiPrompt}
                      onChange={(e) => setForm((prev) => ({ ...prev, aiPrompt: e.target.value }))}
                      placeholder='Contoh: Kek tema Mickey Mouse dengan warna "biru"'
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateAI}
                      disabled={generatingImage || form.aiPrompt.length < 10}
                      className="px-4 py-2 border border-orange-500 text-orange-500 text-sm font-medium rounded-lg hover:bg-orange-50 disabled:opacity-50 transition-colors"
                    >
                      {generatingImage ? 'Menjana...' : 'Jana Imej'}
                    </button>

                    {form.aiImageUrl && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1">
                          Sila pilih <strong>SATU</strong> imej sebagai rujukan
                        </p>
                        <p className="text-xs text-gray-400 mb-2">Imej dipilih untuk dihantar</p>
                        <div className="border-2 border-orange-400 rounded-lg p-2 inline-block">
                          <img src={form.aiImageUrl} alt="Imej AI" className="w-48 h-48 object-cover rounded" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Mode */}
                {form.imageMode === 'upload' && (
                  <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">Muat Naik Imej Rujukan</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleFileUpload}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50"
                    />
                    {form.uploadPreview && (
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Preview Imej</p>
                        <img src={form.uploadPreview} alt="Pratonton" className="w-48 h-48 object-cover rounded-lg border border-gray-200" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3: Maklumat Penghantaran */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-orange-500 font-semibold text-sm mb-4">3. Maklumat Penghantaran</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tarikh Ambil/Hantar</label>
                    <input
                      type="date"
                      value={form.tarikhAmbil}
                      min={getMinDate()}
                      onChange={(e) => {
                        const val = e.target.value
                        if (isDateClosed(val)) setError('Tarikh tutup. Pilih tarikh lain.')
                        else { setError(''); setForm((prev) => ({ ...prev, tarikhAmbil: val })) }
                      }}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Kaedah</label>
                    <select
                      value={form.kaedahPenghantaran}
                      onChange={(e) => setForm((prev) => ({ ...prev, kaedahPenghantaran: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                    >
                      <option value="pickup">Ambil Sendiri</option>
                      <option value="delivery">Penghantaran</option>
                    </select>
                  </div>
                </div>

                {/* Closed dates warning */}
                {closedDates.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-semibold text-red-600 mb-1">⚠️ Tarikh Tidak Tersedia:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {closedDates.map((d, idx) => {
                        const dateObj = new Date(d.tarikh)
                        const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`
                        return (
                          <span key={idx} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                            {dateStr}{d.catatan ? ` (${d.catatan})` : ''}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {form.kaedahPenghantaran === 'delivery' && (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Alamat Penghantaran
                      <span className="text-xs text-orange-500 font-normal ml-2">(Jika tidak diisi, alamat asal profil akan diguna)</span>
                    </label>
                    <textarea
                      value={form.alamatPenghantaran}
                      onChange={(e) => setForm((prev) => ({ ...prev, alamatPenghantaran: e.target.value }))}
                      placeholder="Contoh: Lot 123, Jalan Baru"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                    />
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Catatan Tambahan</label>
                  <textarea
                    value={form.catatan}
                    onChange={(e) => setForm((prev) => ({ ...prev, catatan: e.target.value }))}
                    placeholder='Contoh: Mohon tulis ucapan "Happy Anniversary Sayang" menggunakan krim berwarna biru tua'
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>

                {/* Total & Submit */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500">Jumlah Harga:</p>
                    <p className="text-xl font-bold text-orange-500">RM {total.toFixed(2)}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-8 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-full text-sm transition-colors"
                  >
                    {submitting ? 'Menghantar...' : 'Hantar Tempahan'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* AI Chatbot Button - Fixed, highly visible */}
      <Suspense fallback={null}>
        <ChatWidget formState={form} categories={categories} onFormAction={handleChatbotFormAction} />
      </Suspense>

      {/* Chatbot helper label */}
      <div className="fixed bottom-20 right-4 z-40 pointer-events-none">
        <div className="bg-orange-500 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg animate-bounce">
          💬 Bantuan AI
        </div>
      </div>
    </div>
  )
}
