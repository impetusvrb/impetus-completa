'use strict';

/**
 * SEC-09 — Plano oficial de promoção Enterprise Security v1.
 * Dados estáticos — não altera flags nem runtime.
 */

const PROMOTION_VERSION = 'SEC-09-v1';
const AUTO_ACTIVATION = false;

/** Ordem oficial — nunca activar tudo simultaneamente. */
const ACTIVATION_SEQUENCE = [
  {
    order: 1,
    phase: 'SEC-01',
    module: 'securityObservatory',
    name: 'Enterprise Security Observatory',
    primaryFlag: 'SECURITY_OBSERVATORY',
    relatedFlags: [
      'SECURITY_OBSERVATORY_WINDOW_MS',
      'SECURITY_OBSERVATORY_MAX_BUCKETS',
      'SECURITY_OBSERVATORY_MAX_TIMELINE',
      'SECURITY_OBSERVATORY_TRUSTED_CIDRS'
    ],
    dependsOn: [],
    classification: 'READY',
    riskProfile: 'passive_observational',
    minObservationMinutes: 15,
    checkpoint: 'Observatory activo — métricas e timeline sem erro de boot',
    healthEndpoint: 'GET /api/audit/security-observatory',
    rollback: {
      action: 'SECURITY_OBSERVATORY=false',
      restart: 'pm2 restart impetus-backend --update-env',
      maxMinutes: 2
    }
  },
  {
    order: 2,
    phase: 'SEC-02',
    module: 'securityCorrelation',
    name: 'Correlation Engine',
    primaryFlag: 'SECURITY_CORRELATION_ENGINE',
    relatedFlags: [
      'SECURITY_CORRELATION_WINDOW_MS',
      'SECURITY_INCIDENT_CLOSURE_MS',
      'SECURITY_CORRELATION_MAX_INCIDENTS'
    ],
    dependsOn: ['SEC-01'],
    classification: 'READY',
    riskProfile: 'passive_read_only',
    minObservationMinutes: 15,
    checkpoint: 'Incidentes correlacionados sem alterar pipeline HTTP',
    healthEndpoint: 'GET /api/audit/security-incidents',
    rollback: {
      action: 'SECURITY_CORRELATION_ENGINE=false',
      restart: 'pm2 restart impetus-backend --update-env',
      maxMinutes: 2
    }
  },
  {
    order: 3,
    phase: 'SEC-03',
    module: 'securityThreatIntelligence',
    name: 'Threat Intelligence',
    primaryFlag: 'SECURITY_THREAT_INTELLIGENCE',
    relatedFlags: [
      'SECURITY_THREAT_HISTORICAL_WINDOW_MS',
      'SECURITY_THREAT_MAX_PROFILES'
    ],
    dependsOn: ['SEC-02'],
    classification: 'READY',
    riskProfile: 'passive_consultative',
    minObservationMinutes: 15,
    checkpoint: 'Perfis gerados — sem inferência de identidade',
    healthEndpoint: 'GET /api/audit/security-threat-intelligence',
    rollback: {
      action: 'SECURITY_THREAT_INTELLIGENCE=false',
      restart: 'pm2 restart impetus-backend --update-env',
      maxMinutes: 2
    }
  },
  {
    order: 4,
    phase: 'SEC-04',
    module: 'securityRuntimeIntegrity',
    name: 'Runtime Integrity',
    primaryFlag: 'SECURITY_RUNTIME_INTEGRITY',
    relatedFlags: ['SECURITY_INTEGRITY_CHECK_INTERVAL_MS'],
    dependsOn: [],
    classification: 'READY',
    riskProfile: 'passive_observational',
    minObservationMinutes: 20,
    checkpoint: 'Baseline comparado — score disponível sem remediação',
    healthEndpoint: 'GET /api/audit/security-runtime-integrity',
    rollback: {
      action: 'SECURITY_RUNTIME_INTEGRITY=false',
      restart: 'pm2 restart impetus-backend --update-env',
      maxMinutes: 2
    }
  },
  {
    order: 5,
    phase: 'SEC-05',
    module: 'securityNotification',
    name: 'Notification Center',
    primaryFlag: 'SECURITY_NOTIFICATION_CENTER',
    relatedFlags: [
      'SECURITY_NOTIFICATION_DEDUP_MS',
      'SECURITY_NOTIFICATION_MAX_STORED',
      'SECURITY_NOTIFICATION_WEBHOOK_URL'
    ],
    dependsOn: ['SEC-02'],
    classification: 'READY_WITH_MONITORING',
    riskProfile: 'notification_only',
    minObservationMinutes: 20,
    checkpoint: 'Notificações internas — dedup activo — sem adapters externos',
    healthEndpoint: 'GET /api/audit/security-notifications',
    rollback: {
      action: 'SECURITY_NOTIFICATION_CENTER=false',
      restart: 'pm2 restart impetus-backend --update-env',
      maxMinutes: 2
    }
  },
  {
    order: 6,
    phase: 'SEC-06',
    module: 'securityResponse',
    name: 'Response Orchestrator',
    primaryFlag: 'SECURITY_RESPONSE_ORCHESTRATOR',
    relatedFlags: [
      'SECURITY_RESPONSE_DEFAULT_MODE',
      'SECURITY_RESPONSE_MAX_LEVEL',
      'SECURITY_RESPONSE_PROTECT_ENABLED',
      'SECURITY_RESPONSE_MAX_STORED'
    ],
    dependsOn: ['SEC-02', 'SEC-03'],
    classification: 'READY_WITH_MONITORING',
    riskProfile: 'graduated_advise_only',
    minObservationMinutes: 30,
    requiredConstraints: {
      SECURITY_RESPONSE_DEFAULT_MODE: 'advise',
      SECURITY_RESPONSE_MAX_LEVEL: '1',
      SECURITY_RESPONSE_PROTECT_ENABLED: 'false'
    },
    checkpoint: 'Modo advise L1 — nenhuma acção destructiva',
    healthEndpoint: 'GET /api/audit/security-response',
    rollback: {
      action: 'SECURITY_RESPONSE_ORCHESTRATOR=false',
      restart: 'pm2 restart impetus-backend --update-env',
      maxMinutes: 2
    }
  },
  {
    order: 7,
    phase: 'SEC-07',
    module: 'securitySOC',
    name: 'Security Operations Center',
    primaryFlag: 'SECURITY_SOC',
    relatedFlags: ['SECURITY_SOC_CACHE_TTL_MS'],
    dependsOn: ['SEC-01', 'SEC-02', 'SEC-03', 'SEC-04', 'SEC-05', 'SEC-06'],
    classification: 'READY_WITH_MONITORING',
    riskProfile: 'read_only_dashboard',
    minObservationMinutes: 15,
    checkpoint: 'SOC score e dashboards read-only',
    healthEndpoint: 'GET /api/audit/security-soc',
    rollback: {
      action: 'SECURITY_SOC=false',
      restart: 'pm2 restart impetus-backend --update-env',
      maxMinutes: 2
    }
  }
];

