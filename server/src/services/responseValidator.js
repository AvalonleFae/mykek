/**
 * ResponseValidator — Validates and sanitizes AI-generated chatbot responses.
 * Enforces word count limits, topic restrictions, and parses JSON actions/suggestions.
 */

const MAX_WORDS = 300

// Off-topic indicators (responses that don't relate to cake ordering)
const OFF_TOPIC_PATTERNS = [
  /\b(politik|agama|sukan|berita|cuaca)\b/i,
  /\b(programming|coding|javascript|python)\b/i,
]

const FALLBACK_RESPONSE = {
  balasan: 'Saya hanya boleh membantu dengan pesanan kek. Tanya saya tentang saiz, perisa, tema, atau harga.',
  cadangan: null,
  tindakan: null,
}

/**
 * Validate and parse the AI response.
 * @param {string} aiResponse - Raw response text from AI model
 * @param {Array} spesifikasiKek - Active cake specs for validation
 * @returns {{ balasan: string, cadangan: Array|null, tindakan: Object|null }}
 */
export function validateResponse(aiResponse, spesifikasiKek = []) {
  if (!aiResponse || typeof aiResponse !== 'string' || aiResponse.trim().length === 0) {
    return FALLBACK_RESPONSE
  }

  // Try to parse as JSON
  let parsed = null
  try {
    // Try to extract JSON from the response (may have markdown code blocks)
    const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : aiResponse.trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    // If not valid JSON, treat the whole response as plain text reply
    const truncated = truncateToMaxWords(aiResponse.trim())
    return {
      balasan: truncated,
      cadangan: null,
      tindakan: null,
    }
  }

  // Extract fields from parsed JSON
  let balasan = parsed.balasan || parsed.reply || ''
  let cadangan = parsed.cadangan || null
  let tindakan = parsed.tindakan || null

  // Enforce 300-word max on balasan
  balasan = truncateToMaxWords(balasan)

  // Validate balasan is not empty
  if (!balasan || balasan.trim().length === 0) {
    return FALLBACK_RESPONSE
  }

  // Check for off-topic content
  if (isOffTopic(balasan)) {
    return FALLBACK_RESPONSE
  }

  // Validate tindakan if present (can be single object or array)
  if (tindakan) {
    if (Array.isArray(tindakan)) {
      tindakan = tindakan.map(a => validateAction(a, spesifikasiKek)).filter(Boolean)
      if (tindakan.length === 0) tindakan = null
    } else {
      tindakan = validateAction(tindakan, spesifikasiKek)
      if (tindakan) tindakan = [tindakan] // normalize to array
    }
  }

  // Validate cadangan if present
  if (cadangan) {
    cadangan = validateSuggestions(cadangan, spesifikasiKek)
  }

  return { balasan, cadangan, tindakan }
}

/**
 * Truncate text to maximum word count.
 * @param {string} text
 * @returns {string}
 */
function truncateToMaxWords(text) {
  if (!text) return ''
  const words = text.split(/\s+/)
  if (words.length <= MAX_WORDS) return text
  return words.slice(0, MAX_WORDS).join(' ') + '...'
}

/**
 * Check if response is off-topic.
 * @param {string} text
 * @returns {boolean}
 */
function isOffTopic(text) {
  return OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(text))
}

/**
 * Validate a form action against active specs.
 * @param {Object} action
 * @param {Array} spesifikasiKek
 * @returns {Object|null}
 */
function validateAction(action, spesifikasiKek) {
  if (!action || action.jenis !== 'pilih_opsyen') return null
  if (!action.kategoriId || !action.pilihanId) return null

  // Verify the option exists in active specs
  if (spesifikasiKek.length > 0) {
    const kategori = spesifikasiKek.find((k) => k.kategoriId === action.kategoriId)
    if (!kategori) return null
    const pilihan = kategori.pilihan?.find((p) => p.pilihanId === action.pilihanId)
    if (!pilihan) return null
  }

  return {
    jenis: 'pilih_opsyen',
    kategoriId: action.kategoriId,
    pilihanId: action.pilihanId,
  }
}

/**
 * Validate suggestions against active specs.
 * @param {Array} suggestions
 * @param {Array} spesifikasiKek
 * @returns {Array|null}
 */
function validateSuggestions(suggestions, spesifikasiKek) {
  if (!Array.isArray(suggestions) || suggestions.length === 0) return null

  const validSuggestions = suggestions
    .filter((sug) => sug && sug.pilihan && Array.isArray(sug.pilihan) && sug.pilihan.length > 0)
    .map((sug) => {
      // Filter out invalid options
      const validOptions = sug.pilihan.filter((opt) => {
        if (!opt.kategoriId || !opt.pilihanId) return false
        if (spesifikasiKek.length > 0) {
          const kategori = spesifikasiKek.find((k) => k.kategoriId === opt.kategoriId)
          if (!kategori) return false
          const pilihan = kategori.pilihan?.find((p) => p.pilihanId === opt.pilihanId)
          if (!pilihan) return false
        }
        return true
      })

      if (validOptions.length === 0) return null

      return {
        id: sug.id || `sug-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        penerangan: (sug.penerangan || '').slice(0, 200),
        pilihan: validOptions.map((opt) => ({
          kategoriId: opt.kategoriId,
          pilihanId: opt.pilihanId,
          kategoriNama: opt.kategoriNama || '',
          pilihanNama: opt.pilihanNama || '',
          hargaTambahan: Number(opt.hargaTambahan) || 0,
        })),
      }
    })
    .filter(Boolean)

  return validSuggestions.length > 0 ? validSuggestions : null
}

export { truncateToMaxWords, isOffTopic, MAX_WORDS, FALLBACK_RESPONSE }
