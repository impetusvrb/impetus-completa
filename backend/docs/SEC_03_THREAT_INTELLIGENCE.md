# SEC-03 — Enterprise Threat Intelligence Engine

**Fase:** SEC-03  
**Modo:** Consultativo only — zero auto-response  
**Feature flag:** `SECURITY_THREAT_INTELLIGENCE=false` (default)

---

## Propósito

Responder **"O que esse incidente significa?"** com contexto, hipóteses e probabilidades — sem inferir identidade ou número de actores.

Inteligência **interna** baseada em evidências SEC-01/SEC-02 — sem feeds externos obrigatórios, sem ML, sem IA generativa.

---

## Activação

```bash
SECURITY_OBSERVATORY=true
SECURITY_CORRELATION_ENGINE=true
SECURITY_THREAT_INTELLIGENCE=true

pm2 restart impetus-backend --update-env
```

---

## Endpoint

```
GET /api/audit/security-threat-intelligence
Authorization: Bearer <tenant_admin>
```

---

## Princípio arquitectural

> O sistema **nunca** infere identidade ou número de atacantes.

Avaliações: "mesma campanha provável", "campanhas independentes possíveis", "evidência insuficiente".

---

## Componentes

| Componente | Path |
|------------|------|
| Threat Intelligence Engine | `backend/src/securityThreatIntelligence/engine/` |
| Threat Profile DTO | `dto/threatProfileDto.js` |
| Campaign Assessor | `engine/campaignAssessor.js` |
| Historical Intelligence | `engine/historicalIntelligence.js` |
| Provider Registry (interno) | `engine/providerRegistry.js` |

---

## Referências

- SEC-01 Observatory
- SEC-02 Correlation Engine
- Observação Gustavo: não concluir "dois hackers" sem evidência
