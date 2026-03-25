'use strict';
/**
 * Montagem /api/audit — paridade com impetus_complete/src/app.js (safe('./routes/audit')).
 * No legado o ficheiro routes/audit.js não existe: o require falhava e safe() devolvia Router vazio.
 * Logs de auditoria para UI admin usam GET /api/admin/logs/audit (admin/logs.js).
 */
const express = require('express');
const router = express.Router();
module.exports = router;
