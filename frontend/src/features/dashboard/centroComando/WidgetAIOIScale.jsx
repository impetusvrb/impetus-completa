/**
 * AIOI-P1E.6 / P1F–P1I — Widget Horizontal Scale (READ ONLY)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { aioi } from '../../../services/api';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchData = useCallback(async () => {
    try {
  const [statusRes, validationRes, runtimeRes, registryRes, benchmarkRes, distributedRes, telemetryRes, healthRes, capacityRes, readinessRes, riskRes, certRes, auditRes, deploymentRes, approvalRes, rolloutsRes, historyRes, opCertRes, opDatasetRes, opConsistencyRes, opWorkloadRes] = await Promise.all([
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
        aioi.getOperationalWorkload()
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
  const statusLabel = distFlags.IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE ? 'DIST ON' : 'P1L READY';
  const readinessScore = readiness?.readiness_score ?? 0;
  const overallReady = readiness?.overall_ready ? 'READY' : 'PENDING';
  const certCount = certifications?.phases?.filter(p => p.certified)?.length ?? 0;
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
  const riskColor = overallRisk === 'LOW' ? 'var(--green)'
    : overallRisk === 'MEDIUM' ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="impetus-card aioi-scale__card">
      <div className="aioi-scale__header">
        <div className="aioi-scale__header-left">
          <Layers size={14} style={{ color: 'var(--cyan)' }} />
          <span className="aioi-scale__title">AIOI HORIZONTAL SCALE</span>
          <span className="aioi-scale__mode">P1L · READ ONLY</span>
        </div>
        <span className="aioi-scale__badge" style={{ color: healthColor, borderColor: healthColor }}>
          {clusterHealthStatus}
        </span>
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
        <ScaleTile label="Phases" value={`${certCount}/9`} accent="--cyan" />
        <ScaleTile label="Risk" value={overallRisk} accent="--text-secondary" />
        <ScaleTile label="Gov risk" value={risk?.governance_risk ?? '—'} accent="--text-secondary" />
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
