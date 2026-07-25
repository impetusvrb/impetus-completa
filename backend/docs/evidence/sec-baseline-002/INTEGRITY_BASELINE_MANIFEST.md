# INTEGRITY_BASELINE_MANIFEST

**Emitido em:** 2026-07-23 16:03 UTC  
**Fase de origem:** SEC-BASELINE-002  
**Manifest ID:** IMPETUS-INTEGRITY-MANIFEST-v2  
**SHA-256 deste manifesto (JSON):** `df980ae6e7682566a77a2056a4450d241de05d02738d584f9ecab2305524ee86`  

---

## 1. Âncoras Forenses Primárias

| Ficheiro | SHA-256 | Versão | Status |
|---|---|---|---|
| `backend/security/integrity/baseline.json` | `f9ca52c1c1461b5be4f748f8bee444906d826c73332891b77976736ac1495818` | v2.0 | Active |
| `backend/security/integrity/baseline-int-01a.json` | `6cb5ac487158cdb462a4b01b2b7f25290eaa05a4b9b4425619619e4301760bf6` | v1.0 | Archived |
| `backend/security/integrity/asset_inventory.json` | `fd8fc113754026658064dc05bd9c9039b1c2ed49f14bd1ac238253bdf4e7dabb` | — | Inalterado |

---

## 2. Inventário Forense de Ficheiros

| Ficheiro | SHA-256 (prefixo 20) | Tamanho (bytes) | Presente |
|---|---|---|---|
| `docs/evidence/sec-baseline-002/INTEGRITY_SECURITY_BASELINE_2026.md` | `ae8ec3c4440de39a0280…` | 6102 | ✓ |
| `docs/evidence/sec-baseline-002/INTEGRITY_BASELINE_VERSION_HISTORY.md` | `ba341033a327476c0e5e…` | 3383 | ✓ |
| `docs/evidence/sec-baseline-002/INTEGRITY_LIMITATIONS_REGISTER.md` | `8edb92e391ca83fc8e1e…` | 4480 | ✓ |
| `docs/evidence/sec-baseline-002/INTEGRITY_GOVERNANCE_UPDATE.md` | `24d9b12146dfc189a83f…` | 5371 | ✓ |
| `docs/evidence/sec-baseline-002/drift-comparison.json` | `da95485d956c603e4dd6…` | 3733 | ✓ |
| `security/integrity/baseline.json` | `f9ca52c1c1461b5be4f7…` | 17592 | ✓ |
| `security/integrity/baseline-int-01a.json` | `6cb5ac487158cdb462a4…` | 15796 | ✓ |
| `security/integrity/asset_inventory.json` | `fd8fc113754026658064…` | 25143 | ✓ |
| `docs/evidence/int-01a/INT_01A_COMPLETION_REPORT.md` | `6a8013e55e37430aa6fe…` | 8346 | ✓ |
| `docs/evidence/int-01b/INT_01B_COMPLETION_REPORT.md` | `ad0a5f6a5e7961dc8bbc…` | 7176 | ✓ |
| `docs/evidence/int-01c/INT_01C_COMPLETION_REPORT.md` | `c91117e8a076cf6c6c2b…` | 7752 | ✓ |
| `docs/evidence/int-01d/INT_01D_COMPLETION_REPORT.md` | `8a978fd924853a2aa373…` | 6293 | ✓ |
| `docs/evidence/sec-obs-002/SEC_OBS_002_COMPLETION_REPORT.md` | `f5e88309a99304248972…` | 3847 | ✓ |
| `docs/evidence/sec-coverage-002/SEC_COVERAGE_002_COMPLETION_REPORT.md` | `c23052bcd8c0478eee8c…` | 3411 | ✓ |
| `docs/evidence/sec-cert-002/SEC_CERT_002_COMPLETION_REPORT.md` | `7358bc5bbe6c967b39b2…` | 4502 | ✓ |
| `docs/evidence/sec-cert-002/INTEGRITY_FINAL_CERTIFICATE.md` | `1a89617c524c89a37e22…` | 2753 | ✓ |

---

## 3. Manifesto Machine-Readable

Ficheiro JSON completo com hashes de todos os ficheiros:  
`backend/docs/evidence/sec-baseline-002/INTEGRITY_BASELINE_MANIFEST.json`  
SHA-256 do manifesto JSON: `df980ae6e7682566a77a2056a4450d241de05d02738d584f9ecab2305524ee86`

---

## 4. Regras de Custódia

1. Este manifesto é imutável após emissão. Qualquer reemissão cria uma nova versão.
2. As âncoras primárias (`baseline.json`, `baseline-int-01a.json`, `asset_inventory.json`) devem ser verificadas antes de qualquer auditoria.
3. O ficheiro `baseline-int-01a.json` NUNCA deve ser modificado. É o baseline pré-implementação do motor.
4. Se o SHA-256 de `baseline-int-01a.json` divergir de `6cb5ac487158cdb462a4b01b2b7f25290eaa05a4b9b4425619619e4301760bf6`, a cadeia de custódia está comprometida.

---

## 5. Verificação de Integridade Rápida

```bash
# Verificar âncoras forenses
sha256sum backend/security/integrity/baseline-int-01a.json
# Esperado: 6cb5ac487158cdb462a4b01b2b7f25290eaa05a4b9b4425619619e4301760bf6

sha256sum backend/security/integrity/baseline.json
# Esperado (v2): f9ca52c1c1461b5be4f748f8bee444906d826c73332891b77976736ac1495818

sha256sum backend/security/integrity/asset_inventory.json
# Esperado: fd8fc113754026658064dc05bd9c9039b1c2ed49f14bd1ac238253bdf4e7dabb
```
