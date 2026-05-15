/**
 * Governança cognitiva — observabilidade centralizada (só leitura).
 * Requer IMPETUS_COGNITIVE_DASHBOARD_ENABLED=true no backend.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { adminCognitiveGovernance } from '../../services/api';
import {
  Activity,
  Brain,
  Shield,
  Cpu,
  History,
  Flag,
  Scale,
  Target,
  Gauge,
  AlertTriangle,
  Vote,
  Layers,
  Fingerprint,
  ListTree,
  FileSearch,
  ScrollText,
  Radio,
  LayoutDashboard,
  GitMerge,
  ListChecks,
  Network,
  ShieldCheck,
  FlaskConical,
  GitCompare,
  FileDiff,
  TrendingUp
} from 'lucide-react';
import './CognitiveGovernanceDashboard.css';

function levelClass(level) {
  if (level === 'critical') return 'cgov-severity cgov-severity--critical';
  if (level === 'warning') return 'cgov-severity cgov-severity--warning';
  if (level === 'stable') return 'cgov-severity cgov-severity--stable';
  return 'cgov-severity cgov-severity--healthy';
}

function Card({ title, icon: Icon, children, severity, className = '' }) {
  return (
    <div className={`impetus-card cgov-card ${className}`.trim()}>
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

  const {
    health,
    csi,
    safety,
    voting,
    consensus,
    calibration,
    memory,
    drift,
    autonomy,
    strategies,
    replay,
    runtime,
    unified_orchestration: unifiedOrch,
    context_integrity: contextIntegrity,
    event_backbone: eventBackbone,
    operational_hardening: operationalHardening,
    policy_discovery: policyDiscovery,
    policy_contract: policyContract,
    policy_signals: policySignals,
    policy_facade: policyFacade,
    policy_arbitration: policyArbitration,
    policy_obligations: policyObligations,
    policy_governance_graph: policyGovernanceGraph,
    policy_execution_readiness: policyExecutionReadiness,
    policy_simulation: policySimulation,
    policy_sandbox: policySandbox,
    policy_governance_diff: policyGovernanceDiff,
    policy_governance_evolution: policyGovernanceEvolution
  } = dashboard;
  const healthLevel = health?.level || 'healthy';
  const consensusLevel = consensus?.engine_enabled ? consensus?.level || 'healthy' : 'healthy';
  const calibrationLevel = calibration?.engine_enabled ? calibration?.level || 'healthy' : 'healthy';
  const csiSeverity = csi?.unavailable ? undefined : csi?.status || 'stable';
  const safetySeverity =
    !safety?.engine_enabled || !safety?.risk_level
      ? undefined
      : safety.risk_level === 'critical'
        ? 'critical'
        : safety.risk_level === 'warning'
          ? 'warning'
          : 'healthy';

  const queue = operationalHardening?.event_queue_health || {};
  const bypass = operationalHardening?.secure_context_bypass || {};
  const legacyRuntime = operationalHardening?.legacy_runtime || {};
  const integrityReadiness = operationalHardening?.integrity_rollout_readiness || {};
  const operationalHardeningSeverity =
    queue?.backpressure_active || (queue?.dropped_events ?? 0) > 0
      ? 'critical'
      : legacyRuntime?.legacy_block_mode_ready === false || integrityReadiness?.block_mode_ready === false
        ? 'warning'
        : 'healthy';

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
          <Card
            title="Unified Orchestration"
            icon={Layers}
            severity={
              unifiedOrch?.enabled && !unifiedOrch?.gateway_enforced ? 'warning' : undefined
            }
          >
            <Metric label="Camada activa" value={unifiedOrch?.enabled ? 'sim' : 'não'} />
            <Metric
              label="Caminhos legados detectados (processo)"
              value={unifiedOrch?.legacy_paths_detected ?? '—'}
            />
            <Metric label="Canais de runtime suportados" value={unifiedOrch?.runtime_channels ?? '—'} />
            <Metric label="Gateway IA aplicado" value={unifiedOrch?.gateway_enforced ? 'sim' : 'não'} />
          </Card>

          <Card
            title="Policy Discovery"
            icon={FileSearch}
            severity={!policyDiscovery || policyDiscovery.enabled === false ? 'warning' : undefined}
          >
            {!policyDiscovery || policyDiscovery.enabled === false ? (
              <>
                <Metric label="Estado" value="desactivado" />
                <p className="cgov-policy-discovery__hint">
                  Defina{' '}
                  <code className="cgov-code">IMPETUS_POLICY_DISCOVERY_ENABLED=true</code> no backend para o
                  inventário normativo e o endpoint{' '}
                  <code className="cgov-code">/api/admin/learning/policy-discovery</code> (admin).
                </p>
              </>
            ) : (
              <>
                <Metric label="Fontes normativas (módulos)" value={policyDiscovery?.policy_sources_count ?? '—'} />
                <Metric label="Tipos de executor" value={policyDiscovery?.policy_executors_count ?? '—'} />
                <Metric label="Sobreposições (overlap)" value={policyDiscovery?.overlap_count ?? '—'} />
                <Metric label="Shadow policies (catálogo)" value={policyDiscovery?.shadow_policy_count ?? '—'} />
                <Metric label="Env governance (chaves)" value={policyDiscovery?.env_governance_count ?? '—'} />
                <Metric label="Regras de capability" value={policyDiscovery?.capability_count ?? '—'} />
                <Metric
                  label="Gerado em"
                  value={
                    policyDiscovery?.generated_at
                      ? new Date(policyDiscovery.generated_at).toLocaleString('pt-PT')
                      : '—'
                  }
                />
              </>
            )}
          </Card>

          <Card
            title="Policy Decision Contract"
            icon={ScrollText}
            severity={
              !policyContract || policyContract.enabled === false
                ? 'warning'
                : policyContract.contract_status === 'invalid'
                  ? 'critical'
                  : policyContract.contract_status === 'schema_drift'
                    ? 'warning'
                    : undefined
            }
          >
            {!policyContract || policyContract.enabled === false ? (
              <>
                <Metric label="Estado" value="desactivado" />
                <p className="cgov-policy-discovery__hint">
                  Defina{' '}
                  <code className="cgov-code">IMPETUS_POLICY_CONTRACT_ENABLED=true</code> no backend para o
                  contrato PDC e o endpoint{' '}
                  <code className="cgov-code">/api/admin/learning/policy-contract</code> (admin).
                </p>
              </>
            ) : (
              <>
                <Metric label="Schema (versão)" value={policyContract?.schema_version ?? '—'} />
                <Metric label="Níveis de risco (catálogo)" value={policyContract?.risk_levels?.length ?? '—'} />
                <Metric label="Obrigações (catálogo)" value={policyContract?.obligation_catalog_count ?? '—'} />
                <Metric label="Tipos de trace" value={policyContract?.trace_type_count ?? '—'} />
                <Metric label="Efeitos (catálogo)" value={policyContract?.effect_catalog_count ?? '—'} />
                <Metric label="Estado do contrato" value={policyContract?.contract_status ?? '—'} />
                <Metric
                  label="Amostra validada"
                  value={policyContract?.sample_validation_ok ? 'sim' : 'não'}
                />
              </>
            )}
          </Card>

          <Card
            title="Policy Signal Abstraction"
            icon={Radio}
            severity={!policySignals || policySignals.enabled === false ? 'warning' : undefined}
          >
            {!policySignals || policySignals.enabled === false ? (
              <>
                <Metric label="Estado" value="desactivado" />
                <p className="cgov-policy-discovery__hint">
                  Defina{' '}
                  <code className="cgov-code">IMPETUS_POLICY_SIGNALS_ENABLED=true</code> no backend para a
                  camada PSA e o endpoint{' '}
                  <code className="cgov-code">/api/admin/learning/policy-signals</code> (admin).
                </p>
              </>
            ) : (
              <>
                <Metric label="Categorias (catálogo)" value={policySignals?.category_count ?? '—'} />
                <Metric label="Adapters oficiais" value={policySignals?.adapter_count ?? '—'} />
                <Metric label="Tipos de sinal" value={policySignals?.signal_type_count ?? '—'} />
                <Metric label="Níveis de severidade" value={policySignals?.severity_level_count ?? '—'} />
                <Metric label="Sinais demo (normalizados)" value={policySignals?.demo_signal_count ?? '—'} />
                <Metric label="Válidos (demo)" value={policySignals?.demo_validated_count ?? '—'} />
                <Metric label="Agregado: critical" value={policySignals?.aggregate_summary?.critical ?? '—'} />
                <Metric label="Agregado: warning" value={policySignals?.aggregate_summary?.warning ?? '—'} />
                <div className="cgov-metric cgov-metric--block">
                  <span className="cgov-metric__label">Pré-visualização (0–1)</span>
                  <span className="cgov-metric__value cgov-mono cgov-signal-preview">
                    {(policySignals?.normalized_signals_preview || [])
                      .map((x) => `${x.signal_type}:${x.normalized_value}`)
                      .join(' · ') || '—'}
                  </span>
                </div>
              </>
            )}
          </Card>

          <Card
            title="Policy Facade"
            icon={LayoutDashboard}
            severity={
              !policyFacade || policyFacade.enabled === false
                ? 'warning'
                : policyFacade.risk_level === 'critical'
                  ? 'critical'
                  : policyFacade.risk_level === 'high'
                    ? 'warning'
                    : undefined
            }
          >
            {!policyFacade || policyFacade.enabled === false ? (
              <>
                <Metric label="Estado" value="desactivado" />
                <p className="cgov-policy-discovery__hint">
                  Defina{' '}
                  <code className="cgov-code">IMPETUS_POLICY_FACADE_ENABLED=true</code> no backend para a
                  fachada read-only e o endpoint{' '}
                  <code className="cgov-code">/api/admin/learning/policy-facade</code> (admin).
                </p>
              </>
            ) : (
              <>
                <Metric label="Sinais agregados (demo)" value={policyFacade?.demo_signals_aggregated ?? '—'} />
                <Metric label="Composição de risco" value={policyFacade?.risk_level ?? '—'} />
                <Metric
                  label="Efeitos sugeridos"
                  value={
                    (policyFacade?.suggested_effects || []).length
                      ? policyFacade.suggested_effects.join(', ')
                      : '—'
                  }
                />
                <Metric
                  label="Obrigações sugeridas"
                  value={
                    (policyFacade?.suggested_obligations || []).length
                      ? policyFacade.suggested_obligations.join(', ')
                      : '—'
                  }
                />
                <Metric label="Correlações detectadas" value={policyFacade?.correlations_detected ?? '—'} />
                <Metric label="Validação facade" value={policyFacade?.validation_ok ? 'ok' : 'falhou'} />
                <Metric label="Allow passivo (demo)" value={policyFacade?.passive_allow ? 'sim' : 'não'} />
              </>
            )}
          </Card>

          <Card
            title="Policy Arbitration"
            icon={GitMerge}
            severity={
              !policyArbitration || policyArbitration.enabled === false
                ? 'warning'
                : (policyArbitration.critical_conflicts ?? 0) > 0
                  ? 'critical'
                  : (policyArbitration.conflicts_detected ?? 0) > 0
                    ? 'warning'
                    : undefined
            }
          >
            {!policyArbitration || policyArbitration.enabled === false ? (
              <>
                <Metric label="Estado" value="desactivado" />
                <p className="cgov-policy-discovery__hint">
                  Defina{' '}
                  <code className="cgov-code">IMPETUS_POLICY_ARBITRATION_ENABLED=true</code> no backend para
                  arbitragem read-only e{' '}
                  <code className="cgov-code">/api/admin/learning/policy-arbitration</code> (admin).
                </p>
              </>
            ) : (
              <>
                <Metric label="Conflitos detectados" value={policyArbitration?.conflicts_detected ?? '—'} />
                <Metric label="Críticos" value={policyArbitration?.critical_conflicts ?? '—'} />
                <Metric label="Domínio dominante" value={policyArbitration?.dominant_domain ?? '—'} />
                <Metric label="Prioridade dominante" value={policyArbitration?.dominant_priority ?? '—'} />
                <Metric
                  label="Overrides simulados"
                  value={policyArbitration?.simulated_overrides_count ?? '—'}
                />
                <Metric label="Passos de trace" value={policyArbitration?.arbitration_trace_steps ?? '—'} />
                <Metric label="Validação" value={policyArbitration?.validation_ok ? 'ok' : 'falhou'} />
                <div className="cgov-metric cgov-metric--block">
                  <span className="cgov-metric__label">Hierarquia (topo)</span>
                  <span className="cgov-metric__value cgov-mono cgov-signal-preview">
                    {(policyArbitration?.priority_hierarchy_preview || []).join(' → ') || '—'}
                  </span>
                </div>
              </>
            )}
          </Card>

          <Card
            title="Policy Obligations"
            icon={ListChecks}
            severity={
              !policyObligations || policyObligations.enabled === false
                ? 'warning'
                : (policyObligations.dominant_severity === 'critical')
                  ? 'critical'
                  : (policyObligations.obligation_correlations_count ?? 0) > 2
                    ? 'warning'
                    : undefined
            }
          >
            {!policyObligations || policyObligations.enabled === false ? (
              <>
                <Metric label="Estado" value="desactivado" />
                <p className="cgov-policy-discovery__hint">
                  Defina{' '}
                  <code className="cgov-code">IMPETUS_POLICY_OBLIGATIONS_ENABLED=true</code> no backend para
                  obrigações declarativas e{' '}
                  <code className="cgov-code">/api/admin/learning/policy-obligations</code> (admin).
                </p>
              </>
            ) : (
              <>
                <Metric label="Obrigações declaradas" value={policyObligations?.obligations_declared_count ?? '—'} />
                <Metric label="Obrigação dominante" value={policyObligations?.dominant_obligation_type ?? '—'} />
                <Metric label="Severidade dominante" value={policyObligations?.dominant_severity ?? '—'} />
                <Metric
                  label="Correlações entre obrigações"
                  value={policyObligations?.obligation_correlations_count ?? '—'}
                />
                <Metric label="Governance duties" value={policyObligations?.governance_duties_count ?? '—'} />
                <Metric label="Passos de trace" value={policyObligations?.trace_steps ?? '—'} />
                <Metric label="Validação" value={policyObligations?.validation_ok ? 'ok' : 'falhou'} />
              </>
            )}
          </Card>

          <Card
            title="Policy Governance Graph"
            icon={Network}
            severity={
              !policyGovernanceGraph || policyGovernanceGraph.enabled === false
                ? 'warning'
                : (policyGovernanceGraph.pattern_count ?? 0) > 2
                  ? 'warning'
                  : undefined
            }
          >
            {!policyGovernanceGraph || policyGovernanceGraph.enabled === false ? (
              <>
                <Metric label="Estado" value="desactivado" />
                <p className="cgov-policy-discovery__hint">
                  Defina{' '}
                  <code className="cgov-code">IMPETUS_POLICY_GRAPH_ENABLED=true</code> no backend para o grafo
                  normativo observável e{' '}
                  <code className="cgov-code">/api/admin/learning/policy-graph</code> (admin).
                </p>
              </>
            ) : (
              <>
                <Metric label="Nós" value={policyGovernanceGraph?.node_count ?? '—'} />
                <Metric label="Arestas" value={policyGovernanceGraph?.edge_count ?? '—'} />
                <Metric label="Domínio dominante" value={policyGovernanceGraph?.dominant_domain ?? '—'} />
                <Metric label="Obrigação dominante" value={policyGovernanceGraph?.dominant_obligation ?? '—'} />
                <Metric label="Padrões detectados" value={policyGovernanceGraph?.pattern_count ?? '—'} />
                <div className="cgov-metric cgov-metric--block">
                  <span className="cgov-metric__label">Padrões (amostra)</span>
                  <span className="cgov-metric__value cgov-mono cgov-signal-preview">
                    {(policyGovernanceGraph?.pattern_preview || []).join(', ') || '—'}
                  </span>
                </div>
                <div className="cgov-metric cgov-metric--block">
                  <span className="cgov-metric__label">Topologia (texto)</span>
                  <span className="cgov-metric__value cgov-mono cgov-signal-preview">
                    {policyGovernanceGraph?.topology_summary ?? '—'}
                  </span>
                </div>
                <Metric label="Validação estrutural" value={policyGovernanceGraph?.validation_ok ? 'ok' : 'falhou'} />
                <Metric label="Passos de trace" value={policyGovernanceGraph?.trace_steps ?? '—'} />
              </>
            )}
          </Card>

          <Card
            title="Policy Execution Readiness"
            icon={ShieldCheck}
            severity={
              !policyExecutionReadiness || policyExecutionReadiness.enabled === false
                ? 'warning'
                : policyExecutionReadiness.overall_score != null &&
                    policyExecutionReadiness.overall_score < 45
                  ? 'critical'
                  : policyExecutionReadiness.overall_score < 62
                    ? 'warning'
                    : undefined
            }
          >
            {!policyExecutionReadiness || policyExecutionReadiness.enabled === false ? (
              <>
                <Metric label="Estado" value="desactivado" />
                <p className="cgov-policy-discovery__hint">
                  Defina{' '}
                  <code className="cgov-code">IMPETUS_POLICY_READINESS_ENABLED=true</code> no backend para
                  análise de prontidão normativa e{' '}
                  <code className="cgov-code">/api/admin/learning/policy-readiness</code> (admin).
                </p>
              </>
            ) : (
              <>
                <Metric label="Score global (0–100)" value={policyExecutionReadiness?.overall_score ?? '—'} />
                <Metric label="Estado de readiness" value={policyExecutionReadiness?.status ?? '—'} />
                <Metric label="Maturidade de governance" value={policyExecutionReadiness?.governance_maturity ?? '—'} />
                <Metric label="Blockers (total)" value={policyExecutionReadiness?.blocker_count ?? '—'} />
                <div className="cgov-metric cgov-metric--block">
                  <span className="cgov-metric__label">Blockers (amostra)</span>
                  <span className="cgov-metric__value cgov-mono cgov-signal-preview">
                    {(policyExecutionReadiness?.dominant_blockers || []).join(', ') || '—'}
                  </span>
                </div>
                <div className="cgov-metric cgov-metric--block">
                  <span className="cgov-metric__label">Recomendações (amostra)</span>
                  <span className="cgov-metric__value cgov-mono cgov-signal-preview">
                    {(policyExecutionReadiness?.recommendation_preview || []).join(' · ') || '—'}
                  </span>
                </div>
                <div className="cgov-metric cgov-metric--block">
                  <span className="cgov-metric__label">Readiness por domínio (score)</span>
                  <span className="cgov-metric__value cgov-mono cgov-signal-preview">
                    {Object.entries(policyExecutionReadiness?.domain_readiness_preview || {})
                      .map(([k, v]) => `${k}:${v}`)
                      .join(' · ') || '—'}
                  </span>
                </div>
                <Metric label="Validação estrutural" value={policyExecutionReadiness?.validation_ok ? 'ok' : 'falhou'} />
                <Metric label="Passos de trace" value={policyExecutionReadiness?.trace_steps ?? '—'} />
              </>
            )}
          </Card>

          <Card
            title="Policy Simulation Runtime"
            icon={FlaskConical}
            severity={
              !policySimulation || policySimulation.enabled === false
                ? 'warning'
                : policySimulation.runtime_risk_level === 'critical' || policySimulation.overall_impact === 'critical'
                  ? 'critical'
                  : policySimulation.runtime_risk_level === 'high' || policySimulation.overall_impact === 'high'
                    ? 'warning'
                    : undefined
            }
          >
            {!policySimulation || policySimulation.enabled === false ? (
              <>
                <Metric label="Estado" value="desactivado" />
                <p className="cgov-policy-discovery__hint">
                  Defina{' '}
                  <code className="cgov-code">IMPETUS_POLICY_SIMULATION_ENABLED=true</code> no backend para simulação dry-run e{' '}
                  <code className="cgov-code">/api/admin/learning/policy-simulation</code> (admin). Sem execução real de governance.
                </p>
              </>
            ) : (
              <>
                <Metric label="Modo simulado" value={policySimulation?.simulation_mode ?? '—'} />
                <Metric label="Impacto previsto" value={policySimulation?.overall_impact ?? '—'} />
                <Metric label="Risco runtime (nível)" value={policySimulation?.runtime_risk_level ?? '—'} />
                <Metric label="Pressão de governance" value={policySimulation?.governance_pressure ?? '—'} />
                <Metric label="Domínio dominante (sim)" value={policySimulation?.dominant_domain_sim ?? '—'} />
                <Metric label="Pressão de override (sim)" value={policySimulation?.override_pressure_sim ?? '—'} />
                <Metric label="Obrigações simuladas" value={policySimulation?.simulated_obligations_count ?? '—'} />
                <Metric label="Efeitos previstos" value={policySimulation?.predicted_effects_count ?? '—'} />
                <div className="cgov-metric cgov-metric--block">
                  <span className="cgov-metric__label">Riscos (amostra)</span>
                  <span className="cgov-metric__value cgov-mono cgov-signal-preview">
                    {(policySimulation?.risk_types_preview || []).join(', ') || '—'}
                  </span>
                </div>
                <div className="cgov-metric cgov-metric--block">
                  <span className="cgov-metric__label">Efeitos previstos (amostra)</span>
                  <span className="cgov-metric__value cgov-mono cgov-signal-preview">
                    {(policySimulation?.predicted_effects_preview || []).join(', ') || '—'}
                  </span>
                </div>
                <Metric label="Caminhos bloqueados (sim)" value={policySimulation?.blocked_paths_count ?? '—'} />
                <Metric label="Validação" value={policySimulation?.validation_ok ? 'ok' : 'falhou'} />
                <Metric label="Passos de trace" value={policySimulation?.trace_steps ?? '—'} />
              </>
            )}
          </Card>

          <Card
            title="Policy Sandbox Execution"
            icon={GitCompare}
            severity={
              !policySandbox || policySandbox.enabled === false
                ? 'warning'
                : policySandbox.runtime_pressure_level === 'high'
                  ? 'warning'
                  : undefined
            }
          >
            {!policySandbox || policySandbox.enabled === false ? (
              <>
                <Metric label="Estado" value="desactivado" />
                <p className="cgov-policy-discovery__hint">
                  Defina{' '}
                  <code className="cgov-code">IMPETUS_POLICY_SANDBOX_ENABLED=true</code> no backend para shadow runtime
                  paralelo e{' '}
                  <code className="cgov-code">/api/admin/learning/policy-sandbox</code> (admin). Produção permanece intocável.
                </p>
              </>
            ) : (
              <>
                <Metric label="Modo sandbox" value={policySandbox?.sandbox_mode ?? '—'} />
                <Metric label="Produção intocável" value={policySandbox?.production_untouched ? 'sim' : 'não'} />
                <Metric label="Divergências (total)" value={policySandbox?.divergences_count ?? '—'} />
                <div className="cgov-metric cgov-metric--block">
                  <span className="cgov-metric__label">Divergências (amostra)</span>
                  <span className="cgov-metric__value cgov-mono cgov-signal-preview">
                    {(policySandbox?.divergences_preview || []).join(', ') || '—'}
                  </span>
                </div>
                <Metric label="Obrigações espelhadas" value={policySandbox?.mirrored_obligations_count ?? '—'} />
                <Metric label="Pressão runtime (nível)" value={policySandbox?.runtime_pressure_level ?? '—'} />
                <Metric label="Saturação governance" value={policySandbox?.governance_saturation ?? '—'} />
                <Metric label="Pressão obrigações" value={policySandbox?.obligation_pressure ?? '—'} />
                <Metric label="Domínio dominante (sandbox)" value={policySandbox?.sandbox_dominant_domain ?? '—'} />
                <Metric label="Pressão override (sandbox)" value={policySandbox?.sandbox_override_pressure ?? '—'} />
                <Metric label="Pressão governance (sandbox)" value={policySandbox?.sandbox_governance_pressure ?? '—'} />
                <Metric label="Efeitos sandbox" value={policySandbox?.sandbox_effects_count ?? '—'} />
                <Metric label="Validação" value={policySandbox?.validation_ok ? 'ok' : 'falhou'} />
                <Metric label="Passos de trace" value={policySandbox?.trace_steps ?? '—'} />
              </>
            )}
          </Card>

          <Card
            title="Policy Governance Diff"
            icon={FileDiff}
            severity={
              !policyGovernanceDiff || policyGovernanceDiff.enabled === false
                ? 'warning'
                : policyGovernanceDiff.governance_shift_severity === 'critical' ||
                    policyGovernanceDiff.risk_delta_severity === 'critical'
                  ? 'critical'
                  : policyGovernanceDiff.governance_shift_severity === 'high' ||
                      policyGovernanceDiff.risk_delta_severity === 'high'
                    ? 'warning'
                    : undefined
            }
          >
            {!policyGovernanceDiff || policyGovernanceDiff.enabled === false ? (
              <>
                <Metric label="Estado" value="desactivado" />
                <p className="cgov-policy-discovery__hint">
                  Defina{' '}
                  <code className="cgov-code">IMPETUS_POLICY_DIFF_ENABLED=true</code> no backend para o motor de
                  diferenças produção vs sandbox (só leitura) e{' '}
                  <code className="cgov-code">/api/admin/learning/policy-diff</code> (admin). Sem execução de
                  governance real.
                </p>
              </>
            ) : (
              <>
                <Metric label="Modo de comparação" value={policyGovernanceDiff?.comparison_mode ?? '—'} />
                <Metric label="Mudanças de topologia" value={policyGovernanceDiff?.topology_changes_count ?? '—'} />
                <Metric label="Deltas de obligations" value={policyGovernanceDiff?.obligation_deltas_count ?? '—'} />
                <Metric label="Shifts de arbitration" value={policyGovernanceDiff?.arbitration_deltas_count ?? '—'} />
                <Metric
                  label="Governance shift (severidade)"
                  value={policyGovernanceDiff?.governance_shift_severity ?? '—'}
                />
                <Metric label="Risco runtime (delta)" value={policyGovernanceDiff?.risk_delta_severity ?? '—'} />
                <Metric
                  label="Magnitude pressão runtime (Δ)"
                  value={policyGovernanceDiff?.runtime_pressure_delta_magnitude ?? '—'}
                />
                <div className="cgov-metric cgov-metric--block">
                  <span className="cgov-metric__label">Divergência dominante / amostra</span>
                  <span className="cgov-metric__value cgov-mono cgov-signal-preview">
                    {(policyGovernanceDiff?.divergence_preview && policyGovernanceDiff.divergence_preview.length
                      ? policyGovernanceDiff.divergence_preview
                      : [policyGovernanceDiff?.dominant_divergence]
                    )
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </span>
                </div>
                <Metric label="Validação estrutural" value={policyGovernanceDiff?.validation_ok ? 'ok' : 'falhou'} />
                <Metric label="Passos de trace (diff)" value={policyGovernanceDiff?.trace_steps ?? '—'} />
              </>
            )}
          </Card>

          <Card
            title="Policy Governance Evolution"
            icon={TrendingUp}
            severity={
              !policyGovernanceEvolution || policyGovernanceEvolution.enabled === false
                ? 'warning'
                : policyGovernanceEvolution.trajectory_trend === 'VOLATILE' ||
                    policyGovernanceEvolution.stability_trend === 'SATURATED'
                  ? 'critical'
                  : policyGovernanceEvolution.trajectory_trend === 'EXPANDING' ||
                      policyGovernanceEvolution.risk_evolution_trend === 'SATURATED'
                    ? 'warning'
                    : undefined
            }
          >
            {!policyGovernanceEvolution || policyGovernanceEvolution.enabled === false ? (
              <>
                <Metric label="Estado" value="desactivado" />
                <p className="cgov-policy-discovery__hint">
                  Defina{' '}
                  <code className="cgov-code">IMPETUS_POLICY_EVOLUTION_ENABLED=true</code> no backend para evolução
                  normativa observacional e{' '}
                  <code className="cgov-code">/api/admin/learning/policy-evolution</code> (admin). Sem autoridade de
                  runtime.
                </p>
              </>
            ) : (
              <>
                <Metric label="Janela temporal" value={policyGovernanceEvolution?.timeline_window ?? '—'} />
                <Metric label="Trajetória (tendência)" value={policyGovernanceEvolution?.trajectory_trend ?? '—'} />
                <Metric label="Direcção" value={policyGovernanceEvolution?.trajectory_direction ?? '—'} />
                <div className="cgov-metric cgov-metric--block">
                  <span className="cgov-metric__label">Governance trends (amostra)</span>
                  <span className="cgov-metric__value cgov-mono cgov-signal-preview">
                    {(policyGovernanceEvolution?.governance_trends_preview || []).join(' · ') || '—'}
                  </span>
                </div>
                <Metric label="Topologia (evolução)" value={policyGovernanceEvolution?.topology_evolution_trend ?? '—'} />
                <Metric label="Obligations (evolução)" value={policyGovernanceEvolution?.obligation_evolution_trend ?? '—'} />
                <Metric label="Arbitragem (evolução)" value={policyGovernanceEvolution?.arbitration_evolution_trend ?? '—'} />
                <Metric label="Estabilidade (score)" value={policyGovernanceEvolution?.stability_score ?? '—'} />
                <Metric label="Estabilidade (tendência)" value={policyGovernanceEvolution?.stability_trend ?? '—'} />
                <Metric label="Risco (evolução)" value={policyGovernanceEvolution?.risk_evolution_trend ?? '—'} />
                <Metric label="Validação" value={policyGovernanceEvolution?.validation_ok ? 'ok' : 'falhou'} />
                <Metric label="Passos de trace" value={policyGovernanceEvolution?.trace_steps ?? '—'} />
              </>
            )}
          </Card>

          <Card
            title="Context Integrity"
            icon={Fingerprint}
            severity={
              contextIntegrity?.enabled
                ? contextIntegrity?.status === 'critical'
                  ? 'critical'
                  : contextIntegrity?.status === 'warning'
                    ? 'warning'
                    : 'healthy'
                : undefined
            }
          >
            <Metric label="Engine activo" value={contextIntegrity?.enabled ? 'sim' : 'não'} />
            <Metric label="Modo bloqueio" value={contextIntegrity?.block_mode ? 'sim' : 'não'} />
            <Metric label="Contextos verificados" value={contextIntegrity?.verified_contexts ?? '—'} />
            <Metric label="Falhas de integridade" value={contextIntegrity?.integrity_failures ?? '—'} />
            <Metric label="Bloqueios cross-tenant" value={contextIntegrity?.cross_tenant_blocks ?? '—'} />
            <Metric label="Tentativas de poisoning" value={contextIntegrity?.poisoning_attempts ?? '—'} />
            <Metric label="Contextos oversized" value={contextIntegrity?.oversized_contexts ?? '—'} />
            <Metric label="Estado" value={contextIntegrity?.status ?? '—'} />
          </Card>

          <Card
            title="Event Backbone"
            icon={ListTree}
            severity={
              eventBackbone?.enabled
                ? eventBackbone?.stream_health === 'degraded'
                  ? 'warning'
                  : eventBackbone?.stream_health === 'healthy'
                    ? 'healthy'
                    : undefined
                : undefined
            }
          >
            <Metric label="Activado" value={eventBackbone?.enabled ? 'sim' : 'não'} />
            <Metric label="Persistência DB" value={eventBackbone?.persist ? 'sim' : 'não'} />
            <Metric label="Eventos publicados" value={eventBackbone?.events_published ?? '—'} />
            <Metric label="Pedidos de replay" value={eventBackbone?.replay_requests ?? '—'} />
            <Metric label="Traces correlacionados" value={eventBackbone?.correlated_traces ?? '—'} />
            <Metric label="Saúde do stream" value={eventBackbone?.stream_health ?? '—'} />
          </Card>

          <Card
            title="Cognitive Stability Index"
            icon={Gauge}
            severity={csi?.unavailable ? undefined : csiSeverity}
          >
            <Metric label="Engine CSI" value={csi?.engine_enabled ? 'activo' : 'indisponível'} />
            <Metric label="CSI" value={csi?.csi != null ? csi.csi : '—'} />
            <Metric label="Estado" value={csi?.unavailable ? 'indisponível' : csi?.status || '—'} />
            <Metric label="Consenso (sinal)" value={csi?.consensus != null ? csi.consensus : '—'} />
            <Metric label="Drift (estabilidade)" value={csi?.drift != null ? csi.drift : '—'} />
            <Metric label="Calibração (saúde)" value={csi?.calibration != null ? csi.calibration : '—'} />
            <Metric label="Autonomia (estabilidade)" value={csi?.autonomy != null ? csi.autonomy : '—'} />
          </Card>

          <Card
            title="Cognitive Safety"
            icon={AlertTriangle}
            severity={safety?.engine_enabled ? safetySeverity : undefined}
          >
            <Metric label="Runtime activo" value={safety?.engine_enabled ? 'sim' : 'não'} />
            <Metric label="Nível de risco (último)" value={safety?.risk_level ?? '—'} />
            <Metric label="Score de risco" value={safety?.risk_score != null ? safety.risk_score : '—'} />
            <Metric label="Bloqueios críticos (30d)" value={safety?.safety_blocks ?? '—'} />
          </Card>

          <Card title="Saúde cognitiva" icon={Activity} severity={healthLevel}>
            <Metric label="Confiança média (%)" value={health?.average_confidence} />
            <Metric label="Taxa baixa confiança" value={health?.low_confidence_rate?.toFixed?.(3)} />
            <Metric label="Alertas drift (30d)" value={health?.drift_alerts} />
            <Metric label="Ajustes autónomos (event store)" value={health?.autonomous_adjustments} />
            <Metric label="Propostas activas" value={health?.active_proposals} />
          </Card>

          <Card
            className="cgov-card--weighted-voting"
            title="Weighted Cognitive Voting"
            icon={Vote}
            severity={
              voting?.engine_enabled && voting?.dominant_engine
                ? 'warning'
                : voting?.engine_enabled
                  ? 'healthy'
                  : undefined
            }
          >
            <Metric label="Engine activo" value={voting?.engine_enabled ? 'sim' : 'não'} />
            <Metric
              label="Consenso ponderado (último evento)"
              value={voting?.weighted_consensus != null ? voting.weighted_consensus : '—'}
            />
            <Metric label="Engine dominante (peso)" value={voting?.dominant_engine ?? '—'} />
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
            <Metric label="CSI" value={runtime?.csi_enabled ? 'sim' : 'não'} />
            <Metric label="Cognitive Safety" value={runtime?.cognitive_safety ? 'sim' : 'não'} />
            <Metric label="Weighted voting" value={runtime?.weighted_voting ? 'sim' : 'não'} />
            <Metric label="Aprendizagem estratégica" value={runtime?.strategic_learning ? 'sim' : 'não'} />
          </Card>

          <Card
            title="Operational Hardening"
            icon={Shield}
            severity={operationalHardeningSeverity}
          >
            <Metric
              label="Legacy readiness (zero-window)"
              value={legacyRuntime?.legacy_block_mode_ready ? 'pronto' : 'não'}
            />
            <Metric
              label="Legacy paths (últimas 24h)"
              value={legacyRuntime?.legacy_paths_last_24h ?? '—'}
            />

            <Metric
              label="Integrity rollout readiness"
              value={integrityReadiness?.block_mode_ready ? 'pronto' : 'não'}
            />
            <Metric label="Integrity confidence" value={integrityReadiness?.confidence ?? '—'} />
            <Metric
              label="Event queue depth"
              value={queue?.queue_depth ?? '—'}
            />
            <Metric
              label="Batch flush rate"
              value={queue?.batch_flush_rate != null ? queue.batch_flush_rate : '—'}
            />
            <Metric label="Backpressure ativa" value={queue?.backpressure_active ? 'sim' : 'não'} />
            <Metric label="Eventos dropados" value={queue?.dropped_events ?? '—'} />

            <Metric label="Bypass attempts" value={bypass?.bypass_attempts ?? 0} />
            <Metric
              label="Bypass blocked"
              value={bypass?.blocked_bypass_attempts ?? 0}
            />
          </Card>
        </div>
      </div>
    </Layout>
  );
}
