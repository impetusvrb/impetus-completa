'use strict';

const { logPhaseZ4 } = require('../pilotMaturity/phaseZ4Logger');

function adviseMenuRecovery(modules = [], ctx = {}) {
  const list = Array.isArray(modules) ? modules : [];
  const recommendations = [];
  if (!list.includes('dashboard')) recommendations.push({ action: 'restore_dashboard', priority: 'critical' });
  if (list.length < 3) recommendations.push({ action: 'apply_minimum_operational_set', priority: 'high' });
  if (ctx.menu_stability?.over_pruning) {
    recommendations.push({ action: 'review_pruning_policy', priority: 'medium' });
  }

  if (recommendations.length) {
    logPhaseZ4('MENU_RECOVERY_ADVISED', {
      tenant_id: ctx.tenant_id,
      count: recommendations.length,
      shadow_only: true
    });
  }

  return {
    recommendations,
    auto_remediate: false,
    rollback_recommended: recommendations.some((r) => r.priority === 'critical')
  };
}

module.exports = { adviseMenuRecovery };
