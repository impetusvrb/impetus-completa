'use strict';

const EXECUTIVE_MODULES = ['executive', 'analytics'];
const OPERATIONAL_MODULES = ['maintenance', 'manutencao', 'sst'];

function isolateByHierarchy(moduleId, hierarchyBand) {
  const id = String(moduleId).toLowerCase();
  if (['operator', 'supervisor'].includes(hierarchyBand) && EXECUTIVE_MODULES.includes(id)) {
    return { allowed: false, reason: 'executive_module_on_operational_hierarchy' };
  }
  if (hierarchyBand === 'executive' && OPERATIONAL_MODULES.includes(id) && id !== 'dashboard') {
    return { allowed: true, reason: 'executive_may_view_ops', warn: true };
  }
  return { allowed: true, reason: 'hierarchy_ok' };
}

module.exports = { isolateByHierarchy, EXECUTIVE_MODULES, OPERATIONAL_MODULES };
