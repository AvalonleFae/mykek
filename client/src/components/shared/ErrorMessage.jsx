export default function ErrorMessage({ message }) {
  if (!message) return null

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
      {message}
    </div>
  )
}
