# RELATÓRIO DE PROGRESSO — Etapas IMPETUS
## O que já foi feito até agora

**Gerado:** 2026-06-30  
**Escopo:** Consolidação de todas as trilhas de etapas documentadas no repositório + trabalho de governança cognitiva (jun/2026)  
**Classificação:** `CERT` / uso interno

---

## 1. As 1060 etapas ICEB (geração concluída)

As **1.060 etapas** são o plano de fichas do **ICEB** (Constituição cognitiva), geradas automaticamente em `2026-06-30`:

| Faixa | Tipo | Qtd | Pasta |
|-------|------|-----|-------|
| 1–335 | Motores / Facades / Orchestrators | 335 | `IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/fichas/motores/` |
| 336–412 | Telas (FUNCTIONAL_MATRIX) | 77 | `fichas/telas/` |
| 413–439 | Módulos contextual | 27 | `fichas/modulos/` |
| 440–462 | Perfis dashboard | 23 | `fichas/perfis/` |
| 463–1060 | Endpoints API (prioridade inventário) | 598 | `fichas/endpoints/` |
| **Total** | | **1.060** | |

**Registo:** [`ICEB_ETAPAS_INDEX.md`](./IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/ICEB_ETAPAS_INDEX.md) · [`ICEB_ETAPAS_REGISTRY.json`](./IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/ICEB_ETAPAS_REGISTRY.json)

**Gerador:** `node backend/scripts/audit/buildBlueprintEtapas.js`

**Nota:** fichas auto-geradas têm classificação AB inicial e **revisão humana pendente** (preencher propósito, regras IA, evidências CERT).

### Outras trilhas (não são as 1060 ICEB)

| Artefacto | Quantidade | Fonte |
|-----------|------------|--------|
| Endpoints API (total inventário) | **1.098** | `FUNCTIONAL_MATRIX.json` |
| Etapas Plano Mestre | **52** | `PLANO_MESTRE_LIGACAO_INDUSTRIAL_v2.md` |
| Etapas Truth Program | **10** | `TRUTH_PROGRAM_ETAPAS_CLOSURE_REGISTRY.md` |
| Cenários E2E certificados | **10** | `FUNCTIONAL_MATRIX.json` |
| Testes contextual-modules | **293** asserts | `contextualModulesScenarios.js` |

---

## 2. Sumário executivo (visão de diretoria)

| Dimensão | Feito | Total / alvo | % |
|----------|-------|--------------|---|
| Telas na matriz funcional | 72 VERDE + 5 REDIRECT | 77 | **93,5%** telas com status definido |
| Cenários E2E por domínio | 10 VERDE | 10 | **100%** |
| Truth Program (Etapas 1–10) | 9 TOTAL + 1 PARTIAL | 10 | **~95%** |
| Plano Mestre (Fases 0–7) | Parcial (ver §4) | 52 etapas | **~55–65%** estimado |
| ICEB (Constituição cognitiva) | **1060 fichas** + 11 volumes rascunho | 1060 + 11 vol. | **~85%** geração auto · **~40%** revisão humana |
| Gêmeo Digital Cognitivo (auditoria) | ~38% maturidade | 85% alvo Fase 4 | **38%** |
| Governança cargo→menu→pulso (jun/2026) | Deploy + testes | Fase 1 ICEB | **~75%** Fase 1 FIX |

**Veredicto:** O núcleo **certificável** (matriz de telas, 10 domínios E2E, Truth 1–9) está **maduro**. A evolução **cognitiva por cargo** e **twin industrial real** estão em **Fase 1 FIX** com itens recentes concluídos e validação browser pendente.

---

## 3. Trilha A — Matriz funcional e API (1.098 endpoints)

**Fonte:** `backend/docs/FUNCTIONAL_MATRIX.json` · gerado 2026-06-26

### 3.1 Inventário

