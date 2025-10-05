import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/environment';
import { SesConstruct } from '../constructs/ses-construct';

export interface CognitoStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
  environment: string;
}

export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;
  public readonly lambdaRole: iam.Role;
  public readonly sesConstruct?: SesConstruct;

  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);

    const { config, environment } = props;

    // SES設定作成（User Pool作成前に必要）
    if (config.cognito.userPool.emailSettings.useSes && environment !== 'local') {
      this.sesConstruct = new SesConstruct(this, 'SesConstruct', {
        config,
        environment,
      });
    }

    // User Pool作成
    this.userPool = this.createUserPool(config, environment);

    // User Pool Client作成
    this.userPoolClient = this.createUserPoolClient(config);

    // User Pool Domain作成
    this.userPoolDomain = this.createUserPoolDomain(config);

    // Lambda用IAMロール作成
    this.lambdaRole = this.createLambdaRole(config, environment);

    // CloudFormation出力
    this.createOutputs(config);

    // タグ設定
    this.applyTags(config);
  }

  private createUserPool(config: EnvironmentConfig, environment: string): cognito.UserPool {
    const userPoolConfig = config.cognito.userPool;

    // パスワードポリシー設定
    const passwordPolicy: cognito.PasswordPolicy = {
      minLength: userPoolConfig.passwordPolicy.minLength,
      requireLowercase: userPoolConfig.passwordPolicy.requireLowercase,
      requireUppercase: userPoolConfig.passwordPolicy.requireUppercase,
      requireDigits: userPoolConfig.passwordPolicy.requireNumbers,
      requireSymbols: userPoolConfig.passwordPolicy.requireSymbols,
      tempPasswordValidity: cdk.Duration.days(
        userPoolConfig.passwordPolicy.tempPasswordValidityDays
      ),
    };

    // 標準属性設定
    const standardAttributes: cognito.StandardAttributes = {
      email: {
        required: userPoolConfig.standardAttributes.email.required,
        mutable: userPoolConfig.standardAttributes.email.mutable,
      },
      fullname: {
        required: userPoolConfig.standardAttributes.name.required,
        mutable: userPoolConfig.standardAttributes.name.mutable,
      },
    };

    // カスタム属性設定
    const customAttributes: Record<string, cognito.ICustomAttribute> = {
      industry: new cognito.StringAttribute({
        mutable: userPoolConfig.customAttributes.industry.mutable,
      }),
      company_size: new cognito.StringAttribute({
        mutable: userPoolConfig.customAttributes.company_size.mutable,
      }),
      job_title: new cognito.StringAttribute({
        mutable: userPoolConfig.customAttributes.job_title.mutable,
      }),
      position: new cognito.StringAttribute({
        mutable: userPoolConfig.customAttributes.position.mutable,
      }),
    };

    // 自動検証設定
    const autoVerify: cognito.AutoVerifiedAttrs = {
      email: userPoolConfig.autoVerify.includes('email'),
      phone: userPoolConfig.autoVerify.includes('phone_number'),
    };

    // アカウント復旧設定
    const accountRecovery = userPoolConfig.accountRecovery.includes('verified_email')
      ? cognito.AccountRecovery.EMAIL_ONLY
      : cognito.AccountRecovery.NONE;

    // セキュリティ設定のデフォルト値
    const securityConfig = userPoolConfig.security || {
      enableAdvancedSecurity: false,
      enableCompromisedCredentialsCheck: false,
      enableRiskBasedAccessControl: false,
      mfaConfiguration: 'OFF',
      mfaTypes: [],
      deviceConfiguration: {
        challengeRequiredOnNewDevice: false,
        deviceOnlyRememberedOnUserPrompt: false,
      },
      userInvitation: {
        emailSubject: 'Goal Mandala - アカウント作成のご案内',
        emailMessage:
          'Goal Mandalaへようこそ！\n\nユーザー名: {username}\n一時パスワード: {####}\n\n初回ログイン時にパスワードの変更が必要です。',
        smsMessage: 'Goal Mandala - ユーザー名: {username} 一時パスワード: {####}',
      },
      verification: {
        emailSubject: 'Goal Mandala - メールアドレス確認',
        emailMessage: 'Goal Mandalaのメールアドレス確認コード: {####}',
        smsMessage: 'Goal Mandala確認コード: {####}',
      },
    };

    // MFA設定
    let mfaConfiguration: cognito.Mfa;
    switch (securityConfig.mfaConfiguration) {
      case 'REQUIRED':
        mfaConfiguration = cognito.Mfa.REQUIRED;
        break;
      case 'OPTIONAL':
        mfaConfiguration = cognito.Mfa.OPTIONAL;
        break;
      default:
        mfaConfiguration = cognito.Mfa.OFF;
    }

    // MFAの種類設定
    const mfaSecondFactor: cognito.MfaSecondFactor = {
      sms: securityConfig.mfaTypes.includes('SMS'),
      otp: securityConfig.mfaTypes.includes('SOFTWARE_TOKEN'),
    };

    // デバイス設定
    const deviceTracking: cognito.DeviceTracking = {
      challengeRequiredOnNewDevice: securityConfig.deviceConfiguration.challengeRequiredOnNewDevice,
      deviceOnlyRememberedOnUserPrompt:
        securityConfig.deviceConfiguration.deviceOnlyRememberedOnUserPrompt,
    };

    // User Pool作成
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${config.stackPrefix}-user-pool`,
      passwordPolicy,
      standardAttributes,
      customAttributes,
      selfSignUpEnabled: userPoolConfig.selfSignUpEnabled,
      autoVerify,
      accountRecovery,
      deletionProtection: userPoolConfig.deletionProtection,
      signInAliases: {
        email: true,
        username: false,
        phone: false,
      },
      signInCaseSensitive: false,
      mfa: mfaConfiguration,
      mfaSecondFactor,
      deviceTracking,
      // メール設定
      email: this.createEmailConfiguration(userPoolConfig.emailSettings, environment),
      removalPolicy: userPoolConfig.deletionProtection
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    });

    // CfnUserPoolを取得して詳細設定を行う
    const cfnUserPool = userPool.node.defaultChild as cognito.CfnUserPool;

    // MFA設定の詳細設定
    if (mfaConfiguration !== cognito.Mfa.OFF) {
      const enabledMfas: string[] = [];
      if (securityConfig.mfaTypes.includes('SMS')) {
        enabledMfas.push('SMS_MFA');
      }
      if (securityConfig.mfaTypes.includes('SOFTWARE_TOKEN')) {
        enabledMfas.push('SOFTWARE_TOKEN_MFA');
      }

      if (enabledMfas.length > 0) {
        cfnUserPool.enabledMfas = enabledMfas;
      }
    }

    // 高度なセキュリティ機能の設定
    if (securityConfig.enableAdvancedSecurity) {
      cfnUserPool.userPoolAddOns = {
        advancedSecurityMode: 'ENFORCED',
      };
    }

    // カスタムメールテンプレートの設定
    this.applyCustomEmailTemplates(cfnUserPool, userPoolConfig.emailSettings, securityConfig);

    return userPool;
  }

  private createEmailConfiguration(
    emailSettings: Record<string, unknown>,
    environment: string
  ): cognito.UserPoolEmail {
    // SESを使用する場合とCognito標準メールを使用する場合を分ける
    if (emailSettings.useSes && environment !== 'local') {
      // SES設定（本番・ステージング環境）
      return cognito.UserPoolEmail.withSES({
        fromEmail: emailSettings.fromEmail as string,
        fromName: emailSettings.fromName as string,
        replyTo: emailSettings.replyToEmail as string,
        configurationSetName: emailSettings.sesConfigurationSet as string | undefined,
      });
    } else {
      // Cognito標準メール設定（開発・ローカル環境）
      return cognito.UserPoolEmail.withCognito(emailSettings.fromEmail as string);
    }
  }

  private applyCustomEmailTemplates(
    cfnUserPool: cognito.CfnUserPool,
    emailSettings: Record<string, unknown>,
    securityConfig: Record<string, unknown>
  ): void {
    // 型安全なアクセスのためのヘルパー関数
    const getNestedValue = (obj: Record<string, unknown>, path: string[]): string => {
      let current: Record<string, unknown> | unknown = obj;
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          return '';
        }
      }
      return typeof current === 'string' ? current : '';
    };

    // カスタムテンプレートが設定されている場合は使用、そうでなければセキュリティ設定のデフォルトを使用
    const templates = emailSettings.customTemplates as
      | Record<string, Record<string, unknown>>
      | undefined;

    if (templates?.verification) {
      // メール確認テンプレート
      if (templates.verification.emailSubject) {
        cfnUserPool.emailVerificationSubject = templates.verification.emailSubject;
      } else {
        cfnUserPool.emailVerificationSubject = getNestedValue(securityConfig, [
          'verification',
          'emailSubject',
        ]);
      }

      if (templates.verification.emailMessage) {
        cfnUserPool.emailVerificationMessage = templates.verification.emailMessage;
      } else {
        cfnUserPool.emailVerificationMessage = getNestedValue(securityConfig, [
          'verification',
          'emailMessage',
        ]);
      }

      // リンクベースの確認メッセージ（オプション）
      if (templates.verification.emailMessageByLink) {
        cfnUserPool.verificationMessageTemplate = {
          emailMessage:
            templates.verification.emailMessage ||
            getNestedValue(securityConfig, ['verification', 'emailMessage']),
          emailMessageByLink: templates.verification.emailMessageByLink,
          emailSubject:
            templates.verification.emailSubject ||
            getNestedValue(securityConfig, ['verification', 'emailSubject']),
          emailSubjectByLink:
            templates.verification.emailSubject ||
            getNestedValue(securityConfig, ['verification', 'emailSubject']),
          smsMessage: getNestedValue(securityConfig, ['verification', 'smsMessage']),
          defaultEmailOption: 'CONFIRM_WITH_CODE', // デフォルトはコード確認
        };
      }
    } else {
      // デフォルトの検証メッセージ設定
      cfnUserPool.emailVerificationSubject = getNestedValue(securityConfig, [
        'verification',
        'emailSubject',
      ]);
      cfnUserPool.emailVerificationMessage = getNestedValue(securityConfig, [
        'verification',
        'emailMessage',
      ]);
    }

    // SMS確認メッセージ（常にセキュリティ設定から）
    cfnUserPool.smsVerificationMessage = getNestedValue(securityConfig, [
      'verification',
      'smsMessage',
    ]);

    // 招待メッセージテンプレート
    if (templates?.invitation) {
      if (templates.invitation.emailSubject && templates.invitation.emailMessage) {
        cfnUserPool.adminCreateUserConfig = {
          ...cfnUserPool.adminCreateUserConfig,
          inviteMessageTemplate: {
            emailMessage: templates.invitation.emailMessage,
            emailSubject: templates.invitation.emailSubject,
            smsMessage: getNestedValue(securityConfig, ['userInvitation', 'smsMessage']),
          },
        };
      }
    } else {
      // デフォルトの招待メッセージ設定
      cfnUserPool.adminCreateUserConfig = {
        ...cfnUserPool.adminCreateUserConfig,
        inviteMessageTemplate: {
          emailMessage: getNestedValue(securityConfig, ['userInvitation', 'emailMessage']),
          emailSubject: getNestedValue(securityConfig, ['userInvitation', 'emailSubject']),
          smsMessage: getNestedValue(securityConfig, ['userInvitation', 'smsMessage']),
        },
      };
    }

    // パスワードリセットメッセージは、Cognitoの制限により直接設定できないため、
    // Lambda Triggerを使用する必要がある（将来の実装で対応）
    if (templates?.forgotPassword) {
      // 注意: パスワードリセットのカスタムメッセージは、
      // CustomMessage Lambda Triggerを使用して実装する必要があります
      console.warn('Custom forgot password templates require Lambda Trigger implementation');
    }
  }

  private createUserPoolClient(config: EnvironmentConfig): cognito.UserPoolClient {
    const clientConfig = config.cognito.userPoolClient;

    // 認証フロー設定
    const authFlows: cognito.AuthFlow = {
      userSrp: clientConfig.authFlows.allowUserSrpAuth,
      userPassword: clientConfig.authFlows.allowUserPasswordAuth,
      adminUserPassword: clientConfig.authFlows.allowAdminUserPasswordAuth || false,
      custom: clientConfig.authFlows.allowCustomAuth || false,
    };

    // OAuth設定
    const oAuthFlows = clientConfig.oAuth.flows || {
      authorizationCodeGrant: true,
      implicitCodeGrant: false,
      clientCredentials: false,
    };

    const oAuth: cognito.OAuthSettings = {
      flows: {
        authorizationCodeGrant: oAuthFlows.authorizationCodeGrant,
        implicitCodeGrant: oAuthFlows.implicitCodeGrant,
        clientCredentials: oAuthFlows.clientCredentials,
      },
      scopes: clientConfig.oAuth.scopes.map(scope => {
        switch (scope) {
          case 'openid':
            return cognito.OAuthScope.OPENID;
          case 'email':
            return cognito.OAuthScope.EMAIL;
          case 'profile':
            return cognito.OAuthScope.PROFILE;
          case 'phone':
            return cognito.OAuthScope.PHONE;
          case 'aws.cognito.signin.user.admin':
            return cognito.OAuthScope.COGNITO_ADMIN;
          default:
            throw new Error(`Invalid OAuth scope: ${scope}`);
        }
      }),
      callbackUrls: clientConfig.oAuth.callbackUrls,
      logoutUrls: clientConfig.oAuth.logoutUrls,
    };

    // トークン有効期限設定
    const accessTokenValidity = cdk.Duration.minutes(clientConfig.tokenValidity.accessToken);
    const idTokenValidity = cdk.Duration.minutes(clientConfig.tokenValidity.idToken);
    const refreshTokenValidity = cdk.Duration.minutes(clientConfig.tokenValidity.refreshToken);

    // サポートされているアイデンティティプロバイダー
    const supportedIdentityProviders = (clientConfig.supportedIdentityProviders || ['COGNITO']).map(
      provider => {
        switch (provider) {
          case 'COGNITO':
            return cognito.UserPoolClientIdentityProvider.COGNITO;
          default:
            throw new Error(`Unsupported identity provider: ${provider}`);
        }
      }
    );

    // 読み取り属性と書き込み属性は、CfnUserPoolClientで直接設定する方が簡単
    // CDKの高レベルAPIでは複雑になるため、後でCfnレベルで設定

    // User Pool Client作成
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `${config.stackPrefix}-user-pool-client`,
      authFlows,
      oAuth,
      accessTokenValidity,
      idTokenValidity,
      refreshTokenValidity,
      preventUserExistenceErrors: clientConfig.preventUserExistenceErrors,
      enableTokenRevocation: clientConfig.enableTokenRevocation,
      generateSecret: clientConfig.generateSecret || false,
      supportedIdentityProviders,
    });

    // CfnUserPoolClientを取得して詳細設定を行う
    const cfnUserPoolClient = userPoolClient.node.defaultChild as cognito.CfnUserPoolClient;

    // 明示的な認証フローの設定
    if (clientConfig.explicitAuthFlows) {
      cfnUserPoolClient.explicitAuthFlows = clientConfig.explicitAuthFlows;
    }

    // 読み取り属性の設定
    if (clientConfig.readAttributes) {
      cfnUserPoolClient.readAttributes = clientConfig.readAttributes;
    }

    // 書き込み属性の設定
    if (clientConfig.writeAttributes) {
      cfnUserPoolClient.writeAttributes = clientConfig.writeAttributes;
    }

    // 追加のユーザーコンテキストデータの伝播設定
    if (clientConfig.enablePropagateAdditionalUserContextData !== undefined) {
      cfnUserPoolClient.enablePropagateAdditionalUserContextData =
        clientConfig.enablePropagateAdditionalUserContextData;
    }

    // 認証セッションの有効期限設定
    if (clientConfig.authSessionValidity !== undefined) {
      cfnUserPoolClient.authSessionValidity = clientConfig.authSessionValidity;
    }

    return userPoolClient;
  }

  private createUserPoolDomain(config: EnvironmentConfig): cognito.UserPoolDomain {
    // User Pool Domain作成（OAuth認証に必要）
    const userPoolDomain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix: `${config.stackPrefix}-auth`,
      },
    });

    return userPoolDomain;
  }

  private createLambdaRole(config: EnvironmentConfig, environment: string): iam.Role {
    const iamConfig = config.cognito.iam?.lambdaRole;

    // Lambda実行用IAMロール作成
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: `${config.stackPrefix}-cognito-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: `Lambda execution role for Cognito operations in ${environment} environment`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // 詳細ログ設定（開発環境でのみ有効）
    if (iamConfig?.enableDetailedLogging) {
      const detailedLogsPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogGroups',
          'logs:DescribeLogStreams',
        ],
        resources: ['*'],
      });
      lambdaRole.addToPolicy(detailedLogsPolicy);
    }

    // Cognitoアクセス用ポリシーの作成（環境別設定に基づく）
    this.addCognitoPermissions(lambdaRole, config, iamConfig);

    // 追加ポリシーの設定
    this.addAdditionalPolicies(lambdaRole, config, iamConfig);

    // リソース制限の適用
    this.applyResourceRestrictions(lambdaRole, config, iamConfig);

    return lambdaRole;
  }

  private addCognitoPermissions(
    lambdaRole: iam.Role,
    config: EnvironmentConfig,
    iamConfig?: Record<string, unknown>
  ): void {
    // 型安全なアクセスのためのヘルパー関数
    const getNestedBoolean = (
      obj: Record<string, unknown> | undefined,
      path: string[]
    ): boolean => {
      if (!obj) return false;
      let current: Record<string, unknown> | unknown = obj;
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key as keyof typeof current];
        } else {
          return false;
        }
      }
      return typeof current === 'boolean' ? current : false;
    };

    const getNestedArray = (obj: Record<string, unknown> | undefined, path: string[]): string[] => {
      if (!obj) return [];
      let current: Record<string, unknown> | unknown = obj;
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key as keyof typeof current];
        } else {
          return [];
        }
      }
      return Array.isArray(current) ? current : [];
    };

    const cognitoPermissions = iamConfig?.cognitoPermissions as Record<string, unknown> | undefined;
    const allActions: string[] = [];

    // ユーザー操作権限
    if (getNestedBoolean(cognitoPermissions, ['userOperations', 'enabled'])) {
      allActions.push(...getNestedArray(cognitoPermissions, ['userOperations', 'actions']));
    }

    // グループ操作権限
    if (getNestedBoolean(cognitoPermissions, ['groupOperations', 'enabled'])) {
      allActions.push(...getNestedArray(cognitoPermissions, ['groupOperations', 'actions']));
    }

    // 認証操作権限
    if (getNestedBoolean(cognitoPermissions, ['authOperations', 'enabled'])) {
      allActions.push(...getNestedArray(cognitoPermissions, ['authOperations', 'actions']));
    }

    // 管理者操作権限（本番環境では無効）
    if (getNestedBoolean(cognitoPermissions, ['adminOperations', 'enabled'])) {
      allActions.push(...getNestedArray(cognitoPermissions, ['adminOperations', 'actions']));
    }

    // 重複を除去してポリシーを作成
    if (allActions.length > 0) {
      const uniqueActions = [...new Set(allActions)];

      const cognitoPolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: uniqueActions,
        resources: [this.userPool.userPoolArn],
        conditions: getNestedBoolean(iamConfig, [
          'resourceRestrictions',
          'enableResourceBasedAccess',
        ])
          ? {
              StringEquals: {
                'cognito-idp:UserPoolId': this.userPool.userPoolId,
              },
            }
          : undefined,
      });

      lambdaRole.addToPolicy(cognitoPolicy);
    }
  }

  private addAdditionalPolicies(
    lambdaRole: iam.Role,
    config: EnvironmentConfig,
    iamConfig?: Record<string, unknown>
  ): void {
    // 型安全なアクセスのためのヘルパー関数
    const getNestedBoolean = (
      obj: Record<string, unknown> | undefined,
      path: string[]
    ): boolean => {
      if (!obj) return false;
      let current: Record<string, unknown> | unknown = obj;
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key as keyof typeof current];
        } else {
          return false;
        }
      }
      return typeof current === 'boolean' ? current : false;
    };

    const getNestedArray = (obj: Record<string, unknown> | undefined, path: string[]): string[] => {
      if (!obj) return [];
      let current: Record<string, unknown> | unknown = obj;
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key as keyof typeof current];
        } else {
          return [];
        }
      }
      return Array.isArray(current) ? current : [];
    };

    const additionalPolicies = iamConfig?.additionalPolicies as Record<string, unknown> | undefined;

    // SESアクセス権限
    if (getNestedBoolean(additionalPolicies, ['sesAccess', 'enabled']) && this.sesConstruct) {
      const sesActions = getNestedArray(additionalPolicies, ['sesAccess', 'actions']);
      if (sesActions.length > 0) {
        const sesPolicy = new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: sesActions,
          resources: ['*'], // SESは特定のリソースARNを持たないため
          conditions: this.sesConstruct.configurationSet
            ? {
                StringEquals: {
                  'ses:configuration-set': this.sesConstruct.configurationSet.configurationSetName,
                },
              }
            : undefined,
        });
        lambdaRole.addToPolicy(sesPolicy);
      }
    } else if (getNestedBoolean(additionalPolicies, ['sesAccess', 'enabled'])) {
      // SESコンストラクトが存在しない場合でも、SESアクセスが有効な場合は基本的なポリシーを追加
      const sesActions = getNestedArray(additionalPolicies, ['sesAccess', 'actions']);
      if (sesActions.length > 0) {
        const sesPolicy = new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: sesActions,
          resources: ['*'],
        });
        lambdaRole.addToPolicy(sesPolicy);
      }
    }

    // Secrets Managerアクセス権限
    if (getNestedBoolean(additionalPolicies, ['secretsManagerAccess', 'enabled'])) {
      const secretsActions = getNestedArray(additionalPolicies, [
        'secretsManagerAccess',
        'actions',
      ]);
      if (secretsActions.length > 0) {
        const allowedSecretArns = getNestedArray(iamConfig, [
          'resourceRestrictions',
          'allowedSecretArns',
        ]);
        const finalSecretArns = allowedSecretArns.length > 0 ? allowedSecretArns : ['*'];

        const secretsPolicy = new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: secretsActions,
          resources: finalSecretArns.map((arn: string) =>
            arn === '*' ? `arn:aws:secretsmanager:${this.region}:${this.account}:secret:*` : arn
          ),
        });
        lambdaRole.addToPolicy(secretsPolicy);
      }
    }

    // CloudWatch Logsアクセス権限
    if (getNestedBoolean(additionalPolicies, ['logsAccess', 'enabled'])) {
      const logsActions = getNestedArray(additionalPolicies, ['logsAccess', 'actions']);
      if (logsActions.length > 0) {
        const logsPolicy = new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: logsActions,
          resources: [
            `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${config.stackPrefix}-*`,
          ],
        });
        lambdaRole.addToPolicy(logsPolicy);
      }
    }
  }

  private applyResourceRestrictions(
    lambdaRole: iam.Role,
    config: EnvironmentConfig,
    iamConfig?: Record<string, unknown>
  ): void {
    // 型安全なアクセスのためのヘルパー関数
    const getNestedBoolean = (
      obj: Record<string, unknown> | undefined,
      path: string[]
    ): boolean => {
      if (!obj) return false;
      let current: Record<string, unknown> | unknown = obj;
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key as keyof typeof current];
        } else {
          return false;
        }
      }
      return typeof current === 'boolean' ? current : false;
    };

    const getNestedArray = (obj: Record<string, unknown> | undefined, path: string[]): string[] => {
      if (!obj) return [];
      let current: Record<string, unknown> | unknown = obj;
      for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key as keyof typeof current];
        } else {
          return [];
        }
      }
      return Array.isArray(current) ? current : [];
    };

    const resourceRestrictions = iamConfig?.resourceRestrictions as
      | Record<string, unknown>
      | undefined;

    if (getNestedBoolean(resourceRestrictions, ['enableResourceBasedAccess'])) {
      // リソースベースのアクセス制御が有効な場合、追加の制限を適用

      // User Pool ARNの制限
      const allowedUserPoolArns = getNestedArray(resourceRestrictions, ['allowedUserPoolArns']);
      const finalUserPoolArns = allowedUserPoolArns.length > 0 ? allowedUserPoolArns : ['*'];

      if (!finalUserPoolArns.includes('*')) {
        // 特定のUser Poolのみアクセス可能にする場合の追加制限
        const restrictionPolicy = new iam.PolicyStatement({
          effect: iam.Effect.DENY,
          actions: ['cognito-idp:*'],
          resources: ['*'],
          conditions: {
            StringNotEquals: {
              'cognito-idp:UserPoolId': allowedUserPoolArns
                .map((arn: string) => arn.split('/').pop() || '')
                .filter((id: string) => id !== ''),
            },
          },
        });
        lambdaRole.addToPolicy(restrictionPolicy);
      }
    }

    // 環境固有のタグ付け
    cdk.Tags.of(lambdaRole).add('Environment', config.environment || 'unknown');
    cdk.Tags.of(lambdaRole).add('Component', 'cognito-lambda-role');
    cdk.Tags.of(lambdaRole).add(
      'SecurityLevel',
      resourceRestrictions?.enableResourceBasedAccess ? 'restricted' : 'standard'
    );
  }

  private createOutputs(config: EnvironmentConfig): void {
    // User Pool ID出力
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${this.stackName}-UserPoolId`,
    });

    // User Pool ARN出力
    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
      exportName: `${this.stackName}-UserPoolArn`,
    });

    // User Pool Client ID出力
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${this.stackName}-UserPoolClientId`,
    });

    // User Pool Domain出力
    new cdk.CfnOutput(this, 'UserPoolDomainOutput', {
      value: this.userPoolDomain.domainName,
      description: 'Cognito User Pool Domain',
      exportName: `${this.stackName}-UserPoolDomain`,
    });

    // User Pool Domain Base URL出力
    new cdk.CfnOutput(this, 'UserPoolDomainBaseUrlOutput', {
      value: `https://${this.userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      description: 'Cognito User Pool Domain Base URL',
      exportName: `${this.stackName}-UserPoolDomainBaseUrl`,
    });

    // Lambda Role ARN出力
    new cdk.CfnOutput(this, 'LambdaRoleArn', {
      value: this.lambdaRole.roleArn,
      description: 'Lambda execution role ARN for Cognito operations',
      exportName: `${this.stackName}-LambdaRoleArn`,
    });

    // SES Configuration Set出力（存在する場合）
    if (this.sesConstruct?.configurationSet) {
      new cdk.CfnOutput(this, 'SesConfigurationSet', {
        value: this.sesConstruct.configurationSet.configurationSetName,
        description: 'SES Configuration Set Name',
        exportName: `${this.stackName}-SesConfigurationSet`,
      });
    }

    // メール設定情報出力
    const emailSettings = config.cognito.userPool.emailSettings;
    new cdk.CfnOutput(this, 'EmailProvider', {
      value: emailSettings.useSes ? 'SES' : 'Cognito',
      description: 'Email provider used for Cognito notifications',
    });

    new cdk.CfnOutput(this, 'FromEmailAddress', {
      value: emailSettings.fromEmail,
      description: 'From email address for Cognito notifications',
    });
  }

  private applyTags(config: EnvironmentConfig): void {
    // 共通タグの適用
    if (config.tags) {
      Object.entries(config.tags).forEach(([key, value]) => {
        cdk.Tags.of(this).add(key, value);
      });
    }

    // Cognito固有のタグ適用
    if (config.cognito.tags) {
      Object.entries(config.cognito.tags).forEach(([key, value]) => {
        cdk.Tags.of(this).add(key, value);
      });
    }

    // リソース固有のタグ
    cdk.Tags.of(this.userPool).add('ResourceType', 'UserPool');
    cdk.Tags.of(this.userPoolClient).add('ResourceType', 'UserPoolClient');
    cdk.Tags.of(this.userPoolDomain).add('ResourceType', 'UserPoolDomain');
    cdk.Tags.of(this.lambdaRole).add('ResourceType', 'IAMRole');
  }
}
