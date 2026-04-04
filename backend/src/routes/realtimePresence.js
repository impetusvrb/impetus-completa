/**
 * REALTIME PRESENCE ENGINE — API de percepção e comando de render (Akool via proxy).
 */
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const perceptionEngine = require('../services/realtimePresence/perceptionEngine');
const { buildRenderCommand } = require('../services/realtimePresence/renderCommandBuilder');
const akoolRenderClient = require('../services/akoolRenderClient');

const router = express.Router();

/**
 * POST /api/realtime-presence/perceive
 * Body: { message?, screen_path?, history_len? }
 */
router.post('/perceive', requireAuth, (req, res) => {
  try {
    const { message, screen_path, history_len } = req.body || {};
    const perception = perceptionEngine.perceive(req.user, {
      message,
      screen_path,
      history_len
    });
    res.json({ ok: true, perception });
  } catch (e) {
    console.error('[REALTIME_PRESENCE_PERCEIVE]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro na percepção' });
  }
});

/**
 * POST /api/realtime-presence/render
 * Body: { voice_phase: 'listening'|'processing'|'speaking'|'idle', perception?: object }
 * — `perception` pode ser o objeto completo devolvido por /perceive (campo .perception) ou omitido.
 */
router.post('/render', requireAuth, async (req, res) => {
  try {
    const { voice_phase, perception: perceptionIn } = req.body || {};
    const phase = String(voice_phase || 'idle').toLowerCase();
    const allowed = ['listening', 'processing', 'speaking', 'idle'];
    const vp = allowed.includes(phase) ? phase : 'idle';
    const perception =
      perceptionIn && typeof perceptionIn === 'object'
        ? perceptionIn
        : perceptionEngine.perceive(req.user, { message: '', screen_path: '' });

    const render_command = buildRenderCommand(
      vp === 'processing' ? 'processing' : vp === 'speaking' ? 'speaking' : vp === 'listening' ? 'listening' : 'idle',
      perception
    );

    const akool = await akoolRenderClient.sendRenderState(render_command);

    res.json({
      ok: true,
      render_command,
      akool,
      akool_configured: akoolRenderClient.isEnabled()
    });
  } catch (e) {
    console.error('[REALTIME_PRESENCE_RENDER]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro no render' });
  }
});

/**
 * POST /api/realtime-presence/session
 * Combina percepção + comando de render num único payload (útil para o cliente).
 */
router.post('/session', requireAuth, async (req, res) => {
  try {
    const { message, screen_path, voice_phase } = req.body || {};
    const perception = perceptionEngine.perceive(req.user, { message, screen_path });
    const phase = String(voice_phase || 'idle').toLowerCase();
    const map = {
      listening: 'listening',
      processing: 'processing',
      speaking: 'speaking',
      idle: 'idle'
    };
    const vp = map[phase] ? phase : 'idle';
    const vKey = vp === 'processing' ? 'processing' : vp === 'speaking' ? 'speaking' : vp === 'listening' ? 'listening' : 'idle';
    const render_command = buildRenderCommand(vKey, perception);
    const akool = await akoolRenderClient.sendRenderState(render_command);
    res.json({
      ok: true,
      perception,
      render_command,
      akool,
      akool_configured: akoolRenderClient.isEnabled()
    });
  } catch (e) {
    console.error('[REALTIME_PRESENCE_SESSION]', e);
    res.status(500).json({ ok: false, error: e.message || 'Erro na sessão presence' });
  }
});

module.exports = router;
