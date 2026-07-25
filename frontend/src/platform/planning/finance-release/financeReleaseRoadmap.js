/**
 * FIN-PLAN-001 — Finance Release Roadmap (read-only delivery plan).
 */
import {
  FIN_PLAN_001_PHASE,
  FIN_PLAN_001_PRINCIPLE,
  FINANCE_CAPABILITY_PACKAGES,
  getCapabilityPackage,
  listActiveReleasePackages,
  resolvePackageCapabilities
} from './financeCapabilityPackages.js';

function buildReleaseRecord(pkg) {
  const caps = resolvePackageCapabilities(pkg.id);
  return Object.freeze({
    phase: FIN_PLAN_001_PHASE,
    releaseId: pkg.releaseId,
    packageId: pkg.id,
    name: pkg.name,
    title: pkg.title,
    objective: pkg.objective,
    capabilities: caps.map((c) =>
      Object.freeze({
        id: c.id,
        name: c.name,
        priority: c.priority,
        strategy: c.strategy,
        existence: c.existence,
        isNewModule: c.isNewModule
      })
    ),
    businessValue: caps.map((c) => c.businessValueDetail || c.businessValue),
    reusedComponents: Object.freeze([
      ...new Set(caps.flatMap((c) => [...(c.reusedComponents || [])]))
    ]),
    expectedReuse: pkg.expectedReuse,
    dependencies: Object.freeze([...new Set(caps.flatMap((c) => [...(c.dependencies || [])]))]),
    risk: pkg.risk,
    allowsNewModules: pkg.allowsNewModules,
    backlog: pkg.backlog,
    forbidden: pkg.forbidden || Object.freeze([]),
    readiness: Object.freeze({
      dependenciesAvailable: !pkg.backlog,
      contractsExisting: !pkg.backlog,
      integrationsValidated: pkg.releaseId === '2.0',
      reuseConfirmed: true,
      baselineImpactAssessed: true,
      notes:
        pkg.releaseId === '2.0'
          ? 'Ready after FIN-STAB-001 — immediate reuse only'
          : pkg.backlog
            ? 'Blocked until 2.0–2.3 validated'
            : `Requires prior release ${priorRelease(pkg.releaseId)} validated`
    })
  });
}

function priorRelease(releaseId) {
  const order = ['2.0', '2.1', '2.2', '2.3'];
  const i = order.indexOf(String(releaseId));
  if (i <= 0) return null;
  return order[i - 1];
}

export const FINANCE_RELEASE_ROADMAP = Object.freeze({
  phase: FIN_PLAN_001_PHASE,
  principle: FIN_PLAN_001_PRINCIPLE,
  strategy: 'integrate_then_develop',
  flow: Object.freeze([
    'Capability',
    'Business Value',
    'Reuse Existing Platform',
    'Capability Release',
    'Validation',
    'Next Release'
  ]),
  releases: Object.freeze(
    FINANCE_CAPABILITY_PACKAGES.filter((p) => !p.backlog).map((p) => buildReleaseRecord(p))
  ),
  backlog: buildReleaseRecord(getCapabilityPackage('finance_strategic_backlog'))
});

export function getFinanceRelease(releaseId) {
  if (String(releaseId) === 'backlog') return FINANCE_RELEASE_ROADMAP.backlog;
  return FINANCE_RELEASE_ROADMAP.releases.find((r) => r.releaseId === String(releaseId)) ?? null;
}

export function listFinanceReleases() {
  return FINANCE_RELEASE_ROADMAP.releases;
}

export function getReleaseReadiness(releaseId) {
  return getFinanceRelease(releaseId)?.readiness ?? null;
}

export function validateFinanceReleaseRoadmap() {
  const issues = [];
  const ids = listActiveReleasePackages().map((p) => p.releaseId);
  if (JSON.stringify(ids) !== JSON.stringify(['2.0', '2.1', '2.2', '2.3'])) {
    issues.push('active releases must be ordered 2.0 → 2.1 → 2.2 → 2.3');
  }
  for (const r of FINANCE_RELEASE_ROADMAP.releases) {
    if (r.allowsNewModules) issues.push(`${r.releaseId} must not allow new modules`);
    if (!r.capabilities.length) issues.push(`${r.releaseId} has no capabilities`);
  }
  if (!FINANCE_RELEASE_ROADMAP.backlog?.backlog) issues.push('backlog record missing');
  return { valid: issues.length === 0, issues };
}
