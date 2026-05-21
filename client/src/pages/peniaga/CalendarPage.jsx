import { useState, useEffect } from 'react'
import MerchantLayout from '../../components/MerchantLayout'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import SuccessMessage from '../../components/shared/SuccessMessage'
import api from '../../services/api'

const DAYS = ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab']
const MONTHS = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
]

export default function CalendarPage() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [closedDates, setClosedDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [noteModal, setNoteModal] = useState({ open: false, date: null })
  const [note, setNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchClosedDates = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/peniaga/tarikh-tutup')
      setClosedDates(res.data.data || [])
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal memuatkan tarikh tutup.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClosedDates()
  }, [])

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay()

  const formatDate = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const getClosedDateEntry = (dateStr) => {
    return closedDates.find((d) => {
      const dDate = new Date(d.tarikh)
      const formatted = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}-${String(dDate.getDate()).padStart(2, '0')}`
      return formatted === dateStr
    })
  }

  const handleDateClick = (day) => {
    const dateStr = formatDate(currentYear, currentMonth, day)
    const existing = getClosedDateEntry(dateStr)

    if (existing) {
      handleRemoveClosedDate(existing)
    } else {
      setNoteModal({ open: true, date: dateStr })
      setNote('')
    }
  }

  const handleAddClosedDate = async () => {
    setActionLoading(true)
    setError('')
    try {
      const res = await api.post('/api/peniaga/tarikh-tutup', {
        tarikh: noteModal.date,
        catatan: note.trim() || null,
      })
      if (res.data.amaran) {
        setSuccess(`Tarikh ditambah. Amaran: ${res.data.amaran}`)
      } else {
        setSuccess('Tarikh tutup berjaya ditambah.')
      }
      setNoteModal({ open: false, date: null })
      setNote('')
      fetchClosedDates()
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal menambah tarikh tutup.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveClosedDate = async (entry) => {
    setActionLoading(true)
    setError('')
    try {
      await api.delete(`/api/peniaga/tarikh-tutup/${entry.tarikhTutupId}`)
      setSuccess('Tarikh tutup berjaya dibuang.')
      fetchClosedDates()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal membuang tarikh tutup.')
    } finally {
      setActionLoading(false)
    }
  }

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const daysInMonth = getDaysInMonth(currentMonth, currentYear)
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear)

  const calendarCells = []
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d)
  }

  return (
    <MerchantLayout title="Kalendar Cuti" subtitle="Tetapkan tarikh kedai tidak beroperasi.">
      <div className="space-y-6">
        <SuccessMessage message={success} />
        <ErrorMessage message={error} />

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="bg-white rounded-2xl shadow-md p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={prevMonth}
                className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                ← Sebelum
              </button>
              <h2 className="text-lg font-bold text-gray-800">
                {MONTHS[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={nextMonth}
                className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                Seterusnya →
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="h-14"></div>
                }

                const dateStr = formatDate(currentYear, currentMonth, day)
                const closedEntry = getClosedDateEntry(dateStr)
                const isClosed = !!closedEntry
                const isToday =
                  day === today.getDate() &&
                  currentMonth === today.getMonth() &&
                  currentYear === today.getFullYear()

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    disabled={actionLoading}
                    className={`h-14 rounded-xl text-sm font-medium transition-colors relative ${
                      isClosed
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : isToday
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    } disabled:opacity-50`}
                    title={closedEntry?.catatan || ''}
                  >
                    {day}
                    {isClosed && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-100 border border-red-300 rounded"></span>
                Tarikh Tutup
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></span>
                Hari Ini
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-2">
              Klik tarikh untuk menambah/membuang tarikh tutup.
            </p>
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      {noteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNoteModal({ open: false, date: null })}></div>
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Tambah Tarikh Tutup</h3>
            <p className="text-sm text-gray-600 mb-4">Tarikh: {noteModal.date}</p>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan (pilihan)"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setNoteModal({ open: false, date: null })}
                className="px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAddClosedDate}
                disabled={actionLoading}
                className="px-5 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-full transition-colors disabled:opacity-50"
              >
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </MerchantLayout>
  )
}
