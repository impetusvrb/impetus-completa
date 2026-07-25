# SECURITY_CERTIFICATION_PROCESS — Processo Oficial de Certificação

**Versão:** 1.0  
**Data:** 2026-07-23  
**Baseline:** SEC-BASELINE-001

---

## 1. Visão geral

O processo de certificação de camadas de segurança do IMPETUS foi estabelecido em 2026-07-23 como resultado directo da sequência SEC-OBS-001 → SEC-COVERAGE-001 → SEC-CERT-001. Aplica-se a qualquer nova camada ou alteração substancial em camada existente.

---

## 2. Fases do processo

### FASE OBS — Observabilidade

**Propósito:** Verificar se a camada possui telemetria confiável e se os estados são atribuídos correctamente.

**Entradas:**
- Código da camada em `buildProtectionLayers()`
- Fonte de telemetria identificada
- Log/API/conf que produz os dados

**Saídas obrigatórias:**
- Confirmação de que telemetria existe e é lida
- Confirmação de que não há estados hardcoded incorrectos
- `SECURITY_LAYER_TELEMETRY_AUDIT.md` actualizado
- `SECURITY_LAYER_STATUS_MATRIX.md` actualizado

**Critérios de aprovação:**
- 0 estados `SEM_TELEMETRIA` hardcoded quando telemetria existe
- 0 estados `ATUOU` hardcoded sem evidência

---

### FASE COVERAGE — Cobertura

**Propósito:** Documentar completamente todos os critérios, fontes e validações.

**Entradas:**
- Saídas da fase OBS
- Código e dependências

**Saídas obrigatórias:**
- `SECURITY_LAYER_COVERAGE_AUDIT.md` actualizado
- `SECURITY_LAYER_TRANSITION_MATRIX.md` actualizado
- `SECURITY_LAYER_VALIDATION_MATRIX.md` actualizado
- `SECURITY_LAYER_CONFIDENCE_MATRIX.md` actualizado

**Critérios de aprovação:**
- Todos os critérios de transição documentados
- Todas as fontes de telemetria mapeadas
- `TELEMETRY_CONFIDENCE` classificada
- Gaps identificados e registados

---

### FASE CERT — Certificação

**Propósito:** Reproduzir transições, verificar consistência multi-fonte e classificar a camada.

**Entradas:**
- Saídas de OBS + COVERAGE
- Ambiente de produção

**Saídas obrigatórias:**
- `SECURITY_CERTIFICATION_MATRIX.md` actualizado
- `SECURITY_REPRODUCIBILITY_REPORT.md` actualizado
- `SECURITY_MULTI_SOURCE_CONSISTENCY.md` actualizado
- `SECURITY_LIMITATIONS_REGISTER.md` actualizado
- `SECURITY_OPERATIONAL_CERTIFICATION.md` actualizado

**Critérios de aprovação:**
- Camada classificada como CERTIFIED ou CERTIFIED_WITH_LIMITATIONS
- NOT_CERTIFIED bloqueia promoção para produção
- `UNSUPPORTED_STATE = 0`
- `AMBIGUOUS_STATE = 0`
- `MULTI_SOURCE_CONSISTENCY = YES | PARTIAL` (não NO)

---

### FASE BASELINE — Incorporação ao baseline

**Propósito:** Consolidar a nova camada no baseline oficial e actualizar a referência.

**Entradas:**
- Saídas de CERT aprovada

**Saídas obrigatórias:**
- `SECURITY_LAYER_REFERENCE.md` actualizado (nova camada adicionada)
- `SECURITY_OPERATIONAL_BASELINE_2026.md` actualizado (versão incrementada)
- `SECURITY_LIMITATIONS_BASELINE.md` actualizado
- `SECURITY_BASELINE_APPROVAL.md` actualizado com nova versão

**Critérios de aprovação:**
- Todas as evidências anteriores preservadas (append-only)
- Nova versão do baseline emitida com data e sequência

---

## 3. Documentos canónicos por fase

| Fase | Documentos de saída | Localização |
|---|---|---|
| OBS | `SECURITY_LAYER_TELEMETRY_AUDIT.md`, `SECURITY_LAYER_STATUS_MATRIX.md`, `SECURITY_LAYER_GAP_ANALYSIS.md` | `sec-obs-NNN/` |
| COVERAGE | `SECURITY_LAYER_COVERAGE_AUDIT.md`, `SECURITY_LAYER_TRANSITION_MATRIX.md`, `SECURITY_LAYER_VALIDATION_MATRIX.md`, `SECURITY_LAYER_CONFIDENCE_MATRIX.md` | `sec-coverage-NNN/` |
| CERT | `SECURITY_CERTIFICATION_MATRIX.md`, `SECURITY_REPRODUCIBILITY_REPORT.md`, `SECURITY_MULTI_SOURCE_CONSISTENCY.md`, `SECURITY_LIMITATIONS_REGISTER.md`, `SECURITY_OPERATIONAL_CERTIFICATION.md`, `SECURITY_FINAL_CERTIFICATE.md` | `sec-cert-NNN/` |
| BASELINE | `SECURITY_LAYER_REFERENCE.md`, `SECURITY_OPERATIONAL_BASELINE_YYYY.md`, `SECURITY_LIMITATIONS_BASELINE.md`, `SECURITY_BASELINE_APPROVAL.md` | `sec-baseline-NNN/` |

---

## 4. Decisão de certificação

| Resultado | Condição | Acção |
|---|---|---|
| CERTIFIED | Telemetria ≥ MEDIUM + estados reproduzíveis + 0 gaps P0 | Pode ir para produção |
| CERTIFIED_WITH_LIMITATIONS | Operacional + limitações documentadas + 0 gaps P0 | Pode ir para produção com limitações registadas |
| NOT_CERTIFIED | Gap P0 aberto ou estado não reproduzível | BLOQUEADO para produção |

---

## 5. Nomenclatura dos ciclos

| Ciclo | Padrão | Exemplo |
|---|---|---|
| Observabilidade | `SEC-OBS-NNN` | SEC-OBS-001, SEC-OBS-002 |
| Cobertura | `SEC-COVERAGE-NNN` | SEC-COVERAGE-001 |
| Certificação | `SEC-CERT-NNN` | SEC-CERT-001 |
| Baseline | `SEC-BASELINE-NNN` | SEC-BASELINE-001 |

Próximo ciclo de observabilidade (quando GAP-INT-01 implementado): **SEC-OBS-002**

---

## 6. Preservação forense obrigatória em todo ciclo

```
FORENSIC_EVIDENCE_PRESERVED      = TRUE  (invariante absoluta)
STORAGE_REMEDIATION_UNTOUCHED    = TRUE
DELETION_EXECUTED                = NO
```

Qualquer ciclo que viole estas invariantes é automaticamente invalidado.
