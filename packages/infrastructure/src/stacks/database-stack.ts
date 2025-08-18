import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { DatabaseConstruct } from '../constructs/database-construct';
import { EnvironmentConfig } from '../config/environment';

export interface DatabaseStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  vpc: ec2.IVpc;
  databaseSecurityGroup: ec2.ISecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  public readonly database: DatabaseConstruct;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { config, vpc, databaseSecurityGroup } = props;

    // データベースコンストラクト作成
    this.database = new DatabaseConstruct(this, 'Database', {
      vpc,
      databaseSecurityGroup,
      config,
    });

    // タグ設定
    if (config.tags) {
      Object.entries(config.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.database).add(key, value);
      });
    }
  }
}
