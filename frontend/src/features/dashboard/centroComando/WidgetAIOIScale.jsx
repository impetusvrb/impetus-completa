/**
 * AIOI-P1E.6 / P1F–P1I — Widget Horizontal Scale (READ ONLY)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { aioi, f49, operations } from '../../../services/api';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchData = useCallback(async () => {
    try {
  const [statusRes, validationRes, runtimeRes, registryRes, benchmarkRes, distributedRes, telemetryRes, healthRes, capacityRes, readinessRes, riskRes, certRes, auditRes, deploymentRes, approvalRes, rolloutsRes, historyRes, opCertRes, opDatasetRes, opConsistencyRes, opWorkloadRes, authStatusRes, authRequestsRes, authHistoryRes, complianceRes, baselineRes, assuranceRes, recoveryRes, releaseRes, closureRes, geminiF49Res, triAiF49Res, truthClosureF49Res, continuousOpP0ARes, observationP0BRes, activeOpP0CRes, runtimeP0DRes, goLiveP0ERes] = await Promise.all([
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
        operations.getGoLiveStatus().catch(() => null)
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
