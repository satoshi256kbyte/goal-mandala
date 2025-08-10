# データベース設計

## データベース設計概要

曼荼羅目標管理システムのデータベース設計では、以下の主要エンティティを定義します：

- **User**: システム利用者
- **Goal**: 中心目標
- **SubGoal**: サブ目標（8個）
- **Action**: アクション（各サブ目標に8個）
- **Task**: タスク（各アクションに複数）
- **TaskReminder**: タスクリマインド
- **Reflection**: 振り返り

## ER図

```mermaid
erDiagram
    User {
        string id PK
        string email
        string name
        string industry
        string company_size
        string job_title
        string position
        datetime created_at
        datetime updated_at
    }
    
    Goal {
        string id PK
        string user_id FK
        string title
        text description
        date deadline
        text background
        text constraints
        enum status
        int progress
        datetime created_at
        datetime updated_at
    }
    
    SubGoal {
        string id PK
        string goal_id FK
        string title
        text description
        text background
        text constraints
        int position
        int progress
        datetime created_at
        datetime updated_at
    }
    
    Action {
        string id PK
        string sub_goal_id FK
        string title
        text description
        text background
        text constraints
        enum type
        int position
        int progress
        datetime created_at
        datetime updated_at
    }
    
    Task {
        string id PK
        string action_id FK
        string title
        text description
        enum type
        enum status
        int estimated_minutes
        datetime completed_at
        datetime created_at
        datetime updated_at
    }
    
    TaskReminder {
        string id PK
        string task_id FK
        date reminder_date
        boolean sent
        datetime sent_at
        datetime created_at
    }
    
    Reflection {
        string id PK
        string goal_id FK
        text summary
        text regretful_actions
        text slow_progress_actions
        text untouched_actions
        datetime created_at
        datetime updated_at
    }
    
    User ||--o{ Goal : creates
    Goal ||--o{ SubGoal : contains
    SubGoal ||--o{ Action : contains
    Action ||--o{ Task : contains
    Task ||--o{ TaskReminder : has
    Goal ||--o{ Reflection : has
```

## リレーションシップ詳細

### User - Goal (1:N)

- 1人のユーザーは複数の目標を持つことができる
- 目標は必ず1人のユーザーに属する

### Goal - SubGoal (1:8)

- 1つの目標は必ず8つのサブ目標を持つ
- サブ目標は必ず1つの目標に属する

### SubGoal - Action (1:8)

- 1つのサブ目標は必ず8つのアクションを持つ
- アクションは必ず1つのサブ目標に属する

### Action - Task (1:N)

- 1つのアクションは複数のタスクを持つことができる
- タスクは必ず1つのアクションに属する

### Task - TaskReminder (1:N)

- 1つのタスクは複数のリマインドを持つことができる
- リマインドは必ず1つのタスクに属する

### Goal - Reflection (1:N)

- 1つの目標は複数の振り返りを持つことができる
- 振り返りは必ず1つの目標に属する

## データ整合性制約

### 必須制約

- すべてのエンティティにid（主キー）が必要
- 外部キー制約により参照整合性を保証
- email（User）はユニーク制約

### ビジネスルール制約

- SubGoalのpositionは0-7の範囲
- Actionのpositionは0-7の範囲
- Goalのprogressは0-100の範囲
- SubGoalのprogressは0-100の範囲
- Actionのprogressは0-100の範囲

### カスケード削除

- User削除時：関連するGoalも削除
- Goal削除時：関連するSubGoal、Reflectionも削除
- SubGoal削除時：関連するActionも削除
- Action削除時：関連するTaskも削除
- Task削除時：関連するTaskReminderも削除
