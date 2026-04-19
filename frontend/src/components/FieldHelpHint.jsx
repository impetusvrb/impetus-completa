import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import './FieldHelpHint.css';

export default function FieldHelpHint({ term, title = 'Ver ajuda deste campo' }) {
  const to = `/app/admin/help-center?q=${encodeURIComponent(term || '')}`;
  return (
    <Link className="field-help-hint" to={to} title={title} aria-label={title}>
      <HelpCircle size={14} />
    </Link>
  );
}
