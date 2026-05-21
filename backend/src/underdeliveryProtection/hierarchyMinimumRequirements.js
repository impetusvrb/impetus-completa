'use strict';

function assessHierarchyMinimumRequirements(modules = [], ctx = {}) {
  const level = ctx.hierarchy_level ?? 3;
  const issues = [];
  if (level <= 2 && modules.includes('manuia')) issues.push({ type: 'executive_operational_toolkit' });
  if (level >= 4 && modules.includes('audit')) issues.push({ type: 'operator_strategic_exposure' });
  if (level >= 4 && !modules.includes('operational') && !modules.includes('proaction')) {
    issues.push({ type: 'operator_missing_toolkit' });
  }
  return { issues, minimum_met: !issues.some((i) => i.type.includes('missing')) };
}

module.exports = { assessHierarchyMinimumRequirements };
