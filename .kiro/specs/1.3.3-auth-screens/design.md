# 設計書

## 概要

認証画面実装は、React + TypeScript + Tailwind CSSを使用してモダンで使いやすい認証フローを提供します。Amazon Cognitoとの統合により、セキュアな認証機能を実現し、優れたユーザーエクスペリエンスを提供します。

## アーキテクチャ

### コンポーネント構成

```
packages/frontend/src/
├── components/
│   └── auth/
│       ├── LoginForm.tsx          # ログインフォームコンポーネント
│       ├── SignupForm.tsx         # サインアップフォームコンポーネント
│       ├── PasswordResetForm.tsx  # パスワードリセットフォームコンポーネント
│       ├── AuthLayout.tsx         # 認証画面共通レイアウト
│       └── index.ts               # エクスポート管理
├── pages/
│   ├── LoginPage.tsx              # ログインページ
│   ├── SignupPage.tsx             # サインアップページ
│   └── PasswordResetPage.tsx      # パスワードリセットページ
├── hooks/
│   ├── useAuth.ts                 # 認証状態管理フック（既存）
│   └── useAuthForm.ts             # フォーム管理フック
├── services/
│   └── auth.ts                    # Cognito認証サービス（既存）
└── utils/
    └── validation.ts              # バリデーション関数
```

### 技術スタック

- **React 18**: UIコンポーネント
- **TypeScript**: 型安全性
- **Tailwind CSS**: スタイリング
- **React Hook Form**: フォーム管理
- **Zod**: バリデーション
- **AWS Amplify Auth**: Cognito統合
- **React Router**: ルーティング

## コンポーネントとインターフェース

### AuthLayout コンポーネント

認証画面の共通レイアウトを提供します。

```typescript
interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 text-center text-sm text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
};
```

### LoginForm コンポーネント

```typescript
interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading, error }) => {
  // React Hook Form + Zod バリデーション実装
  // フォーム送信処理
  // エラー表示
  // ローディング状態管理
};
```

### SignupForm コンポーネント

```typescript
interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface SignupFormProps {
  onSubmit: (data: SignupFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSubmit, isLoading, error }) => {
  // React Hook Form + Zod バリデーション実装
  // パスワード強度インジケーター
  // パスワード確認バリデーション
  // フォーム送信処理
};
```

### PasswordResetForm コンポーネント

```typescript
interface PasswordResetFormData {
  email: string;
}

interface PasswordResetFormProps {
  onSubmit: (data: PasswordResetFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  success?: boolean;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ 
  onSubmit, 
  isLoading, 
  error, 
  success 
}) => {
  // メールアドレス入力フォーム
  // 成功メッセージ表示
  // エラーハンドリング
};
```

## データモデル

### バリデーションスキーマ

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(1, 'パスワードは必須です')
});

export const signupSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .max(50, '名前は50文字以内で入力してください'),
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
           'パスワードは大文字、小文字、数字を含む必要があります'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword']
});

export const passwordResetSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください')
});
```

### 認証サービス拡張

```typescript
// packages/frontend/src/services/auth.ts に追加

export interface AuthError {
  code: string;
  message: string;
}

