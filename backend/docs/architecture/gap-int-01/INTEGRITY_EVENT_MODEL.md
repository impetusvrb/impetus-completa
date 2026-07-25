# Integrity Event Model — IMPETUS

**Documento:** INTEGRITY_EVENT_MODEL.md  
**Missão:** GAP-INT-01-ARCH  
**Data:** 2026-07-23  
**Status:** EVENT_MODEL_DEFINED

---

## 1. Princípios do modelo de eventos

- Todos os eventos de integridade partilham um schema comum
- Campos obrigatórios são sempre preenchidos (nunca `null` nos obrigatórios)
- Campos opcionais têm valor `null` quando não aplicável
- O modelo é versionado (`schema_version`) para evolução retrocompatível
- Compatível com o formato NDJSON para persistência em `events.jsonl`

---

## 2. Schema completo do evento de integridade

```json
{
  "schema_version": "1.0",
  "event_id": "int-20260723-080500-001",
  "timestamp": "2026-07-23T08:05:00.000Z",
  "sensor_component": "HashChecker",

  "asset": {
    "path": "/var/www/impetus-completa/backend/src/server.js",
    "name": "server.js",
    "category": "BACKEND_CORE",
    "criticality": "CRITICAL",
    "type": "JS_EXECUTABLE"
  },

  "event_type": "INTEGRITY_HASH_CHANGED",
  "severity": "CRITICAL",

  "origin": {
    "source": "HashChecker",
    "method": "SHA256_DIFFERENTIAL",
    "auditd_key": null,
    "pid": null,
    "uid": null,
    "username": null,
    "syscall": null
  },

  "integrity": {
    "hash_algorithm": "SHA256",
    "hash_previous": "a3f5c8b2d4e9f1a7c3b5d2e8f4a6c1b9d3e7f5a2c8b4d6e9f2a5c7b3d1e8f6",
    "hash_current":  "b7e2a4c9d5f8b3e1a6c2d4f7b5e9c3a8d2f6b4e1c7a5d3f9b2e8c6a4d1f5b3",
    "hash_match": false,
    "perm_previous": null,
    "perm_current": null,
    "perm_match": null,
    "owner_previous": null,
    "owner_current": null,
    "file_existed_before": true,
    "file_exists_now": true
  },

  "context": {
    "deploy_mode_active": false,
    "suppress_reason": null,
    "false_positive_score": 0,
    "correlated_events": [],
    "time_since_last_ok": 300
  },

  "confidence": "HIGH",
  "confidence_factors": ["auditd_confirm", "hash_double_check"],

  "response_required": true,
  "escalate_to_observatory": true,

  "raw_auditd_record": null
}
```

---

## 3. Campos obrigatórios

| Campo | Tipo | Descrição |
|---|---|---|
| `schema_version` | string | Versão do schema ("1.0") |
| `event_id` | string | ID único: `int-{date}-{time}-{seq}` |
| `timestamp` | ISO 8601 | Momento da detecção (UTC) |
| `sensor_component` | string | `AuditdBridge` \| `HashChecker` \| `PermChecker` \| `Watchdog` |
| `asset.path` | string | Caminho absoluto do activo |
| `asset.criticality` | enum | `CRITICAL` \| `HIGH` \| `MEDIUM` \| `LOW` |
| `event_type` | enum | Ver tabela de tipos de eventos |
| `severity` | enum | `CRITICAL` \| `HIGH` \| `MEDIUM` \| `LOW` |
| `origin.source` | string | Componente que gerou o evento |
| `confidence` | enum | `HIGH` \| `MEDIUM` \| `LOW` |

---

## 4. Campos opcionais (null quando não disponíveis)

| Campo | Disponível em |
|---|---|
| `origin.pid` | AuditdBridge (syscall records) |
| `origin.uid` | AuditdBridge (syscall records) |
| `origin.username` | AuditdBridge (após resolução) |
| `origin.syscall` | AuditdBridge |
| `origin.auditd_key` | AuditdBridge |
| `integrity.hash_previous` | HashChecker (quando baseline existe) |
| `integrity.hash_current` | HashChecker |
| `integrity.perm_previous` | PermChecker |
| `integrity.perm_current` | PermChecker |
| `raw_auditd_record` | AuditdBridge (linha raw opcional) |

---

## 5. Enumerações

### 5.1 event_type

| Código | Descrição | Severidade padrão |
|---|---|---|
| `INTEGRITY_HASH_CHANGED` | Hash SHA256 diverge do baseline | CRITICAL (activo crítico) / HIGH (alto) |
| `INTEGRITY_HASH_INVALID` | Ficheiro não pode ser lido / corrompido | CRITICAL |
| `INTEGRITY_PERM_CHANGED` | Mode bits alterados | HIGH |
| `INTEGRITY_OWNER_CHANGED` | UID/GID alterado | CRITICAL |
| `INTEGRITY_FILE_DELETED` | Activo crítico apagado | CRITICAL |
| `INTEGRITY_FILE_CREATED` | Ficheiro novo em directório controlado | MEDIUM |
| `INTEGRITY_FILE_RENAMED` | Activo renomeado / substituído | HIGH |
| `INTEGRITY_ENV_CHANGED` | `.env` ou config crítico modificado | CRITICAL |
| `INTEGRITY_CERT_CHANGED` | Certificado TLS substituído | CRITICAL |
| `INTEGRITY_SCRIPT_CHANGED` | Script de segurança modificado | HIGH |
| `INTEGRITY_BASELINE_MISSING` | Baseline ausente para activo | HIGH |
| `INTEGRITY_SENSOR_DOWN` | Sensor de integridade inactivo | HIGH |
| `INTEGRITY_ANOMALY` | Evento genérico (classificação futura) | MEDIUM |

