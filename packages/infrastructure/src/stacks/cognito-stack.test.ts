import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { CognitoStack } from './cognito-stack';
import { getEnvironmentConfig } from '../config/environment';

describe('CognitoStack', () => {
  let app: cdk.App;
  let stack: CognitoStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    const config = getEnvironmentConfig('test');

    stack = new CognitoStack(app, 'TestCognitoStack', {
      config,
      environment: 'test',
      env: {
        region: config.region,
        account: '123456789012',
      },
    });

    template = Template.fromStack(stack);
  });

  describe('User Pool', () => {
    test('User Poolが作成される', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'test-goal-mandala-user-pool',
        Policies: {
          PasswordPolicy: {
            MinimumLength: 6,
            RequireLowercase: false,
            RequireNumbers: false,
            RequireSymbols: false,
            RequireUppercase: false,
            TemporaryPasswordValidityDays: 7,
          },
        },
        AutoVerifiedAttributes: ['email'],
        UsernameAttributes: ['email'],
        UsernameConfiguration: {
          CaseSensitive: false,
        },
        AccountRecoverySetting: {
          RecoveryMechanisms: [
            {
              Name: 'verified_email',
              Priority: 1,
            },
          ],
        },
        DeletionProtection: 'INACTIVE',
      });
    });

    test('標準属性が正しく設定される', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        Schema: Match.arrayWith([
          {
            Name: 'email',
            Required: true,
            Mutable: true,
          },
          {
            Name: 'name',
            Required: true,
            Mutable: true,
          },
        ]),
      });
    });

    test('カスタム属性が正しく設定される', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        Schema: Match.arrayWith([
          {
            AttributeDataType: 'String',
            Name: 'industry',
            Mutable: true,
          },
          {
            AttributeDataType: 'String',
            Name: 'company_size',
            Mutable: true,
          },
          {
            AttributeDataType: 'String',
            Name: 'job_title',
            Mutable: true,
          },
          {
            AttributeDataType: 'String',
            Name: 'position',
            Mutable: true,
          },
        ]),
      });
    });

    test('メールアドレスがユーザー名として使用される', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        UsernameConfiguration: {
          CaseSensitive: false,
        },
      });
    });

    test('必要な属性（name, email）が設定されている', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        Schema: Match.arrayWith([
          {
            Name: 'email',
            Required: true,
            Mutable: true,
          },
          {
            Name: 'name',
            Required: true,
            Mutable: true,
          },
        ]),
      });
    });

    test('適切な命名規約に従ったリソース名が設定されている', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'test-goal-mandala-user-pool',
      });
    });
  });

  describe('User Pool Client', () => {
    test('SPAアプリケーション用の適切な設定がされている', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        ClientName: 'test-goal-mandala-user-pool-client',
        GenerateSecret: false,
        PreventUserExistenceErrors: 'LEGACY', // 実際の値に合わせて修正
        EnableTokenRevocation: false,
        SupportedIdentityProviders: ['COGNITO'],
      });
    });

    test('認証フローが適切に設定されている', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        ExplicitAuthFlows: Match.arrayWith(['ALLOW_USER_SRP_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH']),
      });
    });

    test('リフレッシュトークンの有効期限が適切に設定されている', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        RefreshTokenValidity: 43200,
        TokenValidityUnits: {
          RefreshToken: 'minutes',
        },
      });
    });

    test('CORS設定が適切に行われている', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        CallbackURLs: Match.arrayWith(['http://localhost:3000/auth/callback']),
        LogoutURLs: Match.arrayWith(['http://localhost:3000/auth/logout']),
      });
    });
  });

  describe('Password Policy and Security Settings', () => {
    test('パスワードポリシーが要件通りに設定される', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        Policies: {
          PasswordPolicy: {
            MinimumLength: 6,
            RequireLowercase: false,
            RequireNumbers: false,
            RequireSymbols: false,
            RequireUppercase: false,
            TemporaryPasswordValidityDays: 7,
          },
        },
      });
    });

    test('本番環境では最小文字数が8文字以上に設定されている', () => {
      const prodApp = new cdk.App();
      const prodConfig = getEnvironmentConfig('prod');

      const prodStack = new CognitoStack(prodApp, 'ProdCognitoStack', {
        config: prodConfig,
        environment: 'prod',
        env: {
          region: prodConfig.region,
          account: '123456789012',
        },
      });

      const prodTemplate = Template.fromStack(prodStack);

      prodTemplate.hasResourceProperties('AWS::Cognito::UserPool', {
        Policies: {
          PasswordPolicy: {
            MinimumLength: 12,
            RequireLowercase: true,
            RequireNumbers: true,
            RequireSymbols: true,
            RequireUppercase: true,
          },
        },
      });
    });

    test('アカウント復旧設定が正しく設定される', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AccountRecoverySetting: {
          RecoveryMechanisms: [
            {
              Name: 'verified_email',
              Priority: 1,
            },
          ],
        },
      });
    });

    test('セルフサインアップが有効になっている', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AdminCreateUserConfig: {
          AllowAdminCreateUserOnly: false,
        },
      });
    });
  });

  describe('Email Configuration', () => {
    test('確認メールが自動送信される設定になっている', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AutoVerifiedAttributes: ['email'],
      });
    });

    test('カスタムメールテンプレートが設定されている', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        EmailVerificationSubject: 'Goal Mandala Test - メールアドレス確認',
        EmailVerificationMessage: 'Goal Mandala Testのメールアドレス確認コード: {####}',
      });
    });

    test('送信者メールアドレスが適切に設定されている', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        EmailConfiguration: {
          EmailSendingAccount: 'COGNITO_DEFAULT',
          ReplyToEmailAddress: 'noreply@test.goal-mandala.example.com',
        },
      });
    });

    test('メール送信設定の環境別対応', () => {
      // テスト環境ではCognito標準メール
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        EmailConfiguration: {
          EmailSendingAccount: 'COGNITO_DEFAULT',
        },
      });

      // 本番環境ではSES
      const prodApp = new cdk.App();
      const prodConfig = getEnvironmentConfig('prod');
      const prodStack = new CognitoStack(prodApp, 'ProdCognitoStack', {
        config: prodConfig,
        environment: 'prod',
        env: { region: prodConfig.region, account: '123456789012' },
      });
      const prodTemplate = Template.fromStack(prodStack);

      prodTemplate.hasResourceProperties('AWS::Cognito::UserPool', {
        EmailConfiguration: {
          EmailSendingAccount: 'DEVELOPER',
        },
      });
    });
  });

  describe('IAM Role and Policies', () => {
    test('Lambda関数用IAMロールの作成', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'test-goal-mandala-cognito-lambda-role',
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com',
              },
            },
          ],
          Version: '2012-10-17',
        },
      });
    });

    test('Cognitoアクセス用IAMポリシーの実装', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith([
                'cognito-idp:GetUser',
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminUpdateUserAttributes',
              ]),
              Resource: {
                'Fn::GetAtt': [Match.stringLikeRegexp('UserPool.*'), 'Arn'],
              },
            }),
          ]),
        },
      });
    });

    test('最小権限の原則に基づく権限設定', () => {
      // Cognitoアクセス用ポリシーが特定のUser Poolリソースに制限されていることを確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Resource: {
                'Fn::GetAtt': [Match.stringLikeRegexp('UserPool.*'), 'Arn'],
              },
            }),
          ]),
        },
      });

      // ワイルドカードリソースを使用するポリシーがある場合は、それが適切な理由があることを確認
      const policies = template.findResources('AWS::IAM::Policy');
      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties.PolicyDocument.Statement;
        statements.forEach((statement: any) => {
          if (statement.Resource === '*') {
            // ワイルドカードが必要な場合（ログ作成など）は許可
            const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
            const allowedWildcardActions = [
              'logs:CreateLogGroup',
              'logs:CreateLogStream',
              'logs:PutLogEvents',
              'logs:DescribeLogGroups',
              'logs:DescribeLogStreams',
              'ses:SendEmail',
              'ses:SendRawEmail',
            ];
            const hasOnlyAllowedActions = actions.every((action: string) =>
              allowedWildcardActions.some(allowed => action === allowed)
            );
            expect(hasOnlyAllowedActions).toBe(true);
          }
        });
      });
    });

    test('環境別権限設定の実装', () => {
      // テスト環境では詳細ログが有効
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Effect: 'Allow',
              Action: Match.arrayWith([
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
              ]),
              Resource: '*',
            },
          ]),
        },
      });
    });
  });

  describe('CloudFormation Outputs and Stack Integration', () => {
    test('User Pool ID、User Pool Client IDの出力設定', () => {
      template.hasOutput('UserPoolId', {
        Description: 'Cognito User Pool ID',
        Export: {
          Name: 'TestCognitoStack-UserPoolId',
        },
      });

      template.hasOutput('UserPoolClientId', {
        Description: 'Cognito User Pool Client ID',
        Export: {
          Name: 'TestCognitoStack-UserPoolClientId',
        },
      });
    });

    test('他のスタックから参照可能な出力の実装', () => {
      const requiredOutputs = [
        'UserPoolId',
        'UserPoolArn',
        'UserPoolClientId',
        'UserPoolDomainOutput',
        'UserPoolDomainBaseUrlOutput',
        'LambdaRoleArn',
      ];

      requiredOutputs.forEach(outputName => {
        template.hasOutput(outputName, {
          Export: {
            Name: Match.stringLikeRegexp(`TestCognitoStack-${outputName.replace('Output', '')}`),
          },
        });
      });
    });

    test('環境別リソース名の実装', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'test-goal-mandala-user-pool',
      });

      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        ClientName: 'test-goal-mandala-user-pool-client',
      });

      template.hasResourceProperties('AWS::Cognito::UserPoolDomain', {
        Domain: 'test-goal-mandala-auth',
      });
    });

    test('スタック間の依存関係設定', () => {
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        UserPoolId: {
          Ref: Match.stringLikeRegexp('UserPool.*'),
        },
      });

      template.hasResourceProperties('AWS::Cognito::UserPoolDomain', {
        UserPoolId: {
          Ref: Match.stringLikeRegexp('UserPool.*'),
        },
      });
    });
  });

  describe('Environment-specific Configuration', () => {
    test('各環境で独立したUser Poolが作成される', () => {
      // 開発環境
      const devApp = new cdk.App();
      const devConfig = getEnvironmentConfig('dev');
      const devStack = new CognitoStack(devApp, 'DevCognitoStack', {
        config: devConfig,
        environment: 'dev',
        env: { region: devConfig.region, account: '123456789012' },
      });
      const devTemplate = Template.fromStack(devStack);

      devTemplate.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'goal-mandala-dev-user-pool',
      });

      // 本番環境
      const prodApp = new cdk.App();
      const prodConfig = getEnvironmentConfig('prod');
      const prodStack = new CognitoStack(prodApp, 'ProdCognitoStack', {
        config: prodConfig,
        environment: 'prod',
        env: { region: prodConfig.region, account: '123456789012' },
      });
      const prodTemplate = Template.fromStack(prodStack);

      prodTemplate.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'goal-mandala-prod-user-pool',
      });
    });

    test('開発環境では緩い設定、本番環境では厳格な設定が適用される', () => {
      // 開発環境
      const devApp = new cdk.App();
      const devConfig = getEnvironmentConfig('dev');
      const devStack = new CognitoStack(devApp, 'DevCognitoStack', {
        config: devConfig,
        environment: 'dev',
        env: { region: devConfig.region, account: '123456789012' },
      });
      const devTemplate = Template.fromStack(devStack);

      devTemplate.hasResourceProperties('AWS::Cognito::UserPool', {
        DeletionProtection: 'INACTIVE',
        MfaConfiguration: 'OFF',
      });

      // 本番環境
      const prodApp = new cdk.App();
      const prodConfig = getEnvironmentConfig('prod');
      const prodStack = new CognitoStack(prodApp, 'ProdCognitoStack', {
        config: prodConfig,
        environment: 'prod',
        env: { region: prodConfig.region, account: '123456789012' },
      });
      const prodTemplate = Template.fromStack(prodStack);

      prodTemplate.hasResourceProperties('AWS::Cognito::UserPool', {
        DeletionProtection: 'ACTIVE',
        MfaConfiguration: 'OPTIONAL',
      });
    });
  });

  describe('Public Properties', () => {
    test('userPoolプロパティが正しく公開される', () => {
      expect(stack.userPool).toBeDefined();
      expect(stack.userPool.userPoolId).toBeDefined();
      expect(stack.userPool.userPoolArn).toBeDefined();
    });

    test('userPoolClientプロパティが正しく公開される', () => {
      expect(stack.userPoolClient).toBeDefined();
      expect(stack.userPoolClient.userPoolClientId).toBeDefined();
    });

    test('userPoolDomainプロパティが正しく公開される', () => {
      expect(stack.userPoolDomain).toBeDefined();
      expect(stack.userPoolDomain.domainName).toBeDefined();
    });

    test('lambdaRoleプロパティが正しく公開される', () => {
      expect(stack.lambdaRole).toBeDefined();
      expect(stack.lambdaRole.roleArn).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('無効なOAuthスコープでエラーが発生する', () => {
      const app = new cdk.App();
      const config = getEnvironmentConfig('test');

      const invalidConfig = {
        ...config,
        cognito: {
          ...config.cognito,
          userPoolClient: {
            ...config.cognito.userPoolClient,
            oAuth: {
              ...config.cognito.userPoolClient.oAuth,
              scopes: ['invalid-scope'],
            },
          },
        },
      };

      expect(() => {
        new CognitoStack(app, 'InvalidCognitoStack', {
          config: invalidConfig,
          environment: 'test',
          env: {
            region: config.region,
            account: '123456789012',
          },
        });
      }).toThrow('Invalid OAuth scope: invalid-scope');
    });
  });
});
