# ADR-ECO-005 — Legacy Adapter Retirement

**Status:** Aceite (contrato ECO-02)  
**Data:** 2026-07-02  
**Fase de implementação:** ECO-08  
**Relacionado:** PROMOTION-02, NC-INT-007, ADR-ECO-001–004

---

## Motivação

Durante a convergência, adapters e paths legacy (shadow fallbacks, `runLegacyDistribution`, governança interna Pulse, catch blocks que contornam EG) permanecem activos para rollback. ECO-08 certifica o ecossistema convergido e **aposenta** código legacy que duplica o contrato arquitectural, sem alterar Event Governance v1.

---

## Arquitetura atual

| Legacy | Localização | Motivo existência |
|--------|-------------|-------------------|
| Shadow fallback adapters | 11 `governanceAdapters/*.js` | PROMOTION domínios OFF |
| `runLegacyDistribution` | esg/sst services | Flag domínio shadow |
| Catch notify bypass | executiveMode, operationalAlerts | Resiliência pré-ECO-03 |
| GOVERNANCE interno Pulse | `pulseCognitive/constants.js` | Pré-ECO-05 |
| `decide` autoridade | unifiedDecisionEngine | Pré-ECO-04 |
| Agregação dashboard legacy | executiveDashboard, Z.27 | Pré-ECO-07 |

---

## Arquitetura futura

```text
Único path notificação: Producer → EG → Executor → unifiedMessaging
Único path decisão cognitiva: EG → Controller Consumer → Council (se allow)
Único path métricas executivas: Executive Insights API → Dashboards
Único path contexto institucional: Knowledge Base API → Conversation Context
Pulse: ingestão industrial + consumer EG (sem GOVERNANCE interno)
```

Código legacy removido ou inacessível (dead code eliminado; flags legacy removidas do `.env` template).

---

## Impacto

| Área | Impacto |
|------|---------|
| `governanceAdapters/*` catch legacy | Removidos após domínios ON |
| Bypass paths ECO-03 | Código morto eliminado |
| Feature flags ECO_* | Consolidadas; defaults ON |
| `.env` enterprise template | Flags shadow domínio removidas |
| Documentação | ECO-08 certification report |

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Remoção prematura | Só após 100% critérios ECO-03–07 |
| Rollback impossível | Tag git + backup `.env` pré-ECO-08 |
| Regressão domínio shadow | Checklist por domínio antes de retirement |

---

## Estratégia de migração

1. **Pré-requisito:** ECO-03, ECO-04, ECO-05, ECO-06, ECO-07 certificados.
2. **Inventário legacy:** diff código vs contrato ECO-02.
3. **Domínio-a-domínio:** activar flags domínio EG (NC-INT-007); remover fallback.
4. **Código:** PR dedicado "legacy retirement" — sem alterar EG core.
5. **Certificação:** `ECO_08_ECOSYSTEM_CERTIFICATION.md` + teste audit.

**Estratégia:** Retirement (código) + Replacement (flags).

**Rollback:** Restaurar tag pré-ECO-08 + flags shadow (máx. 30 dias janela).

---

## Critérios de retirement (todos obrigatórios)

- [ ] Zero bypass P0/P1 em produção (evidência ECO-03)
- [ ] Controller 100% consumer (evidência ECO-04)
- [ ] Pulse sem GOVERNANCE interno activo (evidência ECO-05)
- [ ] Conversation Context com KB enrich ON (evidência ECO-06)
- [ ] Dashboards Executive Insights only (evidência ECO-07)
- [ ] 30 dias sem NC crítica aberta

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| Manter legacy indefinidamente | Duplicação permanente; NCs nunca fecham |
| Big-bang removal ECO-03 | Sem rollback; alto risco |
| Alterar EG para absorver legacy | Viola infraestrutura congelada |

---

## Referências

- [`ECO_02_MIGRATION_PLAN.md`](../ECO_02_MIGRATION_PLAN.md)
- [`PROMOTION_02_ACTIVATION_REPORT.md`](../PROMOTION_02_ACTIVATION_REPORT.md)
- [`EVENT_GOVERNANCE_CERTIFICATION_V1.md`](../EVENT_GOVERNANCE_CERTIFICATION_V1.md)
