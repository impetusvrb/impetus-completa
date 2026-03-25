import React from 'react';
import { AlertTriangle, ClipboardList, Users } from 'lucide-react';
import KpiCard from '../shared/KpiCard';
import AiInsightBanner from '../shared/AiInsightBanner';
import ProfileBadge from '../shared/ProfileBadge';
import TwinsPanel from '../twins/TwinsPanel';
import OrdersPanel from '../orders/OrdersPanel';
import StockPanel from '../stock/StockPanel';
import { can } from '../../utils/permissions';
import styles from '../../styles/AssetManagement.module.css';

export default function DashboardSupervisor({
  profile,
  user,
  data,
  onApproveOrder,
  onCreateOrder,
  onSimulateTwin,
  onReassignOrder,
  onAdjustStock,
  onNavigateToMachine
}) {
  const { twins = [], orders = [], stock = [], insights = [] } = data || {};
  const alerts = twins.filter((t) => t.status === 'critical' || t.status === 'warn');

  return (
    <div className={styles.dashboard}>
      <header className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.dashboardTitle}>Gestão de Ativos</h1>
          <p className={styles.dashboardSubtitle}>
            Visão operacional — {user?.name || 'Supervisor'}
            <ProfileBadge profile={profile} />
          </p>
        </div>
      </header>

      <section className={styles.dashboardSection}>
        <h2>
          <AlertTriangle size={20} /> Alertas ativos do turno
        </h2>
        {alerts.length === 0 ? (
          <p className={styles.dashboardEmpty}>Nenhum alerta no momento.</p>
        ) : (
          <ul className={styles.alertList}>
            {alerts.slice(0, 8).map((t) => (
              <li key={t.id || t.machineId} className={`${styles.alertItem} ${styles[`alertItem--${t.status}`]}`}>
                <strong>{t.name}</strong>
                <span>{t.prediction?.aiMessage || t.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.kpiGrid}>
        <KpiCard title="OS abertas" value={orders.length} icon={ClipboardList} />
        <KpiCard title="Alertas ativos" value={alerts.length} icon={AlertTriangle} />
        <KpiCard title="Equipes em campo" value="3" subtitle="2 em OS" icon={Users} />
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

      {can(profile, 'stockView') && <StockPanel stock={stock} twins={twins} profile={profile} onAdjustReorder={onAdjustStock} />}

      {can(profile, 'ordersViewAll') && (
        <OrdersPanel
          orders={orders}
          profile={profile}
          onApprove={onApproveOrder}
          onCreateOrder={onCreateOrder}
          onReassign={onReassignOrder}
        />
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

      {can(profile, 'reportsTechnical') && (
        <section className={styles.dashboardSection}>
          <h2>Relatórios técnicos</h2>
          <p className={styles.dashboardHint}>Relatórios de turno e falhas: exportação em desenvolvimento.</p>
        </section>
      )}
    </div>
  );
}
