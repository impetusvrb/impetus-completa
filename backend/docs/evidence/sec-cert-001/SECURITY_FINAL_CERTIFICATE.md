# SEC-CERT-001 — Certificado Final Operacional

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║          CERTIFICADO OPERACIONAL — CAMADAS DE PROTEÇÃO IMPETUS               ║
║                                                                              ║
║  Missão:    SEC-CERT-001                                                     ║
║  Data:      2026-07-23                                                       ║
║  Sequência: SEC-OBS-001 → SEC-COVERAGE-001 → SEC-CERT-001                   ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  SECURITY_OPERATIONAL_CERTIFICATION = APPROVED_WITH_LIMITATIONS              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Declaração formal

> O painel **Camadas de Proteção – IMPETUS** foi submetido a uma sequência completa de auditoria, cobertura e certificação operacional. Com base nas evidências recolhidas, nos testes executados e nas verificações de consistência multi-fonte realizadas em 2026-07-23, declara-se:
>
> **O painel representa fielmente o estado operacional do sistema de segurança do IMPETUS e pode ser utilizado como instrumento oficial de tomada de decisão durante incidentes de segurança.**
>
> Esta declaração é válida para as 10 camadas classificadas como CERTIFIED e para as 8 classificadas como CERTIFIED_WITH_LIMITATIONS, desde que o operador esteja ciente das limitações formalmente registadas em `SECURITY_LIMITATIONS_REGISTER.md`.

---

## Justificativa: APPROVED_WITH_LIMITATIONS (não APPROVED pleno)

APPROVED pleno exigiria que todas as 18 camadas tivessem telemetria ≥ MEDIUM e 0 gaps P1 abertos. As 3 camadas de telemetria LOW (INJECT_PROT, CORRELATION, INTEGRITY) e o gap GAP-INT-01 (sensor de integridade) justificam a limitação. O painel é operacionalmente confiável — a limitação é de completude, não de exactidão.

---

## Sumário executivo de cobertura

| Dimensão | Resultado |
|---|---|
| Camadas certificadas | 18/18 (10 CERTIFIED + 8 WITH_LIMITATIONS) |
| Camadas NOT_CERTIFIED | 0 |
| Estados ambíguos | 0 |
| Estados sem suporte | 0 |
| Defeitos P0 (todos os ciclos) | 3 — todos fechados (RATE_LIMIT, OBSERVATORY, AUDIT) |
| Defeitos P1 abertos | 1 (GAP-INT-01 — sensor integridade) |
| Consistência multi-fonte | YES — 7 métricas, 0 divergências |
| Resiliência pós-restart | CONFIRMADA |
| Resiliência pós-log-rotation | CONFIRMADA |
| Reprodutibilidade transições | PARTIAL (todas por código; ao vivo para camadas com eventos reais) |
| Score Phase C weekly-sim | 0.64 / CERTIFIED_WITH_REMARKS (estável) |

---

## Baseline certificado

**Snapshot de referência:** `2026-07-23T01:11:xx.xxxZ`

Estado do painel no momento da certificação (origem `??`):
```
NGINX         ATUOU         ← 74 hits suspeitos
FAIL2BAN      OBSERVADA     ← activo; 0 bans desta origem
UFW           ATUOU         ← 25 regras DENY para IPs desta origem  
CLOUDFLARE    OBSERVADA     ← proxy guard configurado
RATE_LIMIT    ATUOU         ← 104 eventos limit_req (error.log.1)
AUTH_GUARD    ATUOU         ← 8 tentativas de autenticação
BOT_DETECT    OBSERVADA     ← Turnstile activo
RBAC          OBSERVADA     ← externo não autentica (design)
INPUT_VAL     OBSERVADA     ← sem payload malicioso nesta janela
INJECT_PROT   OBSERVADA     ← middleware activo (constante)
TLS           OBSERVADA     ← cert válido até 2026-10-04
TENANT_ISO    N/A           ← RLS piloto; N/A para origem externa
OBSERVATORY   ATUOU         ← SEC-01 activo + eventos desta origem
CORRELATION   OBSERVADA     ← SEC-02 activo (constante)
BACKUP        N/A           ← ADR-018 pendente; N/A de escopo
INTEGRITY     OBSERVADA     ← fail2ban proxy (GAP-INT-01)
DB_PROTECT    OBSERVADA     ← RLS piloto activo
AUDIT         ATUOU         ← eventos desta origem registados
INCIDENT      ATUOU         ← IPs bloqueados por fail2ban/UFW
GOVERNANCE    OBSERVADA     ← ciclo SEC activo (score 0.64)
```

---

## Próximas acções autorizadas

Antes de qualquer nova camada de segurança, executar obrigatoriamente:

| Prioridade | Acção | Referência |
|---|---|---|
| **1ª** | Implementar sensor real de integridade (GAP-INT-01) | `SECURITY_LIMITATIONS_REGISTER.md#LIM-06` |
| **2ª** | Operacionalizar pipeline backup imutável diário (ADR-018) | `backend/docs/adrs/ADR-018-backup-estrategia.md` |
| **3ª** | Corrigir script de simulação (GAP-SIM-01) | `SECURITY_LIMITATIONS_REGISTER.md#LIM-10` |
| **4ª** | Rever score Phase C após GAP-INT-01 (meta ≥ 0.75) | `adminPortalSecurityPhaseCService.js` |

---

## Evidências deste ciclo de certificação

```
backend/docs/evidence/
├── sec-obs-001/
│   ├── SECURITY_LAYER_TELEMETRY_AUDIT.md
│   ├── SECURITY_LAYER_STATUS_MATRIX.md
│   └── SECURITY_LAYER_GAP_ANALYSIS.md
├── sec-coverage-001/
│   ├── SECURITY_LAYER_COVERAGE_AUDIT.md
│   ├── SECURITY_LAYER_TRANSITION_MATRIX.md
│   ├── SECURITY_LAYER_VALIDATION_MATRIX.md
│   ├── SECURITY_LAYER_CONFIDENCE_MATRIX.md
│   └── SECURITY_LAYER_CERTIFICATION_REPORT.md
└── sec-cert-001/
    ├── SECURITY_CERTIFICATION_MATRIX.md
    ├── SECURITY_REPRODUCIBILITY_REPORT.md
    ├── SECURITY_MULTI_SOURCE_CONSISTENCY.md
    ├── SECURITY_LIMITATIONS_REGISTER.md
    ├── SECURITY_OPERATIONAL_CERTIFICATION.md
    └── SECURITY_FINAL_CERTIFICATE.md  ← este ficheiro
```

---

## Integridade forense

```
FORENSIC_EVIDENCE_PRESERVED      = TRUE
STORAGE_REMEDIATION_UNTOUCHED    = TRUE
DELETION_EXECUTED                = NO
CHAIN_OF_CUSTODY_2026_07.md      mtime: 2026-07-13T16:41:48Z (inalterado)
SOURCE_SHA256_COMPLETE_MANIFEST  mtime: 2026-07-13 (inalterado)
```

---

*DO NOT REOPEN WITHOUT NEW REGRESSION EVIDENCE OR NEW INCIDENT REQUIRING REVIEW.*
