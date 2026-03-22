/**
 * PM2 — API Flask Wav2Lip (porta 5001).
 *
 *   pm2 start ecosystem.lipsync.config.cjs
 *
 * Ou manualmente:
 *   pm2 start lipsync/lipsync_api.py --interpreter lipsync/.venv/bin/python --name lipsync-api --cwd /var/www/impetus-completa
 */
const path = require('path');
const root = path.resolve(__dirname);

module.exports = {
  apps: [
    {
      name: 'lipsync-api',
      script: path.join(root, 'lipsync/lipsync_api.py'),
      interpreter: path.join(root, 'lipsync/.venv/bin/python'),
      cwd: root,
      env: {
        LIPSYNC_PORT: '5001',
        WAV2LIP_ROOT: path.join(root, 'lipsync/Wav2Lip'),
        PYTHON: path.join(root, 'lipsync/.venv/bin/python'),
        PYTHONUNBUFFERED: '1'
      }
    }
  ]
};
