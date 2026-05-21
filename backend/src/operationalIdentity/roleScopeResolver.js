'use strict';

function resolveRoleScope(user = {}, hierarchy = {}, domain = {}) {
  const conflicts = [];
  const role = String(user.role || '').toLowerCase();
  const tier = hierarchy.hierarchy_tier;

  if (tier === 'executive' && ['manuia', 'anomaly_detection', 'raw_material_lots'].some((m) => (user.visible_modules || []).includes(m))) {
    conflicts.push({ type: 'executive_operational_module', severity: 'medium' });
  }
  if (tier === 'operational' && ['audit', 'admin'].some((m) => (user.visible_modules || []).includes(m))) {
    conflicts.push({ type: 'operator_admin_module', severity: 'high' });
  }
  if (domain.domain_axis === 'hr' && (user.visible_modules || []).includes('environment_intelligence')) {
    conflicts.push({ type: 'hr_environment_leak', severity: 'high' });
  }

  return {
    role,
    scope: tier === 'executive' ? 'enterprise' : tier === 'operational' ? 'line' : 'department',
    conflicts,
    scope_valid: conflicts.length === 0,
    recommendation_only: true
  };
}

module.exports = { resolveRoleScope };
