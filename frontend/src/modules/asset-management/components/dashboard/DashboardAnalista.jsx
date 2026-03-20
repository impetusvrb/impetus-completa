import React from 'react';
import { Package, BarChart3, Calendar } from 'lucide-react';
import KpiCard from '../shared/KpiCard';
import AiInsightBanner from '../shared/AiInsightBanner';
import ProfileBadge from '../shared/ProfileBadge';
import StockPanel from '../stock/StockPanel';
import OrdersPanel from '../orders/OrdersPanel';
import { can } from '../../utils/permissions';
import styles from '../../styles/AssetManagement.module.css';

export default function DashboardAnalista({ profile, user, data, onCreatePurchaseOrder, onCreateOrder }) {
  const { stock = [], orders = [], insights = [] } = data || {};
  const lowStock = stock.filter((s) => (s.qty ?? 0) <= (s.reorderPoint ?? 0)).length;

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
        <KpiCard title="Itens abaixo do ponto" value={lowStock} icon={Package} />
        <KpiCard title="MTBF médio (h)" value="1.240" icon={BarChart3} />
        <KpiCard title="MTTR médio (h)" value="4,2" icon={BarChart3} />
      </section>

      {can(profile, 'stockView') && <StockPanel stock={stock} profile={profile} onCreatePurchaseOrder={onCreatePurchaseOrder} />}

      <section className={styles.dashboardSection}>
        <h2><Calendar size={20} /> Planejamento de manutenção</h2>
        <p className={styles.dashboardHint}>Calendário de preventivas com sugestão de janela pela IA.</p>
      </section>

      {can(profile, 'ordersViewAll') && <OrdersPanel orders={orders} profile={profile} />}

      {insights.length > 0 && (
        <section className={styles.dashboardSection}>
          <h2>Insights da IA</h2>
          <div className={styles.insightsList}>
            {insights.slice(0, 4).map((i, idx) => (
              <AiInsightBanner key={idx} type={i.type} title={i.title} description={i.description} estimatedValue={i.estimatedValue} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
