# INCIDENT_SECURITY_EVOLUTION — Evolução da Maturidade de Segurança

**Programa:** INCIDENT-KNOWLEDGE-BASE-01  
**Data:** 2026-07-04

---

## Modelo de evolução

```
Antes do incidente (Jun/2026)
        ↓
Após incidente Jul/2026 (pré-HARDENING)
        ↓
Após HARDENING-01
        ↓
Após SECURITY-BASELINE-01
        ↓
Após SEC-01 → SEC-08 (v1)
        ↓
Após SEC-09 → SEC-20 (v2)
        ↓
Após HARDENING-02 + fail2ban (Silvy)
        ↓
Estado actual (INCIDENT-KNOWLEDGE-BASE-01)
```

---

## Matriz de maturidade comparativa

| Dimensão | Pré-incidente | HARDENING-01 | SEC-01–08 | SEC-09–20 | Actual |
|----------|---------------|--------------|-----------|-----------|--------|
| **Superfície de ataque** | Fallback SPA; SSH password | nginx 404; SSH drop-in | Inventariada baseline | Anti-scanner analítico | 403 + rate limit + UFW |
| **Observabilidade** | Logs nginx básicos | integrity-check | SEC-01 agregação | SEC-07 SOC DTO | impetus_detailed + app log |
| **Detecção** | Manual | Scripts periódicos | Classificação determinística | SEC-15 enumeração | fail2ban (activo) |
| **Correlação** | Nenhuma | — | SEC-02 incidentes | SEC-03 campanhas | Endpoints audit |
| **Investigação** | Ad-hoc | Forensics docs | Timeline SEC-01 | SEC-17 exfiltração | **Dossiê IKB-01** |
| **Resposta** | Manual | Recovery scripts | SEC-06 planos | SEC-13 LOW auto | fail2ban + UFW |
| **Protecção activos** | UFW parcial | SHA256 baseline | SEC-04 integridade | SEC-17 movement | chmod 600 .env |
| **Resiliência** | Git recovery manual | 56 ficheiros auto | SEC-04 alertas | SEC-11 planos | PM2 secure restart |
| **Tempo resposta** | Horas–dias | ~4h restauro Jul | Minutos (se flags ON) | Simulação SEC-19 | Minutos (fail2ban) |
| **Maturidade Enterprise** | Ad-hoc | Reactive | **Certified v1** | **Certified v2** | Documented IKB |

---

## Scoring qualitativo (1–5)

| Fase | Observabilidade | Detecção | Resposta | Governança | Total |
|------|-----------------|----------|----------|------------|-------|
| Pré-incidente | 2 | 1 | 1 | 2 | **6/20** |
| HARDENING-01 | 2 | 2 | 2 | 3 | **9/20** |
| BASELINE-01 | 3 | 2 | 2 | 4 | **11/20** |
| SEC-08 v1 | 4 | 3 | 3 | 4 | **14/20** |
| SEC-20 v2 | 5 | 4 | 4 | 5 | **18/20** |
| Actual (ops) | 4 | 3 | 3 | 5 | **15/20** |

**Nota:** SEC-20 score reflecte capacidade **implementada**; produção actual ~15/20 porque flags SEC OFF e SEC-09 promoção pendente.

---

## Capacidades por incidente que as motivaram

| Incidente | Lacuna revelada | Capacidade criada |
|-----------|-----------------|-------------------|
| AWS scan 23k | Sem visibilidade | SEC-01, SEC-02 |
| AWS scan | Sem contexto ASN | SEC-03 |
| Fallback 1020B | Falso positivo | HARDENING-01 nginx |
| Deleção 342 | Sem alerta integridade | SEC-04, integrity-check |
| 23k eventos | Alert fatigue | SEC-05 dedup |
| Sem playbooks | Resposta ad-hoc | SEC-06, SEC-07 |
| Dúvida exfiltração | Sem camada dedicada | SEC-17 |
| Silvy 151 paths | Paths não bloqueados | HARDENING-02, SEC-15 |
| Scanners repetitivos | Sem bloqueio | fail2ban, SEC-14 |
| Certificação | Sem encerramento formal | SEC-08, SEC-20 |

---

## Comparativo OWASP / NIST (mapeamento simplificado)

| Controlo | Pré | Pós SEC-20 |
|----------|-----|------------|
| ID.AM — Asset inventory | Parcial | BASELINE-01 ✅ |
| DE.AE — Anomaly detection | Não | SEC-01 ✅ (flag OFF) |
| DE.CM — Continuous monitoring | Não | SEC-04 ✅ |
| RS.AN — Analysis | Manual | SEC-02, SEC-17 ✅ |
| RS.MI — Mitigation | Manual | HARDENING, fail2ban ✅ |
| RC.CO — Communication | Não | SEC-05 ✅ |

---

## Roadmap de maturidade futura

| Marco | Target | Dependência |
|-------|--------|-------------|
| SEC-09 promoção | 15/20 → 17/20 operacional | Activar flags staging |
| SH-01 FIM | 17/20 → 18/20 | Aprovação arquitectura |
| auditd + netflow | 18/20 → 19/20 | Ops |
| SOC 24/7 | 19/20 → 20/20 | Equipa + processos |

---

## Certificações relacionadas

| Certificação | Relação com incidentes |
|--------------|------------------------|
| SECURITY-BASELINE-01 | Estado referência pós-HARDENING-01 |
| SEC-08 | Enterprise Security v1 — CERTIFIED WITH REMARKS |
| SEC-20 | Enterprise Security v2 — encerramento formal |
| CERT-ONPREM-FORENSICS-01 | Laudo arquitectural pré-SEC |
| INCIDENT-KNOWLEDGE-BASE-01 | Dossiê permanente (este programa) |

---

*Evolução de maturidade — baseline para auditorias futuras.*
