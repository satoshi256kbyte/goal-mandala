import * as cdk from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { EnvironmentConfig } from '../config/environment';
import * as path from 'path';
import * as fs from 'fs';

export interface TaskGenerationWorkflowStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

/**
 * Task Generation Workflow Stack
 *
 * Step Functions State Machineを使用してアクションからタスクへの変換処理を
 * 非同期ワークフローとして実装します。
 *
 * Requirements: 1.1, 4.1
 */
export class TaskGenerationWorkflowStack extends cdk.Stack {
  public readonly stateMachine: sfn.StateMachine;
  public readonly notificationTopic: sns.Topic;
  public readonly lambdaFunctions: {
    validateInput: lambda.Function;
    getActions: lambda.Function;
    createBatches: lambda.Function;
    taskGeneration: lambda.Function;
    saveTasks: lambda.Function;
    updateProgress: lambda.Function;
    aggregateResults: lambda.Function;
    updateGoalStatus: lambda.Function;
    handleError: lambda.Function;
  };

  constructor(scope: Construct, id: string, props: TaskGenerationWorkflowStackProps) {
    super(scope, id, props);

    const { config } = props;

    // CloudWatch Logs Group for State Machine
    const logGroup = new logs.LogGroup(this, 'StateMachineLogGroup', {
      logGroupName: `/aws/vendedlogs/states/${config.stackPrefix}-task-generation-workflow`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // SNS Topic for notifications
    this.notificationTopic = new sns.Topic(this, 'WorkflowNotificationTopic', {
      topicName: `${config.stackPrefix}-workflow-notifications`,
      displayName: 'Task Generation Workflow Notifications',
    });

    // Lambda Functions
    this.lambdaFunctions = this.createLambdaFunctions(config);

    // Step Functions IAM Role
    const stepFunctionsRole = new iam.Role(this, 'StepFunctionsRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      roleName: `${config.stackPrefix}-task-generation-workflow-role`,
      description: 'IAM role for Task Generation Workflow State Machine',
    });

    // Grant Lambda invoke permissions
    Object.values(this.lambdaFunctions).forEach(fn => {
      fn.grantInvoke(stepFunctionsRole);
    });

    // Grant SNS publish permissions
    this.notificationTopic.grantPublish(stepFunctionsRole);

    // Grant CloudWatch Logs permissions
    stepFunctionsRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogDelivery',
          'logs:GetLogDelivery',
          'logs:UpdateLogDelivery',
          'logs:DeleteLogDelivery',
          'logs:ListLogDeliveries',
          'logs:PutResourcePolicy',
          'logs:DescribeResourcePolicies',
          'logs:DescribeLogGroups',
        ],
        resources: ['*'],
      })
    );

    // Load State Machine definition
    const stateMachineDefinition = this.loadStateMachineDefinition();

    // Create State Machine
    this.stateMachine = new sfn.StateMachine(this, 'TaskGenerationStateMachine', {
      stateMachineName: `${config.stackPrefix}-task-generation-workflow`,
      definitionBody: sfn.DefinitionBody.fromString(stateMachineDefinition),
      stateMachineType: sfn.StateMachineType.STANDARD,
      timeout: Duration.minutes(15), // 15 minutes total timeout
      tracingEnabled: true, // Enable X-Ray tracing
      role: stepFunctionsRole,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
        includeExecutionData: true,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: this.stateMachine.stateMachineArn,
      description: 'Task Generation Workflow State Machine ARN',
      exportName: `${config.stackPrefix}-task-generation-workflow-arn`,
    });

    new cdk.CfnOutput(this, 'StateMachineName', {
      value: this.stateMachine.stateMachineName,
      description: 'Task Generation Workflow State Machine Name',
      exportName: `${config.stackPrefix}-task-generation-workflow-name`,
    });

    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: this.notificationTopic.topicArn,
      description: 'Workflow Notification Topic ARN',
      exportName: `${config.stackPrefix}-workflow-notification-topic-arn`,
    });
  }

  /**
   * Create all Lambda functions for the workflow
   */
  private createLambdaFunctions(config: EnvironmentConfig) {
    const commonProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: {
        NODE_ENV: config.environment || 'dev',
        LOG_LEVEL: config.environment === 'prod' ? 'info' : 'debug',
      },
      tracing: lambda.Tracing.ACTIVE,
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*', '@prisma/client'],
      },
    };

    const backendPath = path.join(__dirname, '../../../backend');

    // Validate Input Lambda
    const validateInput = new lambdaNodejs.NodejsFunction(this, 'ValidateInputFunction', {
      ...commonProps,
      functionName: `${config.stackPrefix}-validate-input`,
      entry: path.join(backendPath, 'src/workflows/handlers/validate-input.ts'),
      handler: 'handler',
      description: 'Validates workflow input parameters',
    });

    // Get Actions Lambda
    const getActions = new lambdaNodejs.NodejsFunction(this, 'GetActionsFunction', {
      ...commonProps,
      functionName: `${config.stackPrefix}-get-actions`,
      entry: path.join(backendPath, 'src/workflows/handlers/get-actions.ts'),
      handler: 'handler',
      description: 'Retrieves actions and their context from database',
      timeout: Duration.seconds(60),
    });

    // Create Batches Lambda
    const createBatches = new lambdaNodejs.NodejsFunction(this, 'CreateBatchesFunction', {
      ...commonProps,
      functionName: `${config.stackPrefix}-create-batches`,
      entry: path.join(backendPath, 'src/workflows/handlers/create-batches.ts'),
      handler: 'handler',
      description: 'Divides actions into batches of maximum 8 actions',
    });

    // Task Generation Lambda
    const taskGeneration = new lambdaNodejs.NodejsFunction(this, 'TaskGenerationFunction', {
      ...commonProps,
      functionName: `${config.stackPrefix}-task-generation`,
      entry: path.join(backendPath, 'src/workflows/handlers/task-generation-wrapper.ts'),
      handler: 'handler',
      description: 'Generates tasks for an action using AI',
      timeout: Duration.seconds(120), // 2 minutes for AI processing
      memorySize: 1024,
    });

    // Save Tasks Lambda
    const saveTasks = new lambdaNodejs.NodejsFunction(this, 'SaveTasksFunction', {
      ...commonProps,
      functionName: `${config.stackPrefix}-save-tasks`,
      entry: path.join(backendPath, 'src/workflows/handlers/save-tasks.ts'),
      handler: 'handler',
      description: 'Saves generated tasks to database',
      timeout: Duration.seconds(60),
    });

    // Update Progress Lambda
    const updateProgress = new lambdaNodejs.NodejsFunction(this, 'UpdateProgressFunction', {
      ...commonProps,
      functionName: `${config.stackPrefix}-update-progress`,
      entry: path.join(backendPath, 'src/workflows/handlers/update-progress.ts'),
      handler: 'handler',
      description: 'Updates workflow progress',
    });

    // Aggregate Results Lambda
    const aggregateResults = new lambdaNodejs.NodejsFunction(this, 'AggregateResultsFunction', {
      ...commonProps,
      functionName: `${config.stackPrefix}-aggregate-results`,
      entry: path.join(backendPath, 'src/workflows/handlers/aggregate-results.ts'),
      handler: 'handler',
      description: 'Aggregates results from all batches',
    });

    // Update Goal Status Lambda
    const updateGoalStatus = new lambdaNodejs.NodejsFunction(this, 'UpdateGoalStatusFunction', {
      ...commonProps,
      functionName: `${config.stackPrefix}-update-goal-status`,
      entry: path.join(backendPath, 'src/workflows/handlers/update-goal-status.ts'),
      handler: 'handler',
      description: 'Updates goal status based on workflow outcome',
    });

    // Handle Error Lambda
    const handleError = new lambdaNodejs.NodejsFunction(this, 'HandleErrorFunction', {
      ...commonProps,
      functionName: `${config.stackPrefix}-handle-error`,
      entry: path.join(backendPath, 'src/workflows/handlers/handle-error.ts'),
      handler: 'handler',
      description: 'Handles workflow errors and prepares notifications',
    });

    return {
      validateInput,
      getActions,
      createBatches,
      taskGeneration,
      saveTasks,
      updateProgress,
      aggregateResults,
      updateGoalStatus,
      handleError,
    };
  }

  /**
   * Load and process State Machine definition
   */
  private loadStateMachineDefinition(): string {
    const definitionPath = path.join(
      __dirname,
      '../../../backend/src/workflows/task-generation-workflow.json'
    );

    let definition = fs.readFileSync(definitionPath, 'utf-8');

    // Replace placeholders with actual function names
    const replacements: Record<string, string> = {
      '${ValidateInputFunctionName}': this.lambdaFunctions.validateInput.functionName,
      '${GetActionsFunctionName}': this.lambdaFunctions.getActions.functionName,
      '${CreateBatchesFunctionName}': this.lambdaFunctions.createBatches.functionName,
      '${TaskGenerationFunctionName}': this.lambdaFunctions.taskGeneration.functionName,
      '${SaveTasksFunctionName}': this.lambdaFunctions.saveTasks.functionName,
      '${UpdateProgressFunctionName}': this.lambdaFunctions.updateProgress.functionName,
      '${AggregateResultsFunctionName}': this.lambdaFunctions.aggregateResults.functionName,
      '${UpdateGoalStatusFunctionName}': this.lambdaFunctions.updateGoalStatus.functionName,
      '${HandleErrorFunctionName}': this.lambdaFunctions.handleError.functionName,
      '${WorkflowNotificationTopicArn}': this.notificationTopic.topicArn,
      '${AWS::Region}': cdk.Aws.REGION,
      '${AWS::AccountId}': cdk.Aws.ACCOUNT_ID,
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      definition = definition.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        value
      );
    });

    return definition;
  }
}
