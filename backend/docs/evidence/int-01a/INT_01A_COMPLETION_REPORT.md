# INT-01A — Relatório de Conclusão

**Documento:** INT_01A_COMPLETION_REPORT.md  
**Missão:** INT-01A — Inventário Oficial de Activos Críticos e Baseline Criptográfico de Integridade  
**Data:** 2026-07-23  
**Status:** PASS

---

## 1. Critérios de aceite

| Critério | Resultado |
|---|---|
| `INT_01A_STATUS` | **PASS** |
| `ASSET_INVENTORY_CREATED` | **TRUE** |
| `BASELINE_CREATED` | **TRUE** |
| `SHA256_GENERATED` | **TRUE** |
| `CRITICAL_ASSETS_REGISTERED` | **TRUE** |
| `BASELINE_MANAGER_DEFINED` | **TRUE** |
| `VALIDATION_COMPLETED` | **TRUE** |
| `NO_SECURITY_REGRESSION` | **TRUE** |
| `FORENSIC_EVIDENCE_PRESERVED` | **TRUE** |

---

## 2. Deliverables criados

### Ficheiros de dados operacionais

| Ficheiro | Localização | Conteúdo |
|---|---|---|
| `asset_inventory.json` | `backend/security/integrity/` | Inventário completo: 10 CRITICAL + 23 HIGH + 5 grupos MEDIUM |
| `baseline.json` | `backend/security/integrity/` | Baseline SHA256 de 33 activos com metadados completos |

### Documentos de evidência

| Documento | Localização | Fase |
|---|---|---|
| `INTEGRITY_ASSET_INVENTORY.md` | `backend/docs/evidence/int-01a/` | FASE 1 |
| `INTEGRITY_BASELINE_INITIAL.md` | `backend/docs/evidence/int-01a/` | FASE 2 |
| `INTEGRITY_BASELINE_MANAGER_SPEC.md` | `backend/docs/evidence/int-01a/` | FASE 3 |
| `INTEGRITY_BASELINE_POLICY.md` | `backend/docs/evidence/int-01a/` | FASE 4 + 6 |
| `INTEGRITY_BASELINE_VALIDATION.md` | `backend/docs/evidence/int-01a/` | FASE 5 |
| `INT_01A_COMPLETION_REPORT.md` (este) | `backend/docs/evidence/int-01a/` | Relatório |

---

## 3. Relatório final — respostas objectivas

### 1. O inventário oficial foi criado?

**Sim.** `asset_inventory.json` e `INTEGRITY_ASSET_INVENTORY.md` criados em `backend/security/integrity/` e `backend/docs/evidence/int-01a/` respectivamente.

---

### 2. Quantos activos foram classificados como CRITICAL, HIGH e MEDIUM?

| Criticidade | Individuais | Grupos |
|---|---|---|
| **CRITICAL** | **10** | — |
| **HIGH** | **23** | — |
| **MEDIUM** | 2 individuais | 3 grupos (routes/147, middleware/48, security/config) |
| **Total** | **35** | 3 grupos |

---

### 3. O baseline criptográfico foi gerado com sucesso?

**Sim.** `baseline.json` contém SHA256 de todos os 33 activos individuais (10 CRITICAL + 23 HIGH). Gerado com SHA-256 em produção às 2026-07-23T12:16:45Z.

---

### 4. Algum activo crítico apresentou inconsistências?

**Não.** Resultado da validação: `10/10 PASS`, `14/14 HIGH PASS`. Zero erros de hash, zero erros de permissão, zero erros de proprietário.

Duas observações documentadas (não bloqueantes):
1. Symlinks TLS em `/etc/letsencrypt/live/` reportam `perm=777` no symlink; ficheiro real tem permissões correctas. Mitigação: HashChecker usa `canonical_path`.
2. GAP auditd: 7 activos CRITICAL fora do escopo das regras auditd actuais. Acção em INT-01B.

---

### 5. O Baseline Manager foi especificado?

**Sim.** `INTEGRITY_BASELINE_MANAGER_SPEC.md` define:
- Interface pública completa (API do módulo)
- Estrutura de dados (`BaselineData`, `AssetBaselineEntry`, `BaselineHealthMetrics`)
- Regras de escrita atómica
- Regras de autorização
- Versionamento do histórico (90 dias)
- Detecção de corrupção e fallback
- Localização de todos os ficheiros

---

### 6. Quais activos ficaram fora do baseline e por quê?

| Categoria excluída | Justificativa |
|---|---|
| `node_modules/` (3 directórios) | Instável por design; npm install é operação legítima; ~150 MB |
| Artefactos de build (`dist/`, `.cache/`) | Regeneráveis; mutação esperada em cada build |
| `*.log` e `/var/log/` | Voláteis por natureza; cobertura via auditd para operações destrutivas |
| `uploads/`, `data/` | Dados de utilizador; mutações constantes e legítimas |
| `backend/backups/` | Geridos por processo de backup próprio |
| `/tmp/`, sockets, PIDs | Transitórios por definição |
| `backend/security/integrity/state.json` e `events.jsonl` | Estado runtime do sensor; o sensor não pode monitorar-se a si mesmo |
| `backend/security/integrity/baseline.json` | A fonte de verdade não pode monitorar-se a si mesma |
| Evidências forenses certificadas | Protegidas por política forense independente |

