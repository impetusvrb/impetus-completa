/**
 * Solicitação de KPIs via IA
 * Usuário pede o que quer visualizar (OEE, produtividade, paradas etc.)
 */
import React, { useState } from 'react';
import { Send, BarChart3, Loader2 } from 'lucide-react';
import './KPIRequest.css';

export default function KPIRequest({ onSubmit, loading }) {
  const [solicitacao, setSolicitacao] = useState('');

  const exemplos = [
    'OEE da Linha 1',
    'Paradas do último mês',
    'Produtividade por setor',
    'Eficiência de manutenção',
  ];

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (solicitacao.trim()) onSubmit?.(solicitacao.trim());
  };

  return (
    <div className="kpi-request">
      <div className="kpi-request__header">
        <BarChart3 size={22} />
        <span>Solicite KPIs à IA</span>
      </div>
      <form className="kpi-request__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="kpi-request__input"
          value={solicitacao}
          onChange={(e) => setSolicitacao(e.target.value)}
          placeholder="Ex: Status da produtividade da Linha X, OEE, paradas..."
          disabled={loading}
        />
        <button type="submit" className="kpi-request__btn" disabled={loading || !solicitacao.trim()}>
          {loading ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
        </button>
      </form>
      <div className="kpi-request__exemplos">
        <span className="kpi-request__label">Exemplos:</span>
        {exemplos.map((ex) => (
          <button
            key={ex}
            type="button"
            className="kpi-request__exemplo"
            onClick={() => setSolicitacao(ex)}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
