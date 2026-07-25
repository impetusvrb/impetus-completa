/**
 * Passo 2FA no login — TOTP ou código de backup.
 */
import React, { useState } from 'react';
import { Shield, AlertCircle } from 'lucide-react';

export default function MfaLoginStep({
  methods = ['totp'],
  onVerify,
  onCancel,
  userHint = '',
  loading = false,
  error = ''
}) {
  const [method, setMethod] = useState(methods.includes('totp') ? 'totp' : methods[0] || 'totp');
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    onVerify({ method, code: code.trim(), trust_device: trustDevice });
  };

  return (
    <form className="login-form mfa-login-step" onSubmit={submit}>
      <div className="mfa-login-step__header">
        <Shield size={22} />
        <div>
          <h2 className="mfa-login-step__title">VERIFICAÇÃO 2FA</h2>
          <p className="mfa-login-step__sub">
            {userHint || 'Introduza o código do autenticador ou de backup.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {methods.length > 1 && (
        <div className="mfa-login-step__methods">
          {methods.includes('totp') && (
            <button
              type="button"
              className={`btn btn-ghost ${method === 'totp' ? 'mfa-login-step__method--active' : ''}`}
              onClick={() => setMethod('totp')}
            >
              Autenticador
            </button>
          )}
          {methods.includes('backup') && (
            <button
              type="button"
              className={`btn btn-ghost ${method === 'backup' ? 'mfa-login-step__method--active' : ''}`}
              onClick={() => setMethod('backup')}
            >
              Código backup
            </button>
          )}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="mfa-code">
          {method === 'backup' ? 'Código de backup' : 'Código 6 dígitos'}
        </label>
        <input
          id="mfa-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={method === 'backup' ? 'XXXX-XXXX' : '000000'}
          disabled={loading}
          autoFocus
        />
      </div>

      <label className="mfa-login-step__trust">
        <input
          type="checkbox"
          checked={trustDevice}
          onChange={(e) => setTrustDevice(e.target.checked)}
          disabled={loading}
        />
        <span>Confiar neste dispositivo (14 dias)</span>
      </label>

      <button type="submit" className="btn btn-primary login-button" disabled={loading || !code.trim()}>
        {loading ? 'A verificar…' : 'Confirmar acesso'}
      </button>

      {onCancel && (
        <button type="button" className="btn btn-ghost mfa-login-step__back" onClick={onCancel} disabled={loading}>
          Voltar
        </button>
      )}
    </form>
  );
}
