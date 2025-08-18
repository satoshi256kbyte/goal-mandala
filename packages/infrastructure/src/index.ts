#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack, ApiStack, FrontendStack } from './stacks';
import { getEnvironmentConfig } from './config/environment';

const app = new cdk.App();

try {
  // 環境設定の取得
  const environment = app.node.tryGetContext('environment') || 'dev';
  const config = getEnvironmentConfig(environment);

  // 環境とアカウント情報
  const env = {
    region: config.region,
    account: config.account || process.env.CDK_DEFAULT_ACCOUNT,
  };

  console.log(`Deploying to environment: ${environment}`);
  console.log(`Region: ${config.region}`);
  console.log(`Account: ${env.account}`);

  // データベーススタック作成
  const databaseStack = new DatabaseStack(app, `${config.stackPrefix}-database`, {
    env,
    config,
    description: `Database stack for ${config.stackPrefix} environment`,
  });

  // APIスタック作成（データベーススタックに依存）
  const apiStack = new ApiStack(app, `${config.stackPrefix}-api`, {
    env,
    config,
    vpc: databaseStack.vpc,
    lambdaSecurityGroup: databaseStack.database.securityGroup,
    databaseSecret: databaseStack.database.secret,
    description: `API stack for ${config.stackPrefix} environment`,
  });
  apiStack.addDependency(databaseStack);

  // フロントエンドスタック作成（APIスタックに依存）
  const frontendStack = new FrontendStack(app, `${config.stackPrefix}-frontend`, {
    env,
    config,
    api: apiStack.api,
    description: `Frontend stack for ${config.stackPrefix} environment`,
  });
  frontendStack.addDependency(apiStack);

  // 共通タグの設定
  if (config.tags) {
    Object.entries(config.tags).forEach(([key, value]) => {
      cdk.Tags.of(app).add(key, value);
    });
  }

  // 環境固有のタグを追加
  cdk.Tags.of(app).add('Environment', environment);
  cdk.Tags.of(app).add('Project', 'goal-mandala');
  cdk.Tags.of(app).add('ManagedBy', 'CDK');
} catch (error) {
  console.error('Error initializing CDK application:', error);
  process.exit(1);
}

// エクスポート（テスト用）
export { DatabaseStack, ApiStack, FrontendStack };
