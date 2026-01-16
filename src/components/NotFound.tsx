export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-cyan-400 mb-4">404</h1>
        <p className="text-xl text-gray-300 mb-6">Page non trouvée</p>
        <a 
          href="/" 
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          Retour à l'accueil
        </a>
      </div>
    </div>
  )
}