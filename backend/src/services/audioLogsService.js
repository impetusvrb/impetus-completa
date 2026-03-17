/**
 * LOGS DE AUDIO - SERVICO SENSIVEL
 * Persiste audios transcritos para acesso exclusivo da IA.
 * A IA disponibiliza conteudo APENAS para CEO e diretoria, com finalidade de auditoria.
 */

const db = require('../db');

const ROLES_AUDITORIA = ['ceo', 'admin', 'diretor'];
const AUDIO_QUERY_KEYWORDS = /log|áudio|audio|transcri|gravação|voice|voz|áudios|audios|comunicação.*voz|mensagem.*áudio/i;

function canAccessAudioLogs(user) {
  if (!user || !user.role) return false;
  const role = String(user.role).toLowerCase();
  return ROLES_AUDITORIA.includes(role);
}

function queryMentionsAudio(queryText) {
  if (!queryText || typeof queryText !== 'string') return false;
  return AUDIO_QUERY_KEYWORDS.test(queryText.trim());
}

async function persist(opts) {
  const {
    companyId,
    source,
    sourceId = null,
    userId = null,
    senderName = null,
    mediaUrl,
    transcription = null,
    messageType = 'audio',
    metadata = {}
  } = opts;

  if (!companyId || !mediaUrl || !source) return null;

  try {
    const r = await db.query(`
      INSERT INTO audio_logs (
        company_id, source, source_id, user_id, sender_name,
        media_url, transcription, message_type, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, created_at
    `, [
      companyId, source, sourceId, userId, senderName,
      mediaUrl, transcription ? String(transcription).slice(0, 16000) : null,
      messageType, JSON.stringify(metadata || {})
    ]);
    return r.rows?.[0] || null;
  } catch (err) {
    if (err.message?.includes('does not exist')) {
      console.warn('[AUDIO_LOGS] Tabela audio_logs nao existe. Execute a migration.');
      return null;
    }
    console.warn('[AUDIO_LOGS] persist:', err.message);
    return null;
  }
}

async function getContextForAI(companyId, user, queryText, limit) {
  const lim = limit || 30;
  if (!canAccessAudioLogs(user)) return '';
  if (!queryMentionsAudio(queryText)) return '';

  try {
    const r = await db.query(`
      SELECT id, source, sender_name, media_url, transcription, created_at
      FROM audio_logs
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [companyId, lim]);

    const rows = r.rows || [];
    if (rows.length === 0) return '';

    const lines = rows.map((row, i) => {
      const dt = row.created_at ? new Date(row.created_at).toLocaleString('pt-BR') : '-';
      const transc = (row.transcription || '').slice(0, 500);
      return '[' + (i + 1) + '] ' + dt + ' | ' + (row.sender_name || 'Anonimo') + ' | ' + row.source + ' | Transcricao: ' + (transc || '(nao disponivel)') + ' | Audio: ' + (row.media_url || '-');
    });

    return '\n---\n## Logs de Audio (auditoria)\n' + lines.join('\n') + '\n---';
  } catch (err) {
    if (err.message?.includes('does not exist')) return '';
    console.warn('[AUDIO_LOGS] getContextForAI:', err.message);
    return '';
  }
}

module.exports = {
  persist,
  getContextForAI,
  canAccessAudioLogs,
  queryMentionsAudio
};
