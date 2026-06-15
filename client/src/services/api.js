import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3001',
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
