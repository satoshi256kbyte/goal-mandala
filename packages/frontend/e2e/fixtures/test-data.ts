export const testUsers = {
  validUser: {
    name: 'テストユーザー',
    email: 'test@example.com',
    password: 'TestPassword123!',
  },
  invalidUser: {
    name: '',
    email: 'invalid-email',
    password: 'weak',
  },
  existingUser: {
    name: '既存ユーザー',
    email: 'existing@example.com',
    password: 'ExistingPassword123!',
  },
  unconfirmedUser: {
    name: '未確認ユーザー',
    email: 'unconfirmed@example.com',
    password: 'UnconfirmedPassword123!',
  },
};

export const errorMessages = {
  invalidEmail: '有効なメールアドレスを入力してください',
  requiredField: 'この項目は必須です',
  passwordMismatch: 'パスワードが一致しません',
  weakPassword: 'パスワードは8文字以上で、大文字、小文字、数字を含む必要があります',
  invalidCredentials: 'メールアドレスまたはパスワードが正しくありません',
  userNotFound: 'ユーザーが見つかりません',
  userNotConfirmed: 'メールアドレスの確認が必要です',
  networkError: 'ネットワークエラーが発生しました',
};

export const successMessages = {
  passwordResetSent: 'パスワードリセットメールを送信しました',
  signupSuccess: 'アカウントが作成されました。確認メールをご確認ください',
  loginSuccess: 'ログインしました',
};
