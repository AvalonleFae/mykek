export default function SuggestionCard({ suggestion, onApply }) {
  const totalPrice = suggestion.pilihan.reduce(
    (sum, opt) => sum + Number(opt.hargaTambahan || 0),
    0
  )

  const handleApply = () => {
    if (onApply) {
      // Apply each option from the suggestion to the form
      suggestion.pilihan.forEach((opt) => {
        onApply({
          jenis: 'pilih_opsyen',
          kategoriId: opt.kategoriId,
          pilihanId: opt.pilihanId,
        })
      })
    }
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm">
      <p className="text-gray-700 font-medium mb-2">{suggestion.penerangan}</p>
      <ul className="space-y-1 mb-2">
        {suggestion.pilihan.map((opt, idx) => (
          <li key={idx} className="flex justify-between text-xs text-gray-600">
            <span>{opt.kategoriNama}: {opt.pilihanNama}</span>
            <span className="text-orange-500">+RM {Number(opt.hargaTambahan).toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">
          Jumlah: RM {totalPrice.toFixed(2)}
        </span>
        <button
          onClick={handleApply}
          className="px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded-full hover:bg-orange-600 transition-colors"
        >
          Guna
        </button>
      </div>
    </div>
  )
}
