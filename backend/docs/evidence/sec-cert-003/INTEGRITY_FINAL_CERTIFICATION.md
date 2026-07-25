# INTEGRITY_FINAL_CERTIFICATION

**Emitido em:** 2026-07-23 20:50 UTC  
**Fase:** SEC-CERT-003 — Certificação Plena da Camada INTEGRITY  
**Classificação:** **CERTIFIED**  
**Missão:** READ-ONLY (sem alteração de código, configuração ou baseline)

---

## Certificado Formal

> A camada **INTEGRITY** do IMPETUS é declarada **CERTIFIED**.

| Campo | Valor |
|---|---|
| Produto | IMPETUS |
| Camada | INTEGRITY |
| Classificação anterior | CERTIFIED_WITH_LIMITATIONS (SEC-CERT-002) |
| Classificação actual | **CERTIFIED** |
| Baseline vigente | IMPETUS-INTEGRITY-BASELINE-v2 |
| Data de certificação | 2026-07-23 |
| Próxima consolidação | SEC-BASELINE-003 |

---

## O que está certificado

1. Arquitectura GAP-INT-01 (desacoplamento geração/apresentação)
2. Motor de Integridade completo (Hash, Perm/UID/GID, AuditdBridge, EventBus, Correlation, StateStore, Runtime)
3. Integração controlada com o Centro de Comando
4. Cobertura CRITICAL 100 %, HIGH 100 %, MEDIUM 100 % (deteção)
5. Eliminação das limitações operacionais LIM-001, LIM-002, LIM-003 e OBS-003-F1
6. Performance dentro dos limites arquitecturais observados

---

## O que NÃO está no escopo certificado

| Item | Tratamento |
|---|---|
| LIM-004 — memória, firmware, hardware, containers, BIOS | Fronteira formal de escopo |
| Domínios futuros (Runtime Integrity, Container Security, Host Security) | Fora desta camada |

---

## Notas administrativas (não impeditivas)

1. **INT-M-004** — higiene de inventário P2 (`monitor_owner` sem `expected_*`); detecção hash + auditd activa.
2. **Drift INT-C-010 / INT-M-003** — esperado pós-INT-LIM-001; consolidação no SEC-BASELINE-003.

---

## Cadeia de Custódia

| Âncora | Status |
|---|---|
| baseline-int-01a.json (v1) | Preservado |
| baseline.json (v2) | Íntegro (`forensic_v2_match=true`) |
| Cadeia evidencial ARCH→CERT-003 | Completa |

---

**Assinatura documental:** SEC-CERT-003 / IMPETUS Integrity Certification Board (evidência)  
**Classificação:** `CERTIFIED`
