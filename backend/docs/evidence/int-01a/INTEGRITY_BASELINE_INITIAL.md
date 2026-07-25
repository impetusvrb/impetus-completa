# Baseline Criptográfico Inicial — IMPETUS

**Documento:** INTEGRITY_BASELINE_INITIAL.md  
**Missão:** INT-01A  
**Data:** 2026-07-23  
**Status:** BASELINE_CREATED  
**BASELINE_ID:** INT-01A-BASELINE-20260723  
**Algoritmo:** SHA-256  
**Gerado em:** 2026-07-23T12:16:45Z  
**Ambiente:** Produção (plataformaimpetus.com)

---

## 1. Declaração de baseline

Este documento constitui o **Baseline Criptográfico Inicial** do IMPETUS, gerado em produção após a aprovação do `SEC-BASELINE-001` e da arquitectura `GAP-INT-01-ARCH`.

Os hashes registados representam o **estado íntegro verificado** dos activos críticos do sistema em 2026-07-23. Este baseline é a fonte de verdade para todas as verificações de integridade futuras.

---

## 2. Tabela de hashes — Activos CRÍTICOS

| ID | Activo | SHA256 | Tamanho | mtime |
|---|---|---|---|---|
| INT-C-001 | server.js | `8087a73e118d5aea3fb8b80fe627b79a93be41628ce66f74a365d75efe8506a0` | 104.260 B | 2026-07-21T18:55:14Z |
| INT-C-002 | .env | `aaf1d2455f08f7cf62807fe6c03251118f8281afdd1aa7b1e9136e02bec216ef` | 46.414 B | 2026-07-18T21:13:38Z |
| INT-C-003 | ecosystem.runtime.config.cjs | `7dcbdb6d348a3f8db9e7573dbb135eabc3421f2222e692347383f1657a39943c` | 1.321 B | 2026-07-21T17:58:26Z |
| INT-C-004 | nginx site: impetus | `9adf69c34dc7694e59f808fc3c088c9d53e776d449e35b50f8dec18c079daaba` | 5.490 B | 2026-07-09T20:26:44Z |
| INT-C-005 | cloudflare-proxy-guard.conf | `4a7f1355a26e951ef73d9a02730478b1a22d241c7a762bb8557a33eef31627c7` | 376 B | 2026-07-09T11:02:02Z |
| INT-C-006 | hardening-locations.conf | `943bc17a8cfae8d25bbd007b2ca811585a20038233b8a43d753180347f2aa0b5` | 1.769 B | 2026-07-09T11:00:57Z |
| INT-C-007 | cert.pem → cert2.pem | `bde8d715355c39b0ee40c252a5a56fd607c5c94f24487bd121c3d49ac3170e62` | 1.346 B | 2026-07-07T09:23:15Z |
| INT-C-008 | privkey.pem → privkey2.pem | `7ce3281c5a5680f0558e2b4489bb49c2856d68ad1c608af8eec8b71bd922d9b8` | 241 B | 2026-07-07T09:23:15Z |
| INT-C-009 | fail2ban impetus.conf | `f9c567dc71c76690b66b0121bd04d02d683b6a836eb4d4328b20c85bec73dcec` | 751 B | 2026-07-07T04:44:06Z |
| INT-C-010 | auditd impetus.rules | `e22c16dcfec5b8effba9155007495d916ce14521f13af768806740a4fa548a97` | 2.151 B | 2026-07-05T11:15:21Z |

---

## 3. Tabela de hashes — Activos HIGH (selecção)

