'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), override: true });
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
function safe(file) {
  try { return require(file); } catch(e) { console.warn('[APP] Rota ignorada:', file, '-', e.message); return require('express').Router(); }
}
app.use('/api/auth',                     safe('./routes/auth'));
app.use('/api/chat',                     safe('./routes/chat'));
app.use('/api/companies',                safe('./routes/companies'));
app.use('/api/tasks',                    safe('./routes/tasks'));
app.use('/api/alerts',                   safe('./routes/alerts'));
app.use('/api/manuals',                  safe('./routes/manuals'));
app.use('/api/audit',                    safe('./routes/audit'));
app.use('/api/communications',           safe('./routes/communications'));
app.use('/api/subscription',             safe('./routes/subscription'));
app.use('/api/tpm',                      safe('./routes/tpm'));
app.use('/api/lgpd',                     safe('./routes/lgpd'));
app.use('/api/role-verification',        safe('./routes/roleVerification'));
app.use('/api/app-communications',       safe('./routes/appCommunications'));
app.use('/api/app-impetus',              safe('./routes/app_impetus'));
app.use('/api/internal-chat',            safe('./routes/internalChat'));
app.use('/api/proacao',                  safe('./routes/proacao'));
app.use('/api/plc-alerts',              safe('./routes/plcAlerts'));
app.use('/api/integrations',             safe('./routes/integrations'));
app.use('/api/webhook',                  safe('./routes/webhook'));
app.use('/api/admin',                    safe('./routes/admin'));
app.use('/api/diagnostics',              safe('./routes/diagnostic'));
app.use('/api/cadastrar-com-ia',         safe('./routes/cadastrarComIA'));
app.use('/api/intelligent-registration', safe('./routes/intelligentRegistration'));
app.use('/api/decision-engine',          safe('./routes/decisionEngine'));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use((err, req, res, next) => { console.error('[ERR]', err.message); res.status(500).json({ error: 'Erro interno no servidor' }); });
module.exports = app;
