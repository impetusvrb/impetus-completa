# Integrity Telemetry Architecture — IMPETUS

**Documento:** INTEGRITY_TELEMETRY_ARCHITECTURE.md  
**Missão:** GAP-INT-01-ARCH  
**Data:** 2026-07-23  
**Status:** TELEMETRY_DEFINED

---

## 1. Decisão arquitectural: modelo híbrido

### Opções avaliadas

| Modelo | Vantagens | Desvantagens |
|---|---|---|
| Polling puro (dashboard lê ficheiros) | Simples; sem estado partilhado; retrocompatível | Lag até N segundos; carga desnecessária quando não há eventos |
| Push via WebSocket | Tempo real; eficiente | Requer canal WS extra; overhead de conexão persistente |
| Fila (Redis/queue) | Desacoplado; buffer em memória | Nova dependência (Redis); overhead operacional |
| Eventos SSE | Leve; unidireccional | Não persiste; perde eventos se cliente desconectado |
| **Híbrido: state file + polling leve** | **Zero dependência nova; O(1) leitura; retrocompatível; auditável** | Lag de até 30s (aceitável para integridade) |

### Decisão: Híbrido State File + Polling

**Justificativa:**
1. O painel de segurança já usa polling para Rate Limiting e UFW (leitura de ficheiros/logs)
2. A integridade não é tempo real crítico sub-segundo (não é firewall activo)
3. `state.json` é O(1) para leitura; actualizado pelo sensor a cada evento
4. Zero novas dependências (sem Redis, sem WebSocket extra)
5. Auditável: o estado é um ficheiro legível em disco
6. Resiliente: mesmo se o sensor parar, o último estado persiste

---

## 2. Fluxo completo de telemetria

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRODUÇÃO DE TELEMETRIA                              │
│                                                                             │
│  ┌──────────────┐  evento  ┌──────────────┐  estado  ┌──────────────────┐  │
│  │  Integrity   │ ───────► │  Correlation │ ───────► │  state.json      │  │
│  │  Watchers    │          │  Engine      │          │  (atomic write)  │  │
│  └──────────────┘          └──────────────┘          └──────────────────┘  │
│                                    │                          │             │
│                                    │ alerta                   │             │
│                                    ▼                          │             │
│                    ┌───────────────────────────┐              │             │
│                    │  threat-watch.log (append) │              │             │
│                    │  ALERT CRITICAL INTEGRITY  │              │             │
│                    └───────────────────────────┘              │             │
│                                                               │             │
│                    ┌───────────────────────────┐              │             │
│                    │  events.jsonl (append)     │              │             │
│                    │  { schema_version, ... }   │              │             │
│                    └───────────────────────────┘              │             │
└───────────────────────────────────────────────────────────────┼─────────────┘
                                                                │
┌───────────────────────────────────────────────────────────────┼─────────────┐
│                         CONSUMO DE TELEMETRIA                  │             │
│                                                               ▼             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              adminPortalSecurityDashboardService.js                 │   │
│  │                                                                     │   │
│  │   getIntegrityState()                                               │   │
│  │   ├── readFileSync('/var/lib/impetus/integrity/state.json')         │   │
│  │   │   → O(1); sincronizado pelo sensor                             │   │
│  │   └── parseIntegrityHits(threatWatchLog, window=1h)                 │   │
│  │       → reutiliza parser existente; filtra INTEGRITY_BREACH        │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                         │
│                                   ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              adminPortalSecurityIntelligenceService.js              │   │
│  │                                                                     │   │
│  │   buildProtectionLayers()                                           │   │
│  │   case 'INTEGRITY':                                                 │   │
│  │     integrityState = payload.integrity_state                       │   │
│  │     if (!integrityState || !integrityState.sensor_active)           │   │
│  │       → STATUS.SEM_TELEMETRIA                                      │   │
│  │     else if (integrityState.violations > 0)                         │   │
│  │       → STATUS.ATUOU                                               │   │
│  │     else                                                            │   │
│  │       → STATUS.OBSERVADA                                           │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   ▼                                         │
│                     ┌─────────────────────────┐                            │
│                     │      PAINEL ADMIN        │                            │
│                     │   Camada: INTEGRITY      │                            │
│                     │   Estado: OBSERVADA /    │                            │
│                     │           ATUOU /        │                            │
│                     │           SEM_TELEMETRIA │                            │
│                     └─────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detalhe da função getIntegrityState()

A nova função a implementar no `adminPortalSecurityDashboardService.js`:

```javascript
// ARQUITECTURA (não implementar até INT-01C)
function getIntegrityState() {
  const stateFile = process.env.INTEGRITY_STATE_DIR
    ? `${process.env.INTEGRITY_STATE_DIR}/state.json`
    : '/var/lib/impetus/integrity/state.json';

  try {
    if (!fs.existsSync(stateFile)) {
      return { sensor_active: false, violations: 0, ok: null };
    }
    const raw = fs.readFileSync(stateFile, 'utf8');
    const state = JSON.parse(raw);
    const maxAge = 2 * (parseInt(process.env.INTEGRITY_HASH_CHECK_INTERVAL || '300', 10) * 1000);
    const lastCheck = new Date(state.last_check).getTime();
    if (Date.now() - lastCheck > maxAge) {
      return { sensor_active: false, stale: true, violations: 0 };
    }
    return state;
  } catch {
    return { sensor_active: false, error: true, violations: 0 };
  }
}
```

