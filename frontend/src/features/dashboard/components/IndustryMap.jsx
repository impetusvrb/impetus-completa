/**
 * Mapa Inteligente da Indústria
 * Centro estratégico de monitoramento - exclusivo CEO e Diretor
 * Estrutura: Empresa → Unidade → Setor → Linha → Equipamento
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, AlertTriangle, TrendingDown, Cpu, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { dashboard } from '../../../services/api';
import { useCachedFetch } from '../../../hooks/useCachedFetch';
import './IndustryMap.css';

const STATUS_COLORS = {
  normal: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', dot: '#10b981', label: 'Normal' },
  attention: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', dot: '#f59e0b', label: 'Atenção' },
  critical: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', dot: '#ef4444', label: 'Crítico' },
  unknown: { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)', dot: '#64748b', label: 'Sem dados' }
};

function isExecutive() {
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    const role = (u.role || '').toLowerCase();
    const h = u.hierarchy_level ?? 5;
    return role === 'ceo' || role === 'diretor' || h <= 1;
  } catch {
    return false;
  }
}

export default function IndustryMap() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({ setores: true, linhas: false, alertas: true });

  if (!isExecutive()) return null;

  const { data, loading, error } = useCachedFetch(
    'dashboard:industry-map',
    () => dashboard.getIndustryMap(),
    { ttlMs: 60 * 1000 }
  );

  const map = data?.map;
  if (error?.response?.status === 403) return null;
  if (loading && !map) {
    return (
      <section className="industry-map industry-map--loading">
        <div className="industry-map__loader">
          <Loader2 size={28} className="spin" />
          <span>Carregando mapa operacional...</span>
        </div>
      </section>
    );
  }

  if (!map) return null;

  const { company, structure, critical_sectors, operational_alerts, diagnostics, financial_losses, offline_equipment } = map;

  const toggle = (key) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  return (
    <section className="industry-map">
      <div className="industry-map__header">
        <div className="industry-map__title-row">
          <MapPin size={20} className="industry-map__icon" />
          <h2>Mapa Inteligente da Indústria</h2>
          <span className="industry-map__company">{company?.name || 'Empresa'}</span>
        </div>
        <div className={`industry-map__status industry-map__status--${company?.status || 'unknown'}`}>
          <span className="industry-map__status-dot" />
          Centro de Controle Executivo
        </div>
      </div>

      <div className="industry-map__grid">
        {/* Setores */}
        <div className="industry-map__panel industry-map__panel--main">
          <button className="industry-map__panel-header" onClick={() => toggle('setores')}>
            {expanded.setores ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Building2 size={16} />
            Setores Operacionais
          </button>
          {expanded.setores && (
            <div className="industry-map__sectors">
              {(structure?.setores || []).map((s) => {
                const sc = STATUS_COLORS[s.status] || STATUS_COLORS.unknown;
                return (
                  <div
                    key={s.key}
                    className="industry-map__sector"
                    style={{ '--sector-bg': sc.bg, '--sector-border': sc.border, '--sector-dot': sc.dot }}
                  >
                    <span className="industry-map__sector-dot" />
                    <div>
                      <strong>{s.name}</strong>
                      <span className="industry-map__sector-health">Saúde: {s.health_index ?? '—'}%</span>
                    </div>
                    <span className="industry-map__sector-badge">{sc.label}</span>
                  </div>
                );
              })}
              {(!structure?.setores || structure.setores.length === 0) && (
                <p className="industry-map__empty">Nenhum setor configurado</p>
              )}
            </div>
          )}
        </div>

        {/* Linhas de Produção */}
        <div className="industry-map__panel">
          <button className="industry-map__panel-header" onClick={() => toggle('linhas')}>
            {expanded.linhas ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Cpu size={16} />
            Linhas de Produção
          </button>
          {expanded.linhas && (
            <div className="industry-map__lines">
              {(structure?.linhas || []).slice(0, 8).map((l) => {
                const sc = STATUS_COLORS[l.status] || STATUS_COLORS.unknown;
                return (
                  <div key={l.id || l.name} className="industry-map__line">
                    <span className="industry-map__line-dot" style={{ background: sc.dot }} />
                    <span>{l.name}</span>
                    {l.responsible && <span className="industry-map__line-resp">{l.responsible}</span>}
                  </div>
                );
              })}
              {(!structure?.linhas || structure.linhas.length === 0) && (
                <p className="industry-map__empty">Nenhuma linha cadastrada</p>
              )}
            </div>
          )}
        </div>

        {/* Alertas e Diagnósticos */}
        <div className="industry-map__panel industry-map__panel--alerts">
          <button className="industry-map__panel-header" onClick={() => toggle('alertas')}>
            {expanded.alertas ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <AlertTriangle size={16} />
            Alertas e Diagnósticos
          </button>
          {expanded.alertas && (
            <div className="industry-map__alerts">
              {critical_sectors?.length > 0 && (
                <div className="industry-map__critical">
                  <strong>Setores críticos:</strong> {critical_sectors.join(', ')}
                </div>
              )}
              {(operational_alerts || []).slice(0, 5).map((a, i) => (
                <div key={i} className={`industry-map__alert industry-map__alert--${(a.severity || 'medium').toLowerCase()}`}>
                  <span>{a.title || a.description}</span>
                </div>
              ))}
              {(diagnostics || []).slice(0, 4).map((d, i) => (
                <div key={i} className="industry-map__diagnostic">
                  <strong>{d.title}</strong>
                  <p>{d.description}</p>
                  {d.route && (
                    <button type="button" className="industry-map__link" onClick={() => navigate(d.route)}>
                      Ver detalhes
                    </button>
                  )}
                </div>
              ))}
              {(!operational_alerts?.length && !diagnostics?.length && !critical_sectors?.length) && (
                <p className="industry-map__empty">Nenhum alerta no momento</p>
              )}
            </div>
          )}
        </div>

        {/* Perdas Financeiras */}
        <div className="industry-map__panel">
          <div className="industry-map__panel-header">
            <TrendingDown size={16} />
            Perdas e Riscos
          </div>
          <div className="industry-map__losses">
            {(financial_losses || []).slice(0, 5).map((f, i) => (
              <div key={i} className="industry-map__loss">
                <span className="industry-map__loss-source">{f.source}</span>
                <span>{f.description}</span>
              </div>
            ))}
            {(offline_equipment || []).length > 0 && (
              <div className="industry-map__offline">
                <strong>{offline_equipment.length} equipamento(s) offline</strong>
              </div>
            )}
            {(!financial_losses?.length && (!offline_equipment || offline_equipment.length === 0)) && (
              <p className="industry-map__empty">Sem perdas identificadas</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
