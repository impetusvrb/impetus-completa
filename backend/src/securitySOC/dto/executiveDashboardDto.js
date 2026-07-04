'use strict';

/**
 * SEC-07 — Executive Dashboard DTO.
 */

function createExecutiveDashboardDto(input) {
  return {
    schema_version: 'soc_executive_v1',
    generated_at: new Date().toISOString(),
    kpis: input.kpis || {},
    risk: input.risk || {},
    evolution: input.evolution || [],
    trend: input.trend || 'stable',
    relevant_incidents: input.relevant_incidents || [],
    overall_state: input.overall_state || 'UNKNOWN',
    executive_summary: input.executive_summary || '',
    threat_level: input.threat_level || 'NONE',
    integrity_score: input.integrity_score || 0,
    baseline_compliance_pct: input.baseline_compliance_pct || 0
  };
}

module.exports = { createExecutiveDashboardDto };
