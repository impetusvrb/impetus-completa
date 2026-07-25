/**
 * NAV-001 — Registo de domínios operacionais elegíveis para a sidebar (Presentation Layer).
 */
import { isQualityPrimary, isEnvironmentalPrimary } from '../../utils/dashboardSurfaceCapabilities.js';
import { isHrDomainUser, isSafetyDomainUser } from '../../utils/structuralDomainAudience.js';
import { isStrictAdminRole } from '../../utils/roleUtils.js';

export const PRESENTATION_DOMAIN_IDS = Object.freeze([
  'logistics_wms',
  'supply',
  'quality',
  'safety',
  'environment'
]);

function normTxt(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function userBlob(user) {
  const u = user || {};
  return normTxt(
    [
      u.role,
      u.job_title,
      u.cargo,
      u.department,
      u.functional_area,
      u.area,
      u.dashboard_profile,
      u.profile_code,
      u.wms_profile,
      u.structural_profile?.cargo,
      u.structural_profile?.departamento,
      u.structural_profile?.eixo_primario
    ]
      .filter(Boolean)
      .join(' ')
  );
}

export function hasVisibleModule(visibleModules, moduleKey) {
  return Array.isArray(visibleModules) && visibleModules.includes(moduleKey);
}

export function isMarketingFunctionalContext(user) {
  if (!user) return false;
  const b = userBlob(user);
  return /\b(marketing|comercial|vendas|trade marketing|mkt\b|brand manager)\b/.test(b);
}

export function isProductionFunctionalContext(user) {
  if (!user) return false;
  if (isLogisticsFunctionalContext(user)) return false;
  if (isQualityPrimary(user)) return false;
  if (isEnvironmentalPrimary(user)) return false;
  const b = userBlob(user);
  return /\b(producao|production|operador de producao|linha de producao|manufacturing|operador\b|colaborador producao)\b/.test(b);
}

export function isLogisticsFunctionalContext(user) {
  if (!user) return false;
  const fa = normTxt(user.functional_area || user.area || user.department);
  const logisticsTokens = [
    'logistica',
    'logistics',
    'expedicao',
    'wms',
    'almoxarifado',
    'armazem',
    'estoque',
    'inventario',
    'warehouse',
    'tms'
  ];
  if (logisticsTokens.some((k) => fa.includes(k))) return true;

  const profile = normTxt(user.dashboard_profile || user.profile_code || user.wms_profile);
  if (/warehouse|logist|wms|exped|almox|invent|supply_chain_ops/.test(profile)) return true;

  const sp = user.structural_profile;
  if (sp?.eixo_primario === 'eixo_logistica' || sp?.eixo_primario === 'eixo_estoque') return true;

  const job = normTxt(user.job_title || user.cargo);
  if (/almox|exped|logist|armaz|wms|warehouse|estoque/.test(job)) return true;

  return hasWmsRbacProfile(user);
}

export function hasWmsRbacProfile(user) {
  const p = String(user?.profile_code || user?.wms_profile || '').toLowerCase();
  return ['warehouse_operator', 'warehouse_supervisor', 'warehouse_manager'].includes(p);
}

export function isSupplyFunctionalContext(user) {
  if (!user) return false;
  const fa = normTxt(user.functional_area || user.area || user.department);
  const tokens = ['supply', 'suprimentos', 'compras', 'procurement', 'pcp', 'planejamento', 'cadeia de suprimentos'];
  if (tokens.some((k) => fa.includes(k.replace(/\s+/g, '_')) || fa.includes(k.replace(/\s+/g, '')))) return true;
  const profile = normTxt(user.dashboard_profile || user.profile_code);
  if (/supply|supriment|procurement|pcp|compras/.test(profile)) return true;
  return user.structural_profile?.eixo_primario === 'eixo_supply';
}

/** Regras individuais por domínio — nunca merge(allDomains). */
export const ALLOWED_DOMAIN_RULES = Object.freeze({
  logistics_wms: {
    id: 'logistics_wms',
    moduleKey: 'logistics_intelligence',
    isAllowed(ctx) {
      const user = ctx.user;
      if (!user) return false;
      if (isMarketingFunctionalContext(user)) return false;
      if (isQualityPrimary(user)) return false;
      if (isEnvironmentalPrimary(user)) return false;
      if (isHrDomainUser(user)) return false;
      if (isSafetyDomainUser(user) && !isLogisticsFunctionalContext(user)) return false;
      if (isProductionFunctionalContext(user) && !isLogisticsFunctionalContext(user)) return false;
      if (!isLogisticsFunctionalContext(user)) return false;
      if (!hasVisibleModule(ctx.visibleModules, this.moduleKey) && !isStrictAdminRole(user)) return false;
      return true;
    }
  },
  supply: {
    id: 'supply',
    moduleKey: null,
    isAllowed(ctx) {
      const user = ctx.user;
      if (!user) return false;
      if (isMarketingFunctionalContext(user)) return false;
      if (isQualityPrimary(user)) return false;
      if (isEnvironmentalPrimary(user)) return false;
      if (!isSupplyFunctionalContext(user)) return false;
      return true;
    }
  },
  quality: {
    id: 'quality',
    moduleKey: 'quality_intelligence',
    isAllowed(ctx) {
      const user = ctx.user;
      if (!user) return false;
      if (isMarketingFunctionalContext(user)) return false;
      if (isLogisticsFunctionalContext(user) && !isQualityPrimary(user)) return false;
      if (isProductionFunctionalContext(user) && !isQualityPrimary(user)) return false;
      if (!hasVisibleModule(ctx.visibleModules, this.moduleKey)) return false;
      return isQualityPrimary(user);
    }
  },
  safety: {
    id: 'safety',
    moduleKey: 'safety_intelligence',
    isAllowed(ctx) {
      const user = ctx.user;
      if (!user) return false;
      if (isMarketingFunctionalContext(user)) return false;
      if (!hasVisibleModule(ctx.visibleModules, this.moduleKey)) return false;
      return isSafetyDomainUser(user);
    }
  },
  environment: {
    id: 'environment',
    moduleKey: 'environment_intelligence',
    isAllowed(ctx) {
      const user = ctx.user;
      if (!user) return false;
      if (isMarketingFunctionalContext(user)) return false;
      if (isSafetyDomainUser(user) && !isEnvironmentalPrimary(user)) return false;
      if (!hasVisibleModule(ctx.visibleModules, this.moduleKey)) return false;
      return isEnvironmentalPrimary(user);
    }
  }
});
