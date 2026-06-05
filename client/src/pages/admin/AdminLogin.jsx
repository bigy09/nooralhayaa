import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await loginAdmin({ email, password });
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9EAE1] to-[#F0E1D8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#C5A059]/20 bg-white p-8 shadow-lg">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#F4DFD1]">
            <Lock size={32} className="text-[#C5A059]" />
          </div>

          <h1 className="text-2xl font-bold text-center text-[#8C6239] mb-2">
            Espace Admin
          </h1>
          <p className="text-center text-sm text-[#8C6239]/60 mb-6">
            Noor Al Hayaa - Gestion des Commandes
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#8C6239] mb-2">
                Email admin
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C6239]/55" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="admin@nooralhayaa.com"
                  className="w-full px-4 py-3 pl-9 rounded-lg border border-[#C5A059]/25 bg-[#fffdfa] text-[#8C6239] focus:border-[#C5A059] focus:outline-none transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8C6239] mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Entrez le mot de passe admin"
                className="w-full px-4 py-3 rounded-lg border border-[#C5A059]/25 bg-[#fffdfa] text-[#8C6239] focus:border-[#C5A059] focus:outline-none transition-colors text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password || !email}
              className="w-full py-3 rounded-lg bg-[#8C6239] text-white font-semibold hover:bg-[#C5A059] disabled:opacity-60 transition-colors"
            >
              {loading ? 'Vérification...' : 'Accéder au Tableau de Bord'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#F9EAE1]">
            <p className="text-xs text-[#8C6239]/50 text-center">
              ⚠️ Zone réservée aux administrateurs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
