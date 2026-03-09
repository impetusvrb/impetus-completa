import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth } from '../services/api';
import './Login.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Erro ao enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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
            <p className="login-subtitle">{sent ? 'Email enviado!' : 'Recuperar senha'}</p>
          </div>

          {sent ? (
            <div style={{textAlign:'center', padding:'24px 0'}}>
              <CheckCircle size={48} color="#22c55e" style={{marginBottom:16}} />
              <p style={{color:'#94a3b8', lineHeight:1.6}}>
                Se este email estiver cadastrado, você receberá um link de redefinição em breve.<br/>
                Verifique sua caixa de entrada e spam.
              </p>
              <Link to="/" style={{display:'block', marginTop:24, color:'#3b82f6'}}>
                ← Voltar ao login
              </Link>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label htmlFor="email"><Mail size={16} /> E-mail cadastrado</label>
                <input
                  id="email" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com" required disabled={loading}
                />
              </div>
              <button type="submit" className="btn-login" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
              <div className="login-footer">
                <Link to="/" className="forgot-password">← Voltar ao login</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
