# INCIDENT_KNOWLEDGE_BASE — Base de Conhecimento Permanente

**Programa:** INCIDENT-KNOWLEDGE-BASE-01  
**Data:** 2026-07-04  
**Uso:** Futuras investigações, SOC, threat intelligence, conformidade

---

## Indicadores de Compromisso (IOCs)

### IPs

| IP | ASN | Provider | Região | Classificação | Acção UFW |
|----|-----|----------|--------|---------------|-----------|
| `3.19.29.56` | AS16509 | AWS | us-east-2 (Ohio) | CLOUD_SCANNER | DENY |
| `35.153.53.215` | AS16509 | AWS | — | CREDENTIAL_SCAN | DENY |
| `216.238.69.243` | — | — | — | Mencionado, zero logs | DENY (preventivo) |
| `35.236.156.112` | — | — | — | Scanner histórico | DENY |
| `52.234.3.19` | — | AWS | — | Scanner | DENY |
| `34.174.144.217` | — | GCP | — | Scanner | DENY |
| `170.64.137.227` | — | — | — | Pós-Silvy | DENY |
| `195.178.110.199` | — | — | — | Pós-Silvy | DENY |
| `91.92.241.196` | — | — | — | Scanner | DENY |
| `216.238.69.243` | — | — | — | Baseline | DENY |
| `27.79.3.161` | — | — | — | SSH brute-force | DENY |
| `171.231.186.160` | — | — | — | Scanner | DENY |
| `134.122.102.174` | — | — | — | Scanner | DENY |
| `45.32.100.10` | AS20473 | Vultr | LATAM | CLOUD_SCANNER | Monitorar |

**IPs autorizados (operadores):** `170.246.0.0/16`, `186.225.0.0/16` (+ IPv6)

### ASNs

| ASN | Organização | Padrão |
|-----|-------------|--------|
| AS16509 | Amazon (AWS) | Cloud scanner, credential scan |
| AS20473 | Vultr Holdings | Cloud scanner |
| AS13335 | Cloudflare | Bots `.git/config` (não maliciosos por defeito) |

### Fingerprints HTTP

| Indicador | Valor | Significado |
|-----------|-------|-------------|
| Response size | **1020 bytes** exactos | Fallback SPA — **não é ficheiro real** |
| Response size | 146 bytes | nginx 404 text/plain pós-HARDENING |
| Response size | 655 bytes | `index.html` SPA legítimo |
| Status 444 | — | Conexão fechada sem resposta |
| Taxa | >50 paths/5min mesmo IP | Scanner — fail2ban threshold |

### User-Agents

```
Silvy X Ran
nikto
sqlmap
masscan
zgrab
GPTBot
Claude-SearchBot
python-requests
Go-http-client
curl
wget
```

Regex SEC-01: `backend/src/securityObservatory/classification/securityClassifier.js`

---

## TTPs (Tactics, Techniques, Procedures)

| TTP | Descrição | Detecção SEC |
|-----|-----------|--------------|
| T1595.002 | Active Scanning: Vulnerability Scanning | SEC-01, SEC-15 |
| T1592.002 | Gather Victim Host Information: Software | Credential scan paths |
| T1078 | Valid Accounts (tentativa) | SEC-01 AUTH_ATTEMPT |
| T1005 | Data from Local System | SEC-17 (exfiltração) |
| T1041 | Exfiltration Over C2 Channel | SEC-17 movement profiles |
| T1485 | Data Destruction | SEC-04 FILE_MISSING |
| T1190 | Exploit Public-Facing Application | nginx 404/403 |

### Padrão scanner IMPETUS

1. `GET /.env` e variantes (`/backend/.env`, `/api/.env`)
2. `GET /server.js`, `/docker-compose.yml`, `/package.json`
3. `GET /.git/config`
4. `GET /api/config`, `/api/env`
5. Alta taxa 404 + alguns 200 (fallback SPA pré-HARDENING)

### Padrão deleção filesystem

1. mtime coerente em múltiplas pastas (segundos)
2. Selectivo — não `rm -rf` total
3. Inclui docs Blueprint + scripts cert
4. Git HEAD íntegro
5. PM2 pode continuar online

---

## Campanhas documentadas

