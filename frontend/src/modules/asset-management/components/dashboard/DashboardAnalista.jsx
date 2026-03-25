import React from 'react';
import { Package, BarChart3, Calendar } from 'lucide-react';
import KpiCard from '../shared/KpiCard';
import AiInsightBanner from '../shared/AiInsightBanner';
import ProfileBadge from '../shared/ProfileBadge';
import StockPanel from '../stock/StockPanel';
import OrdersPanel from '../orders/OrdersPanel';
import TwinsPanel from '../twins/TwinsPanel';
import { calculateReorderPoint } from '../../utils/stockOptimizer';
import { can } from '../../utils/permissions';
import styles from '../../styles/AssetManagement.module.css';

export default function DashboardAnalista({
  profile,
  user,
  data,
  onCreatePurchaseOrder,
  onCreateOrder,
  onSimulateTwin,
  onAdjustStock,
  onNavigateToMachine
}) {
  const { stock = [], orders = [], twins = [], insights = [] } = data || {};
  const lowStock = stock.filter((s) => {
    const opt = calculateReorderPoint(s, twins);
    return (s.qty ?? 0) <= opt.reorderPoint;
  }).length;

  return (
    <div className={styles.dashboard}>
      <header className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.dashboardTitle}>Gestão de Ativos</h1>
          <p className={styles.dashboardSubtitle}>
            Visão PCM — {user?.name || 'Analista'}
            <ProfileBadge profile={profile} />
          </p>
        </div>
      </header>

      <section className={styles.kpiGrid}>
        <KpiCard title="Itens em estoque" value={stock.length} icon={Package} />
        <KpiCard title="Itens no ou abaixo do ponto (IA)" value={lowStock} icon={Package} />
        <KpiCard title="MTBF médio (h)" value="1.240" icon={BarChart3} />
        <KpiCard title="MTTR médio (h)" value="4,2" icon={BarChart3} />
      </section>

      {can(profile, 'twinsViewFull') && (
        <TwinsPanel
          twins={twins}
          profile={profile}
          variant="full"
          onSimulate={onSimulateTwin}
          onNavigateToMachine={onNavigateToMachine}
        />
      )}

      {can(profile, 'stockView') && (
        <StockPanel
          stock={stock}
          twins={twins}
          profile={profile}
          onCreatePurchaseOrder={onCreatePurchaseOrder}
          onAdjustReorder={onAdjustStock}
        />
      )}

      <section className={styles.dashboardSection}>
        <h2>
          <Calendar size={20} /> Planejamento de manutenção
        </h2>
        <p className={styles.dashboardHint}>Calendário de preventivas com janela sugerida pelos gêmeos — integração ao módulo de PCM prevista na próxima iteração.</p>
      </section>

      {can(profile, 'ordersViewAll') && (
        <OrdersPanel orders={orders} profile={profile} onCreateOrder={onCreateOrder} />
      )}

      {can(profile, 'insightsView') && insights.length > 0 && (
        <section className={styles.dashboardSection}>
          <h2>Insights</h2>
          <div className={styles.insightsList}>
            {insights.slice(0, 6).map((i, idx) => (
              <AiInsightBanner key={idx} type={i.type} title={i.title} description={i.description} estimatedValue={i.estimatedValue} />
            ))}
          </div>
        </section>
      )}

      {can(profile, 'reportsTechnical') && (
        <section className={styles.dashboardSection}>
          <h2>Relatórios PCM</h2>
          <p className={styles.dashboardHint}>Exportação PDF técnico (MTBF/MTTR, estoque, falhas) em desenvolvimento.</p>
        </section>
      )}
    </div>
  );
}
