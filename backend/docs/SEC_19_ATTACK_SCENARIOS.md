# SEC-19 — Cenários de Ataque Simulados

**Simulação controlada — sem tráfego HTTP real, sem download de ativos reais.**

## Parte 1 — Scanner

| ID | Alvo simulado | Classificação |
|----|---------------|---------------|
| scan-env | `/.env` | PATH_ENUMERATION |
| scan-git | `/.git/config` | PATH_ENUMERATION |
| scan-docker | `/docker-compose.yml` | PATH_ENUMERATION |
| scan-backup | `/backup/db.sql` | PATH_ENUMERATION |
| scan-config | `/backend/.env.example` | CONFIG_PROBE |
| scan-credentials | `/api/auth/credentials` | CREDENTIAL_SCAN |

## Enumeração

| ID | Alvo | Classificação |
|----|------|---------------|
| enum-apis | `/api/v1` | API_ENUMERATION |
| enum-endpoints | `/api/audit/security-incidents` | API_ENUMERATION |
| enum-uploads | `/api/uploads` | UPLOAD_PROBE |
| enum-assets | `/frontend/dist/assets/` | ASSET_DISCOVERY |
| enum-admin | `/api/admin` | ADMIN_PROBE |

## Crawling

| ID | User-Agent | Classificação |
|----|------------|---------------|
| crawl-gptbot | GPTBot/1.0 | BOT_CRAWL |
| crawl-claudebot | ClaudeBot/1.0 | BOT_CRAWL |
| crawl-generic | python-requests/2.31.0 | GENERIC_CRAWL |
| crawl-human | Mozilla/5.0 Chrome/120 | HUMAN_BROWSER |

## Reconhecimento

| ID | Técnica | Classificação |
|----|---------|---------------|
| recon-fingerprint | health/deep | FINGERPRINT |
| recon-mass404 | batch 404 (5k virtual) | MASS_404 |
| recon-source | server.js | SOURCE_DISCOVERY |
| recon-robots | robots.txt | ROBOTS_PROBE |
| recon-favicon | favicon.ico | FINGERPRINT |
| recon-sourcemap | main.js.map | SOURCE_MAP_PROBE |

## Exfiltração simulada

| ID | Padrão | Nota |
|----|--------|------|
| exfil-sequential | sequential_downloads | Lógico only |
| exfil-scraping | mass_scraping | Sem bytes reais |
| exfil-chained | chained_downloads | Timeline sintética |
| exfil-mass-read | mass_read | Profiler SEC-17 |
| exfil-critical | critical_assets | Registry lógico |

## Incidente composto

Cadeia reproduzindo padrão pós-incidente:

```
Reconhecimento → Enumeração → Tentativa credenciais → Scraping → Movimentação → Encerramento
```

Incidentes injectados via SEC-02 (`createSecurityIncidentDto`). Detecção validada consultando dashboards SEC-14→18 read-only.

## Implementação

`backend/src/securityOperationalCertification/simulations/attackScenarioCatalog.js`  
`backend/src/securityOperationalCertification/simulations/attackSimulationRunner.js`
