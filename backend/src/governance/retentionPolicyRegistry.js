'use strict';

/**
 * Retention Policy Registry — Enterprise Central (LGPD + ISO 27001 + Art. 16/37)
 *
 * Registry canónico e declarativo de políticas de retenção para CADA tabela do sistema.
 * Mapeia: tabela → TTL → base legal → ação (retain | anonymize | purge).
 *
 * Características:
 *   - Declarativo (não executa workers)
 *   - Source-of-truth para qualquer worker futuro
 *   - Compatível com impetus_retention_policy e impetus_storage_table_registry
 *   - Classificação legal LGPD por tabela
 *   - Audit-friendly: consulta via getPolicy(tableName)
 *
 * Flag: IMPETUS_RETENTION_REGISTRY=on|off (default on — apenas registry, sem workers)
 */

const ACTIONS = Object.freeze({
  RETAIN: 'retain',
  ANONYMIZE: 'anonymize',
  PURGE: 'purge',
});

const LEGAL_BASIS = Object.freeze({
  CONSENT: 'Art. 7°, I LGPD — Consentimento do titular',
  CONTRACT: 'Art. 7°, V LGPD — Execução de contrato',
  LEGAL_OBLIGATION: 'Art. 7°, II LGPD — Obrigação legal/regulatória',
  LEGITIMATE_INTEREST: 'Art. 7°, IX LGPD — Interesse legítimo',
  REGULATORY_AUDIT: 'Art. 37 LGPD — Registro de operações',
  JUDICIAL: 'Art. 7°, VI LGPD — Exercício de direitos judiciais',
  LIFE_PROTECTION: 'Art. 7°, VII LGPD — Proteção da vida',
  PUBLIC_POLICY: 'Art. 7°, III LGPD — Políticas públicas',
});

const DATA_CLASS = Object.freeze({
  PII_DIRECT: 'pii_direct',
  PII_INDIRECT: 'pii_indirect',
  PII_BEHAVIORAL: 'pii_behavioral',
  PII_AI_DERIVED: 'pii_ai_derived',
  OPERATIONAL: 'operational',
  TELEMETRY: 'telemetry',
  AUDIT_IMMUTABLE: 'audit_immutable',
  FINANCIAL: 'financial',
  WORKFLOW: 'workflow',
  CONFIG: 'config',
  INDUSTRIAL: 'industrial',
});

/**
 * Registry central — cada entrada define a política de uma tabela.
 *
 * Formato:
 *   table: nome físico da tabela
 *   ttl_days: dias de retenção em hot (null = indefinido/legal)
 *   archive_days: dias até archive (null = nunca)
 *   action: retain | anonymize | purge (após TTL)
 *   legal_basis: artigo LGPD aplicável
 *   data_class: classificação do tipo de dado
 *   pii: contém dados pessoais identificáveis
 *   dsr_erasable: pode ser apagado via DSR
 *   notes: observações
 */
