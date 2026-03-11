/**
 * IMPETUS - Validação de Cargo no Primeiro Acesso
 * Permite que usuários com cargos estratégicos validem seu cargo
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { roleVerification } from '../services/api';
import { Shield, Mail, Users, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import './RoleVerificationPage.css';

const METHODS = [
  { id: 'email', icon: Mail, label: 'Email corporativo', desc: 'Se seu email for do domínio da empresa, validação automática.' },
  { id: 'approval', icon: Users, label: 'Aprovação hierárquica', desc: 'Seu superior direto aprova seu cargo.' },
  { id: 'document', icon: FileText, label: 'Documento corporativo', desc: 'Envie crachá, organograma ou carta de nomeação.' }
];

export default function RoleVerificationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [method, setMethod] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isCorporateEmail, setIsCorporateEmail] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [file, setFile] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [statusRes, emailRes] = await Promise.all([
        roleVerification.getStatus(),
        roleVerification.checkEmail().catch(() => ({ data: { is_corporate: false } }))
      ]);
      if (statusRes?.data?.ok) setStatus(statusRes.data);
      if (emailRes?.data?.is_corporate) setIsCorporateEmail(true);
    } catch (e) {
      setError(e?.apiMessage || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleVerifyEmail = async () => {
    setSubmitting(true);
    setError('');
    try {
      const r = await roleVerification.verifyByEmail();
      if (r?.data?.ok) {
        const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
        localStorage.setItem('impetus_user', JSON.stringify({ ...u, role_verified: true }));
        navigate('/app');
        window.location.reload();
      } else setError(r?.data?.error || 'Erro');
    } catch (e) {
      setError(e?.apiMessage || e?.response?.data?.error || 'Erro ao validar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestApproval = async () => {
    setSubmitting(true);
    setError('');
    try {
      const r = await roleVerification.requestApproval();
      if (r?.data?.ok) {
        setError('');
        setMethod(null);
        alert('Solicitação enviada ao seu superior. Você será notificado quando for aprovado.');
        load();
      } else setError(r?.data?.error || 'Erro');
    } catch (e) {
      setError(e?.apiMessage || e?.response?.data?.error || 'Erro ao solicitar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadDocument = async () => {
    if (!file) {
      setError('Selecione um documento');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('document_type', 'documento_corporativo');
      const r = await roleVerification.uploadDocument(formData);
      if (r?.data?.ok) {
        if (r.data.verified) {
          const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
          localStorage.setItem('impetus_user', JSON.stringify({ ...u, role_verified: true }));
          navigate('/app');
          window.location.reload();
        } else {
          setError(r.data.message || 'Documento recebido. Aguarde revisão.');
          setMethod(null);
        }
      } else setError(r?.data?.error || 'Erro');
    } catch (e) {
      setError(e?.apiMessage || e?.response?.data?.error || 'Erro ao enviar');
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
            <p className="rv-subtitle">Seu cargo exige verificação para acessar dados estratégicos. Escolha um método:</p>
          </div>
        </header>

        {error && (
          <div className="rv-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {!method ? (
          <div className="rv-methods">
            {METHODS.map((m) => {
              const Icon = m.icon;
              const disabled = m.id === 'email' && !isCorporateEmail;
              return (
                <button
                  key={m.id}
                  className={`rv-method-card ${disabled ? 'disabled' : ''}`}
                  onClick={() => !disabled && setMethod(m.id)}
                  disabled={disabled}
                  title={disabled ? 'Email não é do domínio corporativo' : ''}
                >
                  <Icon size={28} />
                  <strong>{m.label}</strong>
                  <small>{m.desc}</small>
                  {m.id === 'email' && isCorporateEmail && <span className="rv-badge">Disponível</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rv-form">
            {method === 'email' && (
              <>
                <p>Seu email é do domínio corporativo. Clique para validar automaticamente.</p>
                <button className="rv-btn-primary" onClick={handleVerifyEmail} disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="spin" /> : <Mail size={18} />} Validar por email
                </button>
              </>
            )}
            {method === 'approval' && (
              <>
                <p>Sua solicitação será enviada ao seu superior hierárquico.</p>
                <button className="rv-btn-primary" onClick={handleRequestApproval} disabled={submitting}>
                  {submitting ? <Loader2 size={18} className="spin" /> : <Users size={18} />} Solicitar aprovação
                </button>
              </>
            )}
            {method === 'document' && (
              <>
                <p>Envie um documento corporativo (crachá, organograma, documento de RH ou carta de nomeação).</p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0])}
                />
                <button className="rv-btn-primary" onClick={handleUploadDocument} disabled={submitting || !file}>
                  {submitting ? <Loader2 size={18} className="spin" /> : <FileText size={18} />} Enviar documento
                </button>
              </>
            )}
            <button className="rv-btn-secondary" onClick={() => { setMethod(null); setError(''); }} disabled={submitting}>
              Voltar
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
