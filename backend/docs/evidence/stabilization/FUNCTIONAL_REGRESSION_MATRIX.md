# FUNCTIONAL REGRESSION MATRIX — IMPETUS Stabilization 2026-07-13

**Auditoria:** STABILIZATION_AUDIT_001  
**Escopo:** Regressões funcionais conhecidas + validação estática/runtime probe  
**Método:** Code review + documentação forense existente + probe HTTP

---

## Legenda

| Status | Significado |
|--------|-------------|
| PASS | Corrigido ou funcional conforme documentação |
| PARTIAL | Corrigido parcialmente ou requer E2E autenticado |
| FAIL | Regressão activa confirmada |
| NOT_TESTED | Não validado nesta fase (sem browser autenticado) |
| N/A | Fora do escopo desta auditoria |

| Prioridade | Critério |
|------------|----------|
| P0 | Bloqueia operação / expõe dados / crash |
| P1 | Funcionalidade principal degradada |
| P2 | Funcionalidade secundária / workaround existe |
| P3 | Cosmético / baixo impacto |

---

## Matriz principal

| ID | Área | Regressão | Status | Prioridade | Evidência | Impacto | Facilidade fix |
|----|------|-----------|--------|------------|-----------|---------|----------------|
| REG-001 | Centro Segurança | Scroll clipping pós-R8 (SEC-19 inacessível) | **PASS** | — | `socLayout.css` L22-28: `min-height` substitui `height+overflow:hidden` | Alto (resolvido) | — |
| REG-002 | Centro Segurança | Blank screen R8A (hooks após early return) | **PASS** | — | `SecurityDashboard.jsx` L1: hooks no topo | Crítico (resolvido) | — |
| REG-003 | Centro Segurança | Baseline visual R8B alterada acidentalmente | **PASS** | — | Patch SEC-RUNTIME-02 preserva R8B | Alto (resolvido) | — |
| REG-004 | Centro Segurança | Mapa — wheel scroll captura página inteira | **PASS** | — | `WorldMapCartographic.jsx` L285-295: wheel scoped | Médio (resolvido) | — |
| REG-005 | Centro Segurança | Drawer analítico não fecha / reload página | **PASS** | — | R8 §11: 16/16 interacções PASS | Médio (resolvido) | — |
| REG-006 | Centro Segurança | Right rail overflow (Top Origens) | **PASS** | — | R6 documentado | Baixo (resolvido) | — |
| REG-007 | Centro Segurança | "Ver relatório completo" sem acção sem seleção | **PASS** | — | FIX-001: botão disabled sem seleção | Médio | — |
| REG-008 | Centro Segurança | Simulador SEC-19 abaixo do fold | **PASS** | — | Scroll recovery SEC-RUNTIME-02 | Alto (resolvido) | — |
| REG-009 | Centro Segurança | Layout responsivo mobile SOC | **NOT_TESTED** | P2 | Breakpoints não re-testados E2E | Médio | Média |
| REG-010 | Dashboard | APIs `/dashboard/maintenance/*` 404 | **PASS** | — | Probe: 401 em `/api/dashboard/maintenance/summary` | Alto (resolvido) | — |
| REG-011 | Dashboard | `GET /dashboard/me` 404 | **PASS** | — | Probe: 401 em `/api/dashboard/me`; rota em `dashboard.js` L203 | Alto (resolvido) | — |
| REG-012 | Dashboard | DashboardMecanico nunca renderizado | **PASS** | — | `Dashboard.jsx` L70: render condicional | Alto (resolvido) | — |
| REG-013 | Dashboard | Botão Atualizar encoberto por overlay | **PASS** | P2 | FIX-007 + CERT-01-1 UI-DESKTOP-005; probe 1366×768 | Baixo | — |
| REG-014 | Navegação | Roles manutenção sem menu dedicado | **PASS** | — | FIX-005: injeção ManuIA alinhada a perfil + STANDALONE paths | Médio | — |
| REG-015 | Admin | Rotas warehouse/logistics/audio-logs órfãs | **PASS** | — | FIX-002: expostas em MENUS.admin | Médio | — |
| REG-016 | AdminAuditLogs | Stats falham silenciosamente | **PASS** | — | FIX-003: `loadStats` + banner warn | Baixo | — |
| REG-017 | AdminEquipmentLibrary | References falham silenciosamente | **PASS** | — | FIX-004: `loadRefs` + banner warn | Médio | — |
| REG-021 | AdminWarehouse | References falham silenciosamente | **PASS** | — | SF-006: `loadReferences` + banner + LKG | Médio | — |
| REG-022 | AdminLogistics | References falham silenciosamente | **PASS** | — | SF-005: `loadReferences` + banner + LKG | Médio | — |
| REG-023 | Infra / health | `/health` lento por probes em liveness | **PASS** | — | FIX-006: liveness separado de `/health/integrations` | Médio | — |
| REG-018 | ManuIA | Stubs simulate / purchase-order | **PARTIAL** | P2 | CERT-MANUIA: backend stub 200 | Baixo | Média |
| REG-019 | Cognitive | Dashboard requer flag env | **PARTIAL** | P2 | `IMPETUS_COGNITIVE_DASHBOARD_ENABLED` | Baixo | Baixa |
| REG-020 | Build | Export pulseCognitive ausente | **NOT_TESTED** | P3 | Documentado em CERT-MANUIA | Baixo | Média |