const RETENTION_REGISTRY = Object.freeze([
  // ═══════════════════════════════════════════════════════════════════
  // IDENTIDADE & ACESSO
  // ═══════════════════════════════════════════════════════════════════
  { table: 'users', ttl_days: null, archive_days: null, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_DIRECT, pii: true, dsr_erasable: true, notes: 'Titular — soft-delete + anonymize após DSR' },
  { table: 'sessions', ttl_days: 30, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.PII_INDIRECT, pii: true, dsr_erasable: true, notes: 'Sessões ativas — purge após inatividade' },
  { table: 'refresh_tokens', ttl_days: 30, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.PII_INDIRECT, pii: true, dsr_erasable: true, notes: 'Tokens de refresh — expiram naturalmente' },
  { table: 'password_reset_tokens', ttl_days: 1, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_INDIRECT, pii: true, dsr_erasable: true, notes: 'Single-use — purge após 24h' },
  { table: 'user_security_verification_codes', ttl_days: 1, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_INDIRECT, pii: true, dsr_erasable: true, notes: 'Códigos temporários' },
  { table: 'user_activation_pins', ttl_days: 7, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_INDIRECT, pii: true, dsr_erasable: true, notes: 'Pins de ativação' },
  { table: 'user_activation_profiles', ttl_days: 90, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_DIRECT, pii: true, dsr_erasable: true, notes: 'Perfis de onboarding' },
  { table: 'voice_preferences', ttl_days: null, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_BEHAVIORAL, pii: true, dsr_erasable: true, notes: 'Preferências de voz — vive com titular' },
  { table: 'user_dashboard_preferences', ttl_days: null, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_BEHAVIORAL, pii: true, dsr_erasable: true, notes: 'Preferências de dashboard' },
  { table: 'user_dashboard_onboarding', ttl_days: 365, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_BEHAVIORAL, pii: true, dsr_erasable: true, notes: 'Estado de onboarding' },
  { table: 'user_hierarchy_scope', ttl_days: null, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: true, notes: 'Configuração RBAC — vive com tenant' },

  // ═══════════════════════════════════════════════════════════════════
  // COMUNICAÇÃO & CHAT
  // ═══════════════════════════════════════════════════════════════════
  { table: 'chat_messages', ttl_days: 730, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_DIRECT, pii: true, dsr_erasable: true, notes: 'Mensagens — anonymize após 2 anos, archive 5 anos' },
  { table: 'chat_conversations', ttl_days: 730, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_INDIRECT, pii: true, dsr_erasable: false, notes: 'Metadados — preservar estrutura para audit' },
  { table: 'chat_participants', ttl_days: 730, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_INDIRECT, pii: true, dsr_erasable: true, notes: 'Participações' },
  { table: 'chat_reactions', ttl_days: 365, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_BEHAVIORAL, pii: true, dsr_erasable: true, notes: 'Reações' },
  { table: 'chat_push_subscriptions', ttl_days: 90, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_INDIRECT, pii: true, dsr_erasable: true, notes: 'Push tokens — expiram' },
  { table: 'chat_message_deleted_for_user', ttl_days: 365, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_BEHAVIORAL, pii: true, dsr_erasable: true, notes: 'Marcações de exclusão' },
  { table: 'internal_chat_messages', ttl_days: 730, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_DIRECT, pii: true, dsr_erasable: true, notes: 'Mensagens internas' },
  { table: 'internal_chat_conversations', ttl_days: 730, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_INDIRECT, pii: true, dsr_erasable: false, notes: 'Conversas internas — metadados' },
  { table: 'z_conversation_message_index', ttl_days: 730, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_INDIRECT, pii: true, dsr_erasable: true, notes: 'Índice de mensagens Z — acompanha chat_messages' },
  { table: 'internal_chat_read_receipts', ttl_days: 180, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.PII_BEHAVIORAL, pii: true, dsr_erasable: true, notes: 'Receipts de leitura' },
  { table: 'messages', ttl_days: 730, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_DIRECT, pii: true, dsr_erasable: true, notes: 'Mensagens genéricas' },
  { table: 'message_reactions', ttl_days: 365, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_BEHAVIORAL, pii: true, dsr_erasable: true, notes: 'Reações genéricas' },
  { table: 'conversations', ttl_days: 730, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_INDIRECT, pii: true, dsr_erasable: false, notes: 'Conversas legadas' },
  { table: 'conversation_participants', ttl_days: 730, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_INDIRECT, pii: true, dsr_erasable: true, notes: 'Participantes legados' },
  { table: 'communications', ttl_days: 365, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_DIRECT, pii: true, dsr_erasable: true, notes: 'Comunicações gerais' },
  { table: 'notifications', ttl_days: 90, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.PII_INDIRECT, pii: true, dsr_erasable: true, notes: 'Notificações' },
  { table: 'smart_reminders', ttl_days: 180, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_BEHAVIORAL, pii: true, dsr_erasable: true, notes: 'Lembretes inteligentes' },

  // ═══════════════════════════════════════════════════════════════════
  // IA & COGNITIVO
  // ═══════════════════════════════════════════════════════════════════
  { table: 'ai_interaction_traces', ttl_days: 365, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.PII_AI_DERIVED, pii: true, dsr_erasable: true, notes: 'Traces de IA — anonymize payloads' },
  { table: 'ai_decision_logs', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: false, dsr_erasable: false, notes: 'Art. 20 LGPD — explicabilidade IA — IMUTÁVEL' },
  { table: 'ai_legal_audit_logs', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: false, dsr_erasable: false, notes: 'Art. 37 — auditoria legal IA — IMUTÁVEL' },
  { table: 'ai_audit_logs', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: false, dsr_erasable: false, notes: 'Auditoria de IA — IMUTÁVEL' },
  { table: 'ai_outbound_audit', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: false, dsr_erasable: false, notes: 'Auditoria outbound IA' },
  { table: 'ai_diagnostics', ttl_days: 180, archive_days: 730, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Diagnósticos IA internos' },
  { table: 'ai_incidents', ttl_days: 365, archive_days: 1825, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Incidentes IA — governança' },
  { table: 'ai_incomplete_events', ttl_days: 30, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Eventos incompletos — transient' },
  { table: 'ai_intelligence_config', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Configuração IA — config tenant' },
  { table: 'ai_knowledge_exchange', ttl_days: 365, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.PII_AI_DERIVED, pii: true, dsr_erasable: true, notes: 'Troca de conhecimento IA' },
  { table: 'ai_policies', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Políticas de IA' },
  { table: 'ai_proactive_alerts', ttl_days: 180, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Alertas proativos' },
  { table: 'ai_proactive_consent', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_BEHAVIORAL, pii: true, dsr_erasable: true, notes: 'Consentimentos proativos IA' },
  { table: 'memoria_usuario', ttl_days: null, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_AI_DERIVED, pii: true, dsr_erasable: true, notes: 'Memória cognitiva do titular' },
  { table: 'memoria_empresa', ttl_days: null, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Memória empresarial — operacional' },
  { table: 'operational_memory', ttl_days: 365, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Memória operacional' },
  { table: 'enterprise_ai_memory', ttl_days: null, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Memória enterprise IA' },
  { table: 'industry_intelligence_memory', ttl_days: null, archive_days: 1825, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Inteligência industrial' },
  { table: 'knowledge_memory', ttl_days: null, archive_days: 1825, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Base de conhecimento' },
  { table: 'strategic_learning', ttl_days: null, archive_days: 1825, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Aprendizado estratégico' },

  // ═══════════════════════════════════════════════════════════════════
  // COMPORTAMENTO & ACTIVIDADE DO TITULAR
  // ═══════════════════════════════════════════════════════════════════
  { table: 'user_activity_logs', ttl_days: 180, archive_days: 730, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.PII_BEHAVIORAL, pii: true, dsr_erasable: true, notes: 'Logs de atividade do titular' },
  { table: 'dashboard_usage_events', ttl_days: 180, archive_days: 730, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.PII_BEHAVIORAL, pii: true, dsr_erasable: true, notes: 'Eventos de uso do dashboard' },
  { table: 'strategic_user_behavior', ttl_days: 365, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.PII_BEHAVIORAL, pii: true, dsr_erasable: true, notes: 'Comportamento estratégico' },
  { table: 'onboarding_conversations', ttl_days: 365, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_DIRECT, pii: true, dsr_erasable: true, notes: 'Conversas de onboarding' },
  { table: 'onboarding_conversa', ttl_days: 365, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_DIRECT, pii: true, dsr_erasable: true, notes: 'Onboarding legado' },
  { table: 'session_context', ttl_days: 30, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.PII_INDIRECT, pii: true, dsr_erasable: true, notes: 'Contexto de sessão' },

  // ═══════════════════════════════════════════════════════════════════
  // AUDITORIA & COMPLIANCE (IMUTÁVEL)
  // ═══════════════════════════════════════════════════════════════════
  { table: 'audit_logs', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: false, dsr_erasable: false, notes: 'Art. 37 LGPD — trilha principal — IMUTÁVEL' },
  { table: 'admin_logs', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: false, dsr_erasable: false, notes: 'Logs de admin' },
  { table: 'consent_logs', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGAL_OBLIGATION, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: true, dsr_erasable: false, notes: 'Prova de consentimento — IMUTÁVEL' },
  { table: 'data_access_logs', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: false, dsr_erasable: false, notes: 'Logs de acesso a dados' },
  { table: 'executive_audit_logs', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: false, dsr_erasable: false, notes: 'Auditoria executiva' },
  { table: 'memory_audit_log', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: false, dsr_erasable: false, notes: 'Auditoria de memória' },
  { table: 'immutable_workflow_audit', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: false, dsr_erasable: false, notes: 'Auditoria workflow imutável' },
  { table: 'workflow_permission_audit_log', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: false, dsr_erasable: false, notes: 'Auditoria permissões workflow' },
  { table: 'technical_library_audit_logs', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: false, dsr_erasable: false, notes: 'Auditoria biblioteca técnica' },
  { table: 'user_identification_audit', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: true, dsr_erasable: false, notes: 'Auditoria de identificação — Art. 37' },
  { table: 'industrial_audit_events', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: false, dsr_erasable: false, notes: 'Auditoria industrial' },
  { table: 'support_recovery_audit_events', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: false, dsr_erasable: false, notes: 'Auditoria recovery' },
  { table: 'pop_compliance_logs', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: false, dsr_erasable: false, notes: 'Compliance POP' },

  // ═══════════════════════════════════════════════════════════════════
  // LGPD & DSR
  // ═══════════════════════════════════════════════════════════════════
  { table: 'lgpd_data_requests', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGAL_OBLIGATION, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: true, dsr_erasable: false, notes: 'Pedidos DSR — prova de atendimento' },
  { table: 'lgpd_consents', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGAL_OBLIGATION, data_class: DATA_CLASS.AUDIT_IMMUTABLE, pii: true, dsr_erasable: false, notes: 'Consentimentos formais LGPD' },

  // ═══════════════════════════════════════════════════════════════════
  // FINANCEIRO & BILLING
  // ═══════════════════════════════════════════════════════════════════
  { table: 'token_usage', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGAL_OBLIGATION, data_class: DATA_CLASS.FINANCIAL, pii: false, dsr_erasable: false, notes: 'Uso de tokens — obrigação fiscal' },
  { table: 'token_billing_plans', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.FINANCIAL, pii: false, dsr_erasable: false, notes: 'Planos de billing' },
  { table: 'token_invoices', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGAL_OBLIGATION, data_class: DATA_CLASS.FINANCIAL, pii: false, dsr_erasable: false, notes: 'Faturas — obrigação fiscal 7 anos' },
  { table: 'nexus_wallet_ledger', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGAL_OBLIGATION, data_class: DATA_CLASS.FINANCIAL, pii: false, dsr_erasable: false, notes: 'Ledger financeiro — imutável' },
  { table: 'nexus_company_wallets', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.FINANCIAL, pii: false, dsr_erasable: false, notes: 'Wallets de empresa' },
  { table: 'nexus_wallet_topups', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGAL_OBLIGATION, data_class: DATA_CLASS.FINANCIAL, pii: false, dsr_erasable: false, notes: 'Topups — obrigação fiscal' },
  { table: 'nexus_wallet_company_rates', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Taxas empresa' },
  { table: 'nexus_wallet_global_rates', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Taxas globais' },
  { table: 'nexus_ai_company_model_config', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Config modelos IA por empresa' },
  { table: 'subscriptions', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGAL_OBLIGATION, data_class: DATA_CLASS.FINANCIAL, pii: false, dsr_erasable: false, notes: 'Assinaturas — obrigação fiscal' },
  { table: 'subscription_notifications', ttl_days: 180, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Notificações de assinatura' },
  { table: 'plans', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Planos de assinatura' },

  // ═══════════════════════════════════════════════════════════════════
  // TELEMETRIA & INDUSTRIAL
  // ═══════════════════════════════════════════════════════════════════
  { table: 'telemetry_timeseries_v1', ttl_days: 90, archive_days: 730, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.TELEMETRY, pii: false, dsr_erasable: false, notes: 'Série temporal — purge após 90d hot' },
  { table: 'industrial_telemetry_samples', ttl_days: 90, archive_days: 730, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.TELEMETRY, pii: false, dsr_erasable: false, notes: 'Amostras telemetria industrial' },
  { table: 'industrial_telemetry_samples_default', ttl_days: 90, archive_days: 730, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.TELEMETRY, pii: false, dsr_erasable: false, notes: 'Partition default telemetria' },
  { table: 'system_metrics', ttl_days: 30, archive_days: 365, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.TELEMETRY, pii: false, dsr_erasable: false, notes: 'Métricas de sistema' },
  { table: 'metrics_snapshots', ttl_days: 90, archive_days: 365, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.TELEMETRY, pii: false, dsr_erasable: false, notes: 'Snapshots de métricas' },
  { table: 'industrial_metric_rollups_v1', ttl_days: 365, archive_days: 1825, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.TELEMETRY, pii: false, dsr_erasable: false, notes: 'Rollups — agregados' },
  { table: 'plc_collected_data', ttl_days: 90, archive_days: 730, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.TELEMETRY, pii: false, dsr_erasable: false, notes: 'Dados PLC coletados' },
  { table: 'plc_analysis', ttl_days: 180, archive_days: 730, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Análises PLC' },
  { table: 'plc_alerts', ttl_days: 365, archive_days: 1825, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Alertas PLC — segurança operacional' },
  { table: 'cognitive_event_backbone', ttl_days: 90, archive_days: 365, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.TELEMETRY, pii: false, dsr_erasable: false, notes: 'Backbone cognitivo' },
  { table: 'logistics_telemetry', ttl_days: 90, archive_days: 365, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.TELEMETRY, pii: false, dsr_erasable: false, notes: 'Telemetria logística' },

  // ═══════════════════════════════════════════════════════════════════
  // OPERACIONAL INDUSTRIAL
  // ═══════════════════════════════════════════════════════════════════
  { table: 'eventos_empresa', ttl_days: 365, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Eventos empresariais' },
  { table: 'operational_events', ttl_days: 365, archive_days: 1825, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Eventos operacionais' },
  { table: 'operational_alerts', ttl_days: 365, archive_days: 1825, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Alertas operacionais — segurança' },
  { table: 'operational_anomalies', ttl_days: 365, archive_days: 1825, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Anomalias operacionais' },
  { table: 'operational_anomaly_alerts', ttl_days: 365, archive_days: 1825, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Alertas de anomalia' },
  { table: 'operational_anomaly_baselines', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Baselines de anomalia' },
  { table: 'operational_insights', ttl_days: 365, archive_days: 1825, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Insights operacionais' },
  { table: 'operational_learning', ttl_days: null, archive_days: 1825, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Aprendizado operacional' },
  { table: 'digital_twin_machine_states', ttl_days: 90, archive_days: 730, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Digital twin — estados' },
  { table: 'machine_history', ttl_days: 365, archive_days: 1825, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Histórico de máquinas' },
  { table: 'machine_detected_events', ttl_days: 365, archive_days: 1825, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Eventos detectados' },
  { table: 'machine_control_commands', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Comandos de controle — segurança industrial' },
  { table: 'machine_human_interventions', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.INDUSTRIAL, pii: true, dsr_erasable: false, notes: 'Intervenções humanas — rastreabilidade' },
  { table: 'machine_automation_block_log', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Bloqueios de automação' },

  // ═══════════════════════════════════════════════════════════════════
  // WORKFLOW & OUTBOX
  // ═══════════════════════════════════════════════════════════════════
  { table: 'industrial_event_outbox', ttl_days: 14, archive_days: 365, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.WORKFLOW, pii: false, dsr_erasable: false, notes: 'Outbox — transient' },
  { table: 'industrial_event_dlq', ttl_days: 90, archive_days: 365, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.WORKFLOW, pii: false, dsr_erasable: false, notes: 'DLQ — análise de falhas' },
  { table: 'industrial_event_replay_log', ttl_days: 90, archive_days: 365, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.WORKFLOW, pii: false, dsr_erasable: false, notes: 'Replay log' },
  { table: 'app_impetus_outbox', ttl_days: 14, archive_days: 365, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.WORKFLOW, pii: false, dsr_erasable: false, notes: 'Outbox app' },
  { table: 'orchestration_outcomes', ttl_days: 90, archive_days: 365, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.WORKFLOW, pii: false, dsr_erasable: false, notes: 'Resultados de orquestração' },

  // ═══════════════════════════════════════════════════════════════════
  // CONFIGURAÇÃO & TENANT
  // ═══════════════════════════════════════════════════════════════════
  { table: 'companies', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Tenants — config master' },
  { table: 'departments', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Departamentos' },
  { table: 'roles', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Papéis' },
  { table: 'permissions', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Permissões' },
  { table: 'role_permissions', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Mapeamento role-permission' },
  { table: 'feature_flags', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Feature flags' },
  { table: 'dashboard_configs', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Configs de dashboard' },
  { table: 'dashboard_module_permissions', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Permissões de módulo' },
  { table: 'dashboard_visibility_config', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Visibilidade dashboard' },

  // ═══════════════════════════════════════════════════════════════════
  // WHATSAPP & INTEGRAÇÕES
  // ═══════════════════════════════════════════════════════════════════
  { table: 'whatsapp_contacts', ttl_days: null, archive_days: null, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_DIRECT, pii: true, dsr_erasable: true, notes: 'Contactos WhatsApp — PII direto' },
  { table: 'whatsapp_first_contact', ttl_days: null, archive_days: null, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_DIRECT, pii: true, dsr_erasable: true, notes: 'Primeiro contacto WhatsApp' },
  { table: 'whatsapp_instances', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Instâncias WhatsApp' },
  { table: 'zapi_configurations', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Config ZAPI' },
  { table: 'zapi_sent_messages', ttl_days: 365, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.PII_DIRECT, pii: true, dsr_erasable: true, notes: 'Mensagens ZAPI enviadas' },
  { table: 'integration_logs', ttl_days: 90, archive_days: 365, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Logs de integração' },
  { table: 'integration_connectors', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.CONFIG, pii: false, dsr_erasable: false, notes: 'Conectores' },
  { table: 'asaas_webhook_logs', ttl_days: 90, archive_days: 365, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Webhooks Asaas' },

  // ═══════════════════════════════════════════════════════════════════
  // MANUIA & NOTIFICAÇÕES
  // ═══════════════════════════════════════════════════════════════════
  { table: 'manuia_notification_preferences', ttl_days: null, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_BEHAVIORAL, pii: true, dsr_erasable: true, notes: 'Preferências ManuIA' },
  { table: 'manuia_mobile_devices', ttl_days: 180, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_INDIRECT, pii: true, dsr_erasable: true, notes: 'Dispositivos móveis' },
  { table: 'manuia_inbox_notifications', ttl_days: 90, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Inbox ManuIA' },
  { table: 'manuia_on_call_slots', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Escala de plantão' },
  { table: 'manuia_spare_parts', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Peças sobressalentes' },

  // ═══════════════════════════════════════════════════════════════════
  // QUALIDADE & MANUTENÇÃO
  // ═══════════════════════════════════════════════════════════════════
  { table: 'quality_inspections', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Inspeções de qualidade — rastreabilidade' },
  { table: 'quality_indicators_snapshot', ttl_days: 365, archive_days: 1825, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Snapshots indicadores qualidade' },
  { table: 'quality_alerts', ttl_days: 365, archive_days: 1825, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Alertas qualidade — segurança' },
  { table: 'quality_tools_applied', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Ferramentas aplicadas' },
  { table: 'maintenance_preventives', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Manutenção preventiva — rastreabilidade' },
  { table: 'casos_manutencao', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Casos de manutenção' },
  { table: 'work_orders', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Ordens de serviço — rastreabilidade' },
  { table: 'technical_interventions', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Intervenções técnicas' },
  { table: 'industrial_traceability_chain', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Cadeia de rastreabilidade — IMUTÁVEL' },

  // ═══════════════════════════════════════════════════════════════════
  // ARMAZÉM & LOGÍSTICA
  // ═══════════════════════════════════════════════════════════════════
  { table: 'warehouse_movements', ttl_days: 365, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGAL_OBLIGATION, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Movimentações — obrigação fiscal' },
  { table: 'warehouse_balances', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Saldos — estado actual' },
  { table: 'warehouse_snapshots', ttl_days: 365, archive_days: 1825, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Snapshots armazém' },
  { table: 'raw_material_lots', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Lotes — rastreabilidade alimentar/industrial' },
  { table: 'raw_material_lot_events', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.REGULATORY_AUDIT, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Eventos de lote' },
  { table: 'raw_material_receipts', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGAL_OBLIGATION, data_class: DATA_CLASS.INDUSTRIAL, pii: false, dsr_erasable: false, notes: 'Recebimentos — obrigação fiscal' },

  // ═══════════════════════════════════════════════════════════════════
  // RH & TURNOS
  // ═══════════════════════════════════════════════════════════════════
  { table: 'time_clock_records', ttl_days: null, archive_days: 2555, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGAL_OBLIGATION, data_class: DATA_CLASS.PII_DIRECT, pii: true, dsr_erasable: false, notes: 'Ponto electrónico — obrigação trabalhista 5 anos' },
  { table: 'hr_indicators_snapshot', ttl_days: 365, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Indicadores RH' },
  { table: 'hr_alerts', ttl_days: 365, archive_days: null, action: ACTIONS.PURGE, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Alertas RH' },
  { table: 'shifts', ttl_days: null, archive_days: null, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.CONTRACT, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Turnos — config operacional' },
  { table: 'shift_handover', ttl_days: 365, archive_days: 1825, action: ACTIONS.RETAIN, legal_basis: LEGAL_BASIS.LEGITIMATE_INTEREST, data_class: DATA_CLASS.OPERATIONAL, pii: false, dsr_erasable: false, notes: 'Passagem de turno' },
  { table: 'pulse_evaluations', ttl_days: 365, archive_days: 1825, action: ACTIONS.ANONYMIZE, legal_basis: LEGAL_BASIS.CONSENT, data_class: DATA_CLASS.PII_BEHAVIORAL, pii: true, dsr_erasable: true, notes: 'Avaliações pulse — sensível' },
]);

// ═══════════════════════════════════════════════════════════════════════════════
// API PÚBLICA
// ═══════════════════════════════════════════════════════════════════════════════

function isRegistryEnabled() {
  const v = String(process.env.IMPETUS_RETENTION_REGISTRY || 'on').trim().toLowerCase();
  return v !== 'off' && v !== 'false' && v !== '0';
}

function getPolicy(tableName) {
  return RETENTION_REGISTRY.find(p => p.table === tableName) || null;
}

function getAllPolicies() {
  return [...RETENTION_REGISTRY];
}

function getPoliciesByAction(action) {
  return RETENTION_REGISTRY.filter(p => p.action === action);
}

function getPoliciesByDataClass(dataClass) {
  return RETENTION_REGISTRY.filter(p => p.data_class === dataClass);
}

function getDsrErasableTables() {
  return RETENTION_REGISTRY.filter(p => p.dsr_erasable);
}

function getImmutableTables() {
  return RETENTION_REGISTRY.filter(p => p.data_class === DATA_CLASS.AUDIT_IMMUTABLE);
}

function getPiiTables() {
  return RETENTION_REGISTRY.filter(p => p.pii);
}

function getExpiredPolicies(referenceDate = new Date()) {
  return RETENTION_REGISTRY.filter(p => p.ttl_days !== null && p.ttl_days > 0).map(p => ({
    ...p,
    threshold_date: new Date(referenceDate.getTime() - p.ttl_days * 86400000),
  }));
}

function getRegistryStats() {
  const stats = {
    total: RETENTION_REGISTRY.length,
    by_action: { retain: 0, anonymize: 0, purge: 0 },
    by_class: {},
    pii_tables: 0,
    dsr_erasable: 0,
    immutable: 0,
    with_ttl: 0,
    indefinite: 0,
  };

  for (const p of RETENTION_REGISTRY) {
    stats.by_action[p.action] = (stats.by_action[p.action] || 0) + 1;
    stats.by_class[p.data_class] = (stats.by_class[p.data_class] || 0) + 1;
    if (p.pii) stats.pii_tables++;
    if (p.dsr_erasable) stats.dsr_erasable++;
    if (p.data_class === DATA_CLASS.AUDIT_IMMUTABLE) stats.immutable++;
    if (p.ttl_days !== null) stats.with_ttl++;
    else stats.indefinite++;
  }

  return stats;
}

function getDiagnostics() {
  return {
    enabled: isRegistryEnabled(),
    stats: getRegistryStats(),
    version: '1.0.0',
    coverage: `${RETENTION_REGISTRY.length}/281 tables`,
    last_updated: '2026-05-26',
  };
}

module.exports = {
  ACTIONS,
  LEGAL_BASIS,
  DATA_CLASS,
  RETENTION_REGISTRY,
  isRegistryEnabled,
  getPolicy,
  getAllPolicies,
  getPoliciesByAction,
  getPoliciesByDataClass,
  getDsrErasableTables,
  getImmutableTables,
  getPiiTables,
  getExpiredPolicies,
  getRegistryStats,
  getDiagnostics,
};
