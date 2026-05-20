'use strict';

const HIERARCHY_BANDS = {
  executive: { min: 1, max: 2, label: 'executive' },
  director: { min: 2, max: 3, label: 'director' },
  coordinator: { min: 3, max: 4, label: 'coordinator' },
  supervisor: { min: 4, max: 5, label: 'supervisor' },
  operator: { min: 5, max: 6, label: 'operator' }
};

function resolveHierarchy(user, ctx = {}) {
  const level = user?.hierarchy_level ?? ctx.hierarchy_level ?? 5;
  let band = 'operator';
  if (level <= 2) band = 'executive';
  else if (level <= 3) band = 'director';
  else if (level <= 4) band = 'coordinator';
  else if (level <= 5) band = 'supervisor';

  const role = String(user?.role || ctx.role || '').toLowerCase();
  if (role.includes('executive') || role.includes('diretor')) band = level <= 3 ? 'executive' : 'director';
  if (role.includes('coord')) band = 'coordinator';
  if (role.includes('super')) band = 'supervisor';

  return {
    hierarchy_level: level,
    hierarchy_band: band,
    hierarchy_integrity: band !== 'operator' || level >= 4 ? 0.92 : 0.88
  };
}

module.exports = { resolveHierarchy, HIERARCHY_BANDS };
