'use strict';

/**
 * EVENT-GOVERNANCE-01 — catálogo declarativo de políticas de distribuição.
 * Dados puros — matching em eventGovernanceService.
 */

/** @typedef {object} EventPolicy
 * @property {string} id
 * @property {string} category
 * @property {string[]} [severities]
 * @property {string[]} [eventTypes]
 * @property {string[]} [sourceModules]
 * @property {string[]} channels
 * @property {number} [escalationLevel]
 * @property {string[]} [recipientStrategies]
 */

/** @type {EventPolicy[]} */
const EVENT_POLICIES = Object.freeze([
  {
    id: 'BILLING_EMAIL_DAY3',
    category: 'billing',
    severities: ['medium', 'high'],
    eventTypes: ['subscription_notification_day3', 'billing_day3', 'billing_email_day3'],
    sourceModules: ['subscriptionBillingNotificationService'],
    channels: ['email'],
    escalationLevel: 1,
    recipientStrategies: ['financial_contact']
  },
  {
    id: 'BILLING_APP_DAY5',
    category: 'billing',
    severities: ['medium', 'high'],
    eventTypes: ['subscription_notification_day5', 'billing_day5', 'billing_app_day5'],
    sourceModules: ['subscriptionBillingNotificationService'],
    channels: ['app_impetus'],
    escalationLevel: 2,
    recipientStrategies: ['financial_phone']
  },
  {
    id: 'BILLING_NC_DAY7',
    category: 'billing',
    severities: ['high', 'critical'],
    eventTypes: ['subscription_notification_day7', 'billing_day7', 'billing_nc_day7'],
    sourceModules: ['subscriptionBillingNotificationService'],
    channels: ['notification_center'],
    escalationLevel: 3,
    recipientStrategies: ['tenant_admin', 'hierarchy_lte_1']
  },
  {
    id: 'DSR_LIFECYCLE',
    category: 'dsr',
    severities: ['medium', 'high', 'critical'],
    eventTypes: ['dsr_*'],
    sourceModules: ['dsrNotificationService'],
    channels: ['notification_center', 'notifications_table'],
    escalationLevel: 2,
    recipientStrategies: ['event_user', 'hierarchy_lte_1']
  },
  {
    id: 'MANUIA_INBOX',
    category: 'manuia',
    severities: ['low', 'medium', 'high', 'critical'],
    sourceModules: ['manuiaInboxIngestService', 'manuiaApp'],
    channels: ['manuia_inbox', 'web_push_optional'],
    escalationLevel: 1,
    recipientStrategies: ['event_user']
  },
  {
    id: 'QUALITY_LIFECYCLE',
    category: 'quality',
    severities: ['medium', 'high', 'critical'],
    eventTypes: ['quality_*'],
    sourceModules: ['qualityIntelligenceService'],
    channels: ['notification_center', 'dashboard', 'chat', 'app_impetus'],
    escalationLevel: 2,
    recipientStrategies: ['target_role_level', 'maintenance_roles', 'quality_roles']
  },
  {
    id: 'SST_LIFECYCLE',
    category: 'sst',
    severities: ['medium', 'high', 'critical'],
    eventTypes: ['sst_*', 'safety_*'],
    sourceModules: ['sstNotificationService'],
    channels: ['notification_center', 'dashboard', 'chat', 'app_impetus'],
    escalationLevel: 2,
    recipientStrategies: ['supervisor', 'sst_officer', 'management', 'executive']
  },
  {
    id: 'ESG_LIFECYCLE',
    category: 'esg',
    severities: ['medium', 'high', 'critical'],
    eventTypes: ['esg_*', 'environment_*', 'environmental_*'],
    sourceModules: ['esgNotificationService'],
    channels: ['notification_center', 'dashboard', 'chat', 'app_impetus'],
    escalationLevel: 2,
    recipientStrategies: ['supervisor', 'esg_officer', 'management', 'executive']
  },
  {
    id: 'AIOI_INSIGHT',
    category: 'aioi',
    severities: ['medium', 'high', 'critical'],
    eventTypes: ['aioi_insight_*', 'aioi_*'],
    sourceModules: ['aioiInsightService'],
    channels: ['notification_center', 'dashboard', 'chat', 'app_impetus'],
    escalationLevel: 2,
    recipientStrategies: ['hierarchy_lte_3', 'executive']
  },
  {
    id: 'TPM_CRITICAL',
    category: 'tpm',
    severities: ['high', 'critical'],
    eventTypes: ['tpm_incident', 'tpm_*'],
    sourceModules: ['tpmNotifications'],
    channels: ['app_impetus', 'notification_center'],
    escalationLevel: 2,
    recipientStrategies: ['tpm_managers', 'maintenance_roles']
  },
  {
    id: 'AI_PROACTIVE',
    category: 'ai',
    severities: ['medium', 'high', 'critical'],
    eventTypes: ['failure_pattern', 'ai_proactive', 'proactive_*'],
    sourceModules: ['aiProactiveMessagingService', 'proactiveAI', 'organizationalAI'],
    channels: ['app_impetus', 'notification_center'],
    escalationLevel: 1,
    recipientStrategies: ['hierarchy_lte_4']
  },
  {
    id: 'EXECUTIVE_ALERT',
    category: 'executive',
    severities: ['high', 'critical'],
    sourceModules: ['executiveMode', 'notificationBridgeService'],
    channels: ['app_impetus', 'notification_center'],
    escalationLevel: 2,
    recipientStrategies: ['executive_roles']
  },
  {
    id: 'OPERATIONAL_CRITICAL',
    category: 'operational',
    severities: ['high', 'critical'],
    sourceModules: ['operationalAlertsService', 'operationalActionExecutor', 'operationalRealtimeCoordinator'],
    channels: ['notification_center', 'dashboard', 'operational_alerts'],
    escalationLevel: 2,
    recipientStrategies: ['hierarchy_lte_2', 'supervisor_nc']
  },
  {
    id: 'OPERATIONAL_MEDIUM',
    category: 'operational',
    severities: ['medium'],
    sourceModules: ['operationalAlertsService', 'operationalActionExecutor', 'operationalRealtimeCoordinator'],
    channels: ['dashboard', 'operational_alerts'],
    escalationLevel: 1,
    recipientStrategies: ['hierarchy_lte_3', 'event_user']
  },
  {
    id: 'CHAT_OPERATIONAL',
    category: 'operational',
    severities: ['low', 'medium', 'high'],
    eventTypes: ['machine_stop', 'part_failure', 'operational_event', 'operational_decision'],
    sourceModules: ['operationalRealtimeCoordinator', 'operationalActionExecutor'],
    channels: ['notification_center', 'chat'],
    escalationLevel: 1,
    recipientStrategies: ['role_based', 'event_user']
  },
  {
    id: 'NC_BRIDGE_MIRROR',
    category: 'system',
    severities: ['high', 'critical'],
    sourceModules: ['notificationBridgeService', 'unifiedMessagingService'],
    channels: ['notification_center'],
    escalationLevel: 1,
    recipientStrategies: ['supervisor_nc', 'event_user']
  },
  {
    id: 'DEFAULT_INFO',
    category: 'general',
    severities: ['info', 'low'],
    channels: ['dashboard'],
    escalationLevel: 0,
    recipientStrategies: ['event_user']
  }
]);

function getPolicies() {
  return EVENT_POLICIES;
}

function getPolicyCount() {
  return EVENT_POLICIES.length;
}

module.exports = {
  EVENT_POLICIES,
  getPolicies,
  getPolicyCount
};
