import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function LoginCard() {
  const [activeTab, setActiveTab] = useState('pelanggan') // 'pelanggan' or 'peniaga'
  const [isRegistering, setIsRegistering] = useState(false)

  // Customer login/register fields
  const [noTelefon, setNoTelefon] = useState('')
  const [nama, setNama] = useState('')
  const [alamat, setAlamat] = useState('')

  // OTP state
  const [otpStep, setOtpStep] = useState(1) // 1 = form, 2 = OTP input
  const [otpCode, setOtpCode] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [percubaanBaki, setPercubaanBaki] = useState(null)
  const [perluKodBaharu, setPerluKodBaharu] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  // Merchant login fields
  const [namaPengguna, setNamaPengguna] = useState('')
  const [kataLaluan, setKataLaluan] = useState('')

  // UI state
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { loginPelanggan, registerPelanggan, loginPeniaga } = useAuth()
  const navigate = useNavigate()
  const countdownRef = useRef(null)

  // Countdown timer logic
  const startCountdown = useCallback((seconds) => {
    setCountdown(seconds)
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current)
          countdownRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  // Send OTP
  const handleSendOtp = async () => {
    setError('')
    setPhoneError('')
    setOtpSending(true)

    try {
      await api.post('/api/awam/whatsapp/hantar-otp', { noTelefon, nama, alamat })
      setOtpStep(2)
      setPerluKodBaharu(false)
      setPercubaanBaki(null)
      setOtpCode('')
      startCountdown(60)
    } catch (err) {
      const status = err.response?.status
      const data = err.response?.data

      if (status === 429 && data?.tunggSaat) {
        // Rate limited
        startCountdown(data.tunggSaat)
        setError(data.mesej || `Sila tunggu ${data.tunggSaat} saat sebelum meminta kod baharu.`)
      } else if (data?.medan === 'noTelefon') {
        // Phone not on WhatsApp
        setPhoneError(data.mesej || 'Nombor ini tidak berdaftar di WhatsApp.')
      } else if (status >= 500 || !err.response) {
        // Server error or network error - fall back to direct registration
        try {
          await registerPelanggan({ noTelefon, nama, alamat })
          setSuccessMsg('Pendaftaran berjaya! Sila log masuk.')
          setIsRegistering(false)
          setNama('')
          setAlamat('')
          setOtpStep(1)
        } catch (regErr) {
          const regMessage = regErr.response?.data?.mesej || regErr.response?.data?.message || 'Ralat berlaku. Sila cuba lagi.'
          setError(regMessage)
        }
      } else {
        setError(data?.mesej || 'Ralat berlaku. Sila cuba lagi.')
      }
    } finally {
      setOtpSending(false)
    }
  }

  // Verify OTP
  const handleVerifyOtp = async () => {
    setError('')
    setOtpVerifying(true)

    try {
      const res = await api.post('/api/awam/whatsapp/sahkan-otp', { noTelefon, kod: otpCode })
      if (res.status === 201 || res.data?.berjaya) {
        setSuccessMsg('Pendaftaran berjaya! Sila log masuk.')
        setIsRegistering(false)
        setOtpStep(1)
        setOtpCode('')
        setNama('')
        setAlamat('')
        setPerluKodBaharu(false)
        setPercubaanBaki(null)
      }
    } catch (err) {
      const data = err.response?.data
      if (data?.perluKodBaharu) {
        setPerluKodBaharu(true)
        setError(data.mesej || 'Kod telah tamat tempoh. Sila minta kod baharu.')
      } else if (data?.percubaanBaki !== undefined) {
        setPercubaanBaki(data.percubaanBaki)
        setError(data.mesej || `Kod pengesahan tidak sah. Percubaan baki: ${data.percubaanBaki}`)
      } else {
        setError(data?.mesej || 'Ralat berlaku. Sila cuba lagi.')
      }
    } finally {
      setOtpVerifying(false)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    setError('')
    setPerluKodBaharu(false)
    setPercubaanBaki(null)
    setOtpCode('')
    await handleSendOtp()
  }

  const handleCustomerSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setPhoneError('')
    setIsLoading(true)

    try {
      if (isRegistering) {
        // For registration, use OTP flow
        setIsLoading(false)
        await handleSendOtp()
        return
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

  const resetOtpState = () => {
    setOtpStep(1)
    setOtpCode('')
    setPerluKodBaharu(false)
    setPercubaanBaki(null)
    setCountdown(0)
    setPhoneError('')
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
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
            resetOtpState()
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
            resetOtpState()
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
        <>
          {/* Step 1: Login / Registration Form */}
          {otpStep === 1 && (
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
                  onChange={(e) => {
                    setNoTelefon(e.target.value)
                    setPhoneError('')
                  }}
                  className={`w-full px-4 py-2.5 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                    phoneError ? 'border-red-400' : 'border-gray-300'
                  }`}
                  required
                />
                {phoneError && (
                  <p className="mt-1 text-xs text-red-500">{phoneError}</p>
                )}
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

              {/* Countdown timer (rate limited) */}
              {isRegistering && countdown > 0 && (
                <p className="text-xs text-orange-600">
                  Sila tunggu {countdown} saat sebelum meminta kod baharu.
                </p>
              )}

              {/* Toggle link */}
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering)
                  setError('')
                  setSuccessMsg('')
                  resetOtpState()
                }}
                className="text-xs text-orange-500 underline hover:text-orange-600"
              >
                {isRegistering ? 'Tekan sini untuk Log Masuk!' : 'Tekan sini untuk daftar!'}
              </button>

              {/* Submit Button */}
              {isRegistering ? (
                <button
                  type="submit"
                  disabled={otpSending || countdown > 0}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-full transition-colors text-sm mt-2"
                >
                  {otpSending ? 'Menghantar...' : countdown > 0 ? `Tunggu ${countdown}s` : 'Hantar OTP'}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-full transition-colors text-sm mt-2"
                >
                  {isLoading ? 'Memproses...' : 'Log Masuk'}
                </button>
              )}
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {otpStep === 2 && isRegistering && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                Kod pengesahan telah dihantar ke <span className="font-semibold">{noTelefon}</span> melalui WhatsApp.
              </div>

              {/* OTP Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Kod Pengesahan (6 digit)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setOtpCode(val)
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-full text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Remaining attempts */}
              {percubaanBaki !== null && (
                <p className="text-xs text-red-500">
                  Percubaan baki: {percubaanBaki}
                </p>
              )}

              {/* Verify Button */}
              {!perluKodBaharu && (
                <button
                  onClick={handleVerifyOtp}
                  disabled={otpVerifying || otpCode.length !== 6}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold rounded-full transition-colors text-sm"
                >
                  {otpVerifying ? 'Mengesahkan...' : 'Sahkan'}
                </button>
              )}

              {/* Resend OTP section */}
              <div className="flex items-center justify-between">
                {perluKodBaharu ? (
                  <button
                    onClick={handleResendOtp}
                    disabled={otpSending || countdown > 0}
                    className="text-sm text-orange-500 font-medium hover:text-orange-600 disabled:text-gray-400"
                  >
                    {otpSending ? 'Menghantar...' : 'Minta Kod Baharu'}
                  </button>
                ) : (
                  <button
                    onClick={handleResendOtp}
                    disabled={otpSending || countdown > 0}
                    className="text-xs text-orange-500 underline hover:text-orange-600 disabled:text-gray-400 disabled:no-underline"
                  >
                    {countdown > 0 ? `Hantar semula (${countdown}s)` : 'Hantar semula kod'}
                  </button>
                )}

                {/* Back button */}
                <button
                  type="button"
                  onClick={() => {
                    resetOtpState()
                    setError('')
                  }}
                  className="text-xs text-gray-500 underline hover:text-gray-700"
                >
                  Kembali
                </button>
              </div>
            </div>
          )}
        </>
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
