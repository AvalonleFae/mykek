import { useState, useEffect } from 'react'
import MerchantLayout from '../../components/MerchantLayout'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import SuccessMessage from '../../components/shared/SuccessMessage'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import api from '../../services/api'

export default function SpecManagementPage() {
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Category form
  const [catForm, setCatForm] = useState({ nama: '', penerangan: '' })
  const [editingCat, setEditingCat] = useState(null)
  const [showCatForm, setShowCatForm] = useState(false)

  // Option form
  const [optForm, setOptForm] = useState({ nama: '', penerangan: '', hargaTambahan: '' })
  const [editingOpt, setEditingOpt] = useState(null)
  const [showOptForm, setShowOptForm] = useState(false)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: '', id: null, name: '' })

  const fetchCategories = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/peniaga/kategori-spesifikasi')
      setCategories(res.data.data || [])
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan kategori.')
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async (kategoriId) => {
    setOptionsLoading(true)
    try {
      const res = await api.get(`/api/peniaga/pilihan-spesifikasi/${kategoriId}`)
      setOptions(res.data.data || [])
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan pilihan.')
    } finally {
      setOptionsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      fetchOptions(selectedCategory.kategoriId)
    }
  }, [selectedCategory])

  // Category CRUD
  const handleSaveCategory = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (editingCat) {
        await api.put(`/api/peniaga/kategori-spesifikasi/${editingCat.kategoriId}`, catForm)
        setSuccess('Kategori berjaya dikemaskini.')
      } else {
        await api.post('/api/peniaga/kategori-spesifikasi', catForm)
        setSuccess('Kategori berjaya dicipta.')
      }
      setCatForm({ nama: '', penerangan: '' })
      setEditingCat(null)
      setShowCatForm(false)
      fetchCategories()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal menyimpan kategori.')
    }
  }

  const handleEditCategory = (cat) => {
    setEditingCat(cat)
    setCatForm({ nama: cat.nama, penerangan: cat.penerangan || '' })
    setShowCatForm(true)
  }

  const handleDeleteCategory = async () => {
    setError('')
    try {
      await api.delete(`/api/peniaga/kategori-spesifikasi/${deleteConfirm.id}`)
      setSuccess('Kategori berjaya dipadam.')
      setDeleteConfirm({ open: false, type: '', id: null, name: '' })
      if (selectedCategory?.kategoriId === deleteConfirm.id) {
        setSelectedCategory(null)
        setOptions([])
      }
      fetchCategories()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memadam kategori.')
      setDeleteConfirm({ open: false, type: '', id: null, name: '' })
    }
  }

  // Option CRUD
  const handleSaveOption = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        nama: optForm.nama,
        penerangan: optForm.penerangan,
        hargaTambahan: parseFloat(optForm.hargaTambahan) || 0,
      }
      if (editingOpt) {
        await api.put(`/api/peniaga/pilihan-spesifikasi/${editingOpt.pilihanId}`, payload)
        setSuccess('Pilihan berjaya dikemaskini.')
      } else {
        await api.post('/api/peniaga/pilihan-spesifikasi', {
          ...payload,
          kategoriId: selectedCategory.kategoriId,
        })
        setSuccess('Pilihan berjaya dicipta.')
      }
      setOptForm({ nama: '', penerangan: '', hargaTambahan: '' })
      setEditingOpt(null)
      setShowOptForm(false)
      fetchOptions(selectedCategory.kategoriId)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal menyimpan pilihan.')
    }
  }

  const handleEditOption = (opt) => {
    setEditingOpt(opt)
    setOptForm({ nama: opt.nama, penerangan: opt.penerangan || '', hargaTambahan: String(opt.hargaTambahan || 0) })
    setShowOptForm(true)
  }

  const handleDeleteOption = async () => {
    setError('')
    try {
      await api.delete(`/api/peniaga/pilihan-spesifikasi/${deleteConfirm.id}`)
      setSuccess('Pilihan berjaya dipadam.')
      setDeleteConfirm({ open: false, type: '', id: null, name: '' })
      fetchOptions(selectedCategory.kategoriId)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memadam pilihan.')
      setDeleteConfirm({ open: false, type: '', id: null, name: '' })
    }
  }

  return (
    <MerchantLayout title="Pengurusan Spesifikasi Kek" subtitle="Urus kategori dan pilihan spesifikasi kek.">
      <div className="space-y-6">
        <SuccessMessage message={success} />
        <ErrorMessage message={error} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categories Panel */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Kategori</h2>
              <button
                onClick={() => { setShowCatForm(true); setEditingCat(null); setCatForm({ nama: '', penerangan: '' }) }}
                className="px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors"
              >
                + Tambah
              </button>
            </div>

            {showCatForm && (
              <form onSubmit={handleSaveCategory} className="mb-4 p-4 bg-gray-50 rounded-xl space-y-3">
                <input
                  type="text"
                  value={catForm.nama}
                  onChange={(e) => setCatForm({ ...catForm, nama: e.target.value })}
                  placeholder="Nama kategori"
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <input
                  type="text"
                  value={catForm.penerangan}
                  onChange={(e) => setCatForm({ ...catForm, penerangan: e.target.value })}
                  placeholder="Penerangan (pilihan)"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors">
                    {editingCat ? 'Kemaskini' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCatForm(false); setEditingCat(null) }}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <LoadingSpinner />
            ) : categories.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Tiada kategori.</p>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div
                    key={cat.kategoriId}
                    className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedCategory?.kategoriId === cat.kategoriId
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{cat.nama}</p>
                        {cat.penerangan && <p className="text-xs text-gray-500">{cat.penerangan}</p>}
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEditCategory(cat)}
                          className="p-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ open: true, type: 'category', id: cat.kategoriId, name: cat.nama })}
                          className="p-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          Padam
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Options Panel */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">
                Pilihan {selectedCategory ? `- ${selectedCategory.nama}` : ''}
              </h2>
              {selectedCategory && (
                <button
                  onClick={() => { setShowOptForm(true); setEditingOpt(null); setOptForm({ nama: '', penerangan: '', hargaTambahan: '' }) }}
                  className="px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors"
                >
                  + Tambah
                </button>
              )}
            </div>

            {!selectedCategory ? (
              <p className="text-sm text-gray-500 text-center py-4">Sila pilih kategori untuk melihat pilihan.</p>
            ) : (
              <>
                {showOptForm && (
                  <form onSubmit={handleSaveOption} className="mb-4 p-4 bg-gray-50 rounded-xl space-y-3">
                    <input
                      type="text"
                      value={optForm.nama}
                      onChange={(e) => setOptForm({ ...optForm, nama: e.target.value })}
                      placeholder="Nama pilihan"
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                    <input
                      type="text"
                      value={optForm.penerangan}
                      onChange={(e) => setOptForm({ ...optForm, penerangan: e.target.value })}
                      placeholder="Penerangan (pilihan)"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={optForm.hargaTambahan}
                      onChange={(e) => setOptForm({ ...optForm, hargaTambahan: e.target.value })}
                      placeholder="Harga tambahan (RM)"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className="px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors">
                        {editingOpt ? 'Kemaskini' : 'Simpan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowOptForm(false); setEditingOpt(null) }}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                )}

                {optionsLoading ? (
                  <LoadingSpinner />
                ) : options.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Tiada pilihan untuk kategori ini.</p>
                ) : (
                  <div className="space-y-2">
                    {options.map((opt) => (
                      <div key={opt.pilihanId} className="p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{opt.nama}</p>
                            {opt.penerangan && <p className="text-xs text-gray-500">{opt.penerangan}</p>}
                            <p className="text-xs text-orange-600 font-medium mt-0.5">
                              +RM {Number(opt.hargaTambahan || 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditOption(opt)}
                              className="p-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ open: true, type: 'option', id: opt.pilihanId, name: opt.nama })}
                              className="p-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              Padam
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        title="Sahkan Pemadaman"
        message={`Adakah anda pasti mahu memadam "${deleteConfirm.name}"?`}
        onConfirm={deleteConfirm.type === 'category' ? handleDeleteCategory : handleDeleteOption}
        onCancel={() => setDeleteConfirm({ open: false, type: '', id: null, name: '' })}
      />
    </MerchantLayout>
  )
}