| ID | Nome | Período | IPs | Volume | Relacionada |
|----|------|---------|-----|--------|-------------|
| CAMP-01 | AWS Ohio Gustavo | 2026-07-02/03 | 3.19.29.56 + | ~23.000 | — |
| CAMP-02 | AWS isolado logs | 2026-07-03 02:04 | 3.19.29.56 | 151 | Possível CAMP-01 |
| CAMP-03 | Vultr | 2026-07 | 45.32.x | Desconhecido | **Não confirmada** com CAMP-01 |
| CAMP-04 | Silvy X Ran | 2026-07-04 | Variável | ~151 paths | Padrão similar CAMP-01 |

**Regra:** nunca afirmar "mesma campanha" sem evidência Confirmed/Likely (SEC-03).

---

## Paths-alvo (wordlist observada)

```
.env, .env.local, .env.production, .env.backup
backend/.env, frontend/.env
server.js, package.json, docker-compose.yml, Dockerfile
.git/config, .git/HEAD
secrets.json, config/master.key
wp-admin, phpmyadmin, actuator
api/config, api/env
credentials, appsettings
```

---

## Comportamentos de rede legítimos vs hostis

| Comportamento | Legítimo | Hostil |
|---------------|----------|--------|
| `GET /` 200 655B | SPA | — |
| `GET /assets/*.js` 200 >100KB | Bundle público | Scanner se path sem hash |
| `GET /.env` | — | Sempre hostil |
| `GET /server.js` 200 1020B | — (pré-HARDENING) | Falso positivo |
| `GET /api/auth/login` | Operador | Enumeração se taxa alta |
| SSH de 170.246.x / 186.225.x | Operador | — |

---

## Limitações conhecidas

| Limitação | Impacto | Compensação |
|-----------|---------|-------------|
| Fallback SPA histórico | Falso positivo 200 | HARDENING-01/02 |
| Sem auditd | Sem PID deleção | Activar auditd |
| PM2 dump segredos | Exposição local | chmod 600, secrets manager |
| Bundles públicos | Superfície client-side | Aceite por desenho; ofuscação limitada |
| Flags SEC OFF | Sem detecção activa em prod | SEC-09 promoção |
| Logs rotação nginx | Perda histórico | Arquivo imutável |

---

## Boas práticas (procedimentos)

### P1 — Preservar evidências (primeiros 15 min)

1. **Não reiniciar** PM2/nginx sem snapshot
2. Copiar logs nginx + auth
3. `git status` + `git ls-files --deleted` → ficheiro
4. `md5sum backend/src/server.js`
5. Fotografar transcripts Cursor se activos

### P2 — Investigar

1. Correlacionar mtime filesystem com auth.log SSH
2. Verificar bytes nas respostas HTTP 200 (não assumir sucesso)
3. Consultar este knowledge base para IOCs
4. Activar SEC-01+02 em read-only se disponível

### P3 — Recuperar

1. `git checkout HEAD -- $(git ls-files --deleted)` — **não** `impetus_complete/`
2. Validar MD5 server.js = HEAD
3. `pm2 reload` só após validação
4. Documentar em novo append ao INCIDENT_TIMELINE

### P4 — Conter

1. UFW DENY IP scanner
2. fail2ban (se activo)
3. nginx HARDENING rules
4. Não activar auto-block SEC sem SEC-12/13

---

## Estratégias de resposta

| Nível | Estratégia | Mecanismo |
|-------|------------|-----------|
| L0 Observe | Agregar, classificar | SEC-01 |
| L1 Correlate | Incidentes únicos | SEC-02 |
| L2 Enrich | ASN, campanha | SEC-03 |
| L3 Notify | Alertas deduplicados | SEC-05 |
| L4 Plan | Resposta sem execução | SEC-06, SEC-11 |
| L5 Execute LOW | Acções reversíveis | SEC-13 |
| L6 Block | Recomendações | SEC-14 (manual) |

---

## Lições permanentes (resumo)

1. **1020 bytes ≠ código lido**
2. **Git é canónico** para restauro
3. **Deleção ≠ exfiltração** — padrões diferentes
4. **Dois ASNs ≠ dois hackers**
5. **Documentar antes de recuperar**
6. **PM2 uptime ≠ integridade disco**

---

## Referências internas

- Dossiê: [`INCIDENT_MASTER_REPORT.md`](./INCIDENT_MASTER_REPORT.md)
- Evidências: [`INCIDENT_EVIDENCE_INDEX.md`](./INCIDENT_EVIDENCE_INDEX.md)
- SEC classificação: `SEC_01_CLASSIFICATION_RULES.md`
- Provider registry: `securityThreatIntelligence/engine/providerRegistry.js`

---

*INCIDENT KNOWLEDGE BASE — append-only para novos IOCs e campanhas.*
