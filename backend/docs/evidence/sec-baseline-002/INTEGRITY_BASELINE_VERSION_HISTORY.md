# INTEGRITY_BASELINE_VERSION_HISTORY

**Emitido em:** 2026-07-23 16:01 UTC  
**Fase de origem:** SEC-BASELINE-002  

---

## Tabela de Versões

| Versão | Baseline ID | Data | Fase | Status | SHA-256 |
|---|---|---|---|---|---|
| 1.0 | IMPETUS-INTEGRITY-BASELINE-v1 | 2026-07-18 | INT-01A | Archived (preserved) | `6cb5ac487158cdb462a4…` |
| 2.0 | IMPETUS-INTEGRITY-BASELINE-v2 | 2026-07-23 | SEC-BASELINE-002 | Active | `f9ca52c1c1461b5be4f7…` |

---

## Detalhe por Versão

### Versão 1.0 — INT-01A (Archived)

| Campo | Valor |
|---|---|
| Baseline ID | IMPETUS-INTEGRITY-BASELINE-v1 |
| Gerado em | INT-01A — Baseline Criptográfico |
| Data | 2026-07-18 |
| Activos cobertos | 35 |
| SHA-256 completo | `6cb5ac487158cdb462a4b01b2b7f25290eaa05a4b9b4425619619e4301760bf6` |
| Ficheiro preservado | `backend/security/integrity/baseline-int-01a.json` |
| Status | ARCHIVED — imutável, preservação forense permanente |
| Nota | Baseline de referência pré-implementação do motor. Representa o estado da plataforma antes de qualquer componente de integridade ser activado. |

### Versão 2.0 — SEC-BASELINE-002 (Active)

| Campo | Valor |
|---|---|
| Baseline ID | IMPETUS-INTEGRITY-BASELINE-v2 |
| Gerado em | SEC-BASELINE-002 — Consolidação Oficial |
| Data | 2026-07-23 |
| Activos cobertos | 35 |
| SHA-256 completo | `f9ca52c1c1461b5be4f748f8bee444906d826c73332891b77976736ac1495818` |
| Ficheiro activo | `backend/security/integrity/baseline.json` |
| Status | ACTIVE — baseline oficial da plataforma |
| Certificação | CERTIFIED_WITH_LIMITATIONS (SEC-CERT-002) |
| Activos actualizados | 4 (INT-C-001, INT-C-002, INT-H-001, INT-H-002) |
| Activos inalterados | 31 |
| Divergências inesperadas | 0 |

---

## Drifts Incorporados (v1 → v2)

| Asset ID | Criticidade | Componente | Fase | Justificação |
|---|---|---|---|---|
| INT-C-001 | CRITICAL | `backend/src/server.js` | INT-01B | Adição do hook de inicialização `IntegrityRuntime` (+7 linhas) |
| INT-C-002 | CRITICAL | `backend/.env` | SEC-OBS-002 | Adição do bloco de variáveis INTEGRITY (`INTEGRITY_SENSOR_ENABLED=true`, etc.) |
| INT-H-001 | HIGH | `backend/src/services/adminPortalSecurityDashboardService.js` | INT-01D | Adição de `getIntegrityState()`, `getIntegrityObservability()` e payload `integrity_state` |
| INT-H-002 | HIGH | `backend/src/services/adminPortalSecurityIntelligenceService.js` | INT-01D | Evolução do `case 'INTEGRITY'` com consumo do `IntegrityStateStore` |

---

## Regras de Versionamento

1. Nenhum baseline anterior é sobrescrito ou eliminado.
2. Qualquer versão arquivada é imutável após criação.
3. Nova versão requer ciclo completo: OBS → COVERAGE → CERT → BASELINE.
4. O ficheiro `baseline-int-01a.json` representa o estado antes da implementação do motor e serve como âncora forense permanente.
5. Hashes SHA-256 dos ficheiros de baseline são registados neste documento como cadeia de custódia.

---

## Cadeia de Custódia

| Ficheiro | SHA-256 | Status |
|---|---|---|
| `baseline-int-01a.json` | `6cb5ac487158cdb462a4b01b2b7f25290eaa05a4b9b4425619619e4301760bf6` | Archived — imutável |
| `baseline.json` (v2) | `f9ca52c1c1461b5be4f748f8bee444906d826c73332891b77976736ac1495818` | Active |
| `asset_inventory.json` | `fd8fc113754026658064dc05bd9c9039b1c2ed49f14bd1ac238253bdf4e7dabb` | Inalterado desde INT-01A |
