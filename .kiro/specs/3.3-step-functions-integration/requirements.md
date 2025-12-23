# Step Functions統合 要件定義書

## Introduction

Step Functions統合機能は、アクションからタスクへの変換処理を非同期ワークフローとして実装し、長時間処理の信頼性と可視性を向上させる機能です。AI生成によるタスク分解処理をStep Functionsで管理することで、処理の進捗追跡、エラーハンドリング、リトライ制御を実現します。

## Glossary

- **StepFunctions**: AWS Step Functionsサービス。ワークフローを定義・実行するサーバーレスオーケストレーションサービス
- **StateMachine**: Step Functionsで定義されるワークフロー。状態遷移とタスク実行を管理
- **ExecutionArn**: Step Functions実行の一意識別子
- **TaskGenerationWorkflow**: アクションからタスクを生成するワークフロー
- **WorkflowState**: ワークフローの実行状態（RUNNING/SUCCEEDED/FAILED/TIMED_OUT/ABORTED）
- **ActionBatch**: 一度に処理するアクションのグループ（最大8個）
- **TaskBatch**: 一度に生成されるタスクのグループ
- **RetryPolicy**: 失敗時の再試行ポリシー（回数、間隔、バックオフ率）
- **TimeoutPolicy**: タイムアウト設定（最大実行時間）
- **ErrorHandler**: エラー発生時の処理ロジック
- **WorkflowMonitor**: ワークフロー実行状況を監視するコンポーネント
- **ExecutionHistory**: ワークフロー実行履歴
- **StateTransition**: ワークフロー内の状態遷移

## Requirements

### Requirement 1

**User Story:** As a system, I want to orchestrate task generation using Step Functions, so that I can handle long-running AI processing reliably.

#### Acceptance Criteria

1. WHEN a user starts activity on a mandala chart THEN the system SHALL initiate a Step Functions execution for task generation
2. WHEN initiating a Step Functions execution THEN the system SHALL pass the goal ID and all action IDs as input
3. WHEN a Step Functions execution starts THEN the system SHALL return the execution ARN to the caller
4. WHEN a Step Functions execution starts THEN the system SHALL update the goal status to "processing"
5. WHEN a Step Functions execution completes successfully THEN the system SHALL update the goal status to "active"

### Requirement 2

**User Story:** As a system, I want to process actions in batches, so that I can optimize AI API usage and reduce costs.

#### Acceptance Criteria

1. WHEN processing actions THEN the TaskGenerationWorkflow SHALL divide actions into batches of maximum 8 actions
2. WHEN processing a batch THEN the TaskGenerationWorkflow SHALL invoke the AI service for each action in parallel
3. WHEN all actions in a batch complete THEN the TaskGenerationWorkflow SHALL proceed to the next batch
4. WHEN processing batches THEN the TaskGenerationWorkflow SHALL maintain the order of actions
5. WHEN all batches complete THEN the TaskGenerationWorkflow SHALL aggregate the results

### Requirement 3

**User Story:** As a system, I want to handle AI service failures gracefully, so that temporary issues don't cause complete workflow failure.

#### Acceptance Criteria

1. WHEN an AI service call fails THEN the TaskGenerationWorkflow SHALL retry up to 3 times with exponential backoff
2. WHEN the first retry fails THEN the TaskGenerationWorkflow SHALL wait 2 seconds before the second attempt
3. WHEN the second retry fails THEN the TaskGenerationWorkflow SHALL wait 4 seconds before the third attempt
4. WHEN all retries fail for an action THEN the TaskGenerationWorkflow SHALL mark that action as failed and continue with other actions
5. WHEN any action fails after all retries THEN the TaskGenerationWorkflow SHALL include the failure details in the final result

### Requirement 4

**User Story:** As a system, I want to enforce timeout limits, so that workflows don't run indefinitely and consume resources.

#### Acceptance Criteria

1. WHEN a TaskGenerationWorkflow starts THEN the system SHALL set a maximum execution time of 15 minutes
2. WHEN a single AI service call exceeds 2 minutes THEN the system SHALL timeout and retry
3. WHEN a batch processing exceeds 5 minutes THEN the system SHALL timeout and fail that batch
4. WHEN the entire workflow exceeds 15 minutes THEN the system SHALL abort the execution
5. WHEN a timeout occurs THEN the system SHALL log the timeout event with execution details

### Requirement 5

**User Story:** As a system, I want to save generated tasks to the database, so that users can access them immediately after generation.

#### Acceptance Criteria

1. WHEN tasks are generated for an action THEN the TaskGenerationWorkflow SHALL save all tasks to the database in a single transaction
2. WHEN saving tasks THEN the TaskGenerationWorkflow SHALL include task title, description, type, estimated time, and action ID
3. WHEN saving tasks THEN the TaskGenerationWorkflow SHALL set the initial status to "not_started"
4. WHEN saving tasks fails THEN the TaskGenerationWorkflow SHALL retry the database operation up to 3 times
5. WHEN all database retries fail THEN the TaskGenerationWorkflow SHALL mark the action as failed and continue with other actions

### Requirement 6

**User Story:** As a system, I want to track workflow execution progress, so that users can see the status of task generation.

#### Acceptance Criteria

1. WHEN a workflow is executing THEN the system SHALL update the execution status in the database every 30 seconds
2. WHEN updating execution status THEN the system SHALL include the current state, processed actions count, and total actions count
3. WHEN a user queries workflow status THEN the system SHALL return the current state, progress percentage, and estimated time remaining
4. WHEN a workflow completes THEN the system SHALL update the final status with completion time and result summary
5. WHEN a workflow fails THEN the system SHALL update the status with error details and failed actions list

### Requirement 7

