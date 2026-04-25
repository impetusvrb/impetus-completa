'use strict';

/**
 * Busca contextual de dados do sistema — intenções mapeiam a uma ou mais consultas (repositories).
 */

const { isValidUUID } = require('../utils/security');
const { findUserByName, findUsersByCompany } = require('../repositories/userRepository');
const {
  findMachinesByCompany,
  findMachineById,
  isAllowedMachineIdToken
} = require('../repositories/machineRepository');
const { findRecentEvents, findEventsByMachine } = require('../repositories/eventRepository');
const {
  findProductByName,
  findProductEvents,
  findLotsByProductId,
  normalizeProductToken
} = require('../repositories/productRepository');
const { correlateOperationalData } = require('./correlationService');
const { predictOperationalRisks } = require('./predictionService');
const { prioritizeOperationalRisks } = require('./prioritizationService');
const { getLearningSummary } = require('./operationalLearningService');

function emptyResult() {
  return {
    kpis: [],
    events: [],
    assets: [],
    contextual_data: {}
  };
}

/**
 * Agrega estado de gápio do produto a partir de lotes (raw_material_lots).
 * Valores: blocked | in_analysis | released (quality_risk mapeado para in_analysis).
 * @param {Array<{ status?: string, status_reason?: string|null }>} lots
 * @returns {{ status: string, blocking_reason: string|null }}
 */
function aggregateProductGateStatus(lots) {
  const list = Array.isArray(lots) ? lots : [];
  if (!list.length) {
    return { status: 'released', blocking_reason: null };
  }
  const blocked = list.find((l) => l && String(l.status).toLowerCase() === 'blocked');
  if (blocked) {
    return {
      status: 'blocked',
      blocking_reason:
        blocked.status_reason != null && String(blocked.status_reason).trim() !== ''
          ? String(blocked.status_reason)
          : 'Produto com lote bloqueado para uso.'
    };
  }
  const analysis = list.find((l) => {
    const s = l && l.status != null ? String(l.status).toLowerCase() : '';
    return s === 'in_analysis' || s === 'quality_risk';
  });
  if (analysis) {
    return {
      status: 'in_analysis',
      blocking_reason:
        analysis.status_reason != null && String(analysis.status_reason).trim() !== ''
          ? String(analysis.status_reason)
          : null
    };
  }
  return { status: 'released', blocking_reason: null };
}

/**
 * Risco heurístico a partir de lotes e eventos de lote (sem correlação de máquinas).
 * @param {{ lots: object[], events: object[] }} ctx
 * @returns {'LOW'|'MEDIUM'|'HIGH'}
 */
function productRiskLevelFromContext(ctx) {
  const lots = Array.isArray(ctx.lots) ? ctx.lots : [];
  const events = Array.isArray(ctx.events) ? ctx.events : [];
  if (lots.some((l) => l && String(l.status).toLowerCase() === 'blocked')) {
    return 'HIGH';
  }
  for (const l of lots) {
    const rs = l && l.risk_score != null ? parseFloat(String(l.risk_score)) : 0;
    if (!Number.isNaN(rs) && rs >= 60) {
      return 'HIGH';
    }
  }
  if (lots.some((l) => l && String(l.status).toLowerCase() === 'quality_risk')) {
    return 'MEDIUM';
  }
  if (lots.some((l) => l && String(l.status).toLowerCase() === 'in_analysis')) {
    return 'MEDIUM';
  }
  if (events.length >= 5) {
    return 'MEDIUM';
  }
  if (events.length >= 1) {
    return 'LOW';
  }
  if (!lots.length) {
    return 'LOW';
  }
  return 'LOW';
}

/**
 * @param {object} params
 * @param {{ id?: string, company_id?: string, role?: string }|null|undefined} params.user
 * @param {string|null|undefined} params.intent
 * @param {object|null|undefined} params.entities — ex.: person_name, machine_id, product
 * @returns {Promise<{ kpis: array, events: array, assets: array, contextual_data: object }>}
 */
