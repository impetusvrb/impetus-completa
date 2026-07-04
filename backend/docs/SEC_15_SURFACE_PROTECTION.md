# SEC-15 — Surface Protection

## Perfis de superfície

| Perfil | Condição |
|--------|----------|
| NORMAL | Confiança baixa |
| STEALTH | scannerConfidence ≥ 0.25 |
| HARDENED | ≥ 0.5 ou enumeração detectada |
| PROTECTED | ≥ 0.75 ou enumerationConfidence ≥ 0.7 |

## Recomendações (sempre `auto_execute: false`)

| Acção | Objectivo |
|-------|-----------|
| `hide_admin_endpoints` | Ocultar /api/admin/* |
| `hide_internal_pages` | Esconder páginas internas |
| `uniform_404_response` | 404 uniforme em paths inválidos |
| `delay_responses` | Degradar scanner (fase futura) |
| `neutral_content_response` | Conteúdo neutro |
| `activate_protected_mode` | Modo protegido |
| `no_action` | Observação contínua |

## Ficheiro

`backend/src/securityAntiScanner/engine/surfaceProtectionPlanner.js`

## Execução

Reservada para SEC-17 (Adaptive Runtime Lockdown) após certificação adicional.
