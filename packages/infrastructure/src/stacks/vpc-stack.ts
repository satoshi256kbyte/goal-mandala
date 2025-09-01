import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface VpcStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  environment: string;
}

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public databaseSecurityGroup!: ec2.SecurityGroup;
  public lambdaSecurityGroup!: ec2.SecurityGroup;
  public albSecurityGroup!: ec2.SecurityGroup;
  public vpcEndpointSecurityGroup?: ec2.SecurityGroup;

  // VPCエンドポイントの参照を保存
  public s3Endpoint?: ec2.GatewayVpcEndpoint;
  public dynamoDbEndpoint?: ec2.GatewayVpcEndpoint;
  public secretsManagerEndpoint?: ec2.InterfaceVpcEndpoint;
  public cloudWatchLogsEndpoint?: ec2.InterfaceVpcEndpoint;
  public bedrockEndpoint?: ec2.InterfaceVpcEndpoint;

  // VPCフローログリソースの参照を保存
  private vpcFlowLogGroup?: logs.LogGroup;
  private vpcFlowLogRole?: iam.Role;
  private vpcFlowLog?: ec2.FlowLog;

  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, props);

    const { config, environment } = props;

    // VPC作成（環境設定に基づく）
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: `${config.stackPrefix}-vpc`,
      ipAddresses: ec2.IpAddresses.cidr(config.network.vpcCidr!),
      maxAzs: config.network.maxAzs!, // 環境設定に基づくAZ数

      // サブネット設定（3層アーキテクチャ）
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
          // パブリックサブネット: ALB、NATゲートウェイ用
          // 設計上のCIDR: 10.0.0.0/24 (AZ-1a), 10.0.10.0/24 (AZ-1c)
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
          // プライベートサブネット: Lambda関数用
          // 設計上のCIDR: 10.0.1.0/24 (AZ-1a), 10.0.11.0/24 (AZ-1c)
        },
        {
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 28,
          // データベースサブネット: Aurora Serverless用（分離）
          // 設計上のCIDR: 10.0.2.0/28 (AZ-1a), 10.0.12.0/28 (AZ-1c)
        },
      ],

      // NATゲートウェイ設定（環境別）
      // 要件4.1: 本番環境用の冗長NATゲートウェイ設定
      // 要件4.2: 開発環境用の単一NATゲートウェイ設定
      natGateways: config.network.natGateways,

      // DNS設定
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // VPCフローログの設定
    this.setupVpcFlowLogs(config);

    // NATゲートウェイとルーティング設定の検証
    // CDKのVpcコンストラクトが自動的に以下を作成：
    // 1. インターネットゲートウェイ（IGW）
    // 2. パブリックサブネット用ルートテーブル（0.0.0.0/0 -> IGW）
    // 3. プライベートサブネット用ルートテーブル（0.0.0.0/0 -> NAT Gateway）
    // 4. NATゲートウェイ（環境別の数量設定済み）
    this.validateNatGatewayAndRouting(config, environment);

    // セキュリティグループ作成
    this.createSecurityGroups(config);

    // VPCエンドポイント作成（必要に応じて）
    this.createVpcEndpoints(config, environment);

    // タグ設定
    this.applyTags(config);

    // 出力設定
    this.createOutputs(config);
  }

  /**
   * VPCフローログの設定
   * 要件3.1-3.4に基づいてVPCフローログを設定
   */
  private setupVpcFlowLogs(config: EnvironmentConfig): void {
    // CloudWatch Logsグループの作成
    // 要件3.2: ログの保持期間が1ヶ月に設定される SHALL
    const vpcFlowLogGroup = new logs.LogGroup(this, 'VpcFlowLogGroup', {
      logGroupName: `/aws/vpc/flowlogs/${config.stackPrefix}`,
      retention: logs.RetentionDays.ONE_MONTH, // 1ヶ月保持
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // VPCフローログ用のIAMロールの作成
    // 要件3.3: 適切なIAMロールが自動作成される SHALL
    const vpcFlowLogRole = new iam.Role(this, 'VpcFlowLogRole', {
      roleName: `${config.stackPrefix}-vpc-flowlog-role`,
      assumedBy: new iam.ServicePrincipal('vpc-flow-logs.amazonaws.com'),
      description: 'IAM role for VPC Flow Logs to write to CloudWatch Logs',
    });

    // CloudWatch Logsへの書き込み権限を付与
    vpcFlowLogRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogGroups',
          'logs:DescribeLogStreams',
        ],
        resources: [vpcFlowLogGroup.logGroupArn, `${vpcFlowLogGroup.logGroupArn}:*`],
      })
    );

    // VPCフローログの設定と有効化
    // 要件3.1: 全てのネットワークトラフィックがCloudWatch Logsに記録される SHALL
    // 要件3.4: 承認されたトラフィックと拒否されたトラフィックの両方が記録される SHALL
    const vpcFlowLog = new ec2.FlowLog(this, 'VpcFlowLog', {
      resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
      destination: ec2.FlowLogDestination.toCloudWatchLogs(vpcFlowLogGroup, vpcFlowLogRole),
      trafficType: ec2.FlowLogTrafficType.ALL, // 全トラフィック（承認・拒否両方）をログ
      flowLogName: `${config.stackPrefix}-vpc-flowlog`,
    });

    // VPCフローログの設定完了ログ
    console.log('VPCフローログの設定が完了しました:');
    console.log(`- ログ出力先: CloudWatch Logs`);
    console.log(`- ロググループ: ${vpcFlowLogGroup.logGroupName}`);
    console.log(`- ログ保持期間: 1ヶ月`);
    console.log(`- 記録対象: 全トラフィック（承認・拒否両方）`);
    console.log(`- IAMロール: ${vpcFlowLogRole.roleName}`);
    console.log(`- フローログID: ${vpcFlowLog.flowLogId}`);
    console.log('ネットワークトラフィックの監視とセキュリティ分析が有効になりました。');

    // VPCフローログリソースを保存（タグ適用のため）
    this.vpcFlowLogGroup = vpcFlowLogGroup;
    this.vpcFlowLogRole = vpcFlowLogRole;
    this.vpcFlowLog = vpcFlowLog;
  }

  private validateNatGatewayAndRouting(config: EnvironmentConfig, environment: string): void {
    // CDKのVpcコンストラクトは自動的に以下を作成します：
    // 1. インターネットゲートウェイ（IGW）
    // 2. パブリックサブネット用ルートテーブル（0.0.0.0/0 -> IGW）
    // 3. プライベートサブネット用ルートテーブル（0.0.0.0/0 -> NAT Gateway）
    // 4. NATゲートウェイ（環境別の数量設定済み）

    // 要件1.4: パブリックサブネットはインターネットゲートウェイ経由でインターネットアクセス可能
    // 要件1.5: プライベートサブネットはNATゲートウェイ経由でアウトバウンド通信可能
    // 要件4.1: 本番環境用の冗長NATゲートウェイ設定
    // 要件4.2: 開発環境用の単一NATゲートウェイ設定

    // 基本的なサブネット構成の検証
    if (this.vpc.publicSubnets.length === 0) {
      throw new Error('パブリックサブネットが作成されていません');
    }

    if (this.vpc.privateSubnets.length === 0) {
      throw new Error('プライベートサブネットが作成されていません');
    }

    if (this.vpc.isolatedSubnets.length === 0) {
      throw new Error('分離サブネット（データベース用）が作成されていません');
    }

    // NATゲートウェイ数の検証
    const expectedNatGateways = config.network.natGateways;
    const actualAzs = this.vpc.availabilityZones.length;

    // NATゲートウェイ数がAZ数を超えないことを確認
    if (expectedNatGateways > actualAzs) {
      throw new Error(
        `NATゲートウェイ数(${expectedNatGateways})がアベイラビリティゾーン数(${actualAzs})を超えています`
      );
    }

    // 環境別のNATゲートウェイ設定の検証
    if (environment === 'prod' || environment === 'stg') {
      if (expectedNatGateways < 2) {
        console.warn(
          `警告: ${environment}環境では高可用性のため2つのNATゲートウェイを推奨しますが、現在の設定は${expectedNatGateways}です`
        );
      }
    }

    // プライベートサブネットからのアウトバウンドルーティング設定の確認
    // CDKが自動的に作成するため、ここでは設定内容をログ出力
    console.log(`VPC ${config.stackPrefix} のNATゲートウェイとルーティング設定が完了しました`);
    console.log(`- 環境: ${environment}`);
    console.log(`- VPC CIDR: ${config.network.vpcCidr!}`);
    console.log(`- NATゲートウェイ数: ${expectedNatGateways}`);
    console.log(`- パブリックサブネット数: ${this.vpc.publicSubnets.length}`);
    console.log(`- プライベートサブネット数: ${this.vpc.privateSubnets.length}`);
    console.log(`- 分離サブネット数: ${this.vpc.isolatedSubnets.length}`);
    console.log(`- アベイラビリティゾーン: ${this.vpc.availabilityZones.join(', ')}`);
    console.log(`- VPCエンドポイント有効: ${config.network.enableVpcEndpoints}`);

    // ルーティング設定の詳細ログ
    console.log('ルーティング設定:');
    console.log('  - パブリックサブネット: 0.0.0.0/0 -> インターネットゲートウェイ');
    console.log(
      `  - プライベートサブネット: 0.0.0.0/0 -> NATゲートウェイ(${expectedNatGateways}個)`
    );
    console.log('  - 分離サブネット: インターネットアクセスなし（完全分離）');
  }

  /**
   * セキュリティグループの作成と設定
   * 要件2.1-2.5に基づいて最小権限の原則に従ったセキュリティグループを作成
   */
  private createSecurityGroups(config: EnvironmentConfig): void {
    // ALB用セキュリティグループ
    // 要件2.3: ALB用セキュリティグループを作成する THEN HTTP（ポート80）とHTTPS（ポート443）のインバウンド通信を許可する SHALL
    this.albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `${config.stackPrefix}-alb-sg`,
      description: 'Security group for Application Load Balancer - allows HTTP/HTTPS from internet',
      allowAllOutbound: false, // 要件2.4: 不要な通信は全て拒否される SHALL
    });

    // HTTPS (443) インバウンドを許可
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic from internet'
    );

    // HTTP (80) インバウンドを許可（HTTPSリダイレクト用）
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic for HTTPS redirect'
    );

    // Lambda用セキュリティグループ
    // 要件2.2: Lambda用セキュリティグループを作成する THEN 外部APIへのアウトバウンド通信を許可する SHALL
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `${config.stackPrefix}-lambda-sg`,
      description:
        'Security group for Lambda functions - allows outbound to external APIs and database',
      allowAllOutbound: true, // 外部APIアクセスが必要
    });

    // データベース用セキュリティグループ
    // 要件2.1: データベース用セキュリティグループを作成する THEN Lambda関数からのPostgreSQL接続（ポート5432）のみを許可する SHALL
    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `${config.stackPrefix}-db-sg`,
      description: 'Security group for Aurora database - allows PostgreSQL access from Lambda only',
      allowAllOutbound: false, // 要件2.4: 不要な通信は全て拒否される SHALL
    });

    // セキュリティグループ間の適切な通信ルール設定
    // 要件2.5: セキュリティグループ間の通信を設定する THEN 最小権限の原則に従って設定される SHALL

    // Lambda からデータベースへのPostgreSQL接続を許可
    // 要件2.1: Lambda関数からのPostgreSQL接続（ポート5432）のみを許可する
    this.databaseSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda access to PostgreSQL database'
    );

    // ALBからLambdaへのアクセス設定（将来のAPI Gateway以外の構成に備えて）
    // 現在はAPI Gateway経由だが、将来的にALB直接接続の可能性を考慮
    // ただし、現在のアーキテクチャではAPI Gateway経由のため、このルールは実際には使用されない
    this.lambdaSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(8080),
      'Allow ALB access to Lambda (future extensibility)'
    );

    // VPCエンドポイント用のセキュリティグループルール
    // Interface型VPCエンドポイントへのアクセスを許可
    // Lambda関数がVPCエンドポイント経由でAWSサービスにアクセスする際に必要
    this.lambdaSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow Lambda access to VPC endpoints and external APIs via HTTPS'
    );

    // セキュリティグループの設定完了ログ
    console.log('セキュリティグループの作成が完了しました:');
    console.log(`- ALB Security Group: ${this.albSecurityGroup.securityGroupId}`);
    console.log('  - インバウンド: HTTP(80), HTTPS(443) from 0.0.0.0/0');
    console.log('  - アウトバウンド: 制限あり（明示的に許可されたもののみ）');
    console.log(`- Lambda Security Group: ${this.lambdaSecurityGroup.securityGroupId}`);
    console.log('  - インバウンド: ALBからのアクセス（将来の拡張用）');
    console.log('  - アウトバウンド: 全許可（外部API、VPCエンドポイント、データベースアクセス用）');
    console.log(`- Database Security Group: ${this.databaseSecurityGroup.securityGroupId}`);
    console.log('  - インバウンド: Lambda SGからのPostgreSQL(5432)のみ');
    console.log('  - アウトバウンド: なし（完全に制限）');
    console.log('最小権限の原則に従ったセキュリティグループ設定が適用されました。');
  }

  /**
   * VPCエンドポイントの環境別実装
   * 要件4.3, 4.4, 5.1, 5.2, 5.3, 5.4に基づいてVPCエンドポイントを作成
   */
  private createVpcEndpoints(config: EnvironmentConfig, environment: string): void {
    // 環境別VPCエンドポイント作成制御ロジック
    // 要件4.3: 本番環境またはステージング環境をデプロイする THEN VPCエンドポイントが作成される SHALL
    // 要件4.4: 開発環境をデプロイする THEN コスト最適化のためVPCエンドポイントは作成されない SHALL

    console.log(`VPCエンドポイント作成処理を開始します - 環境: ${environment}`);
    console.log(`VPCエンドポイント有効設定: ${config.network.enableVpcEndpoints}`);

    if (!config.network.enableVpcEndpoints) {
      console.log(`環境 ${environment} ではVPCエンドポイントは作成されません（コスト最適化）`);
      console.log('VPCエンドポイント作成をスキップしました。');
      return;
    }

    try {
      // VPCエンドポイント用セキュリティグループの作成
      // 要件5.3: Interfaceエンドポイントを作成する THEN 適切なセキュリティグループが関連付けられる SHALL
      console.log('VPCエンドポイント用セキュリティグループを作成中...');
      this.vpcEndpointSecurityGroup = new ec2.SecurityGroup(this, 'VpcEndpointSecurityGroup', {
        vpc: this.vpc,
        securityGroupName: `${config.stackPrefix}-vpc-endpoint-sg`,
        description: 'Security group for VPC Interface endpoints - allows HTTPS access from Lambda',
        allowAllOutbound: false, // 最小権限の原則
      });

      // Lambda関数からVPCエンドポイントへのHTTPS接続を許可
      this.vpcEndpointSecurityGroup.addIngressRule(
        this.lambdaSecurityGroup,
        ec2.Port.tcp(443),
        'Allow Lambda access to VPC endpoints via HTTPS'
      );

      console.log(
        `VPCエンドポイント用セキュリティグループを作成しました: ${this.vpcEndpointSecurityGroup.securityGroupId}`
      );

      // S3とDynamoDB用Gatewayエンドポイントの作成
      // 要件5.1: S3とDynamoDB用のGatewayエンドポイントが作成される SHALL
      // 要件5.4: VPCエンドポイントを作成する THEN プライベートサブネットに配置される SHALL
      console.log('Gateway型VPCエンドポイントを作成中...');

      this.s3Endpoint = this.vpc.addGatewayEndpoint('S3Endpoint', {
        service: ec2.GatewayVpcEndpointAwsService.S3,
        subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      });

      this.dynamoDbEndpoint = this.vpc.addGatewayEndpoint('DynamoDbEndpoint', {
        service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
        subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      });

      console.log('Gateway型VPCエンドポイントを作成しました:');
      console.log(`- S3エンドポイント: ${this.s3Endpoint.vpcEndpointId}`);
      console.log(`- DynamoDBエンドポイント: ${this.dynamoDbEndpoint.vpcEndpointId}`);

      // Secrets Manager、CloudWatch Logs、Bedrock用Interfaceエンドポイントの作成
      // 要件5.2: Secrets Manager、CloudWatch Logs、Bedrock用のInterfaceエンドポイントが作成される SHALL
      // 要件5.3: Interfaceエンドポイントを作成する THEN 適切なセキュリティグループが関連付けられる SHALL
      console.log('Interface型VPCエンドポイントを作成中...');

      this.secretsManagerEndpoint = this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [this.vpcEndpointSecurityGroup],
        privateDnsEnabled: true, // プライベートDNS名を有効化
      });

      this.cloudWatchLogsEndpoint = this.vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [this.vpcEndpointSecurityGroup],
        privateDnsEnabled: true, // プライベートDNS名を有効化
      });

      this.bedrockEndpoint = this.vpc.addInterfaceEndpoint('BedrockEndpoint', {
        service: ec2.InterfaceVpcEndpointAwsService.BEDROCK,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [this.vpcEndpointSecurityGroup],
        privateDnsEnabled: true, // プライベートDNS名を有効化
      });

      console.log('Interface型VPCエンドポイントを作成しました:');
      console.log(`- Secrets Managerエンドポイント: ${this.secretsManagerEndpoint.vpcEndpointId}`);
      console.log(`- CloudWatch Logsエンドポイント: ${this.cloudWatchLogsEndpoint.vpcEndpointId}`);
      console.log(`- Bedrockエンドポイント: ${this.bedrockEndpoint.vpcEndpointId}`);

      // VPCエンドポイント作成完了ログ
      console.log('VPCエンドポイントの作成が完了しました:');
      console.log(`- 環境: ${environment}`);
      console.log('- Gateway型エンドポイント: S3, DynamoDB');
      console.log('- Interface型エンドポイント: Secrets Manager, CloudWatch Logs, Bedrock');
      console.log(
        `- VPCエンドポイント用セキュリティグループ: ${this.vpcEndpointSecurityGroup.securityGroupId}`
      );
      console.log('- 配置場所: プライベートサブネット');
      console.log('- セキュリティ: Lambda SGからのHTTPS(443)アクセスのみ許可');
      console.log('- プライベートDNS: 有効（Interface型エンドポイント）');
      console.log('AWSサービスへの通信がプライベートネットワーク内で完結するようになりました。');
    } catch (error) {
      console.error('VPCエンドポイントの作成中にエラーが発生しました:', error);
      throw new Error(`VPCエンドポイントの作成に失敗しました: ${error}`);
    }
  }

  /**
   * タグ管理の実装
   * 要件7.1-7.4に基づいて一貫したタグ命名規則を適用
   */
  private applyTags(config: EnvironmentConfig): void {
    console.log('VPCリソースへのタグ適用を開始します...');

    // 要件7.1: 環境名、プロジェクト名の自動タグ付与
    // 要件7.4: 一貫したタグ命名規則の実装
    const commonTags = this.buildCommonTags(config);

    // 要件7.2: セキュリティグループ用途別Nameタグの設定
    const resourceNameTags = this.buildResourceNameTags(config);

    // 要件7.3: 設定ファイルベースのカスタムタグ適用
    const customTags = config.tags || {};

    // 全てのVPCリソースに共通タグを適用
    this.applyTagsToAllResources(commonTags, resourceNameTags, customTags);

    console.log('VPCリソースへのタグ適用が完了しました:');
    console.log(`- 共通タグ数: ${Object.keys(commonTags).length}`);
    console.log(`- リソース固有タグ数: ${Object.keys(resourceNameTags).length}`);
    console.log(`- カスタムタグ数: ${Object.keys(customTags).length}`);
    console.log('一貫したタグ命名規則が適用されました。');
  }

  /**
   * 共通タグの構築
   * 要件7.1: 環境名、プロジェクト名の自動タグ付与
   * 要件7.4: 一貫したタグ命名規則の実装
   */
  private buildCommonTags(config: EnvironmentConfig): Record<string, string> {
    // 環境名を設定から抽出（stackPrefixから推定）
    const environment = this.extractEnvironmentFromStackPrefix(config.stackPrefix);

    // プロジェクト名を設定から抽出
    const projectName = this.extractProjectNameFromStackPrefix(config.stackPrefix);

    return {
      // 要件7.1: 環境名、プロジェクト名のタグが自動付与される
      Project: projectName,
      Environment: environment,

      // 要件7.4: 一貫したタグ命名規則
      StackPrefix: config.stackPrefix,
      ManagedBy: 'aws-cdk',
      Component: 'vpc-network',

      // 追加の管理用タグ
      CreatedBy: 'VpcStack',
      Region: config.region,
    };
  }

  /**
   * リソース固有のNameタグの構築
   * 要件7.2: セキュリティグループ用途別Nameタグの設定
   * 要件7.4: 一貫したタグ命名規則の実装
   */
  private buildResourceNameTags(config: EnvironmentConfig): Record<string, string> {
    return {
      // VPCリソース
      vpc: `${config.stackPrefix}-vpc`,

      // セキュリティグループ（用途別）
      'security-group-database': `${config.stackPrefix}-db-sg`,
      'security-group-lambda': `${config.stackPrefix}-lambda-sg`,
      'security-group-alb': `${config.stackPrefix}-alb-sg`,
      'security-group-vpc-endpoint': `${config.stackPrefix}-vpc-endpoint-sg`,

      // VPCエンドポイント
      'vpc-endpoint-s3': `${config.stackPrefix}-s3-endpoint`,
      'vpc-endpoint-dynamodb': `${config.stackPrefix}-dynamodb-endpoint`,
      'vpc-endpoint-secretsmanager': `${config.stackPrefix}-secretsmanager-endpoint`,
      'vpc-endpoint-cloudwatchlogs': `${config.stackPrefix}-cloudwatchlogs-endpoint`,
      'vpc-endpoint-bedrock': `${config.stackPrefix}-bedrock-endpoint`,

      // VPCフローログ関連
      'vpc-flowlog-group': `${config.stackPrefix}-vpc-flowlog-group`,
      'vpc-flowlog-role': `${config.stackPrefix}-vpc-flowlog-role`,
      'vpc-flowlog': `${config.stackPrefix}-vpc-flowlog`,
    };
  }

  /**
   * 全てのVPCリソースにタグを適用
   * 要件7.3: 設定ファイルベースのカスタムタグ適用
   */
  private applyTagsToAllResources(
    commonTags: Record<string, string>,
    resourceNameTags: Record<string, string>,
    customTags: Record<string, string>
  ): void {
    // VPCにタグを適用
    this.applyTagsToResource(this.vpc, commonTags, customTags, {
      Name: resourceNameTags.vpc,
      ResourceType: 'VPC',
      Purpose: 'Main VPC for application infrastructure',
    });

    // セキュリティグループにタグを適用
    this.applyTagsToResource(this.databaseSecurityGroup, commonTags, customTags, {
      Name: resourceNameTags['security-group-database'],
      ResourceType: 'SecurityGroup',
      Purpose: 'Database access control - PostgreSQL from Lambda only',
      SecurityLevel: 'High',
    });

    this.applyTagsToResource(this.lambdaSecurityGroup, commonTags, customTags, {
      Name: resourceNameTags['security-group-lambda'],
      ResourceType: 'SecurityGroup',
      Purpose: 'Lambda function network access - outbound to APIs and database',
      SecurityLevel: 'Medium',
    });

    this.applyTagsToResource(this.albSecurityGroup, commonTags, customTags, {
      Name: resourceNameTags['security-group-alb'],
      ResourceType: 'SecurityGroup',
      Purpose: 'Application Load Balancer - HTTP/HTTPS from internet',
      SecurityLevel: 'Medium',
    });

    // VPCエンドポイント用セキュリティグループ（存在する場合のみ）
    if (this.vpcEndpointSecurityGroup) {
      this.applyTagsToResource(this.vpcEndpointSecurityGroup, commonTags, customTags, {
        Name: resourceNameTags['security-group-vpc-endpoint'],
        ResourceType: 'SecurityGroup',
        Purpose: 'VPC Interface endpoints - HTTPS access from Lambda',
        SecurityLevel: 'High',
      });
    }

    // VPCエンドポイントにタグを適用（存在する場合のみ）
    if (this.s3Endpoint) {
      this.applyTagsToResource(this.s3Endpoint, commonTags, customTags, {
        Name: resourceNameTags['vpc-endpoint-s3'],
        ResourceType: 'VpcEndpoint',
        EndpointType: 'Gateway',
        Service: 'S3',
        Purpose: 'Private S3 access without internet gateway',
      });
    }

    if (this.dynamoDbEndpoint) {
      this.applyTagsToResource(this.dynamoDbEndpoint, commonTags, customTags, {
        Name: resourceNameTags['vpc-endpoint-dynamodb'],
        ResourceType: 'VpcEndpoint',
        EndpointType: 'Gateway',
        Service: 'DynamoDB',
        Purpose: 'Private DynamoDB access without internet gateway',
      });
    }

    if (this.secretsManagerEndpoint) {
      this.applyTagsToResource(this.secretsManagerEndpoint, commonTags, customTags, {
        Name: resourceNameTags['vpc-endpoint-secretsmanager'],
        ResourceType: 'VpcEndpoint',
        EndpointType: 'Interface',
        Service: 'SecretsManager',
        Purpose: 'Private Secrets Manager access for database credentials',
      });
    }

    if (this.cloudWatchLogsEndpoint) {
      this.applyTagsToResource(this.cloudWatchLogsEndpoint, commonTags, customTags, {
        Name: resourceNameTags['vpc-endpoint-cloudwatchlogs'],
        ResourceType: 'VpcEndpoint',
        EndpointType: 'Interface',
        Service: 'CloudWatchLogs',
        Purpose: 'Private CloudWatch Logs access for application logging',
      });
    }

    if (this.bedrockEndpoint) {
      this.applyTagsToResource(this.bedrockEndpoint, commonTags, customTags, {
        Name: resourceNameTags['vpc-endpoint-bedrock'],
        ResourceType: 'VpcEndpoint',
        EndpointType: 'Interface',
        Service: 'Bedrock',
        Purpose: 'Private Bedrock access for AI functionality',
      });
    }

    // VPCフローログリソースにタグを適用（存在する場合のみ）
    if (this.vpcFlowLogGroup) {
      this.applyTagsToResource(this.vpcFlowLogGroup, commonTags, customTags, {
        Name: resourceNameTags['vpc-flowlog-group'],
        ResourceType: 'LogGroup',
        Purpose: 'VPC Flow Logs storage in CloudWatch',
        LogRetention: '1 month',
      });
    }

    if (this.vpcFlowLogRole) {
      this.applyTagsToResource(this.vpcFlowLogRole, commonTags, customTags, {
        Name: resourceNameTags['vpc-flowlog-role'],
        ResourceType: 'IAMRole',
        Purpose: 'VPC Flow Logs service role for CloudWatch access',
        ServicePrincipal: 'vpc-flow-logs.amazonaws.com',
      });
    }

    if (this.vpcFlowLog) {
      this.applyTagsToResource(this.vpcFlowLog, commonTags, customTags, {
        Name: resourceNameTags['vpc-flowlog'],
        ResourceType: 'FlowLog',
        Purpose: 'VPC network traffic monitoring and security analysis',
        TrafficType: 'ALL',
      });
    }
  }

  /**
   * 個別リソースにタグを適用するヘルパーメソッド
   */
  private applyTagsToResource(
    resource: Construct,
    commonTags: Record<string, string>,
    customTags: Record<string, string>,
    resourceSpecificTags: Record<string, string>
  ): void {
    // 共通タグを適用
    Object.entries(commonTags).forEach(([key, value]) => {
      cdk.Tags.of(resource).add(key, value);
    });

    // カスタムタグを適用（設定ファイルベース）
    Object.entries(customTags).forEach(([key, value]) => {
      cdk.Tags.of(resource).add(key, value);
    });

    // リソース固有タグを適用
    Object.entries(resourceSpecificTags).forEach(([key, value]) => {
      cdk.Tags.of(resource).add(key, value);
    });
  }

  /**
   * スタックプレフィックスから環境名を抽出
   * 要件7.4: 一貫したタグ命名規則の実装
   */
  private extractEnvironmentFromStackPrefix(stackPrefix: string): string {
    // スタックプレフィックスの最後の部分を環境名として抽出
    // 例: "goal-mandala-dev" -> "dev", "goal-mandala-prod" -> "prod"
    const parts = stackPrefix.split('-');
    const lastPart = parts[parts.length - 1];

    // 既知の環境名にマッピング
    const environmentMapping: Record<string, string> = {
      dev: 'development',
      stg: 'staging',
      prod: 'production',
      local: 'local',
    };

    return environmentMapping[lastPart] || lastPart;
  }

  /**
   * スタックプレフィックスからプロジェクト名を抽出
   * 要件7.4: 一貫したタグ命名規則の実装
   */
  private extractProjectNameFromStackPrefix(stackPrefix: string): string {
    // スタックプレフィックスから環境名を除いた部分をプロジェクト名として抽出
    // 例: "goal-mandala-dev" -> "goal-mandala"
    const parts = stackPrefix.split('-');

    // 最後の部分が環境名の場合は除外
    const lastPart = parts[parts.length - 1];
    const knownEnvironments = ['dev', 'stg', 'prod', 'local'];

    if (knownEnvironments.includes(lastPart)) {
      return parts.slice(0, -1).join('-');
    }

    return stackPrefix;
  }

  private createOutputs(config: EnvironmentConfig): void {
    // VPC関連の出力
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

    // サブネット関連の出力
    new cdk.CfnOutput(this, 'PublicSubnetIds', {
      value: this.vpc.publicSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Public subnet IDs',
      exportName: `${config.stackPrefix}-public-subnet-ids`,
    });

    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: this.vpc.privateSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Private subnet IDs',
      exportName: `${config.stackPrefix}-private-subnet-ids`,
    });

    new cdk.CfnOutput(this, 'IsolatedSubnetIds', {
      value: this.vpc.isolatedSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Isolated subnet IDs (Database)',
      exportName: `${config.stackPrefix}-isolated-subnet-ids`,
    });

    // セキュリティグループ関連の出力
    new cdk.CfnOutput(this, 'DatabaseSecurityGroupId', {
      value: this.databaseSecurityGroup.securityGroupId,
      description: 'Database security group ID',
      exportName: `${config.stackPrefix}-db-sg-id`,
    });

    new cdk.CfnOutput(this, 'LambdaSecurityGroupId', {
      value: this.lambdaSecurityGroup.securityGroupId,
      description: 'Lambda security group ID',
      exportName: `${config.stackPrefix}-lambda-sg-id`,
    });

    new cdk.CfnOutput(this, 'AlbSecurityGroupId', {
      value: this.albSecurityGroup.securityGroupId,
      description: 'ALB security group ID',
      exportName: `${config.stackPrefix}-alb-sg-id`,
    });

    // VPCエンドポイント用セキュリティグループの出力（存在する場合のみ）
    if (this.vpcEndpointSecurityGroup) {
      new cdk.CfnOutput(this, 'VpcEndpointSecurityGroupId', {
        value: this.vpcEndpointSecurityGroup.securityGroupId,
        description: 'VPC Endpoint security group ID',
        exportName: `${config.stackPrefix}-vpc-endpoint-sg-id`,
      });
    }

    // アベイラビリティゾーン情報
    new cdk.CfnOutput(this, 'AvailabilityZones', {
      value: this.vpc.availabilityZones.join(','),
      description: 'Availability zones used by VPC',
      exportName: `${config.stackPrefix}-azs`,
    });

    // ネットワーク設定の確認情報を出力
    new cdk.CfnOutput(this, 'InternetGatewayStatus', {
      value: 'Created by CDK Vpc construct',
      description: 'Internet Gateway creation status',
      exportName: `${config.stackPrefix}-igw-status`,
    });

    new cdk.CfnOutput(this, 'RoutingConfiguration', {
      value: `Public: IGW, Private: NAT Gateway (${config.network.natGateways})`,
      description: 'Routing configuration summary',
      exportName: `${config.stackPrefix}-routing-config`,
    });

    new cdk.CfnOutput(this, 'NatGatewayCount', {
      value: config.network.natGateways.toString(),
      description: 'Number of NAT Gateways deployed',
      exportName: `${config.stackPrefix}-nat-gateway-count`,
    });

    new cdk.CfnOutput(this, 'VpcEndpointsEnabled', {
      value: config.network.enableVpcEndpoints.toString(),
      description: 'Whether VPC endpoints are enabled',
      exportName: `${config.stackPrefix}-vpc-endpoints-enabled`,
    });

    // VPCエンドポイント関連の出力（存在する場合のみ）
    if (config.network.enableVpcEndpoints) {
      if (this.s3Endpoint) {
        new cdk.CfnOutput(this, 'S3EndpointId', {
          value: this.s3Endpoint.vpcEndpointId,
          description: 'S3 VPC Endpoint ID (Gateway type)',
          exportName: `${config.stackPrefix}-s3-endpoint-id`,
        });
      }

      if (this.dynamoDbEndpoint) {
        new cdk.CfnOutput(this, 'DynamoDbEndpointId', {
          value: this.dynamoDbEndpoint.vpcEndpointId,
          description: 'DynamoDB VPC Endpoint ID (Gateway type)',
          exportName: `${config.stackPrefix}-dynamodb-endpoint-id`,
        });
      }

      if (this.secretsManagerEndpoint) {
        new cdk.CfnOutput(this, 'SecretsManagerEndpointId', {
          value: this.secretsManagerEndpoint.vpcEndpointId,
          description: 'Secrets Manager VPC Endpoint ID (Interface type)',
          exportName: `${config.stackPrefix}-secretsmanager-endpoint-id`,
        });
      }

      if (this.cloudWatchLogsEndpoint) {
        new cdk.CfnOutput(this, 'CloudWatchLogsEndpointId', {
          value: this.cloudWatchLogsEndpoint.vpcEndpointId,
          description: 'CloudWatch Logs VPC Endpoint ID (Interface type)',
          exportName: `${config.stackPrefix}-cloudwatchlogs-endpoint-id`,
        });
      }

      if (this.bedrockEndpoint) {
        new cdk.CfnOutput(this, 'BedrockEndpointId', {
          value: this.bedrockEndpoint.vpcEndpointId,
          description: 'Bedrock VPC Endpoint ID (Interface type)',
          exportName: `${config.stackPrefix}-bedrock-endpoint-id`,
        });
      }
    }

    // VPCフローログ関連の出力
    new cdk.CfnOutput(this, 'VpcFlowLogGroupName', {
      value: `/aws/vpc/flowlogs/${config.stackPrefix}`,
      description: 'VPC Flow Log CloudWatch Log Group name',
      exportName: `${config.stackPrefix}-vpc-flowlog-group`,
    });

    new cdk.CfnOutput(this, 'VpcFlowLogRoleName', {
      value: `${config.stackPrefix}-vpc-flowlog-role`,
      description: 'VPC Flow Log IAM Role name',
      exportName: `${config.stackPrefix}-vpc-flowlog-role`,
    });

    new cdk.CfnOutput(this, 'VpcFlowLogStatus', {
      value: 'Enabled - All traffic (ACCEPT/REJECT) logged to CloudWatch',
      description: 'VPC Flow Log configuration status',
      exportName: `${config.stackPrefix}-vpc-flowlog-status`,
    });
  }
}
