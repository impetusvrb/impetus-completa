# SECURITY_BASELINE_REPORT — Relatório de Certificação

**Certificação:** SECURITY-BASELINE-01  
**Emitido:** 2026-07-03T21:30:00Z  
**Auditor:** Inventário automatizado + verificação read-only  
**Git HEAD:** `daf338657ac3a90fe777dad78c5936d75b89b090`  
**Hostname:** srv1422313  

---

## 1. Veredito de certificação

A **Baseline Oficial de Segurança Enterprise** do IMPETUS está **certificada e congelada**.

Todos os critérios obrigatórios foram satisfeitos. Nenhuma alteração funcional de runtime, Event Governance, Cognitive Core, ECO ou Enterprise Baseline foi efectuada durante esta fase.

---

## 2. Resumo por parte

### PARTE 1 — Superfície de ataque ✅

- Superfície pública: **Nginx :443/:80** + **SSH :22** (UFW restrito)
- **150** API mount paths inventariados
- Backend/frontend **não expostos** directamente
- Hardening HARDENING-01 activo (404 em paths scanner)

→ [SECURITY_ATTACK_SURFACE.md](./SECURITY_ATTACK_SURFACE.md)

### PARTE 2 — Processos ✅

- **3** processos PM2 online (backend, frontend, lipsync-api)
- **5** processos lab PM2 stopped
- PostgreSQL, Mosquitto, nginx, sshd documentados
- **1** cron IMPETUS (disk monitor)

→ [SECURITY_PROCESS_BASELINE.md](./SECURITY_PROCESS_BASELINE.md)

### PARTE 3 — Ficheiros críticos ✅

- **0** ficheiros Git deleted
- **22** hashes P0–P2 em manifest
- **1078** hashes Blueprint
- Blueprint Vol. 00–10 restaurado e presente

→ [SECURITY_FILE_BASELINE.md](./SECURITY_FILE_BASELINE.md)

### PARTE 4 — Configuração ✅

- Nginx, SSH, PM2, TLS, CORS, Helmet, UFW documentados
- Docker: nenhum container activo
- `.env.example`: 314 variáveis (nomes only)

→ [SECURITY_CONFIGURATION_BASELINE.md](./SECURITY_CONFIGURATION_BASELINE.md)

### PARTE 5 — Usuários e credenciais ✅

| Item | Baseline |
|------|----------|
| Users | root, ubuntu, nobody |
| SSH keys | 0 em authorized_keys |
| SSH auth | password + pubkey enabled |
| Segredos runtime | backend/.env presente (hash offline) |
| Permissões UFW | 2 ranges operadores + 6 IPs deny |

**Quem acede ao quê:**

| Actor | SSH | HTTP | Backend | DB |
|-------|-----|------|---------|-----|
| Operador autorizado (2 ranges IP) | ✅ | ✅ | via nginx | via backend |
| Internet geral | ❌ | ❌ | ❌ | ❌ |
| PM2 root | local | — | full | via .env |

### PARTE 6 — Comunicação ✅

Matriz completa + diagrama Mermaid documentados.

→ [SECURITY_COMMUNICATION_MATRIX.md](./SECURITY_COMMUNICATION_MATRIX.md)

### PARTE 7 — Logs ✅

| Log | Path | Retenção | Rotação |
|-----|------|----------|---------|
| nginx access | /var/log/nginx/access.log | ~14 dias | logrotate |
| nginx error | /var/log/nginx/error.log | ~14 dias | logrotate |
| auth SSH | /var/log/auth.log | syslog | logrotate |
| PM2 backend out | ~/.pm2/logs/impetus-backend-out.log | pm2-logrotate | sim |
| PM2 backend err | ~/.pm2/logs/impetus-backend-error.log | pm2-logrotate | sim |
| disk alerts | /var/log/impetus-disk-alerts.log | append | manual |
| auditd | — | **lacuna** | SEC-02 |
| impetus-fs-watch | — | **lacuna** | SEC-02 |

**Observabilidade activa:** `/health`, `/api/system/health/deep`, PM2 logs, disk monitor cron.

**Lacunas baseline:** auditd, fail2ban, HISTTIMEFORMAT em sessões antigas, netflow.

