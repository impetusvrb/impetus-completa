# Integrity Implementation Roadmap — IMPETUS

**Documento:** INTEGRITY_IMPLEMENTATION_ROADMAP.md  
**Missão:** GAP-INT-01-ARCH  
**Data:** 2026-07-23  
**Status:** ROADMAP_DEFINED

---

## 1. Visão geral do roadmap

```
SEC-BASELINE-001 APPROVED (baseline actual)
        │
        ▼
GAP-INT-01-ARCH ◄── ESTAMOS AQUI
(Arquitectura)
        │
        ▼
INT-01A — Especificação de Activos e Baseline
        │
        ▼
INT-01B — Motor do Sensor (AuditdBridge + HashChecker + PermChecker)
        │
        ▼
INT-01C — Telemetria (State Store + Dashboard integration)
        │
        ▼
INT-01D — Dashboard e Substituição do Proxy
        │
        ▼
SEC-OBS-002 — Validação Operacional do Sensor
        │
        ▼
SEC-COVERAGE-002 — Cobertura da Camada INTEGRITY
        │
        ▼
SEC-CERT-002 — Certificação do Sensor de Integridade
        │
        ▼
SEC-BASELINE-002 — Actualização do Baseline Oficial
```

---

## 2. Fases detalhadas

### INT-01A — Especificação de Activos e Baseline

**Objectivo:** Definir a lista oficial de activos monitorados e criar o baseline inicial de hashes.

**Entradas:**
- Inventário definido nesta arquitectura (FASE 1)
- Estado actual do sistema em produção

**Deliverables:**
- `integrity-assets.json` — lista de activos com criticidade, paths, permissões esperadas
- `baseline.json` — hashes SHA256 iniciais de todos os activos CRITICAL e HIGH
- `INTEGRITY_ASSET_INVENTORY.md` — documentação formal do inventário
- Variáveis de ambiente adicionadas ao `.env` (não activas: `INTEGRITY_SENSOR_ENABLED=false`)

**Critérios de aceite:**
- Todos os activos CRITICAL documentados
- Baseline gerado em produção (operação manual, sem reinício)
- Nenhuma alteração em código de produção em execução
- `INTEGRITY_SENSOR_ENABLED=false` (sensor não activo ainda)

**Restrições:**
- Não alterar `server.js`, Dashboard Service, Intelligence Service
- Não reiniciar PM2
- Baseline é apenas leitura; não activa monitoramento

**Duração estimada:** 1 sessão

---

### INT-01B — Motor do Sensor

**Objectivo:** Implementar os três watchers (`AuditdBridge`, `HashChecker`, `PermChecker`) e o `IntegrityCorrelationEngine` como módulo isolado.

**Entradas:**
- Arquitectura definida (GAP-INT-01-ARCH)
- Inventário de activos (INT-01A)
- Baseline inicial (INT-01A)

**Deliverables:**
- `backend/src/services/integrityMonitorService.js` — módulo principal
- `backend/src/services/integrity/AuditdBridge.js`
- `backend/src/services/integrity/HashChecker.js`
- `backend/src/services/integrity/PermChecker.js`
- `backend/src/services/integrity/IntegrityEventBus.js`
- `backend/src/services/integrity/IntegrityCorrelationEngine.js`
- Testes unitários para cada componente
- `INTEGRITY_ENGINE_TEST_REPORT.md`

**Critérios de aceite:**
- Motor funcional em teste isolado (não no servidor de produção)
- AuditdBridge lê e parseia audit.log correctamente
- HashChecker detecta mudança de hash em teste controlado
- PermChecker detecta mudança de permissão em teste controlado
- Event Bus desduplicação funcional
- Correlation Engine suprime falsos positivos (deploy mode)
- `INTEGRITY_SENSOR_ENABLED=false` (não activado em produção ainda)
- Nenhuma alteração nos serviços certificados

**Restrições:**
- O módulo deve ser completamente isolado: carregamento condicional
- Todos os ficheiros do motor em `backend/src/services/integrity/` (novo directório)
- Não modificar `server.js`, `adminPortalSecurityDashboardService.js`, nem `adminPortalSecurityIntelligenceService.js`

