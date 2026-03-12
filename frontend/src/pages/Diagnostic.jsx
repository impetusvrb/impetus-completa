/**
 * DIAGNÓSTICO - Manutenção Assistida por IA
 */
import React, { useState } from 'react';
import Layout from '../components/Layout';
import { diagnostic } from '../services/api';

export default function Diagnostic() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setStatus('validating');
    setResult(null);
    try {
      const v = await diagnostic.validate(text);
      if (!v.data?.sufficient) {
        setResult({
          status: 'need_more_info',
          questions: v.data?.questions || ['Descreva quando, sintomas, anexos']
        });
        setStatus('need_more_info');
        return;
      }
      setStatus('running');
      const r = await diagnostic.analyze(text);
      setResult(r.data?.result || { error: 'Resposta inválida' });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setResult({ error: err.apiMessage || err.message || 'Erro ao processar' });
    }
  }
  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <h2>Diagnóstico — Manutenção Assistida por IA</h2>
        <p style={{ color: 'var(--gray-600)', marginBottom: 16 }}>
          Descreva o problema e receba sugestões de causas e procedimentos com base nos manuais da empresa.
        </p>
        <form onSubmit={submit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex.: Máquina não liga, ruído estranho ao ligar, vazamento de óleo..."
            style={{ width: '100%', height: 140, padding: 12, borderRadius: 8, border: '1px solid var(--gray-200)' }}
          />
          <button type="submit" style={{ marginTop: 8 }} disabled={status === 'running' || status === 'validating'}>
            {status === 'running' || status === 'validating' ? 'Processando...' : 'Solicitar diagnóstico'}
          </button>
        </form>
        <div style={{ marginTop: 12, color: 'var(--gray-600)' }}>Status: {status || '—'}</div>
        {result && result.status === 'need_more_info' && (
          <div style={{ background: '#fef2f2', padding: 16, borderRadius: 8, marginTop: 16, border: '1px solid #fecaca' }}>
            <h4>Precisamos de mais informações:</h4>
            <ul>{(result.questions || []).map((q, i) => <li key={i}>{q}</li>)}</ul>
          </div>
        )}
        {result && result.status === 'ok' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <strong>⚠️ Confirmação obrigatória</strong> – Leia todas as orientações de segurança antes de executar qualquer procedimento. Só prossiga após confirmar que as condições foram atendidas.
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 12, borderRadius: 6 }}>{result.report}</pre>
            {result.diagnostic_id && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await diagnostic.getReport(result.diagnostic_id);
                    const w = window.open('', '_blank');
                    if (w) w.document.write(typeof res.data === 'string' ? res.data : '<pre>Relatório indisponível</pre>');
                  } catch (e) {
                    alert('Erro ao abrir relatório: ' + (e.apiMessage || e.message));
                  }
                }}
                style={{ marginTop: 8, padding: '8px 16px', cursor: 'pointer', background: 'var(--primary-blue)', color: 'white', border: 'none', borderRadius: 8 }}
              >
                Abrir relatório HTML em nova janela
              </button>
            )}
          </div>
        )}
        {result && result.error && (
          <div style={{ color: 'var(--status-critical)', marginTop: 12 }}>
            Erro: {result.error}
          </div>
        )}
      </div>
    </Layout>
  );
}
