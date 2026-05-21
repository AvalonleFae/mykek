export default function Header() {
  return (
    <header className="bg-white px-6 py-3 flex items-center gap-2 border-b shadow-sm">
      {/* Logo */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-8 h-8 text-orange-500"
      >
        <path d="M12 2L2 19h20L12 2z" />
      </svg>
      <span className="text-lg font-bold text-gray-800">MyKek</span>
    </header>
  )
}