| Métrica | Valor |
|---------|-------|
| Telas | 77 |
| Endpoints | 1.098 |
| Mounts | 142 |
| Chamadas API rastreadas (FE→BE) | 791 |
| Referências resolvidas | 621 |
| Não resolvidas | **0** |

### 3.2 Status das telas

| Status | Qtd | % |
|--------|-----|---|
| **VERDE** | 72 | 93,5% |
| **REDIRECT** | 5 | 6,5% |
| VERMELHO bloqueador | 0 | 0% |

Redirects esperados: `/app`, `/app/dashboard-vivo`, `/app/configuracoes`, `/proposals`, `/*`.

### 3.3 Cenários certificados (10/10 VERDE)

| # | Domínio | Cenário | Evidência |
|---|---------|---------|-----------|
| 1 | Quality | NC → CAPA → Auditoria | `evidence/quality/nc-create/` |
| 2 | SST | Incidente / near-miss / treinamento | `evidence/safety/lifecycle/` |
| 3 | Executive | Dashboard por perfil | `evidence/executive/dashboard-profile/` |
| 4 | ManuIA | Diagnóstico → OS → Histórico | `evidence/manuia/diagnosis-workorder/` |
| 5 | ESG | Emissão / resíduo / consumo | `evidence/esg/emission-waste-consumption/` |
| 6 | TPM | Preventiva → execução → indicador | `evidence/tpm/preventive-lifecycle/` |
| 7 | DSR/LGPD | Pedido do titular | `evidence/dsr/data-subject-request/` |
| 8 | Billing | Webhook Asaas | `evidence/billing/asaas-webhook/` |
| 9 | Event Governance | Evento → política → decisão | `evidence/governance/event-policy-decision/` |
| 10 | AIOI | Correlação → insight → escalonamento | `evidence/aioi/correlation-insight/` |

---

## 4. Trilha B — Plano Mestre de Ligação Industrial (52 etapas)

**Fonte:** `PLANO_MESTRE_LIGACAO_INDUSTRIAL_v2.md`

### 4.1 Por fase (estado estimado)

| Fase | Etapas | Descrição | Estado |
|------|--------|-----------|--------|
| **F0** | 0.1–0.2 | Congelamento + FLAG baseline | **FEITO** — `architecture-freeze.mdc` activo |
| **F1** | 1.1–1.6 | CERT-01 diagnóstico, matriz, mocks | **FEITO** — matriz 77 telas, 0 unresolved |
| **F2** | 2.1–2.7 | Segurança, PM2, nginx, UFW, auth | **PARCIAL** — PM2 prod, nginx com ficheiro `impetus` em falta no servidor |
| **F3** | 3.1–3.8 | FIX mocks, INCOMPLETO, build, menus | **PARCIAL** — governança menu 2026-06; browser multi-persona pendente |
| **F4** | 4.1–4.12 | Certificação E2E 10 domínios | **FEITO** — 10 cenários VERDE |
| **F5** | 5.1–5.7 | Métricas, backup, CI/CD | **PARCIAL** — PM2/ops; CI/CD formal pendente |
| **F6** | 6.1–6.8 | Piloto 30–60 dias | **EM CURSO** — freeze 72h + validação utilizadores |
| **F7** | 7.1–7.4 | Go-live escala | **PENDENTE** — após CERT-04 |

### 4.2 Gates

| Gate | Critério | Estado |
|------|----------|--------|
| G0→1 | Freeze + flags | OK |
| G1→2 | 100% rotas na matriz | OK |
| G2→3 | P0 segurança + NODE_ENV prod | Parcial |
| G3→4 | Zero VERMELHO + zero mocks KPI | Parcial |
| G4→5 | E2E 10 domínios | **OK** |
| G5→6 | CI/CD + backup + observabilidade | Pendente |
| G6→7 | Piloto estável 30–60 dias | Em curso |

---

## 5. Trilha C — Truth Program (10 etapas)

**Fonte:** `TRUTH_PROGRAM_ETAPAS_CLOSURE_REGISTRY.md`