---

### 7. Houve alguma alteração em código de produção?

**Não.** Zero alterações em código de produção. As operações realizadas foram exclusivamente:
- Leituras (`sha256sum`, `stat`) — operações de leitura
- Criação de ficheiros novos em directórios novos: `backend/security/integrity/` e `backend/docs/evidence/int-01a/`
- Nenhum ficheiro existente foi modificado

---

### 8. Houve build ou reinício de serviços?

**Não.** Zero builds executados. Zero serviços reiniciados. PM2 intacto.

---

### 9. O baseline inicial está pronto para alimentar AuditdBridge, HashChecker e PermChecker?

**Sim.** Confirmação por componente:

**AuditdBridge:**
- ✔ auditd activo com regras IMPETUS
- ✔ Chaves de auditoria documentadas por activo no `asset_inventory.json`
- ✔ GAP de cobertura identificado e documentado (a resolver em INT-01B)

**HashChecker:**
- ✔ 33 activos com SHA256 em `baseline.json`
- ✔ `mtime_unix` documentado (permite optimização differential)
- ✔ `canonical_path` para symlinks TLS
- ✔ Todos os activos acessíveis e verificados

**PermChecker:**
- ✔ `expected_perm` e `expected_owner` definidos por activo em `asset_inventory.json`
- ✔ Zero inconsistências no estado actual

---

### 10. A plataforma está preparada para iniciar INT-01B?

**Sim.** Gate de entrada para INT-01B satisfeito:

| Gate | Status |
|---|---|
| GAP-INT-01-ARCH documentos aprovados | ✔ |
| Inventário de activos criado | ✔ |
| Baseline criptográfico gerado | ✔ |
| Baseline validado (zero erros) | ✔ |
| Política de aprovação definida | ✔ |
| Especificação do Baseline Manager definida | ✔ |
| Exclusões documentadas e justificadas | ✔ |
| GAPs identificados e priorizados | ✔ |
| Zero alterações em código de produção | ✔ |
| Sistema estável (nenhum incidente activo) | ✔ |

**INT-01B pode ser iniciada.** O Motor de Integridade (AuditdBridge, HashChecker, PermChecker, Event Bus, Correlation Engine) pode ser implementado sobre esta base.

---

## 4. GAPs identificados para INT-01B

| GAP | Descrição | Impacto | Prioridade |
|---|---|---|---|
| AUDITD-GAP-01 | 7 activos CRITICAL em `/etc/nginx/`, `/etc/fail2ban/`, `/etc/letsencrypt/`, `/etc/audit/` sem cobertura auditd | HashChecker cobre; auditd não detecta em tempo real | P1 |
| AUDITD-GAP-02 | Scripts em `/usr/local/bin/impetus-*` sem cobertura auditd | 4 activos HIGH sem evento kernel | P1 |
| AUDITD-GAP-03 | Crons em `/etc/cron.d/impetus-*` sem cobertura auditd | 4 activos HIGH sem evento kernel | P2 |
| BASELINE-GAP-01 | `baseline.json` não protegido por auditd (directório novo) | Adulteração do baseline sem detecção imediata | P1 |

**Resolução proposta em INT-01B:** Adicionar regras auditd via `infra/security/audit/impetus-audit.rules`:
```
-w /etc/nginx/ -p wa -k impetus_nginx_config
-w /etc/fail2ban/ -p wa -k impetus_fail2ban_config
-w /etc/letsencrypt/ -p wa -k impetus_tls_config
-w /etc/audit/rules.d/ -p wa -k impetus_audit_config
-w /usr/local/bin/ -p wa -k impetus_bin_write
-w /etc/cron.d/ -p wa -k impetus_cron_config
-w /var/www/impetus-completa/backend/security/integrity/ -p wa -k impetus_integrity_baseline
```

---

## 5. Preservação forense

```
FORENSIC_EVIDENCE_PRESERVED  = TRUE
STORAGE_REMEDIATION_UNTOUCHED = TRUE
DELETION_EXECUTED             = NO
CERTIFIED_BASELINES_MODIFIED  = NONE
PRODUCTION_CODE_CHANGED       = NONE
PM2_RESTARTED                 = NO
```

---

## 6. Próximo passo

**INT-01B — Motor do Sensor de Integridade**

Pode ser iniciada imediatamente. Inputs disponíveis:
- `backend/security/integrity/asset_inventory.json`
- `backend/security/integrity/baseline.json`
- `backend/docs/evidence/int-01a/INTEGRITY_BASELINE_MANAGER_SPEC.md`
- `backend/docs/architecture/gap-int-01/INTEGRITY_SENSOR_REFERENCE.md`
- `backend/docs/architecture/gap-int-01/INTEGRITY_EVENT_MODEL.md`

Gate de INT-01B:
- Implementar módulo isolado em `backend/src/services/integrity/`
- `INTEGRITY_SENSOR_ENABLED=false` durante desenvolvimento
- Activação apenas em INT-01C com aprovação explícita
