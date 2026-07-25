/**
 * ARCH-PLAN-001 — Estratégias de evolução por domínio (evidência ENT-001).
 */
import { ARCH_DOMAIN_ANALYSIS } from './archPlan001DomainAnalysis.js';
import { ARCH_GAP_ANALYSIS } from './archPlan001GapAnalysis.js';
import { ARCH_REUSE_ANALYSIS } from './archPlan001ReuseAnalysis.js';
import { EVOLUTION_STRATEGIES, ARCH_PLAN_001_PHASE } from './archPlan001Constants.js';

/** Classificação explícita — derivada de heatmap + gaps + reuse ENT-001 */
const STRATEGY_OVERRIDES = Object.freeze({
  logistics_wms: Object.freeze({
    strategy: 'maintenance_only',
    rationale: 'Certificado/congelado — OPM-GOV + WMS-REF. Evolução só com escopo explícito.',
    phases: Object.freeze(['preservar baseline', 'correcções scoped', 'sem novos módulos horizontais'])
  }),
  quality: Object.freeze({
    strategy: 'maintenance_only',
    rationale: 'Maduro GF-027 + quality_adapter activo.',
    phases: Object.freeze(['incremental scoped', 'CPL reuse'])
  }),
  safety: Object.freeze({
    strategy: 'maintenance_only',
    rationale: 'Maduro GF-027 + safety_adapter activo.',
    phases: Object.freeze(['incremental scoped'])
  }),
  environment: Object.freeze({
    strategy: 'maintenance_only',
    rationale: 'Maduro GF-027 + environment_adapter activo.',
    phases: Object.freeze(['incremental scoped'])
  }),
  command_center: Object.freeze({
    strategy: 'maintenance_only',
    rationale: 'Hub transversal certificado — widgets + Smart Panel.',
    phases: Object.freeze(['deep-links', 'command_center_adapter quando scoped'])
  }),
  cognitive_center: Object.freeze({
    strategy: 'maintenance_only',
    rationale: 'CPL governance + cognitiveRuntime — infra congelada.',
    phases: Object.freeze(['preservar CPL'])
  }),
  nexus_ia: Object.freeze({
    strategy: 'maintenance_only',
    rationale: 'Billing v4 completo — FIN-AUD.',
    phases: Object.freeze(['operacional'])
  }),
  operational: Object.freeze({
    strategy: 'maintenance_only',
    rationale: 'Cadeias REG-002 recuperadas — manter conectividade.',
    phases: Object.freeze(['forecasting gap residual'])
  }),
  finance: Object.freeze({
    strategy: 'integrate_then_develop',
    rationale:
      'FIN-AUD: custos industriais, leakage, Nexus, contextual modules existem; finance_native é GREENFIELD.',
    phases: Object.freeze([
      'Fase A — integrar forecasting gap + consolidar widgets CC',
      'Fase B — activar EOX finance + contextual unlock',
      'Fase C — finance_native ERP (AP/AR, tesouraria) — GREENFIELD scoped'
    ])
  }),
  supply: Object.freeze({
    strategy: 'recover_then_expand',
    rationale: 'Consumidor OPM-008 parcial — workspace existe, EOX inactive.',
    phases: Object.freeze([
      'Fase A — activar EOX supply + rotas',
      'Fase B — handoff logistics cognitive',
      'Fase C — expandir procurement scoped'
    ])
  }),
  ppap: Object.freeze({
    strategy: 'recover_then_expand',
    rationale: 'Native cockpit CC maduro — EOX PLANNED. Padrão REG.',
    phases: Object.freeze(['ligar EOX + routes quality', 'expandir PPAP operational'])
  }),
  msa: Object.freeze({
    strategy: 'recover_then_expand',
    rationale: 'Native cockpit CC — desconectado EOX.',
    phases: Object.freeze(['ligar EOX + routes quality'])
  }),
  ishikawa: Object.freeze({
    strategy: 'recover_then_expand',
    rationale: 'Native cockpit CC — desconectado EOX.',
    phases: Object.freeze(['ligar EOX + routes quality'])
  }),
  purchasing: Object.freeze({
    strategy: 'recover_then_expand',
    rationale: 'Supply parcial + BudgetReference cross-ref FIN-AUD.',
    phases: Object.freeze(['depende supply recover', 'BudgetReference integration'])
  }),
  executive: Object.freeze({
    strategy: 'integrate_then_develop',
    rationale: 'AIOI + cognitive economics parciais — consolidar antes expandir.',
    phases: Object.freeze(['unificar widgets vs páginas', 'expandir executive scoped'])
  }),
  production: Object.freeze({
    strategy: 'greenfield',
    rationale: 'EOX inactive PLANNED — confirmado not_started; MES/ERP refs only.',
    phases: Object.freeze(['scoped discovery mínima se necessário', 'GREENFIELD operational runtime'])
  }),
  maintenance: Object.freeze({
    strategy: 'greenfield',
    rationale: 'Sem runtime dedicado na baseline ENT-001.',
    phases: Object.freeze(['GREENFIELD após production refs'])
  }),
  hr: Object.freeze({
    strategy: 'greenfield',
    rationale: 'Ausente em EOX e domainRegistry.',
    phases: Object.freeze(['GREENFIELD — menor prioridade evidência'])
  }),
  audit: Object.freeze({
    strategy: 'maintenance_only',
    rationale: 'Programas FIN-AUD/REG/ENT — manter read-only audit layer.',
    phases: Object.freeze(['evidências', 'sem novos programas horizontais'])
  }),
  compliance: Object.freeze({
    strategy: 'integrate_then_develop',
    rationale: 'Views cross-domain Q/S/E — consolidar governance.',
    phases: Object.freeze(['integrar compliance views', 'expand scoped'])
  })
});