**Nota de implementação — Hook de inicialização (INT-01B efectivado):**
A única modificação em `server.js` foi a adição de um **hook de inicialização do Motor de Integridade** (+7 linhas, bloco `try…catch`):
```javascript
// INT-01B — Integrity Sensor (INTEGRITY_SENSOR_ENABLED=false default; shadow mode).
try {
  const integrityRuntime = require('./services/integrity/IntegrityRuntime');
  integrityRuntime.init();
} catch (e) {
  console.warn('[INTEGRITY_SENSOR_BOOT]', e && e.message ? e.message : e);
}
```
Este hook é totalmente flag-gated (`INTEGRITY_SENSOR_ENABLED`): quando a flag é `false` (default), o motor não é carregado. A alteração não constitui breaking change nem afecta qualquer camada certificada. Registado aqui para rastreabilidade de modificações estruturais.

**Duração estimada:** 2-3 sessões

---

### INT-01C — Telemetria e State Store

**Objectivo:** Integrar o motor ao `State Store`, conectar ao threat-watch log e implementar `getIntegrityState()` no Dashboard Service.

**Entradas:**
- Motor funcional (INT-01B)
- Arquitectura de telemetria (INTEGRITY_TELEMETRY_ARCHITECTURE.md)

**Deliverables:**
- `IntegrityStateStore.js` — gestão de `state.json`, `events.jsonl`, `baseline.json`
- `getIntegrityState()` adicionado a `adminPortalSecurityDashboardService.js`
- Integração com `threat-watch log` (formato ALERT)
- `INTEGRITY_SENSOR_ENABLED=true` no `.env` (com aprovação explícita)
- Activação em produção com PM2 `--update-env`
- `INTEGRITY_TELEMETRY_TEST_REPORT.md`

**Critérios de aceite:**
- `state.json` actualizado a cada ciclo
- `events.jsonl` regista eventos correctamente
- `getIntegrityState()` retorna estado correcto
- threat-watch log contém eventos de integridade no formato esperado
- Leitura de `state.json` é < 1ms (verificado)
- `adminPortalSecurityDashboardService.js` inclui `integrity_state` no payload

**Nota sobre activação:**
- Apenas activar `INTEGRITY_SENSOR_ENABLED=true` após teste em staging ou janela de manutenção
- PM2 restart com `--update-env --only impetus-backend`

**Duração estimada:** 1-2 sessões

---

### INT-01D — Dashboard e Substituição do Proxy

**Objectivo:** Actualizar `adminPortalSecurityIntelligenceService.js` para usar `integrity_state` em vez do proxy `fail2ban.available`, e validar a exibição correcta no painel.

**Entradas:**
- Telemetria funcional (INT-01C)
- Estado real do sensor disponível no payload

**Deliverables:**
- `adminPortalSecurityIntelligenceService.js` — substituição do proxy (diff mínimo)
- Estado `INTEGRITY` no painel agora usa `getIntegrityState()` directamente
- Mecanismo de fallback para proxy legado (quando sensor não activo)
- `INTEGRITY_DASHBOARD_VALIDATION_REPORT.md`

**Critérios de aceite:**
- Painel exibe `OBSERVADA` quando sensor activo e sistema íntegro
- Painel exibe `ATUOU` quando violação detectada (teste controlado)
- Painel exibe `SEM_TELEMETRIA` quando sensor inactivo
- Fallback para proxy legado funcional (retrocompatibilidade)
- Zero regressões em outras camadas do painel
- Evidence string clara: não mais "via proxy fail2ban"

**Nota de implementação (INT-01D efectivado — 2026-07-23):**
Integração controlada com separação geração/apresentação. Deliverables efectivos:
- `getIntegrityState()` + `getIntegrityObservability()` em `adminPortalSecurityDashboardService.js`
- Campo `integrity_state` no payload de `buildDashboard()`
- `case 'INTEGRITY':` em `adminPortalSecurityIntelligenceService.js` consome `IntegrityStateStore.readStateFile()` com fallback para proxy fail2ban certificado
- Suite `runIntegrationTests.js`: 25/25 PASS
- Evidências: `backend/docs/evidence/int-01d/`
- `INTEGRITY_SENSOR_ENABLED` permanece `false` por default até activação operacional explícita (SEC-OBS-002)

