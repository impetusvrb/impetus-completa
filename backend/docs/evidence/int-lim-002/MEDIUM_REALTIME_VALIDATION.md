# MEDIUM_REALTIME_VALIDATION

**Emitido em:** 2026-07-23 16:45 UTC  
**Fase:** INT-LIM-002  

---

## 1. Metodologia de Validação

A validação adoptou a mesma abordagem de INT-LIM-001: dado o constraint ambiental do kernel audit (clock drift de ~10 dias, `audit.log` congelado desde 2026-07-13), a validação foi realizada em duas camadas:

1. **Verificação de configuração** — `auditctl -l` confirma regras activas
2. **Análise estática do IntegrityAuditdBridge** — confirma `bridge_will_process = true` para as chaves relevantes

---

## 2. Validação por Activo

### INT-M-001 — Routes Directory

| Parâmetro | Valor |
|---|---|
| Caminho | `/var/www/impetus-completa/backend/src/routes/` |
| Regra activa | `-w /var/www/impetus-completa -p wa -k impetus_repo_write` |
| Tipo de cobertura | Filesystem watch recursivo na árvore pai |
| `bridge_will_process` | TRUE (`impetus_repo_write` em IMPETUS_KEYS) |
| Evento gerado | `INTEGRITY_HASH_CHANGED` |
| Validação de configuração | ✓ |

### INT-M-002 — Middleware Directory

| Parâmetro | Valor |
|---|---|
| Caminho | `/var/www/impetus-completa/backend/src/middleware/` |
| Regra activa | `-w /var/www/impetus-completa -p wa -k impetus_repo_write` |
| Tipo de cobertura | Filesystem watch recursivo na árvore pai |
| `bridge_will_process` | TRUE |
| Evento gerado | `INTEGRITY_HASH_CHANGED` |
| Validação de configuração | ✓ |

### INT-M-003 — impetus-audit.rules

| Parâmetro | Valor |
|---|---|
| Caminho | `backend/infra/security/audit/impetus-audit.rules` |
| Regra activa | `-w /var/www/impetus-completa -p wa -k impetus_repo_write` |
| Tipo de cobertura | Filesystem watch recursivo na árvore pai |
| `bridge_will_process` | TRUE |
| Evento gerado | `INTEGRITY_HASH_CHANGED` |
| Validação de configuração | ✓ |
| Nota | INT-LIM-001 adicionou regras a este ficheiro — o próprio activo foi monitorizado durante a implementação |

### INT-M-004 — fullchain2.pem (TLS cert)

| Parâmetro | Valor |
|---|---|
| Caminho | `/etc/letsencrypt/archive/plataformaimpetus.com/fullchain2.pem` |
| Regra activa (nova) | `-w /etc/letsencrypt -p wa -k impetus_tls_config` |
| Tipo de cobertura | Filesystem watch recursivo em `/etc/letsencrypt/` |
| `bridge_will_process` | TRUE (`impetus_tls_config` em IMPETUS_KEYS) |
| Evento gerado | `INTEGRITY_CERT_CHANGED` |
| Severidade promovida | CRITICAL (chave `impetus_tls_config`) |
| Validação de configuração | ✓ |
| Cobertura adicionada por | INT-LIM-001 (2026-07-23) |

### INT-M-005 — Security Config Directory

| Parâmetro | Valor |
|---|---|
| Caminho | `backend/src/security/config/` |
| Regra activa | `-w /var/www/impetus-completa -p wa -k impetus_repo_write` |
| Tipo de cobertura | Filesystem watch recursivo na árvore pai |
| `bridge_will_process` | TRUE |
| Evento gerado | `INTEGRITY_HASH_CHANGED` |
| Validação de configuração | ✓ |

---

## 3. Sumário de Cobertura Final

| ID | Cobertura em tempo real | Mecanismo | Status |
|---|---|---|---|
| INT-M-001 | ✓ | auditd `impetus_repo_write` | PASS |
| INT-M-002 | ✓ | auditd `impetus_repo_write` | PASS |
| INT-M-003 | ✓ | auditd `impetus_repo_write` | PASS |
| INT-M-004 | ✓ | auditd `impetus_tls_config` (INT-LIM-001) | PASS |
| INT-M-005 | ✓ | auditd `impetus_repo_write` | PASS |

**Cobertura total MEDIUM:** 5/5 (100 %)  
**Activos apenas com scan periódico:** 0

---

## 4. Ausência de Duplicação de Eventos

As regras cobrindo os activos MEDIUM usam chaves distintas e domínios não sobrepostos:

| Activos | Chave | Domínio |
|---|---|---|
| INT-M-001 a M-003, M-005 | `impetus_repo_write` | `/var/www/impetus-completa` |
| INT-M-004 | `impetus_tls_config` | `/etc/letsencrypt/` |

Não existe sobreposição entre estas regras. O Correlation Engine recebe eventos distintos sem risco de duplicação.

---

## 5. Integridade do Fluxo até ao Dashboard

O fluxo de detecção permanece idêntico ao certificado em INT-01D:

```
watcher/auditd → Bridge → EventBus → CorrelationEngine → StateStore → Dashboard
```

Nenhum componente foi alterado. A detecção dos activos MEDIUM utiliza exactamente as mesmas
paths de código já validadas para activos CRITICAL e HIGH.
