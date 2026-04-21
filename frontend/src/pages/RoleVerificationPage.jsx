/**
 * IMPETUS - Validação de Cargo no Primeiro Acesso
 * Permite que usuários com cargos estratégicos validem seu cargo
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { roleVerification } from '../services/api';
import { Shield, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import './RoleVerificationPage.css';

export default function RoleVerificationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const statusRes = await roleVerification.getStatus();
      if (statusRes?.data?.ok) setStatus(statusRes.data);
    } catch (e) {
      setError(e?.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRequestApproval = async () => {
    setSubmitting(true);
    setError('');
    try {
      const r = await roleVerification.requestApproval();
      if (r?.data?.ok) {
        setError('');
        alert('Solicitação enviada ao seu superior. Você será notificado quando for aprovado.');
        load();
      } else setError(r?.data?.error || 'Erro');
    } catch (e) {
      setError(e?.apiMessage || e?.response?.data?.error || 'Erro ao solicitar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="rv-page">
          <div className="rv-loading"><Loader2 size={32} className="spin" /> Carregando...</div>
        </div>
      </Layout>
    );
  }

  if (status?.role_verified) {
    return (
      <Layout>
        <div className="rv-page">
          <div className="rv-success">
            <CheckCircle size={48} />
            <h2>Cargo já verificado</h2>
            <p>Você já possui acesso completo ao sistema.</p>
            <button className="rv-btn-primary" onClick={() => navigate('/app')}>Ir ao Dashboard</button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!status?.needs_verification) {
    return (
      <Layout>
        <div className="rv-page">
          <div className="rv-success">
            <p>Seu cargo não exige verificação.</p>
            <button className="rv-btn-primary" onClick={() => navigate('/app')}>Continuar</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="rv-page">
        <header className="rv-header">
          <Shield size={32} />
          <div>
            <h1>Validação de Cargo</h1>
            <p className="rv-subtitle">Seu cargo exige verificação para acessar dados estratégicos.</p>
          </div>
        </header>

        {error && (
          <div className="rv-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="rv-form">
          <p>Sua solicitação será enviada ao seu superior hierárquico para aprovação.</p>
          <button className="rv-btn-primary" onClick={handleRequestApproval} disabled={submitting}>
            {submitting ? <Loader2 size={18} className="spin" /> : <Users size={18} />} Solicitar aprovação
          </button>
        </div>
      </div>
    </Layout>
  );
}
