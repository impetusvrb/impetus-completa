# BUTTON INVENTORY — IMPETUS Admin Modules 2026-07-13

**Auditoria:** STABILIZATION_AUDIT_001  
**Escopo:** Botões e acções clicáveis em módulos administrativos (frontend + admin-portal)  
**Método:** Análise estática — padrões `onClick`, `disabled`, stubs, handlers vazios

---

## Resumo executivo

| Métrica | Valor |
|---------|-------|
| Ficheiros admin auditados | 55+ (12 Admin*.jsx + 3 domains/admin + 16 admin-portal pages + componentes SOC) |
| Botões mortos (`onClick={() => {}}`) | **0** |
| Botões "Em breve" / "Coming soon" | **0** |
| Handlers só `console.log` | **0** |
| Acções enganosas (clicável sem efeito) | **1** |
| Botões disabled sem explicação | **6** |
| Feedback silencioso pós-acção | **1** |
| Stubs backend documentados (ManuIA) | **2** (fora escopo admin strict) |

**Conclusão:** Código admin está majoritariamente funcional. O único defeito funcional significativo é o botão "Ver relatório completo →" no Centro de Segurança.

---

## Inventário por severidade

### P1 — Acção enganosa (impacto operacional)

| ID | Localização | Componente | Label | Causa | Impacto | Prioridade |
|----|-------------|------------|-------|-------|---------|------------|
| BTN-001 | `admin-portal/src/components/soc/SocRightRail.jsx:112` | SocRightRail | `Ver relatório completo →` | `onOpenReport` → `handleOpenReport` só executa `scrollIntoView`; drilldown (`SecurityEvidenceDrilldown`) só monta quando `selectedOrigin` existe | Utilizador clica esperando relatório; **nenhum feedback visual** sem país seleccionado | P1 |
| BTN-001b | `admin-portal/src/pages/SecurityDashboard.jsx:329-334` | SecurityDashboard | (handler) | `drilldownRef.current` é `null` quando não há seleção — scroll no-op | Mesmo que BTN-001 | P1 |

**Fix recomendado:** (a) desactivar botão + tooltip "Seleccione um país no mapa"; (b) ou abrir drawer/modal de relatório agregado.

---

### P2 — Funcional com degradação silenciosa

| ID | Localização | Componente | Label | Causa | Impacto | Prioridade |
|----|-------------|------------|-------|-------|---------|------------|
| BTN-002 | `frontend/src/pages/AdminIntegrations.jsx:374` | AdminIntegrations | `Copiar` (ícone) | `copyToken` L170-172: `clipboard.writeText` com `catch {}` vazio | Token copiado sem confirmação; falha silenciosa | P3 |

---

### P3 — Disabled / acessibilidade (funcionais quando activos)

| ID | Localização | Componente | Label | Causa | Impacto | Prioridade |
|----|-------------|------------|-------|-------|---------|------------|
| BTN-003 | `frontend/src/pages/AdminEquipmentLibrary.jsx:107-125` | EquipmentLibrary | `Principal` | `disabled={row.is_primary}` | Utilizador não sabe por que desactivado | P3 |
| BTN-004 | `frontend/src/pages/AdminEquipmentLibrary.jsx:285-299` | EquipmentLibrary | `Validar IA` | `disabled={!row.suggested_by_ai}` | Sem tooltip | P3 |
| BTN-005 | `frontend/src/pages/AdminIntegrations.jsx:400` | AdminIntegrations | Revogar (Trash2) | `disabled={!a.enabled}` | Agente edge inactivo — sem razão inline | P3 |
| BTN-006 | `frontend/src/pages/AdminAudioLogs.jsx:210-223` | AdminAudioLogs | `Anterior` / `Próxima` | Paginação nos limites | Contexto parcial via "Página X de Y" | P3 |
| BTN-007 | `frontend/src/pages/AdminDepartments.jsx:345-346` | AdminDepartments | Editar / Apagar (ícones) | Sem `type="button"`, sem `aria-label` | Funcional; acessibilidade frágil | P3 |
| BTN-008 | `frontend/src/pages/AdminUsers.jsx:414-432` | AdminUsers | Editar / Reset / Desactivar | `disabled` com `title` quando locked | ✅ **Bom exemplo** — manter padrão | — |

---

## Inventário por módulo — botões principais

### Frontend `/app/admin/*`

