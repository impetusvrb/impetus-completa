# SEC-04 Recertification Report

**Atividade:** ENT-GOV-003 — Certified Baseline Materialization & Validation  
**Data de execução:** 2026-07-29T22:34:03Z  
**Baseline utilizada:** CERTIFIED-BASELINE-002  
**Commit da baseline:** `9c397cc8109912ef099c35beceafd8fcb4a0c7bb`  
**Tag:** `CERTIFIED-BASELINE-002`

---

## Resultado

| Teste | Descrição | Resultado |
|---|---|---|
| 01 | módulo securityRuntimeIntegrity exporta API | ✅ |
| 02 | feature flag default false sem env | ✅ |
| 03 | Runtime Integrity DTO schema v1 | ✅ |
| 04 | baseline loader carrega SECURITY-BASELINE-02 | ✅ |
| 05 | baseline íntegra (hashes mock conformes) | ✅ |
| 06 | hash alterado detectado | ✅ |
| 07 | arquivo apagado detectado | ✅ |
| 08 | processo reiniciado (restart drift) | ✅ |
| 09 | porta inesperada detectada | ✅ |
| 10 | configuração modificada (LISTEN_HOST) | ✅ |
| 11 | Nginx alterado detectado | ✅ |
| 12 | PM2 script alterado | ✅ |
| 13 | integrity score determinístico | ✅ |
| 14 | dashboard DTO schema v1 | ✅ |
| 15 | audit payload SEC-04 criteria | ✅ |
| 16 | métricas integrity_checks incrementam | ✅ |
| 17 | endpoint registado em audit.js | ✅ |
| 18 | SEC-03 preservado | ✅ |
| 19 | flag off → runIntegrityCheck null | ✅ |
| 20 | documentação SEC_04 presente | ✅ |

**Score: 20/20**

---

## Baseline anterior vs. nova

| Campo | Anterior (BASELINE-001) | Nova (BASELINE-002) |
|---|---|---|
| Certification | `SECURITY-BASELINE-01` | `SECURITY-BASELINE-02` |
| Git HEAD | `daf338657ac3a…` | `0745040cb97fc…` |
| Volume-10 hash | `b7835207…c7f` (irrecuperável) | `e1cc4b14…b7cd` (preservado no commit) |
| Nginx hash | `9b2c913f…e81e9` | `1c40c785…1107` (alinhado ao deploy) |
| server.js hash | `72c227ce…` | `fa5556da…` (inclui MB-009) |

---

## Scores de integridade

| Métrica | Valor |
|---|---|
| Integrity Score | **1.0** (test 05 — hashes conformes) |
| Hash Validation | **PASSED** |
| Configuration | **OK** |
| Runtime | **OK** |
| Filesystem | **OK** |
| Network | **OK** |

---

## Comparação com situação anterior

| Situação | Antes (19/20) | Agora (20/20) |
|---|---|---|
| Test 04 | ❌ (hardcoded `SECURITY-BASELINE-01`) | ✅ (aceita BASELINE-02) |
| Test 05 | ❌ (score 0.763 — NGINX_DRIFT + BLUEPRINT_DRIFT) | ✅ (score 1.0 — manifests alinhados) |

---

## Causa-raiz resolvida

O test 05 falhava porque:
1. `critical-files.sha256.manifest` continha hash Nginx `9b2c913f…` que não correspondia ao ficheiro actual em `/etc/nginx/sites-available/impetus` (`1c40c785…`)
2. `blueprint-volumes.sha256` continha hash Volume-10 `b783…` que nunca existiu como conteúdo commitado (cadeia rompida — ENT-GOV-001C)

Após recertificação (ENT-GOV-002 → ENT-GOV-003):
- Manifests regenerados a partir do conteúdo commitado
- Hashes correspondem 1:1 aos artefactos preservados
- Cadeia de custódia restaurada sobre conteúdo verificável

---

## Conformidade com CERTIFIED-BASELINE-LIFECYCLE-POLICY

| Regra | Cumprida? |
|---|---|
| Hash ↔ blob preservado no Git | ✅ |
| Manifest gerado de `git show`, não de working tree | ✅ (15/15 git-tracked paths) |
| Sistema paths validados contra deploy actual | ✅ (Nginx + SSH) |
| Tag anotada criada | ✅ `CERTIFIED-BASELINE-002` |
| Commit identificável | ✅ `9c397cc81…` |
| Relatório de certificação produzido | ✅ (este documento) |

---

*SEC-04-RECERTIFICATION-REPORT — gerado como parte da ENT-GOV-003.*
