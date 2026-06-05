import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedAdminRoute({ children }) {
  const { isAdminAuthenticated, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen bg-[#F9EAE1] pt-32 px-4 text-center text-[#8C6239]/70">Verification admin...</div>
  }

  if (!isAdminAuthenticated) return <Navigate to="/admin/login" replace />

  return children
}
