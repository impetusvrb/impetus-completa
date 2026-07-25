# ENT-AUD-002 — Dependency Graph

```mermaid
flowchart TD
  B[PLATFORM-2026.1 / SYSTEM v1.4] --> H[Horizontal capabilities]
  H --> W[WMS / OPM]
  H --> C[CPL / Cognitive]
  H --> P[Prediction Platform]
  H --> G[Governance / Security]

  W --> L[Logistics / Supply]
  C --> A[AIOI foundation]
  P --> F[Finance 2.4]
  F --> FC[FIN-CERT-001]
  FC --> DG[DOMAIN-GOV-001]

  R0[P0 data integrity] --> OH[Operational homologation]
  R1[PM2 + PostgreSQL stability] --> OH
  R2[Secrets + SEC-05] --> OH
  R3[Test/API sources of truth] --> OH
  OH --> AD[Operational adoption]
  AD --> ND[New domains]

  E[Energy history] --> PE[Prediction coverage expansion]
  PE --> FB[Future Finance Business Case]

  A --> AP[AIOI pilot]
  AP --> AA[AIOI activation governance]
  AA --> AD

  L --> LR[Remove synthetic fallbacks]
  LR --> AD
```

## Bloqueios

- Novos domínios dependem do fechamento P0/P1 e homologação operacional.
- AIOI activation depende de piloto, governança, queue precedence e observabilidade.
- Prediction energética depende de histórico energético certificado; não bloqueia Wave 1.
- Supply business activation depende de decisão explícita de flags e readiness externo.
- Projetos verticais futuros dependem de Business Case e Capability Reuse Checklist.

## Dependências a evitar

- domínio → motor preditivo próprio;
- UI → dados sintéticos como fallback;
- certificado → suposição automática de runtime ativo;
- roadmap antigo → decisão sem reconciliação com baseline atual;
- código frontend → segredo ou decisão de autorização.

