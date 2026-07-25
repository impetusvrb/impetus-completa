'use strict';

/**
 * APPSEC-02 — Baseline congelado do Red Team 04/07/2026.
 * Fonte: relatório autorizado de intrusão (read-only reference).
 */

const RED_TEAM_BASELINE = Object.freeze({
  schema_version: 'red_team_baseline_v1',
  report_date: '2026-07-04',
  report_title: 'Operação Red Team Autorizada — IMPETUS',
  total_findings: 16,
  findings: [
    {
      id: 'RT-01',
      title: 'IDOR Chat cross-tenant',
      category: 'access',
      priority: 'P0',
      risk: 'High',
      cvss_approx: 8.1,
      cwe: ['CWE-639', 'CWE-284'],
      owasp: 'A01',
      before_state: 'EXPLOITABLE',
      before_summary: 'targetUserId/participantIds inseridos sem validação company_id em chatService.js'
    },
    {
      id: 'RT-02',
      title: 'SSRF armazenado — Time Clock',
      category: 'ssrf',
      priority: 'P0',
      risk: 'High',
      cvss_approx: 7.5,
      cwe: ['CWE-918'],
      owasp: 'A10',
      before_state: 'EXPLOITABLE',
      before_summary: 'fetch(int.api_url) sem blocklist em timeClockIntegrationService.js'
    },
    {
      id: 'RT-03',
      title: 'SSRF armazenado — PLC REST',
      category: 'ssrf',
      priority: 'P0',
      risk: 'High',
      cvss_approx: 7.5,
      cwe: ['CWE-918'],
      owasp: 'A10',
      before_state: 'EXPLOITABLE',
      before_summary: 'axios.request URL controlável via BD em restAdapter.js'
    },
    {
      id: 'RT-04',
      title: 'Uploads sem validação — Chat e Manuais',
      category: 'upload',
      priority: 'P1',
      risk: 'High',
      cvss_approx: 7.2,
      cwe: ['CWE-434'],
      owasp: 'A04',
      before_state: 'EXPLOITABLE',
      before_summary: 'multer sem fileFilter; 50MB; extensão de originalname'
    },
    {
      id: 'RT-05',
      title: 'Exposição boot-metrics / aioi/health',
      category: 'public_endpoint',
      priority: 'P1',
      risk: 'Medium',
      cvss_approx: 5.3,
      cwe: ['CWE-200'],
      owasp: 'A05',
      before_state: 'EXPLOITABLE',
      before_summary: 'GET /api/system/boot-metrics e /api/aioi/health expõem métricas internas sem auth'
    },
    {
      id: 'RT-06',
      title: 'ACL uploads incompleta',
      category: 'access',
      priority: 'P1',
      risk: 'Medium',
      cwe: ['CWE-284'],
      owasp: 'A01',
      before_state: 'EXPLOITABLE',
      before_summary: 'registro-inteligente, cadastrar-ia, chat-multimodal fora de uploadAccessService'
    },
    {
      id: 'RT-07',
      title: 'Segredos e backups .env no filesystem',
      category: 'config',
      priority: 'P0',
      risk: 'Critical',
      cwe: ['CWE-522', 'CWE-312'],
      owasp: 'A02',
      before_state: 'EXPLOITABLE',
      before_summary: '9 backups .env; artefactos pm2_env em docs/evidence/'
    },
    {
      id: 'RT-08',
      title: 'Configuração runtime insegura em produção',
      category: 'config',
      priority: 'P1',
      risk: 'Medium',
      owasp: 'A05',
      before_state: 'EXPLOITABLE',
      before_summary: 'LICENSE_VALIDATION_ENABLED=false; ADMIN_PORTAL_DEBUG=true; chave default time clock'
    },
    {
      id: 'RT-09',
      title: 'Dependências vulneráveis (npm audit)',
      category: 'dependencies',
      priority: 'P2',
      risk: 'Medium',
      owasp: 'A06',
      before_state: 'EXPLOITABLE',
      before_summary: '9 High backend + 7 High frontend (axios, ws, xlsx, …)'
    },
    {
      id: 'RT-10',
      title: 'JWT em localStorage + CSP unsafe-inline',
      category: 'access',
      priority: 'P2',
      risk: 'Medium',
      cwe: ['CWE-922', 'CWE-79'],
      owasp: 'A07',
      before_state: 'RESIDUAL',
      before_summary: 'Fora do escopo APPSEC-01; roadmap HttpOnly cookies'
    },
    {
      id: 'RT-11',
      title: 'UUIDs piloto em federation/MFA status',
      category: 'public_endpoint',
      priority: 'P3',
      risk: 'Low',
      cwe: ['CWE-200'],
      before_state: 'EXPLOITABLE',
      before_summary: 'GET /api/federation/status expõe pilot_tenants UUIDs'
    },
    {
      id: 'RT-12',
      title: '/api/health verboso',
      category: 'public_endpoint',
      priority: 'P3',
      risk: 'Low',
      cwe: ['CWE-200'],
      before_state: 'EXPLOITABLE',
      before_summary: 'Status integrações IA sem chave'
    },
    {
      id: 'RT-13',
      title: 'RLS PostgreSQL apenas piloto (2 tenants)',
      category: 'access',
      priority: 'P2',
      risk: 'Medium',
      before_state: 'RESIDUAL',
      before_summary: 'Isolamento depende da camada app para maioria dos tenants'
    },
    {
      id: 'RT-14',
      title: 'MIME bypass application/octet-stream',
      category: 'upload',
      priority: 'P1',
      risk: 'Medium',
      cwe: ['CWE-434'],
      before_state: 'EXPLOITABLE',
      before_summary: 'uploadPolicy.js aceitava octet-stream sempre'
    },
    {
      id: 'RT-15',
      title: 'Chave encriptação default Time Clock',
      category: 'config',
      priority: 'P1',
      risk: 'Medium',
      cwe: ['CWE-798'],
      before_state: 'EXPLOITABLE',
      before_summary: 'impetus-default-key-32b fallback'
    },
    {
      id: 'RT-16',
      title: 'Auth mount-level inconsistente',
      category: 'access',
      priority: 'P2',
      risk: 'Medium',
      before_state: 'RESIDUAL',
      before_summary: '~40 rotas sem requireAuth no mount; auth por handler'
    }
  ]
});

module.exports = { RED_TEAM_BASELINE };
