/**
 * NAV-002 — Adapter sobre EoxHeader (ARC-003). Componente certificado preservado.
 */
import EoxHeader from '../eox/EoxHeader.jsx';

export default function OperationalNavigationHeader(props) {
  return <EoxHeader {...props} />;
}
