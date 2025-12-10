import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ReminderStack } from './reminder-stack';

describe('ReminderStack', () => {
  let app: cdk.App;
  let stack: ReminderStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new ReminderStack(app, 'TestReminderStack', {
      env: {
        account: '123456789012',
        region: 'ap-northeast-1',
      },
      databaseSecretArn: 'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:test-db-secret',
      jwtSecretArn: 'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:test-jwt-secret',
      alertEmail: 'test@example.com',
      fromEmail: 'noreply@goal-mandala.com',
    });
    template = Template.fromStack(stack);
  });

  describe('Lambda Function', () => {
    it('should create Reminder Lambda function with correct configuration', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs18.x',
        Handler: 'reminder.handler',
        Timeout: 300, // 5 minutes
        MemorySize: 512,
        Environment: {
          Variables: Match.objectLike({
            SES_REGION: 'ap-northeast-1',
            FROM_EMAIL: 'noreply@goal-mandala.com',
          }),
        },
      });
    });

    it('should grant Lambda access to Secrets Manager', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: 'secretsmanager:GetSecretValue',
              Resource: Match.arrayWith([
                'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:test-db-secret',
                'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:test-jwt-secret',
              ]),
            }),
          ]),
        },
      });
    });

    it('should grant Lambda permission to send emails via SES', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: ['ses:SendEmail', 'ses:SendRawEmail'],
              Resource: '*',
            }),
          ]),
        },
      });
    });
  });

  describe('EventBridge Rule', () => {
    it('should create EventBridge rule with correct schedule', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        ScheduleExpression: 'cron(0 1 ? * MON-FRI *)',
        State: 'DISABLED', // Disabled in test environment
      });
    });

    it('should target Reminder Lambda function', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Targets: Match.arrayWith([
          Match.objectLike({
            Arn: {
              'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('.*')]),
            },
            RetryPolicy: {
              MaximumRetryAttempts: 2,
            },
          }),
        ]),
      });
    });
  });

  describe('SNS Topic', () => {
    it('should create SNS topic for alerts', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        DisplayName: 'Reminder System Alerts',
      });
    });

    it('should add email subscription to SNS topic', () => {
      template.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'email',
        Endpoint: 'test@example.com',
      });
    });
  });

  describe('CloudWatch Alarms', () => {
    it('should create alarm for Lambda errors', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'Errors',
        Namespace: 'AWS/Lambda',
        Threshold: 5,
        ComparisonOperator: 'GreaterThanThreshold',
      });
    });

    it('should create alarm for Lambda duration', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'Duration',
        Namespace: 'AWS/Lambda',
        Threshold: 240000, // 4 minutes
        ComparisonOperator: 'GreaterThanThreshold',
      });
    });

    it('should create alarm for email failure rate', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        Metrics: Match.arrayWith([
          Match.objectLike({
            Expression: '(failed / (sent + failed)) * 100',
          }),
        ]),
        Threshold: 5,
        ComparisonOperator: 'GreaterThanThreshold',
      });
    });
  });

  describe('CloudWatch Logs', () => {
    it('should create log group with 30-day retention', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 30,
      });
    });
  });

  describe('Outputs', () => {
    it('should export Reminder Function ARN', () => {
      template.hasOutput('ReminderFunctionArn', {
        Description: 'ARN of the Reminder Lambda Function',
      });
    });

    it('should export Reminder Rule ARN', () => {
      template.hasOutput('ReminderRuleArn', {
        Description: 'ARN of the EventBridge Rule',
      });
    });

    it('should export Alert Topic ARN', () => {
      template.hasOutput('AlertTopicArn', {
        Description: 'ARN of the SNS Alert Topic',
      });
    });
  });
});