### 5.2 asset.category

| Categoria | Descrição |
|---|---|
| `BACKEND_CORE` | `server.js`, serviços core |
| `BACKEND_SECURITY` | Serviços de segurança |
| `BACKEND_ROUTES` | Rotas da API |
| `BACKEND_MIDDLEWARE` | Middleware |
| `CONFIG_ENV` | Variáveis de ambiente |
| `CONFIG_PM2` | Configuração PM2 |
| `CONFIG_NGINX` | Configuração Nginx |
| `CONFIG_SECURITY_RULE` | auditd, fail2ban rules |
| `CERT_TLS` | Certificados TLS |
| `SCRIPT_SECURITY` | Scripts de segurança |
| `SCRIPT_INFRA` | Scripts de infraestrutura |

### 5.3 confidence

| Nível | Critérios |
|---|---|
| `HIGH` | AuditdBridge + HashChecker confirmam; uid/pid disponível; sem supressão activa |
| `MEDIUM` | Apenas uma fonte confirma; ou hash confirma mas sem uid auditd |
| `LOW` | Inferência indirecta; supressão parcialmente activa; timestamp incerto |

---

## 6. Regras de severidade

A severidade final é calculada pelo Correlation Engine:

```
severity = max(
  default_severity_for_event_type,
  asset_criticality_severity
)
```

Excepções:
- `INTEGRITY_SENSOR_DOWN` é sempre `HIGH` independente do activo
- Eventos com `deploy_mode_active=true` têm severidade reduzida para `LOW` (suprimidos do alerta mas registados)
- `false_positive_score >= 80` → evento registado mas não alertado

---

## 7. Campos de resposta (response metadata)

| Campo | Tipo | Descrição |
|---|---|---|
| `response_required` | bool | Se o evento requer acção operacional |
| `escalate_to_observatory` | bool | Se deve ser enviado ao SEC-01 Observatory |
| `context.false_positive_score` | 0-100 | Score calculado pelo Correlation Engine |
| `context.suppress_reason` | string? | Razão de supressão se aplicável |
| `context.correlated_events` | string[] | IDs de eventos relacionados |

---

## 8. Persistência em events.jsonl

Cada linha é um JSON completo (NDJSON). Exemplo de linha real:

```json
{"schema_version":"1.0","event_id":"int-20260723-080500-001","timestamp":"2026-07-23T08:05:00.000Z","sensor_component":"HashChecker","asset":{"path":"/var/www/impetus-completa/backend/src/server.js","name":"server.js","category":"BACKEND_CORE","criticality":"CRITICAL","type":"JS_EXECUTABLE"},"event_type":"INTEGRITY_HASH_CHANGED","severity":"CRITICAL","origin":{"source":"HashChecker","method":"SHA256_DIFFERENTIAL","auditd_key":null,"pid":null,"uid":null,"username":null,"syscall":null},"integrity":{"hash_algorithm":"SHA256","hash_previous":"a3f5...","hash_current":"b7e2...","hash_match":false,"perm_previous":null,"perm_current":null,"perm_match":null,"owner_previous":null,"owner_current":null,"file_existed_before":true,"file_exists_now":true},"context":{"deploy_mode_active":false,"suppress_reason":null,"false_positive_score":0,"correlated_events":[],"time_since_last_ok":300},"confidence":"HIGH","confidence_factors":["hash_double_check"],"response_required":true,"escalate_to_observatory":true,"raw_auditd_record":null}
```

---

## 9. Compatibilidade com formato threat-watch

Para o canal de saída ao threat-watch log, o evento é serializado como:

```
[{timestamp}] ALERT {severity} INTEGRITY_BREACH {origin_ip} "{event_type} {asset.path} prev={hash_previous_short} curr={hash_current_short}"
```

Onde `{origin_ip}` = `0.0.0.0` quando origem é interna (não há IP cliente). O campo `detail` entre aspas é parsing-safe (sem newlines).

---

## 10. Evolução do schema

| Versão | Data | Mudanças |
|---|---|---|
| 1.0 | 2026-07-23 | Schema inicial (GAP-INT-01-ARCH) |

Regras de evolução:
- Novos campos opcionais: retrocompatível (bump minor)
- Novos valores em enumerações: retrocompatível (bump minor)
- Remoção ou renomeação de campo obrigatório: breaking (bump major)
- Novo campo obrigatório: breaking (bump major)
