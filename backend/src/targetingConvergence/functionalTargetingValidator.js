'use strict';

function validateFunctionalTargeting(identity = {}, ctx = {}) {
  const axis = String(identity.domain_axis || identity.functional_axis || '').toLowerCase();
  const issues = [];
  if (!axis) issues.push({ type: 'functional_axis_missing', severity: 'high' });
  return {
    valid: issues.length === 0,
    functional_axis: axis,
    issues
  };
}

module.exports = { validateFunctionalTargeting };
