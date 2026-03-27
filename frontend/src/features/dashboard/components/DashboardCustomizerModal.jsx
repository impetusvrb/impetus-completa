/**
 * MODAL DE PERSONALIZAÇÃO DO PAINEL
 * Permite ao usuário ajustar: ordem dos cards, KPIs favoritos, período, layout
 */
import React, { useState, useEffect, useRef } from 'react';
import { Settings2, Check } from 'lucide-react';
import { dashboard } from '../../../services/api';
import './DashboardCustomizerModal.css';

const PERIOD_OPTIONS = [
  { value: '1d', label: 'Último dia' },
  { value: '7d', label: 'Última semana' },
  { value: '15d', label: 'Últimos 15 dias' },
  { value: '30d', label: 'Último mês' }
];

export default function DashboardCustomizerModal({ isOpen, onClose, payload, onSaved }) {
  const [cardsOrder, setCardsOrder] = useState([]);
  const [favoriteKpis, setFavoriteKpis] = useState([]);
  const [defaultPeriod, setDefaultPeriod] = useState('7d');
  const [compactMode, setCompactMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const closeTimerRef = useRef(null);

  const profileCards = payload?.profile_config?.cards || [];
  const cards = payload?.cards?.length ? payload.cards : profileCards;
  const kpis = payload?.kpis || [];
  const allKeys = [...new Set([...cards.map(c => c.key), ...kpis.map(k => k.key || k.id)])].filter(Boolean);

  useEffect(() => {
    if (payload && isOpen) {
      const p = payload.personalization || {};
      const cardList = payload.cards?.length ? payload.cards : (payload.profile_config?.cards || []);
      const orderFromProfile = cardList.map((c) => c.key).filter(Boolean);
      setCardsOrder(
        Array.isArray(p.cards_order) && p.cards_order.length ? p.cards_order : orderFromProfile
      );
      setFavoriteKpis(
        Array.isArray(p.preferred_kpis) && p.preferred_kpis.length
          ? p.preferred_kpis
          : Array.isArray(payload.favorite_kpis)
            ? payload.favorite_kpis
            : []
      );
      setDefaultPeriod(p.default_period || p.favorite_period || payload.default_period || '7d');
      setCompactMode(!!(p.compact_mode ?? payload.compact_mode));
    }
  }, [payload, isOpen]);
  useEffect(() => () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await dashboard.savePreferences({
        cards_order: cardsOrder,
        favorite_kpis: favoriteKpis,
        default_period: defaultPeriod,
        compact_mode: compactMode
      });
      setSaved(true);
      onSaved?.();
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        setSaved(false);
        onClose();
        closeTimerRef.current = null;
      }, 800);
    } catch (e) {
      console.error('[DashboardCustomizer]', e);
    } finally {
      setSaving(false);
    }
  };

  const toggleFavorite = (key) => {
    setFavoriteKpis(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="dashboard-customizer-overlay" onClick={onClose}>
      <div className="dashboard-customizer-modal" onClick={e => e.stopPropagation()}>
        <header className="dashboard-customizer-header">
          <Settings2 size={24} />
          <h2>Personalizar meu painel</h2>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Fechar">×</button>
        </header>
        <div className="dashboard-customizer-body">
          <section className="customizer-section">
            <h3>Período padrão</h3>
            <select
              value={defaultPeriod}
              onChange={e => setDefaultPeriod(e.target.value)}
              className="customizer-select"
            >
              {PERIOD_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </section>
          <section className="customizer-section">
            <h3>Layout</h3>
            <label className="customizer-checkbox">
              <input
                type="checkbox"
                checked={compactMode}
                onChange={e => setCompactMode(e.target.checked)}
              />
              <span>Modo compacto</span>
            </label>
          </section>
          <section className="customizer-section">
            <h3>Indicadores favoritos</h3>
            <p className="customizer-desc">Selecione os indicadores que deseja destacar.</p>
            <div className="favorite-kpis-grid">
              {allKeys.slice(0, 12).map(key => {
                const card = cards.find(c => c.key === key) || kpis.find(k => (k.key || k.id) === key);
                const label = card?.title || key;
                const isFav = favoriteKpis.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`favorite-kpi-chip ${isFav ? 'active' : ''}`}
                    onClick={() => toggleFavorite(key)}
                  >
                    {isFav && <Check size={14} />}
                    {label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
        <footer className="dashboard-customizer-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar preferências'}
          </button>
        </footer>
      </div>
    </div>
  );
}
