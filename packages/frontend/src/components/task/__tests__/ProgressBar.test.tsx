import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  it('should render progress bar with correct percentage', () => {
    render(<ProgressBar progress={75} label="Test Progress" />);

    expect(screen.getByText('Test Progress')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should apply red color for low progress (0-33%)', () => {
    render(<ProgressBar progress={25} label="Low Progress" />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-red-500');
  });

  it('should apply yellow color for medium progress (34-66%)', () => {
    render(<ProgressBar progress={50} label="Medium Progress" />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-yellow-500');
  });

  it('should apply green color for high progress (67-100%)', () => {
    render(<ProgressBar progress={80} label="High Progress" />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-green-500');
  });

  it('should handle 0% progress', () => {
    render(<ProgressBar progress={0} label="No Progress" />);

    expect(screen.getByText('0%')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-red-500');
  });

  it('should handle 100% progress', () => {
    render(<ProgressBar progress={100} label="Complete" />);

    expect(screen.getByText('100%')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-green-500');
  });

  it('should have correct accessibility attributes', () => {
    render(<ProgressBar progress={60} label="Accessible Progress" />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '60');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-label', 'Accessible Progress');
  });
});