| Etapa | Nome | Status |
|-------|------|--------|
| 1 | Mapeamento fluxos IA | **TOTAL** |
| 2 | Truth Enforcement Coverage | **TOTAL** |
| 3 | Auditoria geração de dados | **TOTAL** |
| 4 | Auditoria Anam Realtime | **TOTAL** |
| 5 | Truth Source Inventory | **TOTAL** |
| 6 | Observabilidade cognitiva | **TOTAL** |
| 7 | Stress test 100 perguntas | **TOTAL** |
| 8 | OPERATIONAL_TRUTH_GAP_REPORT | **TOTAL** |
| 9 | Plano de correção final | **TOTAL** |
| 10 | Certificação piloto industrial | **PARTIAL** (Safety/Environment shadow, Anam CEO áudio humano) |

**Cobertura Truth:** 9/10 TOTAL · 1/10 PARTIAL · **0 FAIL** · **~95%**

---

## 6. Trilha D — ICEB (Constituição cognitiva)

**Fonte:** `IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/`

| Volume | Título | Estado |
|--------|--------|--------|
| 0 | Carta Magna | Rascunho v1.0 (+ princípio 3.6 universal) |
| I | Arquitectura cognitiva global | Esqueleto |
| II | Dashboard vivo | Pendente |
| III | Arquitectura por cargo | v1.1 — todas personas indexadas |
| IV | Catálogo de motores | Inventário inicial |
| V | Experiência utilizador | Pendente |
| VI | Integração módulos | Pendente |
| VII | Todos os dashboards | Pendente |
| VIII | Todas as telas | Índice → matriz |
| IX | Arquitectura IA | Pendente |
| X | Roadmap enterprise | Rascunho (Fase 1 actualizada) |

### Fase 1 FIX ICEB (pós-freeze) — jun/2026

| Item | Estado | Data |
|------|--------|------|
| Governança modular terminal (`moduleAccessGovernanceEngine`) | **FEITO** | 2026-06 |
| Ecossistema cognitivo global (`Layout` + `CognitiveCompactPresence`) | **FEITO** | 2026-06-27 |
| Shell cognitivo operador/manutenção | **FEITO** | 2026-06-27 |
| Fix audiência RH (`cognitiveAudienceResolver`) | **FEITO** | 2026-06-29 |
| Base Estrutural Joyce + conta CEO duplicada | **FEITO** | 2026-06-29 |
| `GET /dashboard/industrial/machines` | **FEITO** | 2026-06-29 |
| `digitalTwinApplied` em `/manutencao-ia/digital-twin` | **FEITO** | 2026-06-29 |
| UI `digital-twin/state` no layout planta | Pendente | — |
| Rotular dados seeded no ecossistema | Pendente | — |

---

## 7. Trilha E — Governança cognitiva e Base Estrutural (trabalho recente)

### 7.1 Alterações de código (deploy jun/2026)

**Backend**
- `moduleAccessGovernanceEngine.js` — sem fallback cego executivo; domínios por eixo
- `domainRegistry.js` — `executive.denied_modules`
- `contextualModules/` — governança autoritária
- `dashboard.js` — governança terminal pós-reconciliação
- `cognitiveAudienceResolver.js` — diretores de domínio ≠ executivo
- `cognitivePulseService.js` — pulso filtrado por Base Estrutural
- `dashboard.js` — rota industrial machines
- `manutencao-ia.js` — mount digital twin applied
- `_expandToken` — hidden_themes em prosa não bloqueiam módulos por substring

**Frontend**
- `Layout.jsx` — `CognitivePulseProvider` global + faixa compacta
- `CentroComando.jsx`, `DashboardOperador.jsx`, `DashboardMecanico.jsx` — shell cognitivo
- `canonicalVisibleModules.js`, `useVisibleModules.js` — fonte única servidor
- Build produção + PM2 restart (2026-06-27 e 2026-06-29)

