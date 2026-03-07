/**
 * ONBOARDING INTELIGENTE
 * Entrevista estratégica adaptativa
 */
const express = require('express');
const router = express.Router();
const onboardingService = require('../services/onboardingService');

/**
 * GET /api/onboarding/status
 * Retorna se usuário/empresa precisa de onboarding
 */
router.get('/status', async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ ok: false, error: 'Não autenticado' });

    const status = await onboardingService.getOnboardingStatus(user);
    res.json({ ok: true, ...status });
  } catch (err) {
    console.error('[ONBOARDING_STATUS_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao verificar status' });
  }
});

/**
 * POST /api/onboarding/start
 * Inicia ou retoma onboarding - retorna primeira mensagem da IA
 */
router.post('/start', async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ ok: false, error: 'Não autenticado' });
    const companyId = user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Usuário sem empresa vinculada' });

    const { tipo } = req.body; // 'empresa' | 'usuario'
    if (!['empresa', 'usuario'].includes(tipo)) {
      return res.status(400).json({ ok: false, error: 'tipo inválido. Use empresa ou usuario.' });
    }

    const level = user.hierarchy_level ?? 5;
    if (tipo === 'empresa' && level > 1) {
      return res.status(403).json({ ok: false, error: 'Onboarding de empresa apenas para direção/CEO' });
    }

    const { message, completed } = await onboardingService.startOrResumeOnboarding(
      companyId,
      user.id,
      tipo,
      user
    );

    res.json({ ok: true, message, completed });
  } catch (err) {
    console.error('[ONBOARDING_START_ERROR]', err);
    const msg = err.message || 'Erro ao iniciar onboarding';
    const userMsg = /relation.*does not exist|no existe/i.test(msg)
      ? 'Banco de dados não configurado. Execute as migrações: node -r dotenv/config scripts/run-all-migrations.js'
      : msg;
    res.status(500).json({ ok: false, error: userMsg });
  }
});

/**
 * POST /api/onboarding/respond
 * Processa resposta do usuário e retorna próxima mensagem
 */
router.post('/respond', async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ ok: false, error: 'Não autenticado' });
    const companyId = user.company_id;
    if (!companyId) return res.status(400).json({ ok: false, error: 'Sem empresa vinculada' });

    const { tipo, answer } = req.body;
    if (!['empresa', 'usuario'].includes(tipo)) {
      return res.status(400).json({ ok: false, error: 'tipo inválido' });
    }

    const { message, completed } = await onboardingService.processAnswer(
      companyId,
      user.id,
      tipo,
      (answer || '').trim(),
      user
    );

    res.json({ ok: true, message, completed });
  } catch (err) {
    console.error('[ONBOARDING_RESPOND_ERROR]', err);
    const msg = err.message || 'Erro ao processar resposta';
    const userMsg = /relation.*does not exist|no existe/i.test(msg)
      ? 'Banco de dados não configurado. Execute as migrações: node -r dotenv/config scripts/run-all-migrations.js'
      : msg;
    res.status(500).json({ ok: false, error: userMsg });
  }
});

/**
 * GET /api/onboarding/history
 * Retorna histórico da conversa (opcional)
 */
router.get('/history', async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ ok: false, error: 'Não autenticado' });

    const tipo = req.query.tipo || 'usuario';
    const history = await onboardingService.getConversationHistory(
      user.company_id,
      user.id,
      tipo
    );

    res.json({ ok: true, history });
  } catch (err) {
    console.error('[ONBOARDING_HISTORY_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao buscar histórico' });
  }
});

/**
 * GET /api/onboarding/context
 * Retorna memória carregada (para usuário retornando)
 */
router.get('/context', async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ ok: false, error: 'Não autenticado' });

    const context = await onboardingService.getMemoryContext(user);
    res.json({ ok: true, context });
  } catch (err) {
    console.error('[ONBOARDING_CONTEXT_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao carregar contexto' });
  }
});

module.exports = router;
