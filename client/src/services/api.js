import axios from 'axios'

const api = axios.create({
  // Use relative URL so requests go through the reverse proxy in production.
  // In local dev, Vite's proxy (vite.config.js) handles forwarding to localhost:3001.
  baseURL: '/api',
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
      // Clear any stored auth state
      window.location.href = '/'
    }

    return Promise.reject(error)
  }
)

export default api
