import { Page } from '@playwright/test';

export async function mockApiResponses(page: Page) {
  // Mock task list API
  await page.route('**/api/tasks', async route => {
    const url = new URL(route.request().url());
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    let tasks = [
      {
        id: 'task-1',
        actionId: 'action-1',
        title: '重要なタスク',
        description: 'これは重要なタスクです',
        type: 'execution',
        status: 'not_started',
        estimatedMinutes: 30,
        deadline: '2025-12-31T23:59:59Z',
        completedAt: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        action: {
          id: 'action-1',
          title: 'アクション1',
          subGoal: {
            id: 'subgoal-1',
            title: 'サブ目標1',
          },
        },
      },
      {
        id: 'task-2',
        actionId: 'action-2',
        title: '通常のタスク',
        description: '通常のタスクです',
        type: 'execution',
        status: 'in_progress',
        estimatedMinutes: 45,
        deadline: '2025-12-30T23:59:59Z',
        completedAt: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        action: {
          id: 'action-2',
          title: 'アクション2',
          subGoal: {
            id: 'subgoal-2',
            title: 'サブ目標2',
          },
        },
      },
      {
        id: 'task-3',
        actionId: 'action-3',
        title: '完了したタスク',
        description: '完了したタスクです',
        type: 'execution',
        status: 'completed',
        estimatedMinutes: 60,
        deadline: '2025-12-29T23:59:59Z',
        completedAt: '2025-01-15T10:00:00Z',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z',
        action: {
          id: 'action-3',
          title: 'アクション3',
          subGoal: {
            id: 'subgoal-3',
            title: 'サブ目標3',
          },
        },
      },
    ];

    // Apply status filter
    if (status) {
      const statuses = status.split(',');
      tasks = tasks.filter(task => statuses.includes(task.status));
    }

    // Apply search filter
    if (search) {
      tasks = tasks.filter(
        task => task.title.includes(search) || task.description.includes(search)
      );
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tasks,
        total: tasks.length,
        page: 1,
        pageSize: 20,
      }),
    });
  });

  // Mock task detail API
  await page.route('**/api/tasks/*', async route => {
    const method = route.request().method();
    const url = route.request().url();
    const taskId = url.split('/').pop()?.split('?')[0];

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          task: {
            id: taskId,
            actionId: 'action-1',
            title: '重要なタスク',
            description: 'これは重要なタスクです',
            type: 'execution',
            status: 'not_started',
            estimatedMinutes: 30,
            deadline: '2025-12-31T23:59:59Z',
            completedAt: null,
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
          notes: [
            {
              id: 'note-1',
              content: 'これは重要なタスクです',
              createdAt: '2025-01-01T00:00:00Z',
              updatedAt: '2025-01-01T00:00:00Z',
            },
          ],
          history: [
            {
              id: 'history-1',
              oldStatus: 'not_started',
              newStatus: 'in_progress',
              changedAt: '2025-01-01T00:00:00Z',
              userId: 'user-1',
            },
          ],
        }),
      });
    } else if (method === 'PATCH') {
      const body = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          task: {
            id: taskId,
            status: body.status,
            completedAt: body.status === 'completed' ? new Date().toISOString() : null,
            updatedAt: new Date().toISOString(),
          },
          progress: {
            action: 50,
            subGoal: 25,
            goal: 12,
          },
        }),
      });
    }
  });

  // Mock task notes API
  await page.route('**/api/tasks/*/notes', async route => {
    const method = route.request().method();

    if (method === 'POST') {
      const body = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          note: {
            id: 'note-' + Date.now(),
            taskId: 'task-1',
            content: body.content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: 'user-1',
          },
        }),
      });
    }
  });

  // Mock bulk operations API
  await page.route('**/api/tasks/bulk/status', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        updatedCount: 2,
      }),
    });
  });

  // Mock saved views API
  await page.route('**/api/saved-views', async route => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          views: [
            {
              id: 'view-1',
              name: '完了した重要タスク',
              filters: {
                statuses: ['completed'],
              },
              searchQuery: '重要',
              createdAt: '2025-01-01T00:00:00Z',
            },
          ],
        }),
      });
    } else if (method === 'POST') {
      const body = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          view: {
            id: 'view-' + Date.now(),
            name: body.name,
            filters: body.filters,
            searchQuery: body.searchQuery,
            createdAt: new Date().toISOString(),
          },
        }),
      });
    }
  });
}
