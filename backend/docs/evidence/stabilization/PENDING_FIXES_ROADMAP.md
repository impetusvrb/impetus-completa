# PENDING FIXES ROADMAP — IMPETUS Stabilization Phase

**Auditoria origem:** STABILIZATION_AUDIT_001  
**Data:** 2026-07-13  
**Status geral:** Auditoria completa — **pronto para fase de correção**  
**Restrição:** Correções não devem interferir com cadeia de custódia P0 / externalização forense

---

## STABILIZATION_STATUS

```
STABILIZATION_STATUS          = AUDIT_COMPLETE
TOTAL_MODULES_AUDITED         = 38
TOTAL_BUGS_FOUND              = 7
TOTAL_REGRESSIONS             = 20 (avaliadas)
TOTAL_UX_FINDINGS             = 20
TOTAL_JS_ERRORS               = 0 (estática; 0 onClick vazios)
TOTAL_API_ERRORS              = 3 (paths/silent failures documentados)
TOTAL_FIXES_RECOMMENDED       = 18
READY_FOR_FIX_PHASE           = YES
```

---

## Matriz consolidada de pendências

| ID | Título | Área | P | Impacto operacional | Risco | Facilidade | Prioridade |
|----|--------|------|---|---------------------|-------|------------|------------|
| FIX-001 | Botão "Ver relatório completo" sem acção | SOC / admin-portal | **P1** | Alto — confiança no Centro de Segurança | Médio | Alta | **DONE** |
| FIX-002 | Rotas warehouse/logistics/audio-logs órfãs no menu | Navegação admin | **P2** | Médio — funcionalidade oculta | Baixo | Alta | **DONE** |
| FIX-003 | AdminAuditLogs silent failure recovery | Admin / logs | **P2** | Médio — ambiguidade operacional | Baixo | Alta | **DONE** |
| FIX-004 | AdminEquipmentLibrary silent failure recovery | Admin / biblioteca | **P2** | Médio — ambiguidade operacional | Baixo | Alta | **DONE** |
| SF-005 | AdminLogistics reference failure recovery | Admin / logística | **P2** | Médio — dropdowns enganosos | Baixo | Alta | **DONE** |
| SF-006 | AdminWarehouse reference failure recovery | Admin / almoxarifado | **P2** | Médio — dropdowns enganosos | Baixo | Alta | **DONE** |
| FIX-005 | Menu roles manutenção incompleto | Navegação | **P2** | Médio — UX perfis maintenance | Baixo | Média | **DONE** |
| FIX-006 | `/health` lento (>1s) por probe integrações | Performance / ops | **P2** | Médio — LB timeouts | Médio | Média | **DONE** |
| FIX-007 | Botão Atualizar encoberto (1366×768) | Dashboard / UX | **P2** | Baixo — acção ainda clicável | Baixo | Média | **DONE** |
| FIX-008 | chat-module usa fonte Inter (viola DS) | Design System | **P2** | Baixo — inconsistência visual | Baixo | Média | **8** |
| FIX-009 | Scroll duplo cognitive/SmartPanel | Dashboard / UX | **P2** | Médio — confusão scroll | Baixo | Média | **DONE** (NO_PATCH) |
| FIX-010 | SOC responsivo mobile não certificado | SOC / UX | **P2** | Médio — mobile admin | Baixo | Média | **10** |
| FIX-011 | Copiar token sem feedback | AdminIntegrations | **P3** | Baixo | Baixo | Alta | **11** |
| FIX-012 | Botões disabled sem tooltip (EquipmentLibrary) | A11y | **P3** | Baixo | Baixo | Alta | **12** |
| FIX-013 | Ícones AdminDepartments sem aria-label | A11y | **P3** | Baixo | Baixo | Alta | **13** |
| FIX-014 | Componentes órfãos (AdminDashboard, etc.) | Dead code | **P3** | Nenhum | Baixo | Baixa | **14** |
| FIX-015 | ManuIA stubs simulate/PO | ManuIA | **P2** | Baixo — feedback stub | Baixo | Média | **15** |
| FIX-016 | Cognitive dashboard flag env | Config | **P3** | Baixo — doc/env | Baixo | Baixa | **16** |
| FIX-017 | AdminAuditLogs useEffect deps | React quality | **P3** | Baixo | Baixo | Alta | **17** |
| FIX-018 | Teste E2E Playwright admin suite | QA | **P2** | Alto — prevenir regressões | Médio | Baixa | **18** |

