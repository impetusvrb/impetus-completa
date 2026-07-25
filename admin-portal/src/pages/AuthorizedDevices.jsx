import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/http';

export default function AuthorizedDevices() {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [ips, setIps] = useState([]);
  const [err, setErr] = useState('');
  const [ipPattern, setIpPattern] = useState('');
  const [ipLabel, setIpLabel] = useState('');
  const isSuper = user?.perfil === 'super_admin';

  const load = useCallback(async () => {
    setErr('');
    try {
      const dev = await api(`/device-trust/devices${isSuper ? '?all=1' : ''}`);
      setDevices(dev.data || []);
      if (isSuper) {
        const ipr = await api('/device-trust/ips');
        setIps(ipr.data || []);
      }
    } catch (e) {
      setErr(e.message || 'Erro ao carregar');
    }
  }, [isSuper]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id) => {
    await api(`/device-trust/devices/${id}/approve`, { method: 'POST', body: '{}' });
    await load();
  };

  const revoke = async (id) => {
    await api(`/device-trust/devices/${id}/revoke`, { method: 'POST', body: '{}' });
    await load();
  };

  const addIp = async (e) => {
    e.preventDefault();
    if (!ipPattern.trim()) return;
    await api('/device-trust/ips', {
      method: 'POST',
      body: JSON.stringify({ ip_pattern: ipPattern.trim(), label: ipLabel.trim() || undefined })
    });
    setIpPattern('');
    setIpLabel('');
    await load();
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dispositivos e IPs autorizados</h1>
      <p className="muted" style={{ maxWidth: 640 }}>
        Só entram no painel dispositivos aprovados e IPs da equipa. Celular novo do Welligton: aprovar aqui após o primeiro login.
      </p>
      {err && <p style={{ color: 'var(--red)' }}>{err}</p>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Dispositivos</h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Utilizador</th>
                <th>Etiqueta</th>
                <th>IP último</th>
                <th>Estado</th>
                {isSuper && <th />}
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr><td colSpan={isSuper ? 5 : 4} className="muted">Nenhum dispositivo registado.</td></tr>
              ) : (
                devices.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontSize: '0.8rem' }}>{d.admin_email}</td>
                    <td>{d.device_label || d.device_id || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>{d.last_ip || '—'}</td>
                    <td style={{ color: d.status === 'approved' ? 'var(--green)' : d.status === 'pending' ? 'var(--amber)' : 'var(--red)' }}>
                      {d.status}
                    </td>
                    {isSuper && (
                      <td>
                        {d.status === 'pending' && (
                          <button type="button" className="btn" style={{ fontSize: '0.7rem', padding: '2px 8px', marginRight: 4 }} onClick={() => approve(d.id)}>
                            Aprovar
                          </button>
                        )}
                        {d.status === 'approved' && (
                          <button type="button" className="btn btn-ghost" style={{ fontSize: '0.7rem', padding: '2px 8px' }} onClick={() => revoke(d.id)}>
                            Revogar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isSuper && (
        <div className="card">
          <h2 style={{ margin: '0 0 12px', fontSize: '1rem' }}>IPs / redes autorizadas</h2>
          <form onSubmit={addIp} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <input className="input" placeholder="2804:2980:* ou 186.225.*" value={ipPattern} onChange={(e) => setIpPattern(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
            <input className="input" placeholder="Etiqueta (ex: Welligton celular)" value={ipLabel} onChange={(e) => setIpLabel(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
            <button type="submit" className="btn">Adicionar</button>
          </form>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8rem' }}>
            {ips.map((ip) => (
              <li key={ip.id} style={{ marginBottom: 4 }}>
                <code>{ip.ip_pattern}</code> — {ip.label || 'sem etiqueta'}
                {ip.admin_user_id ? ' (utilizador)' : ' (global)'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
