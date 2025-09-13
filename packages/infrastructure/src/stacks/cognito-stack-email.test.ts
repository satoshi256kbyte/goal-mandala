import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Template } from 'aws-cdk-lib/assertions';
import { CognitoStack } from './cognito-stack';
import { getEnvironmentConfig } from '../config/environment';

describe('CognitoStack Email Configuration', () => {
  let app: cdk.App;
  let stack: CognitoStack;
  let template: Template;

  describe('Development Environment (Cognito Email)', () => {
    beforeEach(() => {
      app = new cdk.App();
      const config = getEnvironmentConfig('dev');

      stack = new CognitoStack(app, 'TestCognitoStack', {
        config,
        environment: 'dev',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      template = Template.fromStack(stack);
    });

    test('should use Cognito email for development environment', () => {
      // User Poolが作成されることを確認
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'goal-mandala-dev-user-pool',
      });

      // SES Configuration Setが作成されないことを確認
      template.resourceCountIs('AWS::SES::ConfigurationSet', 0);
    });

    test('should apply custom email templates', () => {
      // カスタムメールテンプレートが適用されることを確認
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        EmailVerificationSubject: 'Goal Mandala - メールアドレス確認',
      });
    });

    test('should configure admin create user message template', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AdminCreateUserConfig: {
          InviteMessageTemplate: {
            EmailSubject: 'Goal Mandala - アカウント作成のご案内',
          },
        },
      });
    });
  });

  describe('Production Environment (SES Email)', () => {
    beforeEach(() => {
      app = new cdk.App();
      const config = getEnvironmentConfig('prod');

      stack = new CognitoStack(app, 'TestCognitoStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      template = Template.fromStack(stack);
    });

    test('should create SES configuration set for production', () => {
      // SES Configuration Setが作成されることを確認
      template.hasResourceProperties('AWS::SES::ConfigurationSet', {
        Name: 'goal-mandala-prod-config-set',
        ReputationOptions: {
          ReputationMetricsEnabled: true,
        },
        SendingOptions: {
          SendingEnabled: true,
        },
      });
    });

    test('should configure SES event destination', () => {
      // CloudWatchイベント送信先が設定されることを確認
      template.hasResourceProperties('AWS::SES::ConfigurationSetEventDestination', {
        EventDestination: {
          Enabled: true,
          MatchingEventTypes: ['send', 'bounce', 'complaint', 'delivery', 'reject'],
          CloudWatchDestination: expect.any(Object),
        },
      });
    });

    test('should apply production email templates', () => {
      // 本番環境用のカスタムメールテンプレートが適用されることを確認
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        EmailVerificationSubject: 'Goal Mandala - メールアドレス確認',
        EmailVerificationMessage: expect.stringContaining('コードの有効期限は10分間です'),
      });
    });

    test('should configure verification message template with link option', () => {
      // リンクベースの確認メッセージテンプレートが設定されることを確認
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        VerificationMessageTemplate: {
          EmailMessage: expect.stringContaining('Goal Mandalaへようこそ！'),
          EmailMessageByLink: expect.stringContaining(
            '以下のリンクをクリックして確認を完了してください'
          ),
          EmailSubject: 'Goal Mandala - メールアドレス確認',
          EmailSubjectByLink: 'Goal Mandala - メールアドレス確認',
          DefaultEmailOption: 'CONFIRM_WITH_CODE',
        },
      });
    });
  });

  describe('Lambda Role SES Permissions', () => {
    beforeEach(() => {
      app = new cdk.App();
      const config = getEnvironmentConfig('prod');

      stack = new CognitoStack(app, 'TestCognitoStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      template = Template.fromStack(stack);
    });

    test('should grant SES permissions to Lambda role', () => {
      // Lambda実行ロールにSES権限が付与されることを確認
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'goal-mandala-prod-cognito-lambda-role',
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
      });

      // SES権限を含むポリシーが作成されることを確認
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: expect.arrayContaining([
                'ses:SendEmail',
                'ses:SendRawEmail',
                'ses:SendTemplatedEmail',
                'ses:GetSendQuota',
                'ses:GetSendStatistics',
              ]),
              Resource: '*',
            }),
          ]),
        },
      });
    });
  });

  describe('CloudFormation Outputs', () => {
    beforeEach(() => {
      app = new cdk.App();
      const config = getEnvironmentConfig('prod');

      stack = new CognitoStack(app, 'TestCognitoStack', {
        config,
        environment: 'prod',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      template = Template.fromStack(stack);
    });

    test('should output email configuration information', () => {
      // メール設定情報が出力されることを確認
      template.hasOutput('EmailProvider', {
        Value: 'SES',
        Description: 'Email provider used for Cognito notifications',
      });

      template.hasOutput('FromEmailAddress', {
        Value: 'noreply@goal-mandala.example.com',
        Description: 'From email address for Cognito notifications',
      });

      template.hasOutput('SesConfigurationSet', {
        Value: 'goal-mandala-prod-config-set',
        Description: 'SES Configuration Set Name',
      });
    });

    test('should output SES verification instructions', () => {
      // SESドメイン検証の手順が出力されることを確認
      template.hasOutput('SesVerificationInstructions', {
        Value:
          "Please verify the domain 'goal-mandala.example.com' in SES console before using email features",
        Description: 'SES Domain Verification Instructions',
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle missing custom templates gracefully', () => {
      app = new cdk.App();

      // カスタムテンプレートが設定されていない設定を作成
      const config = getEnvironmentConfig('dev');
      delete config.cognito.userPool.emailSettings.customTemplates;

      expect(() => {
        new CognitoStack(app, 'TestCognitoStack', {
          config,
          environment: 'dev',
          env: {
            account: '123456789012',
            region: 'ap-northeast-1',
          },
        });
      }).not.toThrow();
    });

    test('should handle SES configuration for local environment', () => {
      app = new cdk.App();
      const config = getEnvironmentConfig('dev');

      // ローカル環境でもSESが有効になっている場合
      config.cognito.userPool.emailSettings.useSes = true;

      stack = new CognitoStack(app, 'TestCognitoStack', {
        config,
        environment: 'local',
        env: {
          account: '123456789012',
          region: 'ap-northeast-1',
        },
      });

      template = Template.fromStack(stack);

      // ローカル環境ではSES Configuration Setが作成されないことを確認
      template.resourceCountIs('AWS::SES::ConfigurationSet', 0);
    });
  });
});