| Módulo | Botões auditados | Estado | Notas |
|--------|------------------|--------|-------|
| AdminUsers | Criar, Editar, Reset senha, Desativar, Filtros, Paginação | ✅ Funcional | Protecção admin IMPETUS com tooltip |
| AdminDepartments | Criar dept, Editar, Apagar, Expandir árvore | ✅ Funcional | BTN-007 a11y |
| AdminOperationalTeams | CRUD equipes, membros, convites | ✅ Funcional | — |
| AdminStructural | CRUD sectores, cargos, linhas, activos, processos, produtos | ✅ Funcional | Subformulários extensos |
| CompanyAdminSettings | Guardar por tab, upload POPs, sync Pulse | ✅ Funcional | 7 tabs |
| AdminEquipmentLibrary | CRUD assets, upload 3D/PDF, CSV import, Validar IA | ⚠ Parcial | BTN-003, BTN-004 |
| AdminAuditLogs | Filtrar, Refresh, tabs, expand AI trace | ✅ Funcional | Stats silencioso (não botão) |
| AdminAiIncidents | Resolver, filtrar, paginar | ✅ Funcional | — |
| CognitiveGovernance | Refresh, tabs observacionais | ✅ Funcional | Read-only |
| ActionApprovalDashboard | Aprovar, Rejeitar, filtrar | ✅ Funcional | HITL runtime |
| RolloutCenterHub | Atualizar, Revalidar gate | ✅ Funcional | Disabled durante evaluating |
| CertificationReadinessHub | Run checks, export | ✅ Funcional | — |
| FinalConsolidationHub | Run audit, quick audit | ✅ Funcional | — |
| AdminIntegrations | Criar token, Copiar, Revogar, testar agente | ⚠ Parcial | BTN-002, BTN-005 |
| NexusIACustos | Refresh, pausar carteira, tabs | ✅ Funcional | — |
| AdminHelpCenter | Links navegação, busca | ✅ Funcional | — |
| AdminWarehouse | CRUD completo almoxarifado | ✅ Funcional | Menu órfão |
| AdminLogistics | CRUD logística | ✅ Funcional | Menu órfão |
| AdminAudioLogs | Play, download, paginação | ✅ Funcional | BTN-006 |
| ImplementationGuide | Links para módulos, navegação steps | ✅ Funcional | — |
| CentroCustosAdmin | CRUD centros de custo | ✅ Funcional | — |

### Admin-portal

| Módulo | Botões auditados | Estado | Notas |
|--------|------------------|--------|-------|
| SecurityDashboard | Refresh, map hotspots, tools, drawer, drilldown | ⚠ | BTN-001 |
| SocToolRail | Events, Timeline, Severity | ✅ Funcional | R8 16/16 PASS |
| SocAnalyticsDrawer | Close, ESC | ✅ Funcional | — |
| CompaniesList / CRUD | Criar, editar, guardar | ✅ Funcional | — |
| Users | CRUD global | ✅ Funcional | — |
| SupportRecovery | Criar operação, executar | ✅ Funcional | Disabled quando feature off + aviso |
| AuthorizedDevices | Adicionar IP, remover | ✅ Funcional | — |
| AiGovernance / Compliance / Risk | Read-only panels | N/A | Sem botões de acção |
| Dashboard (admin) | Read-only | N/A | — |

---

## Padrões proibidos — resultado da varredura

| Padrão | Ocorrências admin | Status |
|--------|-------------------|--------|
| `onClick={() => {}}` | 0 | ✅ |
| `onClick={undefined}` | 0 | ✅ |
| "Em breve" / "Coming soon" | 0 | ✅ |
| `console.log` only onClick | 0 | ✅ |
| `href="#"` sem preventDefault | 0 | ✅ |
| Stub API + só toast | 0 | ✅ |

---

## Referências históricas (fora escopo admin strict)

| Módulo | Botão | Estado histórico | Fonte |
|--------|-------|------------------|-------|
| ManuIA | simulate, purchase-order | Stub backend 200 | CERT-MANUIA-FUNCTIONAL-AUDIT-FIX |
| Enterprise Workspaces | Botões demo JSON.stringify | Removidos 2026-05-18 | ENTERPRISE_WORKSPACE_HARDENING |
| Centro Comando | Atualizar (vivo) | Handler OK; colisão CSS | CERT-01-1 |

---

## Matriz causa × impacto × prioridade

| Causa raiz | Ocorrências | Impacto agregado | Prioridade fix |
|------------|-------------|------------------|----------------|
| Handler condicional incompleto | 1 | Confiança SOC degradada | P1 |
| catch {} silencioso | 1 | Feedback UX | P3 |
| disabled sem tooltip | 5 | Acessibilidade | P3 |
| Rota/menu desalinhado | 3 módulos | Descoberta funcional | P2 |

---

*Inventário read-only. Nenhum handler foi alterado durante esta auditoria.*