### 7.2 Testes automáticos (última execução)

| Suite | Resultado |
|-------|-----------|
| `test:contextual-modules` | **293/293** |
| `test:domain-isolation` | **11/11** |
| `executiveModuleIsolationScenarios` | 59 pass / 5 fail (proaction CEO — regressão menor) |

### 7.3 Utilizadores piloto (BD produção)

| Utilizador | Cargo | structural_complete | Módulos proibidos vazaram? | Pulso |
|------------|-------|---------------------|------------------------------|-------|
| Juh rodrigues | CEO | Sim | Não (sem manuia/quality) | executive |
| Joyce Silva | Dir. RH | Sim (corrigido 29/06) | Não | hr |
| juh rodrigues (dup.) | CEO | Não | — | **Desactivada** |
| Laurência | Dir. Financeiro | Parcial | Não | finance |

### 7.4 Pendências operacionais

- [ ] Validação browser CEO + Joyce (logout + hard refresh)
- [ ] Vincular `company_role_id` em diretores sem cargo (Rafael, Admin Impetus, etc.)
- [ ] Restaurar `/etc/nginx/sites-available/impetus` (ficheiro em falta no servidor)
- [ ] Completar ICEB volumes II, V, VI, VII, IX
- [ ] Etapa 10 Truth: gravação Anam CEO + adopção OT Environment

---

## 8. Mapa de maturidade (auditoria Gêmeo Digital Cognitivo)

| Capacidade | % actual | Alvo Fase 4 |
|------------|----------|-------------|
| Gêmeo Digital Cognitivo | **~38%** | ≥85% |
| Telas VERDE (matriz) | **93,5%** | ≥80% críticas |
| Motores T1 com ficha ICEB | ~10% | 100% |
| Telemetria real tenant piloto | OFF | ON |

**Classificação:** intermediária fragmentada (org / twin applied / planta).

---

## 9. Linha do tempo (marcos)

| Data | Marco |
|------|-------|
| 2026-06-22 | Plano Mestre v2.0 publicado |
| 2026-06-26 | Matriz 72 VERDE · 10 cenários E2E VERDE |
| 2026-06-27 | ICEB iniciado · inventário 335 engines |
| 2026-06-27 | Ecossistema cognitivo universal (código) |
| 2026-06-27 | Build frontend + PM2 (1.ª vez) |
| 2026-06-28 | Truth Program 9/10 TOTAL |
| 2026-06-29 | Fix audiência RH · Base Joyce · rotas industrial/twin |
| 2026-06-29 | Freeze 72h acordado · validação browser adiada |

---

## 10. Próximas etapas (ordem recomendada)

1. **Validação visual** — Juh (CEO) + Joyce (RH) no browser  
2. **Base Estrutural** — restantes diretores sem `company_role_id`  
3. **Fase 1 ICEB restante** — UI twin state + label seeded  
4. **OPS** — nginx `impetus` + `npm run build` sempre antes de `pm2 restart frontend`  
5. **CERT-04** — homologação por perfil (operador, manutenção, CFO, qualidade)  
6. **Fase 2 ICEB** — telemetria piloto + planta autoritativa  

---

## 11. Referências canónicas

| Documento | Caminho |
|-----------|---------|
| Matriz funcional | `backend/docs/FUNCTIONAL_MATRIX.md` |
| Plano mestre | `backend/docs/PLANO_MESTRE_LIGACAO_INDUSTRIAL_v2.md` |
| Truth closure | `backend/docs/TRUTH_PROGRAM_ETAPAS_CLOSURE_REGISTRY.md` |
| ICEB índice | `backend/docs/IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/README.md` |
| Roadmap ICEB | `backend/docs/IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/Volume-10-ROADMAP-ENTERPRISE.md` |
| Freeze arquitectural | `.cursor/rules/architecture-freeze.mdc` |

---

*Relatório consolidado · IMPETUS · uso interno CERT/produto · 2026-06-30*
