import { useState } from 'react'

export default function LoginCard() {
  const [activeTab, setActiveTab] = useState('pelanggan') // 'pelanggan' or 'peniaga'
  const [isRegistering, setIsRegistering] = useState(false)

  // Customer login/register fields
  const [noTelefon, setNoTelefon] = useState('')
  const [nama, setNama] = useState('')
  const [alamat, setAlamat] = useState('')

  // Merchant login fields
  const [namaPengguna, setNamaPengguna] = useState('')
  const [kataLaluan, setKataLaluan] = useState('')

  const handleCustomerSubmit = (e) => {
    e.preventDefault()
    // Backend integration will be added later
    console.log(isRegistering ? 'Daftar:' : 'Log Masuk:', { noTelefon, nama, alamat })
  }

  const handleMerchantSubmit = (e) => {
    e.preventDefault()
    // Backend integration will be added later
    console.log('Peniaga Log Masuk:', { namaPengguna, kataLaluan })
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

      {/* Customer Tab */}
      {activeTab === 'pelanggan' && (
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
              onChange={(e) => setNoTelefon(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
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
                />
              </div>
            </>
          )}

          {/* Toggle link */}
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-xs text-orange-500 underline hover:text-orange-600"
          >
            {isRegistering ? 'Tekan sini untuk Log Masuk!' : 'Tekan sini untuk daftar!'}
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full transition-colors text-sm mt-2"
          >
            {isRegistering ? 'Daftar' : 'Log Masuk'}
          </button>
        </form>
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
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full transition-colors text-sm mt-2"
          >
            Log Masuk
          </button>
        </form>
      )}
    </div>
  )
}