### PARTE 8 — Integridade ✅

| Check | Resultado |
|-------|-----------|
| Git deleted | 0 |
| HEAD | daf338657 |
| server.js hash | coincide HARDENING-01 |
| Blueprint volumes | 1078 hashes |
| Submodule Wav2Lip | presente |
| integrity-check.sh | status ok vs HARDENING-01 baseline |

### PARTE 9 — Classificação de segurança ✅

| Classe | Componentes |
|--------|-------------|
| **Público** | SPA, /assets/*, /api/auth, /health |
| **Autenticado** | Maioria /api/*, uploads auth |
| **Privado localhost** | :3000, :4000, :5432, :1883 |
| **Crítico** | .env, JWT secrets, DB, PM2 dump |
| **IP Enterprise** | Blueprint, FUNCTIONAL_MATRIX, ADRs |

**Vetores externos:** HTTP scan (mitigado HARDENING-01), SSH brute force (parcial — fail2ban pendente).

**Vetores internos:** root password SSH, PM2 dump exposure, operador error (git clean — runbook HARDENING-01).

### PARTE 10 — Monitoramento futuro ✅

40 alvos definidos para SEC-01→SEC-08.

→ [SECURITY_MONITORING_MATRIX.md](./SECURITY_MONITORING_MATRIX.md)

---

## 3. Critérios JSON

```json
{
  "attack_surface_frozen": true,
  "critical_files_catalogued": true,
  "critical_hashes_registered": true,
  "security_configuration_documented": true,
  "communication_matrix_complete": true,
  "process_inventory_complete": true,
  "monitoring_targets_defined": true,
  "enterprise_baseline_preserved": true,
  "event_governance_preserved": true,
  "eco_preserved": true,
  "no_runtime_changes": true,
  "no_architectural_changes": true
}
```

Ficheiro: [criteria.json](./criteria.json)

---

## 4. Riscos residuais aceites na baseline

| Risco | Severidade | Mitigação actual | Fase futura |
|-------|------------|------------------|-------------|
| SSH password root | Alta | UFW IP restrict | SEC-03 keys only |
| PM2 dump secrets | Alta | pm2-secure-restart doc | SEC-01 rotation |
| Bundles públicos | Média | by design | SEC-05 obfuscation review |
| Sem auditd | Média | integrity cron | SEC-02 |
| Sem fail2ban | Média | UFW deny list | SEC-03 |

---

## 5. Preservação e re-certificação

### Evidências arquivadas

```
backend/docs/evidence/security-baseline-01/
├── SECURITY_BASELINE_01.md          (índice)
├── SECURITY_ATTACK_SURFACE.md
├── SECURITY_FILE_BASELINE.md
├── SECURITY_CONFIGURATION_BASELINE.md
├── SECURITY_PROCESS_BASELINE.md
├── SECURITY_COMMUNICATION_MATRIX.md
├── SECURITY_MONITORING_MATRIX.md
├── SECURITY_BASELINE_REPORT.md      (este documento)
├── criteria.json
├── metrics.json
├── api-mount-paths.txt
├── critical-files.sha256.manifest
├── blueprint-volumes.sha256
├── listening-ports.snapshot.txt
├── ufw.snapshot.txt
└── pm2-processes.snapshot.json
```

### Re-colecta

```bash
bash scripts/security-baseline-01-collect.sh
bash scripts/integrity-check.sh
```

### Quando re-certificar

- Após cada fase SEC-01→SEC-08
- Após deploy major
- Após incidente de segurança
- Trimestral (mínimo)

---

## 6. Declaração de congelamento

A partir de **2026-07-03T21:30:00Z**, o estado documentado nesta certificação constitui a **única referência válida** para comparação de desvios de segurança do IMPETUS em produção, até emissão de SECURITY-BASELINE-02 ou revisão explícita aprovada.

**Assinatura técnica:** HEAD `daf338657` + hashes em `critical-files.sha256.manifest`

---

## 7. Próximo passo

Implementar **SEC-01** (monitoramento de integridade activo) usando [SECURITY_MONITORING_MATRIX.md](./SECURITY_MONITORING_MATRIX.md) como backlog prioritizado.
