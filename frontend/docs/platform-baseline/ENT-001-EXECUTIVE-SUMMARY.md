# ENT-001 — Executive Summary

**Programa:** Enterprise Platform Knowledge Baseline  
**Data:** 2026-07-20  
**Princípio:** CONSOLIDATE BEFORE EVOLVE

---

## Decisão estratégica

Antes de evoluir Finance, Produção, RH ou qualquer outro domínio, a plataforma necessitava responder:

> **"O que realmente existe hoje na plataforma?"**

ENT-001 transforma o conhecimento disperso de CPL, FIN-AUD e REG numa **Baseline Oficial** — sem nova auditoria extensiva e sem alterar código certificado.

---

## O que foi consolidado

| Programa | Contribuição |
|----------|--------------|
| CPL-001→003 | Discovery, registry, governance cognitiva |
| FIN-AUD-001 | Capacidades financeiras reais vs GREENFIELD |
| REG-001/002 | Regressões, recuperações, dead-click matrix |
| OPM/WMS | Baseline operacional congelada |
| EOX/NAV | Domínios, rotas, apresentação |

---

## Resposta executiva

| Dimensão | Quantidade |
|----------|------------|
| Domínios catalogados | **20** |
| Módulos e páginas | **33** |
| Runtimes | **27** |
| Capacidades cognitivas | **54** |
| Integrações mapeadas | **35** |

### Domínios certificados
- **Logística WMS** — único domínio congelado (OPM-003–008, OPM-GOV, WMS-REF)

### Domínios maduros
- Qualidade, Segurança, Ambiente, Centro Comando, Centro Cognitivo, Nexus IA, Operacional

### Domínios parciais (integrar antes de rebuild)
- **Finance** — custos/leakage/Nexus existem; domínio nativo não
- Supply, Executivo, Audit, Compliance

### Descobertos desconectados
- PPAP, MSA, Ishikawa, Compras — cockpits/capacidades vivas, EOX inactivo

### Não iniciados
- Produção, Manutenção, RH

---

## Descobertas-chave (reconfirmadas na consolidação)

1. **Finance não é GREENFIELD total** — inteligência financeira operacional madura; ERP nativo sim é GREENFIELD.
2. **Padrão REG é transversal** — serviços existem, ligação HTTP/menu quebrada (recuperado em R1–R6).
3. **CPL é referência cognitiva** — adapters activos em Q/S/E/Logistics; finance/command_center planeados.
4. **WMS é baseline de referência** — evolução seguinte deve replicar disciplina OPM, não reinventar.

---

## Recomendação

1. **Concluir ENT-001** ✓ (baseline disponível)
2. **Reunião de arquitectura** — escolher próximo domínio com heatmap
3. **Finance provável candidato #1** — abordagem `integrate_then_develop`, não FIN-001 directo
4. **Manter protocolo** — zero alteração fora de escopo; componentes certificados intocáveis

---

## Entregáveis

- `frontend/src/platform/knowledge/` — índices read-only
- `frontend/docs/platform-baseline/ENT-001-*.md` — 9 documentos
- `npm run test:ent001` — certificação integridade

---

## Validação

```bash
cd frontend && npm run test:ent001
```

Resultado esperado: `validateEnt001Integrity().valid === true`
