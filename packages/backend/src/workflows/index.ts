/**
 * Step Functions Workflow Exports
 *
 * This file exports all workflow-related configurations, types, and utilities.
 */

// Type definitions
export * from './types';

// Configuration exports
export * from './batch-config';
export * from './retry-config';
export * from './timeout-config';
export * from './error-config';

// Re-export workflow definition as a constant
import workflowDefinition from './task-generation-workflow.json';

/**
 * Task Generation Workflow State Machine Definition
 *
 * This is the complete Step Functions state machine definition in JSON format.
 * It can be used for:
 * - CDK deployment
 * - Local testing with Step Functions Local
 * - Documentation and validation
 */
export const TASK_GENERATION_WORKFLOW = workflowDefinition;

/**
 * Workflow metadata
 */
export const WORKFLOW_METADATA = {
  name: 'TaskGenerationWorkflow',
  version: '1.0.0',
  description: 'Orchestrates task generation from actions using AI',
  comment: workflowDefinition.Comment,
  startState: workflowDefinition.StartAt,
  timeoutSeconds: workflowDefinition.TimeoutSeconds,
  stateCount: Object.keys(workflowDefinition.States).length,
} as const;
