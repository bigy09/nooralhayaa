import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      await loginAdmin({ email, password });
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f7f0e9' }}>
      <form onSubmit={handleSubmit} style={{ width: 360, padding: 24, borderRadius: 16, background: '#fff', boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}>
        <h1 style={{ marginBottom: 16 }}>Admin Login</h1>
        {error && <div style={{ marginBottom: 16, color: '#b91c1c' }}>{error}</div>}
        <label style={{ display: 'block', marginBottom: 8 }}>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 16, borderRadius: 8, border: '1px solid #d7d1c7' }} />
        <label style={{ display: 'block', marginBottom: 8 }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 24, borderRadius: 8, border: '1px solid #d7d1c7' }} />
        <button type="submit" style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: '#8c6239', color: '#fff', cursor: 'pointer' }}>
          Se connecter
        </button>
      </form>
    </div>
  );
}
