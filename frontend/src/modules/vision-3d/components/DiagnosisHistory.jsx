/**
 * IMPETUS - ManuIA 3D Vision - Drawer de histórico de diagnósticos
 * Lista sessões anteriores, restaura ou compara com atual
 */
import React, { useState, useEffect } from 'react';
import { History, X, RotateCcw, GitCompare } from 'lucide-react';
import { getSessions, deleteSession, clearHistory } from '../services/historyService';
import styles from '../styles/Vision3D.module.css';

const SEVERITY_CLASS = {
  CRITICO: 'historyBadge--crit',
  ALERTA: 'historyBadge--warn',
  NORMAL: 'historyBadge--ok'
};

export default function DiagnosisHistory({
  open,
  machineId,
  currentResult,
  onClose,
  onRestoreSession,
  onCompareSession,
  onCompareMode
}) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && machineId !== undefined) {
      setLoading(true);
      getSessions(machineId)
        .then(setSessions)
        .finally(() => setLoading(false));
    }
  }, [open, machineId]);

  const handleRestore = (session) => {
    onRestoreSession?.(session);
    onClose?.();
  };

  const handleCompare = (session) => {
    onCompareSession?.(session);
    onCompareMode?.(true);
    onClose?.();
  };

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    await deleteSession(machineId, sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const handleClearAll = async () => {
    if (!window.confirm('Limpar todo o histórico deste equipamento?')) return;
    await clearHistory(machineId);
    setSessions([]);
  };

  if (!open) return null;

  return (
    <div className={styles.historyDrawer}>
      <div className={styles.historyDrawer__header}>
        <div className={styles.historyDrawer__title}>
          <History size={18} /> Histórico
        </div>
        <button type="button" className={styles.historyDrawer__close} onClick={onClose} title="Fechar">
          <X size={18} />
        </button>
      </div>
      <div className={styles.historyDrawer__content}>
        {loading ? (
          <p className={styles.historyDrawer__empty}>Carregando...</p>
        ) : sessions.length === 0 ? (
          <p className={styles.historyDrawer__empty}>Nenhum diagnóstico anterior.</p>
        ) : (
          <ul className={styles.historyList}>
            {sessions.map((session) => (
              <li key={session.id} className={styles.historyItem}>
                <div
                  className={styles.historyItem__inner}
                  onClick={() => handleRestore(session)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleRestore(session)}
                >
                  <div className={styles.historyItem__thumb}>
                    {session.imageThumb ? (
                      <img
                        src={`data:image/jpeg;base64,${session.imageThumb}`}
                        alt=""
                        width={120}
                        height={80}
                      />
                    ) : (
                      <div className={styles.historyItem__thumbPlaceholder}>—</div>
                    )}
                  </div>
                  <div className={styles.historyItem__info}>
                    <span className={styles.historyItem__date}>
                      {new Date(session.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={styles.historyItem__equip}>{session.equipment || 'Equipamento'}</span>
                    <span className={`${styles.historyBadge} ${styles[SEVERITY_CLASS[session.severity]] || styles['historyBadge--ok']}`}>
                      {session.severity}
                    </span>
                  </div>
                  <div className={styles.historyItem__actions}>
                    <button
                      type="button"
                      className={styles.historyItem__btn}
                      onClick={(e) => { e.stopPropagation(); handleCompare(session); }}
                      title="Comparar com atual"
                    >
                      <GitCompare size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.historyItem__btn}
                      onClick={(e) => handleDelete(e, session.id)}
                      title="Excluir"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {sessions.length > 0 && (
          <button type="button" className={styles.historyClearBtn} onClick={handleClearAll}>
            <RotateCcw size={14} /> Limpar histórico
          </button>
        )}
      </div>
    </div>
  );
}
