'use strict';

const { loadBaselineManifest } = require('./ops001ManifestLoader');
const { validateBuild } = require('./ops001BuildValidator');
const { auditFeatureFlags } = require('./ops001FeatureFlagAuditor');
const { validateWorkspaceRegistry } = require('./ops001WorkspaceRegistryValidator');
const { validateRoutes } = require('./ops001RouteValidator');
const { validateRbacForWarehouseManager } = require('./ops001RbacValidator');
const { validateDeployment } = require('./ops001DeploymentValidator');
const { validateManifestAgainstDeployment } = require('./ops001ManifestValidator');

function _resolvePrimaryCause(ctx) {
  if (ctx.build.classification === 'FAIL') return 'Build desatualizada';
  if (ctx.flags.all_wms_flags_off) return 'Feature Flag OFF';
  if (ctx.workspace.registries.some((r) => r.status === 'FAIL')) return 'Registry ausente';
  if (ctx.routes.classification === 'FAIL') return 'Route não publicada';
  if (ctx.deployment.classification === 'FAIL') return 'Deployment incompleto';
  if (ctx.rbac.classification === 'FAIL') return 'RBAC';
  if (ctx.workspace.classification === 'WARNING') return 'Registry ausente';
  return 'Outro';
}

function _resolveVerdict(ctx) {
  const blockers = [];
  if (!ctx.baseline.signature_match) blockers.push('release_signature_mismatch');
  if (ctx.build.classification === 'FAIL') blockers.push('build_validation_fail');
  if (ctx.manifest.classification === 'FAIL') blockers.push('manifest_module_missing');
  if (ctx.routes.classification === 'FAIL') blockers.push('routes_not_published');

  if (blockers.length) return 'DEPLOYMENT NOT CONSISTENT WITH BASELINE';

  const findings = [];
  if (ctx.flags.all_wms_flags_off) findings.push('wms_flags_off_operational');
  if (ctx.workspace.registries.some((r) => r.status === 'WARNING')) findings.push('menu_nav_registry_partial');
  if (ctx.build.classification === 'WARNING') findings.push('build_traceability_warning');

  if (findings.length) return 'DEPLOYMENT VERIFIED WITH FINDINGS';
  return 'DEPLOYMENT VERIFIED';
}

function _crossChecklist(ctx) {
  return Object.freeze([
    {
      item: 'Workspace registrado',
      status: ctx.workspace.registries.find((r) => r.id === 'workspace_registry')?.present ? 'PASS' : 'FAIL'
    },
    {
      item: 'Workspace carregado',
      status: ctx.flags.all_wms_flags_off ? 'FAIL' : ctx.build.wms_dist_chunks.length ? 'PASS' : 'WARNING',
      note: ctx.flags.all_wms_flags_off ? 'Gate WmsWorkspaceGate activo — flags OFF' : null
    },
    {
      item: 'APIs WMS acessíveis',
      status: ctx.routes.backend_api_routes.every((r) => r.status === 'PASS') ? 'PASS' : 'WARNING'
    },
    {
      item: 'Command Center exposto',
      status: ctx.flags.rows.find((r) => r.flag === 'VITE_IMPETUS_LOGISTICS_CC')?.observed ? 'PASS' : 'FAIL',
      note: 'CC WMS-004 requer VITE_IMPETUS_LOGISTICS_CC + WORKSPACE ON'
    },
    {
      item: 'Navegação disponível',
      status: ctx.flags.all_wms_flags_off ? 'FAIL' : 'PASS',
      note: ctx.flags.all_wms_flags_off ? 'Menu WMS oculto — flags OFF' : null
    },
    {
      item: 'RBAC correto',
      status: ctx.rbac.classification
    },
    {
      item: 'Flags coerentes',
      status: ctx.flags.classification
    }
  ]);
}

function _impactClassification(primaryCause, verdict) {
  if (verdict === 'DEPLOYMENT NOT CONSISTENT WITH BASELINE') return 'BLOCKING';
  if (primaryCause === 'Feature Flag OFF') return 'OPERATIONAL — esperado per baseline (pilot_activation_only)';
  if (primaryCause === 'Registry ausente') return 'MEDIUM — navegação WMS-004 não integrada ao menu global';
  return 'LOW';
}

function runDeploymentVerification(ctx = {}) {
  const t0 = Date.now();
  const baseline = loadBaselineManifest();
  const manifest = baseline.manifest;

  const build = validateBuild();
  const flags = auditFeatureFlags(manifest);
  const workspace = validateWorkspaceRegistry(manifest);
  const routes = validateRoutes();
  const rbac = validateRbacForWarehouseManager();
  const deployment = validateDeployment();
  const manifestCmp = validateManifestAgainstDeployment(manifest);

  const snapshot = {
    build,
    flags,
    workspace,
    routes,
    rbac,
    deployment,
    manifest: manifestCmp,
    baseline
  };

  const primary_cause = _resolvePrimaryCause(snapshot);
  const verdict = _resolveVerdict(snapshot);
  const cross_checklist = _crossChecklist(snapshot);
  const impact = _impactClassification(primary_cause, verdict);

  const recommendation =
    primary_cause === 'Feature Flag OFF'
      ? 'Próxima actividade: OPS-002 — Deployment Alignment (activação controlada de flags piloto WMS-004 per baseline). Não abrir ARC-003 até activação operacional validada.'
      : verdict === 'DEPLOYMENT NOT CONSISTENT WITH BASELINE'
        ? 'Próxima actividade: OPS-002 — Deployment Alignment (rebuild + alinhamento manifesto).'
        : 'Implantação aderente à baseline. ARC-003 pode ser considerada após confirmação operacional.';

  return Object.freeze({
    ok: verdict !== 'DEPLOYMENT NOT CONSISTENT WITH BASELINE',
    mode: 'READ_ONLY',
    delivery: 'OPS-001',
    baseline_id: manifest.baseline_id,
    verdict,
    primary_cause,
    impact_classification: impact,
    operational_recommendation: recommendation,
    cross_checklist,
    build,
    flags,
    workspace,
    routes,
    rbac,
    deployment,
    manifest_comparison: manifestCmp,
    baseline_signature_match: baseline.signature_match,
    baseline_release_signature: baseline.stored_signature,
    duration_ms: Date.now() - t0,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  runDeploymentVerification
};
