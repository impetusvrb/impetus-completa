/**
 * FIN-CONCEPT-001 — Finance Capability Assessment & Evolution Design
 * READ ONLY catalog — no implementation, no architecture mutation.
 *
 * Sources: PLATFORM-2026.1 · ARCH-PLAN-001 · FIN-AUD-001 · FIN-EVOLVE-001 · FIN-EVOLVE-001A
 */
export const FIN_CONCEPT_001_PHASE = 'FIN-CONCEPT-001';
export const FIN_CONCEPT_001_PRINCIPLE = 'ASSESS BEFORE BUILD';
export const FIN_CONCEPT_001_SCOPE = Object.freeze({
  implementsFeatures: false,
  createsModules: false,
  modifiesArchitecture: false,
  producesAssessmentOnly: true
});

/** Existence classification */
export const EXISTENCE = Object.freeze({
  EXISTS: 'exists',
  PARTIAL: 'partial',
  ABSENT: 'absent'
});

/** Implementation recommendation class — consumed by FIN-PLAN-001 (release planning) */
export const ROADMAP_CLASS = Object.freeze({
  IMMEDIATE_REUSE: 'immediate_reuse',
  INCREMENTAL_EXPANSION: 'incremental_expansion',
  NEW_MODULE: 'new_module'
});

/** Strategies aligned to ARCH-PLAN-001 */
export const STRATEGY = Object.freeze({
  INTEGRATE_THEN_DEVELOP: 'integrate_then_develop',
  RECOVER_THEN_EXPAND: 'recover_then_expand',
  GREENFIELD: 'greenfield',
  MAINTENANCE_ONLY: 'maintenance_only'
});

/**
 * Capability assessment cards — one entry per proposed capability.
 * Fields answer: Exists? Partial? Reuse? New module? Priority? Strategy?
 */
