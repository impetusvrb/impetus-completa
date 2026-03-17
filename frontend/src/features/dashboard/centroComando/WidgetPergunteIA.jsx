/**
 * Widget Pergunte à IA — Cérebro Operacional no grid (Prompt v3 Parte 9).
 * Chat integrado; resposta exibida no próprio widget. Sem redirecionar para outro módulo.
 */
import React, { useState } from 'react';
import { dashboard } from '../../../services/api';
import { Send, Brain } from 'lucide-react';

export default function WidgetPergunteIA() {
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState('');
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState([]);

  const enviar = () => {
    const p = pergunta.trim();
    if (!p || loading) return;
    setLoading(true);
    setResposta('');
    const history = historico.slice(-4);
    (dashboard.chat?.(p, history) || dashboard.postDashboardChat?.(p, history) || Promise.reject(new Error('Endpoint não disponível')))
      .then((r) => {
        const text = r?.data?.answer ?? r?.data?.message ?? r?.data?.reply ?? (typeof r?.data === 'string' ? r.data : 'Resposta indisponível.');
        setResposta(text);
        setHistorico((prev) => [...prev, { role: 'user', content: p }, { role: 'assistant', content: text }].slice(-6));
      })
      .catch(() => setResposta('Não foi possível obter resposta. Tente novamente.'))
      .finally(() => { setLoading(false); setPergunta(''); });
  };

  return (
    <div className="cc-widget cc-ia">
      <div className="cc-ia__header">
        <Brain size={20} />
        <span>Cérebro Operacional</span>
      </div>
      <div className="cc-ia__body">
        {resposta && <div className="cc-ia__resposta">{resposta}</div>}
        {!resposta && !historico.length && (
          <p className="cc-widget__empty">Ex.: &quot;Qual setor gera mais custo hoje?&quot; ou &quot;Qual máquina tem maior risco nas próximas 24h?&quot;</p>
        )}
        <div className="cc-ia__input-wrap">
          <input
            type="text"
            className="cc-ia__input"
            placeholder="Pergunte em linguagem natural..."
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviar()}
            disabled={loading}
          />
          <button type="button" className="cc-ia__btn" onClick={enviar} disabled={loading || !pergunta.trim()} aria-label="Enviar">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
