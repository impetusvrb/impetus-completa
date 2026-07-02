# ADR-002 — Single-Tenant Lógico

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-ARCHITECTURE-01  
**Relacionado:** ADR-001, ADR-003

---

## Contexto

A migração Enterprise On-Premise destina-se a instalações em fábricas individuais ou holdings com política de isolamento por instalação. O laudo forense classificou o IMPETUS como SaaS Multi-Tenant Híbrido, não como single-tenant nativo.

---

## Problema

Como operar uma fábrica única sem:

1. Remover capacidades multi-tenant do código (risco de regressão)?
2. Manter portal SaaS, billing e onboarding público activos (inadequado on-prem)?
3. Confundir operadores com múltiplas empresas numa instalação não intencional?

---

## Decisão

Adoptar o padrão **Single-Tenant Lógico**:

| Aspecto | Regra |
|---------|-------|
| Instalação | 1 instalação IMPETUS Enterprise = 1 empresa operacional |
| `companies` | Exactamente 1 registo activo por instalação |
| Schema multi-tenant | 100% preservado (colunas, guards, RLS registry) |
| Capacidades SaaS | Desactivadas via configuração e distribuição (ADR-003) |
| Código | Idêntico ao SaaS; sem branch fork |

---

## Consequências

### Positivas

- Modelo mental claro para o cliente: “esta instalação é a minha fábrica”
- Setup inicial via `install-industrial.sh` + `/setup-empresa` (fluxo existente)
- Possibilidade futura de N companies numa instalação (holding) sem alterar código

### Negativas

- Middleware de isolamento executa verificações “desnecessárias” com 1 tenant
- Overhead conceptual mínimo para equipas de instalação

---

## Alternativas descartadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| Fork Enterprise com schema simplificado | Dois codebases; regressão garantida |
| Multi-tenant pleno on-prem (N fábricas, 1 instalação) | Fora de scope inicial; possível futuro via ADR-001 |
| Remover guards de tenant | Viola contratos de segurança e CERT-PULSE-05 |
| Converter para true single-tenant (sem `companies`) | Ver ADR-001 |

---

## Referências

- `backend/docs/INSTALACAO_INDUSTRIAL.md`
- `backend/scripts/ops/install-industrial.sh`
- CERT-ONPREM-FORENSICS-01, Parte 1 e 4