export class AuthService {
  static async signIn(email: string, password: string): Promise<void> {
    try {
      await Auth.signIn(email, password);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async signUp(
    email: string, 
    password: string, 
    name: string
  ): Promise<void> {
    try {
      await Auth.signUp({
        username: email,
        password,
        attributes: {
          email,
          name
        }
      });
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  static async resetPassword(email: string): Promise<void> {
    try {
      await Auth.forgotPassword(email);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  private static handleAuthError(error: any): AuthError {
    // Cognitoエラーをユーザーフレンドリーなメッセージに変換
    const errorMap: Record<string, string> = {
      'UserNotFoundException': 'メールアドレスまたはパスワードが正しくありません',
      'NotAuthorizedException': 'メールアドレスまたはパスワードが正しくありません',
      'UserNotConfirmedException': 'メールアドレスの確認が必要です',
      'PasswordResetRequiredException': 'パスワードのリセットが必要です',
      'UserLambdaValidationException': '入力内容に問題があります',
      'TooManyRequestsException': 'リクエストが多すぎます。しばらく待ってから再試行してください'
    };

    return {
      code: error.code || 'UnknownError',
      message: errorMap[error.code] || 'エラーが発生しました。しばらく待ってから再試行してください'
    };
  }
}
```

## エラーハンドリング

### エラー表示コンポーネント

```typescript
interface ErrorMessageProps {
  error?: string;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, className = '' }) => {
  if (!error) return null;

  return (
    <div className={`text-red-600 text-sm mt-1 ${className}`}>
      {error}
    </div>
  );
};
```

### ローディング状態管理

```typescript
interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  type?: 'button' | 'submit';
  className?: string;
  onClick?: () => void;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading,
  children,
  type = 'button',
  className = '',
  onClick
}) => {
  return (
    <button
      type={type}
      disabled={isLoading}
      onClick={onClick}
      className={`
        relative flex justify-center items-center
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};
```

## テスト戦略

### ユニットテスト

- **コンポーネントテスト**: React Testing Libraryを使用
- **フォームバリデーション**: Zodスキーマのテスト
- **認証サービス**: モック化したCognitoとの統合テスト

### E2Eテスト

- **ログインフロー**: 正常系・異常系
- **サインアップフロー**: 確認メール送信まで
- **パスワードリセットフロー**: メール送信確認

### テストケース例

```typescript
// LoginForm.test.tsx
describe('LoginForm', () => {
  it('有効な認証情報でログインが成功する', async () => {
    const mockOnSubmit = jest.fn();
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    await userEvent.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('パスワード'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'ログイン' }));
    
    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('無効なメールアドレスでバリデーションエラーが表示される', async () => {
    render(<LoginForm onSubmit={jest.fn()} />);
    
    await userEvent.type(screen.getByLabelText('メールアドレス'), 'invalid-email');
    await userEvent.tab(); // フォーカスを外す
    
    expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
  });
});
```

## セキュリティ考慮事項

### 入力サニタイゼーション

- XSS攻撃防止のため、全ての入力値をエスケープ
- CSRFトークンの実装（必要に応じて）

### パスワード強度

- 最小8文字、大文字・小文字・数字を含む
- パスワード強度インジケーターの表示

### セッション管理

- JWTトークンの適切な管理
- 自動ログアウト機能

## アクセシビリティ対応

### WCAG 2.1 AA準拠

- **キーボードナビゲーション**: 全要素にTabでアクセス可能
- **スクリーンリーダー対応**: 適切なARIAラベル設定
- **色覚対応**: 色以外の情報でも状態判別可能
- **コントラスト比**: 4.5:1以上を確保

### 実装例

```typescript
<input
  id="email"
  type="email"
  aria-label="メールアドレス"
  aria-describedby={error ? 'email-error' : undefined}
  aria-invalid={!!error}
  className={`
    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    ${error ? 'border-red-500' : 'border-gray-300'}
  `}
/>
{error && (
  <div id="email-error" role="alert" className="text-red-600">
    {error}
  </div>
)}
```

## パフォーマンス最適化

### コード分割

```typescript
// 遅延ローディング
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const PasswordResetPage = lazy(() => import('./pages/PasswordResetPage'));
```

### バンドルサイズ最適化

- Tree shakingによる未使用コードの除去
- 必要な依存関係のみをインポート

## 国際化対応

将来的な多言語対応を考慮した設計：

```typescript
// i18n対応の準備
const messages = {
  ja: {
    'auth.login.title': 'ログイン',
    'auth.login.email': 'メールアドレス',
    'auth.login.password': 'パスワード'
  }
};
```
