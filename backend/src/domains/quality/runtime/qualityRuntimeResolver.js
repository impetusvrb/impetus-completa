'use strict';

const db = require('../../../db');
const flags = require('./qualityModuleFlags');
const { qualityOperationsUiEngine } = require('../ui/qualityOperationsUiEngine');
const { qualityGovernanceUiEngine } = require('../ui/qualityGovernanceUiEngine');

const DEFAULT_ROLE_MAP = {
  operator: { origin_layer: 'operational', intended_audience: 'operator', layer: 'operations' },
  inspector: { origin_layer: 'operational', intended_audience: 'operator', layer: 'operations' },
  inspetor: { origin_layer: 'operational', intended_audience: 'operator', layer: 'operations' },
  laboratory: { origin_layer: 'operational', intended_audience: 'operator', layer: 'operations' },
  laboratorista: { origin_layer: 'operational', intended_audience: 'operator', layer: 'operations' },
  technician: { origin_layer: 'operational', intended_audience: 'operator', layer: 'operations' },
  supervisor: { origin_layer: 'governance', intended_audience: 'supervisor', layer: 'governance' },
  coordinator: { origin_layer: 'governance', intended_audience: 'supervisor', layer: 'governance' },
  manager: { origin_layer: 'governance', intended_audience: 'manager', layer: 'governance' },
  director: { origin_layer: 'governance', intended_audience: 'executive', layer: 'governance' },
  diretor: { origin_layer: 'governance', intended_audience: 'executive', layer: 'governance' },
  gerente: { origin_layer: 'governance', intended_audience: 'manager', layer: 'governance' },
  executive: { origin_layer: 'governance', intended_audience: 'executive', layer: 'governance' },
  quality_engineer: { origin_layer: 'governance', intended_audience: 'analyst', layer: 'governance' },
  compliance: { origin_layer: 'governance', intended_audience: 'analyst', layer: 'governance' },
  audit: { origin_layer: 'governance', intended_audience: 'analyst', layer: 'governance' },
  auditor: { origin_layer: 'governance', intended_audience: 'analyst', layer: 'governance' },
  admin: { origin_layer: 'governance', intended_audience: 'manager', layer: 'governance' }
};

async function _loadTenantRow(companyId) {
  if (!companyId) return null;
  try {
    const r = await db.query(
      'SELECT industry_profile, ui_density, feature_flags FROM impetus_quality_tenant_config WHERE company_id = $1',
      [companyId]
    );
    return r.rows[0] || null;
  } catch (e) {
    if (e && e.code === '42P01') return null;
    throw e;
  }
}

async function _loadRoleRow(companyId, roleKey) {
  if (!companyId || !roleKey) return null;
  try {
    const r = await db.query(
      `SELECT origin_layer, intended_audience, cognitive_budget_multiplier, functional_area
       FROM impetus_quality_role_runtime_map
       WHERE company_id = $1 AND role_key = $2 AND active = true
       LIMIT 1`,
      [companyId, roleKey]
    );
    return r.rows[0] || null;
  } catch (e) {
    if (e && e.code === '42P01') return null;
    throw e;
  }
}

