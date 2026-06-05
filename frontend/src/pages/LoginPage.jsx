import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const nextPath = location.state?.from || '/checkout'

  async function onSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login({ email, password })
      navigate(nextPath, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-20 px-4">
      <div className="max-w-md mx-auto rounded-[1.75rem] border border-[#C5A059]/18 bg-white p-7 shadow-[0_16px_38px_rgba(140,98,57,0.11)]">
        <h1 className="text-2xl font-semibold text-[#8C6239]">Connexion client</h1>
        <p className="mt-2 text-sm text-[#8C6239]/65">Connecte-toi pour finaliser ta commande et suivre tes achats.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#8C6239]">Email</span>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C6239]/55" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#C5A059]/28 bg-[#fffdfa] py-3 pl-9 pr-3 text-sm text-[#8C6239] outline-none focus:border-[#C5A059]"
                placeholder="ton@email.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#8C6239]">Mot de passe</span>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C6239]/55" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#C5A059]/28 bg-[#fffdfa] py-3 pl-9 pr-3 text-sm text-[#8C6239] outline-none focus:border-[#C5A059]"
                placeholder="********"
              />
            </div>
          </label>

          {error && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#8C6239] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C5A059] disabled:opacity-60"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-5 text-sm text-[#8C6239]/65">
          Pas encore de compte ?{' '}
          <Link to="/register" className="font-semibold text-[#C5A059] hover:text-[#8C6239]">
            Creer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
