import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageLoader from './PageLoader';

describe('PageLoader', () => {
  it('exibe texto de carregamento', () => {
    render(<PageLoader />);
    expect(screen.getByRole('status', { name: 'Carregando' })).toBeInTheDocument();
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });
});
