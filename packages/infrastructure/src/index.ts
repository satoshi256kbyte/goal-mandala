#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { VpcStack, DatabaseStack, CognitoStack, ApiStack, FrontendStack } from './stacks';
import { StepFunctionsStack } from './stacks/step-functions-stack';
import { TaskManagementStack } from './stacks/task-management-stack';
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

  // VPCスタック作成
  const vpcStack = new VpcStack(app, `${config.stackPrefix}-vpc`, {
    env,
    config,
    environment,
    description: `VPC stack for ${config.stackPrefix} environment`,
  });

  // データベーススタック作成（VPCスタックに依存）
  const databaseStack = new DatabaseStack(app, `${config.stackPrefix}-database`, {
    env,
    config,
    vpc: vpcStack.vpc,
    databaseSecurityGroup: vpcStack.databaseSecurityGroup,
    description: `Database stack for ${config.stackPrefix} environment`,
  });
  databaseStack.addDependency(vpcStack);

  // Cognitoスタック作成（独立）
  const cognitoStack = new CognitoStack(app, `${config.stackPrefix}-cognito`, {
    env,
    config,
    environment,
    description: `Cognito stack for ${config.stackPrefix} environment`,
  });

  // APIスタック作成（VPCスタック、データベーススタック、Cognitoスタックに依存）
  const apiStack = new ApiStack(app, `${config.stackPrefix}-api`, {
    env,
    config,
    vpc: vpcStack.vpc,
    lambdaSecurityGroup: vpcStack.lambdaSecurityGroup,
    databaseSecret: databaseStack.database.secret,
    userPool: cognitoStack.userPool,
    userPoolClient: cognitoStack.userPoolClient,
    cognitoLambdaRole: cognitoStack.lambdaRole,
    description: `API stack for ${config.stackPrefix} environment`,
  });
  apiStack.addDependency(vpcStack);
  apiStack.addDependency(databaseStack);
  apiStack.addDependency(cognitoStack);

  // Step Functionsスタック作成（APIスタックに依存）
  const stepFunctionsStack = new StepFunctionsStack(app, `${config.stackPrefix}-step-functions`, {
    env,
    config,
    updateProcessingStateFunctionArn: `arn:aws:lambda:${config.region}:${env.account}:function:${config.stackPrefix}-update-processing-state`,
    aiGenerationWorkerFunctionArn: `arn:aws:lambda:${config.region}:${env.account}:function:${config.stackPrefix}-ai-generation-worker`,
    description: `Step Functions stack for ${config.stackPrefix} environment`,
  });
  stepFunctionsStack.addDependency(apiStack);

  // Task Managementスタック作成（VPCスタック、データベーススタックに依存）
  const taskManagementStack = new TaskManagementStack(
    app,
    `${config.stackPrefix}-task-management`,
    {
      env,
      environment,
      databaseSecretArn: databaseStack.database.secret?.secretArn || '',
      vpcId: vpcStack.vpc.vpcId,
      subnetIds: vpcStack.vpc.privateSubnets.map(subnet => subnet.subnetId),
      description: `Task Management stack for ${config.stackPrefix} environment`,
    }
  );
  taskManagementStack.addDependency(vpcStack);
  taskManagementStack.addDependency(databaseStack);

  // フロントエンドスタック作成（Cognitoスタックに依存）
  const frontendStack = new FrontendStack(app, `${config.stackPrefix}-frontend`, {
    env,
    config,
    environment,
    userPool: cognitoStack.userPool,
    userPoolClient: cognitoStack.userPoolClient,
    userPoolDomain: cognitoStack.userPoolDomain,
    description: `Frontend stack for ${config.stackPrefix} environment`,
  });
  frontendStack.addDependency(cognitoStack);

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
export {
  VpcStack,
  DatabaseStack,
  CognitoStack,
  ApiStack,
  FrontendStack,
  StepFunctionsStack,
  TaskManagementStack,
};
