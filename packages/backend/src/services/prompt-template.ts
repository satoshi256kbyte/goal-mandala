/**
 * プロンプトテンプレート管理
 */

import type { GoalInput, SubGoalInput, ActionInput } from '../types/ai-generation.types.js';
import type { GenerationContext } from '../types/action-generation.types.js';
import type { TaskGenerationContext } from '../types/task-generation.types.js';
import { INPUT_LIMITS, INJECTION_PATTERNS } from '../config/bedrock.config.js';

/**
 * プロンプトテンプレートマネージャー
 */
export class PromptTemplateManager {
  /**
   * サブ目標生成プロンプトを構築
   */
  buildSubGoalPrompt(input: GoalInput): string {
    // 入力のサニタイズとインジェクション検出
    const sanitizedTitle = this.sanitizeInput(input.title);
    const sanitizedDescription = this.sanitizeInput(input.description);
    const sanitizedBackground = this.sanitizeInput(input.background);
    const sanitizedConstraints = input.constraints ? this.sanitizeInput(input.constraints) : 'なし';

    this.detectInjection(sanitizedTitle);
    this.detectInjection(sanitizedDescription);
    this.detectInjection(sanitizedBackground);

    const systemMessage = `あなたは目標達成の専門家です。ユーザーの目標を分析し、それを達成するための8つの具体的なサブ目標を提案してください。`;

    const userMessage = `# 目標
タイトル: ${sanitizedTitle}
説明: ${sanitizedDescription}
達成期限: ${input.deadline}

# 背景
${sanitizedBackground}

# 制約事項
${sanitizedConstraints}

# 指示
上記の目標を達成するために必要な8つのサブ目標を生成してください。
各サブ目標は以下の条件を満たす必要があります：
- 目標達成に直接貢献する
- 具体的で測定可能である
- 互いに重複しない
- バランスよく目標をカバーする

# 出力形式
以下のJSON形式で出力してください：
{
  "subGoals": [
    {
      "title": "サブ目標のタイトル（30文字以内）",
      "description": "サブ目標の詳細説明（200文字以内）",
      "background": "このサブ目標が必要な理由（100文字以内）",
      "position": 0
    }
    // ... 8個のサブ目標
  ]
}`;

    return `${systemMessage}\n\n${userMessage}`;
  }

  /**
   * アクション生成プロンプトを構築
   */
  buildActionPrompt(input: SubGoalInput): string {
    // 入力のサニタイズとインジェクション検出
    const sanitizedGoalTitle = this.sanitizeInput(input.goalTitle);
    const sanitizedSubGoalTitle = this.sanitizeInput(input.subGoalTitle);
    const sanitizedSubGoalDescription = this.sanitizeInput(input.subGoalDescription);
    const sanitizedBackground = this.sanitizeInput(input.background);
    const sanitizedConstraints = input.constraints ? this.sanitizeInput(input.constraints) : 'なし';

    this.detectInjection(sanitizedSubGoalTitle);
    this.detectInjection(sanitizedSubGoalDescription);
    this.detectInjection(sanitizedBackground);

    const systemMessage = `あなたは行動計画の専門家です。サブ目標を分析し、それを達成するための8つの具体的なアクションを提案してください。`;

    const userMessage = `# 目標コンテキスト
目標: ${sanitizedGoalTitle}
目標説明: ${input.goalDescription}

# サブ目標
タイトル: ${sanitizedSubGoalTitle}
説明: ${sanitizedSubGoalDescription}

# 背景
${sanitizedBackground}

# 制約事項
${sanitizedConstraints}

# 指示
上記のサブ目標を達成するために必要な8つのアクションを生成してください。
各アクションは以下の条件を満たす必要があります：
- サブ目標達成に直接貢献する
- 実行可能で具体的である
- 「実行アクション」または「習慣アクション」のいずれかに分類される
- 互いに重複しない

アクションタイプの定義：
- 実行アクション (execution): 一度実行すれば完了するもの（例：プログラムを書く、登壇する）
- 習慣アクション (habit): 継続的に行う必要があるもの（例：読書、ランニング）

# 出力形式
以下のJSON形式で出力してください：
{
  "actions": [
    {
      "title": "アクションのタイトル（30文字以内）",
      "description": "アクションの詳細説明（200文字以内）",
      "type": "execution" または "habit",
      "background": "このアクションが必要な理由（100文字以内）",
      "position": 0
    }
    // ... 8個のアクション
  ]
}`;

    return `${systemMessage}\n\n${userMessage}`;
  }

