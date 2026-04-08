import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/http';

const STATUSES = ['teste', 'ativo', 'suspenso', 'cancelado'];

export default function CompanyNew() {
  const navigate = useNavigate();
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    email_responsavel: '',
    telefone_responsavel: '',
    nome_responsavel: '',
    tenant_status: 'teste',
    data_inicio_contrato: '',
    data_fim_contrato: '',
    observacoes: ''
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const r = await api('/companies', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          cnpj: form.cnpj || null,
          data_inicio_contrato: form.data_inicio_contrato || null,
          data_fim_contrato: form.data_fim_contrato || null,
          observacoes: form.observacoes || null
        })
      });
      if (r.tenant_admin?.invite_email_sent === false) {
        if (r.tenant_admin.debug_activation_url) {
          try {
            await navigator.clipboard.writeText(r.tenant_admin.debug_activation_url);
            window.alert(
              'Empresa criada. SMTP não configurado — o link de primeiro acesso foi copiado. Cole no browser da app cliente (ex.: porta 3000 com PM2), não no painel admin.'
            );
          } catch {
            window.alert(
              `Empresa criada. Copie o link manualmente:\n\n${r.tenant_admin.debug_activation_url}`
            );
          }
        } else {
          window.alert(
            'Empresa e administrador criados, mas o e-mail não foi enviado. Configure SMTP (SMTP_*) no backend ou defina ADMIN_PORTAL_DEBUG_INVITE_LINK=true só em desenvolvimento.'
          );
        }
      }
      navigate(`/empresas/${r.company.company_id}`);
    } catch (e2) {
      setErr(e2.data?.error || e2.message);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ marginTop: 0 }}>Nova empresa</h1>
      <form onSubmit={submit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label className="label">Razão social *</label>
          <input className="input" value={form.razao_social} onChange={set('razao_social')} required />
        </div>
        <div>
          <label className="label">Nome fantasia</label>
          <input className="input" value={form.nome_fantasia} onChange={set('nome_fantasia')} />
        </div>
        <div>
          <label className="label">CNPJ (14 dígitos)</label>
          <input className="input" value={form.cnpj} onChange={set('cnpj')} placeholder="Somente números" />
        </div>
        <div>
          <label className="label">Nome do responsável</label>
          <input className="input" value={form.nome_responsavel} onChange={set('nome_responsavel')} />
        </div>
        <div>
          <label className="label">E-mail do responsável *</label>
          <input
            className="input"
            type="email"
            value={form.email_responsavel}
            onChange={set('email_responsavel')}
            required
            autoComplete="email"
          />
          <p className="muted" style={{ fontSize: '0.8rem', marginTop: 6 }}>
            Será criado o utilizador <strong>admin</strong> da empresa (acesso administrativo) e enviado um link seguro para definir a senha — sem senha em texto no e-mail. Depois, esse admin pode cadastrar CEO, diretores e demais cargos.
          </p>
        </div>
        <div>
          <label className="label">Telefone</label>
          <input className="input" value={form.telefone_responsavel} onChange={set('telefone_responsavel')} />
        </div>
        <div>
          <label className="label">Status inicial</label>
          <select className="input" value={form.tenant_status} onChange={set('tenant_status')}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="label">Início do contrato</label>
            <input className="input" type="date" value={form.data_inicio_contrato} onChange={set('data_inicio_contrato')} />
          </div>
          <div>
            <label className="label">Fim do contrato</label>
            <input className="input" type="date" value={form.data_fim_contrato} onChange={set('data_fim_contrato')} />
          </div>
        </div>
        <div>
          <label className="label">Observações</label>
          <textarea className="input" rows={3} value={form.observacoes} onChange={set('observacoes')} />
        </div>
        {err && <p style={{ color: 'var(--red)' }}>{err}</p>}
        <button type="submit" className="btn btn--primary">
          Salvar
        </button>
      </form>
    </div>
  );
}
