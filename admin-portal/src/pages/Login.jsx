import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [err, setErr] = useState('');

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await login(email.trim(), senha);
      navigate('/', { replace: true });
    } catch (e2) {
      setErr(e2.message || 'Falha no login');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(0, 212, 255, 0.12), transparent 55%), var(--bg0)'
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', letterSpacing: 1 }}>IMPETUS Admin</h1>
        <p className="muted" style={{ marginBottom: '1.5rem' }}>
          Acesso restrito à equipe interna
        </p>
        <form onSubmit={submit}>
          <label className="label">E-mail</label>
          <input
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="label" style={{ marginTop: 12 }}>
            Senha
          </label>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          {err && (
            <p style={{ color: 'var(--red)', fontSize: '0.9rem', marginTop: 10 }}>{err}</p>
          )}
          <button type="submit" className="btn btn--primary" style={{ width: '100%', marginTop: 18 }}>
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
