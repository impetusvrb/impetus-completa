/**
 * CPL-003 — Capability Ownership (metadata · domínio proprietário + equipa).
 *
 * Capability → Owner → Adapter → Contract → Version
 */
import { COGNITIVE_PLATFORM_REGISTRY } from '../../registry/cognitivePlatformRegistry.js';
import { getCapabilityLifecycle } from '../lifecycle/capabilityLifecycle.js';
import { getCapabilityVersion } from '../versioning/capabilityVersions.js';

/** Equipas responsáveis por domínio (governança — não código). */
export const DOMAIN_OWNERSHIP_TEAMS = Object.freeze({
  logistics_wms: Object.freeze({
    team: 'Logistics & WMS Operations',
    contactAlias: 'wms-cognitive'
  }),
  quality: Object.freeze({
    team: 'Quality Cognitive',
    contactAlias: 'quality-cognitive'
  }),
  safety: Object.freeze({
    team: 'Safety / SST Cognitive',
    contactAlias: 'safety-cognitive'
  }),
  environment: Object.freeze({
    team: 'Environment Cognitive',
    contactAlias: 'environment-cognitive'
  }),
  command_center: Object.freeze({
    team: 'Command Center / Centro Cognitivo',
    contactAlias: 'command-center'
  }),
  platform: Object.freeze({
    team: 'Platform Architecture',
    contactAlias: 'platform-cpl'
  }),
  maintenance: Object.freeze({
    team: 'Maintenance Cognitive',
    contactAlias: 'maintenance-cognitive'
  }),
  production: Object.freeze({
    team: 'Production Cognitive',
    contactAlias: 'production-cognitive'
  }),
  ppap: Object.freeze({
    team: 'PPAP',
    contactAlias: 'ppap'
  }),
  ishikawa: Object.freeze({
    team: 'Ishikawa',
    contactAlias: 'ishikawa'
  })
});

export const CAPABILITY_OWNERSHIP = Object.freeze(
  Object.fromEntries(
    COGNITIVE_PLATFORM_REGISTRY.map((cap) => {
      const team = DOMAIN_OWNERSHIP_TEAMS[cap.ownerDomain] || DOMAIN_OWNERSHIP_TEAMS.platform;
      const lifecycle = getCapabilityLifecycle(cap.capabilityId);
      const version = getCapabilityVersion(cap.capabilityId);
      return [
        cap.capabilityId,
        Object.freeze({
          capabilityId: cap.capabilityId,
          ownerDomain: cap.ownerDomain,
          team: team.team,
          contactAlias: team.contactAlias,
          adapterId: cap.adapterId,
          contractId: cap.contractId,
          version: version?.current || '1.0.0',
          lifecycleStatus: lifecycle?.status || 'planned'
        })
      ];
    })
  )
);

export function getCapabilityOwnership(capabilityId) {
  return CAPABILITY_OWNERSHIP[capabilityId] ?? null;
}

export function listOwnershipByDomain(ownerDomain) {
  return Object.values(CAPABILITY_OWNERSHIP).filter((o) => o.ownerDomain === ownerDomain);
}

export function listOwnershipByOwner(teamOrAlias) {
  const q = String(teamOrAlias || '').toLowerCase();
  return Object.values(CAPABILITY_OWNERSHIP).filter(
    (o) => o.team.toLowerCase().includes(q) || o.contactAlias.toLowerCase().includes(q)
  );
}

export function validateOwnershipIntegrity() {
  const issues = [];
  for (const cap of COGNITIVE_PLATFORM_REGISTRY) {
    const own = CAPABILITY_OWNERSHIP[cap.capabilityId];
    if (!own) {
      issues.push(`missing ownership for ${cap.capabilityId}`);
      continue;
    }
    if (own.ownerDomain !== cap.ownerDomain) {
      issues.push(`ownership domain mismatch for ${cap.capabilityId}`);
    }
    if (own.adapterId !== cap.adapterId) {
      issues.push(`ownership adapter mismatch for ${cap.capabilityId}`);
    }
    if (own.contractId !== cap.contractId) {
      issues.push(`ownership contract mismatch for ${cap.capabilityId}`);
    }
  }
  return { valid: issues.length === 0, issues, count: Object.keys(CAPABILITY_OWNERSHIP).length };
}
