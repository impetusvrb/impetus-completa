# ADR-010 — Infraestrutura Enterprise

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-INFRA-01  
**Relacionado:** ADR-003 (ARCHITECTURE), ADR-011

---

## Contexto

CERT-ONPREM-ARCHITECTURE-01 definiu a arquitectura lógica Enterprise (single-tenant lógico, preservação cognitiva, desactivação SaaS). Falta o contrato de **infraestrutura física/lógica** que unifique deploy PM2 actual e futuro Docker.

---

## Problema

Sem contrato infra único, DATA-01, CONTAINER-01 e VALIDATION-01 podem divergir em paths, users, portas e backup — causando regressões operacionais.

---

## Decisão

Estabelecer **Infraestrutura Enterprise** como stack canónica:

| Camada | Componente |
|--------|------------|
| Edge | Nginx TLS :443 |
| App | Backend :4000 + Frontend :3000 (loopback) |
| Data | PostgreSQL 14+ |
| Persistência | `IMPETUS_HOME` (12 pastas) |
| Process | PM2 (Standard) ou Container (futuro) |
| Observabilidade | Logs locais + Prometheus/Grafana opcional |

**Princípio:** mesma arquitectura lógica independente do supervisor de processos.

---

## Consequências

- Runbooks DATA-01 e CONTAINER-01 mapeiam para o mesmo `IMPETUS_HOME`
- Migração VPS actual → Enterprise = remapeamento paths, não redesign
- Air-Gapped = mesmo stack, egress bloqueado

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| Infra diferente PM2 vs Docker | Divergência operacional |
| Kubernetes como default | Over-engineering para fábrica única |
| BD em cloud obrigatória | Viola on-prem |

---

## Referências

- `CERT-ONPREM-INFRA-01.md` Parte 2
- `infra/nginx/impetus.conf`, `ecosystem.config.js`
