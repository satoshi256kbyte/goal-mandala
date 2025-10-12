export const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  industry: 'TECHNOLOGY',
  companySize: 'SMALL',
  jobType: 'Engineer',
  position: 'Senior',
};

export const testGoal = {
  id: 'test-goal-id',
  userId: 'test-user-id',
  title: 'Test Goal',
  description: 'Test goal description',
  background: 'Test background',
  status: 'ACTIVE',
  progress: 0,
};

export const testSubGoal = {
  id: 'test-subgoal-id',
  goalId: 'test-goal-id',
  title: 'Test SubGoal',
  description: 'Test subgoal description',
  position: 0,
  progress: 0,
};

export const testAction = {
  id: 'test-action-id',
  subGoalId: 'test-subgoal-id',
  title: 'Test Action',
  description: 'Test action description',
  type: 'EXECUTION',
  position: 0,
  progress: 0,
};

export const testTask = {
  id: 'test-task-id',
  actionId: 'test-action-id',
  title: 'Test Task',
  description: 'Test task description',
  type: 'ACTION',
  status: 'PENDING',
  estimatedTime: 30,
};
