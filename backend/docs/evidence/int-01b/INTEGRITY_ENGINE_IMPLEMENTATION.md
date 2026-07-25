# Motor de Integridade — Implementação

**Documento:** INTEGRITY_ENGINE_IMPLEMENTATION.md  
**Missão:** INT-01B  
**Data:** 2026-07-23  
**Status:** ENGINE_IMPLEMENTED  
**Shadow Mode:** ATIVO (`INTEGRITY_SENSOR_ENABLED=false`)

---

## 1. Componentes implementados

| Ficheiro | Componente | Responsabilidade | Linhas |
|---|---|---|---|
| `IntegrityBaselineManager.js` | Baseline Manager | Leitura e validação de baseline.json e asset_inventory.json | 120 |
| `IntegrityHashChecker.js` | Hash Checker | Stat-first SHA256 diferencial; comparação com baseline | 100 |
| `IntegrityPermChecker.js` | Perm Checker | Verificação de mode bits e owner | 90 |
| `IntegrityAuditdBridge.js` | Auditd Bridge | Polling de audit.log; normalização de eventos auditd | 175 |
| `IntegrityEventBus.js` | Event Bus | FIFO com deduplicação, limite e event_id único | 80 |
| `IntegrityCorrelationEngine.js` | Correlation Engine | Enriquecimento, severidade, supressão, shadow log | 140 |
| `IntegrityEngine.js` | Engine | Orquestrador: inicializa e interliga todos os componentes | 80 |
| `IntegrityRuntime.js` | Runtime | Boot hook: carregamento condicional, watchdog | 60 |
| `tests/runTests.js` | Test Runner | Testes controlados, determinismo, performance, reversibilidade | 270 |

**Total:** 9 ficheiros, ~1115 linhas

---

## 2. Arquitectura implementada vs. especificada

| Especificação (GAP-INT-01-ARCH) | Implementado | Status |
|---|---|---|
| AuditdBridge | `IntegrityAuditdBridge.js` | ✔ |
| HashChecker | `IntegrityHashChecker.js` | ✔ |
| PermChecker | `IntegrityPermChecker.js` | ✔ |
| Integrity Event Bus | `IntegrityEventBus.js` | ✔ |
| Integrity Correlation Engine | `IntegrityCorrelationEngine.js` | ✔ |
| IntegrityEngine (orquestrador) | `IntegrityEngine.js` | ✔ |
| IntegrityRuntime (boot hook) | `IntegrityRuntime.js` | ✔ |
| Baseline Manager | `IntegrityBaselineManager.js` | ✔ |
| Shadow Log | `/var/log/impetus-integrity-shadow.log` | ✔ |

---

## 3. Decisões de implementação

### 3.1 SHA256 via crypto nativo

Utilizado `crypto.createHash('sha256')` do Node.js em vez de spawning `sha256sum`. Motivo: eliminação de overhead de processo filho. Resultado: 0.30ms/hash para `server.js` (104 KB).

### 3.2 Stat-first diferencial

O `HashChecker` verifica `mtime` via `fs.statSync()` antes de calcular SHA256. Se `mtime` não mudou, o hash não é recalculado. Custo normal (sem mudanças): 0.005ms/activo (apenas stat). Isso reduz o overhead de CPU de 33 hashes em 5 minutos para ~0.2ms de CPU por ciclo.

### 3.3 AuditdBridge com offset persistente em memória

O bridge posiciona-se no fim do `audit.log` no arranque (não processa histórico) e avança o offset a cada poll de 5 segundos. Ao detectar log rotation (tamanho < offset), reinicia do início.

### 3.4 EventBus com deduplicação de 30s

A chave de deduplicação é `${asset_path}::${event_type}`. Dentro de 30s, o segundo evento do mesmo tipo no mesmo activo é descartado. Garante que um loop de escrita/leitura não gere spam.

### 3.5 Shadow Mode garantido por flag

O `IntegrityRuntime.init()` verifica `INTEGRITY_SENSOR_ENABLED==='true'` antes de instanciar qualquer componente. Com a flag em `false`, o módulo carrega (sem erro) mas o motor não é iniciado. Verificado: `getEngine() === null`.

### 3.6 Hook no server.js — padrão consistente

```javascript
// INT-01B — Integrity Sensor (INTEGRITY_SENSOR_ENABLED=false default; shadow mode).
try {
  const integrityRuntime = require('./services/integrity/IntegrityRuntime');
  integrityRuntime.init();
} catch (e) {
  console.warn('[INTEGRITY_SENSOR_BOOT]', e && e.message ? e.message : e);
}
```

Segue exactamente o padrão SEC-21C e demais módulos de segurança. Falha do sensor nunca derruba o servidor.

---

## 4. Shadow log

Localização: `/var/log/impetus-integrity-shadow.log`

Formato: NDJSON (uma linha JSON por evento), com header de sessão em texto.

```
[2026-07-23T13:04:48.651Z] INTEGRITY_SHADOW_SESSION_START pid=3128769 SHADOW_MODE=true
{"event_id":"int-20260723130448-0013","schema_version":"1.0","timestamp":"...","event_type":"INTEGRITY_HASH_CHANGED",...}
```

**Consumidores actuais:** nenhum (shadow mode). **Futuro (INT-01C):** `adminPortalSecurityDashboardService.js`.

---

## 5. Estrutura de ficheiros criada

```
backend/src/services/integrity/
├── IntegrityBaselineManager.js
├── IntegrityHashChecker.js
├── IntegrityPermChecker.js
├── IntegrityAuditdBridge.js
├── IntegrityEventBus.js
├── IntegrityCorrelationEngine.js
├── IntegrityEngine.js
├── IntegrityRuntime.js
└── tests/
    └── runTests.js
```

---

## 6. Ficheiros de produção alterados

| Ficheiro | Alteração | Impacto |
|---|---|---|
| `backend/src/server.js` | Adicionadas 7 linhas (hook try-catch) após SEC-21C | Zero impacto: flag=false, motor não activo |

**Total de alterações em código de produção existente:** 7 linhas adicionadas em 1 ficheiro. Zero linhas modificadas em ficheiros certificados.
