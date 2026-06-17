/**
 * AIOI-P1E.6 / P1F–P1I — Widget Horizontal Scale (READ ONLY)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { aioi, f49, operations, m1Validation, m1PilotReadiness, m1PilotExecution, m1FoodBasePilot, m1PilotOperation, m1PilotClosure, m1PilotAdoption, m1Governance, m1PlatformClosure, m1CriticalRemediation, m1PilotAdoptionClosure, m1FoodBase } from '../../../services/api';
import {
  Layers,
  Server,
  RefreshCw,
  AlertTriangle,
  GitBranch,
  Activity,
  ShieldCheck,
  Key,
  Database,
  Network
} from 'lucide-react';

const POLL_INTERVAL_MS = 60_000;

function ScaleTile({ label, value, unit = '', accent = '--text-secondary' }) {
  return (
    <div className="aioi-scale__tile">
      <span className="aioi-scale__tile-value" style={{ color: `var(${accent})` }}>
        {value ?? '—'}
        {unit && <span className="aioi-scale__tile-unit">{unit}</span>}
      </span>
      <span className="aioi-scale__tile-label">{label}</span>
    </div>
  );
}

export default function WidgetAIOIScale() {
  const [status, setStatus] = useState(null);
  const [validation, setValidation] = useState(null);
  const [runtime, setRuntime] = useState(null);
  const [registry, setRegistry] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [distributed, setDistributed] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [health, setHealth] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [risk, setRisk] = useState(null);
  const [certifications, setCertifications] = useState(null);
  const [productionAudit, setProductionAudit] = useState(null);
  const [deployment, setDeployment] = useState(null);
  const [approval, setApproval] = useState(null);
  const [rollouts, setRollouts] = useState(null);
  const [readinessHistory, setReadinessHistory] = useState(null);
  const [operationalCert, setOperationalCert] = useState(null);
  const [operationalDataset, setOperationalDataset] = useState(null);
  const [operationalConsistency, setOperationalConsistency] = useState(null);
  const [operationalWorkload, setOperationalWorkload] = useState(null);
  const [authStatus, setAuthStatus] = useState(null);
  const [authRequests, setAuthRequests] = useState(null);
  const [authHistory, setAuthHistory] = useState(null);
  const [complianceStatus, setComplianceStatus] = useState(null);
  const [baselineStatus, setBaselineStatus] = useState(null);
  const [assuranceStatus, setAssuranceStatus] = useState(null);
  const [recoveryStatus, setRecoveryStatus] = useState(null);
  const [releaseStatus, setReleaseStatus] = useState(null);
  const [closureStatus, setClosureStatus] = useState(null);
  const [geminiF49, setGeminiF49] = useState(null);
  const [triAiF49, setTriAiF49] = useState(null);
  const [truthClosureF49, setTruthClosureF49] = useState(null);
  const [continuousOpP0A, setContinuousOpP0A] = useState(null);
  const [observationP0B, setObservationP0B] = useState(null);
  const [activeOpP0C, setActiveOpP0C] = useState(null);
  const [runtimeP0D, setRuntimeP0D] = useState(null);
  const [goLiveP0E, setGoLiveP0E] = useState(null);
  const [m16Validation, setM16Validation] = useState(null);
  const [m17Readiness, setM17Readiness] = useState(null);
  const [m18FoodBase, setM18FoodBase] = useState(null);
  const [m19DryRun, setM19DryRun] = useState(null);
  const [m110Pilot, setM110Pilot] = useState(null);
  const [m111Operation, setM111Operation] = useState(null);
  const [m112Closure, setM112Closure] = useState(null);
  const [m113Adoption, setM113Adoption] = useState(null);
  const [m114Governance, setM114Governance] = useState(null);
  const [m115Closure, setM115Closure] = useState(null);
  const [m116Remediation, setM116Remediation] = useState(null);
  const [m117AdoptionClosure, setM117AdoptionClosure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchData = useCallback(async () => {
    try {
  const [statusRes, validationRes, runtimeRes, registryRes, benchmarkRes, distributedRes, telemetryRes, healthRes, capacityRes, readinessRes, riskRes, certRes, auditRes, deploymentRes, approvalRes, rolloutsRes, historyRes, opCertRes, opDatasetRes, opConsistencyRes, opWorkloadRes, authStatusRes, authRequestsRes, authHistoryRes, complianceRes, baselineRes, assuranceRes, recoveryRes, releaseRes, closureRes, geminiF49Res, triAiF49Res, truthClosureF49Res, continuousOpP0ARes, observationP0BRes, activeOpP0CRes, runtimeP0DRes, goLiveP0ERes, m16Res, m17Res, m18Res, m19Res, m110Res, m111Res, m112Res, m113Res, m114Res, m115Res, m116Res, m117Res] = await Promise.all([
        aioi.getScaleStatus(),
        aioi.getScaleValidation(),
        aioi.getScaleRuntime(),
        aioi.getScaleRegistry(),
        aioi.getScaleBenchmark(),
        aioi.getScaleDistributed(),
        aioi.getScaleTelemetry(),
        aioi.getScaleHealth(),
        aioi.getScaleCapacity(),
        aioi.getProductionReadiness(),
        aioi.getProductionRisk(),
        aioi.getProductionCertifications(),
        aioi.getProductionAudit(),
        aioi.getDeploymentGovernance(),
        aioi.getDeploymentApproval(),
        aioi.getProductionRollouts({ limit: 10 }),
        aioi.getReadinessHistory({ limit: 10 }),
        aioi.getOperationalCertification(),
        aioi.getOperationalDataset(),
        aioi.getOperationalConsistency(),
        aioi.getOperationalWorkload(),
        aioi.getAuthorizationStatus(),
        aioi.getAuthorizationRequests({ limit: 10 }),
        aioi.getAuthorizationHistory({ limit: 10 }),
        aioi.getComplianceStatus(),
        aioi.getBaselineStatus(),
        aioi.getAssuranceStatus(),
        aioi.getRecoveryStatus(),
        aioi.getReleaseStatus(),
        aioi.getClosureStatus(),
        f49.getGeminiStatus().catch(() => null),
        f49.getGeminiBenchmark().catch(() => null),
        f49.getClosureFinalStatus().catch(() => null),
        operations.getContinuousHealth().catch(() => null),
        operations.getObservationStatus({ window_days: 7 }).catch(() => null),
        operations.getActiveStatus({ window_minutes: 60 }).catch(() => null),
        operations.getRuntimeStatus({ window_hours: 24 }).catch(() => null),
        operations.getGoLiveStatus().catch(() => null),
        m1Validation.getStatus().catch(() => null),
        m1PilotReadiness.getStatus().catch(() => null),
        m1FoodBase.getStatus().catch(() => null),
        m1PilotExecution.getStatus().catch(() => null),
        m1FoodBasePilot.getStatus().catch(() => null),
        m1PilotOperation.getStatus().catch(() => null),
        m1PilotClosure.getStatus().catch(() => null),
        m1PilotAdoption.getStatus().catch(() => null),
        m1Governance.getStatus().catch(() => null),
        m1PlatformClosure.getStatus().catch(() => null),
        m1CriticalRemediation.getStatus().catch(() => null),
        m1PilotAdoptionClosure.getStatus().catch(() => null)
      ]);
      setStatus(statusRes?.data ?? statusRes);
      setValidation(validationRes?.data ?? validationRes);
      setRuntime(runtimeRes?.data ?? runtimeRes);
      setRegistry(registryRes?.data ?? registryRes);
      setBenchmark(benchmarkRes?.data ?? benchmarkRes);
      setDistributed(distributedRes?.data ?? distributedRes);
      setTelemetry(telemetryRes?.data ?? telemetryRes);
      setHealth(healthRes?.data ?? healthRes);
      setCapacity(capacityRes?.data ?? capacityRes);
      setReadiness(readinessRes?.data ?? readinessRes);
      setRisk(riskRes?.data ?? riskRes);
      setCertifications(certRes?.data ?? certRes);
      setProductionAudit(auditRes?.data ?? auditRes);
      setDeployment(deploymentRes?.data ?? deploymentRes);
      setApproval(approvalRes?.data ?? approvalRes);
      setRollouts(rolloutsRes?.data ?? rolloutsRes);
      setReadinessHistory(historyRes?.data ?? historyRes);
      setOperationalCert(opCertRes?.data ?? opCertRes);
      setOperationalDataset(opDatasetRes?.data ?? opDatasetRes);
      setOperationalConsistency(opConsistencyRes?.data ?? opConsistencyRes);
      setOperationalWorkload(opWorkloadRes?.data ?? opWorkloadRes);
      setAuthStatus(authStatusRes?.data ?? authStatusRes);
      setAuthRequests(authRequestsRes?.data ?? authRequestsRes);
      setAuthHistory(authHistoryRes?.data ?? authHistoryRes);
      setComplianceStatus(complianceRes?.data ?? complianceRes);
      setBaselineStatus(baselineRes?.data ?? baselineRes);
      setAssuranceStatus(assuranceRes?.data ?? assuranceRes);
      setRecoveryStatus(recoveryRes?.data ?? recoveryRes);
      setReleaseStatus(releaseRes?.data ?? releaseRes);
      setClosureStatus(closureRes?.data ?? closureRes);
      setGeminiF49(geminiF49Res?.data ?? geminiF49Res);
      setTriAiF49(triAiF49Res?.data ?? triAiF49Res);
      setTruthClosureF49(truthClosureF49Res?.data ?? truthClosureF49Res);
      setContinuousOpP0A(continuousOpP0ARes?.data ?? continuousOpP0ARes);
      setObservationP0B(observationP0BRes?.data ?? observationP0BRes);
      setActiveOpP0C(activeOpP0CRes?.data ?? activeOpP0CRes);
      setRuntimeP0D(runtimeP0DRes?.data ?? runtimeP0DRes);
      setGoLiveP0E(goLiveP0ERes?.data ?? goLiveP0ERes);
      setM16Validation(m16Res?.data ?? m16Res);
      setM17Readiness(m17Res?.data ?? m17Res);
      setM18FoodBase(m18Res?.data ?? m18Res);
      setM19DryRun(m19Res?.data ?? m19Res);
      setM110Pilot(m110Res?.data ?? m110Res);
      setM111Operation(m111Res?.data ?? m111Res);
      setM112Closure(m112Res?.data ?? m112Res);
      setM113Adoption(m113Res?.data ?? m113Res);
      setM114Governance(m114Res?.data ?? m114Res);
      setM115Closure(m115Res?.data ?? m115Res);
      setM116Remediation(m116Res?.data ?? m116Res);
      setM117AdoptionClosure(m117Res?.data ?? m117Res);
      setError(null);
      setLastFetch(new Date().toISOString());
    } catch (err) {
      setError(err.message || 'Erro ao carregar scale status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const tid = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(tid);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="impetus-card aioi-scale__card">
        <div className="aioi-scale__header">
          <Layers size={14} style={{ color: 'var(--cyan)' }} />
          <span className="aioi-scale__title">AIOI HORIZONTAL SCALE</span>
        </div>
        <div className="aioi-scale__loading">
          <RefreshCw size={16} className="spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="impetus-card aioi-scale__card">
        <div className="aioi-scale__header">
          <Layers size={14} style={{ color: 'var(--cyan)' }} />
          <span className="aioi-scale__title">AIOI HORIZONTAL SCALE</span>
        </div>
        <div className="aioi-scale__error">
          <AlertTriangle size={14} style={{ color: 'var(--amber)' }} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const flags = runtime?.activation_flags || {};
  const resolution = registry?.resolution || runtime?.tenant_resolution || {};
  const ownership = runtime?.ownership_runtime || status?.partitions || {};
  const soak = runtime?.soak_metrics || {};
  const parBench = benchmark?.parallel_benchmark || {};
  const valCriteria = validation?.criteria || {};
  const distFlags = distributed?.flags || {};
  const distOwnership = distributed?.ownership || {};
  const distSoak = distributed?.soak_metrics || {};
  const distBench = benchmark?.distributed_benchmark || {};
  const failover = distOwnership.failover || {};
  const clusterHealthStatus = health?.overall_status || 'NORMAL';
  const healthColor = clusterHealthStatus === 'NORMAL' ? 'var(--green)'
    : clusterHealthStatus === 'WARNING' ? 'var(--amber)' : 'var(--red)';
  const workerInventory = telemetry?.workers?.workers || [];
  const shardInventory = telemetry?.shards?.shards || [];
  const leaseInventory = telemetry?.leases?.local_leases || [];
  const statusLabel = distFlags.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE ? 'DIST ON' : 'P1R READY';
  const readinessScore = readiness?.readiness_score ?? 0;
  const overallReady = readiness?.overall_ready ? 'READY' : 'PENDING';
  const certCount = certifications?.phases?.filter(p => p.certified)?.length ?? 0;
  const p1jRegistryTotal = certifications?.phases?.length ?? 9;
  const overallRisk = risk?.overall_risk ?? 'LOW';
  const prodReady = productionAudit?.ready_for_production ? 'YES' : 'NO';
  const deployEligible = deployment?.eligible ? 'YES' : 'NO';
  const approvalStatus = approval?.approval_status ?? deployment?.approval?.approval_status ?? 'NONE';
  const rolloutCount = rollouts?.status?.rollouts_registered ?? 0;
  const rollbackCount = rollouts?.status?.rollbacks_registered ?? 0;
  const readinessTrend = readinessHistory?.history?.trend?.direction ?? 'stable';
  const datasetOk = operationalDataset?.dataset_certified ? 'PASS' : '—';
  const consistencyOk = operationalConsistency?.consistency_certified ? 'PASS' : '—';
  const soakCycles = operationalCert?.soak?.cycles ?? 0;
  const workloadEvents = operationalWorkload?.events_processed ?? 0;
  const authPending = authStatus?.pending_approvals ?? authRequests?.pending_count ?? 0;
  const authRuntime = authStatus?.runtime_authorized ? 'YES' : 'NO';
  const authExpired = authStatus?.registry?.by_status?.EXPIRED ?? 0;
  const authAuditOk = authStatus?.audit_integrity?.audit_integrity ? 'OK' : '—';
  const integrityScore = complianceStatus?.integrity_score ?? 0;
  const complianceScore = complianceStatus?.compliance_score ?? 0;
  const certDrift = complianceStatus?.certification_drift ? 'DRIFT' : 'OK';
  const docConsistent = complianceStatus?.documentation?.documentation_consistent ? 'OK' : '—';
  const chainPresent = complianceStatus?.certification_chain?.phases_present ?? 0;
  const chainTotal = complianceStatus?.certification_chain?.phases_total
    ?? complianceStatus?.expected_phases_total ?? 17;
  const soakCompleted = complianceStatus?.soak?.long_term_integrity_completed ? 'PASS' : '—';
  const soakCyclesP1N = complianceStatus?.soak?.cycles ?? 0;
  const p1nVerdict = complianceStatus?.verdict?.includes('PASS') ? 'PASS' : '—';
  const baselineVersion = baselineStatus?.baseline_version ?? '—';
  const baselineRegStatus = baselineStatus?.baseline_status ?? '—';
  const freezeStatus = baselineStatus?.freeze_status ?? '—';
  const reproOk = baselineStatus?.reproducibility ? 'YES' : 'NO';
  const auditChainOk = baselineStatus?.audit_chain?.audit_chain_complete ? 'OK' : '—';
  const certChainPhases = baselineStatus?.certification_chain?.phases_present ?? 0;
  const certChainTotal = baselineStatus?.certification_chain?.phases_total
    ?? baselineStatus?.expected_phases_total ?? 17;
  const p1oVerdict = baselineStatus?.verdict?.includes('PASS') ? 'PASS' : '—';
  const assuranceOk = assuranceStatus?.assurance_status ?? '—';
  const preservationOk = assuranceStatus?.preservation_status ?? '—';
  const consistencyOkP1P = assuranceStatus?.consistency ? 'OK' : '—';
  const traceOk = assuranceStatus?.traceability ? 'OK' : '—';
  const soakP1P = assuranceStatus?.soak?.long_horizon_preservation_completed ? 'PASS' : '—';
  const soakCyclesP1P = assuranceStatus?.soak?.cycles ?? 0;
  const p1pVerdict = assuranceStatus?.verdict?.includes('PASS') ? 'PASS' : '—';
  const recoveryOk = recoveryStatus?.recovery_status ?? '—';
  const rebuildOk = recoveryStatus?.rebuild_status ?? '—';
  const continuityOk = recoveryStatus?.continuity_status ?? '—';
  const auditChainRecovery = recoveryStatus?.audit_chain?.audit_chain_complete ? 'OK' : '—';
  const soakP1Q = recoveryStatus?.soak?.long_horizon_recovery_completed ? 'PASS' : '—';
  const soakCyclesP1Q = recoveryStatus?.soak?.cycles ?? 0;
  const p1qVerdict = recoveryStatus?.verdict?.includes('PASS') ? 'PASS' : '—';
  const releaseId = releaseStatus?.release_identifier ?? '—';
  const releaseRegStatus = releaseStatus?.release_status ?? '—';
  const acceptanceStatus = releaseStatus?.acceptance_status ?? '—';
  const governanceStatusRelease = releaseStatus?.governance_status ?? '—';
  const readinessStatusRelease = releaseStatus?.readiness_status ?? '—';
  const soakP1R = releaseStatus?.soak?.release_soak_completed ? 'PASS' : '—';
  const soakCyclesP1R = releaseStatus?.soak?.cycles ?? 0;
  const p1rVerdict = releaseStatus?.verdict?.includes('PASS') ? 'PASS' : '—';
  const closureStatusVal = closureStatus?.closure_status ?? '—';
  const archiveStatusVal = closureStatus?.archive?.archive_status ?? '—';
  const milestoneStatusVal = closureStatus?.milestone?.milestone_status ?? '—';
  const soakP1S = closureStatus?.soak?.archive_soak_completed ? 'PASS' : '—';
  const soakCyclesP1S = closureStatus?.soak?.cycles ?? 0;
  const archiveId = closureStatus?.archive?.archive_identifier ?? '—';
  const p1sVerdict = closureStatus?.verdict?.includes('PASS') ? 'PASS' : '—';
  const riskColor = overallRisk === 'LOW' ? 'var(--green)'
    : overallRisk === 'MEDIUM' ? 'var(--amber)' : 'var(--red)';

  const geminiLive = geminiF49?.live_ping_ok ? 'UP' : geminiF49?.gemini_configured ? 'DEGRADED' : 'DOWN';
  const geminiVisionHint = geminiF49?.live_ping_ok ? 'READY' : '—';
  const triAiReady = triAiF49?.tri_ai_ready ? 'READY' : 'PENDING';
  const f49ReadinessScore = geminiF49?.readiness_score ?? '—';
  const geminiLatency = geminiF49?.latency_ms != null ? `${geminiF49.latency_ms}ms` : '—';

  const truthProgramClosed = truthClosureF49?.truth_program_closed ? 'CLOSED' : 'OPEN';
  const f47TruthStatus = truthClosureF49?.f47_truth_enforcement ?? '—';
  const f48StressStatus = truthClosureF49?.f48_stress_validation ?? '—';
  const f49OpsStatus = truthClosureF49?.f49_pm2_audit === 'pass' ? 'PASS' : '—';
  const triAiClosure = truthClosureF49?.tri_ai_operational ? 'OPERATIONAL' : 'PENDING';
  const productionValidated = truthClosureF49?.production_validation_completed ? 'COMPLETE' : '—';
  const closureVerdict = truthClosureF49?.verdict?.includes('CLOSED') ? 'CLOSED' : '—';

  const p0aMetrics = continuousOpP0A?.metrics ?? {};
  const p0aReady = continuousOpP0A?.activation_ready ? 'READY' : 'PENDING';
  const p0aIoeHour = p0aMetrics.ioe_per_hour ?? '—';
  const p0aOutboxRate = p0aMetrics.outbox_delivery_rate_pct != null ? `${p0aMetrics.outbox_delivery_rate_pct}%` : '—';
  const p0aTenants = p0aMetrics.active_tenants ?? '—';
  const p0aPlcRate = p0aMetrics.plc_telemetry_rate_per_hour ?? '—';
  const p0aWfRunning = p0aMetrics.workflow_running ?? '—';
  const p0aQueueOk = continuousOpP0A?.queue_healthy ? 'OK' : '—';

  const p0bSummary = observationP0B?.summary ?? {};
  const p0bObsStatus = observationP0B?.observation_running ? 'ACTIVE' : '—';
  const p0bIoeHour = p0bSummary.ioe_per_hour ?? '—';
  const p0bIoeDay = p0bSummary.ioe_per_day ?? '—';
  const p0bTenants = p0bSummary.active_tenants ?? '—';
  const p0bOutboxRate = p0bSummary.outbox_delivery_rate_pct != null ? `${p0bSummary.outbox_delivery_rate_pct}%` : '—';
  const p0bWfActivity = p0bSummary.workflow_running ?? '—';
  const p0bTriAi = p0bSummary.tri_ai_status === 'TRI_AI_OPERATIONAL' ? 'OK' : (p0bSummary.tri_ai_status ?? '—');
  const p0bPm2 = p0bSummary.platform_status ?? '—';

  const p0cPass = activeOpP0C?.pass ? 'PASS' : 'FAIL';
  const p0cSummary = activeOpP0C?.summary ?? {};
  const p0cIoeHour = p0cSummary.ioe_per_hour ?? '—';
  const p0cNewEvents = p0cSummary.new_events ?? '—';
  const p0cWorkers = p0cSummary.active_workers ? 'ON' : 'OFF';
  const p0cTenants = p0cSummary.active_tenants ?? '—';
  const p0cOutbox = p0cSummary.outbox_rate_pct != null ? `${p0cSummary.outbox_rate_pct}%` : '—';
  const p0cRuntime = p0cSummary.runtime_status ?? '—';
  const p0cReason = activeOpP0C?.reason ?? '—';

  const p0dPass = runtimeP0D?.pass ? 'PASS' : 'FAIL';
  const p0dSummary = runtimeP0D?.summary ?? {};
  const p0dRuntime = p0dSummary.runtime_status ?? '—';
  const p0dWorkers = p0dSummary.workers_online ? 'ON' : 'OFF';
  const p0dIoeHour = p0dSummary.ioe_per_hour ?? '—';
  const p0dDelHour = p0dSummary.deliveries_per_hour ?? '—';
  const p0dTenants = p0dSummary.active_tenants ?? '—';
  const p0dBacklog = p0dSummary.backlog ?? '—';
  const p0dHealth = p0dSummary.runtime_health ?? '—';

  const p0ePass = goLiveP0E?.pass ? 'PASS' : 'MONITOR';
  const p0eSummary = goLiveP0E?.summary ?? {};
  const p0eActivation = p0eSummary.activation_status ?? '—';
  const p0eUptime = p0eSummary.runtime_uptime_hours != null ? `${p0eSummary.runtime_uptime_hours}h` : '—';
  const p0eIoeHour = p0eSummary.ioe_per_hour ?? '—';
  const p0eDelHour = p0eSummary.deliveries_per_hour ?? '—';
  const p0eTenants = p0eSummary.active_tenants ?? '—';
  const p0eBacklog = p0eSummary.backlog ?? '—';
  const p0ePm2 = p0eSummary.pm2_health ?? '—';
  const p0eAccept = p0eSummary.acceptance_status ?? '—';

  // M1.14 — M2 Readiness Governance
  const m114Verdict = m114Governance?.verdict ?? '—';
  const m114Rec = m114Governance?.recommendation?.recommendation ?? m114Governance?.m2_gate_governance?.recommended_action;
  const m114RecLabel = m114Rec === 'open_m2_gate' ? 'OPEN M2' : (m114Rec === 'keep_gate_closed' ? 'KEEP CLOSED' : '—');
  const m114Deps = m114Governance?.dependencies?.m2_dependencies_satisfied;
  const m114Risks = m114Governance?.summary?.risk_profile ?? {};
  const m115Verdict = m115Closure?.verdict ?? '—';
  const m115Ready = m115Closure?.ready_for_remediation === true;
  const m116Verdict = m116Remediation?.verdict ?? '—';
  function m114RiskLevel(key) {
    const v = m114Risks[key];
    if (!v) return '—';
    return String(v).toUpperCase();
  }
  function m114RiskAccent(level) {
    if (level === 'LOW') return '--green';
    if (level === 'MEDIUM') return '--amber';
    if (level === 'HIGH') return '--red';
    return '--text-tertiary';
  }

  // M1.13 — Pilot Adoption Assessment
  const m113Verdict = m113Adoption?.verdict ?? '—';
  const m113Index = m113Adoption?.utilization?.pilot_utilization_index;
  const m113Adopted = m113Adoption?.utilization?.adopted_domains;
  const m113Diagnosis = m113Adoption?.tenant_adoption_gap
    ? 'ADOPTION GAP'
    : (m113Adoption?.platform_problem ? 'PLATFORM' : 'FULL');
  function m113Usage(key) {
    const v = m113Adoption?.utilization?.[`${key}_usage`];
    if (v === true) return 'YES';
    if (v === false) return 'NO';
    return '—';
  }
  function m113UsageAccent(v) {
    if (v === true) return '--green';
    if (v === false) return '--amber';
    return '--text-tertiary';
  }

  // M1.12 — Pilot Operational Closure (Environment + Maintenance blockers)
  const m112Closed = m112Closure?.pilot_operation_window_complete;
  const m112Verdict = m112Closed === true ? 'CLOSED' : (m112Closure ? 'BLOCKERS' : '—');
  const m112EnvOp = m112Closure?.environment_operational;
  const m112MaintOp = m112Closure?.maintenance_operational;
  const m112M2Open = m112Closure?.m2_gate_open;
  function m112OpStatus(v) {
    if (v === true) return 'OPERATIONAL';
    if (v === false) return 'NOT_OPERATIONAL';
    return '—';
  }
  function m112OpAccent(v) {
    if (v === true) return '--green';
    if (v === false) return '--red';
    return '--text-tertiary';
  }

  // M1.11 — Pilot Operation Window (real usage)
  const m111Complete = m111Operation?.pilot_operation_window_complete;
  const m111Verdict = m111Complete === true ? 'COMPLETE' : (m111Operation ? 'PARTIAL' : 'NOT_OPERATIONAL');
  const m111Summary = m111Operation?.summary ?? {};
  function m111DomainStatus(key) {
    const section = m111Operation?.[key];
    if (section?.status) return section.status;
    const crit = m111Operation?.[`${key}_operational`];
    if (crit === true) return 'OPERATIONAL';
    if (crit === false) return 'PARTIAL';
    return '—';
  }
  function m111DomainAccent(key) {
    const s = m111DomainStatus(key);
    if (s === 'OPERATIONAL') return '--green';
    if (s === 'PARTIAL') return '--amber';
    return '--text-tertiary';
  }
  function m111BoolStatus(v) {
    if (v === true) return 'OPERATIONAL';
    if (v === false) return 'PARTIAL';
    return '—';
  }
  function m111BoolAccent(v) {
    if (v === true) return '--green';
    if (v === false) return '--amber';
    return '--text-tertiary';
  }

  // M1.10 — Food Base Pilot Go-Live
  const m110Active = m110Pilot?.food_base_pilot_active;
  const m110Verdict = m110Active === true ? 'ACTIVE' : (m110Pilot ? 'PARTIAL' : 'NOT_ACTIVE');
  const m110Summary = m110Pilot?.summary ?? {};
  const m110Strategy = m110Pilot?.strategy?.strategy ?? '—';
  const m110TenantShort = m110Pilot?.tenant?.company_id?.slice(0, 8) ?? '511f4819';
  function m110Criterion(key) {
    const v = m110Pilot?.[key];
    if (v === true) return 'READY';
    if (v === false) return 'PARTIAL';
    return '—';
  }
  function m110CriterionAccent(key) {
    const v = m110Pilot?.[key];
    if (v === true) return '--green';
    if (v === false) return '--amber';
    return '--text-tertiary';
  }

  // M1.9 — Pilot Execution Dry Run (Fresh & Fit proxy)
  const m19PilotReady = m19DryRun?.pilot_execution_ready;
  const m19Verdict = m19PilotReady === true ? 'READY' : (m19DryRun ? 'PARTIAL' : 'NOT_READY');
  const m19Summary = m19DryRun?.summary ?? {};
  const m19TenantShort = m19DryRun?.company_id?.slice(0, 8) ?? '511f4819';
  function m19JourneyComplete(key) {
    const v = m19DryRun?.[`${key}_journey_complete`];
    if (v === true) return 'READY';
    if (v === false) return 'PARTIAL';
    return '—';
  }
  function m19JourneyAccent(key) {
    const v = m19DryRun?.[`${key}_journey_complete`];
    if (v === true) return '--green';
    if (v === false) return '--amber';
    return '--text-tertiary';
  }
  function m19BoolAccent(v) { return v === true ? '--green' : (v === false ? '--amber' : '--text-tertiary'); }

  // M1.8 — Food Base Go-Live Readiness
  const m18GoLive = m18FoodBase?.food_base_ready_for_go_live;
  const m18Verdict = m18GoLive === true ? 'READY' : (m18FoodBase ? 'PARTIAL' : 'NOT_READY');
  const m18Summary = m18FoodBase?.summary ?? {};
  function m18DimReady(key) {
    const v = m18FoodBase?.[`${key}_ready`];
    if (v === true) return 'READY';
    if (v === false) return 'NOT_READY';
    return '—';
  }
  function m18DimAccent(key) {
    return m18FoodBase?.[`${key}_ready`] === true ? '--green' : (m18FoodBase?.[`${key}_ready`] === false ? '--amber' : '--text-tertiary');
  }

  // M1.7 — Pilot Readiness Simulation
  const m17PilotReady = m17Readiness?.pilot_ready;
  const m17Summary = m17Readiness?.summary ?? {};
  const m17UserJourney = m17Readiness?.user_journey_complete;
  const m17CrossDomain = m17Readiness?.cross_domain_flow_complete;
  const m17ExecVis = m17Readiness?.executive_visibility_complete;
  const m17Verdict = m17PilotReady === true ? 'READY' : (m17Readiness ? 'PARTIAL' : 'NOT_READY');
  function m17ScenarioStatus(key) {
    const v = m17Readiness?.[`${key}_journey_complete`];
    if (v === true) return 'READY';
    if (m17Readiness?.[key]?.status) return m17Readiness[key].status;
    return 'NOT_READY';
  }
  function m17Accent(key) {
    const s = m17ScenarioStatus(key);
    if (s === 'READY') return '--green';
    if (s === 'PARTIAL') return '--amber';
    return '--text-tertiary';
  }
  function m17BoolAccent(v) { return v === true ? '--green' : (v === false ? '--amber' : '--text-tertiary'); }

  // M1.6 — Production Domain Operational Validation
  const m16Scores = m16Validation?.scores ?? {};
  const m16Summary = m16Validation?.summary ?? {};
  const m16Verdict = m16Validation?.pass ? 'VALIDATED' : (m16Validation ? 'PARTIAL' : 'NOT_VALIDATED');
  function m16DomainStatus(key) {
    const v = m16Scores[`${key}_operational`];
    if (v === true) return 'VALIDATED';
    if (v === false) return 'PARTIAL';
    return 'NOT_VALIDATED';
  }
  function m16Accent(key) {
    const s = m16DomainStatus(key);
    if (s === 'VALIDATED') return '--green';
    if (s === 'PARTIAL') return '--amber';
    return '--text-tertiary';
  }

  return (
    <div className="impetus-card aioi-scale__card">
      <div className="aioi-scale__header">
        <div className="aioi-scale__header-left">
          <Layers size={14} style={{ color: 'var(--cyan)' }} />
          <span className="aioi-scale__title">AIOI HORIZONTAL SCALE</span>
          <span className="aioi-scale__mode">P0A · READ ONLY</span>
        </div>
        <span className="aioi-scale__badge" style={{ color: healthColor, borderColor: healthColor }}>
          {clusterHealthStatus}
        </span>
      </div>

      <div className="aioi-scale__section-label">INDUSTRIAL DOMAIN FOUNDATION (M1)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="MES" value="FOUNDATION_READY" accent="--cyan" />
        <ScaleTile label="LOGISTICS" value="FOUNDATION_READY" accent="--cyan" />
        <ScaleTile label="ANALYTICS" value="FOUNDATION_READY" accent="--cyan" />
      </div>
      <div className="aioi-scale__info-row">
        <Activity size={12} style={{ color: 'var(--cyan)' }} />
        <span>
          M1 · bounded contexts · /api/mes · /api/logistics · /api/analytics
        </span>
      </div>

      <div className="aioi-scale__section-label">GO-LIVE MONITORING (READ ONLY)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="P0E" value={p0ePass} accent={p0ePass === 'PASS' ? '--green' : '--amber'} />
        <ScaleTile label="Activation" value={p0eActivation} accent={p0eActivation === 'LIVE' ? '--green' : '--amber'} />
        <ScaleTile label="Uptime" value={p0eUptime} accent="--cyan" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="IOE/h" value={p0eIoeHour} accent="--cyan" />
        <ScaleTile label="Del/h" value={p0eDelHour} accent="--text-secondary" />
        <ScaleTile label="Tenants" value={p0eTenants} accent="--cyan" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Backlog" value={p0eBacklog} accent={p0eBacklog === 0 ? '--green' : '--amber'} />
        <ScaleTile label="PM2" value={p0ePm2} accent={p0ePm2 === 'OK' ? '--green' : '--amber'} />
        <ScaleTile label="Acceptance" value={p0eAccept} accent={p0eAccept === 'ACCEPTED' ? '--green' : '--amber'} />
      </div>
      <div className="aioi-scale__info-row">
        <Activity size={12} style={{ color: p0ePass === 'PASS' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          P0E · go-live produção · GET /api/operations/golive/*
        </span>
      </div>

      <div className="aioi-scale__section-label">CONTINUOUS RUNTIME STABILIZATION (READ ONLY)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="P0D" value={p0dPass} accent={p0dPass === 'PASS' ? '--green' : '--red'} />
        <ScaleTile label="Runtime" value={p0dRuntime} accent={p0dRuntime === 'RUNNING' ? '--green' : '--amber'} />
        <ScaleTile label="Workers" value={p0dWorkers} accent={p0dWorkers === 'ON' ? '--green' : '--amber'} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="IOE/h" value={p0dIoeHour} accent="--cyan" />
        <ScaleTile label="Del/h" value={p0dDelHour} accent="--text-secondary" />
        <ScaleTile label="Tenants" value={p0dTenants} accent="--cyan" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Backlog" value={p0dBacklog} accent={p0dBacklog === 0 ? '--green' : '--amber'} />
        <ScaleTile label="Health" value={p0dHealth} accent={p0dHealth === 'OK' ? '--green' : '--amber'} />
        <ScaleTile label="Window" value="24h" accent="--text-secondary" />
      </div>
      <div className="aioi-scale__info-row">
        <Server size={12} style={{ color: p0dPass === 'PASS' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          P0D · estabilização runtime · GET /api/operations/runtime/*
        </span>
      </div>

      <div className="aioi-scale__section-label">ACTIVE CONTINUOUS OPERATION (READ ONLY)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="P0C" value={p0cPass} accent={p0cPass === 'PASS' ? '--green' : '--red'} />
        <ScaleTile label="IOE/h" value={p0cIoeHour} accent="--cyan" />
        <ScaleTile label="New events" value={p0cNewEvents} accent={p0cNewEvents > 0 ? '--green' : '--amber'} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Workers" value={p0cWorkers} accent={p0cWorkers === 'ON' ? '--green' : '--amber'} />
        <ScaleTile label="Tenants" value={p0cTenants} accent="--cyan" />
        <ScaleTile label="Outbox" value={p0cOutbox} accent="--text-secondary" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Runtime" value={p0cRuntime} accent={p0cRuntime === 'RUNNING' ? '--green' : '--amber'} />
        <ScaleTile label="Verdict" value={activeOpP0C?.verdict?.replace('ACTIVE_CONTINUOUS_OPERATION_', '') ?? '—'} accent={p0cPass === 'PASS' ? '--green' : '--amber'} />
        <ScaleTile label="Reason" value={p0cReason === '—' ? '—' : p0cReason.slice(0, 12)} accent="--text-secondary" />
      </div>
      <div className="aioi-scale__info-row">
        <AlertTriangle size={12} style={{ color: p0cPass === 'PASS' ? 'var(--green)' : 'var(--amber)' }} />
        <span>
          P0C · validação activa · GET /api/operations/active/*
        </span>
      </div>

      <div className="aioi-scale__section-label">CONTINUOUS OPERATION OBSERVATION (READ ONLY)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Observation" value={p0bObsStatus} accent={p0bObsStatus === 'ACTIVE' ? '--green' : '--amber'} />
        <ScaleTile label="IOE/h" value={p0bIoeHour} accent="--cyan" />
        <ScaleTile label="IOE/day" value={p0bIoeDay} accent="--cyan" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Tenants" value={p0bTenants} accent="--cyan" />
        <ScaleTile label="Outbox" value={p0bOutboxRate} accent="--text-secondary" />
        <ScaleTile label="Workflows" value={p0bWfActivity} accent="--text-secondary" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="TRI-AI" value={p0bTriAi} accent={p0bTriAi === 'OK' ? '--green' : '--amber'} />
        <ScaleTile label="PM2" value={p0bPm2} accent={p0bPm2 === 'online' ? '--green' : '--amber'} />
        <ScaleTile label="Window" value="7d" accent="--text-secondary" />
      </div>
      <div className="aioi-scale__info-row">
        <Activity size={12} style={{ color: p0bObsStatus === 'ACTIVE' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          P0B · observação contínua · GET /api/operations/observation/*
        </span>
      </div>

      <div className="aioi-scale__section-label">CONTINUOUS OPERATION (READ ONLY)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Activation" value={p0aReady} accent={p0aReady === 'READY' ? '--green' : '--amber'} />
        <ScaleTile label="IOE/h" value={p0aIoeHour} accent="--cyan" />
        <ScaleTile label="Outbox rate" value={p0aOutboxRate} accent="--text-secondary" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Tenants" value={p0aTenants} accent="--cyan" />
        <ScaleTile label="PLC/h" value={p0aPlcRate} accent={p0aPlcRate !== '—' && p0aPlcRate > 0 ? '--green' : '--text-secondary'} />
        <ScaleTile label="Workflows" value={p0aWfRunning} accent="--text-secondary" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Queue" value={p0aQueueOk} accent={p0aQueueOk === 'OK' ? '--green' : '--amber'} />
        <ScaleTile label="Workers" value={continuousOpP0A?.workers_enabled ? 'ON' : 'OFF'} accent={continuousOpP0A?.workers_enabled ? '--green' : '--amber'} />
        <ScaleTile label="Pipeline" value={continuousOpP0A?.pipeline_enabled ? 'ON' : 'OFF'} accent={continuousOpP0A?.pipeline_enabled ? '--green' : '--amber'} />
      </div>
      <div className="aioi-scale__info-row">
        <Activity size={12} style={{ color: 'var(--text-tertiary)' }} />
        <span>
          P0A · IOE contínuo preparado · workers {continuousOpP0A?.workers_enabled ? 'activos' : 'desactivados (operador)'} · GET /api/operations/continuous/*
        </span>
      </div>

      <div className="aioi-scale__section-label">TRUTH PROGRAM CLOSURE (READ ONLY)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Program" value={truthProgramClosed} accent={truthProgramClosed === 'CLOSED' ? '--green' : '--amber'} />
        <ScaleTile label="F47 Truth" value={f47TruthStatus} accent={f47TruthStatus === 'certified' ? '--green' : '--text-secondary'} />
        <ScaleTile label="F48 Stress" value={f48StressStatus} accent={f48StressStatus === 'certified' ? '--green' : '--text-secondary'} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="F49 Ops" value={f49OpsStatus} accent={f49OpsStatus === 'PASS' ? '--green' : '--text-secondary'} />
        <ScaleTile label="TRI-AI" value={triAiClosure} accent={triAiClosure === 'OPERATIONAL' ? '--green' : '--amber'} />
        <ScaleTile label="Production" value={productionValidated} accent={productionValidated === 'COMPLETE' ? '--green' : '--text-secondary'} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Closure" value={closureVerdict} accent={closureVerdict === 'CLOSED' ? '--green' : '--amber'} />
        <ScaleTile label="CEO Session" value={truthClosureF49?.f49_ceo_session ?? '—'} accent={truthClosureF49?.f49_ceo_session === 'pass' ? '--green' : '--text-secondary'} />
        <ScaleTile label="Gemini" value={truthClosureF49?.f49_gemini_certification ?? '—'} accent={truthClosureF49?.f49_gemini_certification === 'pass' ? '--green' : '--text-secondary'} />
      </div>
      <div className="aioi-scale__info-row">
        <ShieldCheck size={12} style={{ color: truthProgramClosed === 'CLOSED' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          F49-F · {truthClosureF49?.registered_phases ?? '—'}/8 fases · GET /api/f49/closure/*
        </span>
      </div>

      <div className="aioi-scale__section-label">F49 GEMINI READINESS (READ ONLY)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Gemini" value={geminiLive} accent={geminiLive === 'UP' ? '--green' : geminiLive === 'DEGRADED' ? '--amber' : '--red'} />
        <ScaleTile label="Vision" value={geminiVisionHint} accent={geminiLive === 'UP' ? '--green' : '--text-secondary'} />
        <ScaleTile label="TRI-AI" value={triAiReady} accent={triAiReady === 'READY' ? '--green' : '--amber'} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Readiness" value={`${f49ReadinessScore}%`} accent="--cyan" />
        <ScaleTile label="Ping" value={geminiLatency} accent="--text-secondary" />
        <ScaleTile label="OpenAI" value={triAiF49?.openai ? 'UP' : '—'} accent={triAiF49?.openai ? '--green' : '--text-secondary'} />
      </div>
      <div className="aioi-scale__info-row">
        <Activity size={12} style={{ color: 'var(--text-tertiary)' }} />
        <span>
          F49-D · Anthropic {triAiF49?.anthropic ? 'UP' : '—'} · Gemini {triAiF49?.gemini ? 'UP' : '—'} · GET /api/f49/gemini/*
        </span>
      </div>

      <div className="aioi-scale__section-label">HISTORICAL CLOSURE (P1S)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Closure" value={closureStatusVal} accent={closureStatusVal === 'CLOSED' ? '--green' : '--amber'} />
        <ScaleTile label="Archive" value={archiveStatusVal} accent={archiveStatusVal === 'ARCHIVED' ? '--green' : '--amber'} />
        <ScaleTile label="Milestone" value={milestoneStatusVal} accent={milestoneStatusVal === 'CERTIFIED' ? '--green' : '--amber'} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Soak" value={soakP1S} accent={soakP1S === 'PASS' ? '--green' : '--text-secondary'} />
        <ScaleTile label="Cycles" value={soakCyclesP1S} accent="--cyan" />
        <ScaleTile label="Archive ID" value={archiveId.replace('IMPETUS-AIOI-', '')} accent="--cyan" />
      </div>
      <div className="aioi-scale__info-row">
        <ShieldCheck size={12} style={{ color: p1sVerdict === 'PASS' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          P1S {p1sVerdict} · soak {soakCyclesP1S} cycles · Linha P1 fechada · P1A→P1R
        </span>
      </div>

      <div className="aioi-scale__section-label">ENTERPRISE RELEASE (P1R)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Release" value={releaseRegStatus} accent={releaseRegStatus === 'ACCEPTED' ? '--green' : '--amber'} />
        <ScaleTile label="Acceptance" value={acceptanceStatus} accent={acceptanceStatus === 'ACCEPTED' ? '--green' : '--amber'} />
        <ScaleTile label="Governance" value={governanceStatusRelease} accent={governanceStatusRelease === 'VALID' ? '--green' : '--amber'} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Readiness" value={readinessStatusRelease} accent={readinessStatusRelease === 'READY' ? '--green' : '--amber'} />
        <ScaleTile label="Release ID" value={releaseId.replace('IMPETUS-AIOI-P1-', '')} accent="--cyan" />
        <ScaleTile label="Soak" value={soakP1R} accent={soakP1R === 'PASS' ? '--green' : '--text-secondary'} />
      </div>
      <div className="aioi-scale__info-row">
        <ShieldCheck size={12} style={{ color: p1rVerdict === 'PASS' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          P1R {p1rVerdict} · soak {soakCyclesP1R} cycles · Linha P1 · P1A→P1Q
        </span>
      </div>

      <div className="aioi-scale__section-label">RECOVERY & CONTINUITY (P1Q)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Recovery" value={recoveryOk} accent={recoveryOk === 'RECOVERABLE' ? '--green' : '--amber'} />
        <ScaleTile label="Rebuild" value={rebuildOk} accent={rebuildOk === 'REBUILDABLE' ? '--green' : '--amber'} />
        <ScaleTile label="Continuity" value={continuityOk} accent={continuityOk === 'CERTIFIED' ? '--green' : '--amber'} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Audit chain" value={auditChainRecovery} accent={auditChainRecovery === 'OK' ? '--green' : '--amber'} />
        <ScaleTile label="Soak" value={soakP1Q} accent={soakP1Q === 'PASS' ? '--green' : '--text-secondary'} />
        <ScaleTile label="Chain" value={`${certChainPhases}/${certChainTotal}`} accent="--cyan" />
      </div>
      <div className="aioi-scale__info-row">
        <ShieldCheck size={12} style={{ color: p1qVerdict === 'PASS' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          P1Q {p1qVerdict} · soak {soakCyclesP1Q} cycles · baseline P1A→P1Q
        </span>
      </div>

      <div className="aioi-scale__section-label">BASELINE ASSURANCE (P1P)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Assurance" value={assuranceOk} accent={assuranceOk === 'ASSURED' ? '--green' : '--amber'} />
        <ScaleTile label="Preservation" value={preservationOk} accent={preservationOk === 'PRESERVED' ? '--green' : '--red'} />
        <ScaleTile label="Consistency" value={consistencyOkP1P} accent={consistencyOkP1P === 'OK' ? '--green' : '--amber'} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Traceability" value={traceOk} accent={traceOk === 'OK' ? '--green' : '--amber'} />
        <ScaleTile label="Soak" value={soakP1P} accent={soakP1P === 'PASS' ? '--green' : '--text-secondary'} />
        <ScaleTile label="Chain" value={`${certChainPhases}/${certChainTotal}`} accent="--cyan" />
      </div>
      <div className="aioi-scale__info-row">
        <ShieldCheck size={12} style={{ color: p1pVerdict === 'PASS' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          P1P {p1pVerdict} · soak {soakCyclesP1P} cycles · baseline P1A→P1Q
        </span>
      </div>

      <div className="aioi-scale__section-label">ENTERPRISE BASELINE (P1O)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Version" value={baselineVersion} accent="--cyan" />
        <ScaleTile label="Baseline" value={baselineRegStatus} accent={baselineRegStatus === 'REGISTERED' ? '--green' : '--amber'} />
        <ScaleTile label="Freeze" value={freezeStatus} accent={freezeStatus === 'FROZEN' ? '--green' : '--amber'} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Repro" value={reproOk} accent={reproOk === 'YES' ? '--green' : '--amber'} />
        <ScaleTile label="Cert chain" value={`${certChainPhases}/${certChainTotal}`} accent="--cyan" />
        <ScaleTile label="Audit chain" value={auditChainOk} accent={auditChainOk === 'OK' ? '--green' : '--amber'} />
      </div>
      <div className="aioi-scale__info-row">
        <ShieldCheck size={12} style={{ color: p1oVerdict === 'PASS' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          P1O {p1oVerdict} · baseline P1A→P1Q · governance only
        </span>
      </div>

      <div className="aioi-scale__section-label">COMPLIANCE & INTEGRITY (P1N)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Integrity" value={`${integrityScore}%`} accent={integrityScore === 100 ? '--green' : '--amber'} />
        <ScaleTile label="Compliance" value={`${complianceScore}%`} accent={complianceScore === 100 ? '--green' : '--amber'} />
        <ScaleTile label="Drift" value={certDrift} accent={certDrift === 'OK' ? '--green' : '--red'} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Chain" value={`${chainPresent}/${chainTotal}`} accent="--cyan" />
        <ScaleTile label="Docs" value={docConsistent} accent={docConsistent === 'OK' ? '--green' : '--amber'} />
        <ScaleTile label="Soak" value={soakCompleted} accent={soakCompleted === 'PASS' ? '--green' : '--text-secondary'} />
      </div>
      <div className="aioi-scale__info-row">
        <ShieldCheck size={12} style={{ color: p1nVerdict === 'PASS' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          P1N {p1nVerdict} · soak {soakCyclesP1N} cycles · observation only
        </span>
      </div>

      <div className="aioi-scale__section-label">RUNTIME AUTHORIZATION (P1M)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Runtime auth" value={authRuntime} accent="--green" />
        <ScaleTile label="Pending" value={authPending} accent="--amber" />
        <ScaleTile label="Audit" value={authAuditOk} accent="--cyan" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Expired" value={authExpired} accent="--text-secondary" />
        <ScaleTile label="Policies" value={authStatus?.policies?.length ?? 0} accent="--cyan" />
        <ScaleTile label="History" value={authHistory?.total ?? 0} accent="--text-secondary" />
      </div>

      <div className="aioi-scale__section-label">OPERATIONAL CERTIFICATION (P1L)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Dataset" value={datasetOk} accent={operationalDataset?.dataset_certified ? '--green' : '--amber'} />
        <ScaleTile label="Consistency" value={consistencyOk} accent={operationalConsistency?.consistency_certified ? '--green' : '--amber'} />
        <ScaleTile label="Shadow" value={operationalCert?.shadow?.behavior_match ? 'MATCH' : '—'} accent="--cyan" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Workload evt" value={workloadEvents} accent="--cyan" />
        <ScaleTile label="OPS soak" value={soakCycles} accent="--text-secondary" />
        <ScaleTile label="Load p95" value={`${operationalCert?.load?.latency_p95 ?? 0}ms`} accent="--green" />
      </div>

      <div className="aioi-scale__section-label">DEPLOYMENT GOVERNANCE (P1K)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Eligible" value={deployEligible} accent={deployment?.eligible ? '--green' : '--amber'} />
        <ScaleTile label="Approval" value={approvalStatus} accent="--cyan" />
        <ScaleTile label="Rollout audit" value={deployment?.rollout_audit?.audit_pass ? 'PASS' : '—'} accent="--text-secondary" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Rollouts" value={rolloutCount} accent="--cyan" />
        <ScaleTile label="Rollbacks" value={rollbackCount} accent="--text-secondary" />
        <ScaleTile label="Trend" value={readinessTrend.toUpperCase()} accent="--green" />
      </div>

      <div className="aioi-scale__section-label">PRODUCTION READINESS (P1J)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Readiness" value={`${readinessScore}%`} accent="--cyan" />
        <ScaleTile label="Prod ready" value={overallReady} accent={readiness?.overall_ready ? '--green' : '--amber'} />
        <ScaleTile label="Audit" value={prodReady} accent={productionAudit?.ready_for_production ? '--green' : '--amber'} />
      </div>

      <div className="aioi-scale__section-label">CERTIFICATION & RISK</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Baseline" value={`${chainPresent}/${chainTotal}`} accent={chainPresent === chainTotal ? '--green' : '--amber'} />
        <ScaleTile label="P1J reg" value={`${certCount}/${p1jRegistryTotal}`} accent="--text-secondary" />
        <ScaleTile label="Risk" value={overallRisk} accent="--text-secondary" />
      </div>
      <div className="aioi-scale__info-row">
        <ShieldCheck size={12} style={{ color: riskColor }} />
        <span>
          Runtime {risk?.runtime_risk ?? '—'} · Capacity {risk?.capacity_risk ?? '—'} · Recovery {risk?.recovery_risk ?? '—'}
        </span>
      </div>

      <div className="aioi-scale__section-label">CLUSTER HEALTH (P1I)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Health" value={clusterHealthStatus} accent="--cyan" />
        <ScaleTile label="Workers" value={capacity?.current_workers ?? distFlags.IMPETUS_AIOI_WORKER_COUNT ?? 1} accent="--text-secondary" />
        <ScaleTile label="Headroom" value={`${capacity?.headroom_percent ?? 0}%`} accent="--green" />
      </div>

      <div className="aioi-scale__section-label">INVENTORY</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Worker inv" value={workerInventory.length} accent="--cyan" />
        <ScaleTile label="Shard inv" value={shardInventory.length} accent="--text-secondary" />
        <ScaleTile label="Lease inv" value={leaseInventory.length} accent="--green" />
      </div>

      <div className="aioi-scale__section-label">CAPACITY FORECAST</div>
      <div className="aioi-scale__tiles">
        <ScaleTile label="Tenants" value={capacity?.current_tenants ?? 0} accent="--cyan" />
        <ScaleTile label="Rec. workers" value={capacity?.recommended_workers ?? 1} accent="--text-secondary" />
        <ScaleTile label="Rec. shards" value={capacity?.recommended_shards ?? 1} accent="--text-secondary" />
        <ScaleTile label="Rec. status" value={capacity?.headroom_status ?? '—'} accent="--amber" />
      </div>

      <div className="aioi-scale__section-label">DISTRIBUTED RUNTIME (P1H)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile
          label="Distributed"
          value={distFlags.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE ? 'ON' : 'OFF'}
          accent={distFlags.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE ? '--amber' : '--green'}
        />
        <ScaleTile label="Workers" value={distFlags.IMPETUS_AIOI_WORKER_COUNT ?? 1} accent="--cyan" />
        <ScaleTile label="Worker ID" value={distFlags.IMPETUS_AIOI_WORKER_ID ?? 0} accent="--text-secondary" />
      </div>

      <div className="aioi-scale__section-label">ACTIVATION FLAGS (P1G)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile
          label="Registry"
          value={flags.IMPETUS_AIOI_REGISTRY_ACTIVE ? 'ON' : 'OFF'}
          accent={flags.IMPETUS_AIOI_REGISTRY_ACTIVE ? '--amber' : '--green'}
        />
        <ScaleTile
          label="Parallel"
          value={flags.IMPETUS_AIOI_PARALLEL_TENANT_EXECUTION ? 'ON' : 'OFF'}
          accent={flags.IMPETUS_AIOI_PARALLEL_TENANT_EXECUTION ? '--amber' : '--green'}
        />
        <ScaleTile
          label="Ownership"
          value={flags.IMPETUS_AIOI_OWNERSHIP_RUNTIME_ACTIVE ? 'ON' : 'OFF'}
          accent={flags.IMPETUS_AIOI_OWNERSHIP_RUNTIME_ACTIVE ? '--amber' : '--green'}
        />
      </div>

      <div className="aioi-scale__section-label">REGISTRY RUNTIME</div>
      <div className="aioi-scale__tiles">
        <ScaleTile label="Source" value={(resolution.source || 'PILOT').replace('IMPETUS_AIOI_', '')} accent="--cyan" />
        <ScaleTile label="Tenants" value={resolution.tenants?.length ?? 0} accent="--text-secondary" />
        <ScaleTile
          label="Fallback"
          value={resolution.fallback_used ? 'YES' : 'NO'}
          accent={resolution.fallback_used ? '--amber' : '--green'}
        />
        <ScaleTile
          label="P1F"
          value={valCriteria.horizontal_runtime_validation_pass ? 'PASS' : '—'}
          accent="--text-secondary"
        />
      </div>

      <div className="aioi-scale__section-label">SHARD DISTRIBUTION & FAILOVER</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Shards" value={distOwnership.shard_count ?? ownership.shard_count ?? 1} accent="--cyan" />
        <ScaleTile
          label="Owned"
          value={(distOwnership.owned_shards || ownership.owned_shards || []).join(',') || '0'}
          accent="--green"
        />
        <ScaleTile
          label="Failover"
          value={failover.lease_recovered ? 'OK' : '—'}
          accent={failover.lease_recovered ? '--green' : '--text-secondary'}
        />
      </div>

      <div className="aioi-scale__section-label">BENCHMARK & SOAK</div>
      <div className="aioi-scale__info-row">
        <Network size={12} style={{ color: 'var(--text-tertiary)' }} />
        <span>
          2w eps: {distBench.two_workers?.throughput_eps ?? 0} ·
          4w: {distBench.four_workers?.throughput_eps ?? 0} ·
          8w: {distBench.eight_workers?.throughput_eps ?? 0}
        </span>
      </div>
      <div className="aioi-scale__info-row">
        <GitBranch size={12} style={{ color: 'var(--text-tertiary)' }} />
        <span>
          Seq p95: {parBench.sequential?.latency_p95_ms ?? 0}ms ·
          Par p95: {parBench.parallel?.latency_p95_ms ?? 0}ms
        </span>
      </div>
      <div className="aioi-scale__info-row">
        <Database size={12} style={{ color: 'var(--text-tertiary)' }} />
        <span>
          Dist soak: {distSoak.cycles ?? 0} · conflicts: {distSoak.ownership_conflicts ?? 0}
        </span>
      </div>
      <div className="aioi-scale__info-row">
        <Key size={12} style={{ color: 'var(--text-tertiary)' }} />
        <span>
          Conflicts: own {soak.ownership_conflicts ?? 0} · lease {soak.lease_conflicts ?? 0}
        </span>
      </div>
      <div className="aioi-scale__info-row">
        <Server size={12} style={{ color: 'var(--text-tertiary)' }} />
        <span>P1A lock preserved · workers: {flags.IMPETUS_AIOI_WORKER_COUNT ?? 1}</span>
      </div>
      <div className="aioi-scale__info-row">
        <Activity size={12} style={{ color: 'var(--text-tertiary)' }} />
        <span>
          Throughput seq: {parBench.sequential?.throughput_eps ?? 0} eps
        </span>
      </div>

      <div className="aioi-scale__section-label">PILOT ADOPTION CLOSURE ASSESSMENT (M1.17)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile
          label="ADOPTION"
          value={m117AdoptionClosure?.adoption_verdict === 'PILOT_ADOPTION_COMPLETE' ? 'COMPLETE' : (m117AdoptionClosure?.adoption_verdict === 'PILOT_ADOPTION_PENDING' ? 'PENDING' : '—')}
          accent={m117AdoptionClosure?.adoption_verdict === 'PILOT_ADOPTION_COMPLETE' ? '--green' : '--amber'}
        />
        <ScaleTile
          label="UTILIZATION"
          value={m117AdoptionClosure ? `${m117AdoptionClosure.pilot_utilization_index ?? '—'}%` : '—'}
          accent={m117AdoptionClosure?.pilot_utilization_index >= 100 ? '--green' : '--amber'}
        />
        <ScaleTile
          label="DOMAINS"
          value={m117AdoptionClosure ? `${m117AdoptionClosure.adopted_domains ?? '—'}/${m117AdoptionClosure.available_domains ?? 6}` : '—'}
          accent={m117AdoptionClosure?.adopted_domains === 6 ? '--green' : '--amber'}
        />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile
          label="ENVIRONMENT"
          value={m117AdoptionClosure?.environment_adoption_confirmed === true ? 'ADOPTED' : (m117AdoptionClosure?.environment_adoption_confirmed === false ? 'PENDING' : '—')}
          accent={m117AdoptionClosure?.environment_adoption_confirmed ? '--green' : '--amber'}
        />
        <ScaleTile
          label="MAINTENANCE"
          value={m117AdoptionClosure?.maintenance_adoption_confirmed === true ? 'ADOPTED' : (m117AdoptionClosure?.maintenance_adoption_confirmed === false ? 'PENDING' : '—')}
          accent={m117AdoptionClosure?.maintenance_adoption_confirmed ? '--green' : '--amber'}
        />
        <ScaleTile
          label="M2 GATE"
          value={m117AdoptionClosure?.m2_gate_open === true ? 'OPEN' : (m117AdoptionClosure?.m2_gate_open === false ? 'PENDING' : '—')}
          accent={m117AdoptionClosure?.m2_gate_open ? '--cyan' : '--amber'}
        />
      </div>
      <div className="aioi-scale__info-row">
        <ShieldCheck size={12} style={{ color: m117AdoptionClosure?.pass ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>M1.17 · adoption closure · GET /api/m1/pilot-adoption-closure/status</span>
      </div>

      <div className="aioi-scale__section-label">CRITICAL REMEDIATION (M1.16)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="VERDICT" value={m116Verdict === 'M1_PLATFORM_FULLY_OPERATIONAL' ? 'OPERATIONAL' : m116Verdict} accent={m116Remediation?.pass ? '--green' : '--amber'} />
        <ScaleTile label="RBAC" value={m116Remediation?.financial_rbac_unified ? 'UNIFIED' : '—'} accent={m116Remediation?.financial_rbac_unified ? '--green' : '--amber'} />
        <ScaleTile label="F48 Denial" value={m116Remediation?.financial_empty_responses_eliminated ? 'SAFE' : '—'} accent={m116Remediation?.financial_empty_responses_eliminated ? '--green' : '--amber'} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Production" value={m116Remediation?.production_runtime_promoted ? 'ACTIVE' : '—'} accent={m116Remediation?.production_runtime_promoted ? '--green' : '--amber'} />
        <ScaleTile label="Quality" value={m116Remediation?.quality_bridge_promoted ? 'ACTIVE' : '—'} accent={m116Remediation?.quality_bridge_promoted ? '--green' : '--amber'} />
        <ScaleTile label="Regression" value={m116Remediation?.regression_validation_passed ? 'PASS' : '—'} accent={m116Remediation?.regression_validation_passed ? '--green' : '--red'} />
      </div>
      <div className="aioi-scale__info-row">
        <ShieldCheck size={12} style={{ color: m116Remediation?.pass ? 'var(--green)' : 'var(--amber)' }} />
        <span>M1.16 · remediation · GET /api/m1/critical-remediation/status</span>
      </div>

      <div className="aioi-scale__section-label">PLATFORM CLOSURE AUDIT (M1.15)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="VERDICT" value={m115Verdict === 'M1_15_CRITICAL_FINDINGS_IDENTIFIED' ? 'FINDINGS' : m115Verdict} accent={m115Closure?.pass ? '--amber' : '--text-secondary'} />
        <ScaleTile label="F48 RCA" value={m115Closure?.financial_f48_root_cause_identified ? 'OK' : '—'} accent={m115Closure?.financial_f48_root_cause_identified ? '--green' : '--amber'} />
        <ScaleTile label="Remediation" value={m115Ready ? 'READY' : '—'} accent={m115Ready ? '--cyan' : '--text-secondary'} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="AIOI Worker" value={m115Closure?.aioi?.worker_operational ? 'OK' : '—'} accent={m115Closure?.aioi?.worker_operational ? '--green' : '--amber'} />
        <ScaleTile label="Telemetry" value={m115Closure?.telemetry?.telemetry_diagnosis ?? '—'} accent="--cyan" />
        <ScaleTile label="Shadow" value={m115Closure?.shadow?.production_runtime_shadow ? 'PROD' : '—'} accent={m115Closure?.shadow?.quality_bridge_shadow ? '--amber' : '--green'} />
      </div>
      <div className="aioi-scale__info-row">
        <ShieldCheck size={12} style={{ color: m115Closure?.pass ? 'var(--amber)' : 'var(--text-tertiary)' }} />
        <span>M1.15 · root cause only · GET /api/m1/platform-closure/status</span>
      </div>

      <div className="aioi-scale__section-label">M2 READINESS GOVERNANCE (M1.14)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="GOVERNANCE" value={m114Verdict === 'M2_GOVERNANCE_DECISION_READY' ? 'READY' : (m114Verdict === 'M2_GOVERNANCE_ASSESSMENT_PARTIAL' ? 'PARTIAL' : '—')} accent={m114Governance?.pass ? '--green' : '--amber'} />
        <ScaleTile label="Recommend" value={m114RecLabel} accent={m114Rec === 'open_m2_gate' ? '--green' : '--amber'} />
        <ScaleTile label="M2 Deps" value={m114Deps === true ? 'OK' : (m114Deps === false ? 'BLOCK' : '—')} accent={m114Deps ? '--green' : '--amber'} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Tech Risk" value={m114RiskLevel('technical')} accent={m114RiskAccent(m114RiskLevel('technical'))} />
        <ScaleTile label="Adopt Risk" value={m114RiskLevel('adoption')} accent={m114RiskAccent(m114RiskLevel('adoption'))} />
        <ScaleTile label="Biz Risk" value={m114RiskLevel('business')} accent={m114RiskAccent(m114RiskLevel('business'))} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Platform" value={m114Governance?.platform_ready ? 'READY' : 'NO'} accent={m114Governance?.platform_ready ? '--green' : '--amber'} />
        <ScaleTile label="Adopt Gap" value={m114Governance?.adoption_gap_identified ? 'YES' : 'NO'} accent={m114Governance?.adoption_gap_identified ? '--amber' : '--green'} />
        <ScaleTile label="Phase" value="M1.14" accent="--cyan" />
      </div>
      <div className="aioi-scale__info-row">
        <Activity size={12} style={{ color: m114Governance?.pass ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          M1.14 · M2 governance · GET /api/m1/governance/status
        </span>
      </div>

      <div className="aioi-scale__section-label">PILOT ADOPTION ASSESSMENT (M1.13)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="VERDICT" value={m113Verdict === 'PLATFORM_READY_ADOPTION_PENDING' ? 'ADOPTION' : (m113Verdict === 'PILOT_FULLY_ADOPTED' ? 'FULL' : m113Verdict)} accent={m113Adoption?.pass ? '--green' : '--amber'} />
        <ScaleTile label="Index" value={m113Index != null ? `${m113Index}%` : '—'} accent={m113Index >= 66 ? '--green' : '--amber'} />
        <ScaleTile label="Diagnosis" value={m113Diagnosis} accent={m113Diagnosis === 'ADOPTION GAP' ? '--amber' : (m113Diagnosis === 'FULL' ? '--green' : '--red')} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Adopted" value={`${m113Adopted ?? '—'}/6`} accent="--cyan" />
        <ScaleTile label="Exec" value={m113Usage('executive')} accent={m113UsageAccent(m113Adoption?.utilization?.executive_usage)} />
        <ScaleTile label="Finance" value={m113Usage('financial')} accent={m113UsageAccent(m113Adoption?.utilization?.financial_usage)} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="HR" value={m113Usage('hr')} accent={m113UsageAccent(m113Adoption?.utilization?.hr_usage)} />
        <ScaleTile label="Safety" value={m113Usage('safety')} accent={m113UsageAccent(m113Adoption?.utilization?.safety_usage)} />
        <ScaleTile label="Env/Maint" value={`${m113Usage('environment')}/${m113Usage('maintenance')}`} accent="--amber" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Platform" value={m113Adoption?.platform_ready ? 'READY' : 'NOT'} accent={m113Adoption?.platform_ready ? '--green' : '--amber'} />
        <ScaleTile label="M2 Tech" value={m113Adoption?.m2_technical_readiness ? 'READY' : 'NO'} accent={m113Adoption?.m2_technical_readiness ? '--green' : '--amber'} />
        <ScaleTile label="Phase" value="M1.13" accent="--cyan" />
      </div>
      <div className="aioi-scale__info-row">
        <Activity size={12} style={{ color: m113Adoption?.pass ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          M1.13 · adoption vs platform · GET /api/m1/pilot-adoption/status
        </span>
      </div>

      <div className="aioi-scale__section-label">PILOT OPERATIONAL CLOSURE (M1.12)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="CLOSURE" value={m112Verdict} accent={m112Verdict === 'CLOSED' ? '--green' : m112Verdict === 'BLOCKERS' ? '--amber' : '--text-tertiary'} />
        <ScaleTile label="ENV" value={m112OpStatus(m112EnvOp)} accent={m112OpAccent(m112EnvOp)} />
        <ScaleTile label="MAINT" value={m112OpStatus(m112MaintOp)} accent={m112OpAccent(m112MaintOp)} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="M2 Gate" value={m112M2Open ? 'OPEN' : 'CLOSED'} accent={m112M2Open ? '--green' : '--amber'} />
        <ScaleTile label="Env Blocker" value={m112Closure?.environment_blocker ?? '—'} accent="--text-secondary" />
        <ScaleTile label="Maint Blocker" value={m112Closure?.maintenance_blocker ?? '—'} accent="--text-secondary" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Window 7d" value="ON" accent="--cyan" />
        <ScaleTile label="Window 30d" value="ON" accent="--cyan" />
        <ScaleTile label="Phase" value="M1.12" accent="--cyan" />
      </div>
      <div className="aioi-scale__info-row">
        <Activity size={12} style={{ color: m112Verdict === 'CLOSED' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          M1.12 · tenant-scoped closure · GET /api/m1/pilot-closure/status
        </span>
      </div>

      <div className="aioi-scale__section-label">PILOT OPERATION WINDOW (M1.11)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="PILOT WINDOW" value={m111Verdict} accent={m111Verdict === 'COMPLETE' ? '--green' : m111Verdict === 'PARTIAL' ? '--amber' : '--text-tertiary'} />
        <ScaleTile label="Domains" value={`${m111Summary.domains_operational ?? '—'}/${m111Summary.domains_total ?? 6}`} accent={m111Complete ? '--green' : '--amber'} />
        <ScaleTile label="Phase" value="M1.11" accent="--cyan" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="EXECUTIVE" value={m111DomainStatus('executive')} accent={m111DomainAccent('executive')} />
        <ScaleTile label="FINANCIAL" value={m111DomainStatus('financial')} accent={m111DomainAccent('financial')} />
        <ScaleTile label="HR" value={m111DomainStatus('hr')} accent={m111DomainAccent('hr')} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="SAFETY" value={m111DomainStatus('safety')} accent={m111DomainAccent('safety')} />
        <ScaleTile label="ENVIRONMENT" value={m111DomainStatus('environment')} accent={m111DomainAccent('environment')} />
        <ScaleTile label="MAINTENANCE" value={m111DomainStatus('maintenance')} accent={m111DomainAccent('maintenance')} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="TENANT ACTIVITY" value={m111BoolStatus(m111Operation?.tenant_activity_confirmed)} accent={m111BoolAccent(m111Operation?.tenant_activity_confirmed)} />
        <ScaleTile label="RUNTIME HEALTH" value={m111BoolStatus(m111Operation?.runtime_health_confirmed)} accent={m111BoolAccent(m111Operation?.runtime_health_confirmed)} />
        <ScaleTile label="M2 Gate" value={m111Operation?.m2_gate?.authorized ? 'OPEN' : 'CLOSED'} accent={m111Operation?.m2_gate?.authorized ? '--green' : '--amber'} />
      </div>
      <div className="aioi-scale__info-row">
        <Activity size={12} style={{ color: m111Verdict === 'COMPLETE' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          M1.11 · real usage audit · GET /api/m1/pilot-operation/status · gate M2
        </span>
      </div>

      <div className="aioi-scale__section-label">FOOD BASE PILOT GO-LIVE (M1.10)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="PILOT" value={m110Verdict} accent={m110Verdict === 'ACTIVE' ? '--green' : m110Verdict === 'PARTIAL' ? '--amber' : '--text-tertiary'} />
        <ScaleTile label="Criteria" value={`${m110Summary.criteria_met ?? '—'}/${m110Summary.criteria_total ?? 8}`} accent={m110Active ? '--green' : '--amber'} />
        <ScaleTile label="Strategy" value={m110Strategy === 'promote_existing' ? 'PROMOTE' : (m110Strategy === 'new_company' ? 'NEW' : '—')} accent="--cyan" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Tenant" value={m110Criterion('tenant_created')} accent={m110CriterionAccent('tenant_created')} />
        <ScaleTile label="Security" value={m110Criterion('security_enabled')} accent={m110CriterionAccent('security_enabled')} />
        <ScaleTile label="Lists" value={m110Criterion('pilot_lists_enabled')} accent={m110CriterionAccent('pilot_lists_enabled')} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Executive" value={m110Criterion('executive_go_live')} accent={m110CriterionAccent('executive_go_live')} />
        <ScaleTile label="Domains" value={m110Criterion('domains_go_live')} accent={m110CriterionAccent('domains_go_live')} />
        <ScaleTile label="AIOI" value={m110Criterion('tenant_scoped_aioi')} accent={m110CriterionAccent('tenant_scoped_aioi')} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="FoodBase API" value={m110Criterion('foodbase_api_live')} accent={m110CriterionAccent('foodbase_api_live')} />
        <ScaleTile label="Tenant ID" value={m110TenantShort} accent="--text-secondary" />
        <ScaleTile label="Phase" value="M1.10" accent="--cyan" />
      </div>
      <div className="aioi-scale__info-row">
        <Activity size={12} style={{ color: m110Verdict === 'ACTIVE' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          M1.10 · Food Base Pilot · GET /api/m1/foodbase-pilot/status · encerra ciclo M1
        </span>
      </div>

      <div className="aioi-scale__section-label">PILOT EXECUTION DRY RUN (M1.9)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="PILOT" value={m19Verdict} accent={m19Verdict === 'READY' ? '--green' : m19Verdict === 'PARTIAL' ? '--amber' : '--text-tertiary'} />
        <ScaleTile label="Journeys" value={`${m19Summary.journeys_complete ?? '—'}/${m19Summary.journeys_total ?? 7}`} accent={m19PilotReady ? '--green' : '--amber'} />
        <ScaleTile label="Tenant" value={m19TenantShort} accent="--cyan" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="CEO" value={m19JourneyComplete('ceo')} accent={m19JourneyAccent('ceo')} />
        <ScaleTile label="CFO" value={m19JourneyComplete('cfo')} accent={m19JourneyAccent('cfo')} />
        <ScaleTile label="HR" value={m19JourneyComplete('hr')} accent={m19JourneyAccent('hr')} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="SST" value={m19JourneyComplete('safety')} accent={m19JourneyAccent('safety')} />
        <ScaleTile label="Ambiental" value={m19JourneyComplete('environment')} accent={m19JourneyAccent('environment')} />
        <ScaleTile label="MANUIA" value={m19JourneyComplete('maintenance')} accent={m19JourneyAccent('maintenance')} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="NAV" value={m19DryRun?.navigation_ready === true ? 'READY' : (m19DryRun?.navigation_ready === false ? 'PARTIAL' : '—')} accent={m19BoolAccent(m19DryRun?.navigation_ready)} />
        <ScaleTile label="Mode" value={m19DryRun?.mode ?? 'pilot_proxy'} accent="--text-secondary" />
        <ScaleTile label="Phase" value="M1.9" accent="--cyan" />
      </div>
      <div className="aioi-scale__info-row">
        <Activity size={12} style={{ color: m19Verdict === 'READY' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          M1.9 · Fresh &amp; Fit · GET /api/m1/pilot-execution/status · read only
        </span>
      </div>

      <div className="aioi-scale__section-label">FOOD BASE GO-LIVE READINESS (M1.8)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="GO LIVE" value={m18Verdict} accent={m18Verdict === 'READY' ? '--green' : m18Verdict === 'PARTIAL' ? '--amber' : '--text-tertiary'} />
        <ScaleTile label="Dims" value={`${m18Summary.dimensions_ready ?? '—'}/${m18Summary.dimensions_total ?? 8}`} accent={m18GoLive ? '--green' : '--amber'} />
        <ScaleTile label="Phase" value="M1.8" accent="--cyan" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="TENANT" value={m18DimReady('tenant')} accent={m18DimAccent('tenant')} />
        <ScaleTile label="SECURITY" value={m18DimReady('security')} accent={m18DimAccent('security')} />
        <ScaleTile label="EXEC" value={m18DimReady('executive')} accent={m18DimAccent('executive')} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="SAFETY" value={m18DimReady('safety')} accent={m18DimAccent('safety')} />
        <ScaleTile label="ENVIRON" value={m18DimReady('environment')} accent={m18DimAccent('environment')} />
        <ScaleTile label="MAINT" value={m18DimReady('maintenance')} accent={m18DimAccent('maintenance')} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="HR" value={m18DimReady('hr')} accent={m18DimAccent('hr')} />
        <ScaleTile label="FINANCE" value={m18DimReady('financial')} accent={m18DimAccent('financial')} />
        <ScaleTile label="SIM ID" value="prospective" accent="--text-secondary" />
      </div>
      <div className="aioi-scale__info-row">
        <Activity size={12} style={{ color: m18Verdict === 'READY' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          M1.8 · prospective tenant · GET /api/m1/foodbase/status · no BD writes
        </span>
      </div>

      <div className="aioi-scale__section-label">PILOT READINESS SIMULATION (M1.7)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="PILOT" value={m17Verdict} accent={m17Verdict === 'READY' ? '--green' : m17Verdict === 'PARTIAL' ? '--amber' : '--text-tertiary'} />
        <ScaleTile label="Journeys" value={`${m17Summary.journeys_complete ?? '—'}/${m17Summary.journeys_total ?? 6}`} accent={m17Summary.all_complete ? '--green' : '--amber'} />
        <ScaleTile label="Phase" value="M1.7" accent="--cyan" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Safety" value={m17ScenarioStatus('safety')} accent={m17Accent('safety')} />
        <ScaleTile label="Environ" value={m17ScenarioStatus('environment')} accent={m17Accent('environment')} />
        <ScaleTile label="Maint" value={m17ScenarioStatus('maintenance')} accent={m17Accent('maintenance')} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="HR" value={m17ScenarioStatus('hr')} accent={m17Accent('hr')} />
        <ScaleTile label="Finance" value={m17ScenarioStatus('financial')} accent={m17Accent('financial')} />
        <ScaleTile label="Exec" value={m17ScenarioStatus('executive')} accent={m17Accent('executive')} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="USER JOURNEY" value={m17UserJourney === true ? 'COMPLETE' : (m17UserJourney === false ? 'PARTIAL' : '—')} accent={m17BoolAccent(m17UserJourney)} />
        <ScaleTile label="CROSS DOMAIN" value={m17CrossDomain === true ? 'COMPLETE' : (m17CrossDomain === false ? 'PARTIAL' : '—')} accent={m17BoolAccent(m17CrossDomain)} />
        <ScaleTile label="EXEC VIS" value={m17ExecVis === true ? 'COMPLETE' : (m17ExecVis === false ? 'PARTIAL' : '—')} accent={m17BoolAccent(m17ExecVis)} />
      </div>
      <div className="aioi-scale__info-row">
        <Activity size={12} style={{ color: m17Verdict === 'READY' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          M1.7 · pilot journeys · GET /api/m1/pilot-readiness/status
        </span>
      </div>

      <div className="aioi-scale__section-label">PRODUCTION DOMAIN VALIDATION (M1.6)</div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="VERDICT" value={m16Verdict} accent={m16Verdict === 'VALIDATED' ? '--green' : m16Verdict === 'PARTIAL' ? '--amber' : '--text-tertiary'} />
        <ScaleTile label="Domains" value={`${m16Summary.validated_count ?? '—'}/${m16Summary.total_count ?? 6}`} accent={m16Summary.all_operational ? '--green' : '--amber'} />
        <ScaleTile label="Phase" value="M1.6" accent="--cyan" />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Safety" value={m16DomainStatus('safety')} accent={m16Accent('safety')} />
        <ScaleTile label="Environ" value={m16DomainStatus('environment')} accent={m16Accent('environment')} />
        <ScaleTile label="Exec" value={m16DomainStatus('executive')} accent={m16Accent('executive')} />
      </div>
      <div className="aioi-scale__tiles aioi-scale__tiles--3">
        <ScaleTile label="Maint" value={m16DomainStatus('maintenance')} accent={m16Accent('maintenance')} />
        <ScaleTile label="HR" value={m16DomainStatus('hr')} accent={m16Accent('hr')} />
        <ScaleTile label="Finance" value={m16DomainStatus('financial')} accent={m16Accent('financial')} />
      </div>
      <div className="aioi-scale__info-row">
        <Activity size={12} style={{ color: m16Verdict === 'VALIDATED' ? 'var(--green)' : 'var(--text-tertiary)' }} />
        <span>
          M1.6 · operational value · GET /api/m1/validation/status
        </span>
      </div>

      <div className="aioi-scale__footer">
        <ShieldCheck size={11} style={{ color: 'var(--text-tertiary)' }} />
        <span className="aioi-scale__invariants">INVARIANTS PRESERVED</span>
        {lastFetch && (
          <span className="aioi-scale__last-fetch">
            {new Date(lastFetch).toLocaleTimeString('pt-BR')}
          </span>
        )}
      </div>
    </div>
  );
}
