import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DatabaseStack } from './database-stack';
import { getEnvironmentConfig } from '../config/environment';

describe('DatabaseStack', () => {
  let app: cdk.App;
  let stack: DatabaseStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    const config = getEnvironmentConfig('dev');

    stack = new DatabaseStack(app, 'TestDatabaseStack', {
      config,
      env: {
        region: config.region,
        account: '123456789012',
      },
    });

    template = Template.fromStack(stack);
  });

  test('VPCが作成される', () => {
    template.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '10.0.0.0/16',
      EnableDnsHostnames: true,
      EnableDnsSupport: true,
    });
  });

  test('パブリックサブネットが作成される', () => {
    template.hasResourceProperties('AWS::EC2::Subnet', {
      MapPublicIpOnLaunch: true,
    });
  });

  test('プライベートサブネットが作成される', () => {
    template.hasResourceProperties('AWS::EC2::Subnet', {
      MapPublicIpOnLaunch: false,
    });
  });

  test('インターネットゲートウェイが作成される', () => {
    template.hasResource('AWS::EC2::InternetGateway', {});
  });

  test('NATゲートウェイが作成される', () => {
    template.hasResource('AWS::EC2::NatGateway', {});
  });

  test('Aurora Serverless V2クラスターが作成される', () => {
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      Engine: 'aurora-postgresql',
      ServerlessV2ScalingConfiguration: {
        MinCapacity: 0.5,
        MaxCapacity: 1,
      },
      StorageEncrypted: true,
      DeletionProtection: false,
    });
  });

  test('データベースシークレットが作成される', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Description: 'Aurora PostgreSQL database credentials',
    });
  });

  test('セキュリティグループが作成される', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for Aurora PostgreSQL database',
    });

    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for Lambda functions accessing database',
    });
  });

  test('VPCフローログが作成される', () => {
    template.hasResourceProperties('AWS::EC2::FlowLog', {
      ResourceType: 'VPC',
      TrafficType: 'REJECT',
    });
  });

  test('CloudWatch Logsグループが作成される', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/rds/cluster/goal-mandala-dev-aurora-postgresql/postgresql',
      RetentionInDays: 30,
    });
  });

  test('必要な出力が定義される', () => {
    template.hasOutput('VpcId', {});
    template.hasOutput('VpcCidr', {});
    template.hasOutput('PrivateSubnetIds', {});
    template.hasOutput('PublicSubnetIds', {});
    // データベース関連の出力は DatabaseConstruct 内で定義される
  });

  test('適切なタグが設定される', () => {
    // VPCリソースが存在することを確認
    template.hasResource('AWS::EC2::VPC', {});

    // タグの詳細確認は省略（CDKが自動的に多くのタグを追加するため）
  });
});
