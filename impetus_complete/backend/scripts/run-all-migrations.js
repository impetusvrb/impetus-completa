#!/usr/bin/env node
/**
 * Executa todas as migrations na ordem correta
 * Uso: node -r dotenv/config scripts/run-all-migrations.js
 * 
 * Ordem obrigatória:
 * 1. migrations.sql    - Tabelas base (users, proposals, tasks, manuals, etc.)
 * 2. complete_schema.sql - Schema completo (companies, communications, LGPD, etc.)
 * 3. tpm_migration.sql   - Formulário TPM
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const MIGRATIONS = [
  { name: 'Base (users, proposals, tasks, manuals)', file: 'migrations.sql' },
  { name: 'Schema completo (companies, communications, LGPD)', file: 'complete_schema.sql' },
  { name: 'Tasks multi-tenant (company_id)', file: 'tasks_company_migration.sql' },
  { name: 'Correções de schema (active, title, policies)', file: 'schema_fixes_migration.sql' },
  { name: 'Hierarquia Coordenador (1-5)', file: 'hierarchy_coordenador_migration.sql' },
  { name: 'Visibilidade do Dashboard', file: 'dashboard_visibility_migration.sql' },
  { name: 'Modo Executivo (CEO)', file: 'executive_mode_migration.sql' },
  { name: 'Estrutura Organizacional (área, cargo, setor)', file: 'organizational_structure_migration.sql' },
  { name: 'IA Organizacional Ativa (eventos, memória)', file: 'organizational_ai_migration.sql' },
  { name: 'Multi-Tenant (plan_type, company_id em tabelas)', file: 'multi_tenant_migration.sql' },
  { name: 'Ativação Comercial (is_first_access, senha temporária)', file: 'commercial_activation_migration.sql' },
  { name: 'Campos setup empresa (industry_type, initial_areas_count)', file: 'companies_setup_fields_migration.sql' },
  { name: 'Doc contexto (POPs, manuals para IA)', file: 'doc_context_migration.sql' },
  { name: 'User activity logs (Resumo Inteligente)', file: 'user_activity_logs_migration.sql' },
  { name: 'WhatsApp contacts (notificações TPM)', file: 'whatsapp_contacts_migration.sql' },
  { name: 'TPM (formulário de perdas)', file: 'tpm_migration.sql' },
  { name: 'Asaas (assinaturas recorrentes)', file: 'asaas_subscriptions_migration.sql' },
  { name: 'Z-API Connect (integração automática)', file: 'zapi_connect_migration.sql' },
  { name: 'Planos e limite WhatsApp (plans, whatsapp_instances)', file: 'whatsapp_plans_instances_migration.sql' },
  { name: 'Índice pgvector (manual_chunks)', file: 'proacao_diag_migration.sql' },
  { name: 'Segurança Enterprise (RBAC, audit IA, refresh tokens)', file: 'security_enterprise_migration.sql' }
];

async function run() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  IMPETUS COMUNICA IA - Migrations');
  console.log('═══════════════════════════════════════════════════════\n');

  const modelsDir = path.join(__dirname, '../src/models');

  for (let i = 0; i < MIGRATIONS.length; i++) {
    const m = MIGRATIONS[i];
    const sqlPath = path.join(modelsDir, m.file);

    if (!fs.existsSync(sqlPath)) {
      console.error(`❌ Arquivo não encontrado: ${m.file}`);
      process.exit(1);
    }

    console.log(`[${i + 1}/${MIGRATIONS.length}] Executando: ${m.name}...`);

    try {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await db.query(sql);
      console.log(`    ✓ ${m.name} OK\n`);
    } catch (err) {
      console.error(`    ✗ Erro em ${m.file}:`, err.message);
      console.error('\nDetalhes:', err.detail || err);
      process.exit(1);
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('  ✓ Todas as migrations executadas com sucesso!');
  console.log('═══════════════════════════════════════════════════════\n');
  process.exit(0);
}

run();
