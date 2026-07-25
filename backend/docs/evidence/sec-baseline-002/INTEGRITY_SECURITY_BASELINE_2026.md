# INTEGRITY_SECURITY_BASELINE_2026

**Emitido em:** 2026-07-23 16:00 UTC  
**Fase de origem:** SEC-BASELINE-002  
**Versão do baseline:** v2.0  
**Baseline ID:** IMPETUS-INTEGRITY-BASELINE-v2  
**Classificação:** CERTIFIED_WITH_LIMITATIONS  
**Fase de certificação:** SEC-CERT-002  

---

## 1. Identificação do Baseline

| Campo | Valor |
|---|---|
| Produto | IMPETUS — Design System Industrial 4.0 |
| Camada | INTEGRITY |
| Baseline ID | IMPETUS-INTEGRITY-BASELINE-v2 |
| Versão | 2.0 |
| Versão anterior | 1.0 (IMPETUS-INTEGRITY-BASELINE-v1) |
| Status | CERTIFIED_WITH_LIMITATIONS |
| Data de certificação | 2026-07-23 |
| Ciclo de origem | GAP-INT-01-ARCH → INT-01A → INT-01B → INT-01C → INT-01D → SEC-OBS-002 → SEC-COVERAGE-002 → SEC-CERT-002 → SEC-BASELINE-002 |

---

## 2. Arquitectura Aprovada

### 2.1 Princípios Arquitecturais

- **Separação geração / apresentação:** o motor gera; o Dashboard apenas consome estado pré-calculado.
- **Shadow Mode → Produção controlada:** activação gradual sem breaking change.
- **Fail-safe:** falha do sensor nunca degrada o Centro de Comando.
- **Imutabilidade do baseline:** versão anterior preservada em `baseline-int-01a.json`.

### 2.2 Componentes Certificados

| Componente | Ficheiro | Status |
|---|---|---|
| IntegrityBaselineManager | IntegrityBaselineManager.js | CERTIFICADO |
| IntegrityHashChecker | IntegrityHashChecker.js | CERTIFICADO |
| IntegrityPermChecker | IntegrityPermChecker.js | CERTIFICADO |
| IntegrityAuditdBridge | IntegrityAuditdBridge.js | CERTIFICADO |
| IntegrityEventBus | IntegrityEventBus.js | CERTIFICADO |
| IntegrityCorrelationEngine | IntegrityCorrelationEngine.js | CERTIFICADO |
| IntegrityEngine | IntegrityEngine.js | CERTIFICADO |
| IntegrityRuntime | IntegrityRuntime.js | CERTIFICADO |
| IntegrityStateStore | IntegrityStateStore.js | CERTIFICADO |
| IntegrityMetricsCollector | IntegrityMetricsCollector.js | CERTIFICADO |

### 2.3 Referências Arquitecturais

- `backend/docs/architecture/gap-int-01/INTEGRITY_ARCHITECTURE_DESIGN.md`
- `backend/docs/architecture/gap-int-01/INTEGRITY_ARCHITECTURE_TECH_SPEC.md`
- `backend/docs/architecture/gap-int-01/INTEGRITY_ARCHITECTURE_RISK_ANALYSIS.md`
- `backend/docs/architecture/gap-int-01/INTEGRITY_IMPLEMENTATION_ROADMAP.md`

---

## 3. Inventário de Activos

### 3.1 Sumário de Cobertura

| Criticidade | Activos | Cobertura Hash | Cobertura Perm | Status |
|---|---|---|---|---|
| CRITICAL | 10 | 100 % | 100 % | PLENA |
| HIGH | 13 | 100 % | 100 % | PLENA |
| MEDIUM | 12 | 100 % | Parcial (ver §8) | ACEITE |

**Total:** 35 activos monitorizados  
**Ficheiro de inventário:** `backend/security/integrity/asset_inventory.json`  
**SHA-256 (inventário):** `fd8fc113754026658064dc05bd9c9039b1c2ed49f14bd1ac238253bdf4e7dabb`

### 3.2 Activos com Drift Legítimo Incorporado

