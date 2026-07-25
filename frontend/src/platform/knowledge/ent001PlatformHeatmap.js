/**
 * ENT-001 — Heatmap corporativo de maturidade por domínio.
 */
import { ENT_DOMAIN_CATALOG } from './ent001DomainCatalog.js';
import { ENT_CROSS_DOMAIN_MATRIX } from './ent001CrossDomainMatrix.js';
import { ENT_001_PHASE, ENT_MATURITY_LEVELS } from './ent001Constants.js';

/** Classificação explícita — sobrepõe heurística quando necessário */
const DOMAIN_MATURITY_OVERRIDES = Object.freeze({
  logistics_wms: Object.freeze({
    maturity: 'certified',
    label: 'Certificado / Congelado',
    rationale: 'OPM-003–008 + OPM-GOV-001 + WMS-REF-001 — baseline congelada'
  }),
  quality: Object.freeze({
    maturity: 'mature',
    label: 'Maduro',
    rationale: 'GF-027 operational runtime + cognitive hub + EOX activo'
  }),
  safety: Object.freeze({
    maturity: 'mature',
    label: 'Maduro',
    rationale: 'GF-027 SST operational + cognitive hub'
  }),
  environment: Object.freeze({
    maturity: 'mature',
    label: 'Maduro',
    rationale: 'GF-027 ambiental + cognitive runtime'
  }),
  finance: Object.freeze({
    maturity: 'partial',
    label: 'Parcial / Descoberto',
    rationale: 'FIN-AUD-001 — capacidades operacionais existem; domínio nativo GREENFIELD'
  }),
  production: Object.freeze({
    maturity: 'not_started',
    label: 'Não iniciado',
    rationale: 'EOX active:false — consumidor futuro'
  }),
  supply: Object.freeze({
    maturity: 'partial',
    label: 'Parcial',
    rationale: 'Workspace + budget reference — EOX inactive'
  }),
  ppap: Object.freeze({
    maturity: 'discovered',
    label: 'Descoberto',
    rationale: 'Native cockpit CC — EOX PLANNED'
  }),
  msa: Object.freeze({
    maturity: 'discovered',
    label: 'Descoberto',
    rationale: 'Native cockpit CC — EOX PLANNED'
  }),
  ishikawa: Object.freeze({
    maturity: 'discovered',
    label: 'Descoberto',
    rationale: 'Native cockpit CC — EOX PLANNED'
  }),
  command_center: Object.freeze({
    maturity: 'mature',
    label: 'Maduro',
    rationale: 'Centro Comando certificado ARC/UX — widgets + profiles'
  }),
  cognitive_center: Object.freeze({
    maturity: 'mature',
    label: 'Maduro',
    rationale: 'cognitiveRuntime + CPL governance'
  }),
  nexus_ia: Object.freeze({
    maturity: 'mature',
    label: 'Maduro',
    rationale: 'Billing engine v4 + wallet — FIN-AUD complete'
  }),
  maintenance: Object.freeze({
    maturity: 'not_started',
    label: 'Não iniciado',
    rationale: 'Sem domínio EOX ou runtime dedicado'
  }),
  hr: Object.freeze({
    maturity: 'not_started',
    label: 'Não iniciado',
    rationale: 'Sem implementação encontrada'
  }),
  purchasing: Object.freeze({
    maturity: 'discovered',
    label: 'Descoberto',
    rationale: 'Supply parcial — referências procurement'
  }),
  executive: Object.freeze({
    maturity: 'partial',
    label: 'Parcial',
    rationale: 'AIOI + cognitive economics — não domínio EOX completo'
  }),
  audit: Object.freeze({
    maturity: 'partial',
    label: 'Parcial',
    rationale: 'Audit services + programas FIN-AUD/REG'
  }),
  compliance: Object.freeze({
    maturity: 'partial',
    label: 'Parcial',
    rationale: 'Cross-domain em Q/S/E views'
  }),
  operational: Object.freeze({
    maturity: 'mature',
    label: 'Maduro',
    rationale: 'domainRegistry operational hub'
  })
});

export function buildPlatformHeatmap() {
  return Object.freeze(
    ENT_DOMAIN_CATALOG.map((domain) => {
      const matrix = ENT_CROSS_DOMAIN_MATRIX.find((r) => r.domainId === domain.domainId);
      const override = DOMAIN_MATURITY_OVERRIDES[domain.domainId];
      const maturity = override?.maturity || domain.maturity;
      const label = override?.label || maturity;
      const rationale = override?.rationale || `Heurística: active=${domain.active}, modules=${matrix?.moduleCount || 0}`;

      return Object.freeze({
        domainId: domain.domainId,
        label: domain.label,
        maturity,
        maturityLabel: label,
        active: domain.active,
        moduleCount: matrix?.moduleCount || 0,
        cognitiveCount: matrix?.cognitiveCount || 0,
        runtimeCount: matrix?.runtimeCount || 0,
        certification: domain.certification,
        rationale
      });
    })
  );
}

export const ENT_PLATFORM_HEATMAP = buildPlatformHeatmap();

export function listHeatmapByMaturity(maturity) {
  return ENT_PLATFORM_HEATMAP.filter((h) => h.maturity === maturity);
}

export function getHeatmapSummary() {
  const summary = {};
  for (const level of ENT_MATURITY_LEVELS) {
    summary[level] = listHeatmapByMaturity(level).length;
  }
  return Object.freeze(summary);
}

export function validatePlatformHeatmap() {
  const issues = [];
  const certified = listHeatmapByMaturity('certified');
  if (certified.length < 1) issues.push('expected at least 1 certified domain (logistics_wms)');
  if (!ENT_PLATFORM_HEATMAP.find((h) => h.domainId === 'finance')) {
    issues.push('finance must appear in heatmap');
  }
  return {
    valid: issues.length === 0,
    issues,
    phase: ENT_001_PHASE,
    count: ENT_PLATFORM_HEATMAP.length,
    summary: getHeatmapSummary()
  };
}
