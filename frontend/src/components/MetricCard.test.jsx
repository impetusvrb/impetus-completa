import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MetricCard from './MetricCard';
import { BarChart3 } from 'lucide-react';

describe('MetricCard', () => {
  it('exibe título e valor', () => {
    render(
      <MetricCard icon={BarChart3} title="Total" value={42} color="blue" />
    );
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('exibe valor 0 quando value é 0', () => {
    render(
      <MetricCard icon={BarChart3} title="Zeros" value={0} color="blue" />
    );
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('exibe "-" quando value é null ou undefined', () => {
    render(
      <MetricCard icon={BarChart3} title="N/A" value={null} color="blue" />
    );
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('chama onClick quando clicável', async () => {
    const onClick = vi.fn();
    render(
      <MetricCard icon={BarChart3} title="Click" value={10} color="blue" onClick={onClick} />
    );
    fireEvent.click(screen.getByRole('button', { name: /Click/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
