'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), override: true });
const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const app = express();

// Helmet: headers de segurança (X-Content-Type-Options, X-Frame-Options, etc.)
app.use(helmet({ contentSecurityPolicy: false }));

// Compression: gzip para respostas JSON (60-80% menor)
app.use(compression());

// origin: true espelha o Origin da requisição — necessário com credentials + Bearer (ex.: front :3000 → API :4000)
app.use(cors({ origin: true, credentials: true }));

// Body parser: 1MB para rotas gerais (segurança). Vision usa 50MB (imagens base64)
const jsonParserDefault = express.json({ limit: '1mb' });
const jsonParserLarge = express.json({ limit: '50mb' });
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/vision')) {
    return jsonParserLarge(req, res, next);
  }
  return jsonParserDefault(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Servir uploads com cache HTTP (1 dia) — reduz requisições repetidas
const uploadsPath = path.join(__dirname, '../../../uploads');
app.use('/uploads', express.static(uploadsPath, { maxAge: '1d', immutable: true }));
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
app.use('/api/dashboard/chat/voice',     safe('./routes/chatVoice'));
app.use('/api/tts',                     safe('./routes/tts'));
app.use('/api/vision',                  safe('./routes/vision'));
app.use('/api/asset-management',       safe('./routes/assetManagement'));
async function voiceHealthProbe() {
  const voz = { openai: false };
  try {
    const hasKey = !!(process.env.OPENAI_API_KEY || '').trim();
    if (!hasKey) {
      voz.error = 'OPENAI_API_KEY não configurada';
      return voz;
    }
    const { gerarAudio } = require('./services/openaiVozService');
    const buf = await gerarAudio('Ok');
    voz.openai = !!(buf && buf.length > 0);
    if (!voz.openai) voz.error = 'TTS OpenAI sem resposta';
  } catch (e) {
    voz.error = (e && e.message) || String(e);
  }
  return voz;
}
app.get('/health', async (req, res) => {
  const voz = await voiceHealthProbe();
  res.json({ status: 'ok', voz });
});
app.get('/api/health', async (req, res) => {
  const voz = await voiceHealthProbe();
  res.json({ status: 'ok', voz });
});
app.use((err, req, res, next) => { console.error('[ERR]', err.message); res.status(500).json({ error: 'Erro interno no servidor' }); });
module.exports = app;
