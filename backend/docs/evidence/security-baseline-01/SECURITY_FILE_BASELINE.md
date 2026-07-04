# SECURITY_FILE_BASELINE — Inventário de Ficheiros Críticos

**Certificação:** SECURITY-BASELINE-01  
**Git HEAD:** `daf338657ac3a90fe777dad78c5936d75b89b090`  
**Git deleted:** 0 ficheiros

---

## Resumo quantitativo

| Categoria | Ficheiros | Evidência hash |
|-----------|-----------|----------------|
| Runtime backend | `server.js` + routes/services | manifest parcial |
| Runtime frontend | `vite.config.js`, `serveDist.cjs`, `dist/` | manifest parcial |
| Blueprint Vol. 00–10 + templates | 1078 paths `.md` | `blueprint-volumes.sha256` |
| Config infra | nginx, ssh, ecosystem, CI | `critical-files.sha256.manifest` |
| Docs enterprise | FUNCTIONAL_MATRIX, HARDENING-01 | manifest |
| Secrets template | `.env.example` (314 vars) | manifest |
| Secrets runtime | `.env` (presente, **não** no manifest público) | — |

---

## Ficheiros críticos — SHA256 registado

| Criticidade | Path | SHA256 | Bytes |
|-------------|------|--------|-------|
| P0 | `backend/src/server.js` | `56f95db482d1c7527261020e1bf099797eaeda3fc91908cee496c06823d45bad` | 94 712 |
| P0 | `ecosystem.config.js` | `144643fdcaad75cd84a5c148ac0ac12b70cf33c5729c1a09d0c1b7b345be0ad3` | 1 928 |
| P0 | `backend/src/config/security.js` | `06a713e6b57c1241de27e6355f53669bd7e6830d9c293012d4af8f85b092d9d4` | 2 936 |
| P0 | `/etc/nginx/sites-available/impetus` | `c595ff376d724d47ea803cce668ab4a2a766624841dc3d26e3b241800d33829d` | 3 898 |
| P0 | `infra/nginx/impetus-hardening-locations.conf` | `1bcb48661eb373ca8ac4adff548aeef32a96d4149273f4338e80c0b01fdca92f` | 1 583 |
| P1 | `frontend/serveDist.cjs` | `9197c935a461f32e91605ea554e8d56c85c0c27b1127e6ad0476c20e0aa62a4a` | 6 736 |
| P1 | `frontend/vite.config.js` | `8eeef053bfcdf2695c876dd36c34d07abec31c7531e357a249755c9e9948c7d1` | 9 393 |
| P1 | `backend/.env.example` | `0e4f57f52e37b8290943573d528ee3bb160b071708a3fe63bf934833fd4b8976` | 34 141 |
| P1 | `/etc/ssh/sshd_config.d/99-impetus-hardening.conf` | `580a3f0ec8aff2251de052fa3fda286e721e86fd26371e236a18178f2bf59132` | 820 |
| P2 | `backend/docs/FUNCTIONAL_MATRIX.json` | `06ff02becb8c873a2a6d313fdbe17db24c1c4c5fc088e4781a48566a742ef493` | 60 948 |
| P2 | `backend/docs/FUNCTIONAL_MATRIX.md` | `ae8703750cb2963a8e5eab9438ceeaed963fed3ff98f12b46b364acdd13b0ae8` | 118 490 |
| P2 | Blueprint Vol. 00 | `74a0695a60fd431f244fab92ed5d623fc3b81f3d3f89d45e0f03862ebb7035bd` | 13 607 |
| P2 | Blueprint Vol. 10 | `30f2f18c25cd7ca54718a2d4d51619b7354e37e36dc488d1f9773dbc2974e306` | 4 506 |
| P2 | `.github/workflows/cert-drift.yml` | `252631e10fe8eed8476d978562f049abf89d160f9d072f776031347b03deaecc` | 761 |
| P2 | `backend/scripts/audit/e2e_cert_all.js` | `6448db92f464501189df1b912d63fa1f464cfcc952a1320b3cb6e6a6c6c3884d` | 700 |
| P2 | `backend/scripts/run-all-migrations.js` | `cc7fceb14d2bb008edce5e740d523d01ed56a3fe08aa91aa7e73198ad6ac0b27` | 21 705 |

Fonte completa: `critical-files.sha256.manifest`

---

## Blueprint — Volumes 00–10

| Volume | Título | Estado disco |
|--------|--------|--------------|
| 00 | CARTA-MAGNA | ✅ presente |
| 01 | ARQUITETURA-COGNITIVA-GLOBAL | ✅ |
| 02 | DASHBOARD-VIVO | ✅ |
| 03 | ARQUITETURA-POR-CARGO | ✅ |
| 04 | CATALOGO-MOTORES | ✅ |
| 05 | EXPERIENCIA-USUARIO | ✅ |
| 06 | INTEGRACAO-MODULOS | ✅ |
| 07 | TODOS-DASHBOARDS | ✅ |
| 08 | TODAS-TELAS | ✅ |
| 09 | ARQUITETURA-IA | ✅ |
| 10 | ROADMAP-ENTERPRISE | ✅ |
| templates/ | 4 templates | ✅ |

Hashes individuais: `blueprint-volumes.sha256` (1078 entradas inclui ICEB, INVENTORY, etc.)

---

## Scripts enterprise / audit restaurados (HARDENING-01)

| Path | Criticidade |
|------|-------------|
| `backend/scripts/audit/*` (18 scripts) | P2 — certificação |
| `backend/scripts/ops/*` | P2 — operações |
| `scripts/deploy-impetus.sh` | P1 |
| `scripts/cert-drift-gate.sh` | P2 |
| `scripts/integrity-check.sh` | P1 — integridade |

---

## `.env` — política baseline

| Ficheiro | Presente | No manifest | Motivo |
|----------|----------|-------------|--------|
| `backend/.env` | Sim (43 770 B) | **Não** | Segredo runtime — hash offline separado |
| `backend/.env.example` | Sim | **Sim** | Template público |
| `backend/.env.pre-promotion-*` | Sim (backups) | Não | Segredos |

**Rotação:** valores runtime nunca entram na baseline pública.

---

## Git integrity

| Métrica | Valor |
|---------|-------|
| HEAD | `daf338657` |
| Branch | `main` |
| Deleted tracked | **0** |
| `.git/objects` | ~608 MB |
| Submodule | `lipsync/Wav2Lip` presente |

---

## Criticidade — legenda

| Nível | Significado |
|-------|-------------|
| **P0** | Compromisso = indisponibilidade ou exposição crítica |
| **P1** | Config/infra — alteração requer auditoria |
| **P2** | Documentação/certificação — IP enterprise |

---

## Rollback documental

Para restaurar estado certificado:

```bash
git checkout daf338657 -- <path>
# ou comparar hash:
sha256sum -c critical-files.sha256.manifest
```

Colector: `bash scripts/security-baseline-01-collect.sh`
