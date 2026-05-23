/**
 * structuralDashboardBridge — liga Base Estrutural ao dashboard (módulos + widgets).
 * Garante que departamento/setor/cargo oficial alimentem layout e menu.
 */
'use strict';

const functionalAreaCatalog = require('../config/functionalAreaCatalog');

/**
 * Mescla cargo oficial (company_roles + FK) no utilizador para motores de layout.
 */
function mergeStructuralBaseIntoUser(user, structuralRole = null) {
  const u = { ...user };
  const role = structuralRole || u.structural_role_row || null;
  if (!role) return u;

  u.structural_role_row = role;

  if (role.department_name) {
    u.department_resolved_name = role.department_name;
    u.department = role.department_name;
    u.departamento = role.department_name;
  }
  if (role.sector_name) {
    u.sector_resolved_name = role.sector_name;
    u.setor = role.sector_name;
  }
  if (role.dashboard_functional_hint) {
    const hint =
      functionalAreaCatalog.resolveIdFromText(role.dashboard_functional_hint) ||
      role.dashboard_functional_hint;
    u.functional_area = hint;
    u.area = hint;
  }

  if (role.name && !u.job_title) {
    u.job_title = role.name;
    u.cargo = role.name;
  }
  if (role.hierarchy_level != null && u.hierarchy_level == null) {
    u.hierarchy_level = role.hierarchy_level;
  }

  return u;
}

module.exports = {
  mergeStructuralBaseIntoUser
};
