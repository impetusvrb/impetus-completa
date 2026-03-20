import React from 'react';
import { AlertTriangle, ClipboardList, Users } from 'lucide-react';
import KpiCard from '../shared/KpiCard';
import AiInsightBanner from '../shared/AiInsightBanner';
import ProfileBadge from '../shared/ProfileBadge';
import TwinsPanel from '../twins/TwinsPanel';
import OrdersPanel from '../orders/OrdersPanel';
import { can } from '../../utils/permissions';
import styles from '../../styles/AssetManagement.module.css';

export default function DashboardSupervisor({ profile, user, data, onApproveOrder, onCreateOrder }) {
  const { twins = [], orders = [], insights = [] } = data || {};
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
        <h2><AlertTriangle size={20} /> Alertas ativos do turno</h2>
        {alerts.length === 0 ? (
          <p className={styles.dashboardEmpty}>Nenhum alerta no momento.</p>
        ) : (
          <ul className={styles.alertList}>
            {alerts.slice(0, 5).map((t) => (
              <li key={t.id} className={`${styles.alertItem} ${styles[`alertItem--${t.status}`]}`}>
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

      {can(profile, 'twinsView') && <TwinsPanel twins={twins} profile={profile} />}
      {can(profile, 'ordersViewAll') && <OrdersPanel orders={orders} profile={profile} onApprove={onApproveOrder} onCreateOrder={onCreateOrder} />}

      {insights.length > 0 && (
        <section className={styles.dashboardSection}>
          <h2>Insights da IA</h2>
          <div className={styles.insightsList}>
            {insights.slice(0, 3).map((i, idx) => (
              <AiInsightBanner key={idx} type={i.type} title={i.title} description={i.description} estimatedValue={i.estimatedValue} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
