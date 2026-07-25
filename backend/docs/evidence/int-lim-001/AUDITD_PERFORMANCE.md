# AUDITD_PERFORMANCE

**Emitido em:** 2026-07-23 16:28 UTC  
**Fase:** INT-LIM-001  

---

## 1. Baseline de Performance (pré-INT-LIM-001)

| Parâmetro | Valor |
|---|---|
| Regras activas | 16 |
| backlog_limit | 16384 |
| lost (eventos perdidos) | 0 |
| backlog (fila actual) | 0 |
| backlog_wait_time | 60000 ms |

---

## 2. Performance Pós-Implementação

| Parâmetro | Valor |
|---|---|
| Regras activas | 20 (+4) |
| backlog_limit | 16384 (inalterado) |
| lost (eventos perdidos) | 0 |
| backlog (fila actual) | 0 |
| backlog_wait_time | 60000 ms (inalterado) |

---

## 3. Análise de Impacto

### 3.1 Tipo de regras adicionadas

As 4 novas regras são do tipo `-w` (filesystem watch / inode watch):

```
-w /etc/nginx/ -p wa
-w /etc/fail2ban/ -p wa
-w /etc/letsencrypt/ -p wa
-w /etc/cron.d/ -p wa
```

### 3.2 Características de performance dos filesystem watches

| Característica | Detalhes |
|---|---|
| Mecanismo | Inode watch no kernel (não filtra por syscall) |
| Overhead por regra | Negligível — O(1) na lookup por inode |
| Overhead por evento | Apenas quando ocorre escrita/chmod nos directórios |
| Frequência esperada | Muito baixa — directórios de configuração, não dados |
| Buffer utilizado | < 1 % do backlog_limit disponível |

### 3.3 Comparação com regras syscall existentes

As regras syscall existentes (execve, unlink, rename) têm overhead mais elevado por capturar um volume muito maior de eventos (qualquer execução de root, qualquer deleção em `/var/www`). As novas regras `-w` são mais específicas e de menor impacto.

---

## 4. Estimativa de Eventos Adicionais

| Directório | Frequência de escrita | Eventos/dia estimados |
|---|---|---|
| `/etc/nginx/` | Deploy nginx / reload | < 5 |
| `/etc/fail2ban/` | Adição de IP ban / reload | < 10 |
| `/etc/letsencrypt/` | Renovação TLS (mensal) | < 1 |
| `/etc/cron.d/` | Adição de tarefa (raro) | < 1 |
| **Total adicional** | | **< 20 eventos/dia** |

Contexto: as regras de exec root (`impetus_root_exec`) geram centenas de eventos por dia. O acréscimo de < 20 eventos/dia é desprezível.

---

## 5. Impacto no IntegrityAuditdBridge

| Parâmetro | Antes | Depois |
|---|---|---|
| Chaves processadas | 10 | 10 (sem alteração) |
| Polling do audit.log | Inalterado | Inalterado |
| Overhead de parsing | Negligível | Negligível |
| Memória adicional | 0 | 0 |

O Bridge processa as novas chaves sem alteração de código — o overhead é zero.

---

## 6. Conclusão

`PERFORMANCE_IMPACT = NEGLIGIBLE`  
`NO_BACKLOG_INCREASE = TRUE`  
`NO_EVENT_LOSS = TRUE`  
`BUFFER_HEADROOM = 99.9%`