function _normalizeRoleKey(user) {
  const raw = user?.role || user?.cargo || user?.job_role || '';
  return String(raw).trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Resolve o runtime dual (operações vs governação) com adaptação cognitiva e densidade UX.
 *
 * @param {{ companyId: string, user?: object, functionalArea?: string, clientHints?: object }} ctx
 */
async function resolveQualityRuntime(ctx = {}) {
  const companyId = ctx.companyId ? String(ctx.companyId) : null;
  const enabled = flags.isQualityUniversalRuntimeEnabled();
  const shadow = flags.isQualityUniversalShadowMode();

  if (!enabled) {
    return {
      enabled: false,
      shadow_mode: shadow,
      layer: 'disabled',
      origin_layer: null,
      intended_audience: null,
      ui_engine: null,
      operational_density: 'none',
      governance_density: 'none',
      explainability_level: 'none',
      cognitive_budget: { multiplier: 1, source: 'default' },
      tenant: null
    };
  }

  const roleKey = _normalizeRoleKey(ctx.user);
  const defaults = DEFAULT_ROLE_MAP[roleKey] || DEFAULT_ROLE_MAP.operator;
  const [tenantRow, roleRow] = await Promise.all([
    companyId ? _loadTenantRow(companyId) : Promise.resolve(null),
    companyId && roleKey ? _loadRoleRow(companyId, roleKey) : Promise.resolve(null)
  ]);

  const originLayer = roleRow?.origin_layer || defaults.origin_layer;
  const intendedAudience = roleRow?.intended_audience || defaults.intended_audience;
  const layer =
    originLayer === 'both'
      ? 'both'
      : defaults.layer === 'governance' || originLayer === 'governance'
        ? 'governance'
        : 'operations';
  const dualBoth = layer === 'both';

  const mult = roleRow?.cognitive_budget_multiplier
    ? Number(roleRow.cognitive_budget_multiplier)
    : 1;
  let cognitiveBudget = { multiplier: Number.isFinite(mult) && mult > 0 ? mult : 1, source: 'role_map' };

  try {
    const cb = require('../../../cognitiveBudget/cognitiveBudgetRuntime');
    if (cb && typeof cb.budget?.resolveBudget === 'function') {
      const resolved = await cb.budget.resolveBudget({
        company_id: companyId,
        persona: roleKey || 'operator',
        domain: 'quality',
        module: dualBoth ? 'quality_dual' : layer,
        text: ''
      });
      if (resolved && resolved.enabled && resolved.budget_tokens != null) {
        const ref = 8000;
        const bump = Math.min(1.35, Math.max(0.75, resolved.budget_tokens / ref));
        cognitiveBudget = {
          multiplier: cognitiveBudget.multiplier * bump,
          source: 'cognitive_budget_runtime',
          budget_tokens: resolved.budget_tokens,
          runtime_detail: { quotas: resolved.quotas, tenant_remaining: resolved.tenant_remaining }
        };
      }
    }
  } catch (_e) {
    cognitiveBudget.source = cognitiveBudget.source === 'role_map' ? 'role_map' : cognitiveBudget.source;
  }

  const uiDensityTenant = (tenantRow && tenantRow.ui_density) || {};
  const operationalDensity =
    uiDensityTenant.operational ||
    (layer === 'operations' || dualBoth ? 'low' : 'minimal');
  const governanceDensity =
    uiDensityTenant.governance || (layer === 'governance' || dualBoth ? 'high' : 'medium');

  const explainabilityLevel =
    layer === 'governance' || dualBoth
      ? Math.min(5, Math.round(2 + cognitiveBudget.multiplier))
      : Math.min(2, Math.round(1 + cognitiveBudget.multiplier * 0.2));

  const opDesc = () =>
    qualityOperationsUiEngine.descriptor({
      companyId,
      tenantRow,
      operationalDensity,
      governanceDensity,
      cognitiveBudget,
      intendedAudience,
      originLayer: dualBoth ? 'operational' : originLayer
    });
  const govDesc = () =>
    qualityGovernanceUiEngine.descriptor({
      companyId,
      tenantRow,
      operationalDensity,
      governanceDensity,
      cognitiveBudget,
      intendedAudience,
      originLayer: dualBoth ? 'governance' : originLayer
    });

  const uiEngine =
    layer === 'both' ? { mode: 'dual', operational: opDesc(), governance: govDesc() } : layer === 'governance' ? govDesc() : opDesc();

  return {
    enabled: true,
    shadow_mode: shadow,
    layer: dualBoth ? 'both' : layer,
    origin_layer: originLayer,
    intended_audience: intendedAudience,
    role_key: roleKey || null,
    functional_area: roleRow?.functional_area || ctx.functionalArea || null,
    ui_engine: uiEngine,
    operational_density: operationalDensity,
    governance_density: governanceDensity,
    explainability_level: explainabilityLevel,
    cognitive_budget: cognitiveBudget,
    tenant: tenantRow
      ? {
          industry_profile: tenantRow.industry_profile,
          feature_flags: tenantRow.feature_flags
        }
      : null
  };
}

module.exports = {
  resolveQualityRuntime,
  DEFAULT_ROLE_MAP
};