export const FIN_CONCEPT_001_CAPABILITIES = Object.freeze([
  Object.freeze({
    id: 'smart_costing',
    name: 'Smart Costing (Custo Unitário Dinâmico)',
    existence: EXISTENCE.PARTIAL,
    roadmapClass: ROADMAP_CLASS.INCREMENTAL_EXPANSION,
    strategy: STRATEGY.INTEGRATE_THEN_DEVELOP,
    priority: 'P1',
    businessValue: 'high',
    objective:
      'Calcular e apresentar custo unitário dinâmico por produto/linha/evento a partir de drivers operacionais.',
    businessValueDetail:
      'Permite decisões de margem e pricing operacional sem ERP contábil completo.',
    dependencies: Object.freeze([
      'industrialCostService',
      'industrialCostImpactService',
      'IoT/PLC telemetry',
      'production events'
    ]),
    reusedComponents: Object.freeze([
      'backend/src/services/industrialCostService.js',
      'backend/src/services/industrialCostImpactService.js',
      'backend/src/services/unifiedCostControlService.js',
      'frontend CentroCustosExecutivo (/app/finance/costs)',
      'dashboard /costs/* APIs'
    ]),
    missingComponents: Object.freeze([
      'activity-based costing (ABC) multi-driver',
      'standard vs actual costing',
      'product/SKU unit cost engine',
      'BOM cost rollup'
    ]),
    baselineImpact: 'low — extends certified cost services; no new ERP',
    opmCplEoxImpact: 'EOX Finance module extension; CPL contracts additive; OPM events as cost drivers',
    recommendation:
      'Evoluir industrialCostService + Cost Impact — NÃO criar engine Smart Costing paralelo.',
    isNewModule: false,
    notes: 'FIN-AUD: industrial costs = complete core; Smart Costing = product layer on top.'
  }),

  Object.freeze({
    id: 'predictive_maintenance_financial',
    name: 'Manutenção Preditiva Financeira',
    existence: EXISTENCE.PARTIAL,
    roadmapClass: ROADMAP_CLASS.INCREMENTAL_EXPANSION,
    strategy: STRATEGY.INTEGRATE_THEN_DEVELOP,
    priority: 'P1',
    businessValue: 'high',
    objective:
      'Traduzir previsões de falha / PdM em impacto financeiro (custo de parada, ROI preventivo).',
    businessValueDetail:
      'Prioriza OS e CAPEX de manutenção pelo $ evitado, não só pela criticidade técnica.',
    dependencies: Object.freeze([
      'ManuIA / digital twin Applied',
      'industrialCostImpactService',
      'operationalForecastingService',
      'economicPressureIndexEngine (proxy)'
    ]),
    reusedComponents: Object.freeze([
      'digitalTwinService / digitalTwinApplied',
      'ManuIA (/api/manutencao-ia)',
      'operationalForecastingService (risco falhas + custo)',
      'industrialCostImpactService',
      'operationalEconomicImpactEngine (proxy horário)'
    ]),
    missingComponents: Object.freeze([
      'ROI preventivo estruturado',
      'work-order cost model',
      'ligação nativa twin → finance domain route',
      'maintenance domain EOX (ARCH-PLAN: greenfield maintenance)'
    ]),
    baselineImpact: 'medium — bridges maintenance (greenfield domain) with Finance costs',
    opmCplEoxImpact: 'CPL ScenarioProvider + Recommendation; Finance EOX deep-link; no new OPM program',
    recommendation:
      'Compor ManuIA/Twin + industrialCostImpact + forecasting — evitar simulador financeiro de manutenção novo.',
    isNewModule: false,
    notes: 'ARCH-PLAN: maintenance = greenfield domain; financial layer must reuse cost engines.'
  }),

  Object.freeze({
    id: 'scenario_planning_whatif',
    name: 'Planejamento de Cenários (What-if)',
    existence: EXISTENCE.PARTIAL,
    roadmapClass: ROADMAP_CLASS.INCREMENTAL_EXPANSION,
    strategy: STRATEGY.INTEGRATE_THEN_DEVELOP,
    priority: 'P1',
    businessValue: 'high',
    objective:
      'Simular cenários financeiros operacionais (custo, perda, margem) sem side-effects em produção.',
    businessValueDetail:
      'Suporta decisões executivas com hipóteses controladas sobre custos e vazamentos.',
    dependencies: Object.freeze([
      'CPL ScenarioProvider',
      'OPM-008 ClScenarioSimulationPanel',
      'CentroPrevisaoOperacional',
      'AIOI scenario services',
      'Digital Twin (state baseline)'
    ]),
    reusedComponents: Object.freeze([
      'CPL ScenarioProvider / clScenarioUtils',
      'OPM-008 cognitive-logistics what-if (in-memory)',
      'operationalForecastingService + CentroPrevisaoOperacional',
      'AIOI aioiScenario* / capacity expansion scenarios',
      'DigitalTwinPanel + digital twin state APIs'
    ]),
    missingComponents: Object.freeze([
      'financial what-if engine (budget/cashflow/margin)',
      'scenario persistence for Finance domain',
      'Finance workspace scenario UI'
    ]),
    baselineImpact: 'low-medium — extend CPL scenarios with finance projection adapters',
    opmCplEoxImpact: 'Primary reuse = CPL + OPM-008 pattern; EOX Finance new view only',
    recommendation:
      'Estender ScenarioProvider/CPL + forecasting com adapters financeiros — NÃO greenfield de simulador.',
    isNewModule: false,
    notes: 'Strongest immediate path toward Financial Digital Twin projections.'
  }),

  Object.freeze({
    id: 'inventory_financial_optimization',
    name: 'Otimização Financeira de Estoque',
    existence: EXISTENCE.PARTIAL,
    roadmapClass: ROADMAP_CLASS.INCREMENTAL_EXPANSION,
    strategy: STRATEGY.INTEGRATE_THEN_DEVELOP,
    priority: 'P2',
    businessValue: 'medium_high',
    objective:
      'Optimizar inventário por custo de carregamento, capital parado e risco de ruptura ($).',
    businessValueDetail:
      'Liga WMS qty a valor financeiro e recomendações de reposição.',
    dependencies: Object.freeze([
      'WMS inventory module',
      'Supply BudgetReference',
      'industrial costs / leakage',
      'recommendation engines'
    ]),
    reusedComponents: Object.freeze([
      'frontend/src/domains/logistics-operational/modules/inventory',
      'Supply BudgetReference / budgetCompliancePolicy',
      'aioiCognitiveRecommendationService',
      'financialLeakageDetectorService (dead stock / losses map patterns)'
    ]),
    missingComponents: Object.freeze([
      'inventory valuation',
      'carrying cost model',
      'EOQ / financial reorder policy',
      'dead-stock $ scoring nativo'
    ]),
    baselineImpact: 'medium — touches certified WMS; must be additive adapters',
    opmCplEoxImpact: 'OPM inventory certified — extend via adapters; Finance EOX cross-link',
    recommendation:
      'Adapter Finance↔WMS inventory — preservar OPM/WMS; sem reimplementar inventário.',
    isNewModule: false,
    notes: 'WMS = maintenance_only; financial layer must be external composition.'
  }),

  Object.freeze({
    id: 'role_based_dashboards',
    name: 'Dashboards por papel',
    existence: EXISTENCE.PARTIAL,
    roadmapClass: ROADMAP_CLASS.IMMEDIATE_REUSE,
    strategy: STRATEGY.INTEGRATE_THEN_DEVELOP,
    priority: 'P0',
    businessValue: 'medium',
    objective:
      'Apresentar KPIs financeiros relevantes por role/profile (CEO, CFO, gerente).',
    businessValueDetail:
      'Reduz ruído; acelera adopção do domínio Finance já integrado.',
    dependencies: Object.freeze([
      'dashboardProfiles',
      'finance_management profile',
      'Centro Comando widgets',
      'FIN-EVOLVE-001A metadata'
    ]),
    reusedComponents: Object.freeze([
      'backend/src/config/dashboardProfiles.js',
      'Centro Comando + CenterWidget deep-links',
      'ExecutiveDashboard / Pulse executive',
      'FINANCE_DOMAIN_IDENTITY / workspace hierarchy'
    ]),
    missingComponents: Object.freeze([
      'KPI pack Finance-only por role formalizado',
      'CEO vs CFO widget contracts documentados'
    ]),
    baselineImpact: 'very low — presentation / profile wiring only',
    opmCplEoxImpact: 'EOX + Centro Cognitivo navigation already ready (001A)',
    recommendation:
      'Reutilizar profiles + widgets CC + hub Finance — apenas curadoria e deep-links.',
    isNewModule: false,
    notes: 'Highest ROI short-term after FIN-STAB-001.'
  }),

  Object.freeze({
    id: 'natural_language_analysis',
    name: 'Análise em linguagem natural',
    existence: EXISTENCE.PARTIAL,
    roadmapClass: ROADMAP_CLASS.INCREMENTAL_EXPANSION,
    strategy: STRATEGY.INTEGRATE_THEN_DEVELOP,
    priority: 'P2',
    businessValue: 'medium',
    objective:
      'Permitir perguntas em NL sobre custos, vazamentos e projeções no contexto Finance.',
    businessValueDetail:
      'Acesso executivo sem navegação técnica; alinha Centro Cognitivo + IA existente.',
    dependencies: Object.freeze([
      'chat / Impetus IA',
      'ANAM',
      'smartPanel / claudePanel',
      'Finance public contracts'
    ]),
    reusedComponents: Object.freeze([
      'routes/chat + AIChatPage',
      'anamService / voice',
      'smartPanelCommandService + enrichPanelChartOutput',
      'financePublicContracts (FIN-EVOLVE-001)'
    ]),
    missingComponents: Object.freeze([
      'finance-grounded NL intent pack',
      'tool-calling bound to /finance/* contracts',
      'guardrails VIEW_FINANCIAL for NL answers'
    ]),
    baselineImpact: 'low — prompt/tools over existing APIs',
    opmCplEoxImpact: 'CPL cognitive contracts; no new runtime',
    recommendation:
      'Ground chat/smart panel nos contratos Finance — sem motor NL financeiro novo.',
    isNewModule: false,
    notes: 'Reuse first; financial accuracy depends on contract grounding.'
  }),

  Object.freeze({
    id: 'smart_financial_alerts',
    name: 'Alertas financeiros inteligentes',
    existence: EXISTENCE.PARTIAL,
    roadmapClass: ROADMAP_CLASS.IMMEDIATE_REUSE,
    strategy: STRATEGY.INTEGRATE_THEN_DEVELOP,
    priority: 'P0',
    businessValue: 'high',
    objective:
      'Alertar desvios de custo, leakage e impacto projectado com recomendações accionáveis.',
    businessValueDetail:
      'Fecha o loop operação → $ → acção no Centro de Comando / Finance hub.',
    dependencies: Object.freeze([
      'financialLeakageDetectorService',
      'operationalForecasting alerts',
      'recommendation engines',
      'notification center'
    ]),
    reusedComponents: Object.freeze([
      'financial-leakage /alerts + projected-impact',
      'operationalForecastingService alerts',
      'aioiCognitiveRecommendationService',
      'Centro Comando WidgetMapaVazamentos'
    ]),
    missingComponents: Object.freeze([
      'unified Finance alert taxonomy',
      'threshold policy UI no domínio Finance',
      'cross-domain alert correlation (cost × twin × WMS)'
    ]),
    baselineImpact: 'low — compose existing alert endpoints',
    opmCplEoxImpact: 'CPL recommendations + EOX Finance landing',
    recommendation:
      'Unificar superfície de alertas no hub Finance consumindo leakage + forecasting — zero engine novo.',
    isNewModule: false,
    notes: 'REG-002 recovered leakage APIs; FIN-AUD gap docs may be stale on routes.'
  }),

  Object.freeze({
    id: 'executive_financial_kpis',
    name: 'Indicadores financeiros executivos',
    existence: EXISTENCE.PARTIAL,
    roadmapClass: ROADMAP_CLASS.IMMEDIATE_REUSE,
    strategy: STRATEGY.INTEGRATE_THEN_DEVELOP,
    priority: 'P0',
    businessValue: 'high',
    objective:
      'KPIs executivos de custo, perda, pressão económica e billing numa vista Finance.',
    businessValueDetail:
      'Linguagem comum CEO/CFO sobre o que a plataforma já mede.',
    dependencies: Object.freeze([
      'industrialCost summary',
      'leakage ranking',
      'economicPressureIndexEngine',
      'ImpetusChart panels'
    ]),
    reusedComponents: Object.freeze([
      'dashboard costs + leakage APIs',
      'operationalEconomicImpactEngine / economicPressureIndexEngine',
      'ImpetusChart / ImpetusChartPanel',
      'finance_management dashboard profile'
    ]),
    missingComponents: Object.freeze([
      'KPI dictionary Finance formal',
      'margin / EBITDA operacional (se desejado) — não existe',
      'consolidação multi-planta'
    ]),
    baselineImpact: 'very low',
    opmCplEoxImpact: 'Presentation on EOX Finance hub',
    recommendation:
      'Curar KPIs existentes no workspace Finance — charts com dados reais (DS Industrial).',
    isNewModule: false,
    notes: 'Do not invent GL KPIs; stay operational-financial.'
  }),

  Object.freeze({
    id: 'capex_opex_investment',
    name: 'Gestão de investimentos (CAPEX/OPEX)',
    existence: EXISTENCE.ABSENT,
    roadmapClass: ROADMAP_CLASS.NEW_MODULE,
    strategy: STRATEGY.GREENFIELD,
    priority: 'P3',
    businessValue: 'medium',
    objective:
      'Planear, aprovar e acompanhar investimentos CAPEX/OPEX com ligação a ROI operacional.',
    businessValueDetail:
      'Governança de capital — distinto de custos industriais de operação.',
    dependencies: Object.freeze([
      'Supply ApprovalPolicyService (CAPEX limit vestigial)',
      'BudgetReference (procurement)',
      'future finance_native (ARCH-PLAN Fase C)'
    ]),
    reusedComponents: Object.freeze([
      'Supply ApprovalPolicyService CAPEX limit',
      'BudgetReference / budgetCompliancePolicy (partial analogy)'
    ]),
    missingComponents: Object.freeze([
      'CAPEX portfolio',
      'OPEX budget cycles',
      'investment ROI tracking',
      'approval workflows dedicados'
    ]),
    baselineImpact: 'high if built early — risk of ERP creep',
    opmCplEoxImpact: 'Would require new Finance native submodule; after STAB + ROADMAP',
    recommendation:
      'Adiar. Só após FIN-PLAN-001 backlog gate + evidência de gap em produção. Preferir Fase C finance_native scoped.',
    isNewModule: true,
    notes: 'Only vestigial CAPEX policy exists — true greenfield.'
  }),

  Object.freeze({
    id: 'economic_performance',
    name: 'Performance económica',
    existence: EXISTENCE.PARTIAL,
    roadmapClass: ROADMAP_CLASS.INCREMENTAL_EXPANSION,
    strategy: STRATEGY.INTEGRATE_THEN_DEVELOP,
    priority: 'P1',
    businessValue: 'high',
    objective:
      'Índice / score de performance económica operacional (pressão, impacto, eficiência $).',
    businessValueDetail:
      'Proxy de saúde económica da planta sem contabilidade formal.',
    dependencies: Object.freeze([
      'economicPressureIndexEngine',
      'operationalEconomicImpactEngine',
      'costs + leakage + forecasting'
    ]),
    reusedComponents: Object.freeze([
      'operationalEconomicImpactEngine',
      'economicPressureIndexEngine',
      'industrialCost + leakage + forecasting'
    ]),
    missingComponents: Object.freeze([
      'Finance domain surface for economic index',
      'historical trend pack canónico no hub Finance',
      'benchmark multi-site'
    ]),
    baselineImpact: 'low',
    opmCplEoxImpact: 'Surface engines via EOX Finance; CPL advisory',
    recommendation:
      'Expor engines económicos existentes no domínio Finance — compose, não reescrever.',
    isNewModule: false,
    notes: 'erp_integrated: false on proxies — keep honesty in UX.'
  }),

  Object.freeze({
    id: 'managerial_consolidation',
    name: 'Consolidação gerencial',
    existence: EXISTENCE.ABSENT,
    roadmapClass: ROADMAP_CLASS.NEW_MODULE,
    strategy: STRATEGY.GREENFIELD,
    priority: 'P3',
    businessValue: 'medium',
    objective:
      'Consolidar visão gerencial multi-centro/multi-planta de resultados operacionais-financeiros.',
    businessValueDetail:
      'Necessário em grupos; prematuro antes do domínio Finance estabilizado.',
    dependencies: Object.freeze([
      'finance_native',
      'multi-company tenancy',
      'executive portal'
    ]),
    reusedComponents: Object.freeze([
      'Executive portal / Pulse executive patterns',
      'domainAuthority metadata (placeholder)'
    ]),
    missingComponents: Object.freeze([
      'consolidation engine',
      'intercompany eliminations',
      'managerial chart of accounts'
    ]),
    baselineImpact: 'high — ERP-class scope',
    opmCplEoxImpact: 'Out of scope until finance_native',
    recommendation:
      'Fora de escopo próximo. Não iniciar. Classificar como new_module pós FIN-EVOLVE-002+.',
    isNewModule: true,
    notes: 'Placeholder only in domain metadata historically.'
  }),

  Object.freeze({
    id: 'financial_digital_twin',
    name: 'Financial Digital Twin (oportunidade estratégica)',
    existence: EXISTENCE.PARTIAL,
    roadmapClass: ROADMAP_CLASS.INCREMENTAL_EXPANSION,
    strategy: STRATEGY.INTEGRATE_THEN_DEVELOP,
    priority: 'P1',
    businessValue: 'very_high',
    objective:
      'Estender o Digital Twin existente com camada de projeções e impacto financeiro operacional.',
    businessValueDetail:
      'Une planta digital + custos + leakage + forecasting + cenários — diferencial competitivo; alinhado integrate_then_develop.',
    dependencies: Object.freeze([
      'digitalTwinService / Applied / organizational twin',
      'industrialCostImpactService',
      'financialLeakageDetectorService',
      'operationalForecastingService',
      'CPL ScenarioProvider',
      'Centro Cognitivo'
    ]),
    reusedComponents: Object.freeze([
      'backend/src/services/digitalTwinService.js',
      'digitalTwinApplied + /api/manutencao-ia/digital-twin',
      'organizationalIntelligenceEngine digital_twin',
      'DigitalTwinPanel (Centro Cognitivo)',
      'integrations/digital-twin/state',
      'costs + leakage + forecasting + economics engines'
    ]),
    missingComponents: Object.freeze([
      'financial projection layer on twin state',
      'mapping machine/sector → cost drivers',
      'Finance EOX view "Twin Financeiro"',
      'scenario overlay (what-if $) on twin'
    ]),
    baselineImpact: 'medium — additive projection layer; twin core untouched',
    opmCplEoxImpact: 'CPL Scenario + Recommendation; EOX Finance; OPM events as drivers',
    recommendation:
      'PRIORIDADE ESTRATÉGICA de evolução. Estender twin — NÃO criar simulador financeiro separado.',
    isNewModule: false,
    notes:
      'Explicit FIN-CONCEPT-001 finding: highest-leverage integrate_then_develop opportunity.'
  })
]);

