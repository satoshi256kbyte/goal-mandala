import { PrismaClient } from '../src/generated/prisma-client';

describe('Database Migration Tests', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Table Existence Tests', () => {
    test('should have all required tables', async () => {
      const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;

      const tableNames = tables.map(t => t.table_name);
      const expectedTables = [
        'users',
        'goals',
        'sub_goals',
        'actions',
        'tasks',
        'task_reminders',
        'reflections',
        '_prisma_migrations',
      ];

      expectedTables.forEach(expectedTable => {
        expect(tableNames).toContain(expectedTable);
      });
    });

    test('should have correct table structure for users', async () => {
      const columns = await prisma.$queryRaw<
        Array<{ column_name: string; data_type: string; is_nullable: string }>
      >`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position;
      `;

      const expectedColumns = [
        { column_name: 'id', data_type: 'uuid', is_nullable: 'NO' },
        { column_name: 'email', data_type: 'character varying', is_nullable: 'NO' },
        { column_name: 'name', data_type: 'character varying', is_nullable: 'NO' },
        { column_name: 'industry', data_type: 'USER_DEFINED', is_nullable: 'YES' },
        { column_name: 'companySize', data_type: 'USER_DEFINED', is_nullable: 'YES' },
        { column_name: 'jobType', data_type: 'character varying', is_nullable: 'YES' },
        { column_name: 'position', data_type: 'character varying', is_nullable: 'YES' },
        { column_name: 'createdAt', data_type: 'timestamp with time zone', is_nullable: 'NO' },
        { column_name: 'updatedAt', data_type: 'timestamp with time zone', is_nullable: 'NO' },
      ];

      expectedColumns.forEach(expectedCol => {
        const actualCol = columns.find(c => c.column_name === expectedCol.column_name);
        expect(actualCol).toBeDefined();
        expect(actualCol?.data_type).toBe(expectedCol.data_type);
        expect(actualCol?.is_nullable).toBe(expectedCol.is_nullable);
      });
    });
  });

  describe('Enum Types Tests', () => {
    test('should have all required enum types', async () => {
      const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
        SELECT typname 
        FROM pg_type 
        WHERE typtype = 'e'
        ORDER BY typname;
      `;

      const enumNames = enums.map(e => e.typname);
      const expectedEnums = [
        'UserIndustry',
        'CompanySize',
        'GoalStatus',
        'TaskType',
        'TaskStatus',
        'ReminderStatus',
      ];

      expectedEnums.forEach(expectedEnum => {
        expect(enumNames).toContain(expectedEnum);
      });
    });

    test('should have correct enum values for UserIndustry', async () => {
      const enumValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
        SELECT enumlabel
        FROM pg_enum
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserIndustry')
        ORDER BY enumsortorder;
      `;

      const values = enumValues.map(e => e.enumlabel);
      const expectedValues = [
        'TECHNOLOGY',
        'FINANCE',
        'HEALTHCARE',
        'EDUCATION',
        'MANUFACTURING',
        'RETAIL',
        'CONSULTING',
        'GOVERNMENT',
        'NON_PROFIT',
        'OTHER',
      ];

      expect(values).toEqual(expect.arrayContaining(expectedValues));
    });
  });

  describe('Foreign Key Constraints Tests', () => {
    test('should have correct foreign key constraints', async () => {
      const constraints = await prisma.$queryRaw<
        Array<{
          constraint_name: string;
          table_name: string;
          column_name: string;
          foreign_table_name: string;
          foreign_column_name: string;
        }>
      >`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.table_name, tc.constraint_name;
      `;

      const expectedConstraints = [
        {
          table_name: 'goals',
          column_name: 'userId',
          foreign_table_name: 'users',
          foreign_column_name: 'id',
        },
        {
          table_name: 'sub_goals',
          column_name: 'goalId',
          foreign_table_name: 'goals',
          foreign_column_name: 'id',
        },
        {
          table_name: 'actions',
          column_name: 'subGoalId',
          foreign_table_name: 'sub_goals',
          foreign_column_name: 'id',
        },
        {
          table_name: 'tasks',
          column_name: 'actionId',
          foreign_table_name: 'actions',
          foreign_column_name: 'id',
        },
        {
          table_name: 'task_reminders',
          column_name: 'taskId',
          foreign_table_name: 'tasks',
          foreign_column_name: 'id',
        },
        {
          table_name: 'reflections',
          column_name: 'taskId',
          foreign_table_name: 'tasks',
          foreign_column_name: 'id',
        },
      ];

      expectedConstraints.forEach(expectedConstraint => {
        const actualConstraint = constraints.find(
          c =>
            c.table_name === expectedConstraint.table_name &&
            c.column_name === expectedConstraint.column_name
        );
        expect(actualConstraint).toBeDefined();
        expect(actualConstraint?.foreign_table_name).toBe(expectedConstraint.foreign_table_name);
        expect(actualConstraint?.foreign_column_name).toBe(expectedConstraint.foreign_column_name);
      });
    });
  });

  describe('Index Tests', () => {
    test('should have required indexes', async () => {
      const indexes = await prisma.$queryRaw<
        Array<{
          indexname: string;
          tablename: string;
        }>
      >`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
        ORDER BY tablename, indexname;
      `;

      const indexNames = indexes.map(i => `${i.tablename}.${i.indexname}`);

      // 期待されるインデックス（主キー以外）
      const expectedIndexes = [
        'users.users_email_key',
        'goals.goals_userId_status_idx',
        'goals.goals_userId_createdAt_idx',
        'sub_goals.sub_goals_goalId_position_key',
        'sub_goals.sub_goals_goalId_position_idx',
        'actions.actions_subGoalId_position_key',
        'actions.actions_subGoalId_position_idx',
        'tasks.tasks_actionId_status_idx',
        'tasks.tasks_status_createdAt_idx',
        'task_reminders.task_reminders_status_reminderAt_idx',
        'task_reminders.task_reminders_taskId_reminderAt_idx',
        'reflections.reflections_taskId_createdAt_idx',
      ];

      expectedIndexes.forEach(expectedIndex => {
        expect(indexNames).toContain(expectedIndex);
      });
    });
  });

  describe('Cascade Delete Tests', () => {
    test('should cascade delete from user to goals', async () => {
      // テストユーザー作成
      const user = await prisma.user.create({
        data: {
          email: 'test-cascade@example.com',
          name: 'Test User',
        },
      });

      // ゴール作成
      const goal = await prisma.goal.create({
        data: {
          userId: user.id,
          title: 'Test Goal',
          description: 'Test Description',
        },
      });

      // ユーザー削除
      await prisma.user.delete({
        where: { id: user.id },
      });

      // ゴールも削除されていることを確認
      const deletedGoal = await prisma.goal.findUnique({
        where: { id: goal.id },
      });

      expect(deletedGoal).toBeNull();
    });

    test('should cascade delete through the entire hierarchy', async () => {
      // テストデータ作成
      const user = await prisma.user.create({
        data: {
          email: 'test-hierarchy@example.com',
          name: 'Test User',
        },
      });

      const goal = await prisma.goal.create({
        data: {
          userId: user.id,
          title: 'Test Goal',
        },
      });

      const subGoal = await prisma.subGoal.create({
        data: {
          goalId: goal.id,
          title: 'Test SubGoal',
          position: 1,
        },
      });

      const action = await prisma.action.create({
        data: {
          subGoalId: subGoal.id,
          title: 'Test Action',
          position: 1,
        },
      });

      const task = await prisma.task.create({
        data: {
          actionId: action.id,
          title: 'Test Task',
        },
      });

      const reminder = await prisma.taskReminder.create({
        data: {
          taskId: task.id,
          reminderAt: new Date(),
        },
      });

      const reflection = await prisma.reflection.create({
        data: {
          taskId: task.id,
          content: 'Test reflection',
        },
      });

      // ユーザー削除
      await prisma.user.delete({
        where: { id: user.id },
      });

      // 全ての関連データが削除されていることを確認
      expect(await prisma.goal.findUnique({ where: { id: goal.id } })).toBeNull();
      expect(await prisma.subGoal.findUnique({ where: { id: subGoal.id } })).toBeNull();
      expect(await prisma.action.findUnique({ where: { id: action.id } })).toBeNull();
      expect(await prisma.task.findUnique({ where: { id: task.id } })).toBeNull();
      expect(await prisma.taskReminder.findUnique({ where: { id: reminder.id } })).toBeNull();
      expect(await prisma.reflection.findUnique({ where: { id: reflection.id } })).toBeNull();
    });
  });

  describe('Data Integrity Tests', () => {
    test('should enforce unique constraints', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'unique-test@example.com',
          name: 'Test User',
        },
      });

      // 同じメールアドレスでユーザー作成を試行
      await expect(
        prisma.user.create({
          data: {
            email: 'unique-test@example.com',
            name: 'Another User',
          },
        })
      ).rejects.toThrow();

      // クリーンアップ
      await prisma.user.delete({ where: { id: user.id } });
    });

    test('should enforce position uniqueness within same parent', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'position-test@example.com',
          name: 'Test User',
        },
      });

      const goal = await prisma.goal.create({
        data: {
          userId: user.id,
          title: 'Test Goal',
        },
      });

      await prisma.subGoal.create({
        data: {
          goalId: goal.id,
          title: 'SubGoal 1',
          position: 1,
        },
      });

      // 同じポジションでサブゴール作成を試行
      await expect(
        prisma.subGoal.create({
          data: {
            goalId: goal.id,
            title: 'SubGoal 2',
            position: 1,
          },
        })
      ).rejects.toThrow();

      // クリーンアップ
      await prisma.user.delete({ where: { id: user.id } });
    });
  });
});
