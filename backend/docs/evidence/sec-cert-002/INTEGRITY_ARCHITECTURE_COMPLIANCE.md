# INTEGRITY_ARCHITECTURE_COMPLIANCE.md
## SEC-CERT-002 — Conformidade Arquitectural

**Fase:** SEC-CERT-002  
**Data:** 2026-07-23  
**Modo:** READ-ONLY (sem alteração de código)

---

## 1. Documentos de Referência (GAP-INT-01-ARCH)

| Documento | Presente |
|---|---|
| GAP_INT_01_ARCHITECTURE.md | ✅ |
| INTEGRITY_SENSOR_REFERENCE.md | ✅ |
| INTEGRITY_EVENT_MODEL.md | ✅ |
| INTEGRITY_TELEMETRY_ARCHITECTURE.md | ✅ |
| INTEGRITY_IMPLEMENTATION_ROADMAP.md | ✅ |

---

## 2. Cadeia de Implementação vs Arquitectura

| Fase | Objectivo arquitectural | Evidência | Aderência |
|---|---|---|---|
| INT-01A | Baseline criptográfico + inventário | `docs/evidence/int-01a/` (6 docs) | ✅ |
| INT-01B | Motor isolado Shadow Mode | `services/integrity/*` + int-01b | ✅ |
| INT-01C | Telemetria interna (state/events) | StateStore + Metrics + int-01c | ✅ |
| INT-01D | Consumo desacoplado no Centro de Comando | getIntegrityState + Intelligence | ✅ |
| SEC-OBS-002 | Validação operacional | sec-obs-002 | ✅ |
| SEC-COVERAGE-002 | Cobertura CRITICAL/HIGH | sec-coverage-002 | ✅ |

---

## 3. Componentes Canónicos

| Componente | Presente |
|---|---|
| IntegrityBaselineManager | ✅ |
| IntegrityHashChecker | ✅ |
| IntegrityPermChecker | ✅ |
| IntegrityAuditdBridge | ✅ |
| IntegrityEventBus | ✅ |
| IntegrityCorrelationEngine | ✅ |
| IntegrityEngine | ✅ |
| IntegrityRuntime | ✅ |
| IntegrityStateStore | ✅ |
| IntegrityMetricsCollector | ✅ |

Hook `server.js` (INT-01B): flag-gated `IntegrityRuntime.init()` — documentado no roadmap.

---

## 4. Desacoplamento Geração / Apresentação

| Verificação | Resultado |
|---|---|
| Dashboard expõe `getIntegrityState()` | ✅ |
| Payload inclui `integrity_state` | ✅ |
| Dashboard **não** importa HashChecker | ✅ |
| Dashboard **não** usa `createHash` | ✅ |
| Intelligence lê `IntegrityStateStore` | ✅ |
| Intelligence mantém fallback fail2ban | ✅ |

**Conclusão:** Sem desvios arquitecturais materiais. Princípio geração ≠ apresentação preservado.

**ARCHITECTURE_COMPLIANT = TRUE**
