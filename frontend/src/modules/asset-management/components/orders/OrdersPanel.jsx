import React, { useState } from 'react';
import { ClipboardPlus, Bot, UserCheck } from 'lucide-react';
import { can } from '../../utils/permissions';
import styles from '../../styles/AssetManagement.module.css';

export default function OrdersPanel({ orders = [], profile, onApprove, onCreateOrder, onReassign }) {
  const [draft, setDraft] = useState({ machineId: '', machineName: '', priority: 'P3', type: 'Corretiva' });
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState(null);

  const canApproveP12 = can(profile, 'ordersApproveP1P2');
  const canApproveP34 = can(profile, 'ordersApproveP3P4');
  const canCreate = can(profile, 'ordersCreateManual');
  const canReassign = can(profile, 'ordersReassign');

  const canApproveOrder = (o) => {
    if (o.status !== 'pending_approval') return false;
    if (['P1', 'P2'].includes(o.priority)) return canApproveP12;
    if (['P3', 'P4'].includes(o.priority)) return canApproveP34;
    return false;
  };

  const teams = ['T1', 'T2', 'T3'];

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Ordens de serviço</h3>
        {canCreate && (
          <button type="button" className={styles.btnPrimary} onClick={() => setShowNew(true)}>
            <ClipboardPlus size={18} /> Nova OS
          </button>
        )}
      </div>

      {orders.length === 0 ? (
        <p className={styles.panelEmpty}>Sem ordens abertas.</p>
      ) : (
        <div className={styles.orderGrid}>
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`${styles.orderCard} ${styles[`orderCard--${o.priority || 'P3'}`]}`}
              onClick={() => setDetail(o)}
            >
              <div className={styles.orderCard__header}>
                <span className={styles.orderCard__id}>{o.id}</span>
                {(o.createdBy === 'IA' || String(o.id || '').includes('auto')) && (
                  <span className={styles.orderCard__aiBadge}>
                    <Bot size={12} /> IA
                  </span>
                )}
              </div>
              <div className={styles.orderCard__machine}>{o.machineName || o.machineId || 'Equipamento'}</div>
              <div className={styles.orderCard__meta}>
                <span className={styles.orderCard__priority}>{o.priority || 'P3'}</span>
                <span>{o.type || '—'}</span>
              </div>
              <div className={styles.orderCard__status}>{o.status?.replace(/_/g, ' ') || '—'}</div>
            </button>
          ))}
        </div>
      )}

      {showNew && canCreate && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Nova OS manual</h2>
              <button type="button" className={styles.modalClose} onClick={() => setShowNew(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>ID / código máquina</label>
                <input
                  className={styles.modalInput}
                  value={draft.machineId}
                  onChange={(e) => setDraft((d) => ({ ...d, machineId: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Nome equipamento</label>
                <input
                  className={styles.modalInput}
                  value={draft.machineName}
                  onChange={(e) => setDraft((d) => ({ ...d, machineName: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Prioridade</label>
                <select
                  className={styles.modalInput}
                  value={draft.priority}
                  onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
                >
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                  <option value="P4">P4</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Tipo</label>
                <input
                  className={styles.modalInput}
                  value={draft.type}
                  onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setShowNew(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={async () => {
                  await onCreateOrder?.({
                    machineId: draft.machineId,
                    machineName: draft.machineName,
                    priority: draft.priority,
                    type: draft.type,
                    status: ['P1', 'P2'].includes(draft.priority) ? 'pending_approval' : 'open'
                  });
                  setShowNew(false);
                }}
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{detail.id}</h2>
              <button type="button" className={styles.modalClose} onClick={() => setDetail(null)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {(detail.createdBy === 'IA' || String(detail.type || '').toLowerCase().includes('urgente')) && (
                <div className={styles.aiBadge}>
                  <Bot size={16} /> Gerada ou sugerida pela IA
                </div>
              )}
              <div className={styles.orderDetail}>
                <p>
                  <strong>Equipamento:</strong> {detail.machineName || detail.machineId}
                </p>
                <p>
                  <strong>Prioridade:</strong> {detail.priority} · <strong>Status:</strong> {detail.status}
                </p>
                <p>
                  <strong>Tipo:</strong> {detail.type}
                </p>
              </div>
              {canReassign && onReassign && detail.status === 'open' && (
                <div className={styles.formGroup}>
                  <label>Reatribuir equipe</label>
                  <select
                    className={styles.modalInput}
                    defaultValue={detail.teamId || 'T1'}
                    onChange={(e) => onReassign(detail.id, e.target.value)}
                  >
                    {teams.map((t) => (
                      <option key={t} value={t}>
                        Equipe {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              {canApproveOrder(detail) && (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={async () => {
                    await onApprove?.(detail.id);
                    setDetail(null);
                  }}
                >
                  <UserCheck size={18} /> Aprovar (1 clique)
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
