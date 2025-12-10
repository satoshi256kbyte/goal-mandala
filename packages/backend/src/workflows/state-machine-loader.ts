/**
 * State Machine Definition Loader
 *
 * This module provides utilities to load and validate the Step Functions
 * State Machine definition from the JSON file.
 */

import * as fs from 'fs';
import * as path from 'path';
import { StateMachineConfig, TIMEOUT_CONFIG } from './types';

/**
 * Load the State Machine definition from JSON file
 *
 * @returns The State Machine definition as a string
 * @throws Error if the file cannot be read or parsed
 */
export function loadStateMachineDefinition(): string {
  const definitionPath = path.join(__dirname, 'task-generation-workflow.json');

  try {
    const definitionContent = fs.readFileSync(definitionPath, 'utf-8');

    // Validate that it's valid JSON
    JSON.parse(definitionContent);

    return definitionContent;
  } catch (error) {
    throw new Error(
      `Failed to load State Machine definition: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Replace placeholders in the State Machine definition with actual ARNs
 *
 * @param definition - The State Machine definition string
 * @param arns - Map of placeholder names to actual ARNs
 * @returns The definition with placeholders replaced
 */
export function replaceArnPlaceholders(definition: string, arns: Record<string, string>): string {
  let result = definition;

  for (const [placeholder, arn] of Object.entries(arns)) {
    const pattern = new RegExp(`\\$\\{${placeholder}\\}`, 'g');
    result = result.replace(pattern, arn);
  }

  return result;
}

/**
 * Validate the State Machine definition structure
 *
 * @param definition - The State Machine definition as a string
 * @throws Error if the definition is invalid
 */
export function validateStateMachineDefinition(definition: string): void {
  let parsed: any;

  try {
    parsed = JSON.parse(definition);
  } catch (error) {
    throw new Error('State Machine definition is not valid JSON');
  }

  // Check required top-level fields
  if (!parsed.Comment) {
    throw new Error('State Machine definition missing Comment field');
  }

  if (!parsed.StartAt) {
    throw new Error('State Machine definition missing StartAt field');
  }

  if (!parsed.States) {
    throw new Error('State Machine definition missing States field');
  }

  if (typeof parsed.States !== 'object') {
    throw new Error('States field must be an object');
  }

  // Check timeout configuration
  if (parsed.TimeoutSeconds !== TIMEOUT_CONFIG.WORKFLOW) {
    throw new Error(
      `Workflow timeout must be ${TIMEOUT_CONFIG.WORKFLOW} seconds, got ${parsed.TimeoutSeconds}`
    );
  }

  // Validate that StartAt state exists
  if (!parsed.States[parsed.StartAt]) {
    throw new Error(`StartAt state "${parsed.StartAt}" not found in States`);
  }

  // Validate all states have required fields
  for (const [stateName, state] of Object.entries(parsed.States)) {
    if (typeof state !== 'object' || state === null) {
      throw new Error(`State "${stateName}" must be an object`);
    }

    const stateObj = state as any;

    if (!stateObj.Type) {
      throw new Error(`State "${stateName}" missing Type field`);
    }

    // Validate terminal states
    if (stateObj.Type === 'Succeed' || stateObj.Type === 'Fail') {
      if (stateObj.Next) {
        throw new Error(`Terminal state "${stateName}" cannot have Next field`);
      }
    }

    // Validate non-terminal states have Next or End
    if (
      stateObj.Type !== 'Succeed' &&
      stateObj.Type !== 'Fail' &&
      stateObj.Type !== 'Choice' &&
      !stateObj.Next &&
      !stateObj.End
    ) {
      throw new Error(`State "${stateName}" must have Next or End field`);
    }
  }
}

/**
 * Create a State Machine configuration object
 *
 * @param name - The name of the State Machine
 * @param roleArn - The ARN of the execution role
 * @param definition - The State Machine definition string
 * @param logGroupArn - The ARN of the CloudWatch Logs log group
 * @returns A StateMachineConfig object
 */
export function createStateMachineConfig(
  name: string,
  roleArn: string,
  definition: string,
  logGroupArn: string
): StateMachineConfig {
  return {
    name,
    roleArn,
    definition,
    loggingConfiguration: {
      level: 'ALL',
      includeExecutionData: true,
      destinations: [
        {
          cloudWatchLogsLogGroup: {
            logGroupArn,
          },
        },
      ],
    },
  };
}

/**
 * Get the list of Lambda function ARN placeholders in the definition
 *
 * @returns Array of placeholder names
 */
export function getLambdaArnPlaceholders(): string[] {
  return [
    'ValidateInputFunctionArn',
    'GetActionsFunctionArn',
    'CreateBatchesFunctionArn',
    'TaskGenerationFunctionArn',
    'SaveTasksFunctionArn',
    'UpdateProgressFunctionArn',
    'AggregateResultsFunctionArn',
    'UpdateGoalStatusFunctionArn',
    'HandleErrorFunctionArn',
  ];
}

/**
 * Get the list of other ARN placeholders in the definition
 *
 * @returns Array of placeholder names
 */
export function getOtherArnPlaceholders(): string[] {
  return ['NotificationTopicArn'];
}

/**
 * Get all ARN placeholders in the definition
 *
 * @returns Array of all placeholder names
 */
export function getAllArnPlaceholders(): string[] {
  return [...getLambdaArnPlaceholders(), ...getOtherArnPlaceholders()];
}