**Nota:** Esta função deve ser colocada na fase INT-01C (Telemetria), após o sensor existir.

---

## 4. Integração no collectSecurityEvidence()

Na fase de implementação (INT-01C), o fluxo de colecta será:

```javascript
// Dentro do Promise.all existente em collectSecurityEvidence():
const integrityStateRaw = getIntegrityState();

// No payload final:
payload.integrity_state = integrityStateRaw;
payload.integrity_hits = parseIntegrityHits(threatWatchLog, windowMs);
```

`parseIntegrityHits()` reutiliza o parser já existente para threat-watch, filtrando por `INTEGRITY_BREACH` ou `INTEGRITY_ANOMALY` no campo event_type.

---

## 5. Definição formal dos estados (FASE 6)

### OBSERVADA

**Critério:** O sensor está activo (`sensor_active: true`), `last_check` é recente (< 2× intervalo), e não há violações activas (`violations: 0`).

**Significado:** Sistema monitorado, íntegro até ao último check.

**Evidência:** `state.json` com `ok: true` e `last_check` recente.

---

### ATUOU

**Critério:** O sensor está activo E (`violations > 0` OU existem eventos `INTEGRITY_BREACH` no threat-watch log na janela de análise).

**Significado:** Uma ou mais violações de integridade foram detectadas no período analisado.

**Evidência:** `state.json` com `violations > 0` e/ou entradas em `events.jsonl` e/ou ALERT no threat-watch log.

---

### SEM_TELEMETRIA

**Critério:** `state.json` não existe OU `sensor_active: false` OU `last_check` está desactualizado (> 2× intervalo) OU erro ao ler ficheiro.

**Significado:** Sensor de integridade não está a operar; não é possível determinar estado do sistema.

**Nota importante:** `SEM_TELEMETRIA` não significa que o sistema está comprometido. Significa ausência de observabilidade.

---

### N/A

**Critério:** Não aplicável nesta arquitectura. A camada INTEGRITY é relevante para qualquer instância IMPETUS em produção.

**Excepção teórica:** Ambiente de desenvolvimento local sem activos de produção (fora de escopo deste documento).

---

## 6. Janelas de tempo

| Janela | Uso |
|---|---|
| Janela de análise do painel | Configurável; default 1h (alinhado com outras camadas) |
| Janela de staleness do sensor | 2 × `INTEGRITY_HASH_CHECK_INTERVAL` (default 10min) |
| Janela de desduplicação de eventos | 30s (no Event Bus) |
| Janela de supressão deploy | `INTEGRITY_DEPLOY_SUPPRESS_MINUTES` (default 10min) |
| Retenção de events.jsonl | 30 dias (rotação por tamanho máx 50 MB) |

---

## 7. Retrocompatibilidade com proxy fail2ban

Durante a transição (fases INT-01A → INT-01C), o painel continua a usar o proxy `fail2ban.available`. A substituição é feita apenas na fase INT-01C, quando `getIntegrityState()` estiver disponível.

**Mecanismo de transição:**
```javascript
// Na fase INT-01C (implementação futura):
if (integrityState && integrityState.sensor_active) {
  // Novo: usar estado real do sensor
  status = integrityState.violations > 0 ? ATUOU : OBSERVADA;
} else {
  // Fallback: proxy legado até sensor ser instalado
  status = fail2banActive ? OBSERVADA : SEM_TELEMETRIA;
  evidence += ' [proxy legado — sensor não activo]';
}
```

Este mecanismo garante zero regressão durante a implementação incremental.

---

## 8. FASE 7 — Correlação com outros sistemas

### Security Observatory (SEC-01)

**Mecanismo futuro:** O sensor emite eventos com `escalate_to_observatory: true`. O Observatory Script (`impetus-security-observatory-ingest.sh`) ou um adaptador Node.js lê os eventos de integridade de `events.jsonl` e os injeta no pipeline do Observatory.

**Interface:** Rota `/api/security/observatory/ingest` (existente) com payload de evento de integridade.

**Prioridade de correlação:** Evento `INTEGRITY_HASH_CHANGED` em `server.js` + evento de login SSH root → escalada automática para INCIDENT.

### Security Intelligence

**Mecanismo futuro:** O campo `integrity_state` no payload de evidência já circula para o `adminPortalSecurityIntelligenceService.js`. Nenhuma interface nova necessária.

### SEC-01 (Monitoramento Contínuo)

**Mecanismo futuro:** O threat-watch log já é consumido por SEC-01. Eventos `INTEGRITY_BREACH` no formato ALERT são automaticamente processados pelo pipeline existente.

**Zero alteração em SEC-01** necessária.

### SEC-02 (Auditoria)

