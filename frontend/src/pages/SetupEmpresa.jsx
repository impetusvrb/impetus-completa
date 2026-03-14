/**
 * SETUP EMPRESA
 * Primeiro acesso - cliente completa cadastro da empresa
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, AlertCircle } from 'lucide-react';
import { setupCompany } from '../services/api';
import './SetupEmpresa.css';

export default function SetupEmpresa() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    cnpj: '',
    industry_segment: '',
    industry_type: '',
    initial_areas_count: 5
  });
  const [passwordForm, setPasswordForm] = useState({
    new_password: '',
    confirm: ''
  });
  const [step, setStep] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
  const mustChangePassword = user.must_change_password || user.is_first_access;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    if (passwordForm.new_password !== passwordForm.confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      setError('Senha deve ter no mínimo 8 caracteres.');
      return;
    }
    setLoading(true);
    try {
      await setupCompany.changePassword(passwordForm.new_password);
      const u = { ...user, must_change_password: false };
      localStorage.setItem('impetus_user', JSON.stringify(u));
      setStep('company');
    } catch (err) {
      setError(err.apiMessage || err.response?.data?.error || 'Erro ao alterar senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await setupCompany.complete(form);
      const company = res.data?.company;
      if (company) {
        const u = { ...user, company_id: company.id, company_name: company.name, is_first_access: false };
        localStorage.setItem('impetus_user', JSON.stringify(u));
      }
      navigate('/app');
    } catch (err) {
      setError(err.apiMessage || err.response?.data?.error || 'Erro ao configurar empresa.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  if (step === 'password' && mustChangePassword) {
    return (
      <div className="setup-empresa-page">
        <div className="setup-empresa-card">
          <h1><AlertCircle size={28} /> Troca de senha obrigatória</h1>
          <p>Por segurança, altere sua senha temporária antes de continuar.</p>
          <form onSubmit={handleChangePassword}>
            {error && <div className="setup-error">{error}</div>}
            <input
              type="password"
              name="new_password"
              placeholder="Nova senha (mín. 8 caracteres)"
              value={passwordForm.new_password}
              onChange={handlePasswordChange}
              required
            />
            <input
              type="password"
              name="confirm"
              placeholder="Confirme a nova senha"
              value={passwordForm.confirm}
              onChange={handlePasswordChange}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Alterando...' : 'Alterar senha'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-empresa-page">
      <div className="setup-empresa-card">
        <div className="setup-header">
          <Building2 size={40} />
          <h1>Configurar sua empresa</h1>
          <p>Complete os dados para ativar sua conta.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="setup-error">{error}</div>}

          <div className="form-group">
            <label>Nome oficial da empresa *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ex: Indústria ABC Ltda"
              required
            />
          </div>

          <div className="form-group">
            <label>CNPJ</label>
            <input
              type="text"
              name="cnpj"
              value={form.cnpj}
              onChange={handleChange}
              placeholder="00.000.000/0001-00"
            />
          </div>

          <div className="form-group">
            <label>Setores principais</label>
            <input
              type="text"
              name="industry_segment"
              value={form.industry_segment}
              onChange={handleChange}
              placeholder="Ex: Metalúrgico, Produção"
            />
          </div>

          <div className="form-group">
            <label>Tipo de indústria</label>
            <input
              type="text"
              name="industry_type"
              value={form.industry_type}
              onChange={handleChange}
              placeholder="Ex: Manufatura, Alimentício"
            />
          </div>

          <div className="form-group">
            <label>Quantidade inicial de áreas</label>
            <input
              type="number"
              name="initial_areas_count"
              value={form.initial_areas_count}
              onChange={(e) => setForm(prev => ({ ...prev, initial_areas_count: Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 5)) }))}
              min={1}
              max={20}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Configurando...' : 'Confirmar e acessar'}
          </button>
        </form>
      </div>
    </div>
  );
}