export function buildEvolutionStrategies() {
  return Object.freeze(
    ARCH_DOMAIN_ANALYSIS.map((domain) => {
      const override = STRATEGY_OVERRIDES[domain.domainId];
      const gap = ARCH_GAP_ANALYSIS.find((g) => g.domainId === domain.domainId);
      const reuse = ARCH_REUSE_ANALYSIS.find((r) => r.domainId === domain.domainId);

      const strategy = override?.strategy || _inferStrategy(domain, gap);
      const rationale =
        override?.rationale ||
        `Inferido: maturity=${domain.maturity}, reuse=${reuse?.reuseEstimatePercent || 0}%`;

      return Object.freeze({
        domainId: domain.domainId,
        label: domain.label,
        maturity: domain.maturity,
        strategy,
        strategyValid: EVOLUTION_STRATEGIES.includes(strategy),
        rationale,
        phases: override?.phases || Object.freeze([]),
        reuseEstimatePercent: reuse?.reuseEstimatePercent || 0,
        integrationGapCount: gap?.gapSummary?.integrationGapCount || 0,
        developmentGapCount: gap?.gapSummary?.developmentGapCount || 0,
        forbidden: _forbiddenActions(strategy)
      });
    })
  );
}

function _inferStrategy(domain, gap) {
  if (domain.maturity === 'certified' || domain.maturity === 'mature') return 'maintenance_only';
  if (domain.maturity === 'not_started') return 'greenfield';
  if (gap?.integrationOnly) return 'recover_then_expand';
  if (gap?.developmentRequired) return 'integrate_then_develop';
  return 'recover_then_expand';
}

function _forbiddenActions(strategy) {
  const map = {
    maintenance_only: Object.freeze(['greenfield rebuild', 'novos programas horizontais']),
    integrate_then_develop: Object.freeze(['recriar capacidades existentes', 'FIN-001 directo sem integração']),
    recover_then_expand: Object.freeze(['reimplementar cockpits/runtimes existentes']),
    greenfield: Object.freeze(['assumir ausência total — validar ENT baseline primeiro'])
  };
  return map[strategy] || Object.freeze([]);
}

export const ARCH_EVOLUTION_STRATEGIES = buildEvolutionStrategies();

export function getEvolutionStrategy(domainId) {
  return ARCH_EVOLUTION_STRATEGIES.find((s) => s.domainId === domainId) ?? null;
}

export function listDomainsByStrategy(strategy) {
  return ARCH_EVOLUTION_STRATEGIES.filter((s) => s.strategy === strategy);
}

export function validateEvolutionStrategies() {
  const issues = [];
  for (const s of ARCH_EVOLUTION_STRATEGIES) {
    if (!s.strategyValid) issues.push(`${s.domainId}: invalid strategy ${s.strategy}`);
  }
  const finance = getEvolutionStrategy('finance');
  if (finance?.strategy !== 'integrate_then_develop') {
    issues.push('finance must be integrate_then_develop');
  }
  const wms = getEvolutionStrategy('logistics_wms');
  if (wms?.strategy !== 'maintenance_only') {
    issues.push('logistics_wms must be maintenance_only');
  }
  return {
    valid: issues.length === 0,
    issues,
    phase: ARCH_PLAN_001_PHASE,
    count: ARCH_EVOLUTION_STRATEGIES.length,
    byStrategy: Object.freeze(
      EVOLUTION_STRATEGIES.reduce((acc, st) => {
        acc[st] = listDomainsByStrategy(st).length;
        return acc;
      }, {})
    )
  };
}
