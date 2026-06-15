import { useNavigate, useParams } from 'react-router-dom'
import Header from '../../components/Header'

export default function QRPaymentPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 p-6 md:p-10" style={{ backgroundColor: '#FFF5EE' }}>
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <h1 className="text-xl font-bold text-gray-800 mb-2">Bayaran</h1>
            <p className="text-sm text-gray-600 mb-6">
              Sila imbas kod QR untuk membuat bayaran
            </p>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <img
                src="https://placehold.co/300x300?text=QR+Code+Bayaran"
                alt="Kod QR Bayaran"
                className="w-64 h-64 rounded-xl border border-gray-200"
              />
            </div>

            {/* Order Info */}
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 mb-6">
              <p className="text-sm text-gray-600">Tempahan #{id}</p>
            </div>

            {/* Done Button */}
            <button
              onClick={() => navigate('/pelanggan/tempahan')}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full transition-colors text-sm"
            >
              Sudah Bayar
            </button>

            <p className="text-xs text-gray-400 mt-4">
              Selepas pembayaran disahkan, status tempahan akan dikemaskini secara automatik.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
