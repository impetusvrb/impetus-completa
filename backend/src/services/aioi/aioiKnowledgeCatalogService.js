'use strict';

/**
 * AIOI-P7.2 — Knowledge Catalog Service
 *
 * Catálogo estruturado de conhecimento operacional — READ ONLY.
 * Spec: backend/docs/AIOI_KNOWLEDGE_CATALOG_SPECIFICATION.md
 */

const operationalKnowledge = require('./aioiOperationalKnowledgeService');
const auditTrail = require('./aioiAuditTrailService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');
const tenantCapacity = require('./aioiTenantCapacityService');
const consumerMetrics = require('./aioiConsumerMetrics');
const executionMetrics = require('./aioiExecutionMetrics');
const learningMetrics = require('./aioiLearningMetrics');

const LAYER = 'AIOI_KNOWLEDGE_CATALOG';

/**
 * Catálogo de conhecimento por domínio operacional.
 * @returns {Promise<object>}
 */
async function getKnowledgeCatalog() {
  const [knowledge, trail, compliance, capacity] = await Promise.all([
    operationalKnowledge.consolidateOperationalKnowledge(),
    Promise.resolve(auditTrail.getConsolidatedAuditTrail()),
    complianceAnalytics.getComplianceAnalytics(),
    tenantCapacity.getTenantCapacitySnapshot()
  ]);

  return {
    ok: true,
    layer: LAYER,
    workflow_knowledge: {
      source:           'aioiClassificationEngine',
      recurring_events: knowledge.recurring_events.filter(e => e.category),
      session_counters: consumerMetrics.getSessionCounters(),
      audit_events:     trail.workflow_audit.events?.length || 0
    },
    execution_knowledge: {
      source:           'aioiExecutionBridgeService',
      session_counters: executionMetrics.getSessionCounters(),
      audit_layer:      trail.execution_audit.layer
    },
    learning_knowledge: {
      source:           'aioiLearningBridgeService',
      outcome_catalog:  knowledge.outcome_catalog,
      session_counters: learningMetrics.getSessionCounters(),
      audit_layer:      trail.learning_audit.layer
    },
    sla_knowledge: {
      source:       'aioiSlaComplianceService',
      patterns:     knowledge.sla_patterns,
      snapshot:     knowledge.sla_snapshot,
      compliance:   compliance.sla_compliance
    },
    risk_knowledge: {
      source:          'aioiOperationalRiskRegisterService',
      recurring_risks: knowledge.recurring_risks
    },
    tenant_knowledge: {
      pilot_tenant_count: capacity.pilot_tenant_count,
      tenants:            capacity.tenants.map(t => ({
        company_id:   t.company_id,
        saturation:   t.tenant_operational_saturation?.level,
        queue_volume: t.tenant_queue_volume?.pending
      }))
    },
    compliance_knowledge: {
      overall_score:         compliance.overall_compliance_score,
      workflow_compliance:   compliance.workflow_compliance,
      governance_compliance: compliance.governance_compliance,
      tenant_compliance:     compliance.tenant_compliance
    },
    catalog_entry_count: (
      knowledge.recurring_events.length
      + knowledge.outcome_catalog.length
      + knowledge.sla_patterns.length
      + knowledge.recurring_risks.length
    ),
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getKnowledgeCatalog,
  LAYER
};
