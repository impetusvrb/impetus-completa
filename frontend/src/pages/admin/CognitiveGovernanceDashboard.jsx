/**
 * Governança cognitiva — observabilidade centralizada (só leitura).
 * Requer IMPETUS_COGNITIVE_DASHBOARD_ENABLED=true no backend.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { adminCognitiveGovernance } from '../../services/api';
import { Activity, Brain, Shield, Cpu, History, Flag, Scale, Target } from 'lucide-react';
import './CognitiveGovernanceDashboard.css';

function levelClass(level) {
  if (level === 'critical') return 'cgov-severity cgov-severity--critical';
  if (level === 'warning') return 'cgov-severity cgov-severity--warning';
  return 'cgov-severity cgov-severity--healthy';
}

function Card({ title, icon: Icon, children, severity }) {
  return (
    <div className="impetus-card cgov-card">
      <div className="cgov-card__head">
        {Icon ? <Icon className="cgov-card__icon" size={20} aria-hidden /> : null}
        <h2 className="cgov-card__title">{title}</h2>
        {severity ? <span className={levelClass(severity)}>{severity}</span> : null}
      </div>
      <div className="cgov-card__body">{children}</div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="cgov-metric">
      <span className="cgov-metric__label">{label}</span>
      <span className="cgov-metric__value">{value ?? '—'}</span>
    </div>
  );
}

export default function CognitiveGovernanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await adminCognitiveGovernance.getDashboard();
      if (!data?.ok) {
        setError(data?.error || 'Resposta inválida');
        setDashboard(null);
        return;
      }
      setDashboard(data.dashboard || null);
    } catch (e) {
      const code = e.response?.data?.code;
      if (e.response?.status === 403 && code === 'DASHBOARD_DISABLED') {
        setError('disabled');
        setDashboard(null);
        return;
      }
      setError(e.response?.data?.error || e.message || 'Falha ao carregar');
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Layout>
        <div className="cgov-page">
          <header className="screen-header">
            <h1 className="screen-header__title">GOVERNANÇA COGNITIVA</h1>
            <p className="screen-header__subtitle">A carregar…</p>
          </header>
        </div>
      </Layout>
    );
  }

  if (error === 'disabled') {
    return (
      <Layout>
        <div className="cgov-page">
          <header className="screen-header">
            <h1 className="screen-header__title">GOVERNANÇA COGNITIVA</h1>
            <p className="screen-header__subtitle">
              Painel desactivado no servidor. Defina{' '}
              <code className="cgov-code">IMPETUS_COGNITIVE_DASHBOARD_ENABLED=true</code> e reinicie o backend.
            </p>
          </header>
        </div>
      </Layout>
    );
  }

  if (error || !dashboard) {
    return (
      <Layout>
        <div className="cgov-page">
          <header className="screen-header">
            <h1 className="screen-header__title">GOVERNANÇA COGNITIVA</h1>
            <p className="screen-header__subtitle cgov-error">{error || 'Sem dados'}</p>
          </header>
        </div>
      </Layout>
    );
  }

  const { health, consensus, calibration, memory, drift, autonomy, strategies, replay, runtime } = dashboard;
  const healthLevel = health?.level || 'healthy';
  const consensusLevel = consensus?.engine_enabled ? consensus?.level || 'healthy' : 'healthy';
  const calibrationLevel = calibration?.engine_enabled ? calibration?.level || 'healthy' : 'healthy';

  return (
    <Layout>
      <div className="cgov-page">
        <header className="screen-header">
          <h1 className="screen-header__title">GOVERNANÇA COGNITIVA</h1>
          <p className="screen-header__subtitle">
            Observabilidade e auditoria — sem controlo operacional da IA. Estado global:{' '}
            <span className={levelClass(healthLevel)}>{healthLevel}</span>
          </p>
        </header>

        <div className="cgov-grid">
          <Card title="Saúde cognitiva" icon={Activity} severity={healthLevel}>
            <Metric label="Confiança média (%)" value={health?.average_confidence} />
            <Metric label="Taxa baixa confiança" value={health?.low_confidence_rate?.toFixed?.(3)} />
            <Metric label="Alertas drift (30d)" value={health?.drift_alerts} />
            <Metric label="Ajustes autónomos (event store)" value={health?.autonomous_adjustments} />
            <Metric label="Propostas activas" value={health?.active_proposals} />
          </Card>

          <Card title="Saúde de consenso" icon={Scale} severity={consensus?.engine_enabled ? consensusLevel : undefined}>
            <Metric label="Engine activo" value={consensus?.engine_enabled ? 'sim' : 'não'} />
            <Metric
              label="Score de consenso (último)"
              value={consensus?.consensus_score != null ? consensus.consensus_score : '—'}
            />
            <Metric label="Eventos com divergência (30d)" value={consensus?.divergence_events ?? '—'} />
            <Metric label="Última divergência" value={consensus?.last_divergence_at || '—'} />
          </Card>

          <Card
            title="Calibração de confiança"
            icon={Target}
            severity={calibration?.engine_enabled ? calibrationLevel : undefined}
          >
            <Metric label="Engine activo" value={calibration?.engine_enabled ? 'sim' : 'não'} />
            <Metric
              label="Confiança média calibrada (30d)"
              value={
                calibration?.average_calibrated_confidence != null
                  ? calibration.average_calibrated_confidence
                  : '—'
              }
            />
            <Metric label="Eventos overconfidence (30d)" value={calibration?.overconfidence_events ?? '—'} />
            <Metric label="Eventos underconfidence (30d)" value={calibration?.underconfidence_events ?? '—'} />
          </Card>

          <Card title="Drift" icon={Flag} severity={health?.drift_alerts > 10 ? 'critical' : health?.drift_alerts > 3 ? 'warning' : 'healthy'}>
            <Metric label="Eventos recentes (30d)" value={drift?.recent_drift_events} />
            <Metric label="Alta severidade" value={drift?.high_severity} />
            <Metric label="Último drift" value={drift?.last_drift_at || '—'} />
          </Card>

          <Card title="Memória" icon={Brain}>
            <Metric label="Interacções (snapshot)" value={memory?.interactions} />
            <Metric label="Propostas" value={memory?.proposals} />
            <Metric label="Eventos autónomos (JSON)" value={memory?.autonomous_events} />
            <Metric label="Persistência ficheiro" value={memory?.persisted_to_disk ? 'sim' : 'não'} />
          </Card>

          <Card title="Estratégias" icon={Shield}>
            <Metric label="Aprovadas" value={strategies?.approved} />
            <Metric label="Pendentes" value={strategies?.pending} />
            <div className="cgov-metric cgov-metric--block">
              <span className="cgov-metric__label">Activas</span>
              <span className="cgov-metric__value cgov-mono">
                {(strategies?.active || []).length ? strategies.active.join(', ') : '—'}
              </span>
            </div>
          </Card>

          <Card title="Autonomia (leitura)" icon={Cpu}>
            <Metric label="Activada" value={autonomy?.enabled ? 'sim' : 'não'} />
            <Metric label="confidence_factor" value={autonomy?.confidence_factor} />
            <Metric label="Rollbacks (sessão)" value={autonomy?.rollback_count} />
            <Metric label="Último ajuste" value={autonomy?.last_adjustment_at || '—'} />
          </Card>

          <Card title="Replay" icon={History}>
            <Metric label="Disponível" value={replay?.enabled ? 'sim' : 'não'} />
            <Metric label="Interacções indexadas (tenant)" value={replay?.available_interactions} />
          </Card>

          <Card title="Runtime (flags)" icon={Shield}>
            <Metric label="Detecção drift" value={runtime?.drift_detection ? 'sim' : 'não'} />
            <Metric label="Replay" value={runtime?.replay ? 'sim' : 'não'} />
            <Metric label="Autonomia" value={runtime?.autonomy ? 'sim' : 'não'} />
            <Metric label="Consenso cognitivo" value={runtime?.consensus_engine ? 'sim' : 'não'} />
            <Metric label="Calibração de confiança" value={runtime?.calibration_engine ? 'sim' : 'não'} />
            <Metric label="Aprendizagem estratégica" value={runtime?.strategic_learning ? 'sim' : 'não'} />
          </Card>
        </div>
      </div>
    </Layout>
  );
}
