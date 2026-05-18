import React, { useState, useEffect, useCallback } from 'react';
import { environmentExecutive as exApi } from '../../../services/api.js';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function HeatCell({ label, value, unit, intensity }) {
  const clamp = Math.min(1, Math.max(0, intensity ?? 0));
  const bg = clamp > 0.7 ? 'rgba(255,64,64,0.15)' : clamp > 0.4 ? 'rgba(255,170,0,0.15)' : 'rgba(0,255,136,0.1)';
  const border = clamp > 0.7 ? 'rgba(255,64,64,0.3)' : clamp > 0.4 ? 'rgba(255,170,0,0.3)' : 'rgba(0,255,136,0.2)';
  const color = clamp > 0.7 ? 'var(--red)' : clamp > 0.4 ? 'var(--amber)' : 'var(--green)';
  return (
    <div style={{ flex: '1 1 130px', padding: '10px 12px', background: bg, borderRadius: 4, border: `1px solid ${border}` }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color }}>
        {value ?? '—'}{unit && <span style={{ fontSize: 11, marginLeft: 3, color: 'var(--text-secondary)' }}>{unit}</span>}
      </div>
      <div style={{ marginTop: 6, height: 3, background: 'var(--bg-tertiary)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${clamp * 100}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

export function EnvironmentHeatmapWorkspace() {
  const [hm, setHm] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await exApi.runCockpit({
        heatmaps: { emissions: { co2: 50, nox: 12 }, energy: { demand_kw: 900 } },
        emit_events: false
      });
      setHm(data.pack?.heatmaps || data.heatmaps);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ ...mono, color: 'var(--cyan)' }}>Heatmaps ambientais</div>
        <button type="button" className="btn-ghost" style={{ minHeight: 36, borderRadius: 4, fontSize: 12 }} onClick={load} disabled={loading}>
          {loading ? '…' : 'Atualizar'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {hm ? (
          Object.entries(hm).flatMap(([domain, vals]) =>
            typeof vals === 'object' && !Array.isArray(vals)
              ? Object.entries(vals).map(([k, v]) => {
                  const numV = typeof v === 'number' ? v : null;
                  return (
                    <HeatCell key={`${domain}.${k}`} label={`${domain} · ${k.replace(/_/g, ' ')}`} value={numV != null ? numV.toFixed(1) : String(v)} unit="" intensity={numV != null ? numV / 100 : 0.3} />
                  );
                })
              : [<HeatCell key={domain} label={domain} value={typeof vals === 'number' ? vals.toFixed(1) : String(vals)} intensity={typeof vals === 'number' ? vals / 100 : 0.2} />]
          )
        ) : (
          <>
            <HeatCell label="emissões · CO₂" value="—" unit="kg/h" intensity={0.5} />
            <HeatCell label="emissões · NOx" value="—" unit="kg/h" intensity={0.2} />
            <HeatCell label="energia · demanda" value="—" unit="kW" intensity={0.6} />
            <HeatCell label="água · consumo" value="—" unit="m³/h" intensity={0.3} />
          </>
        )}
      </div>
    </div>
  );
}

export default EnvironmentHeatmapWorkspace;
