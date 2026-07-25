# STABILIZATION AUDIT 001 — Fase de Estabilização Funcional IMPETUS

**ID:** STABILIZATION_AUDIT_001  
**Data:** 2026-07-13  
**Tipo:** Auditoria read-only (sem alterações em infra, backups, evidências forenses ou cadeia de custódia)  
**Operador:** Agente de estabilização funcional  
**Contexto forense:** Externalização P0 aguardando operador autorizado (Gustavo) — **nenhum artefato forense foi modificado**

---

## 1. Objetivo

Executar levantamento completo de estabilidade funcional do IMPETUS com foco em:

- Estabilidade operacional
- UX e consistência visual
- Regressões conhecidas
- Inventário de botões
- Baseline de performance

**Fora de escopo:** segurança ofensiva, remediação de armazenamento, Red Team, alterações em PostgreSQL/PM2/backups/scripts P0.

---

## 2. Metodologia

| Camada | Método | Limitação |
|--------|--------|-----------|
| Frontend principal | Análise estática de rotas, componentes, handlers, CSS | Sem browser E2E autenticado nesta fase |
| Admin-portal (SOC) | Análise estática + validação de patches SEC-RUNTIME-02 / R8B | Sem sessão MFA real |
| Backend APIs | Probe HTTP anónimo (401/404 esperados sem token) | Tempos medidos sem auth |
| Documentação prévia | Cruzamento com `backend/docs/evidence/admin-portal-security/`, `FUNCTIONAL_MATRIX.md`, `BUGS_DASHBOARD_MANUTENCAO.md` | Alguns docs datados (2025) |
| PM2 / runtime | `pm2 list`, curl localhost | Produção intacta |

---

## 3. ETAPA 1 — Levantamento de módulos administrativos

### 3.1 Frontend principal (`/app/admin/*`)

**Fonte:** `frontend/src/App.jsx`, `frontend/src/components/Layout.jsx` (`MENUS.admin`)

| # | Módulo | Rota | Componente | Menu sidebar | Guard |
|---|--------|------|------------|--------------|-------|
| 1 | Guia de Implantação | `/app/admin/implantacao-guia` | `ImplementationGuide.jsx` | Sim (strict) | StrictAdmin |
| 2 | Gestão de Usuários | `/app/admin/users` | `AdminUsers.jsx` | Sim | Admin |
| 3 | Centro de Custos (Config) | `/app/admin/centro-custos` | `CentroCustosAdmin.jsx` | Sim | Admin |
| 4 | Departamentos | `/app/admin/departments` | `AdminDepartments.jsx` | Sim | Admin |
| 5 | Equipes Operacionais | `/app/admin/equipes-operacionais` | `AdminOperationalTeams.jsx` | Sim | Admin |
| 6 | Base Estrutural | `/app/admin/structural` | `AdminStructural.jsx` | Sim | Admin |
| 7 | Conteúdo da Empresa | `/app/admin/conteudo-empresa` | `CompanyAdminSettings.jsx` | Sim | Admin |
| 8 | Biblioteca Técnica | `/app/admin/equipment-library` | `AdminEquipmentLibrary.jsx` | Sim | StrictAdmin |
| 9 | Logs de Auditoria | `/app/admin/audit-logs` | `AdminAuditLogs.jsx` | Sim | StrictAdmin |
| 10 | Incidentes de IA | `/app/admin/ai-incidents` | `AdminAiIncidents.jsx` | Sim | StrictAdmin |
| 11 | Governança Cognitiva | `/app/admin/cognitive-governance` | `CognitiveGovernanceDashboard.jsx` | Sim | StrictAdmin |
| 12 | Aprovações IA (HITL) | `/app/admin/action-approvals` | `ActionApprovalDashboard.jsx` | Sim | StrictAdmin |
| 13 | Rollout Center | `/app/admin/rollout-center` | `RolloutCenterHub.jsx` | Sim | StrictAdmin |
| 14 | Certification Readiness | `/app/admin/certification-readiness` | `CertificationReadinessHub.jsx` | Sim | StrictAdmin |
| 15 | Consolidação Final | `/app/admin/final-consolidation` | `FinalConsolidationHub.jsx` | Sim | StrictAdmin |
| 16 | Integração e Conectividade | `/app/admin/integrations` | `AdminIntegrations.jsx` | Sim | Admin |
| 17 | Nexus IA — Custos | `/app/admin/nexusia-custos` | `NexusIACustos.jsx` | Sim | Admin |
| 18 | Central de Ajuda | `/app/admin/help-center` | `AdminHelpCenter.jsx` | Sim + header | Admin |
| 19 | Almoxarifado (cadastros) | `/app/admin/warehouse` | `AdminWarehouse.jsx` | **Não** | Admin |
| 20 | Logística (cadastros) | `/app/admin/logistics` | `AdminLogistics.jsx` | **Não** | Admin |
| 21 | Logs de Áudio | `/app/admin/audio-logs` | `AdminAudioLogs.jsx` | **Não** | DirectorOrCEO |

