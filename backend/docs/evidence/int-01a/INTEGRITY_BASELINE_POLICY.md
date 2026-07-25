# Política de Baseline de Integridade — IMPETUS

**Documento:** INTEGRITY_BASELINE_POLICY.md  
**Missão:** INT-01A (FASE 4 + FASE 6)  
**Data:** 2026-07-23  
**Status:** POLICY_DEFINED

---

## 1. Propósito

Esta política define as regras que governam a criação, manutenção, aprovação e substituição do Baseline Criptográfico de Integridade do IMPETUS. O baseline é a fonte de verdade operacional para todas as verificações de integridade — qualquer alteração não controlada ao baseline constitui um risco de segurança.

---

## 2. FASE 4 — Política de aprovação de novo baseline

### 2.1 Quem pode aprovar?

| Actor | Pode criar baseline? | Pode aprovar? | Condição |
|---|---|---|---|
| Root do sistema | Sim (técnico) | Não (sozinho) | Requer confirmação documentada |
| Responsável técnico IMPETUS | Sim | Sim | Único aprovador válido |
| Agente automatizado (CI/CD) | Não | Não | Proibido; requer intervenção humana |
| Atacante | Não | Não | Verificação de identidade obrigatória |

**Regra:** Nenhum script automatizado pode criar ou substituir o baseline sem comando explícito e documentado do responsável técnico.

### 2.2 Quando pode o baseline ser regenerado?

O baseline pode (e deve) ser regenerado nas seguintes situações:

| Evento | Obrigatório | Procedimento |
|---|---|---|
| Deploy autorizado com mudança em activos CRITICAL | ✔ Sim | Após verificar deploy; executar `--init-baseline`; documentar |
| certbot renewal (TLS) | ✔ Sim | Após renewal; re-hash de cert.pem e privkey.pem; documentar número do cert |
| Patch de segurança em server.js | ✔ Sim | Após deploy verificado |
| Actualização de regras auditd | ✔ Sim | Após deploy e `augenrules --load` |
| Rotação de segredos no `.env` | ✔ Sim | Após rotação autorizada |
| Mudança de configuração Nginx | ✔ Sim | Após `nginx -t` e reload |

**O baseline nunca deve ser regenerado:**
- Automaticamente sem aprovação humana
- Durante um incidente de segurança activo
- Por script de CI/CD sem trigger explícito
- Após mudança detectada como potencialmente maliciosa

### 2.3 Quais eventos exigem regeneração imediata?

| Evento | Acção |
|---|---|
| certbot renewal bem-sucedido | Re-hash de INT-C-007, INT-C-008, INT-M-004 |
| Deploy verificado com `git pull` + `pm2 reload` | Re-hash dos ficheiros modificados |
| Rotação manual do `.env` | Re-hash de INT-C-002 |
| Actualização de regras auditd | Re-hash de INT-C-010 e INT-M-003 |

### 2.4 Como impedir que um atacante regenere o baseline?

| Mecanismo | Implementação |
|---|---|
| **Acesso restrito ao directório** | `/var/www/impetus-completa/backend/security/integrity/` com permissão 700 (apenas root) |
| **Operação explícita** | `--init-baseline` só via comando manual ou env `INTEGRITY_INIT_BASELINE=true` |
| **Não-automático em runtime** | Sensor nunca regenera baseline sozinho; apenas lê |
| **Log de operações** | Qualquer escrita em `baseline.json` registada no `events.jsonl` com timestamp |
| **Hash do próprio baseline** | O hash de `baseline.json` é registado em local separado (audit log) |
| **Auditd watch** | Em INT-01B: adicionar watch auditd sobre `/var/www/impetus-completa/backend/security/integrity/` |

---

## 3. FASE 6 — Exclusões do baseline

### 3.1 Exclusões por categoria

#### Grupo E-01 — Dependências de terceiros

| Path | Justificativa |
|---|---|
| `backend/node_modules/` | 150+ MB; versões geridas pelo `package-lock.json`; npm install é operação legítima e frequente; hash individual impossível em tempo real |
| `frontend/node_modules/` | Mesma justificativa |
| `admin-portal/node_modules/` | Mesma justificativa |

**Mitigação:** O `package.json` e `package-lock.json` estão no baseline (INT-H-015). Qualquer alteração às dependências declaradas é detectada.

#### Grupo E-02 — Artefactos de build

| Path | Justificativa |
|---|---|
| `frontend/dist/` | Gerado por `npm run build`; regenerável a qualquer momento; hash instável entre builds |
| `frontend/.cache/` | Cache de bundler; transitório |
| `admin-portal/dist/` | Mesma justificativa |
| `admin-portal/.cache/` | Mesma justificativa |
| `backend/dist/` | Se aplicável; gerado por transpilação |

**Mitigação:** Os ficheiros fonte em `backend/src/` e `frontend/src/` estão no baseline.

