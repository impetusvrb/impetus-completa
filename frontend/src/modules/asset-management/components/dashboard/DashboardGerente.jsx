import React from 'react';
import { TrendingUp, Shield, DollarSign, AlertTriangle } from 'lucide-react';
import KpiCard from '../shared/KpiCard';
import AiInsightBanner from '../shared/AiInsightBanner';
import ProfileBadge from '../shared/ProfileBadge';
import TwinsPanel from '../twins/TwinsPanel';
import OrdersPanel from '../orders/OrdersPanel';
import { formatCurrency } from '../../utils/formatters';
import { can } from '../../utils/permissions';
import styles from '../../styles/AssetManagement.module.css';

export default function DashboardGerente({ profile, user, data, onApproveOrder }) {
  const { twins = [], orders = [], stock = [], insights = [] } = data || {};
  const pendingP1P2 = orders.filter((o) => ['P1', 'P2'].includes(o.priority) && o.status === 'pending_approval').length;
  const lowStock = stock.filter((s) => (s.qty ?? 0) <= (s.reorderPoint ?? 0)).length;

  return (
    <div className={styles.dashboard}>
      <header className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.dashboardTitle}>Gestão de Ativos</h1>
          <p className={styles.dashboardSubtitle}>
            Visão estratégica — {user?.name || 'Gerente'}
            <ProfileBadge profile={profile} />
          </p>
        </div>
      </header>

      <section className={styles.kpiGrid}>
        <KpiCard title="OEE médio da planta" value="78,2%" subtitle="Meta: 80%" trend={2.1} icon={TrendingUp} />
        <KpiCard title="Economia preditiva (mês)" value={formatCurrency(12500)} subtitle="vs. reativa" icon={DollarSign} />
        <KpiCard title="Paradas evitadas" value="12" subtitle="Últimos 30 dias" icon={Shield} />
        <KpiCard title="Custo vs. orçado" value="94%" subtitle="Dentro do orçamento" icon={DollarSign} />
      </section>

      <section className={styles.dashboardSection}>
        <h2>Status dos gêmeos digitais</h2>
        <div className={styles.twinSemaphore}>
          <span className={styles.twinSemaphore__ok}>{twins.filter((t) => t.status === 'ok').length} OK</span>
          <span className={styles.twinSemaphore__warn}>{twins.filter((t) => t.status === 'warn').length} Alerta</span>
          <span className={styles.twinSemaphore__crit}>{twins.filter((t) => t.status === 'critical').length} Crítico</span>
        </div>
      </section>

      {can(profile, 'stockViewSummary') && stock.length > 0 && (
        <section className={styles.dashboardSection}>
          <h2>Resumo de estoque</h2>
          <p className={styles.dashboardHint}>
            {stock.length} SKU(s) monitorados · {lowStock} abaixo do ponto de pedido cadastrado (detalhe apenas para PCM/supervisão).
          </p>
        </section>
      )}

      {can(profile, 'twinsViewSummary') && (
        <TwinsPanel twins={twins} profile={profile} variant="summary" />
      )}

      {can(profile, 'ordersViewAll') && (
        <OrdersPanel orders={orders} profile={profile} onApprove={onApproveOrder} />
      )}

      {can(profile, 'ordersApproveP1P2') && pendingP1P2 > 0 && (
        <section className={styles.dashboardSection}>
          <h2>
            <AlertTriangle size={20} /> Aprovação rápida P1/P2
          </h2>
          <p className={styles.dashboardHint}>{pendingP1P2} ordem(ns) aguardando aprovação gerencial. Use os cards acima ou abra a OS para aprovar em um clique.</p>
        </section>
      )}

      {can(profile, 'insightsView') && insights.length > 0 && (
        <section className={styles.dashboardSection}>
          <h2>Insights</h2>
          <div className={styles.insightsList}>
            {insights.slice(0, 5).map((i, idx) => (
              <AiInsightBanner key={idx} type={i.type} title={i.title} description={i.description} estimatedValue={i.estimatedValue} />
            ))}
          </div>
        </section>
      )}

      {can(profile, 'reportsManagerial') && (
        <section className={styles.dashboardSection}>
          <h2>Relatórios gerenciais</h2>
          <p className={styles.dashboardHint}>Exportação PDF consolidado será ligada ao BI corporativo quando disponível.</p>
        </section>
      )}
    </div>
  );
}
