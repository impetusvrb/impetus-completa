/**
 * Manuais Técnicos - Consulta para perfil de manutenção
 * Lista manuais cadastrados e permite perguntar à IA sobre cada um
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { BookOpen, MessageCircle, FileText, AlertCircle } from 'lucide-react';
import { adminSettings } from '../services/api';

export default function ManuaisTecnicosPage() {
  const navigate = useNavigate();
  const [manuals, setManuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminSettings.listManuals();
        if (!cancelled && res?.data?.manuals) setManuals(res.data.manuals);
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.error || 'Erro ao carregar manuais');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleAskAI = (manual) => {
    const desc = [manual.equipment_type, manual.model, manual.manufacturer].filter(Boolean).join(' ') || 'este equipamento';
    navigate('/app/chatbot', { state: { initialMessage: `Busque no manual técnico cadastrado de ${desc}. Preciso de informações sobre: ` } });
  };

  return (
    <Layout>
      <div className="page-manuais-tecnicos" style={{ padding: 24 }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <BookOpen size={28} />
            Manuais Técnicos
          </h1>
          <p style={{ color: '#64748b', marginTop: 8 }}>
            Consulte manuais de máquinas e procedimentos. Use a IA para buscar informações específicas.
          </p>
        </header>

        {loading && <p>Carregando manuais...</p>}
        {error && (
          <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {!loading && !error && manuals.length === 0 && (
          <div className="block-desc" style={{ padding: 24, background: '#f8fafc', borderRadius: 8 }}>
            <p>Nenhum manual técnico cadastrado para sua empresa.</p>
            <p style={{ marginTop: 8, fontSize: '0.9rem' }}>
              O administrador pode cadastrar manuais em Configurações &gt; Manuais.
            </p>
          </div>
        )}

        {!loading && !error && manuals.length > 0 && (
          <div className="manuais-grid" style={{ display: 'grid', gap: 16 }}>
            {manuals.map((m) => (
              <div
                key={m.id}
                className="manual-card"
                style={{
                  padding: 16,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <FileText size={18} style={{ color: '#64748b' }} />
                    <span
                      style={{
                        fontWeight: 600,
                        textTransform: 'capitalize'
                      }}
                    >
                      {m.manual_type === 'operacional' ? 'Operacional' : 'Máquina'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontWeight: 500 }}>
                    {[m.equipment_type, m.model].filter(Boolean).join(' • ') || 'Sem descrição'}
                  </p>
                  {m.manufacturer && (
                    <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                      {m.manufacturer}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {m.file_url && (
                    <a
                      href={
                        m.file_url.startsWith('/')
                          ? `${(import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '') || window.location.origin}${m.file_url}`
                          : m.file_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm"
                    >
                      Abrir PDF
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAskAI(m)}
                  >
                    <MessageCircle size={14} /> Perguntar à IA
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
