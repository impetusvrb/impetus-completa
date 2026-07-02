# Volume X — Roadmap Enterprise
## ICEB v1.0 · Estado alvo pós-Constituição

---

## 1. Visão

Transformar o IMPETUS de **plataforma cognitiva fragmentada** (~38% maturidade Gêmeo Digital Cognitivo) em **referência enterprise** com:

- Constituição ICEB mantida e verificada
- Twin organizacional + industrial **unificado** e honesto na UI
- Telemetria industrial ON em piloto → produção
- World model mínimo viável
- Zero ambiguidade cargo → menu → dashboard → IA

---

## 2. Fases

### Fase 0 — Consolidação documental (paralelo CERT)
**Duração:** 10–14 semanas · **Este blueprint**

- [x] Volume 0 Carta Magna
- [x] Templates + inventário
- [ ] Volumes I–IX completos
- [ ] Scripts audit doc ↔ código

### Fase 1 — FIX pós-freeze (sem FEAT)
**Duração:** 4–6 semanas

| Item | Tipo | Referência auditoria | Estado |
|------|------|----------------------|--------|
| Governança terminal única | FIX | Menu desorientado | **AB** — deploy 2026-06-29 |
| Ecossistema cognitivo universal | FIX | Só CentroComando | **AB** — Layout + dashboards |
| Audiência cognitiva por cargo | FIX | Joyce como executivo | **AB** — cognitiveAudienceResolver |
| Base Estrutural Joyce + conta duplicada CEO | OPS | Cadastro incompleto | **AB** — 2026-06-29 |
| Rota `/dashboard/industrial/machines` | FIX | Widget Mapa Industrial | **AB** — 2026-06-29 |
| Montar `digitalTwinApplied` em manutencao-ia | FIX | Twin applied desligado | **AB** — `/digital-twin/*` |
| UI consome `digital-twin/state` | FIX | Layout planta | pendente |
| Rotular enrich seeded em prod | CERT | Ecossistema vivo | pendente |

### Fase 2 — Modelo vivo piloto
**Duração:** 8–12 semanas

- Activar outbox / MQTT ou edge (1 tenant)
- Popular Base Estrutural (linhas, máquinas, ativos)
- PLC real → mapa fábrica autoritativo
- Remover setores fictícios do twin org quando BD vazia

### Fase 3 — World model MVP
**Duração:** 12–16 semanas

- Grafo entidade-estado-evento scoped por `company_id`
- API `GET /api/cognitive/world-state` (proposta **N**)
- Query: "o que está parado / em risco / activo"

### Fase 4 — Gêmeo Digital Cognitivo
**Duração:** 16–24 semanas

- Fusão pulse + twin industrial + simulação
- RTSP → CV → estado máquina
- Simulação what-if ligada ao layout

---

## 3. Critérios de "nunca mais remodelar"

1. **ICEB** é alterado a cada release — não o código sem doc
2. **FUNCTIONAL_MATRIX** verde para rotas críticas
3. **Um** pipeline de `visible_modules` (governança terminal)
4. **Um** contrato twin (org vs industrial explícito)
5. Feature flags industrial **documentadas** no Vol. IV

---

## 4. Métricas de maturidade alvo

| Capacidade | Hoje (auditoria) | Alvo Fase 4 |
|------------|------------------|-------------|
| Gêmeo Digital Cognitivo | ~38% | ≥85% |
| Telas VERDE CERT | majoritariamente NAO_VALIDADO | ≥80% críticas |
| Motores T1 com ficha ICEB | ~10% | 100% T1 |
| Telemetria real em tenant piloto | OFF | ON |

---

## 5. Riscos

| Risco | Mitigação |
|-------|-----------|
| Proliferação runtime-z sem doc | Vol. IV + congelamento FEAT |
| UI "consciente" sem dados | Rotular AB seeded vs telemetria |
| Cargos mal cadastrados | Vol. III + validação onboarding |
| Escopo 180 páginas infinito | Tiers + templates + geração automática Vol. VIII |

---

## 6. Programa ECO — Convergência Cognitiva (pós Event Governance v1)

> **Baseline:** Event Governance v1 certificado · Grupo A ONLINE · Contrato ECO-02 (2026-07-02)

Event Governance deixa de ser foco de produto e passa a **infraestrutura** sobre a qual o ecossistema converge.

| Fase | Objectivo | Status |
|------|-----------|--------|
| ECO-01 | Inventário bypasses e fluxos paralelos | ✅ Concluído |
| ECO-02 | Contrato arquitectural + ADRs | ✅ Certificado |
| ECO-03 | Eliminar bypasses P0/P1 | ✅ Certificado com ressalvas (shadow) |
| ECO-04 | Controller consumer (ADR-ECO-001) | ⏳ Próxima |
| ECO-05 | Pulse consumer (ADR-ECO-002) | 🔒 |
| ECO-06 | KB + Conversation Context (ADR-ECO-004) | 🔒 |
| ECO-07 | Executive dashboards (ADR-ECO-003) | 🔒 |
| ECO-08 | Certificação ecossistema (ADR-ECO-005) | 🔒 |

Documentação: [`backend/docs/ECO_02_CONVERGENCE_ARCHITECTURE.md`](../../ECO_02_CONVERGENCE_ARCHITECTURE.md) · [`ECO_02_EXECUTION_SEQUENCE.md`](../../ECO_02_EXECUTION_SEQUENCE.md)

**Regra:** P0/P1 (bypasses) antes de Controller, Pulse ou Backbone.

---

*Volume X · v1.1 · 2026-07-02*