**Redirect:** `/app/configuracoes` → `/app/admin/conteudo-empresa`

**Módulos admin-adjacentes:**

| Módulo | Rota | Notas |
|--------|------|-------|
| Setup Empresa | `/setup-empresa` | Fluxo 1.º acesso |
| Painel Operacional | `/app/operacional` | StrictAdmin |
| Validação Organizacional | `/app/validacao-organizacional` | Liderança |

**Componentes órfãos (sem rota em App.jsx):**

- `features/dashboard/AdminDashboard.jsx`
- `features/governance/ContextGovernancePage.jsx`
- `pages/SystemHealthPage.jsx` (Saúde do Sistema via drawer em `Layout.jsx`)

### 3.2 Admin-portal (`admin-portal/`)

| # | Página | Rota típica | Função |
|---|--------|-------------|--------|
| 1 | SecurityDashboard | `/seguranca` | Centro de Segurança SOC (R8B) |
| 2 | Dashboard | `/` | Overview admin software |
| 3 | CompaniesList | `/empresas` | Multi-tenant |
| 4 | CompanyDetail / CompanyEdit / CompanyNew | `/empresas/*` | CRUD empresas |
| 5 | Users | `/usuarios` | Gestão global |
| 6 | Logs | `/logs` | Logs plataforma |
| 7 | AiGovernance / AiCompliance / AiRiskIntelligence | `/ia/*` | Governança IA |
| 8 | AuthorizedDevices | `/dispositivos` | Device trust |
| 9 | AccountSecurity | `/conta/seguranca` | MFA/conta |
| 10 | SupportRecovery | `/suporte/recuperacao` | Recovery ops |

### 3.3 Funcionalidades por categoria (admin frontend)

| Categoria | Estado geral | Observações |
|-----------|--------------|-------------|
| Navegação / menus | ⚠ Parcial | 3 rotas órfãs sem entrada no sidebar |
| Formulários CRUD | ✅ Estrutura sólida | AdminUsers, Structural, Departments com validação Zod-like |
| Drawers / modais | ✅ Presentes | ActionApproval, Structural subforms |
| Abas | ✅ | CompanyAdminSettings (7 tabs), AdminAuditLogs (audit + data-access + AI) |
| Filtros / paginação | ✅ | AdminAuditLogs, AdminAudioLogs, AdminUsers |
| Exportações | ⚠ Parcial | CSV spare-parts (equipment library); nem todos os módulos exportam |
| Uploads | ✅ | Equipment library (PDF, 3D, CSV), CompanyAdminSettings |
| Downloads | ✅ | Audit log detail, equipment assets |

### 3.4 Achados funcionais por severidade

| ID | Módulo | Problema | Tipo | Severidade |
|----|--------|----------|------|------------|
| STAB-001 | Navegação | Rotas `/warehouse`, `/logistics`, `/audio-logs` sem link no menu | Navegação | P2 |
| STAB-002 | AdminAuditLogs | `getStats()` falha silenciosamente (`catch {}`) — KPIs de stats podem ficar vazios | Erro silencioso | P2 |
| STAB-003 | AdminEquipmentLibrary | `references()` falha silenciosamente — dropdowns podem carregar vazios | Erro silencioso | P2 |
| STAB-004 | CognitiveGovernance | Requer `IMPETUS_COGNITIVE_DASHBOARD_ENABLED=true` — página pode mostrar estado vazio | Config | P2 |
| STAB-005 | Componentes órfãos | AdminDashboard, ContextGovernancePage, SystemHealthPage sem rota | Dead code | P3 |
| STAB-006 | Manutenção (geral) | Roles `technician_maintenance` etc. podem cair em menu colaborador | UX navegação | P2 |
| STAB-007 | Centro de Segurança | Botão "Ver relatório completo →" sem efeito sem país seleccionado | Ação enganosa | P1 |

---

## 4. ETAPA 2 — Validação de regressões conhecidas

