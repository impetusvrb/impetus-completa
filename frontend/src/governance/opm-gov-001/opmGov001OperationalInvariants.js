/**
 * OPM-GOV-001 — Operational Invariants (congelado).
 * Regras obrigatórias certificadas OPM-E2E-001.
 */
export const OPM_GOV_001_INVARIANTS = Object.freeze([
  Object.freeze({
    id: 'INV-RCV-001',
    module: 'receiving',
    rule: 'Não pode concluir sem movimento receipt',
    enforcement: 'completeReceivingWithInventory exige postReceivingInventoryMovements',
    certifiedBy: 'OPM-E2E-001'
  }),
  Object.freeze({
    id: 'INV-PCK-001',
    module: 'picking',
    rule: 'Não pode concluir sem estoque disponível',
    enforcement: 'completePickingWithInventory valida linhas pick_lines com qty > 0',
    certifiedBy: 'OPM-E2E-001'
  }),
  Object.freeze({
    id: 'INV-PCK-002',
    module: 'picking',
    rule: 'Conclusão gera movimento pick',
    enforcement: 'movement_type pick · reference_type picking',
    certifiedBy: 'OPM-E2E-001'
  }),
  Object.freeze({
    id: 'INV-SHP-001',
    module: 'shipping',
    rule: 'Não pode iniciar carregamento sem Picking concluído',
    enforcement: 'metadata.picking_order_id obrigatório · linkCompletedPickingOrders',
    certifiedBy: 'OPM-E2E-001'
  }),
  Object.freeze({
    id: 'INV-SHP-002',
    module: 'shipping',
    rule: 'Expedição gera movimento issue',
    enforcement: 'dispatchShippingWithInventory · movement_type issue',
    certifiedBy: 'OPM-E2E-001'
  }),
  Object.freeze({
    id: 'INV-INV-001',
    module: 'inventory',
    rule: 'Não pode emitir issue sem existir pick prévio na sequência E2E',
    enforcement: 'Sequência certificada receipt → pick → issue',
    certifiedBy: 'OPM-E2E-001'
  }),
  Object.freeze({
    id: 'INV-INV-002',
    module: 'inventory',
    rule: 'Movimentos não podem ser órfãos',
    enforcement: 'reference_id deve corresponder a ordem do módulo origem',
    certifiedBy: 'OPM-E2E-001'
  }),
  Object.freeze({
    id: 'INV-TML-001',
    module: 'timeline',
    rule: 'Eventos não podem apresentar-se fora da ordem cronológica',
    enforcement: 'build*TimelineEvents ordenados por ts ascendente na validação E2E',
    certifiedBy: 'OPM-E2E-001'
  }),
  Object.freeze({
    id: 'INV-OBS-001',
    module: 'observability',
    rule: 'Cada mudança operacional certificada produz evento correspondente',
    enforcement: 'track* functions em *InventoryIntegration e *Observability',
    certifiedBy: 'OPM-E2E-001'
  }),
  Object.freeze({
    id: 'INV-MOV-001',
    module: 'movements',
    rule: 'Sequência E2E receipt → pick → issue sem tipos intercalados inválidos',
    enforcement: 'OPM_GOV_001_CERTIFIED_MOVEMENT_SEQUENCE',
    certifiedBy: 'OPM-E2E-001'
  })
]);

export function getInvariantsForModule(moduleId) {
  return OPM_GOV_001_INVARIANTS.filter((i) => i.module === moduleId);
}

export function getInvariantById(id) {
  return OPM_GOV_001_INVARIANTS.find((i) => i.id === id) || null;
}