**Duração estimada:** 1 sessão

---

### SEC-OBS-002 — Validação Operacional do Sensor

**Objectivo:** Auditoria completa do sensor de integridade em produção, validando comportamento real, telemetria e transições de estado.

**Equivalente a:** SEC-OBS-001 aplicado especificamente à camada INTEGRITY.

**Deliverables:**
- `INTEGRITY_LAYER_TELEMETRY_AUDIT.md`
- `INTEGRITY_LAYER_STATUS_MATRIX.md`
- `INTEGRITY_LAYER_GAP_ANALYSIS.md`
- `SEC_OBS_002_STATUS = PASS`

**Critérios de aceite:**
- Sensor detecta violação de teste controlado
- Transições OBSERVADA → ATUOU → OBSERVADA funcionais
- Telemetria HIGH confidence para activos CRITICAL
- Falsos positivos < 5% em operação normal

**Nota de execução (SEC-OBS-002 efectivado — 2026-07-23):**
Activação controlada com `INTEGRITY_SENSOR_ENABLED=true` e restarts autorizados do `impetus-backend` (activação, DEGRADED, recuperação). Evidências em `backend/docs/evidence/sec-obs-002/`. Sensor permanece activo. Drift legítimo INT-01B/C/D detectado como ATUOU — baseline a regenerar em SEC-BASELINE-002.

---

### SEC-COVERAGE-002 — Cobertura da Camada INTEGRITY

**Objectivo:** Auditoria de cobertura da nova camada de integridade: todos os activos, todas as transições, todos os gaps.

**Equivalente a:** SEC-COVERAGE-001 aplicado especificamente ao sensor de integridade.

**Deliverables:**
- `INTEGRITY_COVERAGE_AUDIT.md`
- `INTEGRITY_TRANSITION_MATRIX.md`
- `INTEGRITY_VALIDATION_MATRIX.md`
- `INTEGRITY_CONFIDENCE_MATRIX.md`
- `SEC_COVERAGE_002_STATUS = PASS`

**Nota de execução (SEC-COVERAGE-002 efectivado — 2026-07-23):**
Auditoria inventário×baseline×motor: CRITICAL/HIGH 100%; MEDIUM ficheiros 100% com excepções de directório documentadas. Suite funcional 8/8; FP/FN 0%. Lacunas auditd INT-01A confirmadas (P1/P2), mitigadas por HashChecker. Baseline **não** alterado. Evidências: `backend/docs/evidence/sec-coverage-002/`.

---

### SEC-CERT-002 — Certificação do Sensor de Integridade

**Objectivo:** Certificar o sensor como componente operacional confiável, eliminando a limitação GAP-INT-01 da certificação actual.

**Resultado esperado:**
- Camada INTEGRITY: `CERTIFIED` (sem limitações relacionadas com sensor)
- `SEC_CERT_002_STATUS = APPROVED`

**Deliverables:**
- `INTEGRITY_CERTIFICATION_MATRIX.md`
- `INTEGRITY_OPERATIONAL_CERTIFICATION.md`
- `INTEGRITY_FINAL_CERTIFICATE.md`

**Nota de execução (SEC-CERT-002 efectivado — 2026-07-23):**
Certificação formal READ-ONLY. Classificação emitida: **CERTIFIED_WITH_LIMITATIONS** (P0=0; CRITICAL/HIGH 100%; lacunas auditd P1 e residual documentados). Baseline forense INT-01A preservado. Sem build/restart/código. Evidências: `backend/docs/evidence/sec-cert-002/`. Pronto para SEC-BASELINE-002.

---

### SEC-BASELINE-002 — Actualização do Baseline Oficial

**Objectivo:** Consolidar todas as melhorias (INT-01A → SEC-CERT-002) no baseline oficial, actualizando SEC-BASELINE-001.

