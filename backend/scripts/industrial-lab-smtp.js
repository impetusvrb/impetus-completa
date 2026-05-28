#!/usr/bin/env node
'use strict';

/**
 * IMPETUS Lab — SMTP local via maildev
 * SMTP: 127.0.0.1:1025 (sem auth, sem TLS)
 * Web UI: 127.0.0.1:1080
 * PM2: impetus-lab-smtp
 */

const MailDev = require('maildev');

const smtp = new MailDev({
  smtp: parseInt(process.env.IMPETUS_LAB_SMTP_PORT || '1025', 10),
  web: parseInt(process.env.IMPETUS_LAB_SMTP_WEB_PORT || '1080', 10),
  ip: '127.0.0.1',
  silent: false,
  disableWeb: false,
});

smtp.listen((err) => {
  if (err) {
    console.error('[LAB_SMTP] Failed to start:', err.message);
    process.exit(1);
  }
  console.log(`[LAB_SMTP_BOOT] {"event":"LAB_SMTP_BOOT","smtp":"127.0.0.1:${smtp.port}","web":"http://127.0.0.1:${smtp.web}"}`);
});

smtp.on('new', (email) => {
  console.log(`[LAB_SMTP] email received: from=${email.from?.[0]?.address} to=${email.to?.[0]?.address} subject="${email.subject}"`);
});

process.on('SIGTERM', () => smtp.close(() => process.exit(0)));
process.on('SIGINT', () => smtp.close(() => process.exit(0)));
