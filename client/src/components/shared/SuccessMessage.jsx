export default function SuccessMessage({ message }) {
  if (!message) return null

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-600">
      {message}
    </div>
  )
}
