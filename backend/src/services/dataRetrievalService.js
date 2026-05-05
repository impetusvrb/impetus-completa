'use strict';

/**
 * Busca contextual de dados do sistema — intenções mapeiam a uma ou mais consultas (repositories).
 */

const { isValidUUID } = require('../utils/security');
const {
  findUserByName,
  findUsersByCompany,
  findUserProfileById
} = require('../repositories/userRepository');
const { findOpenWorkOrders, findRecentWorkOrders } = require('../repositories/workOrderRepository');
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
const {
  deriveCorrelationInsightsWithLearning
} = require('./correlationInsightsService');
const correlationInsightsService = require('./correlationInsightsService');
const { predictOperationalRisks } = require('./predictionService');
const { prioritizeOperationalRisks } = require('./prioritizationService');
const { getLearningSummary } = require('./operationalLearningService');
const { generateOperationalPlan, deriveTemporalInsights, mergeTemporalInsights } = require('./operationalPlanningService');
const operationalDecisionEngine = require('./operationalDecisionEngine');
const { executeOperationalActions } = require('./operationalActionExecutor');

function emptyResult() {
  return {
    kpis: [],
    events: [],
    assets: [],
    contextual_data: {}
  };
}

/**
 * Plano operacional + avaliação do motor de decisões (só sinalização; efeitos via logs / strategic_learning assíncronos).
 * @param {object} p
 * @returns {{ operational_plan: object, operational_decisions: object }}
 */
function buildOperationalPlanWithDecisions({
  predictions,
  prioritized_actions,
  learning_summary,
  temporal_insights,
  companyId,
  userId,
  sourceTag
}) {
  const operational_plan = generateOperationalPlan({
    predictions,
    prioritized_actions,
    learning_summary,
    temporal_insights
  });
  const operational_decisions = operationalDecisionEngine.evaluateOperationalDecisions(operational_plan, {
    company_id: companyId,
    user_id: userId,
    temporal_insights
  });
  operationalDecisionEngine.scheduleOperationalDecisionSignals({
    companyId,
    userId,
    evaluation: operational_decisions,
    source: sourceTag
  });
  return { operational_plan, operational_decisions };
}

/**
 * Efeitos seguros (notificação / tarefa de revisão / horizontes do plano / logs) — falhas não quebram retrieveContextualData.
 * @param {object} operational_decisions
 * @param {{ id?: string, company_id?: string }|null|undefined} user
 * @param {string} companyId
 * @param {string} sourceTag
 * @param {string} intent
 * @param {object|null|undefined} [operational_plan] — mesmo objeto devolvido em contextual_data (alertas, tarefas, learning)
 */
