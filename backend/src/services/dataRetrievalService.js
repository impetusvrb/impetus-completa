'use strict';

/**
 * Busca contextual de dados do sistema — intenções mapeiam a uma ou mais consultas (repositories).
 */

const { findUserByName, findUsersByCompany } = require('../repositories/userRepository');
const { findMachinesByCompany } = require('../repositories/machineRepository');
const { findRecentEvents } = require('../repositories/eventRepository');
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
        correlation: correlated
      });
      const machineIds = (machines || [])
        .map((m) => m && m.id)
        .filter((id) => id != null && String(id).trim() !== '');
      const learning_summary = getLearningSummary({ machine_ids: machineIds });
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
