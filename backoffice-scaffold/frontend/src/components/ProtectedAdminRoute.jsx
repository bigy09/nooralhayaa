import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedAdminRoute({ children }) {
  const { admin } = useAuth();
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}
