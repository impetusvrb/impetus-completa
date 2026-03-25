/**
 * IMPETUS - Gestão de Ativos e Otimização
 * Orquestra dashboards por perfil — usuário da sessão Impetus (localStorage)
 */
import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { detectProfile } from './utils/detectProfile';
import { useAssetData } from './hooks/useAssetData';
import { useAiInsights } from './hooks/useAiInsights';
import UnauthorizedView from './components/shared/UnauthorizedView';
import DashboardGerente from './components/dashboard/DashboardGerente';
import DashboardSupervisor from './components/dashboard/DashboardSupervisor';
import DashboardAnalista from './components/dashboard/DashboardAnalista';
import { assetApi } from './services/assetApi';
import styles from './styles/AssetManagement.module.css';

function readStoredUser() {
  try {
    const raw = localStorage.getItem('impetus_user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function AssetManagementModule({ departmentId: departmentIdProp, onNavigateToMachine }) {
  const [user, setUser] = useState(readStoredUser);

  useEffect(() => {
    const sync = () => setUser(readStoredUser());
    window.addEventListener('focus', sync);
    const onStorage = (e) => {
      if (e.key === 'impetus_user') sync();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const profile = useMemo(() => detectProfile(user), [user]);
  const departmentId = departmentIdProp ?? user?.department_id ?? undefined;

  const { twins, orders, stock, loading, error, reload } = useAssetData(departmentId);
  const { insights, fetchInsights } = useAiInsights(profile);

  useEffect(() => {
    if (profile && profile !== 'unauthorized') {
      fetchInsights({ twins, orders, stock });
    }
  }, [profile, twins, orders, stock, fetchInsights]);

  const data = useMemo(() => ({ twins, orders, stock, insights }), [twins, orders, stock, insights]);

  const handleSimulate = useCallback(
    async (twinId) => {
      await assetApi.simulateFailure(twinId);
      reload();
    },
    [reload]
  );

  const handleApproveOrder = useCallback(
    async (orderId) => {
      await assetApi.approveOrder(orderId);
      reload();
    },
    [reload]
  );

  const handleCreateOrder = useCallback(
    async (payload) => {
      await assetApi.createOrder(payload);
      reload();
    },
    [reload]
  );

  const handleCreatePurchaseOrder = useCallback(
    async (payload) => {
      await assetApi.createPurchaseOrder(payload);
      reload();
    },
    [reload]
  );

  const handleReassignOrder = useCallback(
    async (orderId, teamId) => {
      await assetApi.reassignOrder(orderId, teamId);
      reload();
    },
    [reload]
  );

  const handleAdjustStock = useCallback(
    async (item) => {
      const next = window.prompt('Novo ponto de pedido', String(item.reorderPoint ?? ''));
      if (next == null) return;
      const n = parseInt(next, 10);
      if (Number.isNaN(n)) return;
      await assetApi.updateReorderPoint(item.id, { reorder_point: n });
      reload();
    },
    [reload]
  );

  if (profile === 'unauthorized') {
    return (
      <div className={styles.module}>
        <UnauthorizedView />
      </div>
    );
  }

  const Dashboard = {
    gerente: DashboardGerente,
    supervisor: DashboardSupervisor,
    analista_pcm: DashboardAnalista
  }[profile];

  if (!Dashboard) {
    return (
      <div className={styles.module}>
        <UnauthorizedView />
      </div>
    );
  }

  const extraProps = {
    gerente: {
      onApproveOrder: handleApproveOrder,
      onCreateOrder: handleCreateOrder
    },
    supervisor: {
      onApproveOrder: handleApproveOrder,
      onCreateOrder: handleCreateOrder,
      onSimulateTwin: handleSimulate,
      onReassignOrder: handleReassignOrder,
      onAdjustStock: handleAdjustStock,
      onNavigateToMachine
    },
    analista_pcm: {
      onCreatePurchaseOrder: handleCreatePurchaseOrder,
      onCreateOrder: handleCreateOrder,
      onSimulateTwin: handleSimulate,
      onAdjustStock: handleAdjustStock,
      onNavigateToMachine
    }
  };

  return (
    <div className={styles.module}>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
          Carregando...
        </div>
      ) : (
        <Dashboard
          profile={profile}
          user={user}
          data={data}
          {...extraProps[profile]}
        />
      )}
      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 8,
            background: 'rgba(239,68,68,0.1)',
            borderRadius: 4,
            fontSize: '0.85rem',
            color: '#f87171'
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
