import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { NetworkStatus } from './NetworkStatus';
import * as useNetworkStatusModule from '../../hooks/useNetworkStatus';

// useNetworkStatusフックをモック
vi.mock('../../hooks/useNetworkStatus');
const mockUseNetworkStatus = useNetworkStatusModule.useNetworkStatus as vi.MockedFunction<
  typeof useNetworkStatusModule.useNetworkStatus
>;

describe('NetworkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('オンライン状態で復帰していない場合は何も表示しない', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      wasOffline: false,
    });

    render(<NetworkStatus />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('オフライン状態の場合はオフラインメッセージを表示する', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      wasOffline: false,
    });

    render(<NetworkStatus />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('インターネット接続がありません')).toBeInTheDocument();
    expect(alert).toHaveClass('bg-red-600');
  });

  it('オンライン復帰時はオンラインメッセージを表示する', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      wasOffline: true,
    });

    render(<NetworkStatus />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('インターネット接続が復旧しました')).toBeInTheDocument();
    expect(alert).toHaveClass('bg-green-600');
  });

  it('カスタムオフラインメッセージを表示する', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      wasOffline: false,
    });

    render(<NetworkStatus offlineMessage="カスタムオフラインメッセージ" />);

    expect(screen.getByText('カスタムオフラインメッセージ')).toBeInTheDocument();
  });

  it('カスタムオンラインメッセージを表示する', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      wasOffline: true,
    });

    render(<NetworkStatus onlineMessage="カスタムオンラインメッセージ" />);

    expect(screen.getByText('カスタムオンラインメッセージ')).toBeInTheDocument();
  });

  it('カスタムクラス名が適用される', () => {
    mockUseNetworkStatus.mockReturnValue({
      isOnline: false,
      wasOffline: false,
    });

    render(<NetworkStatus className="custom-class" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-class');
  });
});