async function retrieveContextualData({ user, intent, entities } = {}) {
  const result = emptyResult();

  if (!user || !user.company_id) {
    return result;
  }

  try {
    const safeUser = user && typeof user === 'object' ? user : {};
    const safeIntent = intent != null ? String(intent).trim() : '';
    const safeEntities = entities && typeof entities === 'object' ? entities : {};

    if (safeIntent === 'get_sensitive_data') {
      return result;
    }

    if (safeIntent === 'operational_overview') {
      const [users, machines, events] = await Promise.all([
        findUsersByCompany(safeUser.company_id),
        findMachinesByCompany(safeUser.company_id),
        findRecentEvents(safeUser.company_id)
      ]);
      const correlated = correlateOperationalData({ users, machines, events });
      const predictions = predictOperationalRisks({ events, machines, correlation: correlated });
      const prioritized = prioritizeOperationalRisks({
        predictions,
        correlation: correlated,
        company_id: safeUser.company_id
      });
      const machineIds = (machines || [])
        .map((m) => m && m.id)
        .filter((id) => id != null && String(id).trim() !== '');
      const learning_summary = getLearningSummary({
        machine_ids: machineIds,
        company_id: safeUser.company_id
      });
      result.contextual_data = {
        users,
        machines,
        events,
        correlation: correlated,
        ...predictions,
        prioritized_actions: prioritized.prioritized_actions,
        learning_summary
      };
      return result;
    }

    if (safeIntent === 'get_machine_status') {
      try {
        if (!isValidUUID(String(safeUser.company_id).trim())) {
          return result;
        }
        const midRaw = safeEntities.machine_id;
        if (midRaw == null || String(midRaw).trim() === '' || !isAllowedMachineIdToken(String(midRaw))) {
          return result;
        }
        const machineId = String(midRaw).trim();
        const machine = await findMachineById(safeUser.company_id, machineId);
        if (!machine) {
          return result;
        }
        const [users, events] = await Promise.all([
          findUsersByCompany(safeUser.company_id),
          findEventsByMachine(safeUser.company_id, machineId, machine.name)
        ]);
        const correlated = correlateOperationalData({ users, machines: [machine], events });
        const predictions = predictOperationalRisks({
          events,
          machines: [machine],
          correlation: correlated
        });
        const prioritized = prioritizeOperationalRisks({
          predictions,
          correlation: correlated,
          company_id: safeUser.company_id
        });
        const learning_summary = getLearningSummary({
          machine_ids: [String(machine.id)],
          company_id: safeUser.company_id
        });

        const row =
          correlated.machine_status_summary && correlated.machine_status_summary[0]
            ? correlated.machine_status_summary[0]
            : null;
        const lastEventRaw =
          Array.isArray(events) && events.length
            ? events[0]
            : null;

        result.contextual_data = {
          machine: {
            id: String(machine.id),
            name: String(machine.name || machine.id),
            status: row && row.status != null ? String(row.status) : 'no_recent_events'
          },
          recent_events: events,
          last_event: lastEventRaw,
          correlation: correlated,
          ...predictions,
          prioritized_actions: prioritized.prioritized_actions,
          learning_summary
        };
        return result;
      } catch {
        return emptyResult();
      }
    }

    if (safeIntent === 'get_product_status') {
      try {
        if (!isValidUUID(String(safeUser.company_id).trim())) {
          return result;
        }
        if (safeEntities.product == null || normalizeProductToken(safeEntities.product) === '') {
          return result;
        }
        const product = await findProductByName(safeUser.company_id, safeEntities.product);
        if (!product) {
          return result;
        }
        const [lotRows, productEvents] = await Promise.all([
          findLotsByProductId(safeUser.company_id, product.id),
          findProductEvents(safeUser.company_id, product.id)
        ]);
        const ag = aggregateProductGateStatus(lotRows);
        const risk_level = productRiskLevelFromContext({ lots: lotRows, events: productEvents });
        result.contextual_data = {
          product,
          status: ag.status,
          blocking_reason: ag.blocking_reason,
          events: productEvents,
          risk_level
        };
        return result;
      } catch {
        return emptyResult();
      }
    }

    if (safeIntent === 'get_user_role') {
      if (safeEntities.person_name == null || String(safeEntities.person_name).trim() === '') {
        return result;
      }
      const personName = String(safeEntities.person_name).trim();
      const userData = await findUserByName(safeUser.company_id, personName);
      if (!userData) {
        return result;
      }
      result.contextual_data = {
        user_role: userData.role != null ? String(userData.role) : '',
        user_name: userData.name != null ? String(userData.name) : ''
      };
      return result;
    }

    if (safeIntent === 'echo_entities') {
      result.contextual_data = {
        received_entities: { ...safeEntities }
      };
      return result;
    }

    return result;
  } catch {
    return emptyResult();
  }
}

module.exports = {
  retrieveContextualData
};
