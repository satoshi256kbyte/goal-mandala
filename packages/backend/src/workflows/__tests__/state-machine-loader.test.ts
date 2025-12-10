/**
 * State Machine Loader Tests
 *
 * Tests for loading and validating the Step Functions State Machine definition.
 */

import {
  loadStateMachineDefinition,
  replaceArnPlaceholders,
  validateStateMachineDefinition,
  createStateMachineConfig,
  getLambdaArnPlaceholders,
  getOtherArnPlaceholders,
  getAllArnPlaceholders,
} from '../state-machine-loader';
import { TIMEOUT_CONFIG } from '../types';

describe('State Machine Loader', () => {
  describe('loadStateMachineDefinition', () => {
    it('should load the State Machine definition', () => {
      const definition = loadStateMachineDefinition();

      expect(definition).toBeDefined();
      expect(typeof definition).toBe('string');
      expect(definition.length).toBeGreaterThan(0);
    });

    it('should load valid JSON', () => {
      const definition = loadStateMachineDefinition();

      expect(() => JSON.parse(definition)).not.toThrow();
    });

    it('should contain required top-level fields', () => {
      const definition = loadStateMachineDefinition();
      const parsed = JSON.parse(definition);

      expect(parsed.Comment).toBeDefined();
      expect(parsed.StartAt).toBeDefined();
      expect(parsed.States).toBeDefined();
      expect(parsed.TimeoutSeconds).toBe(TIMEOUT_CONFIG.WORKFLOW);
    });
  });

  describe('replaceArnPlaceholders', () => {
    it('should replace single placeholder', () => {
      const definition = '{"Resource": "${TestFunctionArn}"}';
      const arns = { TestFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test' };

      const result = replaceArnPlaceholders(definition, arns);

      expect(result).toBe('{"Resource": "arn:aws:lambda:us-east-1:123456789012:function:test"}');
    });

    it('should replace multiple placeholders', () => {
      const definition = '{"Fn1": "${Arn1}", "Fn2": "${Arn2}"}';
      const arns = {
        Arn1: 'arn:aws:lambda:us-east-1:123456789012:function:fn1',
        Arn2: 'arn:aws:lambda:us-east-1:123456789012:function:fn2',
      };

      const result = replaceArnPlaceholders(definition, arns);

      expect(result).toContain('arn:aws:lambda:us-east-1:123456789012:function:fn1');
      expect(result).toContain('arn:aws:lambda:us-east-1:123456789012:function:fn2');
    });

    it('should replace all occurrences of a placeholder', () => {
      const definition = '{"Fn1": "${Arn}", "Fn2": "${Arn}"}';
      const arns = { Arn: 'arn:aws:lambda:us-east-1:123456789012:function:test' };

      const result = replaceArnPlaceholders(definition, arns);

      const matches = result.match(/arn:aws:lambda:us-east-1:123456789012:function:test/g);
      expect(matches).toHaveLength(2);
    });

    it('should not modify definition if no placeholders match', () => {
      const definition = '{"Resource": "static-value"}';
      const arns = { TestFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test' };

      const result = replaceArnPlaceholders(definition, arns);

      expect(result).toBe(definition);
    });
  });

  describe('validateStateMachineDefinition', () => {
    it('should validate a correct definition', () => {
      const definition = loadStateMachineDefinition();

      expect(() => validateStateMachineDefinition(definition)).not.toThrow();
    });

    it('should throw error for invalid JSON', () => {
      const definition = 'not valid json';

      expect(() => validateStateMachineDefinition(definition)).toThrow('not valid JSON');
    });

    it('should throw error for missing Comment', () => {
      const definition = JSON.stringify({
        StartAt: 'Start',
        States: { Start: { Type: 'Succeed' } },
      });

      expect(() => validateStateMachineDefinition(definition)).toThrow('missing Comment');
    });

    it('should throw error for missing StartAt', () => {
      const definition = JSON.stringify({
        Comment: 'Test',
        States: { Start: { Type: 'Succeed' } },
      });

      expect(() => validateStateMachineDefinition(definition)).toThrow('missing StartAt');
    });

    it('should throw error for missing States', () => {
      const definition = JSON.stringify({
        Comment: 'Test',
        StartAt: 'Start',
      });

      expect(() => validateStateMachineDefinition(definition)).toThrow('missing States');
    });

    it('should throw error for invalid timeout', () => {
      const definition = JSON.stringify({
        Comment: 'Test',
        StartAt: 'Start',
        States: { Start: { Type: 'Succeed' } },
        TimeoutSeconds: 600,
      });

      expect(() => validateStateMachineDefinition(definition)).toThrow('Workflow timeout must be');
    });

    it('should throw error if StartAt state does not exist', () => {
      const definition = JSON.stringify({
        Comment: 'Test',
        StartAt: 'NonExistent',
        States: { Start: { Type: 'Succeed' } },
        TimeoutSeconds: TIMEOUT_CONFIG.WORKFLOW,
      });

      expect(() => validateStateMachineDefinition(definition)).toThrow('not found in States');
    });
  });

  describe('createStateMachineConfig', () => {
    it('should create a valid configuration object', () => {
      const config = createStateMachineConfig(
        'TestStateMachine',
        'arn:aws:iam::123456789012:role/test-role',
        '{"test": "definition"}',
        'arn:aws:logs:us-east-1:123456789012:log-group:/aws/states/test'
      );

      expect(config.name).toBe('TestStateMachine');
      expect(config.roleArn).toBe('arn:aws:iam::123456789012:role/test-role');
      expect(config.definition).toBe('{"test": "definition"}');
      expect(config.loggingConfiguration.level).toBe('ALL');
      expect(config.loggingConfiguration.includeExecutionData).toBe(true);
      expect(config.loggingConfiguration.destinations).toHaveLength(1);
    });
  });

  describe('Placeholder getters', () => {
    it('should return Lambda ARN placeholders', () => {
      const placeholders = getLambdaArnPlaceholders();

      expect(placeholders).toContain('ValidateInputFunctionArn');
      expect(placeholders).toContain('GetActionsFunctionArn');
      expect(placeholders).toContain('TaskGenerationFunctionArn');
      expect(placeholders).toHaveLength(9);
    });

    it('should return other ARN placeholders', () => {
      const placeholders = getOtherArnPlaceholders();

      expect(placeholders).toContain('NotificationTopicArn');
      expect(placeholders).toHaveLength(1);
    });

    it('should return all ARN placeholders', () => {
      const placeholders = getAllArnPlaceholders();

      expect(placeholders).toHaveLength(10);
      expect(placeholders).toContain('ValidateInputFunctionArn');
      expect(placeholders).toContain('NotificationTopicArn');
    });
  });
});
