# タスク管理機能 要件定義

## Introduction

タスク管理機能は、マンダラチャートから生成されたタスクを日々管理し、利用者が効率的にタスクを消化・継続できるようにする機能です。タスクの一覧表示、詳細確認、状態更新、フィルター・検索、進捗計算を提供します。

## Glossary

- **Task（タスク）**: アクションを実施するための具体的な作業単位
- **ExecutionTask（実行タスク）**: 一度実施すれば完了となるタスク
- **HabitTask（習慣タスク）**: 継続的に実施する必要があるタスク
- **TaskStatus（タスク状態）**: タスクの実行状況（未着手/進行中/完了/スキップ）
- **Action（アクション）**: サブ目標を達成するために必要な具体的な行動
- **SubGoal（サブ目標）**: 中心の目標を達成するために必要な具体的な目標
- **Goal（目標）**: 具体的な成果物や達成したい状態
- **Progress（進捗）**: タスク、アクション、サブ目標、目標の達成度（0-100%）
- **Reminder（リマインド）**: タスクの消化または継続を促すための通知
- **Filter（フィルター）**: タスクを特定の条件で絞り込む機能
- **Search（検索）**: タスクをキーワードで検索する機能

## Requirements

### Requirement 1

**User Story:** As a user, I want to view my task list, so that I can see what tasks I need to complete today.

#### Acceptance Criteria

1. WHEN a user accesses the task list page THEN the system SHALL display all tasks assigned to the user
2. WHEN displaying tasks THEN the system SHALL show task title, description, type, status, estimated time, and deadline
3. WHEN displaying tasks THEN the system SHALL group tasks by status (not started, in progress, completed, skipped)
4. WHEN displaying tasks THEN the system SHALL highlight tasks with approaching deadlines
5. WHEN displaying tasks THEN the system SHALL show the associated action and sub-goal for each task

### Requirement 2

**User Story:** As a user, I want to update task status, so that I can track my progress.

#### Acceptance Criteria

1. WHEN a user clicks on a task THEN the system SHALL display the task detail page
2. WHEN viewing task details THEN the system SHALL show all task information including title, description, type, status, estimated time, deadline, and completion time
3. WHEN a user updates task status THEN the system SHALL save the new status immediately
4. WHEN a user marks a task as completed THEN the system SHALL record the completion time
5. WHEN a user updates task status THEN the system SHALL recalculate and update the progress of the associated action, sub-goal, and goal

### Requirement 3

**User Story:** As a user, I want to add notes to tasks, so that I can record important information.

#### Acceptance Criteria

1. WHEN viewing task details THEN the system SHALL provide a note input field
2. WHEN a user enters a note THEN the system SHALL save the note with a timestamp
3. WHEN viewing task details THEN the system SHALL display all notes in chronological order
4. WHEN a user edits a note THEN the system SHALL update the note and record the edit time
5. WHEN a user deletes a note THEN the system SHALL remove the note from the task

### Requirement 4

**User Story:** As a user, I want to filter tasks by status, so that I can focus on specific tasks.

#### Acceptance Criteria

1. WHEN a user selects a status filter THEN the system SHALL display only tasks with the selected status
2. WHEN a user selects multiple status filters THEN the system SHALL display tasks matching any of the selected statuses
3. WHEN a user clears all filters THEN the system SHALL display all tasks
4. WHEN a user applies a filter THEN the system SHALL maintain the filter selection across page reloads
5. WHEN displaying filtered tasks THEN the system SHALL show the count of tasks for each status

### Requirement 5

**User Story:** As a user, I want to filter tasks by deadline, so that I can prioritize urgent tasks.

#### Acceptance Criteria

1. WHEN a user selects a deadline filter THEN the system SHALL display only tasks with deadlines in the selected range
2. WHEN a user selects "today" filter THEN the system SHALL display tasks with deadlines on the current day
3. WHEN a user selects "this week" filter THEN the system SHALL display tasks with deadlines within the current week
4. WHEN a user selects "overdue" filter THEN the system SHALL display tasks with deadlines in the past and status not completed
5. WHEN displaying filtered tasks THEN the system SHALL sort tasks by deadline in ascending order

### Requirement 6

**User Story:** As a user, I want to filter tasks by action, so that I can focus on tasks related to a specific action.

#### Acceptance Criteria

1. WHEN a user selects an action filter THEN the system SHALL display only tasks associated with the selected action
2. WHEN a user selects multiple action filters THEN the system SHALL display tasks associated with any of the selected actions
3. WHEN displaying action filters THEN the system SHALL show the action title and associated sub-goal
4. WHEN a user clears action filters THEN the system SHALL display all tasks
5. WHEN displaying filtered tasks THEN the system SHALL group tasks by action

### Requirement 7

**User Story:** As a user, I want to search tasks by keyword, so that I can quickly find specific tasks.

#### Acceptance Criteria

