import api from '../../services/api'
import { RESPONSE_TIMEOUT } from './types.js'

/**
 * Send a message to the chatbot API.
 * @param {Object} params
 * @param {string} params.mesej - Customer message (1-500 chars)
 * @param {Array} params.sejarah - Last 10 messages history
 * @param {Object} params.konteksBoring - Current form context
 * @returns {Promise<{balasan: string, cadangan: Array|null, tindakan: Object|null}>}
 */
export async function sendMessage({ mesej, sejarah, konteksBoring }) {
  try {
    const response = await api.post(
      '/api/pelanggan/chatbot/mesej',
      { mesej, sejarah, konteksBoring },
      { timeout: RESPONSE_TIMEOUT }
    )
    return response.data
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new Error('TIMEOUT')
    }
    if (!error.response) {
      throw new Error('NETWORK_ERROR')
    }
    if (error.response.status === 401) {
      throw new Error('UNAUTHORIZED')
    }
    if (error.response.status === 400) {
      throw new Error(error.response.data?.mesej || 'VALIDATION_ERROR')
    }
    throw new Error('SERVICE_UNAVAILABLE')
  }
}
