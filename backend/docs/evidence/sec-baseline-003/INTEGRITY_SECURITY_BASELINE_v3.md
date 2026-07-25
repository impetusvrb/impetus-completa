# INTEGRITY_SECURITY_BASELINE_v3

**Emitido em:** 2026-07-23 21:11 UTC  
**Fase:** SEC-BASELINE-003  
**Baseline ID:** IMPETUS-INTEGRITY-BASELINE-v3  
**Versão:** 3.0  
**Status da camada INTEGRITY:** **CERTIFIED**

---

## 1. Mudança de Estado Oficial

| Campo | Baseline v2.0 | Baseline v3.0 |
|---|---|---|
| Baseline ID | IMPETUS-INTEGRITY-BASELINE-v2 | IMPETUS-INTEGRITY-BASELINE-v3 |
| Status INTEGRITY | CERTIFIED_WITH_LIMITATIONS | **CERTIFIED** |
| Certificação | SEC-CERT-002 | SEC-CERT-003 |
| Vigência | 2026-07-23 (ciclo 1) | 2026-07-23 (ciclo 2) |

Esta alteração marca a transição formal da camada INTEGRITY de componente com limitações operacionais aceites para **capacidade certificada** do IMPETUS.

---

## 2. Conteúdo Consolidado

### Drift legítimo incorporado (v2 → v3)

| Asset | Razão | Fase |
|---|---|---|
| INT-C-010 | Regras auditd activas em `/etc/audit/rules.d/impetus.rules` | INT-LIM-001 |
| INT-M-003 | Fonte `impetus-audit.rules` actualizada | INT-LIM-001 |

Divergências inesperadas: **0**.  
Activos inalterados vs v2: **33**.

### Higiene administrativa

| Item | Acção |
|---|---|
| INT-M-004 | `expected_owner`/`expected_group` populados (RISK-INV-001) |

### Fases reflectidas no estado CERTIFIED

INT-LIM-001, INT-LIM-002, INT-LIM-003, INT-DEDUP-001, SEC-OBS-003R, SEC-COVERAGE-003, SEC-CERT-003.

---

## 3. Âncoras Criptográficas

| Versão | Ficheiro | SHA-256 | Status |
|---|---|---|---|
| 1.0 | `baseline-int-01a.json` | `6cb5ac487158cdb462a4b01b2b7f25290eaa05a4b9b4425619619e4301760bf6` | ARCHIVED |
| 2.0 | `baseline-v2.json` | `f9ca52c1c1461b5be4f748f8bee444906d826c73332891b77976736ac1495818` | ARCHIVED |
| **3.0** | `baseline.json` | `b7e6edb61d7cd1d2f48dd9d471a5df12b155a49431f005d4c6f93297f9174dcc` | **ACTIVE** |
| — | `asset_inventory.json` | `4face35e25d50ba9e74f737cf8a5c586d0c78ed720f0d470836b4a26a6626dd7` | Actualizado |

---

## 4. Limitações

| ID | Estado |
|---|---|
| LIM-001 | CLOSED |
| LIM-002 | CLOSED |
| LIM-003 | CLOSED |
| OBS-003-F1 | CLOSED |
| LIM-004 | **SCOPE_BOUNDARY** (fronteira formal de escopo) |

---

## 5. Versão Oficial

> **IMPETUS Security Baseline — Camada INTEGRITY v3.0**  
> Status: **CERTIFIED**  
> Ficheiro activo: `backend/security/integrity/baseline.json`
