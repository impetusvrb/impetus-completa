# GAP-INT-01 — Arquitectura Oficial do Sensor de Integridade IMPETUS

**Missão:** GAP-INT-01-ARCH  
**Data:** 2026-07-23  
**Status:** ARCHITECTURE_DEFINED  
**Baseline de referência:** SEC-BASELINE-001 v1.0  
**GAP_INT_01_ARCH_STATUS:** PASS  
**NO_PRODUCTION_CODE_CHANGED:** TRUE

---

## 1. Contexto e motivação

A camada `INTEGRITY` no painel *Camadas de Proteção* está classificada como `CERTIFIED_WITH_LIMITATIONS` por utilizar `fail2ban.available` como proxy de integridade. Esta dependência indirecta significa que:

- estado `OBSERVADA` é exibido mesmo que um ficheiro crítico tenha sido modificado
- o sensor não distingue "sistema íntegro" de "fail2ban a correr"
- a camada não possui telemetria própria

Este documento define a arquitectura do sensor dedicado que eliminará esta limitação (GAP-INT-01).

---

## 2. Princípios de design

| Princípio | Implementação |
|---|---|
| Desacoplado | Módulo próprio, sem dependência de fail2ban ou outros mecanismos de segurança |
| Orientado a eventos | Gera eventos discretos por ficheiro/activo afectado |
| Baixo consumo | Hash diferencial (não re-hash de tudo a cada ciclo); inotify via kernel |
| Não-bloqueante | Processo assíncrono; nunca no critical path do servidor Express |
| Auditd-first | Aproveita infra auditd já instalada e activa |
| Extensível | Event bus interno preparado para correlação SEC-01/SEC-02 |

---

## 3. Aproveitamento de infraestrutura existente

O IMPETUS já possui:

| Recurso | Estado | Papel no sensor |
|---|---|---|
| `auditd` activo | ✔ em produção | Fonte kernel-level: deleções, writes, rename, `.env` |
| Regras `impetus_repo_write`, `impetus_delete`, `impetus_env` | ✔ activas | Primeiros eventos de integridade já gerados |
| `sha256sum` / `md5sum` | ✔ disponíveis | Hash baseline checker |
| Node.js `fs.watch` (inotify) | ✔ funciona | Watch de alta frequência em ficheiros seleccionados |
| threat-watch log (`/var/log/impetus-threat-watch.log`) | ✔ pipeline certificado | Canal de saída de alertas de integridade |
| `adminPortalSecurityDashboardService.js` | ✔ certificado | Ponto de consumo no painel |
| `/var/lib/impetus/` | ✔ em uso | Estado persistente do sensor |

---

## 4. Arquitectura de componentes

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        INTEGRITY SENSOR — IMPETUS                            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     INTEGRITY WATCHERS                              │    │
│  │                                                                     │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │    │
│  │  │  AuditdBridge    │  │   HashChecker    │  │  PermChecker     │  │    │
│  │  │                  │  │                  │  │                  │  │    │
│  │  │ Lê /var/log/     │  │ SHA256 periódico │  │ stat() permissões│  │    │
│  │  │ audit/audit.log  │  │ contra baseline  │  │ owner / mode     │  │    │
│  │  │ Filtra por key   │  │ diff-hash only   │  │ em ficheiros     │  │    │
│  │  │ impetus_*        │  │ (só lê se mtime  │  │ críticos         │  │    │
│  │  │                  │  │  mudou)          │  │                  │  │    │
│  │  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  │    │
│  │           │                     │                      │            │    │
│  └───────────┼─────────────────────┼──────────────────────┼────────────┘    │
│              │                     │                      │                 │
│              └─────────────┬───────┘──────────────────────┘                 │
│                            ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                 INTEGRITY EVENT BUS (in-process)                    │    │
│  │                                                                     │    │
│  │  EventEmitter | fila FIFO | deduplica por (asset, event_type, 30s) │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
│                                   ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              INTEGRITY CORRELATION ENGINE                           │    │
│  │                                                                     │    │
│  │  • Classifica severidade (CRITICAL/HIGH/MEDIUM/LOW)                 │    │
│  │  • Enriquece com contexto (activo, criticidade, baseline)           │    │
│  │  • Suprime falsos positivos (deploy em curso, certbot renewal)      │    │
│  │  • Agrupa eventos relacionados (burst protection)                   │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
│                                   ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │               INTEGRITY STATE STORE                                 │    │
│  │                                                                     │    │
│  │  /var/lib/impetus/integrity/                                        │    │
│  │    baseline.json    — hashes de referência                          │    │
│  │    state.json       — estado actual (ok | violated | unknown)       │    │
│  │    events.jsonl     — log de eventos de integridade                 │    │
│  └────────────────────────────────┬────────────────────────────────────┘    │
│                                   ▼                                         │
└───────────────────────────────────┼─────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼────────────────────────┐
              ▼                     ▼                        ▼
  ┌───────────────────┐  ┌─────────────────────┐  ┌──────────────────┐
  │   threat-watch    │  │  Dashboard Service  │  │  Observatory     │
  │   log             │  │                     │  │  (SEC-01)        │
  │                   │  │  getIntegrityState()│  │                  │
  │  ALERT CRITICAL   │  │  → replace proxy    │  │  ingestão futura │
  │  INTEGRITY_BREACH │  │    fail2ban         │  │                  │
  └───────────────────┘  └──────────┬──────────┘  └──────────────────┘
                                    ▼
                      ┌─────────────────────────┐
                      │   PAINEL — INTEGRITY    │
                      │                         │
                      │  ATUOU / OBSERVADA /    │
                      │  SEM_TELEMETRIA         │
                      └─────────────────────────┘
