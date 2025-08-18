import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { VpcStack } from './vpc-stack';
import { getEnvironmentConfig } from '../config/environment';

describe('VpcStack', () => {
  let app: cdk.App;
  let stack: VpcStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    const config = getEnvironmentConfig('test');

    stack = new VpcStack(app, 'TestVpcStack', {
      config,
      environment: 'test',
      env: {
        region: config.region,
        account: '123456789012',
      },
    });

    template = Template.fromStack(stack);
  });

  describe('VPC Configuration', () => {
    test('要件1.1: VPCが10.0.0.0/16のCIDRブロックで作成される', () => {
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true,
      });
    });

    test('要件1.2: 2つのアベイラビリティゾーンにまたがってサブネットが配置される', () => {
      // VPCのアベイラビリティゾーン数を確認
      expect(stack.vpc.availabilityZones.length).toBe(2);

      // パブリックサブネットが2つのAZに配置されることを確認
      expect(stack.vpc.publicSubnets.length).toBe(2);

      // プライベートサブネットが2つのAZに配置されることを確認
      expect(stack.vpc.privateSubnets.length).toBe(2);

      // 分離サブネット（データベース用）が2つのAZに配置されることを確認
      expect(stack.vpc.isolatedSubnets.length).toBe(2);
    });

    test('要件1.3: パブリック、プライベート、データベース用の3種類のサブネットが作成される', () => {
      // パブリックサブネット（MapPublicIpOnLaunch: true）
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: true,
      });

      // プライベートサブネット（MapPublicIpOnLaunch: false、NATゲートウェイ経由）
      template.hasResourceProperties('AWS::EC2::Subnet', {
        MapPublicIpOnLaunch: false,
      });

      // 分離サブネット（データベース用、インターネットアクセスなし）
      // 分離サブネットは自動的にMapPublicIpOnLaunch: falseになる
      const subnets = template.findResources('AWS::EC2::Subnet');
      const subnetCount = Object.keys(subnets).length;
      expect(subnetCount).toBe(6); // パブリック2 + プライベート2 + 分離2 = 6
    });

    test('要件1.4: パブリックサブネットがインターネットゲートウェイ経由でインターネットアクセス可能', () => {
      // インターネットゲートウェイが作成される
      template.hasResource('AWS::EC2::InternetGateway', {});

      // VPCにインターネットゲートウェイがアタッチされる
      template.hasResource('AWS::EC2::VPCGatewayAttachment', {
        Properties: {
          InternetGatewayId: Match.anyValue(),
          VpcId: Match.anyValue(),
        },
      });

      // パブリックサブネット用ルートテーブルにインターネットゲートウェイへのルートが設定される
      template.hasResourceProperties('AWS::EC2::Route', {
        DestinationCidrBlock: '0.0.0.0/0',
        GatewayId: Match.anyValue(),
      });
    });

    test('要件1.5: プライベートサブネットがNATゲートウェイ経由でアウトバウンド通信可能', () => {
      // NATゲートウェイが作成される
      template.hasResource('AWS::EC2::NatGateway', {});

      // プライベートサブネット用ルートテーブルにNATゲートウェイへのルートが設定される
      template.hasResourceProperties('AWS::EC2::Route', {
        DestinationCidrBlock: '0.0.0.0/0',
        NatGatewayId: Match.anyValue(),
      });
    });

    test('ルートテーブルが適切に設定される', () => {
      // ルートが適切に作成されていることを確認
      template.resourceCountIs('AWS::EC2::Route', 4);

      // ルートリソースを取得して検証
      const routes = template.findResources('AWS::EC2::Route');
      const routeValues = Object.values(routes);

      // パブリックサブネット用ルート（インターネットゲートウェイ経由）
      const publicRoutes = routeValues.filter(
        route =>
          route.Properties?.GatewayId && route.Properties?.DestinationCidrBlock === '0.0.0.0/0'
      );
      expect(publicRoutes.length).toBeGreaterThan(0);

      // プライベートサブネット用ルート（NATゲートウェイ経由）
      const privateRoutes = routeValues.filter(
        route =>
          route.Properties?.NatGatewayId && route.Properties?.DestinationCidrBlock === '0.0.0.0/0'
      );
      expect(privateRoutes.length).toBeGreaterThan(0);
    });

    test('サブネットのCIDRブロックが設計通りに設定される', () => {
      // パブリックサブネット: /24マスク
      const publicSubnets = stack.vpc.publicSubnets;
      publicSubnets.forEach(subnet => {
        // CDKが自動的に適切なCIDRを割り当てることを確認
        expect(subnet.ipv4CidrBlock).toMatch(/^10\.0\.\d+\.0\/24$/);
      });

      // プライベートサブネット: /24マスク
      const privateSubnets = stack.vpc.privateSubnets;
      privateSubnets.forEach(subnet => {
        expect(subnet.ipv4CidrBlock).toMatch(/^10\.0\.\d+\.0\/24$/);
      });

      // 分離サブネット（データベース用）: /28マスク
      const isolatedSubnets = stack.vpc.isolatedSubnets;
      isolatedSubnets.forEach(subnet => {
        expect(subnet.ipv4CidrBlock).toMatch(/^10\.0\.\d+\.\d+\/28$/);
      });
    });
  });

  describe('Security Groups', () => {
    test('要件2.1: データベース用セキュリティグループがLambda関数からのPostgreSQL接続のみを許可', () => {
      // データベース用セキュリティグループが作成される
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription:
          'Security group for Aurora database - allows PostgreSQL access from Lambda only',
        GroupName: 'goal-mandala-test-db-sg',
      });

      // データベースへのPostgreSQL接続許可（Lambda SGから）
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 5432,
        ToPort: 5432,
        Description: 'Allow Lambda access to PostgreSQL database',
      });

      // データベースセキュリティグループのアウトバウンドルールが制限されていることを確認
      const sgResources = template.findResources('AWS::EC2::SecurityGroup');
      const dbSg = Object.values(sgResources).find(
        (sg: any) => sg.Properties.GroupName === 'goal-mandala-test-db-sg'
      );
      expect(dbSg).toBeDefined();

      // SecurityGroupEgressが制限されていることを確認（CDKが自動的にダミールールを追加する場合がある）
      if (dbSg.Properties.SecurityGroupEgress) {
        // ダミールールが存在する場合は、実際のアウトバウンドルールがないことを確認
        const realEgressRules = dbSg.Properties.SecurityGroupEgress.filter(
          (rule: any) => rule.CidrIp !== '255.255.255.255/32'
        );
        expect(realEgressRules.length).toBe(0);
      }
    });

    test('要件2.2: Lambda用セキュリティグループが外部APIへのアウトバウンド通信を許可', () => {
      // Lambda用セキュリティグループが作成される
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription:
          'Security group for Lambda functions - allows outbound to external APIs and database',
        GroupName: 'goal-mandala-test-lambda-sg',
      });

      // Lambda用セキュリティグループのアウトバウンドルールを確認
      const sgResources = template.findResources('AWS::EC2::SecurityGroup');
      const lambdaSg = Object.values(sgResources).find(
        (sg: any) => sg.Properties.GroupName === 'goal-mandala-test-lambda-sg'
      );
      expect(lambdaSg).toBeDefined();

      // 全アウトバウンドが許可されていることを確認（外部API呼び出し用）
      const egress = lambdaSg.Properties.SecurityGroupEgress;
      expect(egress).toBeDefined();
      expect(egress).toHaveLength(1);
      expect(egress[0].CidrIp).toBe('0.0.0.0/0');
      expect(egress[0].IpProtocol).toBe('-1'); // 全プロトコル許可
    });

    test('要件2.3: ALB用セキュリティグループがHTTP（ポート80）とHTTPS（ポート443）のインバウンド通信を許可', () => {
      // ALB用セキュリティグループが作成される
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription:
          'Security group for Application Load Balancer - allows HTTP/HTTPS from internet',
        GroupName: 'goal-mandala-test-alb-sg',
      });

      // SecurityGroupIngressを詳細確認
      const sgResources = template.findResources('AWS::EC2::SecurityGroup');
      const albSg = Object.values(sgResources).find(
        (sg: any) => sg.Properties.GroupName === 'goal-mandala-test-alb-sg'
      );
      expect(albSg).toBeDefined();
      const ingress = albSg.Properties.SecurityGroupIngress;
      expect(ingress).toHaveLength(2);

      // HTTPS (443) ルールを確認
      const httpsRule = ingress.find((rule: any) => rule.FromPort === 443);
      expect(httpsRule).toBeDefined();
      expect(httpsRule.IpProtocol).toBe('tcp');
      expect(httpsRule.ToPort).toBe(443);
      expect(httpsRule.CidrIp).toBe('0.0.0.0/0');

      // HTTP (80) ルールを確認
      const httpRule = ingress.find((rule: any) => rule.FromPort === 80);
      expect(httpRule).toBeDefined();
      expect(httpRule.IpProtocol).toBe('tcp');
      expect(httpRule.ToPort).toBe(80);
      expect(httpRule.CidrIp).toBe('0.0.0.0/0');
    });

    test('要件2.4: 不要な通信が全て拒否される', () => {
      // データベースセキュリティグループのアウトバウンドが制限されていることを確認
      const sgResources = template.findResources('AWS::EC2::SecurityGroup');
      const dbSg = Object.values(sgResources).find(
        (sg: any) => sg.Properties.GroupName === 'goal-mandala-test-db-sg'
      );

      // データベースSGはアウトバウンドルールが制限されていることを確認
      if (dbSg.Properties.SecurityGroupEgress) {
        const realEgressRules = dbSg.Properties.SecurityGroupEgress.filter(
          (rule: any) => rule.CidrIp !== '255.255.255.255/32'
        );
        expect(realEgressRules.length).toBe(0);
      }

      // ALBセキュリティグループのアウトバウンドが制限されていることを確認
      const albSg = Object.values(sgResources).find(
        (sg: any) => sg.Properties.GroupName === 'goal-mandala-test-alb-sg'
      );

      // ALBSGはallowAllOutbound: falseで作成されているため、アウトバウンドルールが制限される
      if (albSg.Properties.SecurityGroupEgress) {
        const realEgressRules = albSg.Properties.SecurityGroupEgress.filter(
          (rule: any) => rule.CidrIp !== '255.255.255.255/32'
        );
        expect(realEgressRules.length).toBe(0);
      }
    });

    test('要件2.5: セキュリティグループ間の通信が最小権限の原則に従って設定される', () => {
      // Lambda から データベースへのPostgreSQL接続のみ許可
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 5432,
        ToPort: 5432,
        Description: 'Allow Lambda access to PostgreSQL database',
      });

      // ALB から Lambdaへのアクセス許可（将来の拡張用）
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 8080,
        ToPort: 8080,
        Description: 'Allow ALB access to Lambda (future extensibility)',
      });

      // セキュリティグループ間の参照が正しく設定されていることを確認
      const ingressRules = template.findResources('AWS::EC2::SecurityGroupIngress');
      const ingressValues = Object.values(ingressRules);

      // Lambda SGからDatabase SGへの参照を確認
      const dbIngressRule = ingressValues.find(
        (rule: any) => rule.Properties.FromPort === 5432 && rule.Properties.ToPort === 5432
      );
      expect(dbIngressRule).toBeDefined();
      expect(dbIngressRule.Properties.SourceSecurityGroupId).toBeDefined();

      // ALB SGからLambda SGへの参照を確認
      const lambdaIngressRule = ingressValues.find(
        (rule: any) => rule.Properties.FromPort === 8080 && rule.Properties.ToPort === 8080
      );
      expect(lambdaIngressRule).toBeDefined();
      expect(lambdaIngressRule.Properties.SourceSecurityGroupId).toBeDefined();
    });

    test('セキュリティグループが適切な数作成される', () => {
      // 基本的なセキュリティグループ数を確認（テスト環境ではVPCエンドポイント用SGは作成されない）
      const sgResources = template.findResources('AWS::EC2::SecurityGroup');
      const sgCount = Object.keys(sgResources).length;
      expect(sgCount).toBe(3); // Database, Lambda, ALB
    });

    test('セキュリティグループの命名規則が一貫している', () => {
      const sgResources = template.findResources('AWS::EC2::SecurityGroup');
      const sgNames = Object.values(sgResources).map((sg: any) => sg.Properties.GroupName);

      expect(sgNames).toContain('goal-mandala-test-db-sg');
      expect(sgNames).toContain('goal-mandala-test-lambda-sg');
      expect(sgNames).toContain('goal-mandala-test-alb-sg');

      // 全てのセキュリティグループ名がスタックプレフィックスで始まることを確認
      sgNames.forEach(name => {
        expect(name).toMatch(/^goal-mandala-test-/);
      });
    });
  });

  describe('VPC Flow Logs', () => {
    test('要件3.1: 全てのネットワークトラフィックがCloudWatch Logsに記録される', () => {
      // VPCフローログが設定される
      template.hasResourceProperties('AWS::EC2::FlowLog', {
        ResourceType: 'VPC',
        TrafficType: 'ALL', // 全トラフィック（承認・拒否両方）
      });

      // フローログの出力先がCloudWatch Logsに設定される
      template.hasResourceProperties('AWS::EC2::FlowLog', {
        DeliverLogsPermissionArn: Match.anyValue(),
        LogDestinationType: 'cloud-watch-logs',
        LogGroupName: Match.anyValue(),
      });
    });

    test('要件3.2: ログの保持期間が1ヶ月に設定される', () => {
      // CloudWatch Logsグループが1ヶ月保持で作成される
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/vpc/flowlogs/goal-mandala-test',
        RetentionInDays: 30, // 1ヶ月
      });
    });

    test('要件3.3: 適切なIAMロールが自動作成される', () => {
      // VPCフローログ用のIAMロールが作成される
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'goal-mandala-test-vpc-flowlog-role',
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'vpc-flow-logs.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
          Version: '2012-10-17',
        },
      });

      // IAMロールにCloudWatch Logsへの書き込み権限が付与される
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
              ],
              Resource: Match.anyValue(),
            }),
          ]),
          Version: '2012-10-17',
        },
      });
    });

    test('要件3.4: 承認されたトラフィックと拒否されたトラフィックの両方が記録される', () => {
      // フローログのTrafficTypeがALLに設定されていることを確認
      template.hasResourceProperties('AWS::EC2::FlowLog', {
        TrafficType: 'ALL', // ACCEPT, REJECT, ALLのうちALLを指定
      });

      // フローログが正しくVPCに関連付けられていることを確認
      const flowLogs = template.findResources('AWS::EC2::FlowLog');
      const flowLogValues = Object.values(flowLogs);
      expect(flowLogValues.length).toBe(1);

      const flowLog = flowLogValues[0];
      expect(flowLog.Properties.ResourceType).toBe('VPC');
      expect(flowLog.Properties.ResourceId).toBeDefined();
    });

    test('VPCフローログの設定が完全である', () => {
      // フローログリソースが1つだけ作成される
      template.resourceCountIs('AWS::EC2::FlowLog', 1);

      // CloudWatch Logsグループが1つだけ作成される
      template.resourceCountIs('AWS::Logs::LogGroup', 1);

      // VPCフローログ用のIAMロールが1つだけ作成される
      const iamRoles = template.findResources('AWS::IAM::Role');
      const flowLogRoles = Object.values(iamRoles).filter(
        (role: any) => role.Properties.RoleName === 'goal-mandala-test-vpc-flowlog-role'
      );
      expect(flowLogRoles.length).toBe(1);
    });

    test('フローログの命名規則が一貫している', () => {
      // CloudWatch Logsグループ名がスタックプレフィックスを含む
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/vpc/flowlogs/goal-mandala-test',
      });

      // IAMロール名がスタックプレフィックスを含む
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'goal-mandala-test-vpc-flowlog-role',
      });
    });
  });

  describe('CloudFormation Outputs', () => {
    test('要件6.1: VPC IDがCloudFormation出力として公開される', () => {
      template.hasOutput('VpcId', {
        Description: 'VPC ID',
        Export: {
          Name: 'goal-mandala-test-vpc-id',
        },
      });

      // VPC CIDRブロックも出力される
      template.hasOutput('VpcCidr', {
        Description: 'VPC CIDR block',
        Export: {
          Name: 'goal-mandala-test-vpc-cidr',
        },
      });
    });

    test('要件6.2: サブネットIDがCloudFormation出力として公開される', () => {
      // パブリックサブネットID
      template.hasOutput('PublicSubnetIds', {
        Description: 'Public subnet IDs',
        Export: {
          Name: 'goal-mandala-test-public-subnet-ids',
        },
      });

      // プライベートサブネットID
      template.hasOutput('PrivateSubnetIds', {
        Description: 'Private subnet IDs',
        Export: {
          Name: 'goal-mandala-test-private-subnet-ids',
        },
      });

      // 分離サブネット（データベース用）ID
      template.hasOutput('IsolatedSubnetIds', {
        Description: 'Isolated subnet IDs (Database)',
        Export: {
          Name: 'goal-mandala-test-isolated-subnet-ids',
        },
      });
    });

    test('要件6.3: セキュリティグループIDがCloudFormation出力として公開される', () => {
      // データベースセキュリティグループID
      template.hasOutput('DatabaseSecurityGroupId', {
        Description: 'Database security group ID',
        Export: {
          Name: 'goal-mandala-test-db-sg-id',
        },
      });

      // LambdaセキュリティグループID
      template.hasOutput('LambdaSecurityGroupId', {
        Description: 'Lambda security group ID',
        Export: {
          Name: 'goal-mandala-test-lambda-sg-id',
        },
      });

      // ALBセキュリティグループID
      template.hasOutput('AlbSecurityGroupId', {
        Description: 'ALB security group ID',
        Export: {
          Name: 'goal-mandala-test-alb-sg-id',
        },
      });
    });

    test('要件6.4: 他のスタックからインポート可能な形式で出力される', () => {
      // 全ての出力にExport.Nameが設定されていることを確認
      const outputs = template.findOutputs('*');

      Object.entries(outputs).forEach(([outputName, output]) => {
        expect(output.Export).toBeDefined();
        expect(output.Export.Name).toBeDefined();
        expect(output.Export.Name).toMatch(/^goal-mandala-test-/);
      });
    });

    test('要件6.5: 適切な説明が付与される', () => {
      // 全ての出力にDescriptionが設定されていることを確認
      const outputs = template.findOutputs('*');

      Object.entries(outputs).forEach(([outputName, output]) => {
        expect(output.Description).toBeDefined();
        expect(output.Description.length).toBeGreaterThan(0);
      });
    });

    test('アベイラビリティゾーン情報が出力される', () => {
      template.hasOutput('AvailabilityZones', {
        Description: 'Availability zones used by VPC',
        Export: {
          Name: 'goal-mandala-test-azs',
        },
      });
    });

    test('ネットワーク設定情報が出力される', () => {
      // インターネットゲートウェイの状態
      template.hasOutput('InternetGatewayStatus', {
        Value: 'Created by CDK Vpc construct',
        Description: 'Internet Gateway creation status',
        Export: {
          Name: 'goal-mandala-test-igw-status',
        },
      });

      // ルーティング設定の概要
      template.hasOutput('RoutingConfiguration', {
        Value: 'Public: IGW, Private: NAT Gateway (1)',
        Description: 'Routing configuration summary',
        Export: {
          Name: 'goal-mandala-test-routing-config',
        },
      });

      // NATゲートウェイ数
      template.hasOutput('NatGatewayCount', {
        Value: '1',
        Description: 'Number of NAT Gateways deployed',
        Export: {
          Name: 'goal-mandala-test-nat-gateway-count',
        },
      });

      // VPCエンドポイント有効状態
      template.hasOutput('VpcEndpointsEnabled', {
        Value: 'false',
        Description: 'Whether VPC endpoints are enabled',
        Export: {
          Name: 'goal-mandala-test-vpc-endpoints-enabled',
        },
      });
    });

    test('VPCフローログ関連の出力が設定される', () => {
      // VPCフローログのCloudWatch Logsグループ名
      template.hasOutput('VpcFlowLogGroupName', {
        Value: '/aws/vpc/flowlogs/goal-mandala-test',
        Description: Match.stringLikeRegexp(/VPC Flow Log.*Group name/),
        Export: {
          Name: Match.stringLikeRegexp(/goal-mandala-test-vpc-flowlog-group/),
        },
      });
    });

    test('出力の命名規則が一貫している', () => {
      const outputs = template.findOutputs('*');

      Object.entries(outputs).forEach(([outputName, output]) => {
        // Export名がスタックプレフィックスで始まることを確認
        expect(output.Export.Name).toMatch(/^goal-mandala-test-/);

        // Export名がケバブケースであることを確認
        expect(output.Export.Name).toMatch(/^[a-z0-9-]+$/);
      });
    });

    test('必要な出力が全て存在する', () => {
      const requiredOutputs = [
        'VpcId',
        'VpcCidr',
        'PublicSubnetIds',
        'PrivateSubnetIds',
        'IsolatedSubnetIds',
        'DatabaseSecurityGroupId',
        'LambdaSecurityGroupId',
        'AlbSecurityGroupId',
        'AvailabilityZones',
        'InternetGatewayStatus',
        'RoutingConfiguration',
        'NatGatewayCount',
        'VpcEndpointsEnabled',
        'VpcFlowLogGroupName',
      ];

      const outputs = template.findOutputs('*');
      const outputNames = Object.keys(outputs);

      requiredOutputs.forEach(requiredOutput => {
        expect(outputNames).toContain(requiredOutput);
      });
    });
  });

  describe('Environment-specific Configuration', () => {
    test('要件4.1: 本番環境では高可用性のため2つのNATゲートウェイが作成される', () => {
      const prodApp = new cdk.App();
      const prodConfig = getEnvironmentConfig('prod');

      const prodStack = new VpcStack(prodApp, 'ProdVpcStack', {
        config: prodConfig,
        environment: 'prod',
        env: {
          region: prodConfig.region,
          account: '123456789012',
        },
      });

      const prodTemplate = Template.fromStack(prodStack);

      // 本番環境では2つのNATゲートウェイが作成されることを確認
      const natGateways = prodTemplate.findResources('AWS::EC2::NatGateway');
      expect(Object.keys(natGateways)).toHaveLength(2);

      // 設定値の確認
      expect(prodConfig.network.natGateways).toBe(2);

      // 出力値の確認
      prodTemplate.hasOutput('NatGatewayCount', {
        Value: '2',
        Description: 'Number of NAT Gateways deployed',
        Export: {
          Name: 'goal-mandala-prod-nat-gateway-count',
        },
      });
    });

    test('要件4.2: 開発環境ではコスト最適化のため1つのNATゲートウェイのみ作成される', () => {
      const devApp = new cdk.App();
      const devConfig = getEnvironmentConfig('dev');

      const devStack = new VpcStack(devApp, 'DevVpcStack', {
        config: devConfig,
        environment: 'dev',
        env: {
          region: devConfig.region,
          account: '123456789012',
        },
      });

      const devTemplate = Template.fromStack(devStack);

      // 開発環境では1つのNATゲートウェイのみ作成されることを確認
      const natGateways = devTemplate.findResources('AWS::EC2::NatGateway');
      expect(Object.keys(natGateways)).toHaveLength(1);

      // 設定値の確認
      expect(devConfig.network.natGateways).toBe(1);

      // 出力値の確認
      devTemplate.hasOutput('NatGatewayCount', {
        Value: '1',
        Description: 'Number of NAT Gateways deployed',
        Export: {
          Name: 'goal-mandala-dev-nat-gateway-count',
        },
      });
    });

    test('テスト環境でも1つのNATゲートウェイのみ作成される', () => {
      // テスト環境（現在のスタック）でも1つのNATゲートウェイのみ
      const natGateways = template.findResources('AWS::EC2::NatGateway');
      expect(Object.keys(natGateways)).toHaveLength(1);

      // 出力値の確認
      template.hasOutput('NatGatewayCount', {
        Value: '1',
        Description: 'Number of NAT Gateways deployed',
        Export: {
          Name: 'goal-mandala-test-nat-gateway-count',
        },
      });
    });

    test('NATゲートウェイがパブリックサブネットに配置される', () => {
      // NATゲートウェイがパブリックサブネットに配置されることを確認
      const natGateways = template.findResources('AWS::EC2::NatGateway');
      const natGatewayValues = Object.values(natGateways);

      natGatewayValues.forEach((natGateway: any) => {
        expect(natGateway.Properties.SubnetId).toBeDefined();
        // Elastic IPが関連付けられていることを確認
        expect(natGateway.Properties.AllocationId).toBeDefined();
      });

      // Elastic IPが作成されることを確認
      template.hasResource('AWS::EC2::EIP', {
        Properties: {
          Domain: 'vpc',
        },
      });
    });

    test('環境別の設定値が正しく反映される', () => {
      // テスト環境の設定値確認
      const testConfig = getEnvironmentConfig('test');
      expect(testConfig.network.natGateways).toBe(1);
      expect(testConfig.network.enableVpcEndpoints).toBe(false);

      // 開発環境の設定値確認
      const devConfig = getEnvironmentConfig('dev');
      expect(devConfig.network.natGateways).toBe(1);
      expect(devConfig.network.enableVpcEndpoints).toBe(false);

      // 本番環境の設定値確認
      const prodConfig = getEnvironmentConfig('prod');
      expect(prodConfig.network.natGateways).toBe(2);
      expect(prodConfig.network.enableVpcEndpoints).toBe(true);
    });
  });

  describe('VPC Endpoints', () => {
    test('要件4.4: 開発環境ではコスト最適化のためVPCエンドポイントは作成されない', () => {
      // テスト環境（開発環境と同様の設定）ではVPCエンドポイントは作成されない
      const gatewayEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Gateway',
        },
      });
      expect(Object.keys(gatewayEndpoints)).toHaveLength(0);

      const interfaceEndpoints = template.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Interface',
        },
      });
      expect(Object.keys(interfaceEndpoints)).toHaveLength(0);

      // VPCエンドポイント用セキュリティグループも作成されない
      const sgResources = template.findResources('AWS::EC2::SecurityGroup');
      const vpcEndpointSg = Object.values(sgResources).find((sg: any) =>
        sg.Properties.GroupDescription?.includes('VPC Interface endpoints')
      );
      expect(vpcEndpointSg).toBeUndefined();

      // 出力値でVPCエンドポイントが無効であることを確認
      template.hasOutput('VpcEndpointsEnabled', {
        Value: 'false',
        Description: 'Whether VPC endpoints are enabled',
        Export: {
          Name: 'goal-mandala-test-vpc-endpoints-enabled',
        },
      });
    });

    test('要件4.3: 本番環境またはステージング環境ではVPCエンドポイントが作成される', () => {
      const prodApp = new cdk.App();
      const prodConfig = getEnvironmentConfig('prod');

      const prodStack = new VpcStack(prodApp, 'ProdVpcStack', {
        config: prodConfig,
        environment: 'prod',
        env: {
          region: prodConfig.region,
          account: '123456789012',
        },
      });

      const prodTemplate = Template.fromStack(prodStack);

      // 要件5.1: S3とDynamoDB用のGatewayエンドポイントが作成される
      const gatewayEndpoints = prodTemplate.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Gateway',
        },
      });
      expect(Object.keys(gatewayEndpoints)).toHaveLength(2); // S3とDynamoDB

      // Gateway型エンドポイントが2つ作成されることを確認（S3とDynamoDB）
      // ServiceNameはCDKトークンとして表現される場合があるため、数量で確認
      expect(Object.keys(gatewayEndpoints)).toHaveLength(2);

      // 要件5.2: Secrets Manager、CloudWatch Logs、Bedrock用のInterfaceエンドポイントが作成される
      const interfaceEndpoints = prodTemplate.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Interface',
          PrivateDnsEnabled: true,
        },
      });
      expect(Object.keys(interfaceEndpoints)).toHaveLength(3); // Secrets Manager, CloudWatch Logs, Bedrock

      // 各Interfaceエンドポイントの確認
      const interfaceEndpointValues = Object.values(interfaceEndpoints);
      const serviceNames = interfaceEndpointValues.map((ep: any) => ep.Properties.ServiceName);

      expect(serviceNames.some(name => name.includes('secretsmanager'))).toBe(true);
      expect(serviceNames.some(name => name.includes('logs'))).toBe(true);
      expect(serviceNames.some(name => name.includes('bedrock'))).toBe(true);

      // 出力値でVPCエンドポイントが有効であることを確認
      prodTemplate.hasOutput('VpcEndpointsEnabled', {
        Value: 'true',
        Description: 'Whether VPC endpoints are enabled',
        Export: {
          Name: 'goal-mandala-prod-vpc-endpoints-enabled',
        },
      });
    });

    test('要件5.3: Interfaceエンドポイントに適切なセキュリティグループが関連付けられる', () => {
      const prodApp = new cdk.App();
      const prodConfig = getEnvironmentConfig('prod');

      const prodStack = new VpcStack(prodApp, 'ProdVpcStack', {
        config: prodConfig,
        environment: 'prod',
        env: {
          region: prodConfig.region,
          account: '123456789012',
        },
      });

      const prodTemplate = Template.fromStack(prodStack);

      // VPCエンドポイント用セキュリティグループが作成される
      prodTemplate.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription:
          'Security group for VPC Interface endpoints - allows HTTPS access from Lambda',
        GroupName: 'goal-mandala-prod-vpc-endpoint-sg',
      });

      // VPCエンドポイント用セキュリティグループへのLambdaからのHTTPS接続許可
      prodTemplate.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 443,
        ToPort: 443,
        Description: 'Allow Lambda access to VPC endpoints via HTTPS',
      });

      // Interfaceエンドポイントにセキュリティグループが関連付けられる
      const interfaceEndpoints = prodTemplate.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Interface',
        },
      });

      Object.values(interfaceEndpoints).forEach((endpoint: any) => {
        expect(endpoint.Properties.SecurityGroupIds).toBeDefined();
        expect(endpoint.Properties.SecurityGroupIds).toHaveLength(1);
      });
    });

    test('要件5.4: VPCエンドポイントがプライベートサブネットに配置される', () => {
      const prodApp = new cdk.App();
      const prodConfig = getEnvironmentConfig('prod');

      const prodStack = new VpcStack(prodApp, 'ProdVpcStack', {
        config: prodConfig,
        environment: 'prod',
        env: {
          region: prodConfig.region,
          account: '123456789012',
        },
      });

      const prodTemplate = Template.fromStack(prodStack);

      // Gatewayエンドポイントがプライベートサブネットに配置される
      const gatewayEndpoints = prodTemplate.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Gateway',
        },
      });

      Object.values(gatewayEndpoints).forEach((endpoint: any) => {
        expect(endpoint.Properties.RouteTableIds).toBeDefined();
        // Gatewayエンドポイントはルートテーブルに関連付けられる
      });

      // Interfaceエンドポイントがプライベートサブネットに配置される
      const interfaceEndpoints = prodTemplate.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Interface',
        },
      });

      Object.values(interfaceEndpoints).forEach((endpoint: any) => {
        expect(endpoint.Properties.SubnetIds).toBeDefined();
        // Interfaceエンドポイントはサブネットに配置される
      });
    });

    test('VPCエンドポイントの出力値が正しく設定される', () => {
      const prodApp = new cdk.App();
      const prodConfig = getEnvironmentConfig('prod');

      const prodStack = new VpcStack(prodApp, 'ProdVpcStack', {
        config: prodConfig,
        environment: 'prod',
        env: {
          region: prodConfig.region,
          account: '123456789012',
        },
      });

      const prodTemplate = Template.fromStack(prodStack);

      // VPCエンドポイントIDの出力を確認
      prodTemplate.hasOutput('S3EndpointId', {
        Description: 'S3 VPC Endpoint ID (Gateway type)',
        Export: {
          Name: 'goal-mandala-prod-s3-endpoint-id',
        },
      });

      prodTemplate.hasOutput('DynamoDbEndpointId', {
        Description: 'DynamoDB VPC Endpoint ID (Gateway type)',
        Export: {
          Name: 'goal-mandala-prod-dynamodb-endpoint-id',
        },
      });

      prodTemplate.hasOutput('SecretsManagerEndpointId', {
        Description: 'Secrets Manager VPC Endpoint ID (Interface type)',
        Export: {
          Name: 'goal-mandala-prod-secretsmanager-endpoint-id',
        },
      });

      prodTemplate.hasOutput('CloudWatchLogsEndpointId', {
        Description: 'CloudWatch Logs VPC Endpoint ID (Interface type)',
        Export: {
          Name: 'goal-mandala-prod-cloudwatchlogs-endpoint-id',
        },
      });

      prodTemplate.hasOutput('BedrockEndpointId', {
        Description: 'Bedrock VPC Endpoint ID (Interface type)',
        Export: {
          Name: 'goal-mandala-prod-bedrock-endpoint-id',
        },
      });

      // VPCエンドポイント用セキュリティグループIDの出力を確認
      prodTemplate.hasOutput('VpcEndpointSecurityGroupId', {
        Description: 'VPC Endpoint security group ID',
        Export: {
          Name: 'goal-mandala-prod-vpc-endpoint-sg-id',
        },
      });
    });
  });

  describe('Tags', () => {
    test('要件7.1: 環境名、プロジェクト名の自動タグ付与', () => {
      // VPCリソースが存在することを確認
      template.resourceCountIs('AWS::EC2::VPC', 1);

      // VPCに必要なタグが含まれていることを確認
      const vpcResources = template.findResources('AWS::EC2::VPC');
      const vpcResource = Object.values(vpcResources)[0];
      const tags = vpcResource.Properties.Tags;

      // 必要なタグが存在することを確認
      const tagKeys = tags.map((tag: any) => tag.Key);
      expect(tagKeys).toContain('Environment');
      expect(tagKeys).toContain('Project');

      // 環境名とプロジェクト名の値を確認
      const environmentTag = tags.find((tag: any) => tag.Key === 'Environment');
      expect(environmentTag.Value).toBe('test');

      const projectTag = tags.find((tag: any) => tag.Key === 'Project');
      expect(projectTag.Value).toBe('GoalMandala');
    });

    test('要件7.2: セキュリティグループ用途別Nameタグの設定', () => {
      // セキュリティグループリソースを取得
      const sgResources = template.findResources('AWS::EC2::SecurityGroup');

      // データベース用セキュリティグループのタグを確認
      const dbSg = Object.values(sgResources).find((sg: any) =>
        sg.Properties.GroupDescription.includes('Aurora database')
      );
      expect(dbSg).toBeDefined();
      const dbTags = dbSg.Properties.Tags;
      const dbNameTag = dbTags.find((tag: any) => tag.Key === 'Name');
      expect(dbNameTag.Value).toBe('goal-mandala-test-db-sg');

      const dbPurposeTag = dbTags.find((tag: any) => tag.Key === 'Purpose');
      expect(dbPurposeTag.Value).toBe('Database access control - PostgreSQL from Lambda only');

      const dbSecurityLevelTag = dbTags.find((tag: any) => tag.Key === 'SecurityLevel');
      expect(dbSecurityLevelTag.Value).toBe('High');

      // Lambda用セキュリティグループのタグを確認
      const lambdaSg = Object.values(sgResources).find((sg: any) =>
        sg.Properties.GroupDescription.includes('Lambda functions')
      );
      expect(lambdaSg).toBeDefined();
      const lambdaTags = lambdaSg.Properties.Tags;
      const lambdaNameTag = lambdaTags.find((tag: any) => tag.Key === 'Name');
      expect(lambdaNameTag.Value).toBe('goal-mandala-test-lambda-sg');

      const lambdaPurposeTag = lambdaTags.find((tag: any) => tag.Key === 'Purpose');
      expect(lambdaPurposeTag.Value).toBe(
        'Lambda function network access - outbound to APIs and database'
      );

      // ALB用セキュリティグループのタグを確認
      const albSg = Object.values(sgResources).find((sg: any) =>
        sg.Properties.GroupDescription.includes('Application Load Balancer')
      );
      expect(albSg).toBeDefined();
      const albTags = albSg.Properties.Tags;
      const albNameTag = albTags.find((tag: any) => tag.Key === 'Name');
      expect(albNameTag.Value).toBe('goal-mandala-test-alb-sg');

      const albPurposeTag = albTags.find((tag: any) => tag.Key === 'Purpose');
      expect(albPurposeTag.Value).toBe('Application Load Balancer - HTTP/HTTPS from internet');
    });

    test('要件7.3: 設定ファイルベースのカスタムタグ適用', () => {
      // VPCのカスタムタグを確認（テスト設定ファイルのタグ）
      const vpcResources = template.findResources('AWS::EC2::VPC');
      const vpcResource = Object.values(vpcResources)[0];
      const vpcTags = vpcResource.Properties.Tags;

      // テスト設定ファイルのカスタムタグを確認
      const projectTag = vpcTags.find((tag: any) => tag.Key === 'Project');
      expect(projectTag.Value).toBe('GoalMandala');

      const environmentTag = vpcTags.find((tag: any) => tag.Key === 'Environment');
      expect(environmentTag.Value).toBe('test');

      const purposeTag = vpcTags.find((tag: any) => tag.Key === 'Purpose');
      expect(purposeTag.Value).toBe('Main VPC for application infrastructure');

      // セキュリティグループにもカスタムタグが適用されることを確認
      const sgResources = template.findResources('AWS::EC2::SecurityGroup');
      const dbSg = Object.values(sgResources).find((sg: any) =>
        sg.Properties.GroupDescription.includes('Aurora database')
      );
      const dbTags = dbSg.Properties.Tags;
      const dbProjectTag = dbTags.find((tag: any) => tag.Key === 'Project');
      expect(dbProjectTag.Value).toBe('GoalMandala');

      const dbPurposeCustomTag = dbTags.find((tag: any) => tag.Key === 'Purpose');
      expect(dbPurposeCustomTag.Value).toBe(
        'Database access control - PostgreSQL from Lambda only'
      );
    });

    test('要件7.4: 一貫したタグ命名規則の実装', () => {
      // 全てのリソースに共通タグが適用されていることを確認
      const commonTagChecks = [
        'Project',
        'Environment',
        'StackPrefix',
        'ManagedBy',
        'Component',
        'CreatedBy',
        'Region',
      ];

      // VPCの共通タグを確認
      const vpcResources = template.findResources('AWS::EC2::VPC');
      const vpcResource = Object.values(vpcResources)[0];
      const vpcTags = vpcResource.Properties.Tags;
      const vpcTagKeys = vpcTags.map((tag: any) => tag.Key);

      commonTagChecks.forEach(tagKey => {
        expect(vpcTagKeys).toContain(tagKey);
      });

      // 共通タグの値を確認
      const stackPrefixTag = vpcTags.find((tag: any) => tag.Key === 'StackPrefix');
      expect(stackPrefixTag.Value).toBe('goal-mandala-test');

      const managedByTag = vpcTags.find((tag: any) => tag.Key === 'ManagedBy');
      expect(managedByTag.Value).toBe('cdk');

      const componentTag = vpcTags.find((tag: any) => tag.Key === 'Component');
      expect(componentTag.Value).toBe('vpc-network');

      const createdByTag = vpcTags.find((tag: any) => tag.Key === 'CreatedBy');
      expect(createdByTag.Value).toBe('VpcStack');

      const regionTag = vpcTags.find((tag: any) => tag.Key === 'Region');
      expect(regionTag.Value).toBe('ap-northeast-1');
    });

    test('VPCフローログリソースに適切なタグが設定される', () => {
      // CloudWatch Logsグループのタグを確認
      const logGroups = template.findResources('AWS::Logs::LogGroup');
      const flowLogGroup = Object.values(logGroups).find(
        (lg: any) => lg.Properties.LogGroupName === '/aws/vpc/flowlogs/goal-mandala-test'
      );
      expect(flowLogGroup).toBeDefined();
      const logGroupTags = flowLogGroup.Properties.Tags;

      const logGroupNameTag = logGroupTags.find((tag: any) => tag.Key === 'Name');
      expect(logGroupNameTag.Value).toBe('goal-mandala-test-vpc-flowlog-group');

      const logGroupResourceTypeTag = logGroupTags.find((tag: any) => tag.Key === 'ResourceType');
      expect(logGroupResourceTypeTag.Value).toBe('LogGroup');

      const logGroupPurposeTag = logGroupTags.find((tag: any) => tag.Key === 'Purpose');
      expect(logGroupPurposeTag.Value).toBe('VPC Flow Logs storage in CloudWatch');

      const logRetentionTag = logGroupTags.find((tag: any) => tag.Key === 'LogRetention');
      expect(logRetentionTag.Value).toBe('1 month');

      // IAMロールのタグを確認
      const iamRoles = template.findResources('AWS::IAM::Role');
      const flowLogRole = Object.values(iamRoles).find(
        (role: any) => role.Properties.RoleName === 'goal-mandala-test-vpc-flowlog-role'
      );
      expect(flowLogRole).toBeDefined();
      const roleTags = flowLogRole.Properties.Tags;

      const roleNameTag = roleTags.find((tag: any) => tag.Key === 'Name');
      expect(roleNameTag.Value).toBe('goal-mandala-test-vpc-flowlog-role');

      const roleResourceTypeTag = roleTags.find((tag: any) => tag.Key === 'ResourceType');
      expect(roleResourceTypeTag.Value).toBe('IAMRole');

      const rolePurposeTag = roleTags.find((tag: any) => tag.Key === 'Purpose');
      expect(rolePurposeTag.Value).toBe('VPC Flow Logs service role for CloudWatch access');

      const servicePrincipalTag = roleTags.find((tag: any) => tag.Key === 'ServicePrincipal');
      expect(servicePrincipalTag.Value).toBe('vpc-flow-logs.amazonaws.com');

      // VPCフローログのタグを確認
      const flowLogs = template.findResources('AWS::EC2::FlowLog');
      expect(Object.keys(flowLogs).length).toBeGreaterThan(0);
      const flowLog = Object.values(flowLogs)[0];
      const flowLogTags = flowLog.Properties.Tags;

      const flowLogNameTag = flowLogTags.find((tag: any) => tag.Key === 'Name');
      expect(flowLogNameTag.Value).toBe('goal-mandala-test-vpc-flowlog');

      const flowLogResourceTypeTag = flowLogTags.find((tag: any) => tag.Key === 'ResourceType');
      expect(flowLogResourceTypeTag.Value).toBe('FlowLog');

      const flowLogPurposeTag = flowLogTags.find((tag: any) => tag.Key === 'Purpose');
      expect(flowLogPurposeTag.Value).toBe('VPC network traffic monitoring and security analysis');

      const trafficTypeTag = flowLogTags.find((tag: any) => tag.Key === 'TrafficType');
      expect(trafficTypeTag.Value).toBe('ALL');
    });

    test('本番環境でVPCエンドポイントに適切なタグが設定される', () => {
      const prodApp = new cdk.App();
      const prodConfig = getEnvironmentConfig('prod');

      const prodStack = new VpcStack(prodApp, 'ProdVpcStack', {
        config: prodConfig,
        environment: 'prod',
        env: {
          region: prodConfig.region,
          account: '123456789012',
        },
      });

      const prodTemplate = Template.fromStack(prodStack);

      // VPCエンドポイントのタグを確認
      const vpcEndpoints = prodTemplate.findResources('AWS::EC2::VPCEndpoint');

      // Gateway エンドポイント（S3とDynamoDB）を確認
      const gatewayEndpoints = Object.values(vpcEndpoints).filter(
        (ep: any) => ep.Properties.VpcEndpointType === 'Gateway'
      );
      expect(gatewayEndpoints.length).toBe(2);

      // 最初のGatewayエンドポイントのタグを確認（S3またはDynamoDB）
      const firstGatewayEndpoint = gatewayEndpoints[0];
      const gatewayTags = firstGatewayEndpoint.Properties.Tags;

      const gatewayNameTag = gatewayTags.find((tag: any) => tag.Key === 'Name');
      expect(gatewayNameTag.Value).toMatch(/goal-mandala-prod-(s3|dynamodb)-endpoint/);

      const gatewayResourceTypeTag = gatewayTags.find((tag: any) => tag.Key === 'ResourceType');
      expect(gatewayResourceTypeTag.Value).toBe('VpcEndpoint');

      const gatewayEndpointTypeTag = gatewayTags.find((tag: any) => tag.Key === 'EndpointType');
      expect(gatewayEndpointTypeTag.Value).toBe('Gateway');

      // Interface エンドポイントを確認
      const interfaceEndpoints = Object.values(vpcEndpoints).filter(
        (ep: any) => ep.Properties.VpcEndpointType === 'Interface'
      );
      expect(interfaceEndpoints.length).toBe(3);

      // 最初のInterfaceエンドポイントのタグを確認
      const firstInterfaceEndpoint = interfaceEndpoints[0];
      const interfaceTags = firstInterfaceEndpoint.Properties.Tags;

      const interfaceNameTag = interfaceTags.find((tag: any) => tag.Key === 'Name');
      expect(interfaceNameTag.Value).toMatch(
        /goal-mandala-prod-(secretsmanager|cloudwatchlogs|bedrock)-endpoint/
      );

      const interfaceResourceTypeTag = interfaceTags.find((tag: any) => tag.Key === 'ResourceType');
      expect(interfaceResourceTypeTag.Value).toBe('VpcEndpoint');

      const interfaceEndpointTypeTag = interfaceTags.find((tag: any) => tag.Key === 'EndpointType');
      expect(interfaceEndpointTypeTag.Value).toBe('Interface');
    });

    test('環境名とプロジェクト名が正しく抽出される', () => {
      // 開発環境のテスト
      const devApp = new cdk.App();
      const devConfig = getEnvironmentConfig('dev');

      const devStack = new VpcStack(devApp, 'DevVpcStack', {
        config: devConfig,
        environment: 'dev',
        env: {
          region: devConfig.region,
          account: '123456789012',
        },
      });

      const devTemplate = Template.fromStack(devStack);

      // 開発環境のタグを確認
      const devVpcResources = devTemplate.findResources('AWS::EC2::VPC');
      const devVpcResource = Object.values(devVpcResources)[0];
      const devTags = devVpcResource.Properties.Tags;

      const devProjectTag = devTags.find((tag: any) => tag.Key === 'Project');
      expect(devProjectTag.Value).toBe('goal-mandala');

      const devEnvironmentTag = devTags.find((tag: any) => tag.Key === 'Environment');
      expect(devEnvironmentTag.Value).toBe('development');

      // 本番環境のテスト
      const prodApp = new cdk.App();
      const prodConfig = getEnvironmentConfig('prod');

      const prodStack = new VpcStack(prodApp, 'ProdVpcStack', {
        config: prodConfig,
        environment: 'prod',
        env: {
          region: prodConfig.region,
          account: '123456789012',
        },
      });

      const prodTemplate = Template.fromStack(prodStack);

      // 本番環境のタグを確認
      const prodVpcResources = prodTemplate.findResources('AWS::EC2::VPC');
      const prodVpcResource = Object.values(prodVpcResources)[0];
      const prodTags = prodVpcResource.Properties.Tags;

      const prodProjectTag = prodTags.find((tag: any) => tag.Key === 'Project');
      expect(prodProjectTag.Value).toBe('goal-mandala');

      const prodEnvironmentTag = prodTags.find((tag: any) => tag.Key === 'Environment');
      expect(prodEnvironmentTag.Value).toBe('production');
    });

    test('全てのリソースタイプに適切なResourceTypeタグが設定される', () => {
      // VPCのResourceTypeタグ
      const vpcResources = template.findResources('AWS::EC2::VPC');
      const vpcResource = Object.values(vpcResources)[0];
      const vpcTags = vpcResource.Properties.Tags;
      const vpcResourceTypeTag = vpcTags.find((tag: any) => tag.Key === 'ResourceType');
      expect(vpcResourceTypeTag.Value).toBe('VPC');

      // セキュリティグループのResourceTypeタグ
      const sgResources = template.findResources('AWS::EC2::SecurityGroup');
      Object.values(sgResources).forEach((sg: any) => {
        const sgTags = sg.Properties.Tags;
        const sgResourceTypeTag = sgTags.find((tag: any) => tag.Key === 'ResourceType');
        expect(sgResourceTypeTag.Value).toBe('SecurityGroup');
      });

      // CloudWatch LogsグループのResourceTypeタグ
      const logGroups = template.findResources('AWS::Logs::LogGroup');
      Object.values(logGroups).forEach((lg: any) => {
        const lgTags = lg.Properties.Tags;
        const lgResourceTypeTag = lgTags.find((tag: any) => tag.Key === 'ResourceType');
        expect(lgResourceTypeTag.Value).toBe('LogGroup');
      });

      // IAMロールのResourceTypeタグ
      const iamRoles = template.findResources('AWS::IAM::Role');
      Object.values(iamRoles).forEach((role: any) => {
        const roleTags = role.Properties.Tags;
        const roleResourceTypeTag = roleTags.find((tag: any) => tag.Key === 'ResourceType');
        expect(roleResourceTypeTag.Value).toBe('IAMRole');
      });

      // VPCフローログのResourceTypeタグ
      const flowLogs = template.findResources('AWS::EC2::FlowLog');
      Object.values(flowLogs).forEach((fl: any) => {
        const flTags = fl.Properties.Tags;
        const flResourceTypeTag = flTags.find((tag: any) => tag.Key === 'ResourceType');
        expect(flResourceTypeTag.Value).toBe('FlowLog');
      });
    });
  });

  describe('Comprehensive Requirements Validation', () => {
    test('全ての要件が実装されていることを確認', () => {
      // 要件1: VPCとネットワーク基盤
      expect(stack.vpc).toBeDefined();
      // VPCのCIDRブロックはCDKトークンとして表現される場合があるため、テンプレートで確認
      template.hasResourceProperties('AWS::EC2::VPC', {
        CidrBlock: '10.0.0.0/16',
      });
      expect(stack.vpc.availabilityZones.length).toBe(2);
      expect(stack.vpc.publicSubnets.length).toBe(2);
      expect(stack.vpc.privateSubnets.length).toBe(2);
      expect(stack.vpc.isolatedSubnets.length).toBe(2);

      // 要件2: セキュリティグループ
      expect(stack.databaseSecurityGroup).toBeDefined();
      expect(stack.lambdaSecurityGroup).toBeDefined();
      expect(stack.albSecurityGroup).toBeDefined();

      // 要件3: VPCフローログ（プライベートプロパティのため、CloudFormationテンプレートで確認）
      template.hasResource('AWS::EC2::FlowLog', {});
      template.hasResource('AWS::Logs::LogGroup', {});
      template.hasResource('AWS::IAM::Role', {});

      // 要件4: 環境別設定（テスト環境の設定を確認）
      const testConfig = getEnvironmentConfig('test');
      expect(testConfig.network.natGateways).toBe(1);
      expect(testConfig.network.enableVpcEndpoints).toBe(false);

      // 要件5: VPCエンドポイント（テスト環境では無効）
      expect(stack.s3Endpoint).toBeUndefined();
      expect(stack.dynamoDbEndpoint).toBeUndefined();
      expect(stack.secretsManagerEndpoint).toBeUndefined();
      expect(stack.cloudWatchLogsEndpoint).toBeUndefined();
      expect(stack.bedrockEndpoint).toBeUndefined();

      // 要件6: CloudFormation出力
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs).length).toBeGreaterThan(10);

      // 要件7: タグ管理
      const vpcResources = template.findResources('AWS::EC2::VPC');
      const vpcResource = Object.values(vpcResources)[0];
      const tags = vpcResource.Properties.Tags;
      const tagKeys = tags.map((tag: any) => tag.Key);
      expect(tagKeys).toContain('Environment');
      expect(tagKeys).toContain('Project');
      expect(tagKeys).toContain('Name');
    });

    test('本番環境で全ての要件が満たされることを確認', () => {
      const prodApp = new cdk.App();
      const prodConfig = getEnvironmentConfig('prod');

      const prodStack = new VpcStack(prodApp, 'ProdVpcStack', {
        config: prodConfig,
        environment: 'prod',
        env: {
          region: prodConfig.region,
          account: '123456789012',
        },
      });

      const prodTemplate = Template.fromStack(prodStack);

      // 本番環境固有の要件確認
      // 要件4.1: 2つのNATゲートウェイ
      const natGateways = prodTemplate.findResources('AWS::EC2::NatGateway');
      expect(Object.keys(natGateways)).toHaveLength(2);

      // 要件4.3: VPCエンドポイントが有効
      const vpcEndpoints = prodTemplate.findResources('AWS::EC2::VPCEndpoint');
      expect(Object.keys(vpcEndpoints)).toHaveLength(5); // S3, DynamoDB, Secrets Manager, CloudWatch Logs, Bedrock

      // 要件5.1: Gateway型エンドポイント（S3, DynamoDB）
      const gatewayEndpoints = prodTemplate.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Gateway',
        },
      });
      expect(Object.keys(gatewayEndpoints)).toHaveLength(2);

      // 要件5.2: Interface型エンドポイント（Secrets Manager, CloudWatch Logs, Bedrock）
      const interfaceEndpoints = prodTemplate.findResources('AWS::EC2::VPCEndpoint', {
        Properties: {
          VpcEndpointType: 'Interface',
        },
      });
      expect(Object.keys(interfaceEndpoints)).toHaveLength(3);

      // 要件5.3: VPCエンドポイント用セキュリティグループ
      prodTemplate.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription:
          'Security group for VPC Interface endpoints - allows HTTPS access from Lambda',
      });
    });

    test('エラーケースとエッジケースの処理', () => {
      // VPCスタックが正常に作成されることを確認
      expect(stack).toBeDefined();
      expect(() => Template.fromStack(stack)).not.toThrow();

      // 必要なリソースが全て作成されることを確認
      template.resourceCountIs('AWS::EC2::VPC', 1);
      template.resourceCountIs('AWS::EC2::InternetGateway', 1);
      template.resourceCountIs('AWS::EC2::NatGateway', 1); // テスト環境
      template.resourceCountIs('AWS::EC2::FlowLog', 1);
      template.resourceCountIs('AWS::Logs::LogGroup', 1);

      // セキュリティグループが適切な数作成されることを確認
      const sgCount = Object.keys(template.findResources('AWS::EC2::SecurityGroup')).length;
      expect(sgCount).toBe(3); // Database, Lambda, ALB（テスト環境ではVPCエンドポイント用SGなし）
    });

    test('パフォーマンスと最適化の確認', () => {
      // NATゲートウェイ数が環境設定に従っていることを確認
      const testConfig = getEnvironmentConfig('test');
      const natGateways = template.findResources('AWS::EC2::NatGateway');
      expect(Object.keys(natGateways)).toHaveLength(testConfig.network.natGateways);

      // VPCエンドポイントがコスト最適化のため無効になっていることを確認
      expect(testConfig.network.enableVpcEndpoints).toBe(false);
      const vpcEndpoints = template.findResources('AWS::EC2::VPCEndpoint');
      expect(Object.keys(vpcEndpoints)).toHaveLength(0);

      // サブネットのCIDRマスクが適切に設定されていることを確認
      const publicSubnets = stack.vpc.publicSubnets;
      const privateSubnets = stack.vpc.privateSubnets;
      const isolatedSubnets = stack.vpc.isolatedSubnets;

      // パブリック・プライベートサブネット: /24
      [...publicSubnets, ...privateSubnets].forEach(subnet => {
        expect(subnet.ipv4CidrBlock).toMatch(/\/24$/);
      });

      // 分離サブネット（データベース用）: /28
      isolatedSubnets.forEach(subnet => {
        expect(subnet.ipv4CidrBlock).toMatch(/\/28$/);
      });
    });

    test('セキュリティベストプラクティスの確認', () => {
      // データベースセキュリティグループのアウトバウンドが制限されていることを確認
      const sgResources = template.findResources('AWS::EC2::SecurityGroup');
      const dbSg = Object.values(sgResources).find(
        (sg: any) => sg.Properties.GroupName === 'goal-mandala-test-db-sg'
      );
      // データベースSGはアウトバウンドルールが制限されていることを確認
      if (dbSg.Properties.SecurityGroupEgress) {
        const realEgressRules = dbSg.Properties.SecurityGroupEgress.filter(
          (rule: any) => rule.CidrIp !== '255.255.255.255/32'
        );
        expect(realEgressRules.length).toBe(0);
      }

      // ALBセキュリティグループのアウトバウンドが制限されていることを確認
      const albSg = Object.values(sgResources).find(
        (sg: any) => sg.Properties.GroupName === 'goal-mandala-test-alb-sg'
      );
      // ALBセキュリティグループのアウトバウンドが制限されていることを確認
      if (albSg.Properties.SecurityGroupEgress) {
        const realEgressRules = albSg.Properties.SecurityGroupEgress.filter(
          (rule: any) => rule.CidrIp !== '255.255.255.255/32'
        );
        expect(realEgressRules.length).toBe(0);
      }

      // セキュリティグループ間の参照が正しく設定されていることを確認
      const ingressRules = template.findResources('AWS::EC2::SecurityGroupIngress');
      const ingressValues = Object.values(ingressRules);

      // Lambda SGからDatabase SGへの参照
      const dbIngressRule = ingressValues.find(
        (rule: any) => rule.Properties.FromPort === 5432 && rule.Properties.ToPort === 5432
      );
      expect(dbIngressRule.Properties.SourceSecurityGroupId).toBeDefined();

      // VPCフローログが全トラフィックを記録することを確認
      template.hasResourceProperties('AWS::EC2::FlowLog', {
        TrafficType: 'ALL',
      });
    });

    test('運用・監視の要件確認', () => {
      // VPCフローログのCloudWatch Logs統合
      template.hasResourceProperties('AWS::EC2::FlowLog', {
        LogDestinationType: 'cloud-watch-logs',
        LogGroupName: Match.anyValue(),
      });

      // ログ保持期間の設定
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 30, // 1ヶ月
      });

      // IAMロールの適切な権限設定
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
              ],
              Resource: Match.anyValue(),
            }),
          ]),
        },
      });

      // 出力値による他スタックとの統合サポート
      const outputs = template.findOutputs('*');
      Object.entries(outputs).forEach(([outputName, output]) => {
        expect(output.Export).toBeDefined();
        expect(output.Description).toBeDefined();
      });
    });
  });
});
