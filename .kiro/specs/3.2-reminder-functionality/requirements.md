# リマインド機能 要件定義書

## Introduction

リマインド機能は、ユーザーが日々のタスクを忘れずに実行できるよう、メールでタスクをリマインドする機能です。平日の午前10時に、その日に実行すべきタスクをメール配信し、ユーザーの目標達成をサポートします。

## Glossary

- **ReminderSystem**: リマインド機能全体を指すシステム
- **EmailService**: メール送信を担当するサービス（Amazon SES）
- **TaskSelector**: リマインド対象のタスクを選択するロジック
- **MoodPreference**: ユーザーが選択した翌日の気分（「このまま行く」または「気分を変える」）
- **ExecutionTask**: 実行アクションに紐づくタスク（完了すれば終わり）
- **HabitTask**: 習慣アクションに紐づくタスク（継続的に実施）
- **ReminderSchedule**: リマインドメールの配信スケジュール
- **EmailTemplate**: メールの本文テンプレート
- **DeepLink**: メール内のリンクからタスク詳細画面に直接アクセスするためのURL

## Requirements

### Requirement 1

**User Story:** As a user, I want to receive daily task reminders via email, so that I can stay on track with my goals without having to check the app constantly.

#### Acceptance Criteria

1. WHEN the current time is 10:00 AM on a weekday, THE ReminderSystem SHALL send a reminder email to all active users
2. WHEN a user has no pending tasks for the day, THE ReminderSystem SHALL NOT send a reminder email to that user
3. WHEN a reminder email is sent, THE ReminderSystem SHALL log the email delivery status
4. WHEN an email delivery fails, THE ReminderSystem SHALL retry up to 3 times with exponential backoff
5. WHEN all retry attempts fail, THE ReminderSystem SHALL log the failure and alert the operations team

### Requirement 2

**User Story:** As a user, I want the reminder email to contain personalized task information, so that I can quickly understand what I need to do today.

#### Acceptance Criteria

1. WHEN generating a reminder email, THE EmailService SHALL include the user's name in the greeting
2. WHEN generating a reminder email, THE EmailService SHALL include the goal title associated with the tasks
3. WHEN generating a reminder email, THE EmailService SHALL list all tasks for the day with their titles and estimated time
4. WHEN generating a reminder email, THE EmailService SHALL include the total estimated time for all tasks
5. WHEN generating a reminder email, THE EmailService SHALL use a clean, readable HTML format

### Requirement 3

**User Story:** As a user, I want to click a link in the reminder email to go directly to the task detail page, so that I can quickly start working on my tasks.

#### Acceptance Criteria

1. WHEN a reminder email contains a task, THE EmailService SHALL include a deep link to that task's detail page
2. WHEN a user clicks a deep link, THE ReminderSystem SHALL authenticate the user automatically using a secure token
3. WHEN a deep link token is generated, THE ReminderSystem SHALL set an expiration time of 24 hours
4. WHEN a user clicks an expired deep link, THE ReminderSystem SHALL redirect the user to the login page
5. WHEN a user clicks a valid deep link, THE ReminderSystem SHALL navigate the user directly to the task detail page

### Requirement 4

**User Story:** As a user, I want the system to select tasks based on my mood preference, so that I can maintain motivation and avoid burnout.

#### Acceptance Criteria

1. WHEN selecting tasks for a user who chose "このまま行く" (stay on track), THE TaskSelector SHALL select 2/3 of tasks from the same or adjacent actions
2. WHEN selecting tasks for a user who chose "このまま行く", THE TaskSelector SHALL select 1/3 of tasks randomly from the oldest 10 incomplete tasks
3. WHEN selecting tasks for a user who chose "気分を変える" (change pace), THE TaskSelector SHALL select all tasks randomly from the oldest 10 incomplete tasks
4. WHEN selecting tasks for the first time (no mood preference set), THE TaskSelector SHALL select tasks completely randomly
5. WHEN there are fewer than 10 incomplete tasks, THE TaskSelector SHALL select from all available incomplete tasks

### Requirement 5

**User Story:** As a user, I want the system to prioritize different types of tasks appropriately, so that I can balance execution tasks and habit tasks effectively.

#### Acceptance Criteria

