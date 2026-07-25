/**
 * OPM-E2E-001 — Validadores de certificação ponta-a-ponta.
 */
import { resolveReceivingOperationalStatus } from '../../domains/logistics-operational/modules/receiving/receivingListUtils.js';
import { resolvePickingOperationalStatus } from '../../domains/logistics-operational/modules/picking/pickingListUtils.js';
import { resolveShippingOperationalStatus } from '../../domains/logistics-operational/modules/shipping/shippingListUtils.js';

const REQUIRED_MOVEMENT_SEQUENCE = ['receipt', 'pick', 'issue'];

export function assertFinalStates(flow, expected) {
  const rcv = resolveReceivingOperationalStatus(flow.receiving.final);
  const pck = resolvePickingOperationalStatus(flow.picking.final);
  const shp = resolveShippingOperationalStatus(flow.shipping.final);

  if (rcv !== expected.receiving) {
    throw new Error(`Receiving: esperado ${expected.receiving}, obtido ${rcv}`);
  }
  if (pck !== expected.picking) {
    throw new Error(`Picking: esperado ${expected.picking}, obtido ${pck}`);
  }
  if (shp !== expected.shipping) {
    throw new Error(`Shipping: esperado ${expected.shipping}, obtido ${shp}`);
  }
}

export function validateMovementChain(movements, flow) {
  const types = movements.map((m) => m.movement_type);
  const seqIdx = REQUIRED_MOVEMENT_SEQUENCE.map((t) => types.indexOf(t));
  if (seqIdx.some((i) => i < 0)) {
    throw new Error(`Sequência incompleta: ${types.join(' → ')}`);
  }
  if (seqIdx[0] >= seqIdx[1] || seqIdx[1] >= seqIdx[2]) {
    throw new Error(`Ordem inválida receipt→pick→issue: ${types.join(' → ')}`);
  }

  const refs = new Set([
    flow.receiving.final.id,
    flow.picking.final.id,
    flow.shipping.final.id
  ]);
  for (const m of movements) {
    if (!refs.has(m.reference_id)) {
      throw new Error(`Movimento órfão: ${m.id} ref ${m.reference_id}`);
    }
    if (m.movement_type === 'receipt' && m.reference_type !== 'receiving') {
      throw new Error(`receipt deve referenciar receiving`);
    }
    if (m.movement_type === 'pick' && m.reference_type !== 'picking') {
      throw new Error(`pick deve referenciar picking`);
    }
    if (m.movement_type === 'issue' && m.reference_type !== 'shipping') {
      throw new Error(`issue deve referenciar shipping`);
    }
  }

  const itemIds = new Set(movements.map((m) => m.item_id));
  if (itemIds.size !== 1) {
    throw new Error('Item inconsistente entre movimentos');
  }
  return true;
}

export function validateTimelineContinuity(moduleEvents) {
  for (const [module, events] of Object.entries(moduleEvents)) {
    if (!events.length) {
      throw new Error(`Timeline vazia: ${module}`);
    }
    const sorted = [...events].sort((a, b) => new Date(a.ts) - new Date(b.ts));
    for (let i = 1; i < sorted.length; i++) {
      if (new Date(sorted[i].ts) < new Date(sorted[i - 1].ts)) {
        throw new Error(`Timeline ${module}: eventos fora de ordem`);
      }
    }
  }
  return true;
}

export function validateObservabilityChain(snapshot, requiredEvents) {
  const seen = snapshot.map((e) => e.event);
  for (const ev of requiredEvents) {
    if (!seen.includes(ev)) {
      throw new Error(`Evento observabilidade em falta: ${ev}`);
    }
  }
  return true;
}

export function validateEoxPhases(navResults, expected) {
  for (const [segment, phase] of Object.entries(expected)) {
    const nav = navResults[segment];
    if (!nav || nav.phase !== phase) {
      throw new Error(`EOX ${segment}: esperado ${phase}, obtido ${nav?.phase}`);
    }
  }
  return true;
}
