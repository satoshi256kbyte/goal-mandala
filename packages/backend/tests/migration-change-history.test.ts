import { PrismaClient } from '../src/generated/prisma-client';

describe.skip('ChangeHistory Migration Tests', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Schema Validation', () => {
    it('should have change_history table', async () => {
      const result = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'change_history'
      `;

      expect(result).toHaveLength(1);
      expect(result[0].table_name).toBe('change_history');
    });

    it('should have all required columns in change_history table', async () => {
      const columns = await prisma.$queryRaw<
        Array<{ column_name: string; data_type: string; is_nullable: string }>
      >`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'change_history'
        ORDER BY ordinal_position
      `;

      const columnNames = columns.map(col => col.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('entity_type');
      expect(columnNames).toContain('entity_id');
      expect(columnNames).toContain('user_id');
      expect(columnNames).toContain('changed_at');
      expect(columnNames).toContain('changes');
      expect(columnNames).toContain('created_at');
    });

    it('should have correct data types for change_history columns', async () => {
      const columns = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'change_history'
      `;

      const columnMap = new Map(columns.map(col => [col.column_name, col.data_type]));

      expect(columnMap.get('id')).toBe('uuid');
      expect(columnMap.get('entity_type')).toBe('character varying');
      expect(columnMap.get('entity_id')).toBe('uuid');
      expect(columnMap.get('user_id')).toBe('uuid');
      expect(columnMap.get('changed_at')).toBe('timestamp with time zone');
      expect(columnMap.get('changes')).toBe('jsonb');
      expect(columnMap.get('created_at')).toBe('timestamp with time zone');
    });

    it('should have indexes on change_history table', async () => {
      const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'change_history'
        AND schemaname = 'public'
      `;

      const indexNames = indexes.map(idx => idx.indexname);

      // Primary key index
      expect(indexNames).toContain('change_history_pkey');

      // Custom indexes
      expect(indexNames.some(name => name.includes('entity_type'))).toBe(true);
      expect(indexNames.some(name => name.includes('user_id'))).toBe(true);
    });

    it('should have foreign key constraint to users table', async () => {
      const constraints = await prisma.$queryRaw<
        Array<{ constraint_name: string; constraint_type: string }>
      >`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'change_history'
        AND constraint_type = 'FOREIGN KEY'
      `;

      expect(constraints.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity Tests', () => {
    let testUserId: string;
    let testGoalId: string;

    beforeEach(async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          name: 'Test User',
        },
      });
      testUserId = user.id;

      // Create test goal
      const goal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Test Goal',
          description: 'Test Description',
        },
      });
      testGoalId = goal.id;
    });

    afterEach(async () => {
      // Clean up test data
      await prisma.changeHistory.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.goal.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.user.delete({
        where: { id: testUserId },
      });
    });

    it('should create change history record', async () => {
      const changeHistory = await prisma.changeHistory.create({
        data: {
          entityType: 'goal',
          entityId: testGoalId,
          userId: testUserId,
          changes: [
            {
              field: 'title',
              oldValue: 'Old Title',
              newValue: 'New Title',
            },
          ],
        },
      });

      expect(changeHistory.id).toBeDefined();
      expect(changeHistory.entityType).toBe('goal');
      expect(changeHistory.entityId).toBe(testGoalId);
      expect(changeHistory.userId).toBe(testUserId);
      expect(changeHistory.changes).toEqual([
        {
          field: 'title',
          oldValue: 'Old Title',
          newValue: 'New Title',
        },
      ]);
    });

    it('should retrieve change history by entity', async () => {
      // Create multiple change history records
      await prisma.changeHistory.create({
        data: {
          entityType: 'goal',
          entityId: testGoalId,
          userId: testUserId,
          changes: [{ field: 'title', oldValue: 'Old', newValue: 'New' }],
        },
      });

      await prisma.changeHistory.create({
        data: {
          entityType: 'goal',
          entityId: testGoalId,
          userId: testUserId,
          changes: [{ field: 'description', oldValue: 'Old Desc', newValue: 'New Desc' }],
        },
      });

      const history = await prisma.changeHistory.findMany({
        where: {
          entityType: 'goal',
          entityId: testGoalId,
        },
        orderBy: {
          changedAt: 'desc',
        },
      });

      expect(history).toHaveLength(2);
      expect(history[0].entityId).toBe(testGoalId);
    });

    it('should cascade delete change history when user is deleted', async () => {
      await prisma.changeHistory.create({
        data: {
          entityType: 'goal',
          entityId: testGoalId,
          userId: testUserId,
          changes: [{ field: 'title', oldValue: 'Old', newValue: 'New' }],
        },
      });

      // Delete user (should cascade delete change history)
      await prisma.goal.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });

      const history = await prisma.changeHistory.findMany({
        where: { userId: testUserId },
      });

      expect(history).toHaveLength(0);

      // Prevent cleanup from failing
      testUserId = '';
    });

    it('should store complex changes in JSON format', async () => {
      const complexChanges = [
        {
          field: 'title',
          oldValue: 'Old Title',
          newValue: 'New Title',
        },
        {
          field: 'description',
          oldValue: 'Old Description',
          newValue: 'New Description',
        },
        {
          field: 'deadline',
          oldValue: '2024-01-01',
          newValue: '2024-12-31',
        },
      ];

      const changeHistory = await prisma.changeHistory.create({
        data: {
          entityType: 'goal',
          entityId: testGoalId,
          userId: testUserId,
          changes: complexChanges,
        },
      });

      expect(changeHistory.changes).toEqual(complexChanges);
      expect(Array.isArray(changeHistory.changes)).toBe(true);
      expect(changeHistory.changes).toHaveLength(3);
    });
  });

  describe('Updated At Field Tests', () => {
    let testUserId: string;

    beforeEach(async () => {
      const user = await prisma.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          name: 'Test User',
        },
      });
      testUserId = user.id;
    });

    afterEach(async () => {
      await prisma.goal.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
    });

    it('should have updatedAt field in Goal model', async () => {
      const goal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Test Goal',
        },
      });

      expect(goal.updatedAt).toBeDefined();
      expect(goal.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt when Goal is modified', async () => {
      const goal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Original Title',
        },
      });

      const originalUpdatedAt = goal.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedGoal = await prisma.goal.update({
        where: { id: goal.id },
        data: { title: 'Updated Title' },
      });

      expect(updatedGoal.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should have updatedAt field in SubGoal model', async () => {
      const goal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Test Goal',
          subGoals: {
            create: {
              title: 'Test SubGoal',
              position: 0,
            },
          },
        },
        include: { subGoals: true },
      });

      expect(goal.subGoals[0].updatedAt).toBeDefined();
      expect(goal.subGoals[0].updatedAt).toBeInstanceOf(Date);
    });

    it('should have updatedAt field in Action model', async () => {
      const goal = await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Test Goal',
          subGoals: {
            create: {
              title: 'Test SubGoal',
              position: 0,
              actions: {
                create: {
                  title: 'Test Action',
                  position: 0,
                },
              },
            },
          },
        },
        include: {
          subGoals: {
            include: { actions: true },
          },
        },
      });

      expect(goal.subGoals[0].actions[0].updatedAt).toBeDefined();
      expect(goal.subGoals[0].actions[0].updatedAt).toBeInstanceOf(Date);
    });
  });
});
