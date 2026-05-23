# Enterprise Cognitive Gap Report

**Fase:** Z.P0 · **Data:** 2026-05-22

## cockpit_ready_domains
- quality
- safety
- hr
- production
- environmental
- executive

## hybrid_domains (engines exist, cockpit not native)
- maintenance

## Domain matrix

| Domínio | Maturity | Ready | Genericity | Priority | Engines | Readiness |
|---------|----------|-------|------------|----------|---------|-----------|
| Qualidade | native | yes | 0.25 | P3 | 101 | high |
| Segurança do Trabalho | native | yes | 0.25 | P3 | 25 | high |
| Recursos Humanos | native | yes | 0.25 | P2 | 25+ | high |
| Meio Ambiente | native | yes | 0.28 | P1 | 108+ | high |
| Manutenção | foundation | no | 0.72 | P1 | 0 | low |
| Produção | native | yes | 0.28 | P0 | 30+ | high |
| Executivo | native | yes | 0.30 | P0 | 18 | high |

## Domínios fora do registry Z.24 (auditoria adicional)

- **Logística**: logisticsIntelligenceService parcial; sem domínio no registry Z.24
- **Financeiro**: finance_management profile; sem cognitive domain pack
- **PCP**: analyst_pcp profile; axis production/pcp
- **Supply Chain**: fornecedor ligado a quality.supplier; sem domínio SCM
- **Comercial**: sem perfil cognitive dedicado no registry

## Rollout priority (recomendado)

1. ~~production (P0)~~ — concluído
2. ~~environmental (P1)~~ — concluído
3. ~~environmental live validation (P1.1)~~ — concluído
4. ~~executive (Z.27)~~ — concluído
5. Z.28 adaptive orchestration — **concluído**
6. Z.29 governance learning — **concluído**
7. maintenance (Z.M1) — **próximo**
7. ~~hr (Z.26)~~ — concluído
8. logistics / engineering / commercial (P3)
