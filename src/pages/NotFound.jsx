import { useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0b1326' }}>
      <Nav />
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div
          className="text-8xl font-bold mb-4"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #22D3EE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          404
        </div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: 'rgba(255,255,255,0.92)' }}>
          Page not found
        </h1>
        <p className="text-sm mb-8" style={{ color: '#7a8fa8' }}>
          The page you're looking for doesn't exist.
        </p>
        <button onClick={() => navigate('/')} className="btn-primary px-8 py-3 rounded-xl">
          Go home
        </button>
      </div>
    </div>
  )
}
