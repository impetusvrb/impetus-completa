'use strict';

function validateOperationalTargeting(user = {}, ctx = {}) {
  const role = String(user?.role || '').toLowerCase();
  const dept = String(user?.department || '').toLowerCase();
  const operational = /operador|operator|técnico|tecnico|supervisor/.test(role + dept);
  return {
    operational_profile: operational,
    role,
    department: dept
  };
}

module.exports = { validateOperationalTargeting };