/** Componentes não elegíveis nesta fase. */
const NOT_ELIGIBLE = [
  {
    id: 'SEC-05-EMAIL',
    name: 'Email adapter',
    reason: 'Adapter externo skipped — NC-SEC-08-003 — v2'
  },
  {
    id: 'SEC-05-SMS',
    name: 'SMS adapter',
    reason: 'Adapter externo skipped — NC-SEC-08-003 — v2'
  },
  {
    id: 'SEC-05-PUSH',
    name: 'Push adapter',
    reason: 'Adapter externo skipped — NC-SEC-08-003 — v2'
  }
];

/** Bloqueados até novo ciclo ou aprovação explícita. */
const BLOCKED = [
  {
    id: 'SEC-06-PROTECT',
    flag: 'SECURITY_RESPONSE_PROTECT_ENABLED',
    reason: 'Protect L3 plan-only — requer dual approval e SEC v2',
    classification: 'BLOCKED'
  },
  {
    id: 'SEC-06-ASSIST-L2',
    flag: 'SECURITY_RESPONSE_MAX_LEVEL',
    blockedValues: ['2'],
    reason: 'Assist L2 só após observação estável em advise L1',
    classification: 'BLOCKED_UNTIL_PHASE_2'
  }
];

/**
 * Recomendação operacional pós-SEC-09 (promoção imediata de baixo risco).
 * Ainda aplica sequência — nunca batch simultâneo.
 */
const RECOMMENDED_PHASE_1 = {
  label: 'Promoção imediata passiva (pós-SEC-09)',
  steps: ['SEC-01', 'SEC-02', 'SEC-03', 'SEC-04', 'SEC-05', 'SEC-06', 'SEC-07'],
  sec06Constraints: {
    SECURITY_RESPONSE_ORCHESTRATOR: 'true',
    SECURITY_RESPONSE_DEFAULT_MODE: 'advise',
    SECURITY_RESPONSE_MAX_LEVEL: '1',
    SECURITY_RESPONSE_PROTECT_ENABLED: 'false'
  },
  note: 'Módulos observacionais primeiro; SEC-06 em advise L1; Protect permanece OFF'
};

const FORBIDDEN_FLAGS = [
  'SECURITY_RESPONSE_PROTECT_ENABLED=true'
];

module.exports = {
  PROMOTION_VERSION,
  AUTO_ACTIVATION,
  ACTIVATION_SEQUENCE,
  NOT_ELIGIBLE,
  BLOCKED,
  RECOMMENDED_PHASE_1,
  FORBIDDEN_FLAGS
};
