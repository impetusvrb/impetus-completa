import React from 'react';
import { TrendingUp, Shield, DollarSign, AlertTriangle } from 'lucide-react';
import KpiCard from '../shared/KpiCard';
import AiInsightBanner from '../shared/AiInsightBanner';
import ProfileBadge from '../shared/ProfileBadge';
import TwinsPanel from '../twins/TwinsPanel';
import { formatCurrency } from '../../utils/formatters';
import { can } from '../../utils/permissions';
import styles from '../../styles/AssetManagement.module.css';

export default function DashboardGerente({ profile, user, data }) {
  const { twins = [], orders = [], insights = [] } = data || {};
  const pendingP1P2 = orders.filter((o) => ['P1', 'P2'].includes(o.priority) && o.status === 'pending_approval').length;

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

      {can(profile, 'twinsView') && <TwinsPanel twins={twins} profile={profile} />}

      {can(profile, 'ordersApproveP1P2') && pendingP1P2 > 0 && (
        <section className={styles.dashboardSection}>
          <h2><AlertTriangle size={20} /> Aprovação de OS P1/P2</h2>
          <p className={styles.dashboardHint}>{pendingP1P2} ordem(ns) aguardando aprovação.</p>
        </section>
      )}

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
