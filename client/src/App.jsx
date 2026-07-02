import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import CustomerDashboard from './pages/CustomerDashboard'
import MerchantDashboard from './pages/MerchantDashboard'
import ProfilePage from './pages/pelanggan/ProfilePage'
import OrderFormPage from './pages/pelanggan/OrderFormPage'
import OrderListPage from './pages/pelanggan/OrderListPage'
import OrderDetailPage from './pages/pelanggan/OrderDetailPage'
import QRPaymentPage from './pages/pelanggan/QRPaymentPage'
import OrderManagementPage from './pages/peniaga/OrderManagementPage'
import OrderDetailPeniaga from './pages/peniaga/OrderDetailPeniaga'
import SpecManagementPage from './pages/peniaga/SpecManagementPage'
import CalendarPage from './pages/peniaga/CalendarPage'
import ReportPage from './pages/peniaga/ReportPage'
import BusinessInfoPage from './pages/peniaga/BusinessInfoPage'
import WhatsAppSettingsPage from './pages/peniaga/WhatsAppSettingsPage'

function TitleUpdater() {
  const location = useLocation()

  useEffect(() => {
    const routeTitles = {
      '/': 'Utama | MyKek',
      '/pelanggan': 'Papan Pemuka Pelanggan | MyKek',
      '/pelanggan/profil': 'Profil Saya | MyKek',
      '/pelanggan/tempahan/baharu': 'Tempah Kek Baharu | MyKek',
      '/pelanggan/tempahan': 'Senarai Tempahan | MyKek',
      '/peniaga': 'Papan Pemuka Peniaga | MyKek',
      '/peniaga/tempahan': 'Urus Tempahan | MyKek',
      '/peniaga/spesifikasi': 'Urus Spesifikasi Kek | MyKek',
      '/peniaga/kalendar': 'Kalendar Cuti | MyKek',
      '/peniaga/laporan': 'Laporan dan Analisis | MyKek',
      '/peniaga/perniagaan': 'Kemas Kini Perniagaan | MyKek',
      '/peniaga/whatsapp': 'Sambung ke WhatsApp | MyKek',
    }

    const path = location.pathname
    let title = 'MyKek'

    if (routeTitles[path]) {
      title = routeTitles[path]
    } else if (path.startsWith('/pelanggan/tempahan/')) {
      title = 'Butiran Tempahan | MyKek'
    } else if (path.startsWith('/pelanggan/bayaran/')) {
      title = 'Pembayaran QR | MyKek'
    } else if (path.startsWith('/peniaga/tempahan/')) {
      title = 'Butiran Tempahan Peniaga | MyKek'
    }

    document.title = title
  }, [location])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <TitleUpdater />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/pelanggan"
            element={
              <ProtectedRoute role="pelanggan">
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pelanggan/profil"
            element={
              <ProtectedRoute role="pelanggan">
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pelanggan/tempahan/baharu"
            element={
              <ProtectedRoute role="pelanggan">
                <OrderFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pelanggan/tempahan"
            element={
              <ProtectedRoute role="pelanggan">
                <OrderListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pelanggan/tempahan/:id"
            element={
              <ProtectedRoute role="pelanggan">
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pelanggan/bayaran/:id"
            element={
              <ProtectedRoute role="pelanggan">
                <QRPaymentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/peniaga"
            element={
              <ProtectedRoute role="peniaga">
                <MerchantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/peniaga/tempahan"
            element={
              <ProtectedRoute role="peniaga">
                <OrderManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/peniaga/tempahan/:id"
            element={
              <ProtectedRoute role="peniaga">
                <OrderDetailPeniaga />
              </ProtectedRoute>
            }
          />
          <Route
            path="/peniaga/spesifikasi"
            element={
              <ProtectedRoute role="peniaga">
                <SpecManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/peniaga/kalendar"
            element={
              <ProtectedRoute role="peniaga">
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/peniaga/laporan"
            element={
              <ProtectedRoute role="peniaga">
                <ReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/peniaga/perniagaan"
            element={
              <ProtectedRoute role="peniaga">
                <BusinessInfoPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/peniaga/whatsapp"
            element={
              <ProtectedRoute role="peniaga">
                <WhatsAppSettingsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
