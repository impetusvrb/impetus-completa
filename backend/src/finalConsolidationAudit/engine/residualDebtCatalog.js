'use strict';

/**
 * Débito residual sintetizado (read-only, alinhado TECHNICAL_DEBT_MASTER_REPORT).
 */

module.exports = Object.freeze([
  {
    id: 'D1',
    severity: 'medium',
    title: 'Z.28 Adaptive Orchestration em shadow',
    owner: 'Cognitive Platform',
    mitigation: 'Promotion gate + tenant pilot KPIs'
  },
  {
    id: 'D2',
    severity: 'medium',
    title: 'Z.29 Governance Learning em shadow',
    owner: 'AI Governance',
    mitigation: 'HITL board approval workflow'
  },
  {
    id: 'D8',
    severity: 'critical',
    title: 'Coexistência Motor A + Engine V2 + Runtime Z',
    owner: 'Architecture',
    mitigation: 'Additive migration; P27 deprecation governance'
  },
  {
    id: 'D9',
    severity: 'critical',
    title: 'Telemetria industrial — validação chão de fábrica limitada',
    owner: 'OT/IIoT',
    mitigation: 'Lab industrial + evidência 90 dias'
  },
  {
    id: 'D14',
    severity: 'high',
    title: 'Visibility reconciliation fail-open risk',
    owner: 'Frontend/Backend',
    mitigation: 'GET /api/dashboard/visibility em todos os tenants'
  },
  {
    id: 'D25',
    severity: 'medium',
    title: 'Action runtime autonomia — requer HITL contínuo',
    owner: 'AI Safety',
    mitigation: 'P24 HITL gates; zero bypass'
  },
  {
    id: 'SHADOW-PUB',
    severity: 'medium',
    title: 'Safety/Environment publication ainda em shadow',
    owner: 'Domain Leads',
    mitigation: 'Promover após métricas de qualidade em pilot'
  },
  {
    id: 'LOGISTICS',
    severity: 'low',
    title: 'Domínio Logistics scaffold',
    owner: 'Product',
    mitigation: 'Tier 3 roadmap'
  }
]);
