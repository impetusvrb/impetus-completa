# ADR-012 — Perfis de Instalação Enterprise

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-INFRA-01  
**Relacionado:** ADR-004, ADR-009

---

## Contexto

Clientes Enterprise terão requisitos distintos: fábrica conectada (Standard), futuro Docker (Container), e redes isoladas (Air-Gapped).

---

## Problema

Definir perfis sem forks de código ou arquitectura cognitiva.

---

## Decisão

**Três perfis oficiais**, mesmo codebase, diferença em configuração e deploy:

| Perfil | Runtime | Internet | IA |
|--------|---------|----------|-----|
| **Enterprise Standard** | PM2 + Nginx + PG | Egress opcional | Opcional |
| **Enterprise Container** | Docker (CONTAINER-01) | Egress opcional | Opcional |
| **Enterprise Air-Gapped** | Standard ou Container | Bloqueada | Degradada |

Nenhum perfil remove `company_id`, Event Backbone ou módulos cognitivos.

---

## Consequências

- Documentação de instalação por perfil (DATA-01 / CONTAINER-01)
- Air-Gapped = env template sem API keys + firewall DENY egress

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| Binário Air-Gapped separado | Fork insustentável |
| Container como único perfil | PM2 válido; clientes sem Docker |
| Offline = desactivar Pulse | Viola contrato cognitivo |

---

## Referências

- `CERT-ONPREM-INFRA-01.md` Parte 4
