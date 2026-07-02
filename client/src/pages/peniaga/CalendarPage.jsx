import { useState, useEffect } from 'react'
import MerchantLayout from '../../components/MerchantLayout'
import LoadingSpinner from '../../components/shared/LoadingSpinner'
import ErrorMessage from '../../components/shared/ErrorMessage'
import SuccessMessage from '../../components/shared/SuccessMessage'
import api from '../../services/api'

const DAYS = ['Ah', 'Is', 'Se', 'Ra', 'Kh', 'Ju', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function CalendarPage() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [closedDates, setClosedDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Form state
  const [formMula, setFormMula] = useState('')
  const [formHingga, setFormHingga] = useState('')
  const [formStatus, setFormStatus] = useState('tutup') // 'buka' or 'tutup'
  const [formSebab, setFormSebab] = useState('')

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

  useEffect(() => { fetchClosedDates() }, [])

  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay()

  const formatDateStr = (year, month, day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const isDateClosed = (dateStr) => {
    return closedDates.some((d) => {
      const dDate = new Date(d.tarikh)
      const formatted = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}-${String(dDate.getDate()).padStart(2, '0')}`
      return formatted === dateStr
    })
  }

  const handleDateClick = (day) => {
    const dateStr = formatDateStr(currentYear, currentMonth, day)
    setFormMula(dateStr)
    setFormHingga(dateStr)
  }

  const handleSave = async () => {
    if (!formMula) { setError('Sila pilih tarikh.'); return }
    setActionLoading(true)
    setError('')

    try {
      if (formStatus === 'tutup') {
        // Add closed dates for the range
        const start = new Date(formMula)
        const end = formHingga ? new Date(formHingga) : start
        let added = 0

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          try {
            await api.post('/api/peniaga/tarikh-tutup', {
              tarikh: dateStr,
              catatan: formSebab.trim() || null,
            })
            added++
          } catch {
            // Skip dates that are already closed or invalid
          }
        }
        setSuccess(`${added} tarikh tutup berjaya ditambah.`)
      } else {
        // Remove closed dates in the range
        const start = new Date(formMula)
        const end = formHingga ? new Date(formHingga) : start
        let removed = 0

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const entry = closedDates.find((cd) => {
            const cdDate = new Date(cd.tarikh)
            const cdStr = `${cdDate.getFullYear()}-${String(cdDate.getMonth() + 1).padStart(2, '0')}-${String(cdDate.getDate()).padStart(2, '0')}`
            return cdStr === dateStr
          })
          if (entry) {
            try {
              await api.delete(`/api/peniaga/tarikh-tutup/${entry.tarikhTutupId}`)
              removed++
            } catch { /* skip */ }
          }
        }
        setSuccess(`${removed} tarikh tutup berjaya dibuang.`)
      }

      fetchClosedDates()
      setFormSebab('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.mesej || 'Gagal menyimpan perubahan.')
    } finally {
      setActionLoading(false)
    }
  }

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
    else setCurrentMonth(currentMonth - 1)
  }

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
    else setCurrentMonth(currentMonth + 1)
  }

  const daysInMonth = getDaysInMonth(currentMonth, currentYear)
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear)

  const calendarCells = []
  for (let i = 0; i < firstDay; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)

  // Get upcoming closed dates
  const upcomingClosed = closedDates
    .filter((d) => new Date(d.tarikh) >= new Date(today.toDateString()))
    .sort((a, b) => new Date(a.tarikh) - new Date(b.tarikh))
    .slice(0, 5)

  return (
    <MerchantLayout title="Kalendar Cuti" subtitle="Tetapkan tarikh kedai tidak beroperasi.">
      <SuccessMessage message={success} />
      <ErrorMessage message={error} />

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Calendar - takes 2 columns */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="text-gray-500 hover:text-orange-500 text-lg font-bold">‹</button>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-gray-800">{MONTHS[currentMonth]}</span>
                <span className="text-base text-gray-600">{currentYear}</span>
              </div>
              <button onClick={nextMonth} className="text-gray-500 hover:text-orange-500 text-lg font-bold">›</button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">{day}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, idx) => {
                if (day === null) return <div key={`e-${idx}`} className="h-10"></div>

                const dateStr = formatDateStr(currentYear, currentMonth, day)
                const isClosed = isDateClosed(dateStr)
                const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
                const isSelected = dateStr === formMula || (formMula && formHingga && dateStr >= formMula && dateStr <= formHingga)

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`h-10 w-full rounded-lg text-sm font-medium transition-colors ${
                      isClosed
                        ? 'bg-orange-500 text-white'
                        : isSelected
                        ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300'
                        : isToday
                        ? 'bg-gray-100 text-gray-800 font-bold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right Panel - Butiran Tarikh */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
            <h3 className="text-base font-bold text-gray-800">Butiran Tarikh</h3>

            {/* Mula */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Mula</label>
              <input
                type="date"
                value={formMula}
                onChange={(e) => setFormMula(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {/* Hingga */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Hingga</label>
              <input
                type="date"
                value={formHingga}
                min={formMula}
                onChange={(e) => setFormHingga(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {/* Status Operasi */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Status Operasi</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio" name="status" value="buka"
                    checked={formStatus === 'buka'}
                    onChange={() => setFormStatus('buka')}
                    className="accent-orange-500"
                  />
                  Buka
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio" name="status" value="tutup"
                    checked={formStatus === 'tutup'}
                    onChange={() => setFormStatus('tutup')}
                    className="accent-orange-500"
                  />
                  Tutup (Cuti)
                </label>
              </div>
            </div>

            {/* Sebab Penutupan */}
            {formStatus === 'tutup' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Sebab Penutupan</label>
                <input
                  type="text"
                  value={formSebab}
                  onChange={(e) => setFormSebab(e.target.value)}
                  placeholder="Cuti Kecemasan"
                  maxLength={200}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            )}

            {/* Simpan Button */}
            <button
              onClick={handleSave}
              disabled={actionLoading || !formMula}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-full text-sm transition-colors"
            >
              {actionLoading ? 'Menyimpan...' : 'Simpan'}
            </button>

            {/* Cuti Akan Datang */}
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-600 mb-2">Cuti Akan Datang</h4>
              {upcomingClosed.length === 0 ? (
                <p className="text-xs text-gray-400">Tiada cuti yang dijadualkan.</p>
              ) : (
                <div className="space-y-1.5">
                  {upcomingClosed.map((cd) => {
                    const d = new Date(cd.tarikh)
                    const dateLabel = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
                    return (
                      <div key={cd.tarikhTutupId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs font-medium text-gray-700">{dateLabel}</p>
                          {cd.catatan && <p className="text-xs text-gray-500">{cd.catatan}</p>}
                        </div>
                        <button
                          onClick={async () => {
                            await api.delete(`/api/peniaga/tarikh-tutup/${cd.tarikhTutupId}`)
                            fetchClosedDates()
                          }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MerchantLayout>
  )
}
