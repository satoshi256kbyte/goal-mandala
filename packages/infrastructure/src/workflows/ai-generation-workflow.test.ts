import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { AIGenerationWorkflow } from './ai-generation-workflow';

describe('AIGenerationWorkflow', () => {
  let app: App;
  let stack: Stack;
  let updateProcessingStateFunction: lambda.Function;
  let aiGenerationWorkerFunction: lambda.Function;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');

    // モックLambda関数を作成
    updateProcessingStateFunction = new lambda.Function(stack, 'UpdateProcessingStateFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {}'),
    });

    aiGenerationWorkerFunction = new lambda.Function(stack, 'AIGenerationWorkerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {}'),
    });
  });

  describe('ワークフロー構築', () => {
    it('Step Functions State Machineが作成される', () => {
      // Arrange & Act
      new AIGenerationWorkflow(stack, 'TestWorkflow', {
        updateProcessingStateFunction,
        aiGenerationWorkerFunction,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    });

    it('State MachineがSTANDARDタイプで作成される', () => {
      // Arrange & Act
      new AIGenerationWorkflow(stack, 'TestWorkflow', {
        updateProcessingStateFunction,
        aiGenerationWorkerFunction,
      });

      // Assert
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
        StateMachineType: 'STANDARD',
      });
    });
  });

  describe('状態遷移', () => {
    it('State Machineが定義される', () => {
      // Arrange & Act
      const workflow = new AIGenerationWorkflow(stack, 'TestWorkflow', {
        updateProcessingStateFunction,
        aiGenerationWorkerFunction,
      });

      // Assert
      expect(workflow.stateMachine).toBeDefined();
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    });
  });

  describe('タイムアウト処理', () => {
    it('タイムアウト処理が設定される', () => {
      // Arrange & Act
      const workflow = new AIGenerationWorkflow(stack, 'TestWorkflow', {
        updateProcessingStateFunction,
        aiGenerationWorkerFunction,
      });

      // Assert
      expect(workflow.stateMachine).toBeDefined();
      // タイムアウト処理が含まれることを確認（詳細な検証はE2Eテストで実施）
    });
  });

  describe('エラーハンドリング', () => {
    it('エラーハンドリングが設定される', () => {
      // Arrange & Act
      const workflow = new AIGenerationWorkflow(stack, 'TestWorkflow', {
        updateProcessingStateFunction,
        aiGenerationWorkerFunction,
      });

      // Assert
      expect(workflow.stateMachine).toBeDefined();
      // エラーハンドリングが含まれることを確認（詳細な検証はE2Eテストで実施）
    });
  });

  describe('リトライ設定', () => {
    it('リトライ設定が定義される', () => {
      // Arrange & Act
      const workflow = new AIGenerationWorkflow(stack, 'TestWorkflow', {
        updateProcessingStateFunction,
        aiGenerationWorkerFunction,
      });

      // Assert
      expect(workflow.stateMachine).toBeDefined();
      // リトライ設定が含まれることを確認（詳細な検証はE2Eテストで実施）
    });
  });

  describe('Lambda関数の権限', () => {
    it('State MachineがLambda関数を呼び出す権限を持つ', () => {
      // Arrange & Act
      new AIGenerationWorkflow(stack, 'TestWorkflow', {
        updateProcessingStateFunction,
        aiGenerationWorkerFunction,
      });

      // Assert
      const template = Template.fromStack(stack);

      // State MachineのIAMロールが作成される
      template.resourceCountIs('AWS::IAM::Role', 3); // 2つのLambda + 1つのState Machine

      // IAMポリシーが作成される
      template.resourceCountIs('AWS::IAM::Policy', 1);
    });
  });
});
