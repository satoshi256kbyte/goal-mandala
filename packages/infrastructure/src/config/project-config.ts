/**
 * プロジェクト設定
 */
export interface ProjectConfig {
  /** プロジェクト名 */
  projectName: string;

  /** スタックプレフィックス */
  stackPrefix: string;

  /** 環境名 (local/dev/stg/prod) */
  environment: string;

  /** AWSリージョン */
  region: string;

  /** アラート通知先メールアドレス（本番環境のみ） */
  alertEmail?: string;
}

/**
 * 環境別のデフォルト設定を取得
 */
export function getDefaultConfig(environment: string): ProjectConfig {
  const config: ProjectConfig = {
    projectName: 'goal-mandala',
    stackPrefix: 'goal-mandala',
    environment,
    region: process.env.AWS_REGION || 'ap-northeast-1',
  };

  // 本番環境の場合はアラートメールを設定
  if (environment === 'prod') {
    config.alertEmail = process.env.ALERT_EMAIL || 'admin@example.com';
  }

  return config;
}
