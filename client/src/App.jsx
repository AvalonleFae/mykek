import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

function App() {
  return (
    <BrowserRouter>
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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
