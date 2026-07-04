# SEC-04 — Baseline Comparison

## Fontes congeladas

| Ficheiro | Uso |
|----------|-----|
| `critical-files.sha256.manifest` | Hash P0/P1/P2 |
| `blueprint-volumes.sha256` | Blueprint Vol. 00–10 |
| `pm2-processes.snapshot.json` | Processos PM2 |
| `listening-ports.snapshot.txt` | Portas baseline |
| `api-mount-paths.txt` | 150 API mounts |
| `ufw.snapshot.txt` | Regras firewall |
| `criteria.json` | Git HEAD, frozen_at |

## Comparações

- **Hash:** SHA256 actual vs manifest
- **Git HEAD:** actual vs `daf338657...` (warning se diverge pós-deploy)
- **PM2:** script path, status, restart count
- **Config:** LISTEN_HOST=127.0.0.1, nginx, SSH hardening
- **Network:** 3000/4000 localhost-only; 80/443/22 públicos esperados

## Integrity Status

| Status | Condição |
|--------|----------|
| INTEGRITY_OK | score ≥ 0.95, zero critical |
| DEGRADED | drift parcial ou warnings |
| COMPROMISED | ficheiros ausentes, bind público, múltiplos critical |
| UNKNOWN | PM2/portas indisponíveis |