async function finalizeOperationalDecisionActions(
  operational_decisions,
  user,
  companyId,
  sourceTag,
  intent,
  operational_plan = null
) {
  try {
    await executeOperationalActions(operational_decisions, {
      user,
      companyId,
      userId: user && user.id,
      sourceTag,
      intent,
      operational_plan: operational_plan && typeof operational_plan === 'object' ? operational_plan : null
    });
  } catch (err) {
    console.warn('[dataRetrievalService][executeOperationalActions]', err?.message ?? err);
  }
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
/**
 * @param {unknown[]} events
 * @returns {number}
 */
function shouldAttachCorrelationInsights() {
  return String(process.env.IMPETUS_CORRELATION_INSIGHTS || '1') !== '0';
}

function countFailureLikeEvents(events) {
  const list = Array.isArray(events) ? events : [];
  const re = /falha|parada|down|emerg|alarm|crit|fail|erro|error|inativo|stop|trip/i;
  let n = 0;
  for (const e of list) {
    if (!e || typeof e !== 'object') continue;
    const o = /** @type {Record<string, unknown>} */ (e);
    const sev = o.severity != null ? String(o.severity) : '';
    const et = o.event_type != null ? String(o.event_type) : '';
    if (re.test(sev) || re.test(et)) n += 1;
  }
  return n;
}

/**
 * @param {Array<{ id?: unknown, _source?: string }>} open
 * @param {Array<{ id?: unknown, _source?: string }>} recent
 * @returns {unknown[]}
 */
function mergeWorkOrdersById(open, recent) {
  const m = new Map();
  for (const r of Array.isArray(recent) ? recent : []) {
    if (r && r.id != null) m.set(String(r.id), r);
  }
  for (const o of Array.isArray(open) ? open : []) {
    if (o && o.id != null) m.set(String(o.id), o);
  }
  return Array.from(m.values());
}

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
      const correlationBundle = shouldAttachCorrelationInsights()
        ? deriveCorrelationInsightsWithLearning({
            users,
            machines,
            events,
            correlation: correlated,
            company_id: safeUser.company_id
          })
        : { insights: [], learned_patterns: [] };
      const heuristicTemporal = deriveTemporalInsights(predictions, prioritized.prioritized_actions);
      let temporal_insights = heuristicTemporal;
      try {
        const historyTemporal = await correlationInsightsService.deriveTemporalInsights(safeUser.company_id);
        temporal_insights = mergeTemporalInsights(heuristicTemporal, historyTemporal);
      } catch (err) {
        console.warn('[dataRetrievalService][temporal_insights_history]', err?.message ?? err);
      }
      const { operational_plan, operational_decisions } = buildOperationalPlanWithDecisions({
        predictions,
        prioritized_actions: prioritized.prioritized_actions,
        learning_summary,
        temporal_insights,
        companyId: safeUser.company_id,
        userId: safeUser.id,
        sourceTag: 'data_retrieval:operational_overview'
      });
      await finalizeOperationalDecisionActions(
        operational_decisions,
        safeUser,
        safeUser.company_id,
        'data_retrieval:operational_overview',
        safeIntent,
        operational_plan
      );
      result.contextual_data = {
        users,
        machines,
        events,
        correlation: correlated,
        ...predictions,
        prioritized_actions: prioritized.prioritized_actions,
        temporal_insights,
        operational_plan,
        operational_decisions,
        learning_summary,
        correlation_insights: correlationBundle.insights,
        learned_patterns: correlationBundle.learned_patterns
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
        const correlationBundle = shouldAttachCorrelationInsights()
          ? deriveCorrelationInsightsWithLearning({
              users,
              machines: [machine],
              events,
              correlation: correlated,
              company_id: safeUser.company_id
            })
          : { insights: [], learned_patterns: [] };

        const row =
          correlated.machine_status_summary && correlated.machine_status_summary[0]
            ? correlated.machine_status_summary[0]
            : null;
        const lastEventRaw =
          Array.isArray(events) && events.length
            ? events[0]
            : null;

        const heuristicTemporal = deriveTemporalInsights(predictions, prioritized.prioritized_actions);
        let temporal_insights = heuristicTemporal;
        try {
          const historyTemporal = await correlationInsightsService.deriveTemporalInsights(safeUser.company_id);
          temporal_insights = mergeTemporalInsights(heuristicTemporal, historyTemporal);
        } catch (err) {
          console.warn('[dataRetrievalService][temporal_insights_history]', err?.message ?? err);
        }
        const { operational_plan, operational_decisions } = buildOperationalPlanWithDecisions({
          predictions,
          prioritized_actions: prioritized.prioritized_actions,
          learning_summary,
          temporal_insights,
          companyId: safeUser.company_id,
          userId: safeUser.id,
          sourceTag: 'data_retrieval:get_machine_status'
        });
        await finalizeOperationalDecisionActions(
          operational_decisions,
          safeUser,
          safeUser.company_id,
          'data_retrieval:get_machine_status',
          safeIntent,
          operational_plan
        );
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
          temporal_insights,
          operational_plan,
          operational_decisions,
          learning_summary,
          correlation_insights: correlationBundle.insights,
          learned_patterns: correlationBundle.learned_patterns
        };
        return result;
      } catch (err) {
        console.warn('[dataRetrievalService][get_machine_status]', err?.message ?? err);
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
      } catch (err) {
        console.warn('[dataRetrievalService][get_product_status]', err?.message ?? err);
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

    if (safeIntent === 'get_user_profile') {
      if (!isValidUUID(String(safeUser.company_id).trim()) || !safeUser.id) {
        return result;
      }
      const uid = String(safeUser.id).trim();
      if (!isValidUUID(uid)) {
        return result;
      }
      const profile = await findUserProfileById(safeUser.company_id, uid);
      if (!profile) {
        return result;
      }
      result.contextual_data = {
        users: [
          {
            id: profile.id,
            nome: profile.name,
            cargo: profile.role,
            job_title: profile.job_title,
            departamento: profile.department,
            status: profile.status,
            email: profile.email
          }
        ],
        work_orders: [],
        metrics: {}
      };
      return result;
    }

    if (safeIntent === 'get_work_orders') {
      try {
        if (!isValidUUID(String(safeUser.company_id).trim())) {
          return result;
        }
        const [open, recent] = await Promise.all([
          findOpenWorkOrders(safeUser.company_id),
          findRecentWorkOrders(safeUser.company_id)
        ]);
        const work_orders = mergeWorkOrdersById(
          open || [],
          recent || []
        );
        result.contextual_data = {
          users: [],
          work_orders,
          metrics: {
            open_count: (open || []).length,
            recent_window_count: (recent || []).length
          }
        };
        return result;
      } catch (err) {
        console.warn('[dataRetrievalService][get_work_orders]', err?.message ?? err);
        return emptyResult();
      }
    }

    if (safeIntent === 'get_operational_metrics') {
      try {
        if (!isValidUUID(String(safeUser.company_id).trim())) {
          return result;
        }
        const [machines, events] = await Promise.all([
          findMachinesByCompany(safeUser.company_id),
          findRecentEvents(safeUser.company_id)
        ]);
        const failures = countFailureLikeEvents(events || []);
        result.contextual_data = {
          users: [],
          work_orders: [],
          metrics: {
            machines_active: (machines || []).length,
            events_recent_count: (events || []).length,
            failures: failures
          }
        };
        return result;
      } catch (err) {
        console.warn('[dataRetrievalService][get_operational_metrics]', err?.message ?? err);
        return emptyResult();
      }
    }

    if (safeIntent === 'echo_entities') {
      result.contextual_data = {
        received_entities: { ...safeEntities }
      };
      return result;
    }

    return result;
  } catch (err) {
    console.warn('[dataRetrievalService][retrieveContextualData]', err?.message ?? err);
    return emptyResult();
  }
}

module.exports = {
  retrieveContextualData
};
