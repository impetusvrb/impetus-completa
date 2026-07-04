# SEC-15 — Enterprise Anti-Scanner & Anti-Enumeration

**Módulo:** `backend/src/securityAntiScanner/`  
**Feature flag:** `SECURITY_ANTI_SCANNER=false` (default)  
**Modo:** `SECURITY_SURFACE_PROTECTION_MODE=observe`  
**Tipo:** Analítico e consultivo — **nenhuma alteração HTTP ou infra**

---

## Missão

Transformar o IMPETUS num alvo **difícil de enumerar**, identificando scanners e tentativas de mapeamento da superfície pública, e construindo **planos de protecção** sem modificar o comportamento do servidor nesta fase.

---

## Objectivo

Reduzir a capacidade de scanners automatizados realizarem:

- Enumeração de endpoints
- Descoberta de APIs
- Fingerprinting da aplicação
- Varredura de ficheiros sensíveis
- Mapeamento da arquitectura

---

## Flags

```env
SECURITY_ANTI_SCANNER=false
SECURITY_SURFACE_PROTECTION_MODE=observe
SECURITY_ANTI_SCANNER_REQUIRE_APPROVAL=true
SECURITY_ANTI_SCANNER_EVAL_MS=60000
```

---

## Endpoint

```
GET /api/audit/security-anti-scanner
```

---

## DTO `anti_scanner_v1`

| Campo | Descrição |
|-------|-----------|
| `scannerDetected` | Scanner identificado |
| `scannerConfidence` | Confiança 0–1 |
| `enumerationDetected` | Enumeração detectada |
| `attackPattern` | Padrão agregado |
| `protectionRecommendation` | Acção principal recomendada |
| `recommendedSurfaceProfile` | NORMAL, STEALTH, HARDENED, PROTECTED |
| `approvalRequired` | Sempre `true` por defeito |

---

## Proibições

- Alterar nginx, firewall, PM2
- Bloquear IP · tarpits · delays · modificar respostas HTTP
- Alterar Event Governance · ECO · Enterprise Baseline

---

## Teste

```bash
node backend/src/tests/securityAntiScanner/SEC_15_ANTI_SCANNER.test.js
```

---

*Filosofia: enganar e degradar eficiência do atacante (planos) antes de bloqueios (SEC-17+).*