**User Story:** As a developer, I want to monitor workflow executions, so that I can troubleshoot issues and optimize performance.

#### Acceptance Criteria

1. WHEN a workflow starts THEN the system SHALL log the start event with execution ARN and input parameters
2. WHEN a workflow transitions between states THEN the system SHALL log the state transition with timestamp
3. WHEN a workflow completes THEN the system SHALL log the completion event with execution time and result summary
4. WHEN a workflow fails THEN the system SHALL log the failure event with error details and stack trace
5. WHEN monitoring workflows THEN the system SHALL publish metrics to CloudWatch (execution count, success rate, average duration, error rate)

### Requirement 8

**User Story:** As a system administrator, I want to receive alerts for workflow failures, so that I can respond quickly to issues.

#### Acceptance Criteria

1. WHEN a workflow fails THEN the system SHALL publish an SNS notification with failure details
2. WHEN the workflow failure rate exceeds 10% in a 5-minute window THEN the system SHALL trigger a CloudWatch alarm
3. WHEN a workflow times out THEN the system SHALL send a high-priority alert
4. WHEN all retries fail for multiple actions THEN the system SHALL escalate the alert to the operations team
5. WHEN an alert is triggered THEN the system SHALL include the execution ARN, error message, and affected goal ID

### Requirement 9

**User Story:** As a user, I want to cancel a running workflow, so that I can stop task generation if I made a mistake.

#### Acceptance Criteria

1. WHEN a user requests to cancel task generation THEN the system SHALL stop the Step Functions execution
2. WHEN stopping an execution THEN the system SHALL use the "ABORT" cause to terminate the workflow
3. WHEN an execution is aborted THEN the system SHALL clean up any partially generated tasks
4. WHEN an execution is aborted THEN the system SHALL update the goal status to "draft"
5. WHEN an execution is aborted THEN the system SHALL log the cancellation event with user ID and reason

### Requirement 10

**User Story:** As a system, I want to handle concurrent workflow executions, so that multiple users can generate tasks simultaneously.

#### Acceptance Criteria

1. WHEN multiple users start task generation simultaneously THEN the system SHALL create separate Step Functions executions for each user
2. WHEN processing concurrent executions THEN the system SHALL ensure each execution has isolated state
3. WHEN concurrent executions access the database THEN the system SHALL use optimistic locking to prevent conflicts
4. WHEN a database conflict occurs THEN the system SHALL retry the operation with updated data
5. WHEN concurrent executions complete THEN the system SHALL ensure all tasks are saved correctly without data loss

### Requirement 11

**User Story:** As a developer, I want to test the workflow locally, so that I can validate changes before deploying to production.

#### Acceptance Criteria

1. WHEN testing locally THEN the system SHALL provide a mock Step Functions execution environment
2. WHEN testing locally THEN the system SHALL use mock AI service responses to avoid API costs
3. WHEN testing locally THEN the system SHALL validate the workflow definition syntax
4. WHEN testing locally THEN the system SHALL simulate state transitions and error conditions
5. WHEN testing locally THEN the system SHALL generate execution logs for debugging

### Requirement 12

**User Story:** As a system, I want to optimize workflow performance, so that task generation completes as quickly as possible.

#### Acceptance Criteria

1. WHEN processing actions THEN the TaskGenerationWorkflow SHALL use parallel processing for independent actions
2. WHEN invoking AI services THEN the TaskGenerationWorkflow SHALL use connection pooling to reduce latency
3. WHEN saving tasks THEN the TaskGenerationWorkflow SHALL use batch insert operations to minimize database round trips
4. WHEN the workflow completes THEN the system SHALL log the total execution time and performance metrics
5. WHEN performance degrades THEN the system SHALL log a warning and suggest optimization opportunities

### Requirement 13

**User Story:** As a system, I want to maintain workflow execution history, so that I can analyze patterns and troubleshoot issues.

#### Acceptance Criteria

1. WHEN a workflow completes THEN the system SHALL save the execution history to the database
2. WHEN saving execution history THEN the system SHALL include execution ARN, start time, end time, status, and result summary
3. WHEN querying execution history THEN the system SHALL support filtering by goal ID, status, and date range
4. WHEN displaying execution history THEN the system SHALL show the execution timeline with state transitions
5. WHEN execution history exceeds 90 days THEN the system SHALL archive old records to S3

### Requirement 14

**User Story:** As a system, I want to handle partial failures gracefully, so that successful task generation is not lost when some actions fail.

#### Acceptance Criteria

1. WHEN some actions fail during workflow execution THEN the TaskGenerationWorkflow SHALL save successfully generated tasks
2. WHEN partial failure occurs THEN the TaskGenerationWorkflow SHALL mark the workflow as "partially succeeded"
3. WHEN partial failure occurs THEN the TaskGenerationWorkflow SHALL list the failed actions in the result
4. WHEN partial failure occurs THEN the system SHALL allow users to retry only the failed actions
5. WHEN retrying failed actions THEN the system SHALL create a new workflow execution for only those actions

### Requirement 15

**User Story:** As a system, I want to integrate with existing Lambda functions, so that I can reuse the AI service logic.

#### Acceptance Criteria

1. WHEN the workflow invokes AI service THEN the TaskGenerationWorkflow SHALL call the existing task generation Lambda function
2. WHEN calling Lambda functions THEN the TaskGenerationWorkflow SHALL pass the action ID and context as input
3. WHEN Lambda function returns results THEN the TaskGenerationWorkflow SHALL validate the response format
4. WHEN Lambda function response is invalid THEN the TaskGenerationWorkflow SHALL log the error and retry
5. WHEN Lambda function succeeds THEN the TaskGenerationWorkflow SHALL extract the generated tasks from the response

