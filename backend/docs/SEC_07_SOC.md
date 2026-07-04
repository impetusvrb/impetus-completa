# SEC-07 — Enterprise Security Operations Center

**Fase:** SEC-07  
**Modo:** Visualização e consolidação read-only  
**Feature flag:** `SECURITY_SOC=false` (default)

---

## Propósito

Centro Unificado de Operações de Segurança — responde **"Qual é a situação completa da segurança do IMPETUS neste momento?"**

Consolida SEC-01→SEC-06 sem modificar nenhum módulo.

---

## Endpoints

```
GET /api/audit/security-soc
GET /api/audit/security-soc/executive
GET /api/audit/security-soc/operations
Authorization: Bearer <tenant_admin>
```

---

## Activação

```bash
SECURITY_SOC=true
pm2 restart impetus-backend --update-env
```

---

## Conteúdo

- Overall Security Score
- Threat Level / Integrity / Baseline Compliance
- Timeline Executiva
- Executive Summary (determinístico)
- Dashboard Operacional + Executivo

Não executa respostas. Não altera runtime.
