/**
 * IMPETUS - Gestão de Ativos e Otimização
 * Orquestra dashboards por perfil — consome usuário do localStorage
 */
import React, { useMemo, useEffect } from 'react';
import { detectProfile } from './utils/detectProfile';
import { useAssetData } from './hooks/useAssetData';
import { useAiInsights } from './hooks/useAiInsights';
import UnauthorizedView from './components/shared/UnauthorizedView';
import DashboardGerente from './components/dashboard/DashboardGerente';
import DashboardSupervisor from './components/dashboard/DashboardSupervisor';
import DashboardAnalista from './components/dashboard/DashboardAnalista';
import { assetApi } from './services/assetApi';
import styles from './styles/AssetManagement.module.css';

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('impetus_user') || '{}');
  } catch {
    return null;
  }
}

export default function AssetManagementModule({
  departmentId,
  onNavigateToMachine,
  onGenerateOS
}) {
  const user = useMemo(() => getCurrentUser(), []);
  const profile = useMemo(() => detectProfile(user), [user]);

  const { twins, orders, stock, loading, error, reload } = useAssetData(departmentId);
  const { insights, fetchInsights } = useAiInsights(profile);

  useEffect(() => {
    if (profile && profile !== 'unauthorized') {
      fetchInsights({ twins, orders, stock });
    }
  }, [profile, twins?.length, orders?.length, stock?.length]);

  const data = useMemo(() => ({ twins, orders, stock, insights }), [twins, orders, stock, insights]);

  const handleSimulate = async (twinId) => {
    await assetApi.simulateFailure(twinId);
    reload();
  };

  const handleApproveOrder = async (orderId) => {
    await assetApi.approveOrder(orderId);
    reload();
  };

  const handleCreateOrder = async (payload) => {
    await assetApi.createOrder(payload);
    reload();
  };

  const handleCreatePurchaseOrder = async (payload) => {
    await assetApi.createPurchaseOrder(payload);
    reload();
  };

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
    gerente: {},
    supervisor: { onApproveOrder: handleApproveOrder, onCreateOrder: handleCreateOrder },
    analista_pcm: { onCreatePurchaseOrder: handleCreatePurchaseOrder }
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
        <div style={{ marginTop: 12, padding: 8, background: 'rgba(239,68,68,0.1)', borderRadius: 4, fontSize: '0.85rem', color: '#f87171' }}>
          {error}
        </div>
      )}
    </div>
  );
}
