import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Mail, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(event) {
    event.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    try {
      await register({ email, password })
      navigate('/checkout', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9EAE1] pt-24 pb-16 px-4">
      <div className="max-w-md mx-auto rounded-[1.75rem] border border-[#C5A059]/18 bg-white p-7 shadow-[0_16px_38px_rgba(140,98,57,0.11)] relative">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute right-3 top-3 rounded-full p-1.5 text-[#8C6239]/70 hover:bg-[#F9EAE1] hover:text-[#8C6239]"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>
        <h1 className="text-2xl font-semibold text-[#8C6239]">Inscription client</h1>
        <p className="mt-2 text-sm text-[#8C6239]/65">Cree ton compte pour commander et suivre ton historique.</p>

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
                placeholder="8 caracteres minimum"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#8C6239]">Confirmer mot de passe</span>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C6239]/55" />
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-[#C5A059]/28 bg-[#fffdfa] py-3 pl-9 pr-3 text-sm text-[#8C6239] outline-none focus:border-[#C5A059]"
                placeholder="Confirmer le mot de passe"
              />
            </div>
          </label>

          {error && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#8C6239] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C5A059] disabled:opacity-60"
          >
            {loading ? 'Creation...' : 'Creer mon compte'}
          </button>
        </form>

        <p className="mt-5 text-sm text-[#8C6239]/65">
          Deja un compte ?{' '}
          <Link to="/login" className="font-semibold text-[#C5A059] hover:text-[#8C6239]">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
