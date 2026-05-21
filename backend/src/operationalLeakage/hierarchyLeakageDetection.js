'use strict';

function detectHierarchyLeakage(modules = [], identity = {}) {
  const tier = identity.hierarchy_tier;
  const level = identity.hierarchy_level ?? 3;
  const leaks = [];
  if (tier === 'executive' || level <= 2) {
    const operational = modules.filter((m) =>
      /manuia|anomaly|plc|telemetry_sst|field_inspection/i.test(String(m))
    );
    operational.forEach((m) => leaks.push({ module: m, reason: 'executive_operational_cockpit' }));
  }
  if (tier === 'operational' || level >= 5) {
    if (modules.includes('audit') || modules.includes('admin')) {
      leaks.push({ module: 'audit/admin', reason: 'operator_strategic_module' });
    }
  }
  return { leaks, count: leaks.length };
}

module.exports = { detectHierarchyLeakage };
