# AUDITD_RULES_IMPLEMENTATION

**Emitido em:** 2026-07-23 16:27 UTC  
**Fase:** INT-LIM-001 — Eliminação da LIM-001  
**Objectivo:** Adicionar cobertura auditd em tempo real para 4 directórios críticos  

---

## 1. Estado Anterior (pré-INT-LIM-001)

### 1.1 Regras activas

| Regra | Directório/Ficheiro | Chave | Status |
|---|---|---|---|
| `-w` | `/var/www/impetus-completa` | `impetus_repo_write` | Activa |
| syscall | `/var/www/impetus-completa/backend` | `impetus_delete` | Activa |
| syscall | `/var/www/impetus-completa/frontend` | `impetus_delete` | Activa |
| `-w` | `/var/www/impetus-completa/backend/.env` | `impetus_env` | Activa |
| `-w` | `/etc/impetus` | `impetus_config` | Activa |
| `-w` | `/var/backups/impetus-env-secrets` | `impetus_env_backup` | Activa |
| syscall | `/usr/bin/rm`, `/usr/bin/rsync`, `/usr/bin/git` | `impetus_exec_*` | Activa |
| syscall | `euid=0` | `impetus_root_exec` | Activa |

**Total pré-INT-LIM-001:** 16 regras  
**Cobertura LIM-001:** `/etc/nginx`, `/etc/fail2ban`, `/etc/letsencrypt`, `/etc/cron.d` — **AUSENTES**

### 1.2 Chaves já presentes no IntegrityAuditdBridge (pré-existentes)

O `IntegrityAuditdBridge` já tinha mapeamentos prontos para todas as chaves necessárias:

| Chave | Evento | Severidade |
|---|---|---|
| `impetus_nginx_config` | `INTEGRITY_HASH_CHANGED` | CRITICAL |
| `impetus_fail2ban_config` | `INTEGRITY_HASH_CHANGED` | CRITICAL |
| `impetus_tls_config` | `INTEGRITY_CERT_CHANGED` | CRITICAL |
| `impetus_cron_config` | `INTEGRITY_HASH_CHANGED` | HIGH |

**Conclusão:** nenhuma alteração ao código foi necessária. A implementação é puramente aditiva ao ficheiro de regras.

---

## 2. Projecto das Regras (FASE 2)

### 2.1 Critérios de projecto

- Usar `-w` (filesystem watch) com permissões `wa` (write + attribute change)
- Chave padronizada com prefixo `impetus_` (compatível com `IMPETUS_KEYS`)
- Sem redundância com regras existentes
- Sem conflito de chaves

### 2.2 Regras desenhadas

| Directório | Permissões | Chave | Rationale |
|---|---|---|---|
| `/etc/nginx/` | `wa` | `impetus_nginx_config` | Detecta escrita e chmod em qualquer ficheiro nginx |
| `/etc/fail2ban/` | `wa` | `impetus_fail2ban_config` | Detecta escrita e chmod em qualquer ficheiro fail2ban |
| `/etc/letsencrypt/` | `wa` | `impetus_tls_config` | Detecta renovação ou substituição de certificados TLS |
| `/etc/cron.d/` | `wa` | `impetus_cron_config` | Detecta adição, modificação ou remoção de tarefas cron |

---

## 3. Implementação (FASE 3)

### 3.1 Ficheiro fonte actualizado

`backend/infra/security/audit/impetus-audit.rules` — bloco adicionado:

```
# ── Infra crítica do sistema — INT-LIM-001 (2026-07-23) ─────────────────────
# Cobertura em tempo real dos directórios críticos do baseline INTEGRITY v2
# Chaves mapeadas em IntegrityAuditdBridge.IMPETUS_KEYS — sem alteração de código

-w /etc/nginx/ -p wa -k impetus_nginx_config
-w /etc/fail2ban/ -p wa -k impetus_fail2ban_config
-w /etc/letsencrypt/ -p wa -k impetus_tls_config
-w /etc/cron.d/ -p wa -k impetus_cron_config
```

### 3.2 Deploy

```bash
install -m 0640 infra/security/audit/impetus-audit.rules /etc/audit/rules.d/impetus.rules
augenrules --load
```

### 3.3 Verificação pós-deploy

```
auditctl -l | grep -E "nginx|fail2ban|letsencrypt|cron"
-w /etc/nginx -p wa -k impetus_nginx_config
-w /etc/fail2ban -p wa -k impetus_fail2ban_config
-w /etc/letsencrypt -p wa -k impetus_tls_config
-w /etc/cron.d -p wa -k impetus_cron_config
```

**Total de regras pós-INT-LIM-001:** 20 (16 + 4 novas)

---

## 4. Ausência de alterações ao código

| Componente | Alterado | Justificação |
|---|---|---|
| `IntegrityAuditdBridge.js` | **Não** | Chaves pré-configuradas; mapeamentos completos |
| `IntegrityHashChecker.js` | **Não** | Fora do escopo |
| `IntegrityEngine.js` | **Não** | Fora do escopo |
| Dashboard | **Não** | Fora do escopo |
| `baseline.json` | **Não** | Será actualizado em SEC-BASELINE-003 |

---

## 5. Directórios alvo — confirmação de existência

| Directório | Presente | Items |
|---|---|---|
| `/etc/nginx` | ✓ | 17 |
| `/etc/fail2ban` | ✓ | 10 |
| `/etc/letsencrypt` | ✓ | 8 |
| `/etc/cron.d` | ✓ | 7 |
