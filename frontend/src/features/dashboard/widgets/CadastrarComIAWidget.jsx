/**
 * Widget Cadastrar com IA — Módulo integrado nos dashboards de Auxiliar, Operador e Colaborador
 * Permite cadastro rápido de informações (equipamento, material, processo, etc.) com assistência da IA.
 * Aceita texto e arquivo opcional. Design compatível com cc-widget, dcl-widget, dop-widget.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Sparkles, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { dashboard } from '../../../services/api';
import './CadastrarComIAWidget.css';

const PLACEHOLDER = 'Ex.: Equipamento X consome 50 kWh/h; material Y fornecido pela empresa Z...';

export default function CadastrarComIAWidget({ widgetClass = 'dcl-widget', btnClass = 'dcl-btn' }) {
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault?.();
    if ((!texto.trim() && !file) || loading) return;

    setLoading(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append('texto', texto.trim());
      if (file) formData.append('file', file);

      const r = await dashboard.cadastrarComIA?.cadastrar?.(formData);
      const ok = r?.data?.ok === true;

      setFeedback({ type: ok ? 'success' : 'error', text: ok ? 'Cadastrado com sucesso!' : (r?.data?.error || 'Erro ao cadastrar') });
      if (ok) {
        setTexto('');
        setFile(null);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err?.apiMessage || err?.response?.data?.error || 'Erro ao processar' });
    } finally {
      setLoading(false);
    }
  }, [texto, file, loading]);

  const canSubmit = (texto.trim().length > 0 || file) && !loading;

  return (
    <section className={`cc-widget cc-cadastrar ${widgetClass}`} style={{ gridColumn: 'span 2' }}>
      <div className="cc-kpi__header">
        <Upload size={20} />
        <span>Cadastrar com IA</span>
      </div>
      <p className="cc-resumo__text">
        Cadastre informações do setor com texto ou arquivo. A IA interpreta e armazena automaticamente.
      </p>

      <form className="cc-cadastrar__form" onSubmit={handleSubmit}>
        <textarea
          className="cc-cadastrar__textarea"
          placeholder={PLACEHOLDER}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          disabled={loading}
        />

        <div className="cc-cadastrar__row">
          <label className="cc-cadastrar__file-label">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.m4a,.wav"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="cc-cadastrar__file-input"
            />
            <span className="cc-cadastrar__file-btn">{file ? file.name : 'Anexar arquivo (opcional)'}</span>
          </label>

          <button
            type="submit"
            className={`${btnClass} ${btnClass}--primary cc-cadastrar__btn`}
            disabled={!canSubmit}
          >
            <Sparkles size={16} />
            {loading ? 'Processando...' : 'Cadastrar com IA'}
          </button>
        </div>
      </form>

      {feedback && (
        <div className={`cc-cadastrar__feedback cc-cadastrar__feedback--${feedback.type}`}>
          {feedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.text}</span>
        </div>
      )}

      <button
        type="button"
        className={`${btnClass} ${btnClass}--secondary cc-cadastrar__link`}
        onClick={() => navigate('/app/cadastrar-com-ia')}
      >
        Abrir tela completa <ChevronRight size={14} />
      </button>
    </section>
  );
}