| ID | Activo | SHA256 | Tamanho | mtime |
|---|---|---|---|---|
| INT-H-001 | adminPortalSecurityDashboardService.js | `03c238c8ed64f0a8e9d02c7ebf50d62ebecbe29390346c489e86ec04b8bff8a7` | 30.860 B | 2026-07-22T23:49:28Z |
| INT-H-002 | adminPortalSecurityIntelligenceService.js | `54d74f071025fe7ba8edf38fa47d91d3c6005fd1f281b33cddad46e62f58e66b` | 29.013 B | 2026-07-22T23:50:34Z |
| INT-H-003 | cognitiveBoundaryGuard.js | `01e016f9d0ae8dac969c5e17f064ab712285a8473d565f01549013e8e460c059` | 3.503 B | 2026-04-19T09:25:15Z |
| INT-H-004 | contextExposureSanitizer.js | `8c7a063472c458b891da2b7128314242bc7da5581d69a2d4815fbc1d5b7cbe9d` | 2.965 B | 2026-04-19T07:59:17Z |
| INT-H-005 | domainAccessMatrix.js | `94b18b1ca36860ac5d079c8d03d3415b0b372f57629b3aec0741d9fb87aa5ed4` | 3.052 B | 2026-04-14T16:38:42Z |
| INT-H-006 | impetus-threat-watch.sh | `5f3f41a8f7fecbb736a7d0c0a156c88a55c9eaf5838ede572a73e3d162652cd8` | 11.649 B | 2026-07-09T10:40:13Z |
| INT-H-007 | breach-lockdown-engine.sh | `3666a70687e4f5a9ca6f6e44cdbd2a3261420ac129ea6b8b9168e22221c80c97` | 6.855 B | 2026-07-07T08:21:23Z |
| INT-H-008 | emergency-lockdown.sh | `2b1f9ca3cb5676268c821d66a46c872a87ce68804b09de46850d55b1c6aa6931` | 3.141 B | 2026-07-07T06:15:15Z |
| INT-H-009 | audit-watch.sh | `122fa4e950a1710882d30e7761dd318a117f1455077d3ff32b3285bd430327b2` | 4.274 B | 2026-07-05T11:10:41Z |
| INT-H-010 | observatory-ingest.sh | `d2dcb28ac4b8fb3a7679f527410ee45b2705440c744dbcbbe1a3be387f346b0e` | 1.138 B | 2026-07-14T10:48:13Z |
| INT-H-011 | security-baseline-snapshot.sh | `b8be8e2b35f83468de82be6f376127f2ee97e53a98c0898598bff704a05c36ae` | 2.251 B | 2026-07-12T02:46:25Z |
| INT-H-012 | security-stack-verify.sh | `cb35ee2a117a67ce11952d6fc556709329185a67b490fb59843b64c3dc486371` | 5.339 B | 2026-07-09T20:26:44Z |
| INT-H-013 | deploy-fail2ban-impetus.sh | `bb6f8ece369b27af480467ca247ecebfb2a84cfcc21c3b31ebd499dbb794b586` | 651 B | 2026-07-09T20:26:43Z |
| INT-H-014 | install-auditd-impetus.sh | `96a91dca7eb6602a17b7020f741b079cb0d0b8ff0e184e24d6e721a8a6302b41` | 1.708 B | 2026-07-09T20:26:44Z |
| INT-H-015 | package.json | `d6d3171e033c9afedf2f5f3a9da4990bf300e85f3b8497b8a401d91a5e9df82d` | 56.074 B | 2026-07-21T16:22:30Z |
| INT-H-016 | nginx ip-allowlist.conf | `40b9e7cf460c8e5482e6c99af65978dba3d76ac475cc347e8d8943e77cef0a66` | 228 B | 2026-07-09T11:02:02Z |
| INT-H-017 | nginx ip-allowlist-wrapper.conf | `8ebdf8c12d1374b500fdbc18264b4303b08777caca909f27b0f94fca39285e6c` | 489 B | 2026-07-09T11:02:02Z |
| INT-H-018 | nginx proxy.conf | `36026f697187b81b001c8ec91b7a4bc7e05cb2f2972b2fb1694ec630f2324026` | 372 B | 2026-07-09T11:00:57Z |
| INT-H-019 | nginx proxy-ws.conf | `061f2db6552340f178dd02ad0ec1815a9b89beb360712e442520b3abd17f0b5b` | 380 B | 2026-07-09T11:00:57Z |
| INT-H-020 | cron: security-auto-audit | `b8c2774f93a83943666d4df92573898cad9274467d3bb799ed36d6a35c2561af` | 208 B | 2026-07-09T20:26:44Z |
| INT-H-021 | cron: security-baseline | `bb2ac72d827f698fd44a0d5c2b6baf75dc8ffe6f0053228fce5481255702997a` | 201 B | 2026-07-09T20:26:44Z |
| INT-H-022 | cron: security-observatory | `f5643e75dd73eccd69f4615caefa3d1054e450b91698113282173cf8e22cb27e` | 213 B | 2026-07-07T06:02:04Z |
| INT-H-023 | cron: security-weekly-sim | `4914c5b9b743e5e875ec2248b69197de5495d5e92232d06c00d9e19ddaad91e3` | 206 B | 2026-07-09T20:26:44Z |

