# MEDIUM_ASSET_WATCHERS

**Emitido em:** 2026-07-23 16:44 UTC  
**Fase:** INT-LIM-002 — Eliminação da LIM-002  

---

## 1. Inventário Completo de Activos MEDIUM

Total de grupos MEDIUM no inventário: **5**

| ID | Caminho | Tipo | Ficheiros | monitor_hash | auditd_covered (pré-LIM-002) |
|---|---|---|---|---|---|
| INT-M-001 | `/var/www/impetus-completa/backend/src/routes/` | dir | 303 | ✓ | ✓ |
| INT-M-002 | `/var/www/impetus-completa/backend/src/middleware/` | dir | 48 | ✓ | ✓ |
| INT-M-003 | `backend/infra/security/audit/impetus-audit.rules` | file | 1 | ✓ | ✓ |
| INT-M-004 | `/etc/letsencrypt/archive/.../fullchain2.pem` | file | 1 | ✓ | ✗ |
| INT-M-005 | `backend/src/security/config/` | dir | 1 | ✓ | ✓ |

---

## 2. Estado de Cobertura Pré-INT-LIM-002

### 2.1 INT-M-001, INT-M-002, INT-M-003, INT-M-005

Estes activos estão dentro da árvore `/var/www/impetus-completa/`, coberta pela regra:

```
-w /var/www/impetus-completa -p wa -k impetus_repo_write
```

Esta é uma regra filesystem watch com permissões `wa` (write + attribute change) que captura qualquer escrita ou alteração de atributos em qualquer ficheiro da árvore. A cobertura em tempo real destes activos MEDIUM estava já em vigor desde a certificação da camada INTEGRITY.

**Conclusão:** INT-M-001, M-002, M-003, M-005 **já tinham monitorização em tempo real**. A LIM-002 documentava erroneamente estes activos como "scan-only" quando na verdade eram cobertos pelo watch global.

### 2.2 INT-M-004 — `fullchain2.pem`

Este activo está em `/etc/letsencrypt/archive/plataformaimpetus.com/fullchain2.pem`. A regra `impetus_repo_write` não cobre `/etc/`, pelo que este era o único activo MEDIUM genuinamente sem cobertura em tempo real.

---

## 3. Estratégia por Activo (FASE 2)

| ID | Mecanismo adoptado | Decisão | Justificação |
|---|---|---|---|
| INT-M-001 | `impetus_repo_write` (pré-existente) | Manter | 303 ficheiros em `/var/www/` já cobertos |
| INT-M-002 | `impetus_repo_write` (pré-existente) | Manter | 48 ficheiros em `/var/www/` já cobertos |
| INT-M-003 | `impetus_repo_write` (pré-existente) | Manter | Ficheiro em `/var/www/` já coberto |
| INT-M-004 | `impetus_tls_config` (INT-LIM-001) | Actualizar inventário | Coberto pela nova regra `/etc/letsencrypt/` |
| INT-M-005 | `impetus_repo_write` (pré-existente) | Manter | Directório em `/var/www/` já coberto |

**Novas implementações necessárias:** 0 regras adicionais  
**Actualizações de inventário:** 1 (INT-M-004)

---

## 4. Implementação (FASE 3)

### 4.1 Acção realizada

A única implementação necessária foi a actualização do `asset_inventory.json` para reflectir que INT-M-004 passou a ter cobertura auditd via a regra `impetus_tls_config` adicionada em INT-LIM-001:

```json
{
  "id": "INT-M-004",
  "auditd_covered": true,
  "auditd_key": "impetus_tls_config",
  "auditd_coverage_added": "INT-LIM-001 (2026-07-23) — regra -w /etc/letsencrypt/"
}
```

**SHA-256 do asset_inventory.json pós-actualização:** `bcd872d17ca6b4c84ea3fca3eb9839313f33564392c512b94189ce6684c21bb2`

### 4.2 Cobertura final (pós-INT-LIM-002)

| ID | Cobertura em tempo real | Chave auditd | Severidade |
|---|---|---|---|
| INT-M-001 | ✓ auditd | `impetus_repo_write` | MEDIUM |
| INT-M-002 | ✓ auditd | `impetus_repo_write` | MEDIUM |
| INT-M-003 | ✓ auditd | `impetus_repo_write` | MEDIUM |
| INT-M-004 | ✓ auditd | `impetus_tls_config` | CRITICAL* |
| INT-M-005 | ✓ auditd | `impetus_repo_write` | MEDIUM |

*INT-M-004 herda a severidade CRITICAL da chave `impetus_tls_config`, promovendo a protecção deste activo acima da criticidade MEDIUM original.

---

## 5. Integração com o Fluxo de Detecção (FASE 4)

```
Evento em activo MEDIUM (escrita/chmod)
    ↓ (kernel audit — regra -w ou -w /etc/letsencrypt)
audit.log — entrada com key impetus_repo_write ou impetus_tls_config
    ↓ (IntegrityAuditdBridge polling)
IMPETUS_KEYS.has(key) → TRUE
    ↓
KEY_TO_EVENT + KEY_SEVERITY
    ↓
IntegrityEventBus.emit('integrity:event', {...})
    ↓
IntegrityCorrelationEngine → IntegrityStateStore
    ↓
Dashboard: INTEGRITY = ATUOU
```

Nenhuma alteração ao fluxo foi necessária — a arquitectura já suportava estes activos.
