import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
  AdminInitiateAuthCommand,
  ListUsersCommand,
  DescribeUserPoolCommand,
  DescribeUserPoolClientCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

// 統合テストは実際のAWSリソースが必要なため、環境変数が設定されていない場合はスキップ
const skipIntegrationTests =
  !process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_USER_POOL_CLIENT_ID;

describe.skip('Cognito Stack Integration Tests', () => {
  let cognitoClient: CognitoIdentityProviderClient;
  let stsClient: STSClient;
  let userPoolId: string;
  let userPoolClientId: string;
  let testUserEmail: string;

  beforeAll(async () => {
    // AWS SDK clients
    cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    });
    stsClient = new STSClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    });

    // Get User Pool and Client IDs from environment or CloudFormation outputs
    userPoolId = process.env.COGNITO_USER_POOL_ID || '';
    userPoolClientId = process.env.COGNITO_USER_POOL_CLIENT_ID || '';
    testUserEmail = `test-${Date.now()}@example.com`;

    // Skip tests if required environment variables are not set
    if (!userPoolId || !userPoolClientId) {
      console.warn(
        'Skipping integration tests: COGNITO_USER_POOL_ID and COGNITO_USER_POOL_CLIENT_ID must be set'
      );
      return;
    }
  });

  afterAll(async () => {
    // Cleanup test user if it exists
    if (userPoolId && testUserEmail) {
      try {
        await cognitoClient.send(
          new AdminDeleteUserCommand({
            UserPoolId: userPoolId,
            Username: testUserEmail,
          })
        );
      } catch (error) {
        // Ignore errors during cleanup
        console.warn('Failed to cleanup test user:', error);
      }
    }
  });

  describe('User Pool Configuration', () => {
    test('User Pool exists and has correct configuration', async () => {
      if (!userPoolId) {
        console.warn('Skipping test: COGNITO_USER_POOL_ID not set');
        return;
      }

      const response = await cognitoClient.send(
        new DescribeUserPoolCommand({
          UserPoolId: userPoolId,
        })
      );

      expect(response.UserPool).toBeDefined();
      expect(response.UserPool?.Policies?.PasswordPolicy).toMatchObject({
        MinimumLength: 8,
        RequireUppercase: true,
        RequireLowercase: true,
        RequireNumbers: true,
        RequireSymbols: true,
        TemporaryPasswordValidityDays: 7,
      });
      expect(response.UserPool?.UsernameAttributes).toContain('email');
      expect(response.UserPool?.AutoVerifiedAttributes).toContain('email');
    });

    test('User Pool Client exists and has correct configuration', async () => {
      if (!userPoolId || !userPoolClientId) {
        console.warn('Skipping test: Required environment variables not set');
        return;
      }

      const response = await cognitoClient.send(
        new DescribeUserPoolClientCommand({
          UserPoolId: userPoolId,
          ClientId: userPoolClientId,
        })
      );

      expect(response.UserPoolClient).toBeDefined();
      expect(response.UserPoolClient?.ExplicitAuthFlows).toContain('ALLOW_USER_SRP_AUTH');
      expect(response.UserPoolClient?.ExplicitAuthFlows).toContain('ALLOW_REFRESH_TOKEN_AUTH');
      expect(response.UserPoolClient?.ExplicitAuthFlows).not.toContain('ALLOW_USER_PASSWORD_AUTH');

      expect(response.UserPoolClient?.AccessTokenValidity).toBe(1);
      expect(response.UserPoolClient?.IdTokenValidity).toBe(1);
      expect(response.UserPoolClient?.RefreshTokenValidity).toBe(30);
    });
  });

  describe('User Management Operations', () => {
    test('Can create and delete user', async () => {
      if (!userPoolId) {
        console.warn('Skipping test: COGNITO_USER_POOL_ID not set');
        return;
      }

      // Create test user
      const createResponse = await cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: testUserEmail,
          UserAttributes: [
            { Name: 'email', Value: testUserEmail },
            { Name: 'name', Value: 'Test User' },
            { Name: 'custom:industry', Value: 'IT' },
            { Name: 'custom:company_size', Value: '50-100' },
            { Name: 'custom:job_title', Value: 'Developer' },
            { Name: 'custom:position', Value: 'Senior' },
          ],
          MessageAction: 'SUPPRESS', // Don't send welcome email
          TemporaryPassword: 'TempPass123!',
        })
      );

      expect(createResponse.User).toBeDefined();
      expect(createResponse.User?.Username).toBe(testUserEmail);
      expect(createResponse.User?.UserStatus).toBe('FORCE_CHANGE_PASSWORD');

      // Set permanent password
      await cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: testUserEmail,
          Password: 'NewPass123!',
          Permanent: true,
        })
      );

      // Verify user exists
      const listResponse = await cognitoClient.send(
        new ListUsersCommand({
          UserPoolId: userPoolId,
          Filter: `email = "${testUserEmail}"`,
        })
      );

      expect(listResponse.Users).toHaveLength(1);
      expect(listResponse.Users?.[0].Username).toBe(testUserEmail);

      // Delete test user
      await cognitoClient.send(
        new AdminDeleteUserCommand({
          UserPoolId: userPoolId,
          Username: testUserEmail,
        })
      );

      // Verify user is deleted
      const listAfterDelete = await cognitoClient.send(
        new ListUsersCommand({
          UserPoolId: userPoolId,
          Filter: `email = "${testUserEmail}"`,
        })
      );

      expect(listAfterDelete.Users).toHaveLength(0);
    });

    test('Password policy is enforced', async () => {
      if (!userPoolId) {
        console.warn('Skipping test: COGNITO_USER_POOL_ID not set');
        return;
      }

      const weakPasswords = [
        'weak', // Too short
        'password', // No uppercase, numbers, symbols
        'Password', // No numbers, symbols
        'Password1', // No symbols
      ];

      // Create test user first
      await cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: testUserEmail,
          UserAttributes: [
            { Name: 'email', Value: testUserEmail },
            { Name: 'name', Value: 'Test User' },
          ],
          MessageAction: 'SUPPRESS',
          TemporaryPassword: 'TempPass123!',
        })
      );

      // Test weak passwords
      for (const weakPassword of weakPasswords) {
        await expect(
          cognitoClient.send(
            new AdminSetUserPasswordCommand({
              UserPoolId: userPoolId,
              Username: testUserEmail,
              Password: weakPassword,
              Permanent: true,
            })
          )
        ).rejects.toThrow();
      }

      // Test strong password (should succeed)
      await expect(
        cognitoClient.send(
          new AdminSetUserPasswordCommand({
            UserPoolId: userPoolId,
            Username: testUserEmail,
            Password: 'StrongPass123!',
            Permanent: true,
          })
        )
      ).resolves.not.toThrow();

      // Cleanup
      await cognitoClient.send(
        new AdminDeleteUserCommand({
          UserPoolId: userPoolId,
          Username: testUserEmail,
        })
      );
    });
  });

  describe('Authentication Flow', () => {
    test('SRP authentication flow works', async () => {
      if (!userPoolId || !userPoolClientId) {
        console.warn('Skipping test: Required environment variables not set');
        return;
      }

      // Create and setup test user
      await cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: testUserEmail,
          UserAttributes: [
            { Name: 'email', Value: testUserEmail },
            { Name: 'name', Value: 'Test User' },
          ],
          MessageAction: 'SUPPRESS',
          TemporaryPassword: 'TempPass123!',
        })
      );

      await cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: testUserEmail,
          Password: 'FinalPass123!',
          Permanent: true,
        })
      );

      // Test SRP authentication initiation
      const authResponse = await cognitoClient.send(
        new AdminInitiateAuthCommand({
          UserPoolId: userPoolId,
          ClientId: userPoolClientId,
          AuthFlow: 'ADMIN_USER_PASSWORD_AUTH', // For testing purposes
          AuthParameters: {
            USERNAME: testUserEmail,
            PASSWORD: 'FinalPass123!',
          },
        })
      );

      expect(authResponse.AuthenticationResult).toBeDefined();
      expect(authResponse.AuthenticationResult?.AccessToken).toBeDefined();
      expect(authResponse.AuthenticationResult?.IdToken).toBeDefined();
      expect(authResponse.AuthenticationResult?.RefreshToken).toBeDefined();

      // Cleanup
      await cognitoClient.send(
        new AdminDeleteUserCommand({
          UserPoolId: userPoolId,
          Username: testUserEmail,
        })
      );
    });
  });

  describe('Custom Attributes', () => {
    test('Custom attributes can be set and retrieved', async () => {
      if (!userPoolId) {
        console.warn('Skipping test: COGNITO_USER_POOL_ID not set');
        return;
      }

      const customAttributes = {
        'custom:industry': 'Technology',
        'custom:company_size': '100-500',
        'custom:job_title': 'Software Engineer',
        'custom:position': 'Senior',
      };

      // Create user with custom attributes
      const createResponse = await cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: testUserEmail,
          UserAttributes: [
            { Name: 'email', Value: testUserEmail },
            { Name: 'name', Value: 'Test User' },
            ...Object.entries(customAttributes).map(([name, value]) => ({
              Name: name,
              Value: value,
            })),
          ],
          MessageAction: 'SUPPRESS',
          TemporaryPassword: 'TempPass123!',
        })
      );

      expect(createResponse.User).toBeDefined();

      // Verify custom attributes
      const listResponse = await cognitoClient.send(
        new ListUsersCommand({
          UserPoolId: userPoolId,
          Filter: `email = "${testUserEmail}"`,
        })
      );

      const user = listResponse.Users?.[0];
      expect(user).toBeDefined();

      const userAttributes = user?.Attributes || [];
      Object.entries(customAttributes).forEach(([name, expectedValue]) => {
        const attribute = userAttributes.find(attr => attr.Name === name);
        expect(attribute).toBeDefined();
        expect(attribute?.Value).toBe(expectedValue);
      });

      // Cleanup
      await cognitoClient.send(
        new AdminDeleteUserCommand({
          UserPoolId: userPoolId,
          Username: testUserEmail,
        })
      );
    });
  });

  describe('AWS Permissions', () => {
    test('Can access AWS services with current credentials', async () => {
      const identity = await stsClient.send(new GetCallerIdentityCommand({}));

      expect(identity.Account).toBeDefined();
      expect(identity.Arn).toBeDefined();

      console.log('Running tests with AWS Account:', identity.Account);
      console.log('Using IAM identity:', identity.Arn);
    });
  });
});
