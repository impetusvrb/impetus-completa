import React, { useState, useMemo, useRef, useEffect } from 'react';
import './SystemInfluenceCard.css';

/**
 * Cartão aditivo para meta.system_influence no chat (proposta informativa; confirmação explícita do utilizador).
 */
export default function SystemInfluenceCard({ data, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [status, setStatus] = useState(null);
  const dismissTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current != null) {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, []);

  const severityClass = useMemo(() => {
    const s = data?.severity != null ? String(data.severity).toLowerCase() : '';
    if (s === 'high') return 'impetus-influence-card--high';
    if (s === 'medium') return 'impetus-influence-card--medium';
    return 'impetus-influence-card--medium';
  }, [data?.severity]);

  if (!data || typeof data !== 'object' || resolved) return null;

  const messageText =
    typeof data.message === 'string' && data.message.trim() ? data.message.trim() : null;
  if (!messageText) return null;

  const confirmFeedbackMessage = (err) => {
    const code = err?.response?.data?.error;
    const statusHttp = err?.response?.status;
    if (code === 'RATE_LIMIT_EXCEEDED' || statusHttp === 429) {
      return 'Falha ao executar ação — limite de pedidos. Aguarde cerca de um minuto.';
    }
    return 'Falha ao executar ação';
  };

  const handleConfirm = async () => {
    try {
      setStatus(null);
      setLoading(true);
      const res = await onConfirm?.(data);
      if (res && res.data && res.data.ok === false) {
        throw new Error(res.data.error || 'confirm_failed');
      }
      setStatus({
        success: true,
        message: 'Ação registrada com sucesso'
      });
      if (dismissTimerRef.current != null) window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = window.setTimeout(() => {
        dismissTimerRef.current = null;
        setResolved(true);
      }, 3200);
    } catch (err) {
      console.warn('[SYSTEM_INFLUENCE_CONFIRM_FAIL]', err);
      setStatus({
        success: false,
        message: confirmFeedbackMessage(err)
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIgnore = () => {
    setStatus(null);
    setResolved(true);
  };

  const actionsHidden = status?.success === true;

  return (
    <div className={`impetus-influence-card ${severityClass}`} role="region" aria-label="Proposta do sistema">
      <div className="impetus-influence-card__label">Proposta do sistema</div>
      <div className="impetus-influence-card__message">{messageText}</div>

      {!actionsHidden && (
        <div className="impetus-influence-card__actions">
          <button
            type="button"
            className="impetus-influence-card__btn impetus-influence-card__btn--primary"
            onClick={() => void handleConfirm()}
            disabled={loading}
          >
            {loading ? 'A processar…' : 'Confirmar ação'}
          </button>
          <button
            type="button"
            className="impetus-influence-card__btn impetus-influence-card__btn--ghost"
            onClick={handleIgnore}
            disabled={loading}
          >
            Ignorar
          </button>
        </div>
      )}

      {status && (
        <div
          className={`influence-status ${status.success ? 'ok' : 'error'}`}
          role="status"
        >
          {status.message}
        </div>
      )}
    </div>
  );
}
