/**
 * Rota de relatório de diagnóstico
 * Proteção XSS: escape de HTML em todo conteúdo dinâmico
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { escapeHtml, isValidUUID } = require('../utils/security');

function esc(s) {
  return escapeHtml(String(s == null ? '' : s));
}

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const companyId = req.user.company_id;
    if (!isValidUUID(id)) return res.status(400).json({ ok: false, error: 'ID inválido' });
    const r = await db.query(`
      SELECT pa.* FROM proposal_actions pa
      JOIN proposals p ON p.id = pa.proposal_id
      WHERE pa.id = $1 AND p.company_id = $2
    `, [id, companyId]);
    if (r.rowCount === 0) return res.status(404).json({ ok: false, error: 'Registro não encontrado' });
    const row = r.rows[0];
    const meta = row.metadata || {};
    const text = esc((meta.text || '').slice(0, 5000));
    const report = esc((meta.report || '').slice(0, 5000));
    const refs = meta.references || [];
    const refsHtml = refs.map((rf, i) =>
      `<li><b>${i + 1}) ${esc(rf.title || 'manual')}</b><pre style="white-space:pre-wrap">${esc((rf.chunk_text || '').slice(0, 800))}</pre></li>`
    ).join('');
    const confirmBox = `<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:14px;margin:16px 0;">
<strong>⚠️ Confirmação humana obrigatória</strong><br>
Este relatório pode conter procedimentos com risco (elétrico, pressão, fluidos). 
<strong>Leia todas as orientações de segurança antes de executar.</strong> 
Só prossiga após confirmar que as condições de segurança (LOTO, EPI, desenergia) foram atendidas.
</div>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Relatório Diagnóstico</title><style>body{font-family:Arial;margin:18px;color:#111} pre{background:#f5f5f5;padding:10px;border-radius:6px}</style></head><body><h1>Relatório Diagnóstico</h1><p><b>Registro:</b> ${esc(row.id)}</p><p><b>Data:</b> ${esc(row.created_at)}</p>${confirmBox}<h2>Relato original</h2><pre>${text}</pre><h2>Relatório gerado</h2><pre>${report}</pre><h2>Trechos usados</h2><ul>${refsHtml}</ul></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('[DIAG_REPORT_ERROR]', err);
    res.status(500).json({ ok: false, error: 'Erro ao gerar relatório' });
  }
});

module.exports = router;
