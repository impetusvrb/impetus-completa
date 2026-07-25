/**
 * FIN-AUD-001 — Domain Discovery Index (read-only · audit artifact).
 *
 * Varredura declarativa do ecossistema IMPETUS — capacidades financeiras e referências cruzadas.
 * Não altera código. Não executa regras de negócio.
 */
export const FIN_AUD_001_PHASE = 'FIN-AUD-001';
export const FIN_AUD_001_VERSION = '1.0.0';
export const FIN_AUD_001_PRINCIPLE = 'AUDIT BEFORE BUILD';

/** Termos de varredura utilizados na auditoria */
export const FIN_AUD_SEARCH_TERMS = Object.freeze([
  'Finance', 'Financial', 'Accounting', 'Ledger', 'Treasury', 'Cash', 'Budget',
  'Fiscal', 'Tax', 'Cost', 'Cost Center', 'Asset', 'Payment', 'Receivable',
  'Payable', 'Invoice', 'Billing', 'Bank', 'Reconciliation', 'Closing', 'ERP'
]);

/** Domínio Finance nativo — estado arquitectural */
export const FINANCE_DOMAIN_STATUS = Object.freeze({
  nativeDomainPath: null,
  financeNativeRuntime: 'GREENFIELD — reservado (GF-021, DEC-001)',
  eoxEntry: 'frontend/src/presentation/eox/eoxRegistry.js — active: false, /app/finance PLANNED',
  cplAdapter: null,
  maturity: 'placeholder'
});

/**
 * Entradas de descoberta — cada item é evidência auditada, não implementação nova.
 * crossDomain: true → referência cruzada (Produção, Supply, etc.)
 */
