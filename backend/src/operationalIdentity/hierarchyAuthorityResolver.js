'use strict';

const HIERARCHY_MAP = {
  ceo: 1,
  diretor: 1,
  director: 1,
  gerente: 2,
  manager: 2,
  coordenador: 3,
  coordinator: 3,
  supervisor: 4,
  operator: 5,
  operador: 5
};

function resolveHierarchyAuthority(user = {}, ctx = {}) {
  const role = String(user.role || ctx.role || '').toLowerCase();
  const profile = String(ctx.profile_code || user.profile_code || '').toLowerCase();

  let level = HIERARCHY_MAP[role];
  if (level == null) {
    if (profile.includes('ceo') || profile.includes('director') || profile.includes('diretor')) level = 1;
    else if (profile.includes('manager') || profile.includes('gerente')) level = 2;
    else if (profile.includes('coordinator') || profile.includes('coordenador')) level = 3;
    else if (profile.includes('supervisor')) level = 4;
    else if (profile.includes('operator') || profile.includes('operador')) level = 5;
    else level = 3;
  }

  const tier =
    level <= 1 ? 'executive' : level === 2 ? 'management' : level === 3 ? 'coordination' : level === 4 ? 'supervision' : 'operational';

  return {
    hierarchy_level: level,
    hierarchy_tier: tier,
    role,
    profile_code: ctx.profile_code || user.profile_code,
    authority_scope: tier === 'executive' ? 'strategic' : tier === 'operational' ? 'floor' : 'tactical',
    enforcement_active: false,
    recommendation_only: true
  };
}

module.exports = { resolveHierarchyAuthority, HIERARCHY_MAP };
