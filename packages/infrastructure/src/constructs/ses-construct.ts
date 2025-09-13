import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';

export interface SesConstructProps {
  config: EnvironmentConfig;
  environment: string;
}

export class SesConstruct extends Construct {
  public configurationSet?: ses.ConfigurationSet;
  public verifiedDomain?: string;
  public readonly identityArn?: string;

  constructor(scope: Construct, id: string, props: SesConstructProps) {
    super(scope, id);

    const { config, environment } = props;
    const emailSettings = config.cognito.userPool.emailSettings;

    // SESを使用する場合のみ設定を作成
    if (emailSettings.useSes && environment !== 'local') {
      this.createSesConfiguration(config, environment);
    }
  }

  private createSesConfiguration(config: EnvironmentConfig, environment: string): void {
    const emailSettings = config.cognito.userPool.emailSettings;

    // Configuration Set作成（メール送信の統計とイベント追跡用）
    if (emailSettings.sesConfigurationSet) {
      this.configurationSet = new ses.ConfigurationSet(this, 'ConfigurationSet', {
        configurationSetName: emailSettings.sesConfigurationSet,
        sendingEnabled: true,
        suppressionReasons: ses.SuppressionReasons.BOUNCES_AND_COMPLAINTS,
      });

      // イベント発行設定（CloudWatchメトリクス用）
      // 注意: CDK v2では、EventDestinationはCfnレベルで設定する必要があります
      new ses.CfnConfigurationSetEventDestination(this, 'CloudWatchEventDestination', {
        configurationSetName: this.configurationSet.configurationSetName,
        eventDestination: {
          name: 'CloudWatchDestination',
          enabled: true,
          matchingEventTypes: ['send', 'bounce', 'complaint', 'delivery', 'reject'],
          cloudWatchDestination: {
            dimensionConfigurations: [
              {
                dimensionName: 'Environment',
                dimensionValueSource: 'messageTag',
                defaultDimensionValue: environment,
              },
              {
                dimensionName: 'MessageSource',
                dimensionValueSource: 'messageTag',
                defaultDimensionValue: 'cognito',
              },
            ],
          },
        },
      });

      // タグ設定
      if (config.tags) {
        Object.entries(config.tags).forEach(([key, value]) => {
          cdk.Tags.of(this.configurationSet!).add(key, value);
        });
      }

      // SES固有のタグ
      cdk.Tags.of(this.configurationSet).add('Component', 'ses');
      cdk.Tags.of(this.configurationSet).add('Purpose', 'email-delivery');
    }

    // ドメイン検証の設定（手動で行う必要があるため、ここでは情報のみ出力）
    const fromEmailDomain = emailSettings.fromEmail.split('@')[1];
    if (fromEmailDomain) {
      this.verifiedDomain = fromEmailDomain;

      // CloudFormation出力でドメイン検証の手順を案内
      new cdk.CfnOutput(this, 'SesVerificationInstructions', {
        value: `Please verify the domain '${fromEmailDomain}' in SES console before using email features`,
        description: 'SES Domain Verification Instructions',
      });

      new cdk.CfnOutput(this, 'SesFromEmail', {
        value: emailSettings.fromEmail,
        description: 'SES From Email Address',
      });

      if (emailSettings.replyToEmail) {
        new cdk.CfnOutput(this, 'SesReplyToEmail', {
          value: emailSettings.replyToEmail,
          description: 'SES Reply-To Email Address',
        });
      }
    }
  }

  /**
   * SESアクセス用のIAMポリシーステートメントを作成
   */
  public createSesPolicy(): iam.PolicyStatement {
    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
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
      ],
      resources: ['*'], // SESは特定のリソースARNを持たないため
      conditions: this.configurationSet
        ? {
            StringEquals: {
              'ses:configuration-set': this.configurationSet.configurationSetName,
            },
          }
        : undefined,
    });
  }

  /**
   * 環境別のメール送信制限を設定
   */
  private getEmailSendingLimits(environment: string): { dailyLimit: number; rateLimit: number } {
    switch (environment) {
      case 'production':
        return { dailyLimit: 10000, rateLimit: 14 }; // 1日10,000通、毎秒14通
      case 'staging':
        return { dailyLimit: 1000, rateLimit: 5 }; // 1日1,000通、毎秒5通
      case 'development':
        return { dailyLimit: 100, rateLimit: 1 }; // 1日100通、毎秒1通
      default:
        return { dailyLimit: 50, rateLimit: 1 }; // デフォルト制限
    }
  }
}