  /**
   * タスク生成プロンプトを構築
   */
  buildTaskPrompt(input: ActionInput): string {
    // 入力のサニタイズとインジェクション検出
    const sanitizedTitle = this.sanitizeInput(input.actionTitle);
    const sanitizedDescription = this.sanitizeInput(input.actionDescription);
    const sanitizedBackground = this.sanitizeInput(input.background);
    const sanitizedConstraints = input.constraints ? this.sanitizeInput(input.constraints) : 'なし';

    this.detectInjection(sanitizedTitle);
    this.detectInjection(sanitizedDescription);
    this.detectInjection(sanitizedBackground);

    const systemMessage = `あなたはタスク分解の専門家です。アクションを分析し、それを実行するための具体的なタスクに分解してください。`;

    const userMessage = `# アクション
タイトル: ${sanitizedTitle}
説明: ${sanitizedDescription}
タイプ: ${input.actionType}

# 背景
${sanitizedBackground}

# 制約事項
${sanitizedConstraints}

# 指示
上記のアクションを実行するための具体的なタスクに分解してください。
各タスクは以下の条件を満たす必要があります：
- 所要時間が30分〜60分程度である
- 具体的で実行可能である
- アクションタイプ（実行/習慣）に対応している
- 順序立てて実行できる

タスク数の目安：
- 実行アクション: 3〜10個のタスク
- 習慣アクション: 1〜3個の繰り返しタスク

# 出力形式
以下のJSON形式で出力してください：
{
  "tasks": [
    {
      "title": "タスクのタイトル（50文字以内）",
      "description": "タスクの詳細説明（200文字以内）",
      "type": "${input.actionType}",
      "estimatedMinutes": 30
    }
    // ... 必要な数のタスク
  ]
}`;

    return `${systemMessage}\n\n${userMessage}`;
  }

  /**
   * アクション生成プロンプトを構築（GenerationContext版）
   */
  buildActionPromptWithContext(context: GenerationContext): string {
    // 入力のサニタイズとインジェクション検出
    const sanitizedGoalTitle = this.sanitizeInput(context.goal.title);
    const sanitizedGoalDescription = this.sanitizeInput(context.goal.description);
    const sanitizedGoalBackground = this.sanitizeInput(context.goal.background);
    const sanitizedGoalConstraints = context.goal.constraints
      ? this.sanitizeInput(context.goal.constraints)
      : 'なし';

    const sanitizedSubGoalTitle = this.sanitizeInput(context.subGoal.title);
    const sanitizedSubGoalDescription = this.sanitizeInput(context.subGoal.description);
    const sanitizedSubGoalBackground = this.sanitizeInput(context.subGoal.background);

    this.detectInjection(sanitizedGoalTitle);
    this.detectInjection(sanitizedSubGoalTitle);
    this.detectInjection(sanitizedSubGoalDescription);
    this.detectInjection(sanitizedSubGoalBackground);

    // 関連サブ目標の情報を構築
    const relatedSubGoalsText = context.relatedSubGoals
      .map(sg => {
        const title = this.sanitizeInput(sg.title);
        const description = this.sanitizeInput(sg.description);
        return `- ${title}: ${description}`;
      })
      .join('\n');

    // ユーザー情報の構築
    const userIndustry = context.user.industry || '未設定';
    const userJobType = context.user.jobType || '未設定';

    // 期限のフォーマット
    const deadlineStr = context.goal.deadline.toISOString().split('T')[0];

    // プロンプトを最適化：重要な情報に集中し、冗長な説明を削減
    const systemMessage = `目標達成の専門家として、サブ目標を達成するための8つの具体的なアクションを提案してください。

条件：
- サブ目標達成に直接貢献
- 具体的で実行可能
- 重複なし
- タイプ: execution（一度で完了）またはhabit（継続実施）`;

    const userMessage = `目標: ${sanitizedGoalTitle}（期限: ${deadlineStr}）
${sanitizedGoalDescription}
${sanitizedGoalBackground ? `背景: ${sanitizedGoalBackground}` : ''}
${sanitizedGoalConstraints ? `制約: ${sanitizedGoalConstraints}` : ''}

サブ目標: ${sanitizedSubGoalTitle}
${sanitizedSubGoalDescription}
${sanitizedSubGoalBackground ? `背景: ${sanitizedSubGoalBackground}` : ''}

${relatedSubGoalsText ? `関連サブ目標:\n${relatedSubGoalsText}\n` : ''}
ユーザー: ${userIndustry} / ${userJobType}

「${sanitizedSubGoalTitle}」を達成する8つのアクションを生成してください。

JSON形式で出力：
{
  "actions": [
    {
      "title": "アクション名（50文字以内）",
      "description": "詳細（100-200文字）",
      "background": "理由（100文字以内）",
      "type": "execution|habit",
      "position": 0
    }
  ]
}`;

    return `${systemMessage}\n\n${userMessage}`;
  }