```

---

## 5. FASE 1 — Inventário de activos

### Criticidade CRÍTICA — violação é incidente de segurança imediato

| Activo | Caminho | Tipo | Auditd existente |
|---|---|---|---|
| Servidor Node.js principal | `backend/src/server.js` | Ficheiro JS | Parcial (repo_write) |
| Variáveis de ambiente | `backend/.env` | Config | ✔ `impetus_env` |
| Ecosystem PM2 runtime | `ecosystem.runtime.config.cjs` | Config | Parcial |
| Nginx site config | `/etc/nginx/sites-enabled/impetus` | Config | — |
| Proxy guard CF | `/etc/nginx/snippets/impetus-cloudflare-proxy-guard.conf` | Config | — |
| Hardening locations | `/etc/nginx/snippets/impetus-hardening-locations.conf` | Config | — |
| Certificado TLS (cert.pem) | `/etc/letsencrypt/live/plataformaimpetus.com/cert.pem` | Cert | — |
| Chave TLS (privkey.pem) | `/etc/letsencrypt/live/plataformaimpetus.com/privkey.pem` | Chave | — |
| Fail2ban jail IMPETUS | `/etc/fail2ban/jail.d/impetus.conf` | Config | — |
| Auditd rules IMPETUS | `/etc/audit/rules.d/impetus.rules` | Config | — |

### Criticidade ALTA — violação deve gerar alerta e investigação

| Activo | Caminho | Tipo |
|---|---|---|
| Dashboard service | `backend/src/services/adminPortalSecurityDashboardService.js` | JS |
| Intelligence service | `backend/src/services/adminPortalSecurityIntelligenceService.js` | JS |
| Security gateway | `backend/src/security/` (directório) | JS |
| Threat-watch script | `/usr/local/bin/impetus-threat-watch.sh` | Script |
| Emergency lockdown | `/usr/local/bin/impetus-breach-lockdown-engine.sh` | Script |
| Infra scripts | `/var/www/impetus-completa/infra/scripts/*.sh` | Scripts |
| PM2 pids | `/root/.pm2/pids/` | Runtime |

### Criticidade MÉDIA — violação requer registo e review

| Activo | Tipo |
|---|---|
| `backend/src/routes/` (directório) | Rotas da API |
| `backend/src/middleware/` (directório) | Middleware de segurança |
| `frontend/` (directório) | Build frontend |
| `admin-portal/dist/` (directório) | Build admin |
| `/etc/cron.d/impetus-*` | Crons de segurança |
| `/usr/local/bin/impetus-*.sh` | Scripts operacionais |

### Fora de escopo (voláteis por design)

| Tipo | Razão |
|---|---|
| `node_modules/` | Dependências; hash instável; falso positivo em `npm install` |
| `*.log` | Voláteis por natureza |
| `uploads/` | Dados de utilizador; mutações legítimas constantes |
| `data/` cognitivo | Estado cognitivo; mutações legítimas |
| `/tmp/` | Temporários |

---

## 6. FASE 2 — Fontes e tipos de eventos

| Tipo de evento | Código | Severidade default | Fonte |
|---|---|---|---|
| Hash alterado (conteúdo) | `INTEGRITY_HASH_CHANGED` | CRITICAL (activo crítico) / HIGH (alto) | HashChecker |
| Permissão alterada | `INTEGRITY_PERM_CHANGED` | HIGH | PermChecker |
| Owner alterado | `INTEGRITY_OWNER_CHANGED` | CRITICAL | PermChecker |
| Ficheiro apagado | `INTEGRITY_FILE_DELETED` | CRITICAL | AuditdBridge |
| Ficheiro criado (inesperado) | `INTEGRITY_FILE_CREATED` | MEDIUM | AuditdBridge |
| Ficheiro renomeado/substituído | `INTEGRITY_FILE_RENAMED` | HIGH | AuditdBridge |
| Corrupção (hash inválido) | `INTEGRITY_HASH_INVALID` | CRITICAL | HashChecker |
| Variável de ambiente alterada | `INTEGRITY_ENV_CHANGED` | CRITICAL | AuditdBridge + HashChecker |
| Certificado substituído | `INTEGRITY_CERT_CHANGED` | CRITICAL | HashChecker |
| Script de segurança modificado | `INTEGRITY_SCRIPT_CHANGED` | HIGH | HashChecker |
| Baseline ausente | `INTEGRITY_BASELINE_MISSING` | HIGH | HashChecker |
| Sensor inactivo | `INTEGRITY_SENSOR_DOWN` | HIGH | Watchdog interno |

---

## 7. Substituição do proxy fail2ban

**Actual (proxy):**
```javascript
// adminPortalSecurityIntelligenceService.js
case 'INTEGRITY':
  status = fail2banActive ? STATUS.OBSERVADA : STATUS.SEM_TELEMETRIA;
  evidence = 'Monitoramento de integridade via threat-watch activo';
```

**Futuro (sensor dedicado):**
```
getIntegrityState() →
  state.json em /var/lib/impetus/integrity/
    { ok: true, last_check: ISO, violations: 0, sensor_active: true }
     → OBSERVADA (sistema íntegro + sensor activo)
    { ok: false, violations: N, last_event: {...} }
     → ATUOU (violação detectada)
    { sensor_active: false } ou ausência do ficheiro
     → SEM_TELEMETRIA
```

A leitura de `state.json` é síncrona e O(1) — sem impacto no critical path.

---

## 8. Decisões arquitecturais chave

| Decisão | Escolha | Justificativa |
|---|---|---|
| Fonte kernel | auditd (já activo) | Sem overhead adicional; regras IMPETUS já instaladas |
| Fonte userspace | Node.js `fs.watch` (inotify) | Nativo; sem dependência nova |
| Hash algorithm | SHA256 (sha256sum) | Disponível no sistema; padrão forense |
| Persistência state | JSON em `/var/lib/impetus/integrity/` | Simples, legível, sem dependência de DB |
| Canal de saída | threat-watch log (formato ALERT existente) | Reutiliza pipeline certificado; sem novo canal |
| Frequência hash check | A cada 5 minutos (configurable via env) | Balanço segurança/CPU; auditd cobre os eventos imediatos |
| Integração no backend | Módulo `integrityMonitorService.js` opcional | Carregado na inicialização do servidor; `setInterval` não bloqueante |

---

## 9. Invariantes de design (não podem ser violadas na implementação)

1. O sensor nunca bloqueia o process.mainThread do Express
2. Falha do sensor não derruba o servidor (try-catch total)
3. `state.json` é escrito atomicamente (write temp + rename)
4. Baseline é criado apenas por operação explícita (`--init-baseline`)
5. Eventos de deploy legítimos são suprimidos quando `IMPETUS_DEPLOY_MODE=active`
6. O sensor não altera nenhum ficheiro monitorado
7. Log de eventos é append-only (`events.jsonl`)