export const FIN_AUD_DISCOVERY_CATALOG = Object.freeze([
  // --- Industrial cost intelligence (operational finance) ---
  {
    id: 'industrial_cost_service',
    name: 'Industrial Cost Service',
    category: 'service',
    domain: 'platform_dashboard',
    location: 'backend/src/services/industrialCostService.js',
    responsibility: 'CRUD centros de custo, resumo executivo, top loss, projeção',
    maturity: 'complete',
    status: 'active'
  },
  {
    id: 'industrial_cost_impact',
    name: 'Industrial Cost Impact Service',
    category: 'service',
    domain: 'platform_dashboard',
    location: 'backend/src/services/industrialCostImpactService.js',
    responsibility: 'Impacto financeiro de eventos operacionais (paradas, etc.)',
    maturity: 'complete',
    status: 'active'
  },
  {
    id: 'financial_leakage_detector',
    name: 'Financial Leakage Detector',
    category: 'service',
    domain: 'platform_dashboard',
    location: 'backend/src/services/financialLeakageDetectorService.js',
    responsibility: 'Detecção vazamentos TPM/PLC/máquinas/IA; mask por role',
    maturity: 'partial',
    status: 'service_complete_routes_missing',
    note: 'Frontend consome /dashboard/financial-leakage/* — rotas não montadas em dashboard.js'
  },
  {
    id: 'dashboard_costs_api',
    name: 'Dashboard Costs API',
    category: 'api',
    domain: 'platform_dashboard',
    location: 'backend/src/routes/dashboard.js',
    responsibility: 'GET/POST/PUT/DELETE /costs/* — by-origin, executive-summary, items, top-loss, projected-loss',
    maturity: 'complete',
    status: 'active'
  },
  {
    id: 'centro_custos_executivo',
    name: 'Centro Custos Executivo',
    category: 'ui_page',
    domain: 'platform_dashboard',
    location: 'frontend/src/pages/CentroCustosExecutivo.jsx',
    route: '/app/centro-custos-industriais',
    responsibility: 'UI executiva centros de custo industriais',
    maturity: 'complete',
    status: 'active'
  },
  {
    id: 'centro_custos_admin',
    name: 'Centro Custos Admin',
    category: 'ui_page',
    domain: 'platform_dashboard',
    location: 'frontend/src/pages/CentroCustosAdmin.jsx',
    route: '/app/admin/centro-custos',
    responsibility: 'Cadastro admin itens de custo',
    maturity: 'complete',
    status: 'active'
  },
  {
    id: 'mapa_vazamento_financeiro',
    name: 'Mapa Vazamento Financeiro',
    category: 'ui_page',
    domain: 'platform_dashboard',
    location: 'frontend/src/pages/MapaVazamentoFinanceiro.jsx',
    route: '/app/mapa-vazamento-financeiro',
    responsibility: 'Visualização mapa de vazamentos financeiros operacionais',
    maturity: 'partial',
    status: 'ui_active_api_gap',
    dependsOn: ['financial_leakage_detector']
  },
  // --- Contextual modules (finance category) ---
  {
    id: 'ctx_financial_intelligence',
    name: 'financial_intelligence',
    category: 'contextual_module',
    domain: 'contextual_modules',
    location: 'backend/src/contextualModules/moduleRegistry.js',
    responsibility: 'Módulo contextual: centros de custo, perdas, vazamentos',
    maturity: 'complete',
    status: 'registered',
    paths: ['/app/centro-custos-industriais', '/app/mapa-vazamento-financeiro']
  },
  {
    id: 'ctx_cost_center',
    name: 'cost_center',
    category: 'contextual_module',
    domain: 'contextual_modules',
    location: 'backend/src/contextualModules/moduleRegistry.js',
    responsibility: 'Módulo contextual centro de custo',
    maturity: 'complete',
    status: 'registered'
  },
  {
    id: 'ctx_losses_map',
    name: 'losses_map',
    category: 'contextual_module',
    domain: 'contextual_modules',
    location: 'backend/src/contextualModules/moduleRegistry.js',
    responsibility: 'Mapa perdas/vazamentos operacionais com impacto financeiro',
    maturity: 'complete',
    status: 'registered'
  },
  // --- Nexus billing (platform monetization — not ERP finance) ---
  {
    id: 'nexus_billing_engine_v4',
    name: 'Nexus Billing Engine v4',
    category: 'runtime',
    domain: 'nexus_ia',
    location: 'backend/src/services/nexusBillingEngine/',
    responsibility: 'Motor billing IA: authorize, charge, credit, reconcile, ledger append-only',
    maturity: 'complete',
    status: 'active',
    featureFlags: ['NEXUS_BILLING_ENGINE_V4']
  },
  {
    id: 'nexus_wallet_service',
    name: 'Nexus Wallet Service',
    category: 'service',
    domain: 'nexus_ia',
    location: 'backend/src/services/nexusWalletService.js',
    responsibility: 'Carteira créditos, checkout Stripe/PagSeguro, taxas, dashboard',
    maturity: 'complete',
    status: 'active',
    featureFlags: ['NEXUS_CREDIT_WALLET']
  },
  {
    id: 'nexus_ia_custos_page',
    name: 'Nexus IA Custos',
    category: 'ui_page',
    domain: 'nexus_ia',
    location: 'frontend/src/pages/NexusIACustos.jsx',
    route: '/app/admin/nexusia-custos',
    responsibility: 'Admin wallet + ledger Nexus IA',
    maturity: 'complete',
    status: 'active'
  },
  {
    id: 'billing_token_service',
    name: 'Billing Token Service',
    category: 'service',
    domain: 'nexus_ia',
    location: 'backend/src/services/billingTokenService.js',
    responsibility: 'Billing mensal tokens, integração Asaas',
    maturity: 'complete',
    status: 'active'
  },
  // --- Domain authority / EOX (metadata) ---
  {
    id: 'domain_authority_finance',
    name: 'Domain Authority — finance',
    category: 'registry',
    domain: 'domain_authority',
    location: 'backend/src/domainAuthority/registry/domainRegistry.js',
    responsibility: 'Metadata domínio finance: pipelines budget/cashflow, widgets budget_variance/cashflow',
    maturity: 'partial',
    status: 'metadata_only',
    note: 'Pipelines budget/cashflow declarados — sem runtime nativo'
  },
  {
    id: 'eox_finance_entry',
    name: 'EOX Finance Entry',
    category: 'registry',
    domain: 'eox',
    location: 'frontend/src/presentation/eox/eoxRegistry.js',
    responsibility: 'Entrada domínio Finance — active: false, PLANNED',
    maturity: 'placeholder',
    status: 'inactive'
  },
  // --- Governance / permissions ---
  {
    id: 'view_financial_permission',
    name: 'VIEW_FINANCIAL',
    category: 'permission',
    domain: 'platform_governance',
    location: 'backend/src/middleware/authorize.js',
    responsibility: 'Gate RBAC dados financeiros — dashboard, smart panel, prompt firewall',
    maturity: 'complete',
    status: 'active',
    consumers: ['promptFirewall.js', 'smartPanelCommandService.js', 'secureContextBuilder.js', 'dashboardChartDataService.js']
  },
  {
    id: 'finance_management_profile',
    name: 'finance_management profile',
    category: 'profile',
    domain: 'platform_dashboard',
    location: 'backend/src/config/dashboardProfiles.js',
    responsibility: 'Perfil dashboard Diretor Financeiro / CFO',
    maturity: 'complete',
    status: 'active'
  },
  // --- Cognitive / economics ---
  {
    id: 'operational_economic_impact',
    name: 'Operational Economic Impact Engine',
    category: 'cognitive_engine',
    domain: 'cognitive_runtime',
    location: 'backend/src/cognitiveRuntime/economics/operationalEconomicImpactEngine.js',
    responsibility: 'Pressão de custo operacional, perdas estimadas',
    maturity: 'partial',
    status: 'active',
    crossDomain: true
  },
  {
    id: 'executive_financial_health_block',
    name: 'executive.financial_health',
    category: 'cognitive_block',
    domain: 'cognitive_runtime',
    location: 'backend/src/cognitiveRuntime/registry/executiveCognitiveBlockPack.js',
    responsibility: 'Bloco cognitivo saúde financeira executiva',
    maturity: 'partial',
    status: 'registered'
  },
  // --- Forecasting with financial impact ---
  {
    id: 'operational_forecasting',
    name: 'Operational Forecasting',
    category: 'service',
    domain: 'platform_dashboard',
    location: 'backend/src/services/operationalForecastingService.js',
    responsibility: 'Previsões operacionais com custos e projected impact leakage',
    maturity: 'partial',
    status: 'active',
    crossDomain: true
  },
  {
    id: 'centro_previsao_operacional',
    name: 'Centro Previsão Operacional',
    category: 'ui_page',
    domain: 'platform_dashboard',
    location: 'frontend/src/pages/CentroPrevisaoOperacional.jsx',
    responsibility: 'Cenários previsão com impacto financeiro operacional',
    maturity: 'partial',
    status: 'active',
    crossDomain: true
  },
  // --- Cross-domain references ---
  {
    id: 'supply_budget_reference',
    name: 'Supply BudgetReference / SpendCenter',
    category: 'cross_domain',
    domain: 'supply',
    location: 'backend/src/domains/supply/model/valueObjects.js',
    responsibility: 'Orçamento procurement — spendCenterId, allocated/consumed',
    maturity: 'experimental',
    status: 'partial',
    crossDomain: true
  },
  {
    id: 'supply_spend_analysis',
    name: 'Supply SpendAnalysisService',
    category: 'cross_domain',
    domain: 'supply',
    location: 'backend/src/domains/supply/services/SpendAnalysisService.js',
    responsibility: 'Análise gastos procurement',
    maturity: 'partial',
    status: 'partial',
    crossDomain: true
  },
  {
    id: 'mes_erp_integration',
    name: 'MES/ERP Integration',
    category: 'integration',
    domain: 'production',
    location: 'backend/src/services/mesErpIntegrationService.js',
    responsibility: 'Conectores MES/ERP sync produção — não contabilidade GL',
    maturity: 'partial',
    status: 'partial',
    crossDomain: true
  },
  {
    id: 'receiving_nf_field',
    name: 'Receiving Nota Fiscal',
    category: 'cross_domain',
    domain: 'logistics_wms',
    location: 'frontend/src/domains/logistics-operational/modules/receiving/',
    responsibility: 'Campo NF em recebimento — operacional, não fiscal ERP',
    maturity: 'operational',
    status: 'active',
    crossDomain: true
  },
  {
    id: 'production_finance_suppression',
    name: 'Production Widget Finance Suppression',
    category: 'cross_domain',
    domain: 'production',
    location: 'backend/src/cognitiveRuntime/renderPromotion/production/productionWidgetSuppression.js',
    responsibility: 'Suprime widgets financeiros no cockpit produção',
    maturity: 'complete',
    status: 'active',
    crossDomain: true
  }
]);

export function getDiscoveryEntry(id) {
  return FIN_AUD_DISCOVERY_CATALOG.find((e) => e.id === id) ?? null;
}

export function listDiscoveryByCategory(category) {
  return FIN_AUD_DISCOVERY_CATALOG.filter((e) => e.category === category);
}

export function listCrossDomainReferences() {
  return FIN_AUD_DISCOVERY_CATALOG.filter((e) => e.crossDomain === true);
}

export function validateDiscoveryIndex() {
  const ids = new Set();
  const issues = [];
  for (const e of FIN_AUD_DISCOVERY_CATALOG) {
    if (ids.has(e.id)) issues.push(`duplicate id: ${e.id}`);
    ids.add(e.id);
    if (!e.location) issues.push(`missing location: ${e.id}`);
  }
  return { valid: issues.length === 0, issues, count: FIN_AUD_DISCOVERY_CATALOG.length };
}
