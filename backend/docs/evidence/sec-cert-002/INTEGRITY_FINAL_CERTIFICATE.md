# INTEGRITY_FINAL_CERTIFICATE.md
## Certificado Operacional — Camada INTEGRITY

---

### CLASSIFICAÇÃO FORMAL

# CERTIFIED_WITH_LIMITATIONS

**Código:** SEC-CERT-002  
**Data de emissão:** 2026-07-23  
**Âmbito:** Sensor de Integridade IMPETUS (camada INTEGRITY)  
**Autoridade de evidência:** Cadeia GAP-INT-01-ARCH → INT-01A…D → SEC-OBS-002 → SEC-COVERAGE-002 → SEC-CERT-002

---

## Declaração

A camada INTEGRITY é **certificada operacionalmente com limitações documentadas**.

Cumpre os requisitos arquitecturais e operacionais aprovados: motor determinístico em produção, telemetria persistida, consumo desacoplado pelo Centro de Comando, cobertura **100%** dos activos CRITICAL e HIGH a nível de ficheiro, ausência de gaps **P0**, desempenho dentro dos limites, baseline forense INT-01A preservado, FP/FN controlados a 0% na suite de cobertura.

---

## Limitações Aceites

| # | Limitação | Justificativa | Evolução |
|---|---|---|---|
| L1 | Regras auditd não deployadas para nginx / fail2ban / letsencrypt / audit / partes de bin+cron | Pendência INT-01A; Bridge já preparado | Deploy controlado de regras `-w` |
| L2 | Directórios MEDIUM sem baseline ficheiro-a-ficheiro | Desenho actual; cobertura parcial via `impetus_repo_write` | Watcher ou expansão pós-BASELINE |
| L3 | Alteração de grupo (GID) não monitorizada | PermChecker valida UID apenas | Extensão futura opcional |
| L4 | Contador/estado ATUOU por drift legítimo INT-01B/C/D face ao baseline INT-01A | Baseline ainda não regenerado (correcto por governança) | **SEC-BASELINE-002** |

Limitações L1–L3 são residuais controladas. L4 é **esperada** e deve ser resolvida pela consolidação do baseline, não por alteração ad-hoc nesta certificação.

---

## O que NÃO está certificado como ilimitado

- Cobertura realtime kernel-level em todos os paths CRITICAL via auditd (apenas polling criptográfico garantido)
- Monitorização de memória, firmware, hardware
- Inventário dinâmico / ficheiros fora do inventário oficial

---

## Governança Forense

| Artefacto | SHA256 |
|---|---|
| baseline.json | `6cb5ac487158cdb462a4b01b2b7f25290eaa05a4b9b4425619619e4301760bf6` |
| asset_inventory.json | `fd8fc113754026658064dc05bd9c9039b1c2ed49f14bd1ac238253bdf4e7dabb` |

Cadeia de custódia: **VALIDADA** (hashes idênticos aos registados desde INT-01A / SEC-OBS-002).

---

## Parecer

| Campo | Valor |
|---|---|
| SEC_CERT_002_STATUS | **PASS** |
| Classificação | **CERTIFIED_WITH_LIMITATIONS** |
| Apta para SEC-BASELINE-002 | **SIM** |
| Acções correctivas de código antes do baseline | **Não obrigatórias** |

---

*Este certificado não altera produção. Não regenera baseline. Consolida evidências.*
