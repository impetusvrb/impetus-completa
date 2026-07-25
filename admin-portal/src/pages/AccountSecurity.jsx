import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api/http';

export default function AccountSecurity() {
  const [status, setStatus] = useState(null);
  const [uri, setUri] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    try {
      const r = await api('/auth/mfa/status');
      setStatus(r);
    } catch (e) {
      setErr(e.message || 'Erro ao carregar estado 2FA');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEnroll = async () => {
    setBusy(true);
    setErr('');
    try {
      const r = await api('/auth/mfa/enroll/begin', { method: 'POST' });
      setUri(r.otpauth_uri || '');
    } catch (e) {
      setErr(e.message || 'Não foi possível iniciar 2FA');
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setErr('');
    try {
      await api('/auth/mfa/enroll/confirm', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() })
      });
      setUri('');
      setCode('');
      await load();
    } catch (e) {
      setErr(e.message || 'Código inválido');
    } finally {
      setBusy(false);
    }
  };

  const enrolled = !!status?.totp_enabled;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Segurança da conta</h1>
      <p className="muted">Autenticação em dois factores (2FA) para o painel equipe IMPETUS.</p>

      {err && <p style={{ color: 'var(--red)' }}>{err}</p>}

      <div className="card" style={{ maxWidth: 520 }}>
        {enrolled ? (
          <>
            <span className="badge" style={{ color: 'var(--green)', borderColor: 'var(--green)' }}>
              2FA activo
            </span>
            <p className="muted" style={{ marginTop: 12 }}>
              Activado em{' '}
              {status.enrolled_at ? new Date(status.enrolled_at).toLocaleString('pt-BR') : '—'}
            </p>
          </>
        ) : (
          <>
            <p className="muted">
              Use Google Authenticator, Microsoft Authenticator ou Authy. Depois de activar, cada login pedirá um código
              de 6 dígitos.
            </p>
            {!uri ? (
              <button type="button" className="btn btn--primary" onClick={startEnroll} disabled={busy}>
                Configurar autenticador
              </button>
            ) : (
              <form onSubmit={confirmEnroll}>
                <p className="label" style={{ marginTop: 16 }}>
                  1. No app autenticador, adicione conta manualmente ou abra o link:
                </p>
                <code
                  style={{
                    display: 'block',
                    fontSize: '0.68rem',
                    wordBreak: 'break-all',
                    padding: 10,
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: 4,
                    marginBottom: 12,
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {uri}
                </code>
                <p className="label">2. Introduza o código de 6 dígitos</p>
                <input
                  className="input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={code}
                  onChange={(ev) => setCode(ev.target.value.replace(/\s/g, ''))}
                  placeholder="000000"
                  style={{ marginBottom: 12 }}
                />
                <button type="submit" className="btn btn--primary" disabled={busy}>
                  Confirmar 2FA
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
