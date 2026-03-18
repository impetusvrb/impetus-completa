'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), override: true });
const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
// origin: true espelha o Origin da requisição — necessário com credentials + Bearer (ex.: front :3000 → API :4000)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir uploads (chat, app-communications, etc.)
// Estrutura de deploy: /var/www/impetus-completa/uploads
app.use('/uploads', express.static(path.join(__dirname, '../../../uploads')));
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
app.use('/api/dashboard',                safe('./routes/dashboard'));
app.use('/api/manutencao-ia',            safe('./routes/manutencao-ia'));
app.use('/api/diagnostics',              safe('./routes/diagnostic'));
app.use('/api/cadastrar-com-ia',         safe('./routes/cadastrarComIA'));
app.use('/api/intelligent-registration', safe('./routes/intelligentRegistration'));
app.use('/api/decision-engine',          safe('./routes/decisionEngine'));
app.use('/api/voz',                      safe('./routes/voz'));
app.get('/health', async (req, res) => {
  let voz = { elevenlabs: false };
  try {
    const hasKey = !!(process.env.ELEVEN_API_KEY || '').trim();
    if (hasKey) {
      const { gerarAudio } = require('./services/elevenLabsVozService');
      const buf = await gerarAudio('Ok');
      voz.elevenlabs = !!(buf && buf.length > 0);
    } else {
      voz.error = 'ELEVEN_API_KEY não configurada';
    }
  } catch (e) {
    voz.error = (e && e.message) || String(e);
  }
  res.json({ status: 'ok', voz });
});
app.get('/api/health', async (req, res) => {
  let voz = { elevenlabs: false };
  try {
    const hasKey = !!(process.env.ELEVEN_API_KEY || '').trim();
    if (hasKey) {
      const { gerarAudio } = require('./services/elevenLabsVozService');
      const buf = await gerarAudio('Ok');
      voz.elevenlabs = !!(buf && buf.length > 0);
    } else {
      voz.error = 'ELEVEN_API_KEY não configurada';
    }
  } catch (e) {
    voz.error = (e && e.message) || String(e);
  }
  res.json({ status: 'ok', voz });
});
app.use((err, req, res, next) => { console.error('[ERR]', err.message); res.status(500).json({ error: 'Erro interno no servidor' }); });
module.exports = app;