---

## Roadmap por fase

### Fase A — Quick wins (1–2 dias, zero risco forense)

| Fix | Esforço | Ficheiros |
|-----|---------|-----------|
| FIX-001 | 2h | `SecurityDashboard.jsx`, `SocRightRail.jsx` |
| FIX-003 | 30min | `AdminAuditLogs.jsx` |
| FIX-004 | 30min | `AdminEquipmentLibrary.jsx` |
| FIX-011 | 15min | `AdminIntegrations.jsx` |
| FIX-012 | 1h | `AdminEquipmentLibrary.jsx` |
| FIX-013 | 30min | `AdminDepartments.jsx` |

### Fase B — Navegação e UX (2–3 dias)

| Fix | Esforço | Ficheiros |
|-----|---------|-----------|
| FIX-002 | 2h | `Layout.jsx` MENUS.admin |
| FIX-005 | 4h | `Layout.jsx`, `roleUtils.js` |
| FIX-007 | 3h | `CentroComando.css`, cognitive overlay |
| FIX-008 | 2h | `chat-module/styles/chat.css` |
| FIX-009 | 4h | cognitive ecosystem CSS audit |

### Fase C — Performance e infra app (3–5 dias)

| Fix | Esforço | Ficheiros |
|-----|---------|-----------|
| FIX-006 | 4h | `backend/src/server.js` health routes |
| FIX-010 | 8h | `admin-portal/src/styles/socLayout.css` breakpoints |
| FIX-018 | 16h | Nova suite Playwright |

### Fase D — Backlog / pós-forense

| Fix | Notas |
|-----|-------|
| FIX-014 | Limpeza dead code — baixa prioridade |
| FIX-015 | ManuIA stubs — requer backend |
| FIX-016 | Documentar env flag |

---

## Distribuição por prioridade

| Prioridade | Quantidade | % |
|------------|------------|---|
| P0 | 0 | 0% |
| P1 | 1 | 6% |
| P2 | 10 | 56% |
| P3 | 7 | 38% |

---

## Critérios de aceitação — fase de correção

- [ ] FIX-001: botão desactivado ou abre relatório sem seleção de país
- [ ] FIX-002: 3 rotas acessíveis via sidebar admin
- [ ] FIX-003/004: erros visíveis ao utilizador (toast ou banner)
- [ ] FIX-006: `/health` < 500ms p95
- [ ] Regressão SEC-RUNTIME-02: scroll SEC-19 permanece acessível após fixes SOC
- [ ] Baseline R8B: nenhuma alteração visual não aprovada
- [ ] Zero alterações em `backend/docs/evidence/storage-remediation/`

---

## Dependências externas

| Bloqueio | Impacto | Acção |
|----------|---------|-------|
| Externalização P0 (Gustavo) | Nenhum nas fixes A/B | Fixes admin são independentes |
| Red Team pós-forense | FIX-006 expõe surface health | Coordenar com APPSEC |
| PostgreSQL / PM2 | Fixes não requerem restart DB | PM2 restart só após deploy fixes |

---

## Documentação de evidência

| Documento | Conteúdo |
|-----------|----------|
| `STABILIZATION_AUDIT_001.md` | Relatório principal |
| `FUNCTIONAL_REGRESSION_MATRIX.md` | 20 regressões avaliadas |
| `UX_REGRESSION_MATRIX.md` | 20 achados UX |
| `BUTTON_INVENTORY.md` | Inventário completo botões |
| `PERFORMANCE_BASELINE_2026.md` | Métricas runtime |
| `PENDING_FIXES_ROADMAP.md` | Este documento |

---

## READY_FOR_FIX_PHASE

```
READY_FOR_FIX_PHASE = YES

Condições satisfeitas:
✅ Auditoria completa dos 38 módulos administrativos
✅ Regressões conhecidas re-validadas (9/12 PASS confirmados)
✅ Inventário de botões produzido
✅ Baseline de performance registada
✅ Matriz consolidada P0–P3 gerada
✅ Nenhum artefato forense modificado
✅ Cadeia de custódia intacta
```

**Próximo passo recomendado:** **FIX-008** (chat-module fonte Inter — DS); **FIX-011** permanece em espera explícita.

---

*Roadmap gerado em modo read-only — 2026-07-13*
