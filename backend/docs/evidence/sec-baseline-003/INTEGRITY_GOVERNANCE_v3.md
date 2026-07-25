# INTEGRITY_GOVERNANCE_v3

**Emitido em:** 2026-07-23 21:11 UTC  
**Fase:** SEC-BASELINE-003  

---

## 1. Estado Oficial da Camada

| Atributo | Valor |
|---|---|
| Camada | INTEGRITY |
| **Status** | **CERTIFIED** |
| Baseline | v3.0 — IMPETUS-INTEGRITY-BASELINE-v3 |
| Data de vigência | 2026-07-23 |
| Certificação | SEC-CERT-003 |

---

## 2. Encerramento do Registo Operacional de Limitações

| ID | Estado formal |
|---|---|
| LIM-001 | **ENCERRADA** |
| LIM-002 | **ENCERRADA** |
| LIM-003 | **ENCERRADA** |
| OBS-003-F1 | **ENCERRADO** |
| LIM-004 | **Fronteira formal de escopo** (não é limitação operacional) |

O documento `INTEGRITY_LIMITATIONS_REGISTER.md` (SEC-BASELINE-002) permanece como registo histórico.  
O estado vigente é o desta governação v3.

---

## 3. Fluxo de Manutenção Pós-CERTIFIED

Operação normal: motor → EventBus → Correlation → StateStore → Dashboard (inalterado).

Actualização do baseline: **nunca** automática. Requer ciclo completo:

```
ARCH → IMPLEMENTAÇÃO → OBS → COVERAGE → CERT → BASELINE
```

---

## 4. Responsabilidades

| Papel | Dever |
|---|---|
| Desenvolvimento | Não alterar componentes certificados fora de escopo aprovado |
| Operações | Monitorizar INTEGRITY no Centro de Comando |
| Governança | Qualquer evolução = novo ciclo; preservar baselines arquivados |
| Auditor | Verificar SHA-256 v1/v2/v3 na cadeia de custódia |

---

## 5. Referências

- `INTEGRITY_SECURITY_BASELINE_v3.md`
- `INTEGRITY_BASELINE_v3_MANIFEST.json`
- `docs/evidence/sec-cert-003/INTEGRITY_FINAL_CERTIFICATION.md`
- `security/integrity/baseline.json` (v3 ACTIVE)
- `security/integrity/baseline-v2.json` (ARCHIVED)
- `security/integrity/baseline-int-01a.json` (ARCHIVED)
