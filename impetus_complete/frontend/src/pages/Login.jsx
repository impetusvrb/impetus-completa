/**
 * PÁGINA DE LOGIN
 * Autenticação do usuário
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { auth } from '../services/api';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await auth.login(email, password);
      const data = response?.data;

      if (!data?.token || !data?.user) {
        setError('Resposta inválida do servidor. Tente novamente.');
        return;
      }

      localStorage.setItem('impetus_token', data.token);
      localStorage.setItem('impetus_user', JSON.stringify(data.user));

      const redirect = data.redirect || (data.user?.is_first_access ? '/setup-empresa' : null);
      if (redirect) {
        navigate(redirect);
        return;
      }
      const userRole = data.user?.role;
      navigate(userRole === 'colaborador' ? '/app/proacao' : '/app');
    } catch (err) {
      console.error('Erro no login:', err);
      setError(err.apiMessage || err.response?.data?.error || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
        <div className="bg-grid"></div>
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo-wrapper">
              <img
                src="/logo-impetus.jpg"
                alt="Impetus - Plataforma de Inteligência Operacional Industrial"
                className="login-logo-img"
              />
            </div>
            <p className="login-subtitle">Faça login para acessar a plataforma</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="error-message">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">
                <Mail size={16} />
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <Lock size={16} />
                Senha
              </label>
              <div className="password-input">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-login"
              disabled={loading}
            >
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner"></span>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>

            <div className="login-footer">
              <a href="#" className="forgot-password">Esqueceu sua senha?</a>
            </div>
          </form>

          <div className="login-info">
            <p className="copyright">
              © 2025 Impetus Comunica IA — Plataforma de Inteligência Operacional Industrial<br />
              Wellington Machado de Freitas &amp; Gustavo Júnior da Silva
            </p>
            <p className="registro">
              Registro INPI: BR512025007048-9<br />
              Sistema Integrado de Comunicação Inteligente, Gestão Operacional e IA Industrial
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
