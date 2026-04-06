import React, { useEffect, useState } from 'react';
import { api } from '../api/http';
import { useAuth } from '../auth/AuthContext';

export default function Users() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'admin_suporte' });

  const load = () =>
    api('/users')
      .then(setData)
      .catch((e) => setErr(e.message));

  useEffect(() => {
    load();
  }, []);

  if (user?.perfil !== 'super_admin') {
    return (
      <div className="card">
        <p>Apenas <strong>super_admin</strong> pode gerir usuários internos do painel.</p>
      </div>
    );
  }

  const criar = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setForm({ nome: '', email: '', senha: '', perfil: 'admin_suporte' });
      load();
    } catch (e2) {
      setErr(e2.data?.error || e2.message);
    }
  };

  const toggle = async (id, ativo) => {
    try {
      await api(`/users/${id}/active`, { method: 'PATCH', body: JSON.stringify({ ativo: !ativo }) });
      load();
    } catch (e2) {
      alert(e2.message);
    }
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Usuários internos</h1>
      {err && <p style={{ color: 'var(--red)' }}>{err}</p>}

      <form onSubmit={criar} className="card" style={{ marginBottom: 24, maxWidth: 520 }}>
        <h2 style={{ marginTop: 0, fontSize: '1rem' }}>Novo usuário</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <input className="input" placeholder="Nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
          <input className="input" type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          <input className="input" type="password" placeholder="Senha (mín. 6)" value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))} required />
          <select className="input" value={form.perfil} onChange={(e) => setForm((f) => ({ ...f, perfil: e.target.value }))}>
            <option value="super_admin">super_admin</option>
            <option value="admin_comercial">admin_comercial</option>
            <option value="admin_suporte">admin_suporte</option>
          </select>
          <button type="submit" className="btn btn--primary">
            Criar
          </button>
        </div>
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Ativo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(data?.data || []).map((u) => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>{u.perfil}</td>
                <td>{u.ativo ? 'sim' : 'não'}</td>
                <td>
                  <button type="button" className="btn" onClick={() => toggle(u.id, u.ativo)}>
                    {u.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
