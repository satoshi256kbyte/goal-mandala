import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AuthLayout from './AuthLayout';

describe('AuthLayout', () => {
  it('タイトルが正しく表示される', () => {
    render(
      <AuthLayout title="ログイン">
        <div>テストコンテンツ</div>
      </AuthLayout>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('ログイン');
  });

  it('サブタイトルが提供された場合に表示される', () => {
    const subtitle = 'アカウントにサインインしてください';
    render(
      <AuthLayout title="ログイン" subtitle={subtitle}>
        <div>テストコンテンツ</div>
      </AuthLayout>
    );

    expect(screen.getByText(subtitle)).toBeInTheDocument();
  });

  it('サブタイトルが提供されない場合は表示されない', () => {
    render(
      <AuthLayout title="ログイン">
        <div>テストコンテンツ</div>
      </AuthLayout>
    );

    // サブタイトル用のp要素が存在しないことを確認
    const subtitleElements = screen.queryAllByText(/アカウントに/);
    expect(subtitleElements).toHaveLength(0);
  });

  it('子要素が正しく表示される', () => {
    const testContent = 'テストコンテンツ';
    render(
      <AuthLayout title="ログイン">
        <div>{testContent}</div>
      </AuthLayout>
    );

    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  it('レスポンシブデザインのクラスが適用されている', () => {
    const { container } = render(
      <AuthLayout title="ログイン">
        <div>テストコンテンツ</div>
      </AuthLayout>
    );

    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center');

    const innerDiv = outerDiv.firstChild as HTMLElement;
    expect(innerDiv).toHaveClass('max-w-md', 'w-full');
  });

  it('アクセシビリティ: 適切な見出し構造を持つ', () => {
    render(
      <AuthLayout title="ログイン">
        <div>テストコンテンツ</div>
      </AuthLayout>
    );

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('ログイン');
  });

  it('アクセシビリティ: 適切なセマンティック構造を持つ', () => {
    render(
      <AuthLayout title="ログイン" subtitle="サブタイトル">
        <form>
          <input type="email" aria-label="メールアドレス" />
        </form>
      </AuthLayout>
    );

    // 見出しが存在することを確認
    expect(screen.getByRole('heading')).toBeInTheDocument();

    // フォーム要素が正しく配置されることを確認
    expect(screen.getByRole('textbox', { name: 'メールアドレス' })).toBeInTheDocument();
  });
});
