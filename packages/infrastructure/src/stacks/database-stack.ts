import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { DatabaseConstruct } from '../constructs/database-construct';
import { EnvironmentConfig } from '../config/environment';

export interface DatabaseStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class DatabaseStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly database: DatabaseConstruct;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { config } = props;

    // VPC作成
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: `${config.stackPrefix}-vpc`,
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2, // 高可用性のため2つのAZを使用

      // サブネット設定
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],

      // NATゲートウェイ設定（コスト最適化のため1つのAZのみ）
      natGateways: 1,

      // VPCエンドポイント設定（必要に応じて）
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // VPCフローログ設定（セキュリティ監視用）
    new ec2.FlowLog(this, 'VpcFlowLog', {
      resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
      destination: ec2.FlowLogDestination.toCloudWatchLogs(),
      trafficType: ec2.FlowLogTrafficType.REJECT, // 拒否されたトラフィックのみログ
    });

    // データベースコンストラクト作成
    this.database = new DatabaseConstruct(this, 'Database', {
      vpc: this.vpc,
      config,
    });

    // タグ設定
    if (config.tags) {
      Object.entries(config.tags).forEach(([key, value]) => {
        cdk.Tags.of(this.vpc).add(key, value);
      });
    }

    // 出力
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `${config.stackPrefix}-vpc-id`,
    });

    new cdk.CfnOutput(this, 'VpcCidr', {
      value: this.vpc.vpcCidrBlock,
      description: 'VPC CIDR block',
      exportName: `${config.stackPrefix}-vpc-cidr`,
    });

    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: this.vpc.privateSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Private subnet IDs',
      exportName: `${config.stackPrefix}-private-subnet-ids`,
    });

    new cdk.CfnOutput(this, 'PublicSubnetIds', {
      value: this.vpc.publicSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Public subnet IDs',
      exportName: `${config.stackPrefix}-public-subnet-ids`,
    });
  }
}
