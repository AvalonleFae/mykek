/**
 * PromptBuilder — Constructs system instruction and user message for Gemini API.
 * Builds context-aware prompts including cake specs, form state, and conversation history.
 */

/**
 * Build the system instruction for the Gemini model.
 * @param {Object} params
 * @param {Array} params.spesifikasiKek - Active cake spec categories with options
 * @param {Object} params.konteksBoring - Current form context
 * @returns {string} System instruction text
 */
export function buildSystemInstruction({ spesifikasiKek, konteksBoring }) {
  let instruction = `Anda adalah Pembantu Pesanan untuk MyKek, kedai kek di Sarawak.

PERATURAN PENTING:
1. Jawab dalam Bahasa Melayu sahaja. Jangan sekali-kali jawab dalam bahasa lain.
2. Gunakan nada mesra dan tidak formal, panggil pelanggan 'anda'.
3. Gunakan ayat pendek (maksimum 25 patah perkataan setiap ayat).
4. Hadkan jawapan kepada maksimum 300 patah perkataan.
5. Hanya bincang topik berkaitan pesanan kek: saiz, perisa, tema, harga, penghantaran, tarikh.
6. Jika pelanggan tanya topik lain, jawab: "Saya hanya boleh membantu dengan pesanan kek. Tanya saya tentang saiz, perisa, tema, atau harga."

SPESIFIKASI KEK YANG TERSEDIA:
`;

  // Add cake specifications
  if (spesifikasiKek && spesifikasiKek.length > 0) {
    spesifikasiKek.forEach((kategori) => {
      instruction += `\n${kategori.nama}:`
      if (kategori.penerangan) {
        instruction += ` (${kategori.penerangan})`
      }
      instruction += '\n'
      if (kategori.pilihan && kategori.pilihan.length > 0) {
        kategori.pilihan.forEach((pilihan) => {
          instruction += `  - ${pilihan.nama}: RM ${Number(pilihan.hargaTambahan).toFixed(2)}`
          if (pilihan.penerangan) {
            instruction += ` (${pilihan.penerangan})`
          }
          instruction += ` [kategoriId: ${kategori.kategoriId}, pilihanId: ${pilihan.pilihanId}]\n`
        })
      }
    })
  } else {
    instruction += 'Tiada spesifikasi tersedia buat masa ini.\n'
  }

  // Add form context
  instruction += '\nKONTEKS BORANG SEMASA:\n'
  if (konteksBoring) {
    if (konteksBoring.pilihanDipilih && konteksBoring.pilihanDipilih.length > 0) {
      instruction += 'Pilihan yang telah dipilih:\n'
      konteksBoring.pilihanDipilih.forEach((p) => {
        instruction += `  - Kategori ${p.kategoriId}: Pilihan ${p.pilihanId}\n`
      })
    } else {
      instruction += 'Tiada pilihan dipilih lagi.\n'
    }

    if (konteksBoring.kaedahPenghantaran) {
      instruction += `Kaedah penghantaran: ${konteksBoring.kaedahPenghantaran}\n`
    }
    if (konteksBoring.tarikhAmbil) {
      instruction += `Tarikh ambil/penghantaran: ${konteksBoring.tarikhAmbil}\n`
    }
    instruction += `Jumlah harga semasa: RM ${Number(konteksBoring.jumlahHarga || 0).toFixed(2)}\n`

    if (konteksBoring.medanKosong && konteksBoring.medanKosong.length > 0) {
      instruction += `Medan yang belum diisi: ${konteksBoring.medanKosong.join(', ')}\n`
    }
  } else {
    instruction += 'Tiada konteks borang.\n'
  }

  // Response format instructions
  instruction += `
FORMAT JAWAPAN:
Jawab dalam format JSON seperti berikut:
{
  "balasan": "Teks jawapan anda di sini",
  "tindakan": null atau { "jenis": "pilih_opsyen", "kategoriId": <nombor>, "pilihanId": <nombor> },
  "cadangan": null atau [{ "id": "sug-1", "penerangan": "Penerangan cadangan (maks 200 aksara)", "pilihan": [{ "kategoriId": <nombor>, "pilihanId": <nombor>, "kategoriNama": "Nama Kategori", "pilihanNama": "Nama Pilihan", "hargaTambahan": <nombor> }] }]
}

PANDUAN TINDAKAN:
- Gunakan "tindakan" HANYA apabila pelanggan secara jelas minta anda pilihkan sesuatu untuk mereka.
- Pastikan kategoriId dan pilihanId merujuk kepada pilihan yang wujud dalam senarai di atas.

PANDUAN CADANGAN:
- Gunakan "cadangan" apabila pelanggan minta cadangan atau terangkan majlis/keinginan mereka.
- Setiap cadangan mesti merujuk pilihan yang wujud dalam senarai di atas sahaja.
- Berikan 1 hingga 3 cadangan.
- Penerangan mestilah tidak melebihi 200 aksara.

PENTING: Sentiasa jawab dalam format JSON yang sah. Jangan tambah teks di luar JSON.`

  return instruction
}

/**
 * Build the full prompt payload for Gemini API.
 * @param {Object} params
 * @param {string} params.mesej - Customer's current message
 * @param {Array} params.sejarah - Conversation history (max 10 messages)
 * @param {Object} params.konteksBoring - Current form context
 * @param {Array} params.spesifikasiKek - Active cake specifications
 * @returns {{ systemInstruction: string, contents: Array }} Prompt payload
 */
export function buildPrompt({ mesej, sejarah, konteksBoring, spesifikasiKek }) {
  const systemInstruction = buildSystemInstruction({ spesifikasiKek, konteksBoring })

  // Build conversation history as contents array
  const contents = []

  if (sejarah && sejarah.length > 0) {
    sejarah.forEach((msg) => {
      contents.push({
        role: msg.peranan === 'customer' ? 'user' : 'model',
        parts: [{ text: msg.kandungan }],
      })
    })
  }

  // Add current user message
  contents.push({
    role: 'user',
    parts: [{ text: mesej }],
  })

  return { systemInstruction, contents }
}
