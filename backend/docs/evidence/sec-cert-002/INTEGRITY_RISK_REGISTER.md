# INTEGRITY_RISK_REGISTER.md
## SEC-CERT-002 — Registo de Riscos Residuais

**Data:** 2026-07-23  
**Fonte principal:** SEC-COVERAGE-002 gap analysis

---

## 1. Riscos P1

| ID | Descrição | Impacto | Probabilidade | Risco residual | Mitigador | Plano |
|---|---|---|---|---|---|---|
| R-P1-01 | Auditd sem regras live em `/etc/nginx`, `/etc/fail2ban`, `/etc/letsencrypt`, `/etc/audit` | Médio (atraso realtime) | Média (alteração admin) | Médio-Baixo | HashChecker/PermChecker (≤ intervalo) | Deploy regras `-w` (pós-CERT / evolução) |
| R-P1-02 | Directório `backend/src/routes/` sem baseline ficheiro | Médio | Baixa–Média | Baixo | `impetus_repo_write` | Watcher/baseline file-level futuro |

---

## 2. Riscos P2

| ID | Descrição | Impacto | Probabilidade | Residual | Mitigador |
|---|---|---|---|---|---|
| R-P2-01 | Auditd gaps HIGH (`/usr/local/bin`, cron, snippets) | Baixo–Médio | Baixa | Baixo | Hash (+perm binários) |
| R-P2-02 | Directórios MEDIUM middleware/config | Baixo | Baixa | Baixo | repo_write |
| R-P2-03 | GID não monitorizado (só UID) | Baixo | Baixa | Baixo | Política actual; extensão futura |
| R-P2-04 | Drift INT-01* vs baseline INT-01A (ATUOU) | Baixo (ruído operacional) | Certa até BASELINE-002 | Aceite | Regeneração em SEC-BASELINE-002 |

---

## 3. Fora de Escopo (não riscos do sensor)

Rootkits em memória, firmware, hardware/TPM, criação ad-hoc fora do inventário, containers runtime, tráfego de rede (outras camadas).

---

## 4. Avaliação Global

| Item | Valor |
|---|---|
| P0 abertos | **0** |
| Bloqueiam CERT plena sem limitações? | Lacunas P1 de realtime auditd → **sim, justificam WITH_LIMITATIONS** |
| Bloqueiam CERT operacional? | **Não** (mitigadores activos) |

**RISK_REGISTER_UPDATED = TRUE**
