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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
