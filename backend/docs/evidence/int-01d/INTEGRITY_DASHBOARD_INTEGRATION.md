# INTEGRITY_DASHBOARD_INTEGRATION.md
## INT-01D — Integração Controlada do Sensor de Integridade ao Centro de Comando

**Fase:** INT-01D  
**Data:** 2026-07-23  
**Status:** CONCLUÍDO — PASS  
**Princípio:** Separação entre geração e apresentação — Dashboard não executa lógica de integridade

---

## 1. Contexto e Princípio Arquitectural

O INT-01D implementa a integração controlada do Sensor de Integridade ao ecossistema operacional do IMPETUS seguindo o princípio de **separação entre geração e apresentação**:

| Responsabilidade | Componente |
|---|---|
| Geração do estado de integridade | Motor de Integridade (INT-01B/C) |
| Publicação do estado | `IntegrityStateStore` → `state.json` |
| **Consumo do estado** | **Dashboard Service (INT-01D)** |
| **Apresentação** | **Centro de Comando (INT-01D)** |

**O Dashboard não calcula hashes, não verifica permissões, não consulta auditd.** Toda a lógica de integridade permanece exclusivamente no motor.

---

## 2. Componentes Modificados

### 2.1 `adminPortalSecurityDashboardService.js`

**Tipo de alteração:** Aditiva — novos campos, sem modificação do comportamento existente.

**Adições:**

#### `_IntegrityStateStore` (constante module-level)
Lazy require do módulo de state store, com fallback gracioso:
```javascript
const _IntegrityStateStore = (() => {
  try { return require('./integrity/IntegrityStateStore'); } catch { return null; }
})();
```

#### `_integrityObs` (observabilidade interna)
Contadores para SEC-OBS-002:
- `reads`: total de leituras do estado
- `fallbacks`: activações do mecanismo de fallback
- `errors`: erros de leitura (excepções)
- `total_read_ms` / `last_read_ms`: latência

#### `getIntegrityState()` (nova função exportada)
API oficial de consumo do estado consolidado. Responsabilidades:
1. Verificar feature flag `INTEGRITY_SENSOR_ENABLED`
2. Chamar `IntegrityStateStore.readStateFile()` (leitura directa do disco)
3. Validar estrutura: `sensor_active`, `stale`, `error`
4. Normalizar campos para o formato do Dashboard
5. Registar métricas de observabilidade

**Condições de fallback (retorna `available: false`):**
- `INTEGRITY_SENSOR_ENABLED !== 'true'`
- Módulo `IntegrityStateStore` não encontrado
- `state.json` ausente (`sensor_active: false`)
- `state.json` corrompido (excepção no parse)
- Estado stale (última actualização > `2 × INTEGRITY_HASH_CHECK_INTERVAL`)

#### `getIntegrityObservability()` (nova função exportada)
Devolve métricas de leitura para SEC-OBS-002.

#### `integrity_state` no payload de `buildDashboard()`
Campo adicionado ao payload final:
```javascript
integrity_state: getIntegrityState(),
```
Processamento: **zero lógica de integridade** — apenas delegação.

### 2.2 `adminPortalSecurityIntelligenceService.js`

**Tipo de alteração:** Evolutiva no `case 'INTEGRITY':` — substituição do proxy por consumo real, com fallback para proxy certificado.

**Antes (proxy indirecto):**
```javascript
case 'INTEGRITY':
  status = fail2banActive ? STATUS.OBSERVADA : STATUS.SEM_TELEMETRIA;
  evidence = 'Monitoramento de integridade via threat-watch activo';
  break;
```

**Depois (consumo directo + fallback):**
```javascript
case 'INTEGRITY': {
  // 1. Verificar feature flag
  // 2. Tentar ler estado do Motor (readStateFile)
  // 3a. Estado disponível: determinar status com base em violations/mode
  // 3b. Estado indisponível: fallback para proxy fail2ban (certificado)
  break;
}
```

**Regras de determinação de status:**

| Condição do Motor | Status na Layer |
|---|---|
| `violations > 0` | `ATUOU` |
| `mode === 'DEGRADED'` | `SEM_TELEMETRIA` |
| Motor activo, `violations === 0` | `OBSERVADA` |
| Motor indisponível (fallback) | Proxy via fail2ban |

---

## 3. Fluxo de Dados INT-01D

```
[Motor de Integridade]
  └──▶ IntegrityStateStore.appendEvent()
  └──▶ IntegrityStateStore.update() → /var/lib/impetus/integrity/state.json

[Dashboard Service — buildDashboard()]
  └──▶ getIntegrityState()
       └──▶ IntegrityStateStore.readStateFile()  ← leitura apenas
       └──▶ validar + normalizar
       └──▶ { available, mode, violations, ... }
  └──▶ payload.integrity_state = { ... }

[Security Intelligence — buildProtectionLayers()]
  └──▶ case 'INTEGRITY':
       └──▶ IntegrityStateStore.readStateFile()  ← leitura apenas
       └──▶ determinar status (OBSERVADA | ATUOU | SEM_TELEMETRIA)
       └──▶ ou fallback → proxy fail2ban certificado
```

---

## 4. Ficheiros Modificados

| Ficheiro | Tipo | Linhas adicionadas | Descrição |
|---|---|---|---|
| `adminPortalSecurityDashboardService.js` | Evolução | +68 | `getIntegrityState()`, `getIntegrityObservability()`, `integrity_state` no payload |
| `adminPortalSecurityIntelligenceService.js` | Evolução | +30 | `case 'INTEGRITY':` com consumo real + fallback |

**Ficheiros NÃO modificados:**  
`IntegrityHashChecker.js`, `IntegrityPermChecker.js`, `IntegrityAuditdBridge.js`, `IntegrityCorrelationEngine.js`, `IntegrityEngine.js`, `IntegrityBaselineManager.js`, `IntegrityStateStore.js`, `IntegrityRuntime.js`, `server.js`, todos os serviços certificados (SEC-01→SEC-21C).

---

## 5. Feature Flag

| Estado da Flag | Comportamento |
|---|---|
| `INTEGRITY_SENSOR_ENABLED=false` (default) | `getIntegrityState()` retorna `available: false, reason: 'sensor_disabled'`; Intelligence usa proxy fail2ban |
| `INTEGRITY_SENSOR_ENABLED=true` | `getIntegrityState()` lê state.json; Intelligence usa estado real do motor |

A flag não requer restart do servidor para alterar o comportamento de consumo (a leitura é em tempo real). Para activar o motor propriamente dito (geração de eventos), é necessário restart com a flag activa.

---

## 6. Preservação Forense

| Artefacto | Estado |
|---|---|
| Baseline criptográfico | ✅ Intacto |
| Inventário de activos | ✅ Intacto |
| Shadow log | ✅ Preservado |
| Evidências INT-01A/B/C | ✅ Intactas |
| Mecanismo fail2ban proxy | ✅ Preservado (fallback activo) |

---

**DASHBOARD_CONSUMPTION_ACTIVE = TRUE**  
**NO_BUSINESS_LOGIC_IN_DASHBOARD = TRUE**
