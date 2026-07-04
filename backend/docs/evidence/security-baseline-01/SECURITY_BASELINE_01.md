# SECURITY-BASELINE-01 — Certificação da Baseline de Segurança Enterprise

**Certificação:** SECURITY-BASELINE-01  
**Data de congelamento:** 2026-07-03T21:30:00Z  
**Git HEAD:** `daf338657ac3a90fe777dad78c5936d75b89b090`  
**Predecessor:** HARDENING-01  
**Modo:** Inventário + certificação (sem alterações runtime)

---

## Propósito

Esta certificação congela oficialmente a **superfície de segurança** do IMPETUS após recuperação e hardening. Serve como referência permanente para:

- auditorias futuras (forense, enterprise, SEC-01→SEC-08);
- detecção de desvios (hashes, configs, processos);
- resposta a incidentes;
- validação pós-atualizações.

Equivalente conceptual ao **BASELINE-LOCK-01** para engenharia — aplicado à **segurança**.

---

## Critérios obrigatórios

| Critério | Estado |
|----------|--------|
| `attack_surface_frozen` | ✅ |
| `critical_files_catalogued` | ✅ |
| `critical_hashes_registered` | ✅ |
| `security_configuration_documented` | ✅ |
| `communication_matrix_complete` | ✅ |
| `process_inventory_complete` | ✅ |
| `monitoring_targets_defined` | ✅ |
| `enterprise_baseline_preserved` | ✅ |
| `event_governance_preserved` | ✅ |
| `eco_preserved` | ✅ |
| `no_runtime_changes` | ✅ |
| `no_architectural_changes` | ✅ |

Evidência: `criteria.json`

---

## Entregáveis

| Documento | Conteúdo |
|-----------|----------|
| [SECURITY_ATTACK_SURFACE.md](./SECURITY_ATTACK_SURFACE.md) | Superfície pública HTTP/HTTPS |
| [SECURITY_FILE_BASELINE.md](./SECURITY_FILE_BASELINE.md) | Inventário + SHA256 ficheiros críticos |
| [SECURITY_CONFIGURATION_BASELINE.md](./SECURITY_CONFIGURATION_BASELINE.md) | Nginx, SSH, PM2, TLS, CORS, Helmet |
| [SECURITY_PROCESS_BASELINE.md](./SECURITY_PROCESS_BASELINE.md) | PM2, cron, systemd, portas |
| [SECURITY_COMMUNICATION_MATRIX.md](./SECURITY_COMMUNICATION_MATRIX.md) | Fluxos internos/externos + diagrama |
| [SECURITY_MONITORING_MATRIX.md](./SECURITY_MONITORING_MATRIX.md) | Alvos futuros SEC-01→SEC-08 |
| [SECURITY_BASELINE_REPORT.md](./SECURITY_BASELINE_REPORT.md) | Relatório certificação completo |

---

## Evidências geradas

```
backend/docs/evidence/security-baseline-01/
├── criteria.json
├── metrics.json
├── api-mount-paths.txt          (150 mounts)
├── critical-files.sha256.manifest
├── blueprint-volumes.sha256       (1078 ficheiros blueprint)
├── listening-ports.snapshot.txt
├── ufw.snapshot.txt
└── pm2-processes.snapshot.json
```

**Colector re-executável:** `bash scripts/security-baseline-01-collect.sh`

---

## Restrições respeitadas

Não implementado nesta fase: IDS, IPS, anti-scanner activo, honeypot, fail2ban, auditd, auto-response, novos serviços residentes.

Componentes congelados **não alterados:** Event Governance, Cognitive Core, ECO, Enterprise Baseline, runtime funcional.

---

## Próxima fase

**Enterprise Security SEC-01 → SEC-08** — implementação monitorada contra esta baseline.

Qualquer desvio detectado deve referenciar:
1. hash alterado (`critical-files.sha256.manifest`);
2. mount path novo (`api-mount-paths.txt`);
3. porta/processo novo (`listening-ports.snapshot.txt`).
