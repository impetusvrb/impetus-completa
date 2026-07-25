# SECURITY_OPERATIONAL_BASELINE_2026 — Baseline Oficial de Segurança Operacional IMPETUS

**Versão:** 1.0  
**Data de emissão:** 2026-07-23  
**Status:** APPROVED  
**Autoridade:** Sequência SEC-OBS-001 → SEC-COVERAGE-001 → SEC-CERT-001  
**Certificação:** APPROVED_WITH_LIMITATIONS (SEC-CERT-001)

---

## 1. Declaração de baseline

Este documento constitui o **Baseline Oficial de Segurança Operacional do IMPETUS** a partir de 2026-07-23. Toda evolução futura das camadas de proteção deve ser comparada contra este baseline e não poderá ser considerada operacional sem percorrer o fluxo de certificação definido na `SECURITY_GOVERNANCE_BASELINE.md`.

---

## 2. Histórico de certificações incorporadas

| Missão | Data | Status | Defeitos P0 corrigidos | Referência |
|---|---|---|---|---|
| SEC-OBS-001 | 2026-07-23 | PASS | 1 — RATE_LIMIT (SEM_TELEMETRIA hardcoded) | `sec-obs-001/` |
| SEC-COVERAGE-001 | 2026-07-23 | PASS | 2 — OBSERVATORY, AUDIT + 1 P1 UFW | `sec-coverage-001/` |
| SEC-CERT-001 | 2026-07-23 | APPROVED_WITH_LIMITATIONS | 0 novos (todos fechados nas missões anteriores) | `sec-cert-001/` |

**Total de defeitos P0 corrigidos ao longo do ciclo: 3**  
**Defeitos P0 abertos: 0**  
**Defeitos P1 abertos: 1 (GAP-INT-01)**

---

## 3. Estado certificado das 20 camadas

Estado baseline registado em `2026-07-23T01:11:xx.xxxZ`, origem `??` (janela activa):

| # | ID | Nome | Estado Baseline | Classificação | Confiança |
|---|---|---|---|---|---|
| 01 | NGINX | Firewall de Rede | ATUOU | CERTIFIED | ALTA |
| 02 | FAIL2BAN | Proteção Automática | OBSERVADA | CERTIFIED | ALTA |
| 03 | UFW | Firewall de Host | ATUOU | CERTIFIED | ALTA |
| 04 | CLOUDFLARE | Filtragem IP/Geoloc | OBSERVADA | CERTIFIED_WITH_LIMITATIONS | MÉDIA |
| 05 | RATE_LIMIT | Rate Limiting (Nginx) | ATUOU | CERTIFIED | ALTA |
| 06 | AUTH_GUARD | Autenticação | ATUOU | CERTIFIED | ALTA |
| 07 | BOT_DETECT | Anti-Bot Turnstile | OBSERVADA | CERTIFIED_WITH_LIMITATIONS | MÉDIA |
| 08 | RBAC | RBAC e Permissões | OBSERVADA | CERTIFIED_WITH_LIMITATIONS | MÉDIA |
| 09 | INPUT_VAL | Validação de Entradas | OBSERVADA | CERTIFIED | ALTA |
| 10 | INJECT_PROT | Proteção Injeção | OBSERVADA | CERTIFIED_WITH_LIMITATIONS | BAIXA |
| 11 | TLS | TLS 1.3 | OBSERVADA | CERTIFIED | ALTA |
| 12 | TENANT_ISO | Isolamento Tenants (RLS) | N/A | N/A (escopo) | — |
| 13 | OBSERVATORY | Monitoramento SEC-01 | ATUOU | CERTIFIED | MÉDIA |
| 14 | CORRELATION | Análise SEC-02 | OBSERVADA | CERTIFIED_WITH_LIMITATIONS | BAIXA |
| 15 | BACKUP | Backup Imutável | N/A | N/A (escopo + ADR-018) | — |
| 16 | INTEGRITY | Controlo de Integridade | OBSERVADA | CERTIFIED_WITH_LIMITATIONS | BAIXA |
| 17 | DB_PROTECT | Proteção da BD | OBSERVADA | CERTIFIED_WITH_LIMITATIONS | MÉDIA |
| 18 | AUDIT | Auditoria Imutável | ATUOU | CERTIFIED | ALTA |
| 19 | INCIDENT | Resposta Automática | ATUOU | CERTIFIED | ALTA |
| 20 | GOVERNANCE | Governança | OBSERVADA | CERTIFIED_WITH_LIMITATIONS | MÉDIA |

---

## 4. Métricas oficiais do baseline

| Métrica | Valor |
|---|---|
| Camadas certificadas (CERTIFIED) | 10 / 18 (56%) |
| Camadas certificadas com limitações | 8 / 18 (44%) |
| Camadas NOT_CERTIFIED | 0 |
| Camadas N/A (escopo) | 2 |
| Confiança ALTA | 9 camadas (50% das 18 com escopo) |
| Confiança MÉDIA | 6 camadas (33%) |
| Confiança BAIXA | 3 camadas (17%) |
| Score Phase C (weekly-sim) | 0.64 / CERTIFIED_WITH_REMARKS |
| Score Phase C esperado após GAP-INT-01 | ≥ 0.75 (estimativa) |
| Multi-source consistency | YES (7 métricas, 0 divergências) |
| Defeitos P0 abertos | 0 |
| Defeitos P1 abertos | 1 (GAP-INT-01) |

---

## 5. Componentes de código certificados

| Arquivo | Papel | Certificado em |
|---|---|---|
| `backend/src/services/adminPortalSecurityDashboardService.js` | Colecção de evidências, snapshot, infra | SEC-OBS-001, SEC-COVERAGE-001 |
| `backend/src/services/adminPortalSecurityIntelligenceService.js` | `buildProtectionLayers()`, resolução por origem | SEC-OBS-001, SEC-COVERAGE-001 |
| `backend/src/services/adminPortalSecurityEvidenceLogWindow.js` | Pipeline incremental de logs (INV-SVI) | SEC-VISUAL-INTELLIGENCE-001 (2026-07-11) |
| `backend/src/services/adminPortalSecurityPhaseBService.js` | `buildWorldMap()` | SEC-VISUAL-INTELLIGENCE-001 |
| `backend/src/services/adminPortalSecurityPhaseCService.js` | Weekly simulation, score operacional | SEC-COVERAGE-001 |
| `backend/src/services/adminPortalSecurityScoreService.js` | Score dashboard | Baseline |

---

## 6. Invariantes do baseline (não podem ser violadas)

1. **INV-BL-001** — Nenhuma camada pode regredir de CERTIFIED para NOT_CERTIFIED sem evidência de defeito documentada.
2. **INV-BL-002** — O estado ATUOU exige evidência directa; não pode ser resultado de constante ou inferência não rastreável.
3. **INV-BL-003** — Toda limitação conhecida deve estar registada em `SECURITY_LIMITATIONS_BASELINE.md` antes de ir para produção.
4. **INV-BL-004** — O fluxo OBS→COVERAGE→CERT→BASELINE é obrigatório para qualquer nova camada.
5. **INV-BL-005** — `FORENSIC_EVIDENCE_PRESERVED = TRUE` em todos os momentos; storage-remediation intocável.
6. **INV-BL-006** — Patches de telemetria/classificação não exigem re-certificação completa, mas devem ser documentados e re-testados.
7. **INV-BL-007** — O score Phase C não pode regredir abaixo de 0.60 sem investigação formal.
