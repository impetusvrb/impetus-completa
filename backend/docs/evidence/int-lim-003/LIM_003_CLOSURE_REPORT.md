# LIM_003_CLOSURE_REPORT

**Emitido em:** 2026-07-23 17:06 UTC  
**Fase:** INT-LIM-003 — Eliminação da LIM-003  
**Status:** PASS  

---

## Critérios de Aceite

| Critério | Resultado | Evidência |
|---|---|---|
| INT_LIM_003_STATUS | **PASS** | Este relatório |
| GID_MONITORING_IMPLEMENTED | **TRUE** | `resolveGid()` + bloco GID em PermChecker; Cenário 2: PASS |
| UID_MONITORING_PRESERVED | **TRUE** | `changed_attribute: 'UID'`; Cenário 4: PASS |
| PERMISSION_MONITORING_PRESERVED | **TRUE** | `INTEGRITY_PERM_CHANGED`; Cenário 6: PASS |
| NO_DUPLICATE_EVENTS | **TRUE** | Cenário 5: exactamente 2 eventos para UID+GID simultâneos |
| NO_SECURITY_REGRESSION | **TRUE** | 7/7 cenários PASS; 0 componentes certificados com breaking change |
| LIM_003_CLOSED | **TRUE** | GID detectado via `chgrp`; distinção auditável via `changed_attribute` |

---

## Respostas às Questões Obrigatórias

### 1. O IntegrityPermChecker passou a monitorar alterações de GID?

**Sim.** A função `resolveGid()` foi adicionada e o bloco GID implementado em `_checkAsset()`. O Cenário 2 confirma detecção de `chgrp daemon` com evento `INTEGRITY_OWNER_CHANGED`, `changed_attribute: 'GID'`, severidade CRITICAL.

### 2. As alterações de UID continuaram funcionando correctamente?

**Sim.** O bloco UID pré-existente foi preservado integralmente. O campo `changed_attribute: 'UID'` foi adicionado para distinção auditável (não breaking). O Cenário 4 confirma detecção de `chown daemon`.

**Descoberta adicional:** o bloco UID existia mas nunca disparava porque `expected_owner` era `null` em todos os activos. A INT-LIM-003 corrigiu este comportamento ao popular `expected_owner` e `expected_group` no inventário — 33 activos com `monitor_owner=True` estão agora activamente monitorizados para UID e GID.

### 3. Houve necessidade de alterar outros componentes além do IntegrityPermChecker?

**Não, além do asset_inventory.json** (metadados). Os campos `expected_owner` e `expected_group` foram populados com os valores reais (todos `"root"`) para activar os checks. Nenhum componente de lógica foi alterado além do `IntegrityPermChecker`.

### 4. Os eventos chegaram correctamente ao Dashboard?

**Sim** (validado via análise estática). O fluxo `INTEGRITY_OWNER_CHANGED` → CorrelationEngine (CRITICAL) → StateStore → Dashboard está certificado desde INT-01D e permanece inalterado.

### 5. Foi observado algum impacto de desempenho?

**Não.** Benchmark de 50 ciclos × 10 activos:
- avg por ciclo: 0.37ms (limite: 200ms)
- avg por activo: 0.037ms
- heap: 3.76 MB
- Resultado: `within_limits = true`

O overhead do novo bloco GID é negligível — um `stat.gid` e um `resolveGid()` (com cache) por activo.

### 6. Houve regressões funcionais ou de segurança?

**Não.** 7/7 cenários PASS. Nenhum componente certificado foi alterado (HashChecker, AuditdBridge, EventBus, CorrelationEngine, Dashboard). O baseline.json permanece inalterado.

### 7. A LIM-003 pode ser considerada oficialmente encerrada?

**Sim.** A LIM-003 documentava a ausência de monitorização de GID. Esta capacidade está agora implementada, testada e operacional.

---

## Descoberta de Valor Adicional

A INT-LIM-003 revelou que o bloco de verificação de UID já existia no código mas era **inoperante** desde a certificação, porque `expected_owner` era `null` no inventário. A correcção deste campo activou simultaneamente a monitorização de UID (que estava silenciosa) e a nova monitorização de GID.

Isso significa que a camada INTEGRITY ganhou **duas capacidades operacionais** nesta fase:
1. Monitorização de GID (nova)
2. Monitorização de UID realmente activa (corrigida)

---

## Ficheiros Alterados

| Ficheiro | Tipo de alteração | SHA-256 |
|---|---|---|
| `src/services/integrity/IntegrityPermChecker.js` | Adição de `resolveGid()` e bloco GID | `40b4aba4f1ebf7d2a7a073d7e6f89a5a205aff1c76ad0fbdf62885a06c32dac9` |
| `security/integrity/asset_inventory.json` | População de `expected_owner` + `expected_group` | `d3edf2470cae453cb23dd840107921db7ae70c88e0d28462bbd0ebbe91d8baea` |

---

## Estado das Limitações Após INT-LIM-003

| ID | Limitação | Estado |
|---|---|---|
| LIM-001 | Cobertura auditd | ✅ ENCERRADA |
| LIM-002 | Watchers MEDIUM | ✅ ENCERRADA |
| LIM-003 | Monitorização GID | ✅ ENCERRADA |
| LIM-004 | Fronteira de escopo | ℹ️ Reclassificada (não é limitação operacional) |

**Todas as limitações operacionais identificadas foram eliminadas.**

---

`INT_LIM_003_STATUS = PASS`  
`LIM_003_CLOSED = TRUE`