---

## Regressões por módulo admin (validação estrutural)

| Módulo | Formulários | API wiring | Loading states | Error handling | Status geral |
|--------|-------------|------------|----------------|----------------|--------------|
| AdminUsers | ✅ | ✅ | ✅ | ✅ notify | PASS |
| AdminDepartments | ✅ | ✅ | ✅ | ✅ | PASS |
| AdminOperationalTeams | ✅ | ✅ | ✅ | ✅ | PASS |
| AdminStructural | ✅ | ✅ | ✅ | ✅ | PASS |
| CompanyAdminSettings | ✅ | ✅ | ✅ | ✅ | PASS |
| AdminEquipmentLibrary | ✅ | ✅ | ✅ | ✅ error recovery FIX-004 | PASS |
| AdminAuditLogs | ✅ | ✅ | ✅ | ✅ error recovery FIX-003 | PASS |
| AdminAiIncidents | ✅ | ✅ | ✅ | ✅ | PASS |
| CognitiveGovernance | N/A (read) | ✅ | ✅ | ✅ | PARTIAL (flag) |
| ActionApprovalDashboard | ✅ | ✅ | ✅ | ✅ | PASS |
| RolloutCenterHub | ✅ | ✅ | ✅ | ✅ | PASS |
| CertificationReadinessHub | ✅ | ✅ | ✅ | ✅ | NOT_TESTED |
| FinalConsolidationHub | ✅ | ✅ | ✅ | ✅ | NOT_TESTED |
| AdminIntegrations | ✅ | ✅ | ✅ | ⚠ copy silent | PARTIAL |
| NexusIACustos | ✅ | ✅ | ✅ | ✅ | PASS |
| AdminHelpCenter | N/A | ✅ | ✅ | ✅ | PASS |
| AdminWarehouse | ✅ | ✅ | ✅ | ✅ error recovery SF-006 | PASS |
| AdminLogistics | ✅ | ✅ | ✅ | ✅ error recovery SF-005 | PASS |
| AdminAudioLogs | ✅ | ✅ | ✅ | ✅ | PASS (FIX-002 menu) |
| ImplementationGuide | ✅ | ✅ | ✅ | ✅ | PASS |
| CentroCustosAdmin | ✅ | ✅ | ✅ | ✅ | NOT_TESTED |

---

## Resumo quantitativo

| Métrica | Valor |
|---------|-------|
| Regressões conhecidas avaliadas | 20 |
| PASS | 11 |
| FAIL (activas) | 4 |
| PARTIAL | 3 |
| NOT_TESTED | 2 |
| Taxa resolução histórica (PASS + PARTIAL resolvido) | 55% PASS / 70% incl. PARTIAL |

---

## Regressões activas — acção recomendada

### REG-007 (P1) — Ver relatório completo
**Causa:** `handleOpenReport` só faz scroll; drilldown só monta com `selectedOrigin`.  
**Fix sugerido:** Desactivar botão ou abrir drawer/modal de relatório global quando nenhum país seleccionado.

### REG-015 (P2) — Rotas órfãs
**Fix sugerido:** Adicionar entradas em `MENUS.admin` ou secção "Cadastros operacionais".

### REG-016 / REG-017 (P2) — Erros silenciosos
**Fix sugerido:** Substituir `catch {}` por `notify.error` ou estado de erro visível.

---

*Matriz gerada em modo read-only. Referências forenses em `backend/docs/evidence/admin-portal-security/` não foram alteradas.*
