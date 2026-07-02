import axios from 'axios'

const api = axios.create({
  // Empty baseURL — all call sites already include the full /api/... path.
  // In production, Caddy proxies /api/* to Node. In dev, Vite proxies it (vite.config.js).
  baseURL: '/',
  withCredentials: true,
})

// Request retry interceptor - retry up to 3 times with 3s delay on network errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config

    // Only retry on network errors (no response from server)
    if (!error.response && config && !config._retryCount) {
      config._retryCount = 0
    }

    if (!error.response && config && config._retryCount < 3) {
      config._retryCount += 1
      await new Promise((resolve) => setTimeout(resolve, 3000))
      return api(config)
    }

    // On 401, clear auth state and redirect to landing
    if (error.response?.status === 401) {
      const isLoginRequest = config?.url?.includes('/api/auth/')
      if (window.location.pathname !== '/' && !isLoginRequest) {
        localStorage.removeItem('mykek_user')
        window.location.href = '/'
      }
    }

    return Promise.reject(error)
  }
)

export default api