1. WHEN a user enters a search keyword THEN the system SHALL display tasks with titles or descriptions containing the keyword
2. WHEN a user enters multiple keywords THEN the system SHALL display tasks matching all keywords
3. WHEN a user clears the search keyword THEN the system SHALL display all tasks
4. WHEN displaying search results THEN the system SHALL highlight the matched keywords in task titles and descriptions
5. WHEN no tasks match the search keyword THEN the system SHALL display a message indicating no results found

### Requirement 8

**User Story:** As a user, I want to save my search and filter settings, so that I can quickly access frequently used views.

#### Acceptance Criteria

1. WHEN a user applies filters and search THEN the system SHALL provide an option to save the current view
2. WHEN a user saves a view THEN the system SHALL prompt for a view name
3. WHEN a user saves a view THEN the system SHALL store the filter and search settings
4. WHEN a user selects a saved view THEN the system SHALL apply the saved filter and search settings
5. WHEN a user deletes a saved view THEN the system SHALL remove the view from the saved views list

### Requirement 9

**User Story:** As a user, I want to perform bulk operations on tasks, so that I can efficiently manage multiple tasks.

#### Acceptance Criteria

1. WHEN viewing the task list THEN the system SHALL provide checkboxes for selecting multiple tasks
2. WHEN a user selects multiple tasks THEN the system SHALL display bulk operation options
3. WHEN a user performs a bulk status update THEN the system SHALL update the status of all selected tasks
4. WHEN a user performs a bulk delete THEN the system SHALL prompt for confirmation before deleting
5. WHEN a user performs a bulk operation THEN the system SHALL display a success message with the count of affected tasks

### Requirement 10

**User Story:** As a system, I want to calculate task progress, so that I can update action progress.

#### Acceptance Criteria

1. WHEN a task status changes to completed THEN the system SHALL recalculate the progress of the associated action
2. WHEN calculating action progress for execution actions THEN the system SHALL compute the percentage of completed tasks
3. WHEN calculating action progress for habit actions THEN the system SHALL compute the percentage of days with completed tasks
4. WHEN action progress reaches 100% THEN the system SHALL mark the action as achieved
5. WHEN action progress changes THEN the system SHALL trigger sub-goal progress recalculation

### Requirement 11

**User Story:** As a system, I want to calculate action progress, so that I can update sub-goal progress.

#### Acceptance Criteria

1. WHEN an action progress changes THEN the system SHALL recalculate the progress of the associated sub-goal
2. WHEN calculating sub-goal progress THEN the system SHALL compute the average progress of all associated actions
3. WHEN sub-goal progress reaches 100% THEN the system SHALL mark the sub-goal as achieved
4. WHEN sub-goal progress changes THEN the system SHALL trigger goal progress recalculation
5. WHEN calculating sub-goal progress THEN the system SHALL round the result to the nearest integer

### Requirement 12

**User Story:** As a system, I want to calculate sub-goal progress, so that I can update goal progress.

#### Acceptance Criteria

1. WHEN a sub-goal progress changes THEN the system SHALL recalculate the progress of the associated goal
2. WHEN calculating goal progress THEN the system SHALL compute the average progress of all associated sub-goals
3. WHEN goal progress reaches 100% THEN the system SHALL mark the goal as achieved
4. WHEN goal progress changes THEN the system SHALL update the goal status
5. WHEN calculating goal progress THEN the system SHALL round the result to the nearest integer

### Requirement 13

**User Story:** As a user, I want to see task history, so that I can track my task completion over time.

#### Acceptance Criteria

1. WHEN viewing task details THEN the system SHALL display a history of status changes
2. WHEN displaying task history THEN the system SHALL show the timestamp, old status, new status, and user who made the change
3. WHEN displaying task history THEN the system SHALL sort history entries in reverse chronological order
4. WHEN a task status changes THEN the system SHALL automatically create a history entry
5. WHEN viewing task history THEN the system SHALL display the total time spent on the task

### Requirement 14

**User Story:** As a user, I want to see visual progress indicators, so that I can quickly understand my progress.

#### Acceptance Criteria

1. WHEN viewing the task list THEN the system SHALL display a progress bar for each action
2. WHEN viewing the task list THEN the system SHALL display a progress bar for each sub-goal
3. WHEN viewing the task list THEN the system SHALL display a progress bar for the goal
4. WHEN displaying progress bars THEN the system SHALL use color coding to indicate progress level (red: 0-33%, yellow: 34-66%, green: 67-100%)
5. WHEN displaying progress bars THEN the system SHALL show the percentage value next to the bar

### Requirement 15

**User Story:** As a user, I want to receive notifications for task deadlines, so that I don't miss important tasks.

#### Acceptance Criteria

1. WHEN a task deadline is approaching (within 24 hours) THEN the system SHALL send a notification to the user
2. WHEN a task deadline has passed and the task is not completed THEN the system SHALL send an overdue notification
3. WHEN sending notifications THEN the system SHALL include the task title, deadline, and a link to the task detail page
4. WHEN a user clicks on a notification link THEN the system SHALL navigate to the task detail page
5. WHEN a user marks a task as completed THEN the system SHALL cancel any pending deadline notifications for that task
