-- Expansão do tenant_rls_registry para cobrir todas as tabelas com dados de negócio.
-- Executar APÓS enterprise_rls_migration.sql (tabela + funções já existem).
-- Activação: via API /api/internal/enterprise ou script tenantRlsRuntime.boot().

INSERT INTO tenant_rls_registry (table_name, tenant_column, enabled, notes)
VALUES
  ('equipment', 'company_id', false, 'cadastro de equipamentos'),
  ('work_orders', 'company_id', false, 'ordens de serviço'),
  ('messages', 'company_id', false, 'chat / comunicação'),
  ('notifications', 'company_id', false, 'notificações'),
  ('documents', 'company_id', false, 'documentos e manuais'),
  ('maintenance_records', 'company_id', false, 'registros manutenção'),
  ('maintenance_plans', 'company_id', false, 'planos preventivos'),
  ('inventory_items', 'company_id', false, 'estoque peças'),
  ('production_lines', 'company_id', false, 'linhas de produção'),
  ('production_orders', 'company_id', false, 'OPs MES'),
  ('checklists', 'company_id', false, 'checklists operacionais'),
  ('checklist_templates', 'company_id', false, 'modelos checklist'),
  ('departments', 'company_id', false, 'departamentos'),
  ('company_roles', 'company_id', false, 'cargos por tenant'),
  ('audit_logs', 'company_id', false, 'auditoria'),
  ('chat_messages', 'company_id', false, 'mensagens de chat'),
  ('dashboard_preferences_store', 'company_id', false, 'preferências dashboard'),
  ('costs', 'company_id', false, 'custos industriais'),
  ('industrial_cost_items', 'company_id', false, 'itens de custo'),
  ('sensors', 'company_id', false, 'sensores IoT'),
  ('alerts', 'company_id', false, 'alertas operacionais'),
  ('tasks', 'company_id', false, 'tarefas'),
  ('feedback', 'company_id', false, 'feedback NPS'),
  ('warehouse_items', 'company_id', false, 'itens almoxarifado'),
  ('raw_materials', 'company_id', false, 'matérias-primas'),
  ('quality_inspections', 'company_id', false, 'inspeções qualidade'),
  ('esg_indicators', 'company_id', false, 'indicadores ESG'),
  ('proactive_alerts', 'company_id', false, 'alertas proativos IA'),
  ('voice_preferences', 'company_id', false, 'preferências de voz'),
  ('subscription_events', 'company_id', false, 'eventos cobrança'),
  ('dsr_requests', 'company_id', false, 'LGPD direitos titular'),
  ('uploads', 'company_id', false, 'ficheiros enviados'),
  ('sessions', 'company_id', false, 'sessões (via JOIN user)')
ON CONFLICT (table_name) DO NOTHING;
