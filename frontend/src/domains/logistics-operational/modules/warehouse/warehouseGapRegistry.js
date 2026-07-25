/**
 * OPM-001B/001C — Registo de lacunas API (sem implementação backend).
 */
export const WAREHOUSE_GAPS = Object.freeze([
  {
    id: 'GAP-OPM-WH-001',
    funcionalidade: 'KPI agregado de capacidade disponível',
    dependencia: 'GET /warehouses/summary ou campo aggregated capacity',
    impacto: 'Capacidade disponível exibe "Dados indisponíveis" sem capacity_units em metadata',
    prioridade: 'Média',
    api_necessaria: 'GET /logistics-operational/v1/warehouses/summary'
  },
  {
    id: 'GAP-OPM-WH-002',
    funcionalidade: 'Timeline operacional dedicada',
    dependencia: 'GET /warehouses/:id/events ou audit trail',
    impacto: 'Timeline derivada de criação, alteração e movimentos locais',
    prioridade: 'Média',
    api_necessaria: 'GET /logistics-operational/v1/warehouses/:id/timeline'
  },
  {
    id: 'GAP-OPM-WH-003',
    funcionalidade: 'Alertas operacionais centralizados',
    dependencia: 'GET /warehouses/alerts',
    impacto: 'Alertas derivados heuristicamente de status/capacidade local',
    prioridade: 'Baixa',
    api_necessaria: 'GET /logistics-operational/v1/warehouses/alerts'
  },
  {
    id: 'GAP-OPM-WH-004',
    funcionalidade: 'Localização geográfica do armazém',
    dependencia: 'Campos address/city/region em Warehouse contract',
    impacto: 'Localização exibe metadata quando presente',
    prioridade: 'Baixa',
    api_necessaria: 'Extensão contrato Warehouse · metadata.location'
  },
  {
    id: 'GAP-OPM-WH-005',
    funcionalidade: 'Exportação server-side',
    dependencia: 'GET /warehouses/export',
    impacto: 'Exportação CSV client-side',
    prioridade: 'Baixa',
    api_necessaria: 'GET /logistics-operational/v1/warehouses/export'
  }
]);

export const WAREHOUSE_OPERATION_GAPS = Object.freeze([
  {
    id: 'GAP-OPM-WH-006',
    funcionalidade: 'Edição de armazém',
    dependencia: 'PATCH/PUT /warehouses/:id',
    impacto: 'Campos editáveis indisponíveis — formulário bloqueado',
    prioridade: 'Alta',
    api_necessaria: 'PATCH /logistics-operational/v1/warehouses/:id'
  },
  {
    id: 'GAP-OPM-WH-007',
    funcionalidade: 'Desactivação lógica',
    dependencia: 'PATCH /warehouses/:id/status ou DELETE lógico',
    impacto: 'Sem exclusão física; desactivação não disponível',
    prioridade: 'Alta',
    api_necessaria: 'PATCH /logistics-operational/v1/warehouses/:id/status'
  },
  {
    id: 'GAP-OPM-WH-008',
    funcionalidade: 'Histórico operacional dedicado',
    dependencia: 'GET /warehouses/:id/history',
    impacto: 'Toolbar Histórico usa timeline derivada localmente',
    prioridade: 'Média',
    api_necessaria: 'GET /logistics-operational/v1/warehouses/:id/history'
  }
]);

export function getWarehouseGapMatrix() {
  return [...WAREHOUSE_GAPS, ...WAREHOUSE_OPERATION_GAPS];
}