**Mecanismo futuro:** O `events.jsonl` constitui log forense de integridade. O auditd já captura os eventos kernel. A correlação AuditdBridge + events.jsonl cobre SEC-02 completamente.

### Incident Response

**Mecanismo futuro:** `violations > 0` com `severity=CRITICAL` pode ser configurado para acionar `impetus-breach-lockdown-engine.sh` via webhook interno. Não implementar automaticamente; exigir aprovação explícita.

---

## 9. FASE 8 — Performance estimada

### Custo por componente

| Componente | CPU (idle) | CPU (evento) | Memória | IO |
|---|---|---|---|---|
| AuditdBridge | < 0.1% | < 0.5% (parse) | ~5 MB | Tail de audit.log; ~1 MB/h |
| HashChecker (42 activos) | < 0.1% (stat) | < 1% (hash burst) | ~5 MB | ~4 MB/check (ficheiros críticos) |
| PermChecker | < 0.1% | < 0.1% | ~2 MB | stat() apenas; negligível |
| Event Bus + Correlation | < 0.1% | < 0.2% | ~3 MB | Writes para state.json (~2 KB/write) |
| **Total estimado** | **< 0.5%** | **< 2% (transiente)** | **~15 MB** | **< 10 MB/h** |

### Contexto do sistema

- 2 CPUs AMD EPYC 9354P; ~8 GB RAM; ~4.7 GB disponível
- Impacto do sensor: **negligível** no sistema actual
- Sem impacto no throughput Express: módulo assíncrono, `setInterval`-based

### Escalabilidade

| Cenário | Impacto |
|---|---|
| 100 activos monitorados | Custo: +0.2% CPU/check; +10 MB memória |
| 1000 activos | Paralelização de hash em workers necessária (fase futura) |
| 10 eventos/segundo | Event Bus aguenta; throttle activo acima de 50/s |
| audit.log de 1 GB | Offset persistence necessária (já previsto no design) |

---

## 10. FASE 9 — Riscos de segurança e mitigações

### Falsos positivos

| Cenário | Risco | Mitigação arquitectural |
|---|---|---|
| Deploy legítimo | Hash muda durante `git pull` + `npm install` | `IMPETUS_DEPLOY_MODE` suprime por 10 min |
| Certbot renewal | `cert.pem` substituído | Supressão automática por path `letsencrypt` |
| Log rotation | Ficheiros `.log` | Excluídos do scope por categoria |
| `npm install` | `node_modules/` muda | Excluído do scope |
| Actualização manual autorizada | Admin faz mudança legítima | `--init-baseline` redefine após mudança autorizada |

### Falsos negativos

| Cenário | Risco | Mitigação arquitectural |
|---|---|---|
| Ataque cria cópia, modifica, substitui | Rename não gera HASH_CHANGED | AuditdBridge capta rename; `impetus_delete` ativo |
| Rootkit edita em memória (sem tocar disco) | Hash não detecta | Fora de escopo deste sensor; requer análise de memória |
| Ataque modifica baseline | Baseline comprometido | Baseline em directório 700 root; hash do baseline em log separado |
| `stat()` falsificado (kernel hook) | mtime não muda | Double-check: hash forçado periodicamente independente de mtime |

### Evasão

| Técnica | Mitigação |
|---|---|
| Restaurar ficheiro original após modificação (race condition) | Hash + auditd: write + restore ambos capturados no audit.log |
| Modificar audit.log para apagar evidência | Auditd com `-f 1` (falha em perda); `impetus_exec_rm` capta tentativa |
| Parar o sensor | Watchdog detecta; evento `INTEGRITY_SENSOR_DOWN` gerado |
| Modificar state.json directamente | state.json é sobrescrito a cada ciclo pelo sensor; adulteração detectada em < 1 ciclo |

### Adulteração do sensor

| Vector | Mitigação |
|---|---|
| Modificar `integrityMonitorService.js` | O próprio sensor monitora os ficheiros de serviço; hash do serviço no baseline |
| Injectar código no server.js | `INTEGRITY_HASH_CHANGED` em `server.js` → alerta CRITICAL |
| Desactivar via `INTEGRITY_SENSOR_ENABLED=false` | Requer acesso ao `.env`; `.env` monitorado por auditd (`impetus_env`) |

### Sabotagem (DoS do sensor)

| Vector | Mitigação |
|---|---|
| Gerar milhares de eventos para saturar | Throttle no Event Bus (50 eventos/s máx); burst aggregation |
| Encher disco com events.jsonl | Rotação por tamanho (50 MB máx); cron de limpeza |
| OOM do processo | Sensor em try-catch total; não afecta servidor principal |

### Riscos remanescentes (a resolver em fases posteriores)

| Risco | ID | Fase de resolução |
|---|---|---|
| Sem detecção de rootkits em memória | RISK-INT-01 | Fora de escopo; requer solução especializada |
| Baseline comprometido antes do init | RISK-INT-02 | INT-01B: hash do baseline assinado |
| Cobertura parcial de activos (lista manual) | RISK-INT-03 | INT-01B: descoberta automática de activos |
| Sem correlação automática → Incident | RISK-INT-04 | SEC-OBS-002: integração com Observatory |
