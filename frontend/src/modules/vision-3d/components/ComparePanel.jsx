/**
 * IMPETUS - ManuIA 3D Vision - Painel de comparação diagnóstico antigo vs atual
 */
import React from 'react';
import { X, GitCompare } from 'lucide-react';
import styles from '../styles/Vision3D.module.css';

const SEVERITY_BADGE = {
  CRITICO: styles['historyBadge--crit'],
  ALERTA: styles['historyBadge--warn'],
  NORMAL: styles['historyBadge--ok']
};

function CompareCard({ label, data }) {
  const badgeClass = SEVERITY_BADGE[data?.severity] || styles['historyBadge--ok'];
  return (
    <div className={styles.compareCard}>
      <div className={styles.compareCard__label}>{label}</div>
      <div className={styles.compareCard__header}>
        <span className={styles.compareCard__equip}>{data?.equipment || '—'}</span>
        <span className={`${styles.historyBadge} ${badgeClass}`}>{data?.severity || 'NORMAL'}</span>
      </div>
      {data?.faultParts?.length > 0 && (
        <div className={styles.compareCard__faults}>
          <strong>Peças em falha:</strong> {data.faultParts.join(', ')}
        </div>
      )}
      {data?.steps?.length > 0 && (
        <div className={styles.compareCard__steps}>
          <strong>Passos:</strong> {data.steps.length}
        </div>
      )}
    </div>
  );
}

export default function ComparePanel({ previousSession, currentResult, onClose }) {
  return (
    <div className={styles.compareOverlay}>
      <div className={styles.compareOverlay__header}>
        <div className={styles.compareOverlay__title}>
          <GitCompare size={18} /> Comparar diagnósticos
        </div>
        <button type="button" className={styles.historyDrawer__close} onClick={onClose} title="Sair">
          <X size={18} />
        </button>
      </div>
      <div className={styles.compareOverlay__grid}>
        <CompareCard label="Diagnóstico anterior" data={previousSession} />
        <CompareCard label="Diagnóstico atual" data={currentResult} />
      </div>
    </div>
  );
}
