import React, { useState } from 'react';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { auth } from '../services/api';
import './Login.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.');
    if (password !== confirm) return setError('As senhas não coincidem.');
    setLoading(true);
    try {
      await auth.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Link inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <p style={{color:'#f87171',textAlign:'center'}}>Link inválido.</p>
          <Link to="/" style={{display:'block',textAlign:'center',marginTop:16,color:'#3b82f6'}}>← Voltar ao login</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-grid"></div>
      </div>
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo-wrapper">
              <img src="/logo-impetus.jpg" alt="Impetus" className="login-logo-img" />
            </div>
            <p className="login-subtitle">{done ? 'Senha redefinida!' : 'Nova senha'}</p>
          </div>

          {done ? (
            <div style={{textAlign:'center', padding:'24px 0'}}>
              <CheckCircle size={48} color="#22c55e" style={{marginBottom:16}} />
              <p style={{color:'#94a3b8'}}>Senha alterada com sucesso! Redirecionando...</p>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              {error && <div className="error-message"><AlertCircle size={18}/><span>{error}</span></div>}
              <div className="form-group">
                <label><Lock size={16}/> Nova senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required disabled={loading}/>
              </div>
              <div className="form-group">
                <label><Lock size={16}/> Confirmar senha</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repita a senha" required disabled={loading}/>
              </div>
              <button type="submit" className="btn-login" disabled={loading}>
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
