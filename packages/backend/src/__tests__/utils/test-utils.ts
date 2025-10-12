export const createMockUser = (data = {}) => ({
  id: 'test-user',
  email: 'test@example.com',
  name: 'Test User',
  ...data,
});
export const createMockGoal = (data = {}) => ({
  id: 'test-goal',
  title: 'Test Goal',
  userId: 'test-user',
  ...data,
});
export const createMockSubGoal = (data = {}) => ({
  id: 'test-subgoal',
  goalId: 'test-goal',
  position: 0,
  ...data,
});
export const createMockAction = (data = {}) => ({
  id: 'test-action',
  subGoalId: 'test-subgoal',
  type: 'EXECUTION',
  ...data,
});
export const createMockTask = (data = {}) => ({
  id: 'test-task',
  actionId: 'test-action',
  status: 'NOT_STARTED',
  ...data,
});
export const createMockProcessingState = (data = {}) => ({
  id: 'test-state',
  userId: 'test-user',
  status: 'PENDING',
  ...data,
});
export const createMockContext = (data: Record<string, unknown> = {}) => ({
  req: {},
  res: {},
  get: (key: string) => data[key],
  ...data,
});
export const createMockRequest = (data: Record<string, unknown> = {}) => ({
  method: 'GET',
  url: '/',
  headers: {},
  ...data,
});
export const createMockResponse = (data: Record<string, unknown> = {}) => ({
  status: 200,
  json: jest.fn(),
  headers: {},
  ...data,
});
export const createMockPrismaClient = () => ({
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  goal: { findMany: jest.fn(), create: jest.fn() },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
});
export const createMockBedrockService = () => ({
  generateSubGoals: jest.fn().mockResolvedValue([]),
  generateActions: jest.fn().mockResolvedValue([]),
  generateTasks: jest.fn().mockResolvedValue([]),
});
export const createMockValidationService = () => ({ validate: jest.fn(), sanitize: jest.fn() });
export const createMockDatabaseService = () => ({
  save: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});
export const createMockLogger = () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});
export const createMockTimer = () => ({
  start: jest.fn(),
  end: jest.fn(),
  duration: jest.fn().mockReturnValue(100),
});
export const createMockJWT = (data = {}) => ({
  token: 'mock-jwt-token',
  payload: { userId: 'test-user', ...data },
});
export const createMockCognitoUser = (data = {}) => ({
  sub: 'cognito-user',
  email: 'user@example.com',
  ...data,
});
export const createMockErrorResponse = (data = {}) => ({
  success: false,
  error: { code: 'ERROR', message: 'Test error', ...data },
});
export const createMockSuccessResponse = (data: Record<string, unknown> = {}) => ({
  success: true,
  data: { result: 'success', ...data },
});
export const createMockPaginatedResponse = (data: Record<string, unknown> = {}) => {
  const typedData = data as { items?: unknown[]; pagination?: Record<string, unknown> };
  return {
    data: typedData.items || [],
    pagination: { page: 1, totalCount: 0, ...typedData.pagination },
  };
};
export const createMockProgressData = (data: Record<string, unknown> = {}) => ({
  progress: 50,
  timestamp: new Date(),
  ...data,
});
export const createMockChangeHistory = (data: Record<string, unknown> = {}) => ({
  id: 'change-1',
  entityType: 'goal',
  changeType: 'update',
  ...data,
});
export const createMockReflection = (data = {}) => ({
  id: 'reflection-1',
  summary: 'Test reflection',
  ...data,
});
export const createMockTaskReminder = (data = {}) => ({
  id: 'reminder-1',
  reminderDate: new Date(),
  ...data,
});
export const createMockUserProfile = (data = {}) => ({
  id: 'profile-1',
  email: 'user@example.com',
  ...data,
});
export const createMockAIResponse = (data: Record<string, unknown> = {}) => ({
  content: 'AI response',
  model: 'test-model',
  ...data,
});
export const createMockValidationError = (data: Record<string, unknown> = {}) =>
  Object.assign(new Error((data as { message?: string }).message || 'Validation error'), {
    name: 'ValidationError',
  });
export const createMockDatabaseError = (data: Record<string, unknown> = {}) =>
  Object.assign(new Error((data as { message?: string }).message || 'Database error'), {
    name: 'DatabaseError',
  });
export const createMockAuthError = (data: Record<string, unknown> = {}) =>
  Object.assign(new Error((data as { message?: string }).message || 'Auth error'), {
    name: 'AuthError',
  });
export const createMockNotFoundError = (data: Record<string, unknown> = {}) =>
  Object.assign(new Error((data as { message?: string }).message || 'Not found'), {
    name: 'NotFoundError',
  });