  /**
   * タスク生成プロンプトを構築（TaskGenerationContext版）
   */
  buildTaskPromptWithContext(context: TaskGenerationContext): string {
    // 入力のサニタイズとインジェクション検出
    const sanitizedGoalTitle = this.sanitizeInput(context.goal.title);
    const sanitizedSubGoalTitle = this.sanitizeInput(context.subGoal.title);
    const sanitizedActionTitle = this.sanitizeInput(context.action.title);
    const sanitizedActionDescription = this.sanitizeInput(context.action.description);
    const sanitizedActionBackground = this.sanitizeInput(context.action.background);

    this.detectInjection(sanitizedActionTitle);
    this.detectInjection(sanitizedActionDescription);
    this.detectInjection(sanitizedActionBackground);

    // 期限のフォーマット
    const deadlineStr = context.goal.deadline.toISOString().split('T')[0];

    // プロンプトを最適化：不要な情報を削減し、重要な情報に集中
    const systemMessage = `タスク分解の専門家として、アクションを30-60分の具体的なタスクに分解してください。

条件：
- 所要時間: 30-60分
- 具体的で実行可能
- タイプ: ${context.action.type}
- タスク数: ${context.action.type === 'execution' ? '3-10個' : '1-3個'}`;

    const userMessage = `目標: ${sanitizedGoalTitle}（期限: ${deadlineStr}）
サブ目標: ${sanitizedSubGoalTitle}

アクション: ${sanitizedActionTitle}
説明: ${sanitizedActionDescription}
${sanitizedActionBackground ? `背景: ${sanitizedActionBackground}` : ''}

${sanitizedActionTitle}を実行するタスクに分解してください。各タスク30-60分、具体的で実行可能な内容にしてください。

JSON形式で出力：
{
  "tasks": [
    {
      "title": "タスク名（50文字以内）",
      "description": "詳細（200文字以内）",
      "type": "${context.action.type}",
      "estimatedMinutes": 45,
      "priority": "HIGH|MEDIUM|LOW",
      "dependencies": []
    }
  ]
}`;

    return `${systemMessage}\n\n${userMessage}`;
  }

  /**
   * 入力をサニタイズ
   */
  sanitizeInput(input: string): string {
    // 特殊文字のエスケープ
    let sanitized = input.replace(/[<>]/g, '').replace(/[{}]/g, '').trim();

    // 長さ制限
    const maxLength = INPUT_LIMITS.maxDescriptionLength;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * プロンプトインジェクションを検出
   */
  detectInjection(input: string): void {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        throw new Error('プロンプトインジェクションの可能性が検出されました');
      }
    }
  }
}