#### Grupo E-03 — Logs e dados operacionais

| Path | Justificativa |
|---|---|
| `/var/log/impetus-*.log` | Voláteis por natureza; crescem continuamente; não representam configuração |
| `/var/log/nginx/` | Mesma justificativa |
| `/var/log/audit/audit.log` | Log do auditd; muda a cada syscall |
| `/var/log/fail2ban.log` | Log do fail2ban |
| `/var/lib/impetus/security-baseline/` | Output de snapshots comportamentais; dados operacionais, não configuração |
| `backend/logs/` | Logs da aplicação |

**Mitigação:** Operações destrutivas em logs são capturadas pelo auditd (`impetus_exec_rm`).

#### Grupo E-04 — Dados de utilizador e runtime

| Path | Justificativa |
|---|---|
| `uploads/` | Dados enviados por utilizadores; mutações legítimas constantes e esperadas |
| `data/` (cognitivo) | Estado cognitivo da IA; muta por design durante operação |
| `backend/backups/` | Backups gerados pelo sistema; geridos por processo próprio |
| `/var/lib/impetus/` | Estado operacional runtime; excepto `integrity/` que tem controlo próprio |

#### Grupo E-05 — Ficheiros de sistema transitórios

| Path | Justificativa |
|---|---|
| `/tmp/` | Temporários por definição |
| `/var/run/*.pid` | PID files; mudam em cada restart |
| `/var/run/*.sock` | Sockets Unix; transitórios |
| `/root/.pm2/pids/` | PIDs do PM2; mudam em cada restart |
| `/root/.pm2/logs/` | Logs PM2; voláteis |

#### Grupo E-06 — Evidências forenses (protegidas separadamente)

| Path | Justificativa |
|---|---|
| `backend/docs/evidence/storage-remediation/` | Protegido por política forense; não deve ser alterado pelo sensor |
| `SOURCE_SHA256_COMPLETE_MANIFEST.txt` | Manifest forense existente; gestão independente |
| `FORENSIC_EXPORT_SHA256_MANIFEST.txt` | Mesma justificativa |
| `/var/lib/apport/coredump/` | Core dumps forenses |

**Nota:** O directório `backend/docs/evidence/` (evidências de auditoria) também não é baseline — é gerido pelo processo de governança de segurança.

#### Grupo E-07 — O próprio sensor de integridade

| Path | Justificativa |
|---|---|
| `backend/security/integrity/state.json` | Estado runtime do sensor; muda a cada ciclo; não é configuração |
| `backend/security/integrity/events.jsonl` | Log append-only; muda continuamente |
| `backend/security/integrity/baseline.json` | O baseline é a fonte de verdade; não pode monitorar-se a si mesmo |

**Mitigação:** O hash do `baseline.json` é registado externamente no `events.jsonl` no momento da criação, com timestamp e actor.

---

## 4. Procedimento de regeneração do baseline

```
1. Confirmar que a mudança foi autorizada e documentada
2. Verificar que o sistema não está em modo de incidente activo
3. Executar verificação de identidade: quem gerou a mudança?
4. Registrar intenção: adicionar entrada manual em events.jsonl
   {"event_type":"INTEGRITY_BASELINE_REGEN","actor":"root","reason":"...","approved_by":"..."}
5. Executar: INTEGRITY_INIT_BASELINE=true [comando do sensor] --only-changed
   OU regeneração completa: INTEGRITY_INIT_BASELINE=true [comando do sensor] --full
6. Verificar que o novo baseline contém os hashes esperados
7. Registrar conclusão em events.jsonl
   {"event_type":"INTEGRITY_BASELINE_UPDATED","new_baseline_id":"...","sha256_count":33}
8. Documentar em INTEGRITY_BASELINE_INITIAL.md (nova versão)
```

---

## 5. Retenção e versioning

| Artefacto | Retenção | Versionamento |
|---|---|---|
| `baseline.json` | Indefinida (fonte de verdade) | `baseline_id` único; campo `created_at` |
| Versões anteriores | 90 dias | `baseline.YYYYMMDD.json` em `baseline_history/` |
| `events.jsonl` | 30 dias (rotação) | Append-only; compressão de ficheiros antigos |
| Este documento | Indefinida | Histórico no final do documento |

---

## 6. Métricas de saúde do baseline

O sensor (INT-01B) deve reportar:

| Métrica | Descrição | Alerta se |
|---|---|---|
| `baseline_age_days` | Dias desde a última regeneração | > 90 dias sem evento de deploy |
| `assets_missing_baseline` | Activos sem entrada no baseline | > 0 activos CRITICAL |
| `assets_baseline_stale` | Activos com mtime mais recente que o baseline | > 0 activos CRITICAL (fora de deploy) |
| `baseline_file_readable` | baseline.json acessível e válido | Falso → SEM_TELEMETRIA |
