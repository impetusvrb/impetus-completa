/**
 * WMS-REF-001 — Contratos públicos dos Reference Components certificados.
 * Património corporativo WMS — uso obrigatório em OPM-003+ salvo justificativa arquitectural.
 */
export const WMS_REF001_PHASE = 'WMS-REF-001';
export const WMS_REF001_SOURCE_PHASE = 'OPM-002A';

/** Campos obrigatórios em cada contrato certificado */
export const WMS_REF001_CONTRACT_SCHEMA = Object.freeze([
  'id',
  'componentId',
  'slot',
  'responsibility',
  'inputs',
  'outputs',
  'events',
  'dependencies',
  'emptyState',
  'errorState',
  'loadingState',
  'slots',
  'extensionPoints'
]);

export const WMS_REF001_COMPONENT_CONTRACTS = Object.freeze({
  InventoryDashboard: Object.freeze({
    id: 'WMS-REF-DASHBOARD',
    componentId: 'InventoryDashboard',
    slot: 'dashboard',
    responsibility: 'Renderizar painel de KPIs operacionais reais do módulo WMS.',
    inputs: Object.freeze([
      { name: 'kpis', type: 'Array<{ id, label, value, color? }>', required: false, default: '[]' },
      { name: 'columns', type: 'number', required: false, default: '4' }
    ]),
    outputs: Object.freeze(['Renderização visual de KPIs via IndustrialKpiPanel']),
    events: Object.freeze([]),
    dependencies: Object.freeze(['presentation/industrial-module/IndustrialKpiPanel']),
    emptyState: 'Retorna null quando kpis.length === 0 — estado vazio gerido pelo módulo pai.',
    errorState: 'Não trata erros directamente — módulo pai fornece KPIs ou estado de erro.',
    loadingState: 'Não bloqueia render — módulo pai controla loading via IndustrialModuleLayout.',
    slots: Object.freeze(['dashboard']),
    extensionPoints: Object.freeze([
      { id: 'columns', description: 'Ajustar colunas do grid de KPIs (2–6)' },
      { id: 'kpiShape', description: 'Formato dos items passados ao IndustrialKpiPanel' }
    ])
  }),

  InventoryMetrics: Object.freeze({
    id: 'WMS-REF-METRICS',
    componentId: 'InventoryMetrics',
    slot: 'metrics',
    responsibility: 'Exibir indicadores de inteligência operacional (heurísticas locais WMS-003).',
    inputs: Object.freeze([
      { name: 'intelligence', type: 'InventoryIntelligenceBundle', required: false, default: 'null' }
    ]),
    outputs: Object.freeze(['Painel de cards operacionais (abaixo mínimo, divergências, críticos, etc.)']),
    events: Object.freeze([]),
    dependencies: Object.freeze(['InventoryOperationalIntelligencePanel', 'inventoryIntegrationContracts']),
    emptyState: 'Retorna null quando intelligence é null/undefined.',
    errorState: 'Não trata erros — módulo pai omite intelligence em falha de API.',
    loadingState: 'Oculto durante loading — módulo pai não passa intelligence até carga concluída.',
    slots: Object.freeze(['metrics']),
    extensionPoints: Object.freeze([
      { id: 'intelligenceBundle', description: 'Adaptar compute*Intelligence do domínio (Receiving, Picking…)' },
      { id: 'panelWrapper', description: 'Substituir InventoryOperationalIntelligencePanel por variante de domínio mantendo slot' }
    ])
  }),

  InventorySearch: Object.freeze({
    id: 'WMS-REF-SEARCH',
    componentId: 'InventorySearch',
    slot: 'search',
    responsibility: 'Pesquisa industrial incremental sobre dados já carregados (client-side).',
    inputs: Object.freeze([
      { name: 'value', type: 'string', required: true },
      { name: 'onChange', type: '(value: string) => void', required: true },
      { name: 'disabled', type: 'boolean', required: false, default: 'false' },
      { name: 'placeholder', type: 'string', required: false, default: 'placeholder inventário' }
    ]),
    outputs: Object.freeze(['onChange invocado a cada alteração de texto']),
    events: Object.freeze([
      { id: 'INVENTORY_SEARCH', emitter: 'módulo pai (use*Foundation)', trigger: 'query não vazia' }
    ]),
    dependencies: Object.freeze(['presentation/industrial-module/IndustrialSearchBar']),
    emptyState: 'Input sempre visível — resultado vazio tratado pelo grid/módulo pai.',
    errorState: 'disabled=true durante erro de permissão ou integração.',
    loadingState: 'disabled=true durante loading.',
    slots: Object.freeze(['search']),
    extensionPoints: Object.freeze([
      { id: 'placeholder', description: 'Texto contextual por domínio (ASN, pick list, etc.)' },
      { id: 'onChange', description: 'Hook de domínio com debounce ou observabilidade própria' }
    ])
  }),

  InventoryFilters: Object.freeze({
    id: 'WMS-REF-FILTERS',
    componentId: 'InventoryFilters',
    slot: 'filters',
    responsibility: 'Barra de filtros operacionais tipo chip/botão com estado activo.',
    inputs: Object.freeze([
      { name: 'filters', type: 'Array<{ id, label, active }>', required: false, default: '[]' },
      { name: 'onFilterChange', type: '(filterId: string) => void', required: false },
      { name: 'disabled', type: 'boolean', required: false, default: 'false' }
    ]),
    outputs: Object.freeze(['onFilterChange(filterId) ao clicar filtro']),
    events: Object.freeze([
      { id: 'INVENTORY_FILTER', emitter: 'módulo pai', trigger: 'mudança de filtro' }
    ]),
    dependencies: Object.freeze(['inventory-module.css (.inventory-filter-active)', 'btn btn-ghost']),
    emptyState: 'Retorna null quando filters.length === 0.',
    errorState: 'disabled=true — filtros não aplicáveis.',
    loadingState: 'disabled=true durante loading.',
    slots: Object.freeze(['filters']),
    extensionPoints: Object.freeze([
      { id: 'filterDefinitions', description: 'Lista de filtros por domínio (status recebimento, SLA, etc.)' },
      { id: 'cssClass', description: 'Classe activa partilhada inventory-filter-active' }
    ])
  }),

  InventoryGrid: Object.freeze({
    id: 'WMS-REF-GRID',
    componentId: 'InventoryGrid',
    slot: 'grid',
    responsibility: 'Grid operacional industrial com paginação, ordenação local e seleção de linha.',
    inputs: Object.freeze([
      { name: 'rows', type: 'Array<Record>', required: false, default: '[]' },
      { name: 'columns', type: 'Array<{ key, label, render? }>', required: false, default: 'INVENTORY_STOCK_COLUMNS' },
      { name: 'pageSize', type: 'number', required: false, default: '25' },
      { name: 'onRowSelect', type: '(row) => void', required: false },
      { name: 'selectedRowId', type: 'string|number|null', required: false, default: 'null' },
      { name: 'enableSortTracking', type: 'boolean', required: false, default: 'true' }
    ]),
    outputs: Object.freeze([
      'onRowSelect(row) ao clicar linha',
      'onSortChange interno → INVENTORY_GRID_SORT quando enableSortTracking'
    ]),
    events: Object.freeze([
      { id: 'INVENTORY_GRID_SORT', emitter: 'InventoryGrid', trigger: 'clique cabeçalho coluna', payload: '{ sortKey, direction }' }
    ]),
    dependencies: Object.freeze([
      'presentation/industrial-module/IndustrialDataGrid',
      'inventoryColumns.jsx',
      'inventoryObservability.trackInventoryGridSort'
    ]),
    emptyState: 'Retorna null quando rows.length === 0 — módulo pai mostra IndustrialModuleStateView.',
    errorState: 'Não renderizado — módulo pai suprime grid em estados de erro.',
    loadingState: 'Não renderizado — módulo pai suprime grid durante loading.',
    slots: Object.freeze(['grid']),
    extensionPoints: Object.freeze([
      { id: 'columns', description: 'Definir colunas de domínio (*Columns.jsx)' },
      { id: 'enableSortTracking', description: 'Desactivar tracking ou substituir por prefixo de módulo' },
      { id: 'pageSize', description: 'Ajustar paginação por volume operacional' }
    ])
  }),

  InventoryTimeline: Object.freeze({
    id: 'WMS-REF-TIMELINE',
    componentId: 'InventoryTimeline',
    slot: 'timeline',
    responsibility: 'Controlos de filtro da timeline operacional (período, utilizador, armazém, produto).',
    inputs: Object.freeze([
      { name: 'periodDays', type: 'number|null', required: true },
      { name: 'onPeriodChange', type: '(days) => void', required: false },
      { name: 'userFilter', type: 'string', required: false, default: "''" },
      { name: 'onUserFilterChange', type: '(value) => void', required: false },
      { name: 'warehouseFilter', type: 'string', required: false, default: "''" },
      { name: 'onWarehouseFilterChange', type: '(value) => void', required: false },
      { name: 'productFilter', type: 'string', required: false, default: "''" },
      { name: 'onProductFilterChange', type: '(value) => void', required: false },
      { name: 'warehouses', type: 'Array<{ id, code?, name? }>', required: false, default: '[]' },
      { name: 'products', type: 'Array<{ id, label }>', required: false, default: '[]' }
    ]),
    outputs: Object.freeze([
      'Callbacks de filtro para módulo pai',
      'Eventos timeline via trackInventoryTimeline / trackInventoryViewChanged'
    ]),
    events: Object.freeze([
      { id: 'INVENTORY_TIMELINE', emitter: 'InventoryTimeline', trigger: 'mudança período', payload: '{ periodDays }' },
      { id: 'INVENTORY_VIEW_CHANGED', emitter: 'InventoryTimeline', trigger: 'mudança período', payload: '{ viewId: timeline_* }' }
    ]),
    dependencies: Object.freeze(['inventoryListUtils.INVENTORY_TIMELINE_PERIODS', 'inventoryObservability']),
    emptyState: 'Controlos sempre visíveis — lista de eventos vazia renderizada por IndustrialTimeline no layout pai.',
    errorState: 'Controlos permanecem — eventos vazios se movements indisponíveis.',
    loadingState: 'Controlos activos — timeline pode estar vazia durante loading.',
    slots: Object.freeze(['timeline']),
    extensionPoints: Object.freeze([
      { id: 'periodPresets', description: 'INVENTORY_TIMELINE_PERIODS ou equivalente de domínio' },
      { id: 'filterDimensions', description: 'Adicionar dimensões (doca, ASN) mantendo padrão visual' }
    ])
  }),

  InventoryExport: Object.freeze({
    id: 'WMS-REF-EXPORT',
    componentId: 'InventoryExport',
    slot: 'export',
    responsibility: 'Barra de acções corporativa EOX para actualizar, exportar (CSV/Excel/PDF) e ajuda.',
    inputs: Object.freeze([
      { name: 'onAction', type: '(actionId: string) => void', required: false },
      { name: 'disabled', type: 'boolean', required: false, default: 'false' },
      { name: 'exportEnabled', type: 'boolean', required: false, default: 'true' }
    ]),
    outputs: Object.freeze([
      'onAction(refresh|export_csv|export_excel|export_pdf|help)',
      'trackEoxActionBar interno (EOX observability)'
    ]),
    events: Object.freeze([
      { id: 'INVENTORY_EXPORT', emitter: 'módulo pai', trigger: 'export_csv|excel|pdf', payload: '{ format, rowCount }' },
      { id: 'EOX_ACTION_BAR', emitter: 'EoxActionBar', trigger: 'qualquer acção' }
    ]),
    dependencies: Object.freeze(['presentation/eox/EoxActionBar', 'presentation/eox/eoxTokens.EOX_STANDARD_ACTIONS']),
    emptyState: 'Export desactivado via exportEnabled=false quando sem dados.',
    errorState: 'disabled=true — acções bloqueadas.',
    loadingState: 'disabled=true durante loading ou exportBusy.',
    slots: Object.freeze(['export']),
    extensionPoints: Object.freeze([
      { id: 'onAction', description: 'Implementar export de domínio reutilizando formatos CSV/Excel/PDF' },
      { id: 'customActions', description: 'Acções EOX adicionais via prop actions (padrão EoxActionBar)' }
    ])
  })
});

/** Lista ordenada de IDs certificados */
export const WMS_REF001_CERTIFIED_COMPONENT_IDS = Object.freeze(
  Object.keys(WMS_REF001_COMPONENT_CONTRACTS)
);

export function getWmsRef001Contract(componentId) {
  return WMS_REF001_COMPONENT_CONTRACTS[componentId] ?? null;
}

export function assertWmsRef001ContractComplete(contract) {
  for (const field of WMS_REF001_CONTRACT_SCHEMA) {
    if (contract[field] === undefined) {
      throw new Error(`Contrato incompleto: falta campo "${field}"`);
    }
  }
  return true;
}
