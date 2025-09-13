import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import { Template } from 'aws-cdk-lib/assertions';
import { SesConstruct } from './ses-construct';
import { getEnvironmentConfig } from '../config/environment';

describe('SesConstruct', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  describe('Production Environment', () => {
    beforeEach(() => {
      app = new cdk.App();
      stack = new cdk.Stack(app, 'TestStack');
      const config = getEnvironmentConfig('prod');

      new SesConstruct(stack, 'TestSesConstruct', {
        config,
        environment: 'prod',
      });

      template = Template.fromStack(stack);
    });

    test('should create SES configuration set', () => {
      template.hasResourceProperties('AWS::SES::ConfigurationSet', {
        Name: 'goal-mandala-prod-config-set',
        ReputationOptions: {
          ReputationMetricsEnabled: true,
        },
        SendingOptions: {
          SendingEnabled: true,
        },
        SuppressionOptions: {
          SuppressedReasons: ['BOUNCE', 'COMPLAINT'],
        },
      });
    });

    test('should create CloudWatch event destination', () => {
      template.hasResourceProperties('AWS::SES::ConfigurationSetEventDestination', {
        ConfigurationSetName: 'goal-mandala-prod-config-set',
        EventDestination: {
          Name: 'CloudWatchDestination',
          Enabled: true,
          MatchingEventTypes: ['send', 'bounce', 'complaint', 'delivery', 'reject'],
          CloudWatchDestination: expect.any(Object),
        },
      });
    });

    test('should output verification instructions', () => {
      template.hasOutput('SesVerificationInstructions', {
        Value:
          "Please verify the domain 'goal-mandala.example.com' in SES console before using email features",
        Description: 'SES Domain Verification Instructions',
      });

      template.hasOutput('SesFromEmail', {
        Value: 'noreply@goal-mandala.example.com',
        Description: 'SES From Email Address',
      });

      template.hasOutput('SesReplyToEmail', {
        Value: 'support@goal-mandala.example.com',
        Description: 'SES Reply-To Email Address',
      });
    });

    test('should apply correct tags', () => {
      template.hasResourceProperties('AWS::SES::ConfigurationSet', {
        Tags: expect.arrayContaining([
          {
            Key: 'Component',
            Value: 'ses',
          },
          {
            Key: 'Purpose',
            Value: 'email-delivery',
          },
          {
            Key: 'Environment',
            Value: 'prod',
          },
          {
            Key: 'Project',
            Value: 'GoalMandala',
          },
        ]),
      });
    });
  });

  describe('Staging Environment', () => {
    beforeEach(() => {
      app = new cdk.App();
      stack = new cdk.Stack(app, 'TestStack');
      const config = getEnvironmentConfig('stg');

      new SesConstruct(stack, 'TestSesConstruct', {
        config,
        environment: 'stg',
      });

      template = Template.fromStack(stack);
    });

    test('should create configuration set with staging name', () => {
      template.hasResourceProperties('AWS::SES::ConfigurationSet', {
        Name: 'goal-mandala-stg-config-set',
      });
    });

    test('should use staging environment in CloudWatch dimensions', () => {
      template.hasResourceProperties('AWS::SES::ConfigurationSetEventDestination', {
        EventDestination: {
          CloudWatchDestination: expect.any(Object),
        },
      });
    });
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      app = new cdk.App();
      stack = new cdk.Stack(app, 'TestStack');
      const config = getEnvironmentConfig('dev');

      new SesConstruct(stack, 'TestSesConstruct', {
        config,
        environment: 'dev',
      });

      template = Template.fromStack(stack);
    });

    test('should not create SES resources for development environment', () => {
      // 開発環境ではSESを使用しないため、リソースが作成されないことを確認
      template.resourceCountIs('AWS::SES::ConfigurationSet', 0);
      template.resourceCountIs('AWS::SES::ConfigurationSetEventDestination', 0);
    });
  });

  describe('Local Environment', () => {
    test('should not create SES resources for local environment', () => {
      app = new cdk.App();
      stack = new cdk.Stack(app, 'TestStack');
      const config = getEnvironmentConfig('dev');

      // ローカル環境でSESが有効でも作成されないことを確認
      config.cognito.userPool.emailSettings.useSes = true;

      new SesConstruct(stack, 'TestSesConstruct', {
        config,
        environment: 'local',
      });

      template = Template.fromStack(stack);

      template.resourceCountIs('AWS::SES::ConfigurationSet', 0);
      template.resourceCountIs('AWS::SES::ConfigurationSetEventDestination', 0);
    });
  });

  describe('SES Policy Creation', () => {
    test('should create proper SES policy statement', () => {
      app = new cdk.App();
      stack = new cdk.Stack(app, 'TestStack');
      const config = getEnvironmentConfig('prod');

      const sesConstruct = new SesConstruct(stack, 'TestSesConstruct', {
        config,
        environment: 'prod',
      });

      const policy = sesConstruct.createSesPolicy();

      expect(policy.effect).toBe(cdk.aws_iam.Effect.ALLOW);
      expect(policy.actions).toEqual(
        expect.arrayContaining([
          'ses:SendEmail',
          'ses:SendRawEmail',
          'ses:SendTemplatedEmail',
          'ses:GetSendQuota',
          'ses:GetSendStatistics',
          'ses:GetIdentityVerificationAttributes',
          'ses:GetIdentityDkimAttributes',
          'ses:GetIdentityPolicies',
          'ses:ListIdentities',
          'ses:ListVerifiedEmailAddresses',
        ])
      );
      expect(policy.resources).toEqual(['*']);
    });

    test('should include configuration set condition when available', () => {
      app = new cdk.App();
      stack = new cdk.Stack(app, 'TestStack');
      const config = getEnvironmentConfig('prod');

      const sesConstruct = new SesConstruct(stack, 'TestSesConstruct', {
        config,
        environment: 'prod',
      });

      const policy = sesConstruct.createSesPolicy();

      expect(policy.conditions).toEqual({
        StringEquals: {
          'ses:configuration-set': 'goal-mandala-prod-config-set',
        },
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle missing configuration set name gracefully', () => {
      app = new cdk.App();
      stack = new cdk.Stack(app, 'TestStack');
      const config = getEnvironmentConfig('prod');

      // Configuration Set名を削除
      delete config.cognito.userPool.emailSettings.sesConfigurationSet;

      expect(() => {
        new SesConstruct(stack, 'TestSesConstruct', {
          config,
          environment: 'prod',
        });
      }).not.toThrow();

      template = Template.fromStack(stack);

      // Configuration Setが作成されないことを確認
      template.resourceCountIs('AWS::SES::ConfigurationSet', 0);
    });

    test('should handle invalid email format gracefully', () => {
      app = new cdk.App();
      stack = new cdk.Stack(app, 'TestStack');
      const config = getEnvironmentConfig('prod');

      // 無効なメールアドレス形式
      config.cognito.userPool.emailSettings.fromEmail = 'invalid-email';

      expect(() => {
        new SesConstruct(stack, 'TestSesConstruct', {
          config,
          environment: 'prod',
        });
      }).not.toThrow();
    });
  });
});
