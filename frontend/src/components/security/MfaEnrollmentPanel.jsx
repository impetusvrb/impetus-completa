/**
 * Enrolamento TOTP em Configurações → Segurança.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { authMfa } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

export default function MfaEnrollmentPanel() {
  const notify = useNotification();
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState(null);
  const [uri, setUri] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [backupShown, setBackupShown] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await authMfa.getPolicy();
      setPolicy(data);
    } catch {
      setPolicy(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEnroll = async () => {
    setEnrolling(true);
    try {
      const { data } = await authMfa.enrollTotpBegin();
      if (!data?.ok) throw new Error(data?.error || 'Falha ao iniciar 2FA');
      setUri(data.otpauth_uri || '');
      notify.info('Abra o Google Authenticator (ou similar) e escaneie o QR via link otpauth.');
    } catch (e) {
      notify.error(e.response?.data?.error || e.message || 'Erro');
    } finally {
      setEnrolling(false);
    }
  };

  const confirmEnroll = async () => {
    if (!confirmCode.trim()) return;
    setEnrolling(true);
    try {
      const { data } = await authMfa.enrollTotpConfirm(confirmCode.trim());
      if (!data?.ok) throw new Error(data?.error || data?.code || 'Código inválido');
      if (data.backup_codes?.length) setBackupShown(data.backup_codes);
      setUri('');
      setConfirmCode('');
      notify.success('2FA activado.');
      await load();
    } catch (e) {
      notify.error(e.response?.data?.error || e.message || 'Código inválido');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="us-mfa-panel us-muted">
        <Loader2 size={18} className="us-spin" /> A carregar 2FA…
      </div>
    );
  }

  if (!policy?.ok && policy !== null) {
    return (
      <div className="us-mfa-panel us-muted">
        2FA enterprise não disponível neste ambiente.
      </div>
    );
  }

  const enrolled = !!policy?.enrollment?.totp_enabled;

  return (
    <div className="us-mfa-panel">
      <h3 className="us-subtitle">
        <Shield size={18} /> Autenticação em dois factores (2FA)
      </h3>
      <p className="us-muted">
        Protege a conta mesmo se a senha vazar. Obrigatório para administradores quando activo na empresa.
      </p>

      {enrolled ? (
        <p className="us-badge us-badge--ok">2FA activo — TOTP</p>
      ) : (
        <>
          {!uri ? (
            <button type="button" className="btn btn-secondary" onClick={startEnroll} disabled={enrolling}>
              Configurar autenticador
            </button>
          ) : (
            <div className="us-mfa-enroll">
              <p className="us-muted us-mfa-uri">
                Link para o app autenticador (copie se não houver QR na UI):
              </p>
              <code className="us-mfa-uri-code">{uri}</code>
              <input
                className="form-input"
                placeholder="Código 6 dígitos do app"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
              />
              <button type="button" className="btn btn-primary" onClick={confirmEnroll} disabled={enrolling}>
                Confirmar 2FA
              </button>
            </div>
          )}
        </>
      )}

      {backupShown && (
        <div className="us-mfa-backup">
          <p className="us-muted">
            <strong>Guarde estes códigos de backup</strong> (mostrados uma vez):
          </p>
          <pre className="us-mfa-backup-codes">{backupShown.join('\n')}</pre>
        </div>
      )}
    </div>
  );
}
