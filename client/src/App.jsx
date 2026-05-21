import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import CustomerDashboard from './pages/CustomerDashboard'
import MerchantDashboard from './pages/MerchantDashboard'

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
