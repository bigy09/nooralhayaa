import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedUserRoute({ children }) {
  const { isUserAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="min-h-screen bg-[#F9EAE1] pt-32 px-4 text-center text-[#8C6239]/70">Verification de session...</div>
  }

  if (!isUserAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