---

## 4. Tabela de hashes — Activos MEDIUM

| ID | Activo | SHA256 | Tamanho | Verificação |
|---|---|---|---|---|
| INT-M-003 | infra/security/audit/impetus-audit.rules | `e22c16dcfec5b8effba9155007495d916ce14521f13af768806740a4fa548a97` | 2.151 B | = INT-C-010 ✔ |
| INT-M-004 | fullchain2.pem | `f85fabaae6706f76e1f57813b21055e2d02cb4d99ffe0d05b1f26901e53b950a` | 4.869 B | — |

---

## 5. Verificações cruzadas de consistência

| Par | SHA256 coincide | Status |
|---|---|---|
| `/etc/audit/rules.d/impetus.rules` ↔ `infra/security/audit/impetus-audit.rules` | `e22c16dc…` | **✔ IDÊNTICO** |
| `/usr/local/bin/impetus-breach-lockdown-engine.sh` ↔ `infra/scripts/impetus-breach-lockdown-engine.sh` | `3666a706…` | **✔ IDÊNTICO** |

---

## 6. Tabela de permissões e proprietários

| ID | Activo | Perm actual | Perm esperada | Owner | Status |
|---|---|---|---|---|---|
| INT-C-001 | server.js | 644 | 644 | root | ✔ |
| INT-C-002 | .env | 600 | 600 | root | ✔ |
| INT-C-003 | ecosystem.runtime.config.cjs | 644 | 644 | root | ✔ |
| INT-C-004 | nginx site | 644 | 644 | root | ✔ |
| INT-C-005 | cloudflare-proxy-guard.conf | 644 | 644 | root | ✔ |
| INT-C-006 | hardening-locations.conf | 644 | 644 | root | ✔ |
| INT-C-007 | cert.pem (real: cert2.pem) | 644 | 644 | root | ✔ |
| INT-C-008 | privkey.pem (real: privkey2.pem) | 600 | 600 | root | ✔ |
| INT-C-009 | fail2ban impetus.conf | 644 | 644 | root | ✔ |
| INT-C-010 | auditd impetus.rules | 640 | 640 | root | ✔ |
| INT-H-006 | impetus-threat-watch.sh | 755 | 755 | root | ✔ |
| INT-H-007 | breach-lockdown-engine.sh | 755 | 755 | root | ✔ |
| INT-H-008 | emergency-lockdown.sh | 755 | 755 | root | ✔ |

**Resultado:** Zero inconsistências de permissão nos activos CRITICAL. Todos os proprietários são root conforme esperado.

---

## 7. Estado do baseline

```
BASELINE_ID              = INT-01A-BASELINE-20260723
BASELINE_STATUS          = ACTIVE
CRITICAL_ASSETS          = 10 / 10 hashed
HIGH_ASSETS              = 23 / 23 hashed
MEDIUM_ASSETS            = 2 individual + 3 grupos
PERM_INCONSISTENCIES     = 0
MISSING_ASSETS           = 0
INACCESSIBLE_ASSETS      = 0
CROSS_CHECK_PASSES       = 2 / 2
```

---

## 8. Histórico de versões do baseline

| Versão | Data | Motivo | Aprovado por |
|---|---|---|---|
| v1.0 (este) | 2026-07-23 | Criação inicial — INT-01A | INT-01A mission |

Próxima regeneração esperada:
- Após certbot renewal (INT-C-007, INT-C-008)
- Após deploy autorizado com alteração de ficheiros CRITICAL
- Após INT-01B (adição de novos activos ao escopo)
