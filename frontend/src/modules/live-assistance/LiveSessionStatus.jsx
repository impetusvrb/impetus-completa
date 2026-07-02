/**
 * UX-MANUIA-001 — Status unificado (sessão, erro, microfone)
 */
import React from 'react';
import { AlertTriangle, Mic, RefreshCw, Camera } from 'lucide-react';
import styles from './LiveTechnicalAssistance.module.css';

export default function LiveSessionStatus({
  uiStatus,
  statusLabel,
  machineName,
  error,
  errorType = 'generic',
  cameraCanRetry,
  assistanceOn,
  speechError,
  onRetry,
  onSwitchCamera
}) {
  const hasError = !!error;
  const statusClass =
    uiStatus === 'analyzing'
      ? styles.statusAnalyzing
      : uiStatus === 'ready' || uiStatus === 'part_detected'
        ? styles.statusReady
        : hasError
          ? styles.statusError
          : '';

  return (
    <div className={styles.sessionStatusWrap}>
      {!hasError && (
        <div className={`${styles.statusBar} ${statusClass}`}>
          <span className={styles.statusDot} />
          <strong>{statusLabel}</strong>
          {machineName && (
            <span className={styles.statusMachine}>
              · Ativo: <em>{machineName}</em>
            </span>
          )}
        </div>
      )}

      {hasError && (
        <div className={styles.sessionStatusError} role="alert">
          <div className={styles.sessionStatusError__head}>
            <AlertTriangle size={18} />
            <strong>{errorType === 'camera' ? 'Erro de câmera' : 'Erro na assistência'}</strong>
          </div>
          <p className={styles.sessionStatusError__msg}>{error}</p>
          <div className={styles.sessionStatusError__actions}>
            {cameraCanRetry && !assistanceOn && onRetry && (
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onRetry}>
                <RefreshCw size={16} /> Tentar novamente
              </button>
            )}
            {errorType === 'camera' && assistanceOn && onSwitchCamera && (
              <button type="button" className={styles.btn} onClick={onSwitchCamera}>
                <Camera size={16} /> Alterar câmera
              </button>
            )}
            {errorType === 'camera' && !assistanceOn && onSwitchCamera && (
              <button type="button" className={styles.btn} onClick={onSwitchCamera}>
                <Camera size={16} /> Alterar câmera
              </button>
            )}
          </div>
        </div>
      )}

      {speechError && !hasError && (
        <div className={styles.sessionStatusMic} role="status">
          <Mic size={14} />
          <span>{speechError}</span>
        </div>
      )}
    </div>
  );
}
