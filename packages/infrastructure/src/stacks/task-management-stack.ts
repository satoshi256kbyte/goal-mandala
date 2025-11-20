import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';

export interface TaskManagementStackProps extends StackProps {
  environment: string;
  databaseSecretArn: string;
  vpcId?: string;
  subnetIds?: string[];
}

export class TaskManagementStack extends Stack {
  public readonly taskApi: apigateway.RestApi;
  public readonly taskFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: TaskManagementStackProps) {
    super(scope, id, props);

    // Lambda execution role
    const taskLambdaRole = new iam.Role(this, 'TaskLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'),
      ],
      inlinePolicies: {
        TaskManagementPolicy: new iam.PolicyDocument({
          statements: [
            // Secrets Manager access
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['secretsmanager:GetSecretValue'],
              resources: [props.databaseSecretArn],
            }),
            // SES access for notifications
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['ses:SendEmail', 'ses:SendRawEmail'],
              resources: ['*'],
            }),
            // EventBridge access for scheduling
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'events:PutRule',
                'events:DeleteRule',
                'events:PutTargets',
                'events:RemoveTargets',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Task Management Lambda Function
    this.taskFunction = new lambda.Function(this, 'TaskFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'task-management.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      role: taskLambdaRole,
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: {
        NODE_ENV: props.environment,
        DATABASE_SECRET_ARN: props.databaseSecretArn,
        AWS_REGION: this.region,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // API Gateway
    this.taskApi = new apigateway.RestApi(this, 'TaskApi', {
      restApiName: `goal-mandala-task-api-${props.environment}`,
      description: 'Task Management API for Goal Mandala',
      deployOptions: {
        stageName: props.environment,
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Lambda integration
    const taskIntegration = new apigateway.LambdaIntegration(this.taskFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // API routes
    const tasksResource = this.taskApi.root.addResource('tasks');
    tasksResource.addMethod('GET', taskIntegration);
    tasksResource.addMethod('POST', taskIntegration);

    const taskResource = tasksResource.addResource('{id}');
    taskResource.addMethod('GET', taskIntegration);
    taskResource.addMethod('PATCH', taskIntegration);
    taskResource.addMethod('DELETE', taskIntegration);

    // Task notes
    const notesResource = taskResource.addResource('notes');
    notesResource.addMethod('POST', taskIntegration);

    const noteResource = notesResource.addResource('{noteId}');
    noteResource.addMethod('PATCH', taskIntegration);
    noteResource.addMethod('DELETE', taskIntegration);

    // Bulk operations
    const bulkResource = tasksResource.addResource('bulk');
    bulkResource.addMethod('POST', taskIntegration);
    bulkResource.addMethod('DELETE', taskIntegration);

    const bulkStatusResource = bulkResource.addResource('status');
    bulkStatusResource.addMethod('POST', taskIntegration);

    // Saved views
    const savedViewsResource = this.taskApi.root.addResource('saved-views');
    savedViewsResource.addMethod('GET', taskIntegration);
    savedViewsResource.addMethod('POST', taskIntegration);

    const savedViewResource = savedViewsResource.addResource('{id}');
    savedViewResource.addMethod('DELETE', taskIntegration);

    // EventBridge rule for task notifications
    const notificationRule = new events.Rule(this, 'TaskNotificationRule', {
      schedule: events.Schedule.rate(Duration.hours(1)),
      description: 'Trigger task deadline notifications',
    });

    notificationRule.addTarget(new targets.LambdaFunction(this.taskFunction));

    // CloudWatch alarms
    this.taskFunction.metricErrors().createAlarm(this, 'TaskFunctionErrors', {
      threshold: 5,
      evaluationPeriods: 2,
      alarmDescription: 'Task function error rate is too high',
    });

    this.taskFunction.metricDuration().createAlarm(this, 'TaskFunctionDuration', {
      threshold: Duration.seconds(25).toMilliseconds(),
      evaluationPeriods: 3,
      alarmDescription: 'Task function duration is too long',
    });
  }
}
