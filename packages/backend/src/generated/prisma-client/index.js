Object.defineProperty(exports, '__esModule', { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime,
} = require('./runtime/library.js');

const Prisma = {};

exports.Prisma = Prisma;
exports.$Enums = {};

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: '5.22.0',
  engine: '605197351a3c8bdd595af2d2a9bc3025bca48ea2',
};

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError;
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError;
Prisma.PrismaClientInitializationError = PrismaClientInitializationError;
Prisma.PrismaClientValidationError = PrismaClientValidationError;
Prisma.NotFoundError = NotFoundError;
Prisma.Decimal = Decimal;

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag;
Prisma.empty = empty;
Prisma.join = join;
Prisma.raw = raw;
Prisma.validator = Public.validator;

/**
 * Extensions
 */
Prisma.getExtensionContext = Extensions.getExtensionContext;
Prisma.defineExtension = Extensions.defineExtension;

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull;
Prisma.JsonNull = objectEnumValues.instances.JsonNull;
Prisma.AnyNull = objectEnumValues.instances.AnyNull;

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull,
};

const path = require('path');

/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable',
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  name: 'name',
  industry: 'industry',
  companySize: 'companySize',
  jobType: 'jobType',
  position: 'position',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.GoalScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  description: 'description',
  deadline: 'deadline',
  background: 'background',
  constraints: 'constraints',
  status: 'status',
  progress: 'progress',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.SubGoalScalarFieldEnum = {
  id: 'id',
  goalId: 'goalId',
  title: 'title',
  description: 'description',
  background: 'background',
  constraints: 'constraints',
  position: 'position',
  progress: 'progress',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.ActionScalarFieldEnum = {
  id: 'id',
  subGoalId: 'subGoalId',
  title: 'title',
  description: 'description',
  background: 'background',
  constraints: 'constraints',
  type: 'type',
  position: 'position',
  progress: 'progress',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.TaskScalarFieldEnum = {
  id: 'id',
  actionId: 'actionId',
  title: 'title',
  description: 'description',
  type: 'type',
  status: 'status',
  estimatedTime: 'estimatedTime',
  completedAt: 'completedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.TaskReminderScalarFieldEnum = {
  id: 'id',
  taskId: 'taskId',
  reminderAt: 'reminderAt',
  message: 'message',
  status: 'status',
  sentAt: 'sentAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.ReflectionScalarFieldEnum = {
  id: 'id',
  taskId: 'taskId',
  content: 'content',
  rating: 'rating',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.ProgressHistoryScalarFieldEnum = {
  id: 'id',
  entityType: 'entityType',
  entityId: 'entityId',
  progress: 'progress',
  timestamp: 'timestamp',
  createdAt: 'createdAt',
};

exports.Prisma.ChangeHistoryScalarFieldEnum = {
  id: 'id',
  entityType: 'entityType',
  entityId: 'entityId',
  userId: 'userId',
  changedAt: 'changedAt',
  changes: 'changes',
  createdAt: 'createdAt',
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc',
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull,
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive',
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last',
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull,
};
exports.UserIndustry = exports.$Enums.UserIndustry = {
  TECHNOLOGY: 'TECHNOLOGY',
  FINANCE: 'FINANCE',
  HEALTHCARE: 'HEALTHCARE',
  EDUCATION: 'EDUCATION',
  MANUFACTURING: 'MANUFACTURING',
  RETAIL: 'RETAIL',
  CONSULTING: 'CONSULTING',
  GOVERNMENT: 'GOVERNMENT',
  NON_PROFIT: 'NON_PROFIT',
  OTHER: 'OTHER',
};

exports.CompanySize = exports.$Enums.CompanySize = {
  STARTUP: 'STARTUP',
  SMALL: 'SMALL',
  MEDIUM: 'MEDIUM',
  LARGE: 'LARGE',
  ENTERPRISE: 'ENTERPRISE',
};

exports.GoalStatus = exports.$Enums.GoalStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  PAUSED: 'PAUSED',
  CANCELLED: 'CANCELLED',
};

exports.ActionType = exports.$Enums.ActionType = {
  EXECUTION: 'EXECUTION',
  HABIT: 'HABIT',
};

exports.TaskType = exports.$Enums.TaskType = {
  ACTION: 'ACTION',
  LEARNING: 'LEARNING',
  RESEARCH: 'RESEARCH',
  MEETING: 'MEETING',
  REVIEW: 'REVIEW',
};

exports.TaskStatus = exports.$Enums.TaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

exports.ReminderStatus = exports.$Enums.ReminderStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};

exports.Prisma.ModelName = {
  User: 'User',
  Goal: 'Goal',
  SubGoal: 'SubGoal',
  Action: 'Action',
  Task: 'Task',
  TaskReminder: 'TaskReminder',
  Reflection: 'Reflection',
  ProgressHistory: 'ProgressHistory',
  ChangeHistory: 'ChangeHistory',
};
/**
 * Create the Client
 */
const config = {
  generator: {
    name: 'client',
    provider: {
      fromEnvVar: null,
      value: 'prisma-client-js',
    },
    output: {
      value:
        '/Users/Satoshi/Development/swx/1_repositories/goal-mandala/packages/backend/src/generated/prisma-client',
      fromEnvVar: null,
    },
    config: {
      engineType: 'library',
    },
    binaryTargets: [
      {
        fromEnvVar: null,
        value: 'darwin-arm64',
        native: true,
      },
    ],
    previewFeatures: [],
    sourceFilePath:
      '/Users/Satoshi/Development/swx/1_repositories/goal-mandala/packages/backend/prisma/schema.prisma',
    isCustomOutput: true,
  },
  relativeEnvPaths: {
    rootEnvPath: null,
  },
  relativePath: '../../../prisma',
  clientVersion: '5.22.0',
  engineVersion: '605197351a3c8bdd595af2d2a9bc3025bca48ea2',
  datasourceNames: ['db'],
  activeProvider: 'postgresql',
  postinstall: false,
  inlineDatasources: {
    db: {
      url: {
        fromEnvVar: 'DATABASE_URL',
        value: null,
      },
    },
  },
  inlineSchema:
    '// This is your Prisma schema file,\n// learn more about it in the docs: https://pris.ly/d/prisma-schema\n\ngenerator client {\n  provider = "prisma-client-js"\n  output   = "../src/generated/prisma-client"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\n// Enums\nenum UserIndustry {\n  TECHNOLOGY\n  FINANCE\n  HEALTHCARE\n  EDUCATION\n  MANUFACTURING\n  RETAIL\n  CONSULTING\n  GOVERNMENT\n  NON_PROFIT\n  OTHER\n}\n\nenum CompanySize {\n  STARTUP // 1-10人\n  SMALL // 11-50人\n  MEDIUM // 51-200人\n  LARGE // 201-1000人\n  ENTERPRISE // 1000人以上\n}\n\nenum GoalStatus {\n  ACTIVE\n  COMPLETED\n  PAUSED\n  CANCELLED\n}\n\nenum ActionType {\n  EXECUTION // 実行アクション\n  HABIT // 習慣アクション\n}\n\nenum TaskType {\n  ACTION // 実行タスク\n  LEARNING // 学習タスク\n  RESEARCH // 調査タスク\n  MEETING // 会議・打ち合わせ\n  REVIEW // レビュー・確認\n}\n\nenum TaskStatus {\n  PENDING // 未着手\n  IN_PROGRESS // 進行中\n  COMPLETED // 完了\n  CANCELLED // キャンセル\n}\n\nenum ReminderStatus {\n  PENDING // 送信待ち\n  SENT // 送信済み\n  FAILED // 送信失敗\n  CANCELLED // キャンセル\n}\n\n// Models\nmodel User {\n  id          String        @id @default(uuid()) @db.Uuid\n  email       String        @unique @db.VarChar(255)\n  name        String        @db.VarChar(100)\n  industry    UserIndustry?\n  companySize CompanySize?\n  jobType     String?       @db.VarChar(100)\n  position    String?       @db.VarChar(100)\n  createdAt   DateTime      @default(now()) @db.Timestamptz\n  updatedAt   DateTime      @updatedAt @db.Timestamptz\n\n  // Relations\n  goals         Goal[]\n  changeHistory ChangeHistory[]\n\n  @@map("users")\n}\n\nmodel Goal {\n  id          String     @id @default(uuid()) @db.Uuid\n  userId      String     @db.Uuid\n  title       String     @db.VarChar(200)\n  description String?    @db.Text\n  deadline    DateTime?  @db.Timestamptz\n  background  String?    @db.Text\n  constraints String?    @db.Text\n  status      GoalStatus @default(ACTIVE)\n  progress    Int        @default(0) @db.SmallInt\n  createdAt   DateTime   @default(now()) @db.Timestamptz\n  updatedAt   DateTime   @updatedAt @db.Timestamptz\n\n  // Relations\n  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)\n  subGoals SubGoal[]\n\n  // Indexes\n  @@index([userId, status])\n  @@index([userId, createdAt])\n  @@map("goals")\n}\n\nmodel SubGoal {\n  id          String   @id @default(uuid()) @db.Uuid\n  goalId      String   @db.Uuid\n  title       String   @db.VarChar(200)\n  description String?  @db.Text\n  background  String?  @db.Text\n  constraints String?  @db.Text\n  position    Int      @db.SmallInt\n  progress    Int      @default(0) @db.SmallInt\n  createdAt   DateTime @default(now()) @db.Timestamptz\n  updatedAt   DateTime @updatedAt @db.Timestamptz\n\n  // Relations\n  goal    Goal     @relation(fields: [goalId], references: [id], onDelete: Cascade)\n  actions Action[]\n\n  // Unique constraints\n  @@unique([goalId, position])\n  // Indexes\n  @@index([goalId, position])\n  @@map("sub_goals")\n}\n\nmodel Action {\n  id          String     @id @default(uuid()) @db.Uuid\n  subGoalId   String     @db.Uuid\n  title       String     @db.VarChar(200)\n  description String?    @db.Text\n  background  String?    @db.Text\n  constraints String?    @db.Text\n  type        ActionType @default(EXECUTION)\n  position    Int        @db.SmallInt\n  progress    Int        @default(0) @db.SmallInt\n  createdAt   DateTime   @default(now()) @db.Timestamptz\n  updatedAt   DateTime   @updatedAt @db.Timestamptz\n\n  // Relations\n  subGoal SubGoal @relation(fields: [subGoalId], references: [id], onDelete: Cascade)\n  tasks   Task[]\n\n  // Unique constraints\n  @@unique([subGoalId, position])\n  // Indexes\n  @@index([subGoalId, position])\n  @@map("actions")\n}\n\nmodel Task {\n  id            String     @id @default(uuid()) @db.Uuid\n  actionId      String     @db.Uuid\n  title         String     @db.VarChar(200)\n  description   String?    @db.Text\n  type          TaskType   @default(ACTION)\n  status        TaskStatus @default(PENDING)\n  estimatedTime Int?       @db.SmallInt\n  completedAt   DateTime?  @db.Timestamptz\n  createdAt     DateTime   @default(now()) @db.Timestamptz\n  updatedAt     DateTime   @updatedAt @db.Timestamptz\n\n  // Relations\n  action      Action         @relation(fields: [actionId], references: [id], onDelete: Cascade)\n  reminders   TaskReminder[]\n  reflections Reflection[]\n\n  // Indexes\n  @@index([actionId, status])\n  @@index([status, createdAt])\n  @@map("tasks")\n}\n\nmodel TaskReminder {\n  id         String         @id @default(uuid()) @db.Uuid\n  taskId     String         @db.Uuid\n  reminderAt DateTime       @db.Timestamptz\n  message    String?        @db.Text\n  status     ReminderStatus @default(PENDING)\n  sentAt     DateTime?      @db.Timestamptz\n  createdAt  DateTime       @default(now()) @db.Timestamptz\n  updatedAt  DateTime       @updatedAt @db.Timestamptz\n\n  // Relations\n  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)\n\n  // Indexes\n  @@index([status, reminderAt])\n  @@index([taskId, reminderAt])\n  @@map("task_reminders")\n}\n\nmodel Reflection {\n  id        String   @id @default(uuid()) @db.Uuid\n  taskId    String   @db.Uuid\n  content   String   @db.Text\n  rating    Int?     @db.SmallInt\n  createdAt DateTime @default(now()) @db.Timestamptz\n  updatedAt DateTime @updatedAt @db.Timestamptz\n\n  // Relations\n  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)\n\n  // Indexes\n  @@index([taskId, createdAt])\n  @@map("reflections")\n}\n\nmodel ProgressHistory {\n  id         String   @id @default(uuid()) @db.Uuid\n  entityType String   @db.VarChar(20) // \'goal\', \'subgoal\', \'action\', \'task\'\n  entityId   String   @db.Uuid\n  progress   Int      @db.SmallInt // 0-100の進捗率\n  timestamp  DateTime @default(now()) @db.Timestamptz\n  createdAt  DateTime @default(now()) @db.Timestamptz\n\n  // Indexes\n  @@index([entityType, entityId, timestamp])\n  @@index([timestamp])\n  @@map("progress_history")\n}\n\nmodel ChangeHistory {\n  id         String   @id @default(uuid()) @db.Uuid\n  entityType String   @db.VarChar(20) // \'goal\', \'subgoal\', \'action\'\n  entityId   String   @db.Uuid\n  userId     String   @db.Uuid\n  changedAt  DateTime @default(now()) @db.Timestamptz\n  changes    Json // 変更内容の配列: [{ field: string, oldValue: string, newValue: string }]\n  createdAt  DateTime @default(now()) @db.Timestamptz\n\n  // Relations\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  // Indexes\n  @@index([entityType, entityId, changedAt])\n  @@index([userId, changedAt])\n  @@map("change_history")\n}\n',
  inlineSchemaHash: '78cf934b9125ba71f63a0f5ae8612b0fc93d491869af07b0dd9e28e365ebe995',
  copyEngine: true,
};

const fs = require('fs');

config.dirname = __dirname;
if (!fs.existsSync(path.join(__dirname, 'schema.prisma'))) {
  const alternativePaths = ['src/generated/prisma-client', 'generated/prisma-client'];

  const alternativePath =
    alternativePaths.find(altPath => {
      return fs.existsSync(path.join(process.cwd(), altPath, 'schema.prisma'));
    }) ?? alternativePaths[0];

  config.dirname = path.join(process.cwd(), alternativePath);
  config.isBundled = true;
}

config.runtimeDataModel = JSON.parse(
  '{"models":{"User":{"dbName":"users","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"email","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"industry","kind":"enum","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"UserIndustry","isGenerated":false,"isUpdatedAt":false},{"name":"companySize","kind":"enum","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"CompanySize","isGenerated":false,"isUpdatedAt":false},{"name":"jobType","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"position","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":true},{"name":"goals","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Goal","relationName":"GoalToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"changeHistory","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"ChangeHistory","relationName":"ChangeHistoryToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Goal":{"dbName":"goals","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"title","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"deadline","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"background","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"constraints","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"GoalStatus","default":"ACTIVE","isGenerated":false,"isUpdatedAt":false},{"name":"progress","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":true},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","relationName":"GoalToUser","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"subGoals","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"SubGoal","relationName":"GoalToSubGoal","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"SubGoal":{"dbName":"sub_goals","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"goalId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"title","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"background","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"constraints","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"position","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"progress","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":true},{"name":"goal","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Goal","relationName":"GoalToSubGoal","relationFromFields":["goalId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"actions","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Action","relationName":"ActionToSubGoal","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["goalId","position"]],"uniqueIndexes":[{"name":null,"fields":["goalId","position"]}],"isGenerated":false},"Action":{"dbName":"actions","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"subGoalId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"title","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"background","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"constraints","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"type","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"ActionType","default":"EXECUTION","isGenerated":false,"isUpdatedAt":false},{"name":"position","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"progress","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":true},{"name":"subGoal","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"SubGoal","relationName":"ActionToSubGoal","relationFromFields":["subGoalId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"tasks","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Task","relationName":"ActionToTask","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["subGoalId","position"]],"uniqueIndexes":[{"name":null,"fields":["subGoalId","position"]}],"isGenerated":false},"Task":{"dbName":"tasks","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"actionId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"title","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"type","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"TaskType","default":"ACTION","isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"TaskStatus","default":"PENDING","isGenerated":false,"isUpdatedAt":false},{"name":"estimatedTime","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"completedAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":true},{"name":"action","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Action","relationName":"ActionToTask","relationFromFields":["actionId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"reminders","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"TaskReminder","relationName":"TaskToTaskReminder","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"reflections","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Reflection","relationName":"ReflectionToTask","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"TaskReminder":{"dbName":"task_reminders","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"taskId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"reminderAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"message","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"ReminderStatus","default":"PENDING","isGenerated":false,"isUpdatedAt":false},{"name":"sentAt","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":true},{"name":"task","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Task","relationName":"TaskToTaskReminder","relationFromFields":["taskId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Reflection":{"dbName":"reflections","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"taskId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"content","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"rating","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","isGenerated":false,"isUpdatedAt":true},{"name":"task","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Task","relationName":"ReflectionToTask","relationFromFields":["taskId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"ProgressHistory":{"dbName":"progress_history","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"entityType","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"entityId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"progress","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","isGenerated":false,"isUpdatedAt":false},{"name":"timestamp","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"ChangeHistory":{"dbName":"change_history","fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","default":{"name":"uuid(4)","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"entityType","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"entityId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"userId","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","isGenerated":false,"isUpdatedAt":false},{"name":"changedAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"changes","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","relationName":"ChangeHistoryToUser","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false}},"enums":{"UserIndustry":{"values":[{"name":"TECHNOLOGY","dbName":null},{"name":"FINANCE","dbName":null},{"name":"HEALTHCARE","dbName":null},{"name":"EDUCATION","dbName":null},{"name":"MANUFACTURING","dbName":null},{"name":"RETAIL","dbName":null},{"name":"CONSULTING","dbName":null},{"name":"GOVERNMENT","dbName":null},{"name":"NON_PROFIT","dbName":null},{"name":"OTHER","dbName":null}],"dbName":null},"CompanySize":{"values":[{"name":"STARTUP","dbName":null},{"name":"SMALL","dbName":null},{"name":"MEDIUM","dbName":null},{"name":"LARGE","dbName":null},{"name":"ENTERPRISE","dbName":null}],"dbName":null},"GoalStatus":{"values":[{"name":"ACTIVE","dbName":null},{"name":"COMPLETED","dbName":null},{"name":"PAUSED","dbName":null},{"name":"CANCELLED","dbName":null}],"dbName":null},"ActionType":{"values":[{"name":"EXECUTION","dbName":null},{"name":"HABIT","dbName":null}],"dbName":null},"TaskType":{"values":[{"name":"ACTION","dbName":null},{"name":"LEARNING","dbName":null},{"name":"RESEARCH","dbName":null},{"name":"MEETING","dbName":null},{"name":"REVIEW","dbName":null}],"dbName":null},"TaskStatus":{"values":[{"name":"PENDING","dbName":null},{"name":"IN_PROGRESS","dbName":null},{"name":"COMPLETED","dbName":null},{"name":"CANCELLED","dbName":null}],"dbName":null},"ReminderStatus":{"values":[{"name":"PENDING","dbName":null},{"name":"SENT","dbName":null},{"name":"FAILED","dbName":null},{"name":"CANCELLED","dbName":null}],"dbName":null}},"types":{}}'
);
defineDmmfProperty(exports.Prisma, config.runtimeDataModel);
config.engineWasm = undefined;

const { warnEnvConflicts } = require('./runtime/library.js');

warnEnvConflicts({
  rootEnvPath:
    config.relativeEnvPaths.rootEnvPath &&
    path.resolve(config.dirname, config.relativeEnvPaths.rootEnvPath),
  schemaEnvPath:
    config.relativeEnvPaths.schemaEnvPath &&
    path.resolve(config.dirname, config.relativeEnvPaths.schemaEnvPath),
});

const PrismaClient = getPrismaClient(config);
exports.PrismaClient = PrismaClient;
Object.assign(exports, Prisma);

// file annotations for bundling tools to include these files
path.join(__dirname, 'libquery_engine-darwin-arm64.dylib.node');
path.join(process.cwd(), 'src/generated/prisma-client/libquery_engine-darwin-arm64.dylib.node');
// file annotations for bundling tools to include these files
path.join(__dirname, 'schema.prisma');
path.join(process.cwd(), 'src/generated/prisma-client/schema.prisma');
