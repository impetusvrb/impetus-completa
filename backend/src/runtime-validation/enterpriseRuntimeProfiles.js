'use strict';

/** Perfis enterprise normalizados (segmentação comportamental / UX / audiência). */
const ENTERPRISE_BANDS = Object.freeze([
  'operator',
  'technician',
  'supervisor',
  'coordinator',
  'manager',
  'director',
  'auditor',
  'production'
]);

const ROLE_MAP = Object.freeze({
  operador: 'operator',
  operator: 'operator',
  tecnico: 'technician',
  técnico: 'technician',
  technician: 'technician',
  inspetor: 'technician',
  supervisor: 'supervisor',
  coordenador: 'coordinator',
  coordinator: 'coordinator',
  gerente: 'manager',
  manager: 'manager',
  diretor: 'director',
  director: 'director',
  auditor: 'auditor',
  sst: 'technician',
  sst_technician: 'technician',
  production: 'production',
  producao: 'production',
  produção: 'production'
});

function resolveEnterpriseBand(userLike = {}) {
  const fa = String(userLike.functional_area || userLike.area || '').toLowerCase();
  if (fa.includes('sst') || fa.includes('segur')) return 'technician';
  const role = String(userLike.role || userLike.perfil || '').toLowerCase();
  if (ROLE_MAP[role]) return ROLE_MAP[role];
  for (const [k, v] of Object.entries(ROLE_MAP)) {
    if (role.includes(k)) return v;
  }
  return 'production';
}

module.exports = {
  ENTERPRISE_BANDS,
  resolveEnterpriseBand
};
