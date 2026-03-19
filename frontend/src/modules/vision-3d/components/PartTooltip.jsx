/**
 * IMPETUS - ManuIA 3D Vision - Tooltip ao hover nas peças
 */
import React from 'react';
import styles from '../styles/Vision3D.module.css';

export default function PartTooltip({ visible, x, y, name, code, status, estimatedTemp, tempUnit }) {
  if (!visible) return null;

  const statusLabel = { ok: 'OK', warn: 'ATENÇÃO', crit: 'CRÍTICO' };

  return (
    <div
      className={styles.partTooltip}
      style={{ left: x, top: y }}
    >
      <div className={styles.partTooltip__name}>{name}</div>
      <div className={styles.partTooltip__code}>{code}</div>
      <div className={`${styles.partTooltip__status} ${styles[`partTooltip__status--${status}`] || ''}`}>
        {statusLabel[status] || status}
      </div>
      {estimatedTemp != null && (
        <div className={styles.partTooltip__temp}>
          ~{estimatedTemp}{tempUnit || '°C'}
        </div>
      )}
    </div>
  );
}