export const FIN_CONCEPT_001_SOURCES = Object.freeze([
  'PLATFORM-2026.1',
  'ARCH-PLAN-001',
  'FIN-AUD-001',
  'FIN-EVOLVE-001',
  'FIN-EVOLVE-001A',
  'REG-002'
]);

export const FIN_CONCEPT_001_ROADMAP_SEQUENCE = Object.freeze([
  'FIN-EVOLVE-001A',
  'FIN-STAB-001',
  'FIN-CONCEPT-001',
  'FIN-PLAN-001',
  'FIN-EVOLVE-002'
]);

export function getCapabilityAssessment(id) {
  return FIN_CONCEPT_001_CAPABILITIES.find((c) => c.id === id) ?? null;
}

export function listByRoadmapClass(roadmapClass) {
  return FIN_CONCEPT_001_CAPABILITIES.filter((c) => c.roadmapClass === roadmapClass);
}

export function listByExistence(existence) {
  return FIN_CONCEPT_001_CAPABILITIES.filter((c) => c.existence === existence);
}

export function buildCapabilityMatrix() {
  return FIN_CONCEPT_001_CAPABILITIES.map((c) =>
    Object.freeze({
      ideia: c.name,
      existe: c.existence === EXISTENCE.EXISTS,
      parcial: c.existence === EXISTENCE.PARTIAL,
      reutiliza: c.reusedComponents.length > 0,
      novoModulo: c.isNewModule,
      prioridade: c.priority,
      estrategia: c.strategy,
      classeRoadmap: c.roadmapClass
    })
  );
}

export function validateFinConcept001Integrity() {
  const issues = [];
  if (FIN_CONCEPT_001_CAPABILITIES.length < 11) {
    issues.push('expected ≥11 assessed capabilities including financial_digital_twin');
  }
  if (!FIN_CONCEPT_001_CAPABILITIES.some((c) => c.id === 'financial_digital_twin')) {
    issues.push('financial_digital_twin assessment required');
  }
  if (FIN_CONCEPT_001_SCOPE.implementsFeatures !== false) {
    issues.push('scope must remain assessment-only');
  }
  const twin = getCapabilityAssessment('financial_digital_twin');
  if (twin && twin.strategy !== STRATEGY.INTEGRATE_THEN_DEVELOP) {
    issues.push('Financial Digital Twin must remain integrate_then_develop');
  }
  const newMods = listByRoadmapClass(ROADMAP_CLASS.NEW_MODULE);
  for (const m of newMods) {
    if (m.existence !== EXISTENCE.ABSENT) {
      issues.push(`${m.id}: new_module should be absent existence`);
    }
  }
  return { valid: issues.length === 0, issues, count: FIN_CONCEPT_001_CAPABILITIES.length };
}
