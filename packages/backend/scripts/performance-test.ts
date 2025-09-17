import { PrismaClient } from '../src/generated/prisma-client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function performanceTest() {
  console.log('🚀 Starting Prisma Performance Tests...');

  try {
    // Test 1: Basic CRUD operations
    console.log('\n📊 Test 1: Basic CRUD Operations');
    const startTime = Date.now();

    const user = await prisma.user.create({
      data: {
        email: `perf-test-${Date.now()}@example.com`,
        name: 'Performance Test User',
        industry: 'TECHNOLOGY',
        companySize: 'STARTUP',
      },
    });

    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: 'Performance Test Goal',
        description: 'Testing database performance',
        status: 'ACTIVE',
      },
    });

    const updatedGoal = await prisma.goal.update({
      where: { id: goal.id },
      data: { progress: 50 },
    });
    console.log(`Updated goal progress: ${updatedGoal.progress}%`);

    const fetchedGoal = await prisma.goal.findUnique({
      where: { id: goal.id },
    });
    console.log(`Fetched goal: ${fetchedGoal?.title}`);

    await prisma.goal.delete({
      where: { id: goal.id },
    });

    await prisma.user.delete({
      where: { id: user.id },
    });

    const crudTime = Date.now() - startTime;
    console.log(`✅ CRUD operations completed in ${crudTime}ms`);

    // Test 2: Hierarchical data retrieval
    console.log('\n📊 Test 2: Hierarchical Data Retrieval');
    const hierarchyStartTime = Date.now();

    // Create test data
    const testUser = await prisma.user.create({
      data: {
        email: `hierarchy-test-${Date.now()}@example.com`,
        name: 'Hierarchy Test User',
        industry: 'TECHNOLOGY',
      },
    });

    const testGoal = await prisma.goal.create({
      data: {
        userId: testUser.id,
        title: 'Hierarchy Test Goal',
        status: 'ACTIVE',
      },
    });

    // Create sub goals
    const subGoals = [];
    for (let i = 0; i < 8; i++) {
      const subGoal = await prisma.subGoal.create({
        data: {
          goalId: testGoal.id,
          title: `Sub Goal ${i}`,
          position: i,
        },
      });
      subGoals.push(subGoal);
    }

    // Create actions
    for (const subGoal of subGoals) {
      for (let i = 0; i < 8; i++) {
        await prisma.action.create({
          data: {
            subGoalId: subGoal.id,
            title: `Action ${i}`,
            position: i,
          },
        });
      }
    }

    // Test hierarchical query
    const hierarchyQueryStart = Date.now();
    const fullHierarchy = await prisma.goal.findUnique({
      where: { id: testGoal.id },
      include: {
        subGoals: {
          include: {
            actions: {
              include: {
                tasks: true,
              },
            },
          },
        },
      },
    });

    const hierarchyQueryTime = Date.now() - hierarchyQueryStart;
    console.log(`✅ Hierarchical query completed in ${hierarchyQueryTime}ms`);
    console.log(
      `📈 Retrieved: 1 goal, ${fullHierarchy?.subGoals.length} sub goals, ${fullHierarchy?.subGoals.reduce((acc, sg) => acc + sg.actions.length, 0)} actions`
    );

    // Test 3: Index performance
    console.log('\n📊 Test 3: Index Performance');
    const indexTestStart = Date.now();

    // Test user goals query (should use index)
    const userGoals = await prisma.goal.findMany({
      where: {
        userId: testUser.id,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log(`Found ${userGoals.length} user goals`);

    // Test position-based queries (should use index)
    const positionQuery = await prisma.subGoal.findMany({
      where: {
        goalId: testGoal.id,
      },
      orderBy: {
        position: 'asc',
      },
    });
    console.log(`Found ${positionQuery.length} sub goals in order`);

    const indexTestTime = Date.now() - indexTestStart;
    console.log(`✅ Index queries completed in ${indexTestTime}ms`);

    // Cleanup
    await prisma.goal.delete({
      where: { id: testGoal.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });

    const totalTime = Date.now() - hierarchyStartTime;
    console.log(`✅ Hierarchical test completed in ${totalTime}ms`);

    // Test 4: Bulk operations
    console.log('\n📊 Test 4: Bulk Operations');
    const bulkStartTime = Date.now();

    const bulkUser = await prisma.user.create({
      data: {
        email: `bulk-test-${Date.now()}@example.com`,
        name: 'Bulk Test User',
        industry: 'TECHNOLOGY',
      },
    });

    // Create multiple goals at once
    const bulkGoals = await prisma.goal.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        userId: bulkUser.id,
        title: `Bulk Goal ${i}`,
        status: 'ACTIVE' as const,
      })),
    });

    const bulkTime = Date.now() - bulkStartTime;
    console.log(`✅ Bulk operations completed in ${bulkTime}ms`);
    console.log(`📈 Created ${bulkGoals.count} goals`);

    // Cleanup
    await prisma.goal.deleteMany({
      where: { userId: bulkUser.id },
    });
    await prisma.user.delete({
      where: { id: bulkUser.id },
    });

    console.log('\n🎉 All performance tests completed successfully!');
  } catch (error) {
    console.error('❌ Performance test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run performance test
performanceTest();
