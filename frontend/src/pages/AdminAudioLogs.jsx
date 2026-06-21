/**
 * LOGS DE ÁUDIO (admin/auditoria)
 * Listagem sensível de áudios transcritos do sistema, scoped por empresa.
 * Acesso restrito a CEO / diretoria / admin (guard no backend e na rota).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Mic, Search, RefreshCw, Volume2, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';
import { audioLogs as audioLogsApi } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { useProtectedMediaSrc } from '../utils/protectedUploadMedia';

const SOURCE_LABELS = {
  app_communication: 'Comunicação App',
  internal_chat: 'Chat Interno',
  cadastrar_ia: 'Cadastro IA',
  communications: 'Comunicações',
  chat_multimodal: 'Chat Multimodal'
};

function AudioPlayer({ rawUrl }) {
  const src = useProtectedMediaSrc(rawUrl || null);
  if (!rawUrl) return <span className="audio-logs__muted">—</span>;
  if (!src) {
    return (
      <span className="audio-logs__muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Volume2 size={14} /> a carregar…
      </span>
    );
  }
  return <audio controls preload="none" src={src} style={{ height: 32, maxWidth: 220 }} />;
}

function fmtDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return String(value);
  }
}

export default function AdminAudioLogs() {
  const notify = useNotification();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await audioLogsApi.list({
        limit,
        offset,
        ...(source ? { source } : {}),
        ...(search.trim() ? { search: search.trim() } : {})
      });
      const data = res.data || {};
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setTotal(Number(data.total) || 0);
    } catch (e) {
      const msg = e?.response?.data?.error || 'Erro ao carregar logs de áudio';
      setError(msg);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [offset, source, search]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, source]);

  const handleSearch = (e) => {
    e.preventDefault();
    setOffset(0);
    load();
  };

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Layout>
      <div className="audio-logs">
        <style>{`
          .audio-logs { padding: 24px 28px; }
          .audio-logs__head { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
          .audio-logs__title { font-family: 'Rajdhani', sans-serif; font-size: 24px; font-weight: 700;
            letter-spacing: 1px; text-transform: uppercase; color: var(--text-primary); margin: 0; }
          .audio-logs__sub { color: var(--text-tertiary); font-size: 13px; margin: 0 0 20px 40px;
            font-family: 'Share Tech Mono', monospace; }
          .audio-logs__toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px; }
          .audio-logs__field { display: flex; align-items: center; gap: 8px; background: var(--surface-input, var(--bg-tertiary));
            border: 1px solid var(--border-default); border-radius: 4px; padding: 8px 12px; }
          .audio-logs__field input, .audio-logs__field select { background: transparent; border: none; outline: none;
            color: var(--text-primary); font-family: 'Share Tech Mono', monospace; font-size: 13px; min-width: 180px; }
          .audio-logs__field select option { background: var(--bg-secondary); color: var(--text-primary); }
          .audio-logs__btn { display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
            background: rgba(0,212,255,0.08); color: var(--cyan); border: 1px solid var(--border-active);
            border-radius: 4px; padding: 8px 14px; font-family: 'Rajdhani', sans-serif; font-weight: 600;
            text-transform: uppercase; letter-spacing: 1px; font-size: 13px; }
          .audio-logs__btn:hover { background: rgba(0,212,255,0.16); }
          .audio-logs__table { width: 100%; border-collapse: collapse; }
          .audio-logs__table th { text-align: left; padding: 10px 12px; font-family: 'Share Tech Mono', monospace;
            font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-tertiary);
            border-bottom: 1px solid var(--border-default); }
          .audio-logs__table td { padding: 10px 12px; border-bottom: 1px solid var(--border-subtle);
            color: var(--text-secondary); font-size: 13px; vertical-align: top; }
          .audio-logs__transc { max-width: 360px; color: var(--text-primary); }
          .audio-logs__badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px;
            font-family: 'Share Tech Mono', monospace; background: rgba(0,212,255,0.08); color: var(--cyan);
            border: 1px solid var(--border-active); }
          .audio-logs__muted { color: var(--text-tertiary); font-family: 'Share Tech Mono', monospace; font-size: 12px; }
          .audio-logs__empty, .audio-logs__error { text-align: center; padding: 48px 24px; color: var(--text-tertiary);
            font-family: 'Share Tech Mono', monospace; }
          .audio-logs__error { color: var(--red); }
          .audio-logs__pager { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: 16px;
            font-family: 'Share Tech Mono', monospace; font-size: 12px; color: var(--text-tertiary); }
          .audio-logs__pager button { cursor: pointer; background: var(--bg-tertiary); color: var(--text-secondary);
            border: 1px solid var(--border-default); border-radius: 4px; padding: 6px 12px; }
          .audio-logs__pager button:disabled { opacity: 0.4; cursor: not-allowed; }
        `}</style>

        <div className="audio-logs__head">
          <Mic size={26} color="var(--cyan)" />
          <h1 className="audio-logs__title">Logs de Áudio</h1>
        </div>
        <p className="audio-logs__sub">
          Auditoria de áudios transcritos do sistema — acesso restrito à diretoria. {total} registo(s).
        </p>

        <form className="audio-logs__toolbar" onSubmit={handleSearch}>
          <div className="audio-logs__field">
            <Search size={15} color="var(--text-tertiary)" />
            <input
              type="text"
              placeholder="Buscar transcrição ou remetente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="audio-logs__field">
            <select value={source} onChange={(e) => { setOffset(0); setSource(e.target.value); }}>
              <option value="">Todas as origens</option>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="audio-logs__btn"><Search size={14} /> Buscar</button>
          <button type="button" className="audio-logs__btn" onClick={() => { setOffset(0); load(); }}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </form>

        {loading ? (
          <div className="audio-logs__empty">A carregar registos…</div>
        ) : error ? (
          <div className="audio-logs__error">
            <AlertCircle size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="audio-logs__empty">Nenhum registo de áudio encontrado para os filtros atuais.</div>
        ) : (
          <>
            <table className="audio-logs__table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Remetente</th>
                  <th>Origem</th>
                  <th>Tipo</th>
                  <th>Transcrição</th>
                  <th>Áudio</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="audio-logs__muted">{fmtDate(row.created_at)}</td>
                    <td>{row.sender_name || <span className="audio-logs__muted">Anónimo</span>}</td>
                    <td><span className="audio-logs__badge">{SOURCE_LABELS[row.source] || row.source}</span></td>
                    <td className="audio-logs__muted">{row.message_type || 'audio'}</td>
                    <td className="audio-logs__transc">
                      {row.transcription
                        ? row.transcription
                        : <span className="audio-logs__muted">(sem transcrição)</span>}
                    </td>
                    <td><AudioPlayer rawUrl={row.media_url} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="audio-logs__pager">
              <span>Página {page} de {totalPages}</span>
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setOffset(offset + limit)}
              >
                Próxima
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