| ID | Criticidade | Razão do Drift |
|---|---|---|
| INT-C-001 | CRITICAL | INT-01B — hook IntegrityRuntime em server.js |
| INT-C-002 | CRITICAL | SEC-OBS-002 — variáveis INTEGRITY no .env |
| INT-H-001 | HIGH | INT-01D — getIntegrityState/payload Dashboard |
| INT-H-002 | HIGH | INT-01D — consumo StateStore na Intelligence |

---

## 4. Baseline Criptográfico Vigente

| Atributo | Valor |
|---|---|
| Ficheiro activo | `backend/security/integrity/baseline.json` |
| SHA-256 (v2) | `f9ca52c1c1461b5be4f748f8bee444906d826c73332891b77976736ac1495818` |
| Ficheiro preservado (v1) | `backend/security/integrity/baseline-int-01a.json` |
| SHA-256 (v1) | `6cb5ac487158cdb462a4b01b2b7f25290eaa05a4b9b4425619619e4301760bf6` |
| Activos no baseline | 35 |
| Activos inalterados vs v1 | 31 |
| Drifts legítimos incorporados | 4 |
| Divergências não explicadas | 0 |

---

## 5. Modelo de Telemetria

### 5.1 State Store

- **Ficheiro de estado:** `/var/lib/impetus/integrity/state.json`
- **Eventos:** `/var/lib/impetus/integrity/events.jsonl` (append-only, rotação automática)
- **Estados operacionais:** STOPPED → WATCH → DEGRADED → SUSPENDED
- **Actualização:** periódica (flush metrics) + event-driven

### 5.2 Métricas Operacionais Observadas (SEC-OBS-002)

| Métrica | Valor observado | Limite |
|---|---|---|
| avg_hash_ms | < 1 ms | 50 ms |
| avg_scan_ms | < 2 ms | 200 ms |
| avg_correlation_ms | < 1 ms | 20 ms |
| avg_read_ms (Dashboard) | < 3 ms | 100 ms |
| Heap JS | ~4.3 MB | 50 MB |
| RSS | ~41 MB | 150 MB |
| CPU steady-state | < 0.1 % | 5 % |

---

## 6. Integração com o Centro de Comando

- **Caminho de consumo:** `IntegrityStateStore.readStateFile()` → `getIntegrityState()` → payload Dashboard
- **Desacoplamento confirmado:** o Dashboard não executa hashes nem lógica de integridade
- **Feature flag:** `INTEGRITY_SENSOR_ENABLED` controla activação
- **Fallback:** SEM_TELEMETRIA transparente em todas as condições de falha
- **Camada INTEGRITY no Dashboard:** ATUOU / OBSERVADA / SEM_TELEMETRIA

---

## 7. Classificação CERTIFIED_WITH_LIMITATIONS

### 7.1 O que está certificado

- Arquitectura, implementação e operação da camada INTEGRITY
- Cobertura 100 % dos activos CRITICAL e HIGH
- Detecção hash, permissão, deleção e renomeação
- Integração desacoplada com o Centro de Comando
- Telemetria interna, métricas e estado operacional
- Modo degradado e auto-recuperação
- Performance dentro dos limites arquitecturais

### 7.2 Limitações formalmente registadas

| ID | Limitação | Risco |
|---|---|---|
| LIM-001 | Cobertura auditd parcial (4 dirs críticos) | P1 |
| LIM-002 | Monitorização de directórios MEDIUM sem watchers | P2 |
| LIM-003 | GID não monitorizado por IntegrityPermChecker | P2 |
| LIM-004 | Memória, firmware, hardware, containers fora do escopo | P2 |

Ver registo completo em `INTEGRITY_LIMITATIONS_REGISTER.md`.

---

## 8. Versão Oficial do Baseline de Segurança

> **Versão oficial IMPETUS Security Baseline:** v2.0 — IMPETUS-INTEGRITY-BASELINE-v2  
> **Data de vigência:** 2026-07-23  
> **Próxima revisão:** a iniciar quando evolução relevante for aprovada (ciclo OBS → COVERAGE → CERT → BASELINE)
