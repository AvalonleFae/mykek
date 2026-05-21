import { useState, useEffect, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
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
  imageMode: '',
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

  const [form, setForm] = useState(INITIAL_FORM)
  const { clearPersistedData } = useFormPersistence('mykek-order-form', form, setForm)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [specsRes, datesRes] = await Promise.all([
        api.get('/api/pelanggan/spesifikasi-kek'),
        api.get('/api/pelanggan/tarikh-tutup'),
      ])
      setCategories(specsRes.data.data || specsRes.data || [])
      setClosedDates(datesRes.data.data || datesRes.data || [])
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan data. Sila cuba lagi.')
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

  const calculateTotal = () => {
    let total = 0
    categories.forEach((cat) => {
      const selectedOptionId = form.selections[cat.id || cat.kategoriId]
      if (selectedOptionId) {
        const option = (cat.pilihan || cat.options || []).find(
          (o) => (o.id || o.pilihanId) === selectedOptionId
        )
        if (option) {
          total += Number(option.harga || option.price || 0)
        }
      }
    })
    return total
  }

  const getMinDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 2)
    return date.toISOString().split('T')[0]
  }

  const isDateClosed = (dateStr) => {
    return closedDates.some((d) => {
      const closed = d.tarikh || d.date
      return closed && closed.split('T')[0] === dateStr
    })
  }

  const handleGenerateAI = async () => {
    if (form.aiPrompt.length < 10 || form.aiPrompt.length > 500) {
      setError('Penerangan imej mestilah antara 10 hingga 500 aksara.')
      return
    }

    setError('')
    setGeneratingImage(true)
    try {
      const res = await api.post('/api/pelanggan/tempahan/jana-imej', {
        penerangan: form.aiPrompt,
      })
      const imageUrl = res.data.imageUrl || res.data.data?.imageUrl || ''
      setForm((prev) => ({ ...prev, aiImageUrl: imageUrl }))
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal menjana imej. Sila cuba lagi.')
    } finally {
      setGeneratingImage(false)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Hanya fail JPEG atau PNG dibenarkan.')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Saiz fail tidak boleh melebihi 5MB.')
      return
    }

    setError('')
    const preview = URL.createObjectURL(file)
    setForm((prev) => ({ ...prev, uploadedFile: file, uploadPreview: preview }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate selections
    const requiredCategories = categories.filter((c) => c.pilihan?.length > 0 || c.options?.length > 0)
    for (const cat of requiredCategories) {
      if (!form.selections[cat.id || cat.kategoriId]) {
        setError(`Sila pilih pilihan untuk kategori "${cat.nama || cat.name}".`)
        return
      }
    }

    // Validate date
    if (!form.tarikhAmbil) {
      setError('Sila pilih tarikh ambil/penghantaran.')
      return
    }

    if (form.tarikhAmbil < getMinDate()) {
      setError('Tarikh mestilah sekurang-kurangnya 2 hari dari hari ini.')
      return
    }

    if (isDateClosed(form.tarikhAmbil)) {
      setError('Tarikh yang dipilih adalah hari tutup. Sila pilih tarikh lain.')
      return
    }

    // Validate delivery address
    if (form.kaedahPenghantaran === 'delivery' && !form.alamatPenghantaran.trim()) {
      setError('Sila masukkan alamat penghantaran.')
      return
    }

    // Validate notes
    if (form.catatan.length > 500) {
      setError('Catatan tidak boleh melebihi 500 aksara.')
      return
    }

    setSubmitting(true)
    try {
      // Build order payload
      const butiran = Object.entries(form.selections).map(([kategoriId, pilihanId]) => ({
        kategoriId: Number(kategoriId),
        pilihanId: Number(pilihanId),
      }))

      const payload = {
        butiran,
        tarikhAmbil: form.tarikhAmbil,
        kaedahPenghantaran: form.kaedahPenghantaran === 'delivery' ? 'Penghantaran' : 'Ambil Sendiri',
        alamatPenghantaran: form.kaedahPenghantaran === 'delivery' ? form.alamatPenghantaran : undefined,
        catatan: form.catatan || undefined,
        aiImageUrl: form.aiImageUrl || undefined,
      }

      const res = await api.post('/api/pelanggan/tempahan', payload)
      const orderId = res.data.data?.id || res.data.data?.tempahanId || res.data.id

      // Upload image if file was selected
      if (form.uploadedFile && orderId) {
        try {
          const formData = new FormData()
          formData.append('imej', form.uploadedFile)
          formData.append('tempahanId', orderId)
          await api.post('/api/pelanggan/tempahan/muat-naik-imej', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } catch {
          // Image upload failure shouldn't block order success
        }
      }

      clearPersistedData()
      navigate(`/pelanggan/bayaran/${orderId}`)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal menghantar tempahan. Sila cuba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  const total = calculateTotal()

  // Handle chatbot form actions (selecting options)
  const handleChatbotFormAction = (action) => {
    if (action && action.jenis === 'pilih_opsyen' && action.kategoriId && action.pilihanId) {
      handleSelectionChange(action.kategoriId, action.pilihanId)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 p-6 md:p-10" style={{ backgroundColor: '#FFF5EE' }}>
        <div className="max-w-2xl mx-auto">
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
            <h1 className="text-xl font-bold text-gray-800 mb-6">Tempahan Baharu</h1>

            {loading ? (
              <LoadingSpinner />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && <ErrorMessage message={error} />}

                {/* Cake Specifications */}
                {categories.map((cat) => {
                  const catId = cat.id || cat.kategoriId
                  const options = cat.pilihan || cat.options || []
                  return (
                    <div key={catId} className="space-y-2">
                      <h3 className="text-sm font-semibold text-gray-700">
                        {cat.nama || cat.name}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {options.map((opt) => {
                          const optId = opt.id || opt.pilihanId
                          const isSelected = form.selections[catId] === optId
                          return (
                            <button
                              key={optId}
                              type="button"
                              onClick={() => handleSelectionChange(catId, optId)}
                              className={`p-3 rounded-xl border text-sm text-left transition-all ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                                  : 'border-gray-200 hover:border-orange-300'
                              }`}
                            >
                              <p className="font-medium text-gray-800">{opt.nama || opt.name}</p>
                              <p className="text-xs text-orange-500 mt-1">
                                RM {Number(opt.harga || opt.price || 0).toFixed(2)}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

                {/* Price Total */}
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Jumlah Harga:</span>
                    <span className="text-lg font-bold text-orange-600">RM {total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Date Picker */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Tarikh Ambil / Penghantaran
                  </label>
                  <input
                    type="date"
                    value={form.tarikhAmbil}
                    min={getMinDate()}
                    onChange={(e) => {
                      const val = e.target.value
                      if (isDateClosed(val)) {
                        setError('Tarikh yang dipilih adalah hari tutup. Sila pilih tarikh lain.')
                      } else {
                        setError('')
                        setForm((prev) => ({ ...prev, tarikhAmbil: val }))
                      }
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    required
                  />
                  {closedDates.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      Tarikh tutup: {closedDates.map((d) => (d.tarikh || d.date || '').split('T')[0]).join(', ')}
                    </p>
                  )}
                </div>

                {/* Delivery Method */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Kaedah Penghantaran
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, kaedahPenghantaran: 'pickup' }))}
                      className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${
                        form.kaedahPenghantaran === 'pickup'
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Ambil Sendiri
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, kaedahPenghantaran: 'delivery' }))}
                      className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${
                        form.kaedahPenghantaran === 'delivery'
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Penghantaran
                    </button>
                  </div>

                  {form.kaedahPenghantaran === 'delivery' && (
                    <textarea
                      value={form.alamatPenghantaran}
                      onChange={(e) => setForm((prev) => ({ ...prev, alamatPenghantaran: e.target.value }))}
                      placeholder="Masukkan alamat penghantaran"
                      rows={2}
                      className="w-full mt-3 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                      required
                    />
                  )}
                </div>

                {/* Image Reference Section */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Rujukan Imej Kek (Pilihan)
                  </label>
                  <div className="flex gap-3 mb-3">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, imageMode: 'ai' }))}
                      className={`flex-1 py-2 rounded-full text-xs font-medium transition-all ${
                        form.imageMode === 'ai'
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Jana Imej AI
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, imageMode: 'upload' }))}
                      className={`flex-1 py-2 rounded-full text-xs font-medium transition-all ${
                        form.imageMode === 'upload'
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Muat Naik Imej
                    </button>
                  </div>

                  {/* AI Image Generation */}
                  {form.imageMode === 'ai' && (
                    <div className="space-y-3">
                      <textarea
                        value={form.aiPrompt}
                        onChange={(e) => setForm((prev) => ({ ...prev, aiPrompt: e.target.value }))}
                        placeholder="Terangkan reka bentuk kek yang anda inginkan (10-500 aksara)"
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                      />
                      <p className="text-xs text-gray-400">{form.aiPrompt.length}/500 aksara</p>
                      <button
                        type="button"
                        onClick={handleGenerateAI}
                        disabled={generatingImage || form.aiPrompt.length < 10}
                        className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-medium rounded-full transition-colors"
                      >
                        {generatingImage ? 'Menjana...' : 'Jana Imej'}
                      </button>
                      {form.aiImageUrl && (
                        <div className="mt-3">
                          <img
                            src={form.aiImageUrl}
                            alt="Imej AI"
                            className="w-full max-w-xs rounded-xl border border-gray-200"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* File Upload */}
                  {form.imageMode === 'upload' && (
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleFileUpload}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-500 hover:file:bg-orange-100"
                      />
                      <p className="text-xs text-gray-400">JPEG atau PNG, maksimum 5MB</p>
                      {form.uploadPreview && (
                        <div className="mt-3">
                          <img
                            src={form.uploadPreview}
                            alt="Pratonton"
                            className="w-full max-w-xs rounded-xl border border-gray-200"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Catatan (Pilihan)
                  </label>
                  <textarea
                    value={form.catatan}
                    onChange={(e) => setForm((prev) => ({ ...prev, catatan: e.target.value }))}
                    placeholder="Sebarang permintaan khas..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">{form.catatan.length}/500 aksara</p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-full transition-colors text-sm"
                >
                  {submitting ? 'Menghantar...' : `Hantar Tempahan — RM ${total.toFixed(2)}`}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Chatbot Widget - Lazy loaded */}
      <Suspense fallback={null}>
        <ChatWidget
          formState={form}
          categories={categories}
          onFormAction={handleChatbotFormAction}
        />
      </Suspense>
    </div>
  )
}