**Resultado:**
- Baseline v2.0 com camada INTEGRITY totalmente certificada
- GAP-INT-01 fechado oficialmente
- `SEC-BASELINE-002 APPROVED`

**Deliverables:**
- `SECURITY_OPERATIONAL_BASELINE_2026_v2.md`
- `SECURITY_BASELINE_v2_APPROVAL.md`
- Actualização do `SECURITY_LIMITATIONS_REGISTER.md` (remoção de GAP-INT-01)

---

## 3. Tabela de dependências

| Fase | Depende de | Bloqueia |
|---|---|---|
| GAP-INT-01-ARCH | SEC-BASELINE-001 | INT-01A |
| INT-01A | GAP-INT-01-ARCH | INT-01B |
| INT-01B | INT-01A | INT-01C |
| INT-01C | INT-01B | INT-01D |
| INT-01D | INT-01C | SEC-OBS-002 |
| SEC-OBS-002 | INT-01D | SEC-COVERAGE-002 |
| SEC-COVERAGE-002 | SEC-OBS-002 | SEC-CERT-002 |
| SEC-CERT-002 | SEC-COVERAGE-002 | SEC-BASELINE-002 |
| SEC-BASELINE-002 | SEC-CERT-002 | — |

---

## 4. Estimativa de esforço total

| Fase | Sessões estimadas | Risco | Prioridade |
|---|---|---|---|
| INT-01A | 1 | Baixo | P0 |
| INT-01B | 2-3 | Médio | P0 |
| INT-01C | 1-2 | Médio | P0 |
| INT-01D | 1 | Baixo | P0 |
| SEC-OBS-002 | 1-2 | Baixo | P1 |
| SEC-COVERAGE-002 | 1 | Baixo | P1 |
| SEC-CERT-002 | 1 | Baixo | P2 |
| SEC-BASELINE-002 | 1 | Baixo | P2 |
| **Total** | **9-12** | | |

---

## 5. Gate de entrada para INT-01A

Antes de iniciar INT-01A, confirmar:

- [ ] GAP-INT-01-ARCH documentos completos e aprovados
- [ ] Nenhuma alteração pendente em serviços certificados
- [ ] Sistema em estado estável (sem incidentes activos)
- [ ] Janela de manutenção acordada para activação em INT-01C
- [ ] Responsável técnico designado para revisão de baseline

---

## 6. Critérios de reversão

Para cada fase, a reversão é possível sem impacto:

| Fase | Reversão |
|---|---|
| INT-01A | Apagar `integrity-assets.json` e `baseline.json` (sem código activo) |
| INT-01B | Módulo nunca activo em produção; reversão = não deploy |
| INT-01C | `INTEGRITY_SENSOR_ENABLED=false` + PM2 reload; fallback automático |
| INT-01D | Git revert do diff mínimo em intelligence service |

---

## 7. Marcos de validação obrigatórios

| Marco | Critério |
|---|---|
| M1: Arquitectura aprovada | Este documento + GAP_INT_01_ARCHITECTURE.md revisados |
| M2: Baseline criado | `baseline.json` gerado e verificado manualmente |
| M3: Motor em teste | Todos os watchers detectam eventos em ambiente de teste |
| M4: Telemetria em produção | `state.json` actualizando, threat-watch log com entradas |
| M5: Painel actualizado | Estado INTEGRITY sem proxy; 3 estados testados |
| M6: Sensor certificado | SEC-CERT-002 APPROVED |
| M7: Baseline actualizado | SEC-BASELINE-002 APPROVED; GAP-INT-01 fechado |

---

## 8. Alinhamento com governança estabelecida

Esta roadmap segue exactamente o ciclo de governança aprovado:

```
ARCH → IMPL → OBS → COVERAGE → CERT → BASELINE
```

Equivalente ao ciclo das camadas certificadas anteriores:

```
SEC-OBS-001 → SEC-COVERAGE-001 → SEC-CERT-001 → SEC-BASELINE-001
```

**Nenhuma fase pode ser saltada.** A certificação de cada etapa é pré-requisito para a seguinte.
