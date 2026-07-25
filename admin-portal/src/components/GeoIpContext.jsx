/**
 * SEC-VISUAL-INTELLIGENCE-002 — Contexto geográfico de evidência (não risco).
 * INV-SVI2-001: geolocalização é contexto, não prova de hostilidade.
 */

function geoStateHint(geo_state) {
  switch (geo_state) {
    case 'GEO_NOT_ENRICHED':
      return 'Localização pendente';
    case 'GEO_UNRESOLVED':
      return 'Não determinada pelo GeoIP';
    case 'GEO_INVALID':
      return 'Endereço inválido/malformado';
    default:
      return null;
  }
}

/**
 * @param {{ country_code?: string, country?: string, geo_state?: string, compact?: boolean }} props
 */
export default function GeoIpContext({ country_code, country, geo_state, compact = false }) {
  const hint = geoStateHint(geo_state);

  if (geo_state === 'GEO_RESOLVED' && country_code && country_code !== '??') {
    const label = country && country !== 'Desconhecido' ? country : country_code;
    if (compact) {
      return (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
          {country_code} · GeoIP resolvido
        </span>
      );
    }
    return (
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
        <span style={{ color: 'var(--cyan)' }}>{country_code}</span>
        {' '}
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="muted" style={{ display: 'block', fontSize: '0.65rem', marginTop: 2 }}>
          Localização estimada do endereço IP
        </span>
      </span>
    );
  }

  const text = hint || 'Localização pendente';
  return (
    <span
      className="muted"
      style={{ fontFamily: 'var(--font-mono)', fontSize: compact ? '0.68rem' : '0.72rem' }}
      title="Contexto geográfico do IP — não determina, isoladamente, a classificação do evento"
    >
      {text}
    </span>
  );
}