| Regressão | Referência | Estado 2026-07-13 | Evidência |
|-----------|------------|-------------------|-----------|
| Scroll Ownership Recovery | SEC-RUNTIME-02 | ✅ **CORRIGIDO** | `.security-soc-page` usa `min-height` (não `height+overflow:hidden`); scroll owner = `main.admin-main--soc` |
| Baseline R8B | SEC_VISUAL_INTELLIGENCE_003B_R8B | ✅ **PRESERVADO** | ViewBox, MAP-FIRST, tokens congelados documentados |
| R8A hooks blank screen | R8A.md | ✅ **CORRIGIDO** | `SecurityDashboard.jsx`: hooks no topo do ficheiro |
| Centro de Segurança — mapa | R8 §11 | ✅ **INTACTO** | `WorldMapCartographic.jsx` com wheel handler scoped |
| Zoom / wheel | MAP_WHEEL_SCOPE | ✅ **INTACTO** | `onWheel` em viewport do mapa apenas |
| Drawers analíticos | R8 | ✅ **INTACTO** | `SocAnalyticsDrawer`, ESC/close handlers |
| Simulador SEC-19 | SEC-RUNTIME-02 | ✅ **ACESSÍVEL** | `.soc-legacy-section` abaixo do hub; scroll recuperado |
| Layout responsivo SOC | R6/R7 | ⚠ **PARCIAL** | Right rail corrigido em R6; breakpoints <768px não re-auditados E2E |
| Dashboard Manutenção APIs 404 | BUGS_DASHBOARD_MANUTENCAO.md | ✅ **RESOLVIDO** | `/api/dashboard/maintenance/summary` → 401 (existe, requer auth) |
| Dashboard `/me` 404 | BUGS_DASHBOARD_MANUTENCAO.md | ✅ **RESOLVIDO** | `/api/dashboard/me` → 401 |
| DashboardMecanico nunca renderizado | BUGS_DASHBOARD_MANUTENCAO.md | ✅ **RESOLVIDO** | `Dashboard.jsx` renderiza condicionalmente |
| Botão Atualizar encoberto | CERT-01-1 | ⚠ **NÃO RE-VALIDADO** | Overlay cognitivo 1366×768 — requer teste visual |

**Total regressões conhecidas:** 12  
**Confirmadas corrigidas:** 9  
**Parcial / pendente re-validação E2E:** 3

---

## 5. ETAPA 3 — Auditoria UX (resumo)

Ver `UX_REGRESSION_MATRIX.md` para matriz completa.

Principais categorias:

- **Navegação:** rotas órfãs, menu manutenção incompleto
- **Tipografia DS:** `chat-module/styles/chat.css` usa `Inter` (violação DS Industrial 4.0)
- **Overflow / clip:** múltiplos `overflow: hidden` + `text-overflow: ellipsis` em tabelas admin
- **Stacking:** z-index 9998–9999 em overlays (Toast, Voice, FloatButton) — risco de colisão
- **Scroll duplo:** SmartPanel + cognitive ecosystem com `overflow: auto` aninhado
- **Feedback silencioso:** Copiar token (Integrations), stats audit logs

---

## 6. ETAPA 4 — Performance (resumo)

Ver `PERFORMANCE_BASELINE_2026.md`.

Probe localhost 2026-07-13:

| Endpoint / recurso | HTTP | Tempo |
|--------------------|------|-------|
| `GET /health` | 200 | **1.0–3.1 s** ⚠ |
| `GET /api/system/health/deep` | 200 | 10–37 ms |
| `GET /api/dashboard/me` | 401 | 17–19 ms |
| Frontend `:3000` | 200 | ~110 ms |
| Admin-portal `:5174` | 302 | ~99 ms |

**Alerta:** `/health` lento por probe de integrações externas (OpenAI, Anthropic, Vertex) com cache TTL 45s.

---

## 7. ETAPA 5 — Botões (resumo)

Ver `BUTTON_INVENTORY.md`.

- **0** botões com `onClick={() => {}}` nos módulos admin auditados
- **1** botão com acção enganosa (P1): "Ver relatório completo →"
- **6** botões `disabled` sem explicação inline (P3)
- **1** botão com feedback ausente: Copiar token (P3)

---

## 8. Restrições respeitadas

| Restrição | Cumprida |
|-----------|----------|
| Sem remoção de arquivos | ✅ |
| Sem limpeza de disco | ✅ |
| Sem alteração em backups | ✅ |
| Sem alteração em evidências / hashes | ✅ |
| Sem mudança cadeia de custódia | ✅ |
| Sem alteração PostgreSQL / PM2 | ✅ |
| Sem alteração scripts P0 | ✅ |
| `backend/docs/evidence/storage-remediation/` intacto | ✅ |

---

## 9. PM2 Runtime (snapshot)

```
impetus-backend        online  (port 4000)
impetus-frontend       online  (port 3000)
impetus-admin-portal   online  (port 5174)
```

---

## 10. Próximos passos recomendados

1. Fase de correção P1: botão "Ver relatório completo" no SOC
2. Adicionar rotas órfãs ao menu ou redireccionar
3. Eliminar `catch {}` silenciosos em AdminAuditLogs / AdminEquipmentLibrary
4. Teste E2E autenticado (Playwright) para validar formulários e regressões visuais
5. Optimizar `/health` ou separar probe de integrações do health check rápido

**Documentos relacionados:**

- `FUNCTIONAL_REGRESSION_MATRIX.md`
- `UX_REGRESSION_MATRIX.md`
- `BUTTON_INVENTORY.md`
- `PERFORMANCE_BASELINE_2026.md`
- `PENDING_FIXES_ROADMAP.md`

---

*Auditoria read-only. Nenhum ficheiro de produção, forense ou infraestrutura foi modificado durante esta missão.*
