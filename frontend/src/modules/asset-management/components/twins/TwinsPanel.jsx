import React, { useState, useCallback } from 'react';
import { Cpu, X, FlaskConical } from 'lucide-react';
import { can } from '../../utils/permissions';
import styles from '../../styles/AssetManagement.module.css';

function statusLabel(s) {
  if (s === 'critical') return 'Crítico';
  if (s === 'warn') return 'Alerta';
  return 'OK';
}

export default function TwinsPanel({
  twins = [],
  profile,
  variant = 'full',
  onSimulate,
  onNavigateToMachine
}) {
  const [detail, setDetail] = useState(null);

  const showFullCards = variant === 'full' && can(profile, 'twinsViewFull');
  const showSummary = variant === 'summary' && can(profile, 'twinsViewSummary');
  if (!showFullCards && !showSummary) return null;

  const canSimulate = can(profile, 'twinSimulateFailure') && typeof onSimulate === 'function';

  const openDetail = useCallback((t) => {
    if (showFullCards || (showSummary && t)) setDetail(t);
  }, [showFullCards, showSummary]);

  const list = showSummary ? twins.slice(0, 6) : twins;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Gêmeos digitais</h3>
        {showSummary && <span className={styles.dashboardHint}>Resumo executivo</span>}
      </div>

      {list.length === 0 ? (
        <p className={styles.panelEmpty}>Sem equipamentos monitorados.</p>
      ) : showSummary ? (
        <ul className={styles.alertList}>
          {list.map((t) => (
            <li
              key={t.id || t.machineId}
              className={`${styles.alertItem} ${t.status === 'critical' ? styles['alertItem--critical'] : t.status === 'warn' ? styles['alertItem--warn'] : ''}`}
            >
              <strong>{t.name || t.machineId}</strong>
              <span>
                {statusLabel(t.status)} · falha ~{t.prediction?.failureProbability ?? 0}%
                {t.prediction?.estimatedFailureIn ? ` · ${t.prediction.estimatedFailureIn}` : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.twinGrid}>
          {list.map((t) => (
            <button
              key={t.id || t.machineId}
              type="button"
              className={`${styles.twinCard} ${styles[`twinCard--${t.status || 'ok'}`]}`}
              onClick={() => openDetail(t)}
            >
              <div className={styles.twinCard__header}>
                <Cpu size={18} className={styles.twinCard__icon} />
                <span className={styles.twinCard__name}>{t.name || t.machineId}</span>
                <span className={`${styles.twinCard__status} ${styles[`twinCard__status--${t.status || 'ok'}`]}`}>
                  {statusLabel(t.status)}
                </span>
              </div>
              <div className={styles.twinCard__sensors}>
                {t.sensors?.temperature != null && <span>{t.sensors.temperature}°C</span>}
                {t.sensors?.vibration != null && <span>{t.sensors.vibration} mm/s</span>}
                {t.sensors?.efficiency != null && <span>{t.sensors.efficiency}%</span>}
              </div>
              <div className={styles.twinCard__prediction}>
                <span>Risco falha</span>
                <span className={styles.twinCard__eta}>{t.prediction?.failureProbability ?? 0}%</span>
              </div>
              <span className={styles.twinCard__action}>Ver detalhes</span>
            </button>
          ))}
        </div>
      )}

      {detail && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>
                <Cpu size={20} /> {detail.name || detail.machineId}
              </h2>
              <button type="button" className={styles.modalClose} onClick={() => setDetail(null)} aria-label="Fechar">
                <X size={22} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.twinDetail}>
                <div className={styles.twinDetail__row}>
                  <span>ID gêmeo</span>
                  <span>{detail.id}</span>
                </div>
                <div className={styles.twinDetail__row}>
                  <span>Máquina</span>
                  <span>{detail.machineId}</span>
                </div>
                <div className={styles.twinDetail__row}>
                  <span>Horas operação</span>
                  <span>{detail.operatingHours ?? '—'}</span>
                </div>
                <div className={styles.twinDetail__row}>
                  <span>Última manutenção</span>
                  <span>{detail.lastMaintenance ?? '—'}</span>
                </div>
              </div>
              <div className={styles.twinDetailSection}>
                <h3>Sensores</h3>
                <div className={styles.twinDetail__sensors}>
                  {detail.sensors &&
                    Object.entries(detail.sensors).map(([k, v]) => (
                      <span key={k}>
                        {k}: {v}
                        {k === 'temperature' ? '°C' : k === 'vibration' ? ' mm/s' : k === 'efficiency' ? '%' : k === 'pressure' ? ' bar' : k === 'rpm' ? ' rpm' : ''}
                      </span>
                    ))}
                </div>
              </div>
              <div className={styles.twinDetailSection}>
                <h3>Análise</h3>
                <p className={styles.twinDetail__aiMessage}>{detail.prediction?.aiMessage || '—'}</p>
                <div className={styles.twinDetail__prediction}>
                  <span>Probabilidade de falha: {detail.prediction?.failureProbability ?? 0}%</span>
                  <span>Estimativa: {detail.prediction?.estimatedFailureIn ?? '—'}</span>
                  {(detail.prediction?.faultParts || []).length > 0 && (
                    <span>Peças em risco: {(detail.prediction.faultParts || []).join(', ')}</span>
                  )}
                </div>
              </div>
              {Array.isArray(detail.history) && detail.history.length > 0 && (
                <div className={styles.twinDetailSection}>
                  <h3>Histórico temp. (últimas leituras)</h3>
                  <div className={styles.twinDetail__history}>
                    {detail.history.slice(-12).map((v, i) => (
                      <span key={i} className={styles.twinDetail__historyDot}>
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              {onNavigateToMachine && detail.machineId && (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => onNavigateToMachine(detail.name || detail.machineId, detail.machineId)}
                >
                  Abrir cadastro
                </button>
              )}
              {canSimulate && (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={async () => {
                    await onSimulate(detail.id);
                    setDetail(null);
                  }}
                >
                  <FlaskConical size={18} /> Simular falha
                </button>
              )}
              <button type="button" className={styles.btnSecondary} onClick={() => setDetail(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