1. WHEN selecting tasks for the day, THE TaskSelector SHALL include a maximum of 3 execution tasks
2. WHEN selecting tasks for the day, THE TaskSelector SHALL ensure each habit task is reminded at least once per week
3. WHEN distributing habit task reminders, THE TaskSelector SHALL spread them evenly across weekdays
4. WHEN a habit task has not been reminded in the past 7 days, THE TaskSelector SHALL prioritize it for the current day
5. WHEN all selection criteria are met, THE TaskSelector SHALL fill remaining slots with execution tasks

### Requirement 6

**User Story:** As a system administrator, I want the reminder system to be scheduled reliably, so that users receive their reminders consistently every weekday.

#### Acceptance Criteria

1. WHEN configuring the reminder schedule, THE ReminderSystem SHALL use Amazon EventBridge to trigger the reminder Lambda function
2. WHEN the EventBridge rule is triggered, THE ReminderSystem SHALL execute at exactly 10:00 AM JST (01:00 UTC)
3. WHEN the EventBridge rule is configured, THE ReminderSystem SHALL only trigger on weekdays (Monday through Friday)
4. WHEN the reminder Lambda function is invoked, THE ReminderSystem SHALL process all eligible users within 5 minutes
5. WHEN processing takes longer than expected, THE ReminderSystem SHALL log a warning and continue processing

### Requirement 7

**User Story:** As a user, I want to receive reminder emails only when I have active goals, so that I don't receive unnecessary emails after completing my goals.

#### Acceptance Criteria

1. WHEN a user has no active goals, THE ReminderSystem SHALL NOT send reminder emails to that user
2. WHEN a user completes all goals, THE ReminderSystem SHALL automatically stop sending reminder emails
3. WHEN a user creates a new goal, THE ReminderSystem SHALL automatically start sending reminder emails
4. WHEN a user pauses a goal, THE ReminderSystem SHALL NOT send reminder emails for tasks related to that goal
5. WHEN a user resumes a paused goal, THE ReminderSystem SHALL resume sending reminder emails for tasks related to that goal

### Requirement 8

**User Story:** As a system administrator, I want to monitor reminder email delivery, so that I can ensure the system is working correctly and troubleshoot issues quickly.

#### Acceptance Criteria

1. WHEN a reminder email is sent, THE ReminderSystem SHALL log the email delivery attempt with timestamp and user ID
2. WHEN an email delivery succeeds, THE ReminderSystem SHALL record the SES message ID
3. WHEN an email delivery fails, THE ReminderSystem SHALL log the error message and error code
4. WHEN monitoring email delivery, THE ReminderSystem SHALL publish metrics to CloudWatch (sent count, failed count, retry count)
5. WHEN the failure rate exceeds 5%, THE ReminderSystem SHALL trigger a CloudWatch alarm

### Requirement 9

**User Story:** As a user, I want to unsubscribe from reminder emails if I no longer want to receive them, so that I have control over my email preferences.

#### Acceptance Criteria

1. WHEN a reminder email is sent, THE EmailService SHALL include an unsubscribe link in the email footer
2. WHEN a user clicks the unsubscribe link, THE ReminderSystem SHALL mark the user's reminder preference as disabled
3. WHEN a user has disabled reminders, THE ReminderSystem SHALL NOT send reminder emails to that user
4. WHEN a user wants to re-enable reminders, THE ReminderSystem SHALL provide a way to opt back in through the web application
5. WHEN a user re-enables reminders, THE ReminderSystem SHALL resume sending reminder emails starting the next weekday

### Requirement 10

**User Story:** As a developer, I want the reminder system to be testable, so that I can ensure it works correctly before deploying to production.

#### Acceptance Criteria

1. WHEN testing the reminder system, THE ReminderSystem SHALL provide a way to trigger reminders manually for a specific user
2. WHEN testing email templates, THE ReminderSystem SHALL provide a preview function that generates sample emails
3. WHEN testing task selection logic, THE TaskSelector SHALL be unit-testable with mock data
4. WHEN testing email delivery, THE EmailService SHALL support a test mode that logs emails instead of sending them
5. WHEN running integration tests, THE ReminderSystem SHALL use a separate SES configuration to avoid sending real emails
