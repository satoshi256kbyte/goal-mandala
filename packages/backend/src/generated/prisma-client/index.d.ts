/**
 * Client
 **/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types; // general types
import $Public = runtime.Types.Public;
import $Utils = runtime.Types.Utils;
import $Extensions = runtime.Types.Extensions;
import $Result = runtime.Types.Result;

export type PrismaPromise<T> = $Public.PrismaPromise<T>;

/**
 * Model User
 *
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>;
/**
 * Model Goal
 *
 */
export type Goal = $Result.DefaultSelection<Prisma.$GoalPayload>;
/**
 * Model SubGoal
 *
 */
export type SubGoal = $Result.DefaultSelection<Prisma.$SubGoalPayload>;
/**
 * Model Action
 *
 */
export type Action = $Result.DefaultSelection<Prisma.$ActionPayload>;
/**
 * Model Task
 *
 */
export type Task = $Result.DefaultSelection<Prisma.$TaskPayload>;
/**
 * Model TaskReminder
 *
 */
export type TaskReminder = $Result.DefaultSelection<Prisma.$TaskReminderPayload>;
/**
 * Model Reflection
 *
 */
export type Reflection = $Result.DefaultSelection<Prisma.$ReflectionPayload>;

/**
 * Enums
 */
export namespace $Enums {
  export const UserIndustry: {
    TECHNOLOGY: 'TECHNOLOGY';
    FINANCE: 'FINANCE';
    HEALTHCARE: 'HEALTHCARE';
    EDUCATION: 'EDUCATION';
    MANUFACTURING: 'MANUFACTURING';
    RETAIL: 'RETAIL';
    CONSULTING: 'CONSULTING';
    GOVERNMENT: 'GOVERNMENT';
    NON_PROFIT: 'NON_PROFIT';
    OTHER: 'OTHER';
  };

  export type UserIndustry = (typeof UserIndustry)[keyof typeof UserIndustry];

  export const CompanySize: {
    STARTUP: 'STARTUP';
    SMALL: 'SMALL';
    MEDIUM: 'MEDIUM';
    LARGE: 'LARGE';
    ENTERPRISE: 'ENTERPRISE';
  };

  export type CompanySize = (typeof CompanySize)[keyof typeof CompanySize];

  export const GoalStatus: {
    ACTIVE: 'ACTIVE';
    COMPLETED: 'COMPLETED';
    PAUSED: 'PAUSED';
    CANCELLED: 'CANCELLED';
  };

  export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];

  export const TaskType: {
    ACTION: 'ACTION';
    LEARNING: 'LEARNING';
    RESEARCH: 'RESEARCH';
    MEETING: 'MEETING';
    REVIEW: 'REVIEW';
  };

  export type TaskType = (typeof TaskType)[keyof typeof TaskType];

  export const TaskStatus: {
    PENDING: 'PENDING';
    IN_PROGRESS: 'IN_PROGRESS';
    COMPLETED: 'COMPLETED';
    CANCELLED: 'CANCELLED';
  };

  export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

  export const ReminderStatus: {
    PENDING: 'PENDING';
    SENT: 'SENT';
    FAILED: 'FAILED';
    CANCELLED: 'CANCELLED';
  };

  export type ReminderStatus = (typeof ReminderStatus)[keyof typeof ReminderStatus];
}

export type UserIndustry = $Enums.UserIndustry;

export const UserIndustry: typeof $Enums.UserIndustry;

export type CompanySize = $Enums.CompanySize;

export const CompanySize: typeof $Enums.CompanySize;

export type GoalStatus = $Enums.GoalStatus;

export const GoalStatus: typeof $Enums.GoalStatus;

export type TaskType = $Enums.TaskType;

export const TaskType: typeof $Enums.TaskType;

export type TaskStatus = $Enums.TaskStatus;

export const TaskStatus: typeof $Enums.TaskStatus;

export type ReminderStatus = $Enums.ReminderStatus;

export const ReminderStatus: typeof $Enums.ReminderStatus;

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions
    ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition>
      ? Prisma.GetEvents<ClientOptions['log']>
      : never
    : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] };

  /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(
    eventType: V,
    callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void
  ): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void;

  /**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: any[]
  ): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: any[]
  ): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(
    arg: [...P],
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel }
  ): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>;

  $transaction<R>(
    fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    }
  ): $Utils.JsPromise<R>;

  $extends: $Extensions.ExtendsHook<'extends', Prisma.TypeMapCb, ExtArgs>;

  /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
   * Example usage:
   * ```ts
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   */
  get user(): Prisma.UserDelegate<ExtArgs>;

  /**
   * `prisma.goal`: Exposes CRUD operations for the **Goal** model.
   * Example usage:
   * ```ts
   * // Fetch zero or more Goals
   * const goals = await prisma.goal.findMany()
   * ```
   */
  get goal(): Prisma.GoalDelegate<ExtArgs>;

  /**
   * `prisma.subGoal`: Exposes CRUD operations for the **SubGoal** model.
   * Example usage:
   * ```ts
   * // Fetch zero or more SubGoals
   * const subGoals = await prisma.subGoal.findMany()
   * ```
   */
  get subGoal(): Prisma.SubGoalDelegate<ExtArgs>;

  /**
   * `prisma.action`: Exposes CRUD operations for the **Action** model.
   * Example usage:
   * ```ts
   * // Fetch zero or more Actions
   * const actions = await prisma.action.findMany()
   * ```
   */
  get action(): Prisma.ActionDelegate<ExtArgs>;

  /**
   * `prisma.task`: Exposes CRUD operations for the **Task** model.
   * Example usage:
   * ```ts
   * // Fetch zero or more Tasks
   * const tasks = await prisma.task.findMany()
   * ```
   */
  get task(): Prisma.TaskDelegate<ExtArgs>;

  /**
   * `prisma.taskReminder`: Exposes CRUD operations for the **TaskReminder** model.
   * Example usage:
   * ```ts
   * // Fetch zero or more TaskReminders
   * const taskReminders = await prisma.taskReminder.findMany()
   * ```
   */
  get taskReminder(): Prisma.TaskReminderDelegate<ExtArgs>;

  /**
   * `prisma.reflection`: Exposes CRUD operations for the **Reflection** model.
   * Example usage:
   * ```ts
   * // Fetch zero or more Reflections
   * const reflections = await prisma.reflection.findMany()
   * ```
   */
  get reflection(): Prisma.ReflectionDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF;

  export type PrismaPromise<T> = $Public.PrismaPromise<T>;

  /**
   * Validator
   */
  export import validator = runtime.Public.validator;

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError;
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError;
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError;
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError;
  export import PrismaClientValidationError = runtime.PrismaClientValidationError;
  export import NotFoundError = runtime.NotFoundError;

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag;
  export import empty = runtime.empty;
  export import join = runtime.join;
  export import raw = runtime.raw;
  export import Sql = runtime.Sql;

  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal;

  export type DecimalJsLike = runtime.DecimalJsLike;

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics;
  export type Metric<T> = runtime.Metric<T>;
  export type MetricHistogram = runtime.MetricHistogram;
  export type MetricHistogramBucket = runtime.MetricHistogramBucket;

  /**
   * Extensions
   */
  export import Extension = $Extensions.UserArgs;
  export import getExtensionContext = runtime.Extensions.getExtensionContext;
  export import Args = $Public.Args;
  export import Payload = $Public.Payload;
  export import Result = $Public.Result;
  export import Exact = $Public.Exact;

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string;
  };

  export const prismaVersion: PrismaVersion;

  /**
   * Utility Types
   */

  export import JsonObject = runtime.JsonObject;
  export import JsonArray = runtime.JsonArray;
  export import JsonValue = runtime.JsonValue;
  export import InputJsonObject = runtime.InputJsonObject;
  export import InputJsonArray = runtime.InputJsonArray;
  export import InputJsonValue = runtime.InputJsonValue;

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
     * Type of `Prisma.DbNull`.
     *
     * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
     *
     * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
     */
    class DbNull {
      private DbNull: never;
      private constructor();
    }

    /**
     * Type of `Prisma.JsonNull`.
     *
     * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
     *
     * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
     */
    class JsonNull {
      private JsonNull: never;
      private constructor();
    }

    /**
     * Type of `Prisma.AnyNull`.
     *
     * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
     *
     * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
     */
    class AnyNull {
      private AnyNull: never;
      private constructor();
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull;

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull;

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull;

  type SelectAndInclude = {
    select: any;
    include: any;
  };

  type SelectAndOmit = {
    select: any;
    omit: any;
  };

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<
    ReturnType<T>
  >;

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
    [P in K]: T[P];
  };

  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K;
  }[keyof T];

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K;
  };

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>;

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  } & (T extends SelectAndInclude
    ? 'Please either choose `select` or `include`.'
    : T extends SelectAndOmit
      ? 'Please either choose `select` or `omit`.'
      : {});

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  } & K;

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> = T extends object
    ? U extends object
      ? (Without<T, U> & U) | (Without<U, T> & T)
      : U
    : T;

  /**
   * Is T a Record?
   */
  type IsObject<T extends any> =
    T extends Array<any>
      ? False
      : T extends Date
        ? False
        : T extends Uint8Array
          ? False
          : T extends bigint
            ? False
            : T extends object
              ? True
              : False;

  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T;

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O>; // With K possibilities
    }[K];

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>;

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>;

  type _Either<O extends object, K extends Key, strict extends boolean> = {
    1: EitherStrict<O, K>;
    0: EitherLoose<O, K>;
  }[strict];

  type Either<O extends object, K extends Key, strict extends boolean = 1> = O extends unknown
    ? _Either<O, K, strict>
    : never;

  export type Union = any;

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K];
  } & {};

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (U extends unknown ? (k: U) => void : never) extends (
    k: infer I
  ) => void
    ? I
    : never;

  export type Overwrite<O extends object, O1 extends object> = {
    [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<
    Overwrite<
      U,
      {
        [K in keyof U]-?: At<U, K>;
      }
    >
  >;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends boolean = 1> = {
    1: AtStrict<O, K>;
    0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function
    ? A
    : {
        [K in keyof A]: A[K];
      } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
      ?
          | (K extends keyof O ? { [P in K]: O[P] } & O : O)
          | ({ [P in keyof O as P extends K ? K : never]-?: O[P] } & O)
      : never
  >;

  type _Strict<U, _U = U> = U extends unknown
    ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>>
    : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False;

  // /**
  // 1
  // */
  export type True = 1;

  /**
  0
  */
  export type False = 0;

  export type Not<B extends boolean> = {
    0: 1;
    1: 0;
  }[B];

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
      ? 1
      : 0;

  export type Has<U extends Union, U1 extends Union> = Not<Extends<Exclude<U1, U>, U1>>;

  export type Or<B1 extends boolean, B2 extends boolean> = {
    0: {
      0: 0;
      1: 1;
    };
    1: {
      0: 1;
      1: 1;
    };
  }[B1][B2];

  export type Keys<U extends Union> = U extends unknown ? keyof U : never;

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;

  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object
    ? {
        [P in keyof T]: P extends keyof O ? O[P] : never;
      }
    : never;

  type FieldPaths<T, U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>> =
    IsObject<T> extends True ? U : T;

  type GetHavingFields<T> = {
    [K in keyof T]: Or<Or<Extends<'OR', K>, Extends<'AND', K>>, Extends<'NOT', K>> extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
        ? never
        : K;
  }[keyof T];

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never;
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>;
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T;

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<
    T,
    MaybeTupleToUnion<K>
  >;

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T;

  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>;

  type FieldRefInputType<Model, FieldType> = Model extends never
    ? never
    : FieldRef<Model, FieldType>;

  export const ModelName: {
    User: 'User';
    Goal: 'Goal';
    SubGoal: 'SubGoal';
    Action: 'Action';
    Task: 'Task';
    TaskReminder: 'TaskReminder';
    Reflection: 'Reflection';
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName];

  export type Datasources = {
    db?: Datasource;
  };

  interface TypeMapCb
    extends $Utils.Fn<
      { extArgs: $Extensions.InternalArgs; clientOptions: PrismaClientOptions },
      $Utils.Record<string, any>
    > {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>;
  }

  export type TypeMap<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
    ClientOptions = {},
  > = {
    meta: {
      modelProps: 'user' | 'goal' | 'subGoal' | 'action' | 'task' | 'taskReminder' | 'reflection';
      txIsolationLevel: Prisma.TransactionIsolationLevel;
    };
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>;
        fields: Prisma.UserFieldRefs;
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null;
          };
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$UserPayload>;
          };
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null;
          };
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$UserPayload>;
          };
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[];
          };
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$UserPayload>;
          };
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[];
          };
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$UserPayload>;
          };
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$UserPayload>;
          };
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$UserPayload>;
          };
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>;
            result: $Utils.Optional<AggregateUser>;
          };
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>;
            result: $Utils.Optional<UserGroupByOutputType>[];
          };
          count: {
            args: Prisma.UserCountArgs<ExtArgs>;
            result: $Utils.Optional<UserCountAggregateOutputType> | number;
          };
        };
      };
      Goal: {
        payload: Prisma.$GoalPayload<ExtArgs>;
        fields: Prisma.GoalFieldRefs;
        operations: {
          findUnique: {
            args: Prisma.GoalFindUniqueArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$GoalPayload> | null;
          };
          findUniqueOrThrow: {
            args: Prisma.GoalFindUniqueOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>;
          };
          findFirst: {
            args: Prisma.GoalFindFirstArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$GoalPayload> | null;
          };
          findFirstOrThrow: {
            args: Prisma.GoalFindFirstOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>;
          };
          findMany: {
            args: Prisma.GoalFindManyArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>[];
          };
          create: {
            args: Prisma.GoalCreateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>;
          };
          createMany: {
            args: Prisma.GoalCreateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          createManyAndReturn: {
            args: Prisma.GoalCreateManyAndReturnArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>[];
          };
          delete: {
            args: Prisma.GoalDeleteArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>;
          };
          update: {
            args: Prisma.GoalUpdateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>;
          };
          deleteMany: {
            args: Prisma.GoalDeleteManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          updateMany: {
            args: Prisma.GoalUpdateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          upsert: {
            args: Prisma.GoalUpsertArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$GoalPayload>;
          };
          aggregate: {
            args: Prisma.GoalAggregateArgs<ExtArgs>;
            result: $Utils.Optional<AggregateGoal>;
          };
          groupBy: {
            args: Prisma.GoalGroupByArgs<ExtArgs>;
            result: $Utils.Optional<GoalGroupByOutputType>[];
          };
          count: {
            args: Prisma.GoalCountArgs<ExtArgs>;
            result: $Utils.Optional<GoalCountAggregateOutputType> | number;
          };
        };
      };
      SubGoal: {
        payload: Prisma.$SubGoalPayload<ExtArgs>;
        fields: Prisma.SubGoalFieldRefs;
        operations: {
          findUnique: {
            args: Prisma.SubGoalFindUniqueArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$SubGoalPayload> | null;
          };
          findUniqueOrThrow: {
            args: Prisma.SubGoalFindUniqueOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$SubGoalPayload>;
          };
          findFirst: {
            args: Prisma.SubGoalFindFirstArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$SubGoalPayload> | null;
          };
          findFirstOrThrow: {
            args: Prisma.SubGoalFindFirstOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$SubGoalPayload>;
          };
          findMany: {
            args: Prisma.SubGoalFindManyArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$SubGoalPayload>[];
          };
          create: {
            args: Prisma.SubGoalCreateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$SubGoalPayload>;
          };
          createMany: {
            args: Prisma.SubGoalCreateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          createManyAndReturn: {
            args: Prisma.SubGoalCreateManyAndReturnArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$SubGoalPayload>[];
          };
          delete: {
            args: Prisma.SubGoalDeleteArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$SubGoalPayload>;
          };
          update: {
            args: Prisma.SubGoalUpdateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$SubGoalPayload>;
          };
          deleteMany: {
            args: Prisma.SubGoalDeleteManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          updateMany: {
            args: Prisma.SubGoalUpdateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          upsert: {
            args: Prisma.SubGoalUpsertArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$SubGoalPayload>;
          };
          aggregate: {
            args: Prisma.SubGoalAggregateArgs<ExtArgs>;
            result: $Utils.Optional<AggregateSubGoal>;
          };
          groupBy: {
            args: Prisma.SubGoalGroupByArgs<ExtArgs>;
            result: $Utils.Optional<SubGoalGroupByOutputType>[];
          };
          count: {
            args: Prisma.SubGoalCountArgs<ExtArgs>;
            result: $Utils.Optional<SubGoalCountAggregateOutputType> | number;
          };
        };
      };
      Action: {
        payload: Prisma.$ActionPayload<ExtArgs>;
        fields: Prisma.ActionFieldRefs;
        operations: {
          findUnique: {
            args: Prisma.ActionFindUniqueArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ActionPayload> | null;
          };
          findUniqueOrThrow: {
            args: Prisma.ActionFindUniqueOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ActionPayload>;
          };
          findFirst: {
            args: Prisma.ActionFindFirstArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ActionPayload> | null;
          };
          findFirstOrThrow: {
            args: Prisma.ActionFindFirstOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ActionPayload>;
          };
          findMany: {
            args: Prisma.ActionFindManyArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ActionPayload>[];
          };
          create: {
            args: Prisma.ActionCreateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ActionPayload>;
          };
          createMany: {
            args: Prisma.ActionCreateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          createManyAndReturn: {
            args: Prisma.ActionCreateManyAndReturnArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ActionPayload>[];
          };
          delete: {
            args: Prisma.ActionDeleteArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ActionPayload>;
          };
          update: {
            args: Prisma.ActionUpdateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ActionPayload>;
          };
          deleteMany: {
            args: Prisma.ActionDeleteManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          updateMany: {
            args: Prisma.ActionUpdateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          upsert: {
            args: Prisma.ActionUpsertArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ActionPayload>;
          };
          aggregate: {
            args: Prisma.ActionAggregateArgs<ExtArgs>;
            result: $Utils.Optional<AggregateAction>;
          };
          groupBy: {
            args: Prisma.ActionGroupByArgs<ExtArgs>;
            result: $Utils.Optional<ActionGroupByOutputType>[];
          };
          count: {
            args: Prisma.ActionCountArgs<ExtArgs>;
            result: $Utils.Optional<ActionCountAggregateOutputType> | number;
          };
        };
      };
      Task: {
        payload: Prisma.$TaskPayload<ExtArgs>;
        fields: Prisma.TaskFieldRefs;
        operations: {
          findUnique: {
            args: Prisma.TaskFindUniqueArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskPayload> | null;
          };
          findUniqueOrThrow: {
            args: Prisma.TaskFindUniqueOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>;
          };
          findFirst: {
            args: Prisma.TaskFindFirstArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskPayload> | null;
          };
          findFirstOrThrow: {
            args: Prisma.TaskFindFirstOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>;
          };
          findMany: {
            args: Prisma.TaskFindManyArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>[];
          };
          create: {
            args: Prisma.TaskCreateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>;
          };
          createMany: {
            args: Prisma.TaskCreateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          createManyAndReturn: {
            args: Prisma.TaskCreateManyAndReturnArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>[];
          };
          delete: {
            args: Prisma.TaskDeleteArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>;
          };
          update: {
            args: Prisma.TaskUpdateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>;
          };
          deleteMany: {
            args: Prisma.TaskDeleteManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          updateMany: {
            args: Prisma.TaskUpdateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          upsert: {
            args: Prisma.TaskUpsertArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskPayload>;
          };
          aggregate: {
            args: Prisma.TaskAggregateArgs<ExtArgs>;
            result: $Utils.Optional<AggregateTask>;
          };
          groupBy: {
            args: Prisma.TaskGroupByArgs<ExtArgs>;
            result: $Utils.Optional<TaskGroupByOutputType>[];
          };
          count: {
            args: Prisma.TaskCountArgs<ExtArgs>;
            result: $Utils.Optional<TaskCountAggregateOutputType> | number;
          };
        };
      };
      TaskReminder: {
        payload: Prisma.$TaskReminderPayload<ExtArgs>;
        fields: Prisma.TaskReminderFieldRefs;
        operations: {
          findUnique: {
            args: Prisma.TaskReminderFindUniqueArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskReminderPayload> | null;
          };
          findUniqueOrThrow: {
            args: Prisma.TaskReminderFindUniqueOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskReminderPayload>;
          };
          findFirst: {
            args: Prisma.TaskReminderFindFirstArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskReminderPayload> | null;
          };
          findFirstOrThrow: {
            args: Prisma.TaskReminderFindFirstOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskReminderPayload>;
          };
          findMany: {
            args: Prisma.TaskReminderFindManyArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskReminderPayload>[];
          };
          create: {
            args: Prisma.TaskReminderCreateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskReminderPayload>;
          };
          createMany: {
            args: Prisma.TaskReminderCreateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          createManyAndReturn: {
            args: Prisma.TaskReminderCreateManyAndReturnArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskReminderPayload>[];
          };
          delete: {
            args: Prisma.TaskReminderDeleteArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskReminderPayload>;
          };
          update: {
            args: Prisma.TaskReminderUpdateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskReminderPayload>;
          };
          deleteMany: {
            args: Prisma.TaskReminderDeleteManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          updateMany: {
            args: Prisma.TaskReminderUpdateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          upsert: {
            args: Prisma.TaskReminderUpsertArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$TaskReminderPayload>;
          };
          aggregate: {
            args: Prisma.TaskReminderAggregateArgs<ExtArgs>;
            result: $Utils.Optional<AggregateTaskReminder>;
          };
          groupBy: {
            args: Prisma.TaskReminderGroupByArgs<ExtArgs>;
            result: $Utils.Optional<TaskReminderGroupByOutputType>[];
          };
          count: {
            args: Prisma.TaskReminderCountArgs<ExtArgs>;
            result: $Utils.Optional<TaskReminderCountAggregateOutputType> | number;
          };
        };
      };
      Reflection: {
        payload: Prisma.$ReflectionPayload<ExtArgs>;
        fields: Prisma.ReflectionFieldRefs;
        operations: {
          findUnique: {
            args: Prisma.ReflectionFindUniqueArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ReflectionPayload> | null;
          };
          findUniqueOrThrow: {
            args: Prisma.ReflectionFindUniqueOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ReflectionPayload>;
          };
          findFirst: {
            args: Prisma.ReflectionFindFirstArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ReflectionPayload> | null;
          };
          findFirstOrThrow: {
            args: Prisma.ReflectionFindFirstOrThrowArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ReflectionPayload>;
          };
          findMany: {
            args: Prisma.ReflectionFindManyArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ReflectionPayload>[];
          };
          create: {
            args: Prisma.ReflectionCreateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ReflectionPayload>;
          };
          createMany: {
            args: Prisma.ReflectionCreateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          createManyAndReturn: {
            args: Prisma.ReflectionCreateManyAndReturnArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ReflectionPayload>[];
          };
          delete: {
            args: Prisma.ReflectionDeleteArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ReflectionPayload>;
          };
          update: {
            args: Prisma.ReflectionUpdateArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ReflectionPayload>;
          };
          deleteMany: {
            args: Prisma.ReflectionDeleteManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          updateMany: {
            args: Prisma.ReflectionUpdateManyArgs<ExtArgs>;
            result: BatchPayload;
          };
          upsert: {
            args: Prisma.ReflectionUpsertArgs<ExtArgs>;
            result: $Utils.PayloadToResult<Prisma.$ReflectionPayload>;
          };
          aggregate: {
            args: Prisma.ReflectionAggregateArgs<ExtArgs>;
            result: $Utils.Optional<AggregateReflection>;
          };
          groupBy: {
            args: Prisma.ReflectionGroupByArgs<ExtArgs>;
            result: $Utils.Optional<ReflectionGroupByOutputType>[];
          };
          count: {
            args: Prisma.ReflectionCountArgs<ExtArgs>;
            result: $Utils.Optional<ReflectionCountAggregateOutputType> | number;
          };
        };
      };
    };
  } & {
    other: {
      payload: any;
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]];
          result: any;
        };
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]];
          result: any;
        };
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]];
          result: any;
        };
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]];
          result: any;
        };
      };
    };
  };
  export const defineExtension: $Extensions.ExtendsHook<
    'define',
    Prisma.TypeMapCb,
    $Extensions.DefaultArgs
  >;
  export type DefaultPrismaClient = PrismaClient;
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal';
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources;
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string;
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat;
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     *
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[];
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    };
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error';
  export type LogDefinition = {
    level: LogLevel;
    emit: 'stdout' | 'event';
  };

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition
    ? T['emit'] extends 'event'
      ? T['level']
      : never
    : never;
  export type GetEvents<T extends any> =
    T extends Array<LogLevel | LogDefinition>
      ? GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
      : never;

  export type QueryEvent = {
    timestamp: Date;
    query: string;
    params: string;
    duration: number;
    target: string;
  };

  export type LogEvent = {
    timestamp: Date;
    message: string;
    target: string;
  };
  /* End Types for Logging */

  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy';

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName;
    action: PrismaAction;
    args: any;
    dataPath: string[];
    runInTransaction: boolean;
  };

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>
  ) => $Utils.JsPromise<T>;

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>;

  export type Datasource = {
    url?: string;
  };

  /**
   * Count Types
   */

  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    goals: number;
  };

  export type UserCountOutputTypeSelect<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    goals?: boolean | UserCountOutputTypeCountGoalsArgs;
  };

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null;
  };

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountGoalsArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    where?: GoalWhereInput;
  };

  /**
   * Count Type GoalCountOutputType
   */

  export type GoalCountOutputType = {
    subGoals: number;
  };

  export type GoalCountOutputTypeSelect<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    subGoals?: boolean | GoalCountOutputTypeCountSubGoalsArgs;
  };

  // Custom InputTypes
  /**
   * GoalCountOutputType without action
   */
  export type GoalCountOutputTypeDefaultArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the GoalCountOutputType
     */
    select?: GoalCountOutputTypeSelect<ExtArgs> | null;
  };

  /**
   * GoalCountOutputType without action
   */
  export type GoalCountOutputTypeCountSubGoalsArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    where?: SubGoalWhereInput;
  };

  /**
   * Count Type SubGoalCountOutputType
   */

  export type SubGoalCountOutputType = {
    actions: number;
  };

  export type SubGoalCountOutputTypeSelect<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    actions?: boolean | SubGoalCountOutputTypeCountActionsArgs;
  };

  // Custom InputTypes
  /**
   * SubGoalCountOutputType without action
   */
  export type SubGoalCountOutputTypeDefaultArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the SubGoalCountOutputType
     */
    select?: SubGoalCountOutputTypeSelect<ExtArgs> | null;
  };

  /**
   * SubGoalCountOutputType without action
   */
  export type SubGoalCountOutputTypeCountActionsArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    where?: ActionWhereInput;
  };

  /**
   * Count Type ActionCountOutputType
   */

  export type ActionCountOutputType = {
    tasks: number;
  };

  export type ActionCountOutputTypeSelect<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    tasks?: boolean | ActionCountOutputTypeCountTasksArgs;
  };

  // Custom InputTypes
  /**
   * ActionCountOutputType without action
   */
  export type ActionCountOutputTypeDefaultArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the ActionCountOutputType
     */
    select?: ActionCountOutputTypeSelect<ExtArgs> | null;
  };

  /**
   * ActionCountOutputType without action
   */
  export type ActionCountOutputTypeCountTasksArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    where?: TaskWhereInput;
  };

  /**
   * Count Type TaskCountOutputType
   */

  export type TaskCountOutputType = {
    reminders: number;
    reflections: number;
  };

  export type TaskCountOutputTypeSelect<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    reminders?: boolean | TaskCountOutputTypeCountRemindersArgs;
    reflections?: boolean | TaskCountOutputTypeCountReflectionsArgs;
  };

  // Custom InputTypes
  /**
   * TaskCountOutputType without action
   */
  export type TaskCountOutputTypeDefaultArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the TaskCountOutputType
     */
    select?: TaskCountOutputTypeSelect<ExtArgs> | null;
  };

  /**
   * TaskCountOutputType without action
   */
  export type TaskCountOutputTypeCountRemindersArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    where?: TaskReminderWhereInput;
  };

  /**
   * TaskCountOutputType without action
   */
  export type TaskCountOutputTypeCountReflectionsArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    where?: ReflectionWhereInput;
  };

  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null;
    _min: UserMinAggregateOutputType | null;
    _max: UserMaxAggregateOutputType | null;
  };

  export type UserMinAggregateOutputType = {
    id: string | null;
    email: string | null;
    name: string | null;
    industry: $Enums.UserIndustry | null;
    companySize: $Enums.CompanySize | null;
    jobType: string | null;
    position: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type UserMaxAggregateOutputType = {
    id: string | null;
    email: string | null;
    name: string | null;
    industry: $Enums.UserIndustry | null;
    companySize: $Enums.CompanySize | null;
    jobType: string | null;
    position: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type UserCountAggregateOutputType = {
    id: number;
    email: number;
    name: number;
    industry: number;
    companySize: number;
    jobType: number;
    position: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
  };

  export type UserMinAggregateInputType = {
    id?: true;
    email?: true;
    name?: true;
    industry?: true;
    companySize?: true;
    jobType?: true;
    position?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type UserMaxAggregateInputType = {
    id?: true;
    email?: true;
    name?: true;
    industry?: true;
    companySize?: true;
    jobType?: true;
    position?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type UserCountAggregateInputType = {
    id?: true;
    email?: true;
    name?: true;
    industry?: true;
    companySize?: true;
    jobType?: true;
    position?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
  };

  export type UserAggregateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Users from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Users.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Count returned Users
     **/
    _count?: true | UserCountAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the minimum value
     **/
    _min?: UserMinAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the maximum value
     **/
    _max?: UserMaxAggregateInputType;
  };

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
    [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>;
  };

  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    {
      where?: UserWhereInput;
      orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[];
      by: UserScalarFieldEnum[] | UserScalarFieldEnum;
      having?: UserScalarWhereWithAggregatesInput;
      take?: number;
      skip?: number;
      _count?: UserCountAggregateInputType | true;
      _min?: UserMinAggregateInputType;
      _max?: UserMaxAggregateInputType;
    };

  export type UserGroupByOutputType = {
    id: string;
    email: string;
    name: string;
    industry: $Enums.UserIndustry | null;
    companySize: $Enums.CompanySize | null;
    jobType: string | null;
    position: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count: UserCountAggregateOutputType | null;
    _min: UserMinAggregateOutputType | null;
    _max: UserMaxAggregateOutputType | null;
  };

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> & {
        [P in keyof T & keyof UserGroupByOutputType]: P extends '_count'
          ? T[P] extends boolean
            ? number
            : GetScalarType<T[P], UserGroupByOutputType[P]>
          : GetScalarType<T[P], UserGroupByOutputType[P]>;
      }
    >
  >;

  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    $Extensions.GetSelect<
      {
        id?: boolean;
        email?: boolean;
        name?: boolean;
        industry?: boolean;
        companySize?: boolean;
        jobType?: boolean;
        position?: boolean;
        createdAt?: boolean;
        updatedAt?: boolean;
        goals?: boolean | User$goalsArgs<ExtArgs>;
        _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>;
      },
      ExtArgs['result']['user']
    >;

  export type UserSelectCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetSelect<
    {
      id?: boolean;
      email?: boolean;
      name?: boolean;
      industry?: boolean;
      companySize?: boolean;
      jobType?: boolean;
      position?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
    },
    ExtArgs['result']['user']
  >;

  export type UserSelectScalar = {
    id?: boolean;
    email?: boolean;
    name?: boolean;
    industry?: boolean;
    companySize?: boolean;
    jobType?: boolean;
    position?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
  };

  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    goals?: boolean | User$goalsArgs<ExtArgs>;
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>;
  };
  export type UserIncludeCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {};

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: 'User';
    objects: {
      goals: Prisma.$GoalPayload<ExtArgs>[];
    };
    scalars: $Extensions.GetPayloadResult<
      {
        id: string;
        email: string;
        name: string;
        industry: $Enums.UserIndustry | null;
        companySize: $Enums.CompanySize | null;
        jobType: string | null;
        position: string | null;
        createdAt: Date;
        updatedAt: Date;
      },
      ExtArgs['result']['user']
    >;
    composites: {};
  };

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<
    Prisma.$UserPayload,
    S
  >;

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = Omit<
    UserFindManyArgs,
    'select' | 'include' | 'distinct'
  > & {
    select?: UserCountAggregateInputType | true;
  };

  export interface UserDelegate<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User']; meta: { name: 'User' } };
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(
      args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>
    ): Prisma__UserClient<
      $Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findUnique'> | null,
      null,
      ExtArgs
    >;

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(
      args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__UserClient<
      $Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findUniqueOrThrow'>,
      never,
      ExtArgs
    >;

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(
      args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>
    ): Prisma__UserClient<
      $Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findFirst'> | null,
      null,
      ExtArgs
    >;

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(
      args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__UserClient<
      $Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findFirstOrThrow'>,
      never,
      ExtArgs
    >;

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     *
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     *
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     *
     */
    findMany<T extends UserFindManyArgs>(
      args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findMany'>>;

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     *
     */
    create<T extends UserCreateArgs>(
      args: SelectSubset<T, UserCreateArgs<ExtArgs>>
    ): Prisma__UserClient<
      $Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'create'>,
      never,
      ExtArgs
    >;

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     */
    createMany<T extends UserCreateManyArgs>(
      args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(
      args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<
      $Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'createManyAndReturn'>
    >;

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     *
     */
    delete<T extends UserDeleteArgs>(
      args: SelectSubset<T, UserDeleteArgs<ExtArgs>>
    ): Prisma__UserClient<
      $Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'delete'>,
      never,
      ExtArgs
    >;

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    update<T extends UserUpdateArgs>(
      args: SelectSubset<T, UserUpdateArgs<ExtArgs>>
    ): Prisma__UserClient<
      $Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'update'>,
      never,
      ExtArgs
    >;

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     *
     */
    deleteMany<T extends UserDeleteManyArgs>(
      args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    updateMany<T extends UserUpdateManyArgs>(
      args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(
      args: SelectSubset<T, UserUpsertArgs<ExtArgs>>
    ): Prisma__UserClient<
      $Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'upsert'>,
      never,
      ExtArgs
    >;

    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
     **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >;

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
     **/
    aggregate<T extends UserAggregateArgs>(
      args: Subset<T, UserAggregateArgs>
    ): Prisma.PrismaPromise<GetUserAggregateType<T>>;

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     *
     **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<Extends<'skip', Keys<T>>, Extends<'take', Keys<T>>>,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
        ? `Error: "by" must not be empty.`
        : HavingValid extends False
          ? {
              [P in HavingFields]: P extends ByFields
                ? never
                : P extends string
                  ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
                  : [Error, 'Field ', P, ` in "having" needs to be provided in "by"`];
            }[HavingFields]
          : 'take' extends Keys<T>
            ? 'orderBy' extends Keys<T>
              ? ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields]
              : 'Error: If you provide "take", you also need to provide "orderBy"'
            : 'skip' extends Keys<T>
              ? 'orderBy' extends Keys<T>
                ? ByValid extends True
                  ? {}
                  : {
                      [P in OrderFields]: P extends ByFields
                        ? never
                        : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                    }[OrderFields]
                : 'Error: If you provide "skip", you also need to provide "orderBy"'
              : ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields],
    >(
      args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors
    ): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    /**
     * Fields of the User model
     */
    readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<
    T,
    Null = never,
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';
    goals<T extends User$goalsArgs<ExtArgs> = {}>(
      args?: Subset<T, User$goalsArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, 'findMany'> | Null>;
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(
      onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
    ): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }

  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<'User', 'String'>;
    readonly email: FieldRef<'User', 'String'>;
    readonly name: FieldRef<'User', 'String'>;
    readonly industry: FieldRef<'User', 'UserIndustry'>;
    readonly companySize: FieldRef<'User', 'CompanySize'>;
    readonly jobType: FieldRef<'User', 'String'>;
    readonly position: FieldRef<'User', 'String'>;
    readonly createdAt: FieldRef<'User', 'DateTime'>;
    readonly updatedAt: FieldRef<'User', 'DateTime'>;
  }

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null;
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput;
  };

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null;
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput;
  };

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null;
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Users from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Users.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[];
  };

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null;
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Users from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Users.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[];
  };

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    {
      /**
       * Select specific fields to fetch from the User
       */
      select?: UserSelect<ExtArgs> | null;
      /**
       * Choose, which related nodes to fetch as well
       */
      include?: UserInclude<ExtArgs> | null;
      /**
       * Filter, which Users to fetch.
       */
      where?: UserWhereInput;
      /**
       * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
       *
       * Determine the order of Users to fetch.
       */
      orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[];
      /**
       * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
       *
       * Sets the position for listing Users.
       */
      cursor?: UserWhereUniqueInput;
      /**
       * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
       *
       * Take `±n` Users from the position of the cursor.
       */
      take?: number;
      /**
       * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
       *
       * Skip the first `n` Users.
       */
      skip?: number;
      distinct?: UserScalarFieldEnum | UserScalarFieldEnum[];
    };

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null;
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>;
  };

  /**
   * User createMany
   */
  export type UserCreateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[];
    skipDuplicates?: boolean;
  };

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null;
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[];
    skipDuplicates?: boolean;
  };

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null;
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>;
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput;
  };

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>;
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput;
  };

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null;
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput;
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>;
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>;
  };

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null;
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput;
  };

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput;
  };

  /**
   * User.goals
   */
  export type User$goalsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null;
    where?: GoalWhereInput;
    orderBy?: GoalOrderByWithRelationInput | GoalOrderByWithRelationInput[];
    cursor?: GoalWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: GoalScalarFieldEnum | GoalScalarFieldEnum[];
  };

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    {
      /**
       * Select specific fields to fetch from the User
       */
      select?: UserSelect<ExtArgs> | null;
      /**
       * Choose, which related nodes to fetch as well
       */
      include?: UserInclude<ExtArgs> | null;
    };

  /**
   * Model Goal
   */

  export type AggregateGoal = {
    _count: GoalCountAggregateOutputType | null;
    _avg: GoalAvgAggregateOutputType | null;
    _sum: GoalSumAggregateOutputType | null;
    _min: GoalMinAggregateOutputType | null;
    _max: GoalMaxAggregateOutputType | null;
  };

  export type GoalAvgAggregateOutputType = {
    progress: number | null;
  };

  export type GoalSumAggregateOutputType = {
    progress: number | null;
  };

  export type GoalMinAggregateOutputType = {
    id: string | null;
    userId: string | null;
    title: string | null;
    description: string | null;
    deadline: Date | null;
    background: string | null;
    constraints: string | null;
    status: $Enums.GoalStatus | null;
    progress: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type GoalMaxAggregateOutputType = {
    id: string | null;
    userId: string | null;
    title: string | null;
    description: string | null;
    deadline: Date | null;
    background: string | null;
    constraints: string | null;
    status: $Enums.GoalStatus | null;
    progress: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type GoalCountAggregateOutputType = {
    id: number;
    userId: number;
    title: number;
    description: number;
    deadline: number;
    background: number;
    constraints: number;
    status: number;
    progress: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
  };

  export type GoalAvgAggregateInputType = {
    progress?: true;
  };

  export type GoalSumAggregateInputType = {
    progress?: true;
  };

  export type GoalMinAggregateInputType = {
    id?: true;
    userId?: true;
    title?: true;
    description?: true;
    deadline?: true;
    background?: true;
    constraints?: true;
    status?: true;
    progress?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type GoalMaxAggregateInputType = {
    id?: true;
    userId?: true;
    title?: true;
    description?: true;
    deadline?: true;
    background?: true;
    constraints?: true;
    status?: true;
    progress?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type GoalCountAggregateInputType = {
    id?: true;
    userId?: true;
    title?: true;
    description?: true;
    deadline?: true;
    background?: true;
    constraints?: true;
    status?: true;
    progress?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
  };

  export type GoalAggregateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which Goal to aggregate.
     */
    where?: GoalWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Goals to fetch.
     */
    orderBy?: GoalOrderByWithRelationInput | GoalOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the start position
     */
    cursor?: GoalWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Goals from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Goals.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Count returned Goals
     **/
    _count?: true | GoalCountAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to average
     **/
    _avg?: GoalAvgAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to sum
     **/
    _sum?: GoalSumAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the minimum value
     **/
    _min?: GoalMinAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the maximum value
     **/
    _max?: GoalMaxAggregateInputType;
  };

  export type GetGoalAggregateType<T extends GoalAggregateArgs> = {
    [P in keyof T & keyof AggregateGoal]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGoal[P]>
      : GetScalarType<T[P], AggregateGoal[P]>;
  };

  export type GoalGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    {
      where?: GoalWhereInput;
      orderBy?: GoalOrderByWithAggregationInput | GoalOrderByWithAggregationInput[];
      by: GoalScalarFieldEnum[] | GoalScalarFieldEnum;
      having?: GoalScalarWhereWithAggregatesInput;
      take?: number;
      skip?: number;
      _count?: GoalCountAggregateInputType | true;
      _avg?: GoalAvgAggregateInputType;
      _sum?: GoalSumAggregateInputType;
      _min?: GoalMinAggregateInputType;
      _max?: GoalMaxAggregateInputType;
    };

  export type GoalGroupByOutputType = {
    id: string;
    userId: string;
    title: string;
    description: string | null;
    deadline: Date | null;
    background: string | null;
    constraints: string | null;
    status: $Enums.GoalStatus;
    progress: number;
    createdAt: Date;
    updatedAt: Date;
    _count: GoalCountAggregateOutputType | null;
    _avg: GoalAvgAggregateOutputType | null;
    _sum: GoalSumAggregateOutputType | null;
    _min: GoalMinAggregateOutputType | null;
    _max: GoalMaxAggregateOutputType | null;
  };

  type GetGoalGroupByPayload<T extends GoalGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GoalGroupByOutputType, T['by']> & {
        [P in keyof T & keyof GoalGroupByOutputType]: P extends '_count'
          ? T[P] extends boolean
            ? number
            : GetScalarType<T[P], GoalGroupByOutputType[P]>
          : GetScalarType<T[P], GoalGroupByOutputType[P]>;
      }
    >
  >;

  export type GoalSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    $Extensions.GetSelect<
      {
        id?: boolean;
        userId?: boolean;
        title?: boolean;
        description?: boolean;
        deadline?: boolean;
        background?: boolean;
        constraints?: boolean;
        status?: boolean;
        progress?: boolean;
        createdAt?: boolean;
        updatedAt?: boolean;
        user?: boolean | UserDefaultArgs<ExtArgs>;
        subGoals?: boolean | Goal$subGoalsArgs<ExtArgs>;
        _count?: boolean | GoalCountOutputTypeDefaultArgs<ExtArgs>;
      },
      ExtArgs['result']['goal']
    >;

  export type GoalSelectCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetSelect<
    {
      id?: boolean;
      userId?: boolean;
      title?: boolean;
      description?: boolean;
      deadline?: boolean;
      background?: boolean;
      constraints?: boolean;
      status?: boolean;
      progress?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
      user?: boolean | UserDefaultArgs<ExtArgs>;
    },
    ExtArgs['result']['goal']
  >;

  export type GoalSelectScalar = {
    id?: boolean;
    userId?: boolean;
    title?: boolean;
    description?: boolean;
    deadline?: boolean;
    background?: boolean;
    constraints?: boolean;
    status?: boolean;
    progress?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
  };

  export type GoalInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>;
    subGoals?: boolean | Goal$subGoalsArgs<ExtArgs>;
    _count?: boolean | GoalCountOutputTypeDefaultArgs<ExtArgs>;
  };
  export type GoalIncludeCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    user?: boolean | UserDefaultArgs<ExtArgs>;
  };

  export type $GoalPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: 'Goal';
    objects: {
      user: Prisma.$UserPayload<ExtArgs>;
      subGoals: Prisma.$SubGoalPayload<ExtArgs>[];
    };
    scalars: $Extensions.GetPayloadResult<
      {
        id: string;
        userId: string;
        title: string;
        description: string | null;
        deadline: Date | null;
        background: string | null;
        constraints: string | null;
        status: $Enums.GoalStatus;
        progress: number;
        createdAt: Date;
        updatedAt: Date;
      },
      ExtArgs['result']['goal']
    >;
    composites: {};
  };

  type GoalGetPayload<S extends boolean | null | undefined | GoalDefaultArgs> = $Result.GetResult<
    Prisma.$GoalPayload,
    S
  >;

  type GoalCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = Omit<
    GoalFindManyArgs,
    'select' | 'include' | 'distinct'
  > & {
    select?: GoalCountAggregateInputType | true;
  };

  export interface GoalDelegate<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Goal']; meta: { name: 'Goal' } };
    /**
     * Find zero or one Goal that matches the filter.
     * @param {GoalFindUniqueArgs} args - Arguments to find a Goal
     * @example
     * // Get one Goal
     * const goal = await prisma.goal.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends GoalFindUniqueArgs>(
      args: SelectSubset<T, GoalFindUniqueArgs<ExtArgs>>
    ): Prisma__GoalClient<
      $Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, 'findUnique'> | null,
      null,
      ExtArgs
    >;

    /**
     * Find one Goal that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {GoalFindUniqueOrThrowArgs} args - Arguments to find a Goal
     * @example
     * // Get one Goal
     * const goal = await prisma.goal.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends GoalFindUniqueOrThrowArgs>(
      args: SelectSubset<T, GoalFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__GoalClient<
      $Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, 'findUniqueOrThrow'>,
      never,
      ExtArgs
    >;

    /**
     * Find the first Goal that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GoalFindFirstArgs} args - Arguments to find a Goal
     * @example
     * // Get one Goal
     * const goal = await prisma.goal.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends GoalFindFirstArgs>(
      args?: SelectSubset<T, GoalFindFirstArgs<ExtArgs>>
    ): Prisma__GoalClient<
      $Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, 'findFirst'> | null,
      null,
      ExtArgs
    >;

    /**
     * Find the first Goal that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GoalFindFirstOrThrowArgs} args - Arguments to find a Goal
     * @example
     * // Get one Goal
     * const goal = await prisma.goal.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends GoalFindFirstOrThrowArgs>(
      args?: SelectSubset<T, GoalFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__GoalClient<
      $Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, 'findFirstOrThrow'>,
      never,
      ExtArgs
    >;

    /**
     * Find zero or more Goals that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GoalFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Goals
     * const goals = await prisma.goal.findMany()
     *
     * // Get first 10 Goals
     * const goals = await prisma.goal.findMany({ take: 10 })
     *
     * // Only select the `id`
     * const goalWithIdOnly = await prisma.goal.findMany({ select: { id: true } })
     *
     */
    findMany<T extends GoalFindManyArgs>(
      args?: SelectSubset<T, GoalFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, 'findMany'>>;

    /**
     * Create a Goal.
     * @param {GoalCreateArgs} args - Arguments to create a Goal.
     * @example
     * // Create one Goal
     * const Goal = await prisma.goal.create({
     *   data: {
     *     // ... data to create a Goal
     *   }
     * })
     *
     */
    create<T extends GoalCreateArgs>(
      args: SelectSubset<T, GoalCreateArgs<ExtArgs>>
    ): Prisma__GoalClient<
      $Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, 'create'>,
      never,
      ExtArgs
    >;

    /**
     * Create many Goals.
     * @param {GoalCreateManyArgs} args - Arguments to create many Goals.
     * @example
     * // Create many Goals
     * const goal = await prisma.goal.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     */
    createMany<T extends GoalCreateManyArgs>(
      args?: SelectSubset<T, GoalCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create many Goals and returns the data saved in the database.
     * @param {GoalCreateManyAndReturnArgs} args - Arguments to create many Goals.
     * @example
     * // Create many Goals
     * const goal = await prisma.goal.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Create many Goals and only return the `id`
     * const goalWithIdOnly = await prisma.goal.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    createManyAndReturn<T extends GoalCreateManyAndReturnArgs>(
      args?: SelectSubset<T, GoalCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<
      $Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, 'createManyAndReturn'>
    >;

    /**
     * Delete a Goal.
     * @param {GoalDeleteArgs} args - Arguments to delete one Goal.
     * @example
     * // Delete one Goal
     * const Goal = await prisma.goal.delete({
     *   where: {
     *     // ... filter to delete one Goal
     *   }
     * })
     *
     */
    delete<T extends GoalDeleteArgs>(
      args: SelectSubset<T, GoalDeleteArgs<ExtArgs>>
    ): Prisma__GoalClient<
      $Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, 'delete'>,
      never,
      ExtArgs
    >;

    /**
     * Update one Goal.
     * @param {GoalUpdateArgs} args - Arguments to update one Goal.
     * @example
     * // Update one Goal
     * const goal = await prisma.goal.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    update<T extends GoalUpdateArgs>(
      args: SelectSubset<T, GoalUpdateArgs<ExtArgs>>
    ): Prisma__GoalClient<
      $Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, 'update'>,
      never,
      ExtArgs
    >;

    /**
     * Delete zero or more Goals.
     * @param {GoalDeleteManyArgs} args - Arguments to filter Goals to delete.
     * @example
     * // Delete a few Goals
     * const { count } = await prisma.goal.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     *
     */
    deleteMany<T extends GoalDeleteManyArgs>(
      args?: SelectSubset<T, GoalDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Update zero or more Goals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GoalUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Goals
     * const goal = await prisma.goal.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    updateMany<T extends GoalUpdateManyArgs>(
      args: SelectSubset<T, GoalUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create or update one Goal.
     * @param {GoalUpsertArgs} args - Arguments to update or create a Goal.
     * @example
     * // Update or create a Goal
     * const goal = await prisma.goal.upsert({
     *   create: {
     *     // ... data to create a Goal
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Goal we want to update
     *   }
     * })
     */
    upsert<T extends GoalUpsertArgs>(
      args: SelectSubset<T, GoalUpsertArgs<ExtArgs>>
    ): Prisma__GoalClient<
      $Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, 'upsert'>,
      never,
      ExtArgs
    >;

    /**
     * Count the number of Goals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GoalCountArgs} args - Arguments to filter Goals to count.
     * @example
     * // Count the number of Goals
     * const count = await prisma.goal.count({
     *   where: {
     *     // ... the filter for the Goals we want to count
     *   }
     * })
     **/
    count<T extends GoalCountArgs>(
      args?: Subset<T, GoalCountArgs>
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GoalCountAggregateOutputType>
        : number
    >;

    /**
     * Allows you to perform aggregations operations on a Goal.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GoalAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
     **/
    aggregate<T extends GoalAggregateArgs>(
      args: Subset<T, GoalAggregateArgs>
    ): Prisma.PrismaPromise<GetGoalAggregateType<T>>;

    /**
     * Group by Goal.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GoalGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     *
     **/
    groupBy<
      T extends GoalGroupByArgs,
      HasSelectOrTake extends Or<Extends<'skip', Keys<T>>, Extends<'take', Keys<T>>>,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GoalGroupByArgs['orderBy'] }
        : { orderBy?: GoalGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
        ? `Error: "by" must not be empty.`
        : HavingValid extends False
          ? {
              [P in HavingFields]: P extends ByFields
                ? never
                : P extends string
                  ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
                  : [Error, 'Field ', P, ` in "having" needs to be provided in "by"`];
            }[HavingFields]
          : 'take' extends Keys<T>
            ? 'orderBy' extends Keys<T>
              ? ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields]
              : 'Error: If you provide "take", you also need to provide "orderBy"'
            : 'skip' extends Keys<T>
              ? 'orderBy' extends Keys<T>
                ? ByValid extends True
                  ? {}
                  : {
                      [P in OrderFields]: P extends ByFields
                        ? never
                        : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                    }[OrderFields]
                : 'Error: If you provide "skip", you also need to provide "orderBy"'
              : ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields],
    >(
      args: SubsetIntersection<T, GoalGroupByArgs, OrderByArg> & InputErrors
    ): {} extends InputErrors ? GetGoalGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    /**
     * Fields of the Goal model
     */
    readonly fields: GoalFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Goal.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GoalClient<
    T,
    Null = never,
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';
    user<T extends UserDefaultArgs<ExtArgs> = {}>(
      args?: Subset<T, UserDefaultArgs<ExtArgs>>
    ): Prisma__UserClient<
      $Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null,
      Null,
      ExtArgs
    >;
    subGoals<T extends Goal$subGoalsArgs<ExtArgs> = {}>(
      args?: Subset<T, Goal$subGoalsArgs<ExtArgs>>
    ): Prisma.PrismaPromise<
      $Result.GetResult<Prisma.$SubGoalPayload<ExtArgs>, T, 'findMany'> | Null
    >;
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(
      onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
    ): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }

  /**
   * Fields of the Goal model
   */
  interface GoalFieldRefs {
    readonly id: FieldRef<'Goal', 'String'>;
    readonly userId: FieldRef<'Goal', 'String'>;
    readonly title: FieldRef<'Goal', 'String'>;
    readonly description: FieldRef<'Goal', 'String'>;
    readonly deadline: FieldRef<'Goal', 'DateTime'>;
    readonly background: FieldRef<'Goal', 'String'>;
    readonly constraints: FieldRef<'Goal', 'String'>;
    readonly status: FieldRef<'Goal', 'GoalStatus'>;
    readonly progress: FieldRef<'Goal', 'Int'>;
    readonly createdAt: FieldRef<'Goal', 'DateTime'>;
    readonly updatedAt: FieldRef<'Goal', 'DateTime'>;
  }

  // Custom InputTypes
  /**
   * Goal findUnique
   */
  export type GoalFindUniqueArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null;
    /**
     * Filter, which Goal to fetch.
     */
    where: GoalWhereUniqueInput;
  };

  /**
   * Goal findUniqueOrThrow
   */
  export type GoalFindUniqueOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null;
    /**
     * Filter, which Goal to fetch.
     */
    where: GoalWhereUniqueInput;
  };

  /**
   * Goal findFirst
   */
  export type GoalFindFirstArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null;
    /**
     * Filter, which Goal to fetch.
     */
    where?: GoalWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Goals to fetch.
     */
    orderBy?: GoalOrderByWithRelationInput | GoalOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Goals.
     */
    cursor?: GoalWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Goals from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Goals.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Goals.
     */
    distinct?: GoalScalarFieldEnum | GoalScalarFieldEnum[];
  };

  /**
   * Goal findFirstOrThrow
   */
  export type GoalFindFirstOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null;
    /**
     * Filter, which Goal to fetch.
     */
    where?: GoalWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Goals to fetch.
     */
    orderBy?: GoalOrderByWithRelationInput | GoalOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Goals.
     */
    cursor?: GoalWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Goals from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Goals.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Goals.
     */
    distinct?: GoalScalarFieldEnum | GoalScalarFieldEnum[];
  };

  /**
   * Goal findMany
   */
  export type GoalFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    {
      /**
       * Select specific fields to fetch from the Goal
       */
      select?: GoalSelect<ExtArgs> | null;
      /**
       * Choose, which related nodes to fetch as well
       */
      include?: GoalInclude<ExtArgs> | null;
      /**
       * Filter, which Goals to fetch.
       */
      where?: GoalWhereInput;
      /**
       * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
       *
       * Determine the order of Goals to fetch.
       */
      orderBy?: GoalOrderByWithRelationInput | GoalOrderByWithRelationInput[];
      /**
       * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
       *
       * Sets the position for listing Goals.
       */
      cursor?: GoalWhereUniqueInput;
      /**
       * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
       *
       * Take `±n` Goals from the position of the cursor.
       */
      take?: number;
      /**
       * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
       *
       * Skip the first `n` Goals.
       */
      skip?: number;
      distinct?: GoalScalarFieldEnum | GoalScalarFieldEnum[];
    };

  /**
   * Goal create
   */
  export type GoalCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null;
    /**
     * The data needed to create a Goal.
     */
    data: XOR<GoalCreateInput, GoalUncheckedCreateInput>;
  };

  /**
   * Goal createMany
   */
  export type GoalCreateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to create many Goals.
     */
    data: GoalCreateManyInput | GoalCreateManyInput[];
    skipDuplicates?: boolean;
  };

  /**
   * Goal createManyAndReturn
   */
  export type GoalCreateManyAndReturnArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelectCreateManyAndReturn<ExtArgs> | null;
    /**
     * The data used to create many Goals.
     */
    data: GoalCreateManyInput | GoalCreateManyInput[];
    skipDuplicates?: boolean;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalIncludeCreateManyAndReturn<ExtArgs> | null;
  };

  /**
   * Goal update
   */
  export type GoalUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null;
    /**
     * The data needed to update a Goal.
     */
    data: XOR<GoalUpdateInput, GoalUncheckedUpdateInput>;
    /**
     * Choose, which Goal to update.
     */
    where: GoalWhereUniqueInput;
  };

  /**
   * Goal updateMany
   */
  export type GoalUpdateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to update Goals.
     */
    data: XOR<GoalUpdateManyMutationInput, GoalUncheckedUpdateManyInput>;
    /**
     * Filter which Goals to update
     */
    where?: GoalWhereInput;
  };

  /**
   * Goal upsert
   */
  export type GoalUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null;
    /**
     * The filter to search for the Goal to update in case it exists.
     */
    where: GoalWhereUniqueInput;
    /**
     * In case the Goal found by the `where` argument doesn't exist, create a new Goal with this data.
     */
    create: XOR<GoalCreateInput, GoalUncheckedCreateInput>;
    /**
     * In case the Goal was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GoalUpdateInput, GoalUncheckedUpdateInput>;
  };

  /**
   * Goal delete
   */
  export type GoalDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Goal
     */
    select?: GoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: GoalInclude<ExtArgs> | null;
    /**
     * Filter which Goal to delete.
     */
    where: GoalWhereUniqueInput;
  };

  /**
   * Goal deleteMany
   */
  export type GoalDeleteManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which Goals to delete
     */
    where?: GoalWhereInput;
  };

  /**
   * Goal.subGoals
   */
  export type Goal$subGoalsArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the SubGoal
     */
    select?: SubGoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubGoalInclude<ExtArgs> | null;
    where?: SubGoalWhereInput;
    orderBy?: SubGoalOrderByWithRelationInput | SubGoalOrderByWithRelationInput[];
    cursor?: SubGoalWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: SubGoalScalarFieldEnum | SubGoalScalarFieldEnum[];
  };

  /**
   * Goal without action
   */
  export type GoalDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    {
      /**
       * Select specific fields to fetch from the Goal
       */
      select?: GoalSelect<ExtArgs> | null;
      /**
       * Choose, which related nodes to fetch as well
       */
      include?: GoalInclude<ExtArgs> | null;
    };

  /**
   * Model SubGoal
   */

  export type AggregateSubGoal = {
    _count: SubGoalCountAggregateOutputType | null;
    _avg: SubGoalAvgAggregateOutputType | null;
    _sum: SubGoalSumAggregateOutputType | null;
    _min: SubGoalMinAggregateOutputType | null;
    _max: SubGoalMaxAggregateOutputType | null;
  };

  export type SubGoalAvgAggregateOutputType = {
    position: number | null;
    progress: number | null;
  };

  export type SubGoalSumAggregateOutputType = {
    position: number | null;
    progress: number | null;
  };

  export type SubGoalMinAggregateOutputType = {
    id: string | null;
    goalId: string | null;
    title: string | null;
    description: string | null;
    background: string | null;
    constraints: string | null;
    position: number | null;
    progress: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type SubGoalMaxAggregateOutputType = {
    id: string | null;
    goalId: string | null;
    title: string | null;
    description: string | null;
    background: string | null;
    constraints: string | null;
    position: number | null;
    progress: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type SubGoalCountAggregateOutputType = {
    id: number;
    goalId: number;
    title: number;
    description: number;
    background: number;
    constraints: number;
    position: number;
    progress: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
  };

  export type SubGoalAvgAggregateInputType = {
    position?: true;
    progress?: true;
  };

  export type SubGoalSumAggregateInputType = {
    position?: true;
    progress?: true;
  };

  export type SubGoalMinAggregateInputType = {
    id?: true;
    goalId?: true;
    title?: true;
    description?: true;
    background?: true;
    constraints?: true;
    position?: true;
    progress?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type SubGoalMaxAggregateInputType = {
    id?: true;
    goalId?: true;
    title?: true;
    description?: true;
    background?: true;
    constraints?: true;
    position?: true;
    progress?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type SubGoalCountAggregateInputType = {
    id?: true;
    goalId?: true;
    title?: true;
    description?: true;
    background?: true;
    constraints?: true;
    position?: true;
    progress?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
  };

  export type SubGoalAggregateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which SubGoal to aggregate.
     */
    where?: SubGoalWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of SubGoals to fetch.
     */
    orderBy?: SubGoalOrderByWithRelationInput | SubGoalOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the start position
     */
    cursor?: SubGoalWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` SubGoals from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` SubGoals.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Count returned SubGoals
     **/
    _count?: true | SubGoalCountAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to average
     **/
    _avg?: SubGoalAvgAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to sum
     **/
    _sum?: SubGoalSumAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the minimum value
     **/
    _min?: SubGoalMinAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the maximum value
     **/
    _max?: SubGoalMaxAggregateInputType;
  };

  export type GetSubGoalAggregateType<T extends SubGoalAggregateArgs> = {
    [P in keyof T & keyof AggregateSubGoal]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSubGoal[P]>
      : GetScalarType<T[P], AggregateSubGoal[P]>;
  };

  export type SubGoalGroupByArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    where?: SubGoalWhereInput;
    orderBy?: SubGoalOrderByWithAggregationInput | SubGoalOrderByWithAggregationInput[];
    by: SubGoalScalarFieldEnum[] | SubGoalScalarFieldEnum;
    having?: SubGoalScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: SubGoalCountAggregateInputType | true;
    _avg?: SubGoalAvgAggregateInputType;
    _sum?: SubGoalSumAggregateInputType;
    _min?: SubGoalMinAggregateInputType;
    _max?: SubGoalMaxAggregateInputType;
  };

  export type SubGoalGroupByOutputType = {
    id: string;
    goalId: string;
    title: string;
    description: string | null;
    background: string | null;
    constraints: string | null;
    position: number;
    progress: number;
    createdAt: Date;
    updatedAt: Date;
    _count: SubGoalCountAggregateOutputType | null;
    _avg: SubGoalAvgAggregateOutputType | null;
    _sum: SubGoalSumAggregateOutputType | null;
    _min: SubGoalMinAggregateOutputType | null;
    _max: SubGoalMaxAggregateOutputType | null;
  };

  type GetSubGoalGroupByPayload<T extends SubGoalGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SubGoalGroupByOutputType, T['by']> & {
        [P in keyof T & keyof SubGoalGroupByOutputType]: P extends '_count'
          ? T[P] extends boolean
            ? number
            : GetScalarType<T[P], SubGoalGroupByOutputType[P]>
          : GetScalarType<T[P], SubGoalGroupByOutputType[P]>;
      }
    >
  >;

  export type SubGoalSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    $Extensions.GetSelect<
      {
        id?: boolean;
        goalId?: boolean;
        title?: boolean;
        description?: boolean;
        background?: boolean;
        constraints?: boolean;
        position?: boolean;
        progress?: boolean;
        createdAt?: boolean;
        updatedAt?: boolean;
        goal?: boolean | GoalDefaultArgs<ExtArgs>;
        actions?: boolean | SubGoal$actionsArgs<ExtArgs>;
        _count?: boolean | SubGoalCountOutputTypeDefaultArgs<ExtArgs>;
      },
      ExtArgs['result']['subGoal']
    >;

  export type SubGoalSelectCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetSelect<
    {
      id?: boolean;
      goalId?: boolean;
      title?: boolean;
      description?: boolean;
      background?: boolean;
      constraints?: boolean;
      position?: boolean;
      progress?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
      goal?: boolean | GoalDefaultArgs<ExtArgs>;
    },
    ExtArgs['result']['subGoal']
  >;

  export type SubGoalSelectScalar = {
    id?: boolean;
    goalId?: boolean;
    title?: boolean;
    description?: boolean;
    background?: boolean;
    constraints?: boolean;
    position?: boolean;
    progress?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
  };

  export type SubGoalInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    goal?: boolean | GoalDefaultArgs<ExtArgs>;
    actions?: boolean | SubGoal$actionsArgs<ExtArgs>;
    _count?: boolean | SubGoalCountOutputTypeDefaultArgs<ExtArgs>;
  };
  export type SubGoalIncludeCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    goal?: boolean | GoalDefaultArgs<ExtArgs>;
  };

  export type $SubGoalPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    {
      name: 'SubGoal';
      objects: {
        goal: Prisma.$GoalPayload<ExtArgs>;
        actions: Prisma.$ActionPayload<ExtArgs>[];
      };
      scalars: $Extensions.GetPayloadResult<
        {
          id: string;
          goalId: string;
          title: string;
          description: string | null;
          background: string | null;
          constraints: string | null;
          position: number;
          progress: number;
          createdAt: Date;
          updatedAt: Date;
        },
        ExtArgs['result']['subGoal']
      >;
      composites: {};
    };

  type SubGoalGetPayload<S extends boolean | null | undefined | SubGoalDefaultArgs> =
    $Result.GetResult<Prisma.$SubGoalPayload, S>;

  type SubGoalCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = Omit<
    SubGoalFindManyArgs,
    'select' | 'include' | 'distinct'
  > & {
    select?: SubGoalCountAggregateInputType | true;
  };

  export interface SubGoalDelegate<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SubGoal']; meta: { name: 'SubGoal' } };
    /**
     * Find zero or one SubGoal that matches the filter.
     * @param {SubGoalFindUniqueArgs} args - Arguments to find a SubGoal
     * @example
     * // Get one SubGoal
     * const subGoal = await prisma.subGoal.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SubGoalFindUniqueArgs>(
      args: SelectSubset<T, SubGoalFindUniqueArgs<ExtArgs>>
    ): Prisma__SubGoalClient<
      $Result.GetResult<Prisma.$SubGoalPayload<ExtArgs>, T, 'findUnique'> | null,
      null,
      ExtArgs
    >;

    /**
     * Find one SubGoal that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SubGoalFindUniqueOrThrowArgs} args - Arguments to find a SubGoal
     * @example
     * // Get one SubGoal
     * const subGoal = await prisma.subGoal.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SubGoalFindUniqueOrThrowArgs>(
      args: SelectSubset<T, SubGoalFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__SubGoalClient<
      $Result.GetResult<Prisma.$SubGoalPayload<ExtArgs>, T, 'findUniqueOrThrow'>,
      never,
      ExtArgs
    >;

    /**
     * Find the first SubGoal that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubGoalFindFirstArgs} args - Arguments to find a SubGoal
     * @example
     * // Get one SubGoal
     * const subGoal = await prisma.subGoal.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SubGoalFindFirstArgs>(
      args?: SelectSubset<T, SubGoalFindFirstArgs<ExtArgs>>
    ): Prisma__SubGoalClient<
      $Result.GetResult<Prisma.$SubGoalPayload<ExtArgs>, T, 'findFirst'> | null,
      null,
      ExtArgs
    >;

    /**
     * Find the first SubGoal that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubGoalFindFirstOrThrowArgs} args - Arguments to find a SubGoal
     * @example
     * // Get one SubGoal
     * const subGoal = await prisma.subGoal.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SubGoalFindFirstOrThrowArgs>(
      args?: SelectSubset<T, SubGoalFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__SubGoalClient<
      $Result.GetResult<Prisma.$SubGoalPayload<ExtArgs>, T, 'findFirstOrThrow'>,
      never,
      ExtArgs
    >;

    /**
     * Find zero or more SubGoals that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubGoalFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SubGoals
     * const subGoals = await prisma.subGoal.findMany()
     *
     * // Get first 10 SubGoals
     * const subGoals = await prisma.subGoal.findMany({ take: 10 })
     *
     * // Only select the `id`
     * const subGoalWithIdOnly = await prisma.subGoal.findMany({ select: { id: true } })
     *
     */
    findMany<T extends SubGoalFindManyArgs>(
      args?: SelectSubset<T, SubGoalFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubGoalPayload<ExtArgs>, T, 'findMany'>>;

    /**
     * Create a SubGoal.
     * @param {SubGoalCreateArgs} args - Arguments to create a SubGoal.
     * @example
     * // Create one SubGoal
     * const SubGoal = await prisma.subGoal.create({
     *   data: {
     *     // ... data to create a SubGoal
     *   }
     * })
     *
     */
    create<T extends SubGoalCreateArgs>(
      args: SelectSubset<T, SubGoalCreateArgs<ExtArgs>>
    ): Prisma__SubGoalClient<
      $Result.GetResult<Prisma.$SubGoalPayload<ExtArgs>, T, 'create'>,
      never,
      ExtArgs
    >;

    /**
     * Create many SubGoals.
     * @param {SubGoalCreateManyArgs} args - Arguments to create many SubGoals.
     * @example
     * // Create many SubGoals
     * const subGoal = await prisma.subGoal.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     */
    createMany<T extends SubGoalCreateManyArgs>(
      args?: SelectSubset<T, SubGoalCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create many SubGoals and returns the data saved in the database.
     * @param {SubGoalCreateManyAndReturnArgs} args - Arguments to create many SubGoals.
     * @example
     * // Create many SubGoals
     * const subGoal = await prisma.subGoal.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Create many SubGoals and only return the `id`
     * const subGoalWithIdOnly = await prisma.subGoal.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    createManyAndReturn<T extends SubGoalCreateManyAndReturnArgs>(
      args?: SelectSubset<T, SubGoalCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<
      $Result.GetResult<Prisma.$SubGoalPayload<ExtArgs>, T, 'createManyAndReturn'>
    >;

    /**
     * Delete a SubGoal.
     * @param {SubGoalDeleteArgs} args - Arguments to delete one SubGoal.
     * @example
     * // Delete one SubGoal
     * const SubGoal = await prisma.subGoal.delete({
     *   where: {
     *     // ... filter to delete one SubGoal
     *   }
     * })
     *
     */
    delete<T extends SubGoalDeleteArgs>(
      args: SelectSubset<T, SubGoalDeleteArgs<ExtArgs>>
    ): Prisma__SubGoalClient<
      $Result.GetResult<Prisma.$SubGoalPayload<ExtArgs>, T, 'delete'>,
      never,
      ExtArgs
    >;

    /**
     * Update one SubGoal.
     * @param {SubGoalUpdateArgs} args - Arguments to update one SubGoal.
     * @example
     * // Update one SubGoal
     * const subGoal = await prisma.subGoal.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    update<T extends SubGoalUpdateArgs>(
      args: SelectSubset<T, SubGoalUpdateArgs<ExtArgs>>
    ): Prisma__SubGoalClient<
      $Result.GetResult<Prisma.$SubGoalPayload<ExtArgs>, T, 'update'>,
      never,
      ExtArgs
    >;

    /**
     * Delete zero or more SubGoals.
     * @param {SubGoalDeleteManyArgs} args - Arguments to filter SubGoals to delete.
     * @example
     * // Delete a few SubGoals
     * const { count } = await prisma.subGoal.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     *
     */
    deleteMany<T extends SubGoalDeleteManyArgs>(
      args?: SelectSubset<T, SubGoalDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Update zero or more SubGoals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubGoalUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SubGoals
     * const subGoal = await prisma.subGoal.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    updateMany<T extends SubGoalUpdateManyArgs>(
      args: SelectSubset<T, SubGoalUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create or update one SubGoal.
     * @param {SubGoalUpsertArgs} args - Arguments to update or create a SubGoal.
     * @example
     * // Update or create a SubGoal
     * const subGoal = await prisma.subGoal.upsert({
     *   create: {
     *     // ... data to create a SubGoal
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SubGoal we want to update
     *   }
     * })
     */
    upsert<T extends SubGoalUpsertArgs>(
      args: SelectSubset<T, SubGoalUpsertArgs<ExtArgs>>
    ): Prisma__SubGoalClient<
      $Result.GetResult<Prisma.$SubGoalPayload<ExtArgs>, T, 'upsert'>,
      never,
      ExtArgs
    >;

    /**
     * Count the number of SubGoals.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubGoalCountArgs} args - Arguments to filter SubGoals to count.
     * @example
     * // Count the number of SubGoals
     * const count = await prisma.subGoal.count({
     *   where: {
     *     // ... the filter for the SubGoals we want to count
     *   }
     * })
     **/
    count<T extends SubGoalCountArgs>(
      args?: Subset<T, SubGoalCountArgs>
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SubGoalCountAggregateOutputType>
        : number
    >;

    /**
     * Allows you to perform aggregations operations on a SubGoal.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubGoalAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
     **/
    aggregate<T extends SubGoalAggregateArgs>(
      args: Subset<T, SubGoalAggregateArgs>
    ): Prisma.PrismaPromise<GetSubGoalAggregateType<T>>;

    /**
     * Group by SubGoal.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubGoalGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     *
     **/
    groupBy<
      T extends SubGoalGroupByArgs,
      HasSelectOrTake extends Or<Extends<'skip', Keys<T>>, Extends<'take', Keys<T>>>,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SubGoalGroupByArgs['orderBy'] }
        : { orderBy?: SubGoalGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
        ? `Error: "by" must not be empty.`
        : HavingValid extends False
          ? {
              [P in HavingFields]: P extends ByFields
                ? never
                : P extends string
                  ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
                  : [Error, 'Field ', P, ` in "having" needs to be provided in "by"`];
            }[HavingFields]
          : 'take' extends Keys<T>
            ? 'orderBy' extends Keys<T>
              ? ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields]
              : 'Error: If you provide "take", you also need to provide "orderBy"'
            : 'skip' extends Keys<T>
              ? 'orderBy' extends Keys<T>
                ? ByValid extends True
                  ? {}
                  : {
                      [P in OrderFields]: P extends ByFields
                        ? never
                        : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                    }[OrderFields]
                : 'Error: If you provide "skip", you also need to provide "orderBy"'
              : ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields],
    >(
      args: SubsetIntersection<T, SubGoalGroupByArgs, OrderByArg> & InputErrors
    ): {} extends InputErrors ? GetSubGoalGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    /**
     * Fields of the SubGoal model
     */
    readonly fields: SubGoalFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SubGoal.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SubGoalClient<
    T,
    Null = never,
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';
    goal<T extends GoalDefaultArgs<ExtArgs> = {}>(
      args?: Subset<T, GoalDefaultArgs<ExtArgs>>
    ): Prisma__GoalClient<
      $Result.GetResult<Prisma.$GoalPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null,
      Null,
      ExtArgs
    >;
    actions<T extends SubGoal$actionsArgs<ExtArgs> = {}>(
      args?: Subset<T, SubGoal$actionsArgs<ExtArgs>>
    ): Prisma.PrismaPromise<
      $Result.GetResult<Prisma.$ActionPayload<ExtArgs>, T, 'findMany'> | Null
    >;
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(
      onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
    ): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }

  /**
   * Fields of the SubGoal model
   */
  interface SubGoalFieldRefs {
    readonly id: FieldRef<'SubGoal', 'String'>;
    readonly goalId: FieldRef<'SubGoal', 'String'>;
    readonly title: FieldRef<'SubGoal', 'String'>;
    readonly description: FieldRef<'SubGoal', 'String'>;
    readonly background: FieldRef<'SubGoal', 'String'>;
    readonly constraints: FieldRef<'SubGoal', 'String'>;
    readonly position: FieldRef<'SubGoal', 'Int'>;
    readonly progress: FieldRef<'SubGoal', 'Int'>;
    readonly createdAt: FieldRef<'SubGoal', 'DateTime'>;
    readonly updatedAt: FieldRef<'SubGoal', 'DateTime'>;
  }

  // Custom InputTypes
  /**
   * SubGoal findUnique
   */
  export type SubGoalFindUniqueArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the SubGoal
     */
    select?: SubGoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubGoalInclude<ExtArgs> | null;
    /**
     * Filter, which SubGoal to fetch.
     */
    where: SubGoalWhereUniqueInput;
  };

  /**
   * SubGoal findUniqueOrThrow
   */
  export type SubGoalFindUniqueOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the SubGoal
     */
    select?: SubGoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubGoalInclude<ExtArgs> | null;
    /**
     * Filter, which SubGoal to fetch.
     */
    where: SubGoalWhereUniqueInput;
  };

  /**
   * SubGoal findFirst
   */
  export type SubGoalFindFirstArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the SubGoal
     */
    select?: SubGoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubGoalInclude<ExtArgs> | null;
    /**
     * Filter, which SubGoal to fetch.
     */
    where?: SubGoalWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of SubGoals to fetch.
     */
    orderBy?: SubGoalOrderByWithRelationInput | SubGoalOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for SubGoals.
     */
    cursor?: SubGoalWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` SubGoals from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` SubGoals.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of SubGoals.
     */
    distinct?: SubGoalScalarFieldEnum | SubGoalScalarFieldEnum[];
  };

  /**
   * SubGoal findFirstOrThrow
   */
  export type SubGoalFindFirstOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the SubGoal
     */
    select?: SubGoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubGoalInclude<ExtArgs> | null;
    /**
     * Filter, which SubGoal to fetch.
     */
    where?: SubGoalWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of SubGoals to fetch.
     */
    orderBy?: SubGoalOrderByWithRelationInput | SubGoalOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for SubGoals.
     */
    cursor?: SubGoalWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` SubGoals from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` SubGoals.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of SubGoals.
     */
    distinct?: SubGoalScalarFieldEnum | SubGoalScalarFieldEnum[];
  };

  /**
   * SubGoal findMany
   */
  export type SubGoalFindManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the SubGoal
     */
    select?: SubGoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubGoalInclude<ExtArgs> | null;
    /**
     * Filter, which SubGoals to fetch.
     */
    where?: SubGoalWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of SubGoals to fetch.
     */
    orderBy?: SubGoalOrderByWithRelationInput | SubGoalOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for listing SubGoals.
     */
    cursor?: SubGoalWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` SubGoals from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` SubGoals.
     */
    skip?: number;
    distinct?: SubGoalScalarFieldEnum | SubGoalScalarFieldEnum[];
  };

  /**
   * SubGoal create
   */
  export type SubGoalCreateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the SubGoal
     */
    select?: SubGoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubGoalInclude<ExtArgs> | null;
    /**
     * The data needed to create a SubGoal.
     */
    data: XOR<SubGoalCreateInput, SubGoalUncheckedCreateInput>;
  };

  /**
   * SubGoal createMany
   */
  export type SubGoalCreateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to create many SubGoals.
     */
    data: SubGoalCreateManyInput | SubGoalCreateManyInput[];
    skipDuplicates?: boolean;
  };

  /**
   * SubGoal createManyAndReturn
   */
  export type SubGoalCreateManyAndReturnArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the SubGoal
     */
    select?: SubGoalSelectCreateManyAndReturn<ExtArgs> | null;
    /**
     * The data used to create many SubGoals.
     */
    data: SubGoalCreateManyInput | SubGoalCreateManyInput[];
    skipDuplicates?: boolean;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubGoalIncludeCreateManyAndReturn<ExtArgs> | null;
  };

  /**
   * SubGoal update
   */
  export type SubGoalUpdateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the SubGoal
     */
    select?: SubGoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubGoalInclude<ExtArgs> | null;
    /**
     * The data needed to update a SubGoal.
     */
    data: XOR<SubGoalUpdateInput, SubGoalUncheckedUpdateInput>;
    /**
     * Choose, which SubGoal to update.
     */
    where: SubGoalWhereUniqueInput;
  };

  /**
   * SubGoal updateMany
   */
  export type SubGoalUpdateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to update SubGoals.
     */
    data: XOR<SubGoalUpdateManyMutationInput, SubGoalUncheckedUpdateManyInput>;
    /**
     * Filter which SubGoals to update
     */
    where?: SubGoalWhereInput;
  };

  /**
   * SubGoal upsert
   */
  export type SubGoalUpsertArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the SubGoal
     */
    select?: SubGoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubGoalInclude<ExtArgs> | null;
    /**
     * The filter to search for the SubGoal to update in case it exists.
     */
    where: SubGoalWhereUniqueInput;
    /**
     * In case the SubGoal found by the `where` argument doesn't exist, create a new SubGoal with this data.
     */
    create: XOR<SubGoalCreateInput, SubGoalUncheckedCreateInput>;
    /**
     * In case the SubGoal was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SubGoalUpdateInput, SubGoalUncheckedUpdateInput>;
  };

  /**
   * SubGoal delete
   */
  export type SubGoalDeleteArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the SubGoal
     */
    select?: SubGoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubGoalInclude<ExtArgs> | null;
    /**
     * Filter which SubGoal to delete.
     */
    where: SubGoalWhereUniqueInput;
  };

  /**
   * SubGoal deleteMany
   */
  export type SubGoalDeleteManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which SubGoals to delete
     */
    where?: SubGoalWhereInput;
  };

  /**
   * SubGoal.actions
   */
  export type SubGoal$actionsArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Action
     */
    select?: ActionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ActionInclude<ExtArgs> | null;
    where?: ActionWhereInput;
    orderBy?: ActionOrderByWithRelationInput | ActionOrderByWithRelationInput[];
    cursor?: ActionWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: ActionScalarFieldEnum | ActionScalarFieldEnum[];
  };

  /**
   * SubGoal without action
   */
  export type SubGoalDefaultArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the SubGoal
     */
    select?: SubGoalSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubGoalInclude<ExtArgs> | null;
  };

  /**
   * Model Action
   */

  export type AggregateAction = {
    _count: ActionCountAggregateOutputType | null;
    _avg: ActionAvgAggregateOutputType | null;
    _sum: ActionSumAggregateOutputType | null;
    _min: ActionMinAggregateOutputType | null;
    _max: ActionMaxAggregateOutputType | null;
  };

  export type ActionAvgAggregateOutputType = {
    position: number | null;
    progress: number | null;
  };

  export type ActionSumAggregateOutputType = {
    position: number | null;
    progress: number | null;
  };

  export type ActionMinAggregateOutputType = {
    id: string | null;
    subGoalId: string | null;
    title: string | null;
    description: string | null;
    background: string | null;
    constraints: string | null;
    position: number | null;
    progress: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type ActionMaxAggregateOutputType = {
    id: string | null;
    subGoalId: string | null;
    title: string | null;
    description: string | null;
    background: string | null;
    constraints: string | null;
    position: number | null;
    progress: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type ActionCountAggregateOutputType = {
    id: number;
    subGoalId: number;
    title: number;
    description: number;
    background: number;
    constraints: number;
    position: number;
    progress: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
  };

  export type ActionAvgAggregateInputType = {
    position?: true;
    progress?: true;
  };

  export type ActionSumAggregateInputType = {
    position?: true;
    progress?: true;
  };

  export type ActionMinAggregateInputType = {
    id?: true;
    subGoalId?: true;
    title?: true;
    description?: true;
    background?: true;
    constraints?: true;
    position?: true;
    progress?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type ActionMaxAggregateInputType = {
    id?: true;
    subGoalId?: true;
    title?: true;
    description?: true;
    background?: true;
    constraints?: true;
    position?: true;
    progress?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type ActionCountAggregateInputType = {
    id?: true;
    subGoalId?: true;
    title?: true;
    description?: true;
    background?: true;
    constraints?: true;
    position?: true;
    progress?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
  };

  export type ActionAggregateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which Action to aggregate.
     */
    where?: ActionWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Actions to fetch.
     */
    orderBy?: ActionOrderByWithRelationInput | ActionOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the start position
     */
    cursor?: ActionWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Actions from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Actions.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Count returned Actions
     **/
    _count?: true | ActionCountAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to average
     **/
    _avg?: ActionAvgAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to sum
     **/
    _sum?: ActionSumAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the minimum value
     **/
    _min?: ActionMinAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the maximum value
     **/
    _max?: ActionMaxAggregateInputType;
  };

  export type GetActionAggregateType<T extends ActionAggregateArgs> = {
    [P in keyof T & keyof AggregateAction]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAction[P]>
      : GetScalarType<T[P], AggregateAction[P]>;
  };

  export type ActionGroupByArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    where?: ActionWhereInput;
    orderBy?: ActionOrderByWithAggregationInput | ActionOrderByWithAggregationInput[];
    by: ActionScalarFieldEnum[] | ActionScalarFieldEnum;
    having?: ActionScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: ActionCountAggregateInputType | true;
    _avg?: ActionAvgAggregateInputType;
    _sum?: ActionSumAggregateInputType;
    _min?: ActionMinAggregateInputType;
    _max?: ActionMaxAggregateInputType;
  };

  export type ActionGroupByOutputType = {
    id: string;
    subGoalId: string;
    title: string;
    description: string | null;
    background: string | null;
    constraints: string | null;
    position: number;
    progress: number;
    createdAt: Date;
    updatedAt: Date;
    _count: ActionCountAggregateOutputType | null;
    _avg: ActionAvgAggregateOutputType | null;
    _sum: ActionSumAggregateOutputType | null;
    _min: ActionMinAggregateOutputType | null;
    _max: ActionMaxAggregateOutputType | null;
  };

  type GetActionGroupByPayload<T extends ActionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ActionGroupByOutputType, T['by']> & {
        [P in keyof T & keyof ActionGroupByOutputType]: P extends '_count'
          ? T[P] extends boolean
            ? number
            : GetScalarType<T[P], ActionGroupByOutputType[P]>
          : GetScalarType<T[P], ActionGroupByOutputType[P]>;
      }
    >
  >;

  export type ActionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    $Extensions.GetSelect<
      {
        id?: boolean;
        subGoalId?: boolean;
        title?: boolean;
        description?: boolean;
        background?: boolean;
        constraints?: boolean;
        position?: boolean;
        progress?: boolean;
        createdAt?: boolean;
        updatedAt?: boolean;
        subGoal?: boolean | SubGoalDefaultArgs<ExtArgs>;
        tasks?: boolean | Action$tasksArgs<ExtArgs>;
        _count?: boolean | ActionCountOutputTypeDefaultArgs<ExtArgs>;
      },
      ExtArgs['result']['action']
    >;

  export type ActionSelectCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetSelect<
    {
      id?: boolean;
      subGoalId?: boolean;
      title?: boolean;
      description?: boolean;
      background?: boolean;
      constraints?: boolean;
      position?: boolean;
      progress?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
      subGoal?: boolean | SubGoalDefaultArgs<ExtArgs>;
    },
    ExtArgs['result']['action']
  >;

  export type ActionSelectScalar = {
    id?: boolean;
    subGoalId?: boolean;
    title?: boolean;
    description?: boolean;
    background?: boolean;
    constraints?: boolean;
    position?: boolean;
    progress?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
  };

  export type ActionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    subGoal?: boolean | SubGoalDefaultArgs<ExtArgs>;
    tasks?: boolean | Action$tasksArgs<ExtArgs>;
    _count?: boolean | ActionCountOutputTypeDefaultArgs<ExtArgs>;
  };
  export type ActionIncludeCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    subGoal?: boolean | SubGoalDefaultArgs<ExtArgs>;
  };

  export type $ActionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: 'Action';
    objects: {
      subGoal: Prisma.$SubGoalPayload<ExtArgs>;
      tasks: Prisma.$TaskPayload<ExtArgs>[];
    };
    scalars: $Extensions.GetPayloadResult<
      {
        id: string;
        subGoalId: string;
        title: string;
        description: string | null;
        background: string | null;
        constraints: string | null;
        position: number;
        progress: number;
        createdAt: Date;
        updatedAt: Date;
      },
      ExtArgs['result']['action']
    >;
    composites: {};
  };

  type ActionGetPayload<S extends boolean | null | undefined | ActionDefaultArgs> =
    $Result.GetResult<Prisma.$ActionPayload, S>;

  type ActionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = Omit<
    ActionFindManyArgs,
    'select' | 'include' | 'distinct'
  > & {
    select?: ActionCountAggregateInputType | true;
  };

  export interface ActionDelegate<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Action']; meta: { name: 'Action' } };
    /**
     * Find zero or one Action that matches the filter.
     * @param {ActionFindUniqueArgs} args - Arguments to find a Action
     * @example
     * // Get one Action
     * const action = await prisma.action.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ActionFindUniqueArgs>(
      args: SelectSubset<T, ActionFindUniqueArgs<ExtArgs>>
    ): Prisma__ActionClient<
      $Result.GetResult<Prisma.$ActionPayload<ExtArgs>, T, 'findUnique'> | null,
      null,
      ExtArgs
    >;

    /**
     * Find one Action that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ActionFindUniqueOrThrowArgs} args - Arguments to find a Action
     * @example
     * // Get one Action
     * const action = await prisma.action.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ActionFindUniqueOrThrowArgs>(
      args: SelectSubset<T, ActionFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__ActionClient<
      $Result.GetResult<Prisma.$ActionPayload<ExtArgs>, T, 'findUniqueOrThrow'>,
      never,
      ExtArgs
    >;

    /**
     * Find the first Action that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActionFindFirstArgs} args - Arguments to find a Action
     * @example
     * // Get one Action
     * const action = await prisma.action.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ActionFindFirstArgs>(
      args?: SelectSubset<T, ActionFindFirstArgs<ExtArgs>>
    ): Prisma__ActionClient<
      $Result.GetResult<Prisma.$ActionPayload<ExtArgs>, T, 'findFirst'> | null,
      null,
      ExtArgs
    >;

    /**
     * Find the first Action that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActionFindFirstOrThrowArgs} args - Arguments to find a Action
     * @example
     * // Get one Action
     * const action = await prisma.action.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ActionFindFirstOrThrowArgs>(
      args?: SelectSubset<T, ActionFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__ActionClient<
      $Result.GetResult<Prisma.$ActionPayload<ExtArgs>, T, 'findFirstOrThrow'>,
      never,
      ExtArgs
    >;

    /**
     * Find zero or more Actions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Actions
     * const actions = await prisma.action.findMany()
     *
     * // Get first 10 Actions
     * const actions = await prisma.action.findMany({ take: 10 })
     *
     * // Only select the `id`
     * const actionWithIdOnly = await prisma.action.findMany({ select: { id: true } })
     *
     */
    findMany<T extends ActionFindManyArgs>(
      args?: SelectSubset<T, ActionFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ActionPayload<ExtArgs>, T, 'findMany'>>;

    /**
     * Create a Action.
     * @param {ActionCreateArgs} args - Arguments to create a Action.
     * @example
     * // Create one Action
     * const Action = await prisma.action.create({
     *   data: {
     *     // ... data to create a Action
     *   }
     * })
     *
     */
    create<T extends ActionCreateArgs>(
      args: SelectSubset<T, ActionCreateArgs<ExtArgs>>
    ): Prisma__ActionClient<
      $Result.GetResult<Prisma.$ActionPayload<ExtArgs>, T, 'create'>,
      never,
      ExtArgs
    >;

    /**
     * Create many Actions.
     * @param {ActionCreateManyArgs} args - Arguments to create many Actions.
     * @example
     * // Create many Actions
     * const action = await prisma.action.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     */
    createMany<T extends ActionCreateManyArgs>(
      args?: SelectSubset<T, ActionCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create many Actions and returns the data saved in the database.
     * @param {ActionCreateManyAndReturnArgs} args - Arguments to create many Actions.
     * @example
     * // Create many Actions
     * const action = await prisma.action.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Create many Actions and only return the `id`
     * const actionWithIdOnly = await prisma.action.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    createManyAndReturn<T extends ActionCreateManyAndReturnArgs>(
      args?: SelectSubset<T, ActionCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<
      $Result.GetResult<Prisma.$ActionPayload<ExtArgs>, T, 'createManyAndReturn'>
    >;

    /**
     * Delete a Action.
     * @param {ActionDeleteArgs} args - Arguments to delete one Action.
     * @example
     * // Delete one Action
     * const Action = await prisma.action.delete({
     *   where: {
     *     // ... filter to delete one Action
     *   }
     * })
     *
     */
    delete<T extends ActionDeleteArgs>(
      args: SelectSubset<T, ActionDeleteArgs<ExtArgs>>
    ): Prisma__ActionClient<
      $Result.GetResult<Prisma.$ActionPayload<ExtArgs>, T, 'delete'>,
      never,
      ExtArgs
    >;

    /**
     * Update one Action.
     * @param {ActionUpdateArgs} args - Arguments to update one Action.
     * @example
     * // Update one Action
     * const action = await prisma.action.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    update<T extends ActionUpdateArgs>(
      args: SelectSubset<T, ActionUpdateArgs<ExtArgs>>
    ): Prisma__ActionClient<
      $Result.GetResult<Prisma.$ActionPayload<ExtArgs>, T, 'update'>,
      never,
      ExtArgs
    >;

    /**
     * Delete zero or more Actions.
     * @param {ActionDeleteManyArgs} args - Arguments to filter Actions to delete.
     * @example
     * // Delete a few Actions
     * const { count } = await prisma.action.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     *
     */
    deleteMany<T extends ActionDeleteManyArgs>(
      args?: SelectSubset<T, ActionDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Update zero or more Actions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Actions
     * const action = await prisma.action.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    updateMany<T extends ActionUpdateManyArgs>(
      args: SelectSubset<T, ActionUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create or update one Action.
     * @param {ActionUpsertArgs} args - Arguments to update or create a Action.
     * @example
     * // Update or create a Action
     * const action = await prisma.action.upsert({
     *   create: {
     *     // ... data to create a Action
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Action we want to update
     *   }
     * })
     */
    upsert<T extends ActionUpsertArgs>(
      args: SelectSubset<T, ActionUpsertArgs<ExtArgs>>
    ): Prisma__ActionClient<
      $Result.GetResult<Prisma.$ActionPayload<ExtArgs>, T, 'upsert'>,
      never,
      ExtArgs
    >;

    /**
     * Count the number of Actions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActionCountArgs} args - Arguments to filter Actions to count.
     * @example
     * // Count the number of Actions
     * const count = await prisma.action.count({
     *   where: {
     *     // ... the filter for the Actions we want to count
     *   }
     * })
     **/
    count<T extends ActionCountArgs>(
      args?: Subset<T, ActionCountArgs>
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ActionCountAggregateOutputType>
        : number
    >;

    /**
     * Allows you to perform aggregations operations on a Action.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
     **/
    aggregate<T extends ActionAggregateArgs>(
      args: Subset<T, ActionAggregateArgs>
    ): Prisma.PrismaPromise<GetActionAggregateType<T>>;

    /**
     * Group by Action.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     *
     **/
    groupBy<
      T extends ActionGroupByArgs,
      HasSelectOrTake extends Or<Extends<'skip', Keys<T>>, Extends<'take', Keys<T>>>,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ActionGroupByArgs['orderBy'] }
        : { orderBy?: ActionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
        ? `Error: "by" must not be empty.`
        : HavingValid extends False
          ? {
              [P in HavingFields]: P extends ByFields
                ? never
                : P extends string
                  ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
                  : [Error, 'Field ', P, ` in "having" needs to be provided in "by"`];
            }[HavingFields]
          : 'take' extends Keys<T>
            ? 'orderBy' extends Keys<T>
              ? ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields]
              : 'Error: If you provide "take", you also need to provide "orderBy"'
            : 'skip' extends Keys<T>
              ? 'orderBy' extends Keys<T>
                ? ByValid extends True
                  ? {}
                  : {
                      [P in OrderFields]: P extends ByFields
                        ? never
                        : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                    }[OrderFields]
                : 'Error: If you provide "skip", you also need to provide "orderBy"'
              : ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields],
    >(
      args: SubsetIntersection<T, ActionGroupByArgs, OrderByArg> & InputErrors
    ): {} extends InputErrors ? GetActionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    /**
     * Fields of the Action model
     */
    readonly fields: ActionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Action.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ActionClient<
    T,
    Null = never,
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';
    subGoal<T extends SubGoalDefaultArgs<ExtArgs> = {}>(
      args?: Subset<T, SubGoalDefaultArgs<ExtArgs>>
    ): Prisma__SubGoalClient<
      $Result.GetResult<Prisma.$SubGoalPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null,
      Null,
      ExtArgs
    >;
    tasks<T extends Action$tasksArgs<ExtArgs> = {}>(
      args?: Subset<T, Action$tasksArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, 'findMany'> | Null>;
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(
      onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
    ): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }

  /**
   * Fields of the Action model
   */
  interface ActionFieldRefs {
    readonly id: FieldRef<'Action', 'String'>;
    readonly subGoalId: FieldRef<'Action', 'String'>;
    readonly title: FieldRef<'Action', 'String'>;
    readonly description: FieldRef<'Action', 'String'>;
    readonly background: FieldRef<'Action', 'String'>;
    readonly constraints: FieldRef<'Action', 'String'>;
    readonly position: FieldRef<'Action', 'Int'>;
    readonly progress: FieldRef<'Action', 'Int'>;
    readonly createdAt: FieldRef<'Action', 'DateTime'>;
    readonly updatedAt: FieldRef<'Action', 'DateTime'>;
  }

  // Custom InputTypes
  /**
   * Action findUnique
   */
  export type ActionFindUniqueArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Action
     */
    select?: ActionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ActionInclude<ExtArgs> | null;
    /**
     * Filter, which Action to fetch.
     */
    where: ActionWhereUniqueInput;
  };

  /**
   * Action findUniqueOrThrow
   */
  export type ActionFindUniqueOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Action
     */
    select?: ActionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ActionInclude<ExtArgs> | null;
    /**
     * Filter, which Action to fetch.
     */
    where: ActionWhereUniqueInput;
  };

  /**
   * Action findFirst
   */
  export type ActionFindFirstArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Action
     */
    select?: ActionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ActionInclude<ExtArgs> | null;
    /**
     * Filter, which Action to fetch.
     */
    where?: ActionWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Actions to fetch.
     */
    orderBy?: ActionOrderByWithRelationInput | ActionOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Actions.
     */
    cursor?: ActionWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Actions from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Actions.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Actions.
     */
    distinct?: ActionScalarFieldEnum | ActionScalarFieldEnum[];
  };

  /**
   * Action findFirstOrThrow
   */
  export type ActionFindFirstOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Action
     */
    select?: ActionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ActionInclude<ExtArgs> | null;
    /**
     * Filter, which Action to fetch.
     */
    where?: ActionWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Actions to fetch.
     */
    orderBy?: ActionOrderByWithRelationInput | ActionOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Actions.
     */
    cursor?: ActionWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Actions from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Actions.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Actions.
     */
    distinct?: ActionScalarFieldEnum | ActionScalarFieldEnum[];
  };

  /**
   * Action findMany
   */
  export type ActionFindManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Action
     */
    select?: ActionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ActionInclude<ExtArgs> | null;
    /**
     * Filter, which Actions to fetch.
     */
    where?: ActionWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Actions to fetch.
     */
    orderBy?: ActionOrderByWithRelationInput | ActionOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for listing Actions.
     */
    cursor?: ActionWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Actions from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Actions.
     */
    skip?: number;
    distinct?: ActionScalarFieldEnum | ActionScalarFieldEnum[];
  };

  /**
   * Action create
   */
  export type ActionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    {
      /**
       * Select specific fields to fetch from the Action
       */
      select?: ActionSelect<ExtArgs> | null;
      /**
       * Choose, which related nodes to fetch as well
       */
      include?: ActionInclude<ExtArgs> | null;
      /**
       * The data needed to create a Action.
       */
      data: XOR<ActionCreateInput, ActionUncheckedCreateInput>;
    };

  /**
   * Action createMany
   */
  export type ActionCreateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to create many Actions.
     */
    data: ActionCreateManyInput | ActionCreateManyInput[];
    skipDuplicates?: boolean;
  };

  /**
   * Action createManyAndReturn
   */
  export type ActionCreateManyAndReturnArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Action
     */
    select?: ActionSelectCreateManyAndReturn<ExtArgs> | null;
    /**
     * The data used to create many Actions.
     */
    data: ActionCreateManyInput | ActionCreateManyInput[];
    skipDuplicates?: boolean;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ActionIncludeCreateManyAndReturn<ExtArgs> | null;
  };

  /**
   * Action update
   */
  export type ActionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    {
      /**
       * Select specific fields to fetch from the Action
       */
      select?: ActionSelect<ExtArgs> | null;
      /**
       * Choose, which related nodes to fetch as well
       */
      include?: ActionInclude<ExtArgs> | null;
      /**
       * The data needed to update a Action.
       */
      data: XOR<ActionUpdateInput, ActionUncheckedUpdateInput>;
      /**
       * Choose, which Action to update.
       */
      where: ActionWhereUniqueInput;
    };

  /**
   * Action updateMany
   */
  export type ActionUpdateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to update Actions.
     */
    data: XOR<ActionUpdateManyMutationInput, ActionUncheckedUpdateManyInput>;
    /**
     * Filter which Actions to update
     */
    where?: ActionWhereInput;
  };

  /**
   * Action upsert
   */
  export type ActionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    {
      /**
       * Select specific fields to fetch from the Action
       */
      select?: ActionSelect<ExtArgs> | null;
      /**
       * Choose, which related nodes to fetch as well
       */
      include?: ActionInclude<ExtArgs> | null;
      /**
       * The filter to search for the Action to update in case it exists.
       */
      where: ActionWhereUniqueInput;
      /**
       * In case the Action found by the `where` argument doesn't exist, create a new Action with this data.
       */
      create: XOR<ActionCreateInput, ActionUncheckedCreateInput>;
      /**
       * In case the Action was found with the provided `where` argument, update it with this data.
       */
      update: XOR<ActionUpdateInput, ActionUncheckedUpdateInput>;
    };

  /**
   * Action delete
   */
  export type ActionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    {
      /**
       * Select specific fields to fetch from the Action
       */
      select?: ActionSelect<ExtArgs> | null;
      /**
       * Choose, which related nodes to fetch as well
       */
      include?: ActionInclude<ExtArgs> | null;
      /**
       * Filter which Action to delete.
       */
      where: ActionWhereUniqueInput;
    };

  /**
   * Action deleteMany
   */
  export type ActionDeleteManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which Actions to delete
     */
    where?: ActionWhereInput;
  };

  /**
   * Action.tasks
   */
  export type Action$tasksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    {
      /**
       * Select specific fields to fetch from the Task
       */
      select?: TaskSelect<ExtArgs> | null;
      /**
       * Choose, which related nodes to fetch as well
       */
      include?: TaskInclude<ExtArgs> | null;
      where?: TaskWhereInput;
      orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[];
      cursor?: TaskWhereUniqueInput;
      take?: number;
      skip?: number;
      distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[];
    };

  /**
   * Action without action
   */
  export type ActionDefaultArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Action
     */
    select?: ActionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ActionInclude<ExtArgs> | null;
  };

  /**
   * Model Task
   */

  export type AggregateTask = {
    _count: TaskCountAggregateOutputType | null;
    _avg: TaskAvgAggregateOutputType | null;
    _sum: TaskSumAggregateOutputType | null;
    _min: TaskMinAggregateOutputType | null;
    _max: TaskMaxAggregateOutputType | null;
  };

  export type TaskAvgAggregateOutputType = {
    estimatedTime: number | null;
  };

  export type TaskSumAggregateOutputType = {
    estimatedTime: number | null;
  };

  export type TaskMinAggregateOutputType = {
    id: string | null;
    actionId: string | null;
    title: string | null;
    description: string | null;
    type: $Enums.TaskType | null;
    status: $Enums.TaskStatus | null;
    estimatedTime: number | null;
    completedAt: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type TaskMaxAggregateOutputType = {
    id: string | null;
    actionId: string | null;
    title: string | null;
    description: string | null;
    type: $Enums.TaskType | null;
    status: $Enums.TaskStatus | null;
    estimatedTime: number | null;
    completedAt: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type TaskCountAggregateOutputType = {
    id: number;
    actionId: number;
    title: number;
    description: number;
    type: number;
    status: number;
    estimatedTime: number;
    completedAt: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
  };

  export type TaskAvgAggregateInputType = {
    estimatedTime?: true;
  };

  export type TaskSumAggregateInputType = {
    estimatedTime?: true;
  };

  export type TaskMinAggregateInputType = {
    id?: true;
    actionId?: true;
    title?: true;
    description?: true;
    type?: true;
    status?: true;
    estimatedTime?: true;
    completedAt?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type TaskMaxAggregateInputType = {
    id?: true;
    actionId?: true;
    title?: true;
    description?: true;
    type?: true;
    status?: true;
    estimatedTime?: true;
    completedAt?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type TaskCountAggregateInputType = {
    id?: true;
    actionId?: true;
    title?: true;
    description?: true;
    type?: true;
    status?: true;
    estimatedTime?: true;
    completedAt?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
  };

  export type TaskAggregateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which Task to aggregate.
     */
    where?: TaskWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the start position
     */
    cursor?: TaskWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Tasks.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Count returned Tasks
     **/
    _count?: true | TaskCountAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to average
     **/
    _avg?: TaskAvgAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to sum
     **/
    _sum?: TaskSumAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the minimum value
     **/
    _min?: TaskMinAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the maximum value
     **/
    _max?: TaskMaxAggregateInputType;
  };

  export type GetTaskAggregateType<T extends TaskAggregateArgs> = {
    [P in keyof T & keyof AggregateTask]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTask[P]>
      : GetScalarType<T[P], AggregateTask[P]>;
  };

  export type TaskGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    {
      where?: TaskWhereInput;
      orderBy?: TaskOrderByWithAggregationInput | TaskOrderByWithAggregationInput[];
      by: TaskScalarFieldEnum[] | TaskScalarFieldEnum;
      having?: TaskScalarWhereWithAggregatesInput;
      take?: number;
      skip?: number;
      _count?: TaskCountAggregateInputType | true;
      _avg?: TaskAvgAggregateInputType;
      _sum?: TaskSumAggregateInputType;
      _min?: TaskMinAggregateInputType;
      _max?: TaskMaxAggregateInputType;
    };

  export type TaskGroupByOutputType = {
    id: string;
    actionId: string;
    title: string;
    description: string | null;
    type: $Enums.TaskType;
    status: $Enums.TaskStatus;
    estimatedTime: number | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    _count: TaskCountAggregateOutputType | null;
    _avg: TaskAvgAggregateOutputType | null;
    _sum: TaskSumAggregateOutputType | null;
    _min: TaskMinAggregateOutputType | null;
    _max: TaskMaxAggregateOutputType | null;
  };

  type GetTaskGroupByPayload<T extends TaskGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TaskGroupByOutputType, T['by']> & {
        [P in keyof T & keyof TaskGroupByOutputType]: P extends '_count'
          ? T[P] extends boolean
            ? number
            : GetScalarType<T[P], TaskGroupByOutputType[P]>
          : GetScalarType<T[P], TaskGroupByOutputType[P]>;
      }
    >
  >;

  export type TaskSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    $Extensions.GetSelect<
      {
        id?: boolean;
        actionId?: boolean;
        title?: boolean;
        description?: boolean;
        type?: boolean;
        status?: boolean;
        estimatedTime?: boolean;
        completedAt?: boolean;
        createdAt?: boolean;
        updatedAt?: boolean;
        action?: boolean | ActionDefaultArgs<ExtArgs>;
        reminders?: boolean | Task$remindersArgs<ExtArgs>;
        reflections?: boolean | Task$reflectionsArgs<ExtArgs>;
        _count?: boolean | TaskCountOutputTypeDefaultArgs<ExtArgs>;
      },
      ExtArgs['result']['task']
    >;

  export type TaskSelectCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetSelect<
    {
      id?: boolean;
      actionId?: boolean;
      title?: boolean;
      description?: boolean;
      type?: boolean;
      status?: boolean;
      estimatedTime?: boolean;
      completedAt?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
      action?: boolean | ActionDefaultArgs<ExtArgs>;
    },
    ExtArgs['result']['task']
  >;

  export type TaskSelectScalar = {
    id?: boolean;
    actionId?: boolean;
    title?: boolean;
    description?: boolean;
    type?: boolean;
    status?: boolean;
    estimatedTime?: boolean;
    completedAt?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
  };

  export type TaskInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    action?: boolean | ActionDefaultArgs<ExtArgs>;
    reminders?: boolean | Task$remindersArgs<ExtArgs>;
    reflections?: boolean | Task$reflectionsArgs<ExtArgs>;
    _count?: boolean | TaskCountOutputTypeDefaultArgs<ExtArgs>;
  };
  export type TaskIncludeCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    action?: boolean | ActionDefaultArgs<ExtArgs>;
  };

  export type $TaskPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: 'Task';
    objects: {
      action: Prisma.$ActionPayload<ExtArgs>;
      reminders: Prisma.$TaskReminderPayload<ExtArgs>[];
      reflections: Prisma.$ReflectionPayload<ExtArgs>[];
    };
    scalars: $Extensions.GetPayloadResult<
      {
        id: string;
        actionId: string;
        title: string;
        description: string | null;
        type: $Enums.TaskType;
        status: $Enums.TaskStatus;
        estimatedTime: number | null;
        completedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      },
      ExtArgs['result']['task']
    >;
    composites: {};
  };

  type TaskGetPayload<S extends boolean | null | undefined | TaskDefaultArgs> = $Result.GetResult<
    Prisma.$TaskPayload,
    S
  >;

  type TaskCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = Omit<
    TaskFindManyArgs,
    'select' | 'include' | 'distinct'
  > & {
    select?: TaskCountAggregateInputType | true;
  };

  export interface TaskDelegate<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Task']; meta: { name: 'Task' } };
    /**
     * Find zero or one Task that matches the filter.
     * @param {TaskFindUniqueArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TaskFindUniqueArgs>(
      args: SelectSubset<T, TaskFindUniqueArgs<ExtArgs>>
    ): Prisma__TaskClient<
      $Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, 'findUnique'> | null,
      null,
      ExtArgs
    >;

    /**
     * Find one Task that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TaskFindUniqueOrThrowArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TaskFindUniqueOrThrowArgs>(
      args: SelectSubset<T, TaskFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__TaskClient<
      $Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, 'findUniqueOrThrow'>,
      never,
      ExtArgs
    >;

    /**
     * Find the first Task that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskFindFirstArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TaskFindFirstArgs>(
      args?: SelectSubset<T, TaskFindFirstArgs<ExtArgs>>
    ): Prisma__TaskClient<
      $Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, 'findFirst'> | null,
      null,
      ExtArgs
    >;

    /**
     * Find the first Task that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskFindFirstOrThrowArgs} args - Arguments to find a Task
     * @example
     * // Get one Task
     * const task = await prisma.task.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TaskFindFirstOrThrowArgs>(
      args?: SelectSubset<T, TaskFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__TaskClient<
      $Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, 'findFirstOrThrow'>,
      never,
      ExtArgs
    >;

    /**
     * Find zero or more Tasks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Tasks
     * const tasks = await prisma.task.findMany()
     *
     * // Get first 10 Tasks
     * const tasks = await prisma.task.findMany({ take: 10 })
     *
     * // Only select the `id`
     * const taskWithIdOnly = await prisma.task.findMany({ select: { id: true } })
     *
     */
    findMany<T extends TaskFindManyArgs>(
      args?: SelectSubset<T, TaskFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, 'findMany'>>;

    /**
     * Create a Task.
     * @param {TaskCreateArgs} args - Arguments to create a Task.
     * @example
     * // Create one Task
     * const Task = await prisma.task.create({
     *   data: {
     *     // ... data to create a Task
     *   }
     * })
     *
     */
    create<T extends TaskCreateArgs>(
      args: SelectSubset<T, TaskCreateArgs<ExtArgs>>
    ): Prisma__TaskClient<
      $Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, 'create'>,
      never,
      ExtArgs
    >;

    /**
     * Create many Tasks.
     * @param {TaskCreateManyArgs} args - Arguments to create many Tasks.
     * @example
     * // Create many Tasks
     * const task = await prisma.task.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     */
    createMany<T extends TaskCreateManyArgs>(
      args?: SelectSubset<T, TaskCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create many Tasks and returns the data saved in the database.
     * @param {TaskCreateManyAndReturnArgs} args - Arguments to create many Tasks.
     * @example
     * // Create many Tasks
     * const task = await prisma.task.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Create many Tasks and only return the `id`
     * const taskWithIdOnly = await prisma.task.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    createManyAndReturn<T extends TaskCreateManyAndReturnArgs>(
      args?: SelectSubset<T, TaskCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<
      $Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, 'createManyAndReturn'>
    >;

    /**
     * Delete a Task.
     * @param {TaskDeleteArgs} args - Arguments to delete one Task.
     * @example
     * // Delete one Task
     * const Task = await prisma.task.delete({
     *   where: {
     *     // ... filter to delete one Task
     *   }
     * })
     *
     */
    delete<T extends TaskDeleteArgs>(
      args: SelectSubset<T, TaskDeleteArgs<ExtArgs>>
    ): Prisma__TaskClient<
      $Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, 'delete'>,
      never,
      ExtArgs
    >;

    /**
     * Update one Task.
     * @param {TaskUpdateArgs} args - Arguments to update one Task.
     * @example
     * // Update one Task
     * const task = await prisma.task.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    update<T extends TaskUpdateArgs>(
      args: SelectSubset<T, TaskUpdateArgs<ExtArgs>>
    ): Prisma__TaskClient<
      $Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, 'update'>,
      never,
      ExtArgs
    >;

    /**
     * Delete zero or more Tasks.
     * @param {TaskDeleteManyArgs} args - Arguments to filter Tasks to delete.
     * @example
     * // Delete a few Tasks
     * const { count } = await prisma.task.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     *
     */
    deleteMany<T extends TaskDeleteManyArgs>(
      args?: SelectSubset<T, TaskDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Update zero or more Tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Tasks
     * const task = await prisma.task.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    updateMany<T extends TaskUpdateManyArgs>(
      args: SelectSubset<T, TaskUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create or update one Task.
     * @param {TaskUpsertArgs} args - Arguments to update or create a Task.
     * @example
     * // Update or create a Task
     * const task = await prisma.task.upsert({
     *   create: {
     *     // ... data to create a Task
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Task we want to update
     *   }
     * })
     */
    upsert<T extends TaskUpsertArgs>(
      args: SelectSubset<T, TaskUpsertArgs<ExtArgs>>
    ): Prisma__TaskClient<
      $Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, 'upsert'>,
      never,
      ExtArgs
    >;

    /**
     * Count the number of Tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskCountArgs} args - Arguments to filter Tasks to count.
     * @example
     * // Count the number of Tasks
     * const count = await prisma.task.count({
     *   where: {
     *     // ... the filter for the Tasks we want to count
     *   }
     * })
     **/
    count<T extends TaskCountArgs>(
      args?: Subset<T, TaskCountArgs>
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TaskCountAggregateOutputType>
        : number
    >;

    /**
     * Allows you to perform aggregations operations on a Task.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
     **/
    aggregate<T extends TaskAggregateArgs>(
      args: Subset<T, TaskAggregateArgs>
    ): Prisma.PrismaPromise<GetTaskAggregateType<T>>;

    /**
     * Group by Task.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     *
     **/
    groupBy<
      T extends TaskGroupByArgs,
      HasSelectOrTake extends Or<Extends<'skip', Keys<T>>, Extends<'take', Keys<T>>>,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TaskGroupByArgs['orderBy'] }
        : { orderBy?: TaskGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
        ? `Error: "by" must not be empty.`
        : HavingValid extends False
          ? {
              [P in HavingFields]: P extends ByFields
                ? never
                : P extends string
                  ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
                  : [Error, 'Field ', P, ` in "having" needs to be provided in "by"`];
            }[HavingFields]
          : 'take' extends Keys<T>
            ? 'orderBy' extends Keys<T>
              ? ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields]
              : 'Error: If you provide "take", you also need to provide "orderBy"'
            : 'skip' extends Keys<T>
              ? 'orderBy' extends Keys<T>
                ? ByValid extends True
                  ? {}
                  : {
                      [P in OrderFields]: P extends ByFields
                        ? never
                        : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                    }[OrderFields]
                : 'Error: If you provide "skip", you also need to provide "orderBy"'
              : ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields],
    >(
      args: SubsetIntersection<T, TaskGroupByArgs, OrderByArg> & InputErrors
    ): {} extends InputErrors ? GetTaskGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    /**
     * Fields of the Task model
     */
    readonly fields: TaskFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Task.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TaskClient<
    T,
    Null = never,
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';
    action<T extends ActionDefaultArgs<ExtArgs> = {}>(
      args?: Subset<T, ActionDefaultArgs<ExtArgs>>
    ): Prisma__ActionClient<
      $Result.GetResult<Prisma.$ActionPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null,
      Null,
      ExtArgs
    >;
    reminders<T extends Task$remindersArgs<ExtArgs> = {}>(
      args?: Subset<T, Task$remindersArgs<ExtArgs>>
    ): Prisma.PrismaPromise<
      $Result.GetResult<Prisma.$TaskReminderPayload<ExtArgs>, T, 'findMany'> | Null
    >;
    reflections<T extends Task$reflectionsArgs<ExtArgs> = {}>(
      args?: Subset<T, Task$reflectionsArgs<ExtArgs>>
    ): Prisma.PrismaPromise<
      $Result.GetResult<Prisma.$ReflectionPayload<ExtArgs>, T, 'findMany'> | Null
    >;
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(
      onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
    ): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }

  /**
   * Fields of the Task model
   */
  interface TaskFieldRefs {
    readonly id: FieldRef<'Task', 'String'>;
    readonly actionId: FieldRef<'Task', 'String'>;
    readonly title: FieldRef<'Task', 'String'>;
    readonly description: FieldRef<'Task', 'String'>;
    readonly type: FieldRef<'Task', 'TaskType'>;
    readonly status: FieldRef<'Task', 'TaskStatus'>;
    readonly estimatedTime: FieldRef<'Task', 'Int'>;
    readonly completedAt: FieldRef<'Task', 'DateTime'>;
    readonly createdAt: FieldRef<'Task', 'DateTime'>;
    readonly updatedAt: FieldRef<'Task', 'DateTime'>;
  }

  // Custom InputTypes
  /**
   * Task findUnique
   */
  export type TaskFindUniqueArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null;
    /**
     * Filter, which Task to fetch.
     */
    where: TaskWhereUniqueInput;
  };

  /**
   * Task findUniqueOrThrow
   */
  export type TaskFindUniqueOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null;
    /**
     * Filter, which Task to fetch.
     */
    where: TaskWhereUniqueInput;
  };

  /**
   * Task findFirst
   */
  export type TaskFindFirstArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null;
    /**
     * Filter, which Task to fetch.
     */
    where?: TaskWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Tasks.
     */
    cursor?: TaskWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Tasks.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Tasks.
     */
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[];
  };

  /**
   * Task findFirstOrThrow
   */
  export type TaskFindFirstOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null;
    /**
     * Filter, which Task to fetch.
     */
    where?: TaskWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Tasks to fetch.
     */
    orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Tasks.
     */
    cursor?: TaskWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Tasks from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Tasks.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Tasks.
     */
    distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[];
  };

  /**
   * Task findMany
   */
  export type TaskFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    {
      /**
       * Select specific fields to fetch from the Task
       */
      select?: TaskSelect<ExtArgs> | null;
      /**
       * Choose, which related nodes to fetch as well
       */
      include?: TaskInclude<ExtArgs> | null;
      /**
       * Filter, which Tasks to fetch.
       */
      where?: TaskWhereInput;
      /**
       * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
       *
       * Determine the order of Tasks to fetch.
       */
      orderBy?: TaskOrderByWithRelationInput | TaskOrderByWithRelationInput[];
      /**
       * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
       *
       * Sets the position for listing Tasks.
       */
      cursor?: TaskWhereUniqueInput;
      /**
       * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
       *
       * Take `±n` Tasks from the position of the cursor.
       */
      take?: number;
      /**
       * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
       *
       * Skip the first `n` Tasks.
       */
      skip?: number;
      distinct?: TaskScalarFieldEnum | TaskScalarFieldEnum[];
    };

  /**
   * Task create
   */
  export type TaskCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null;
    /**
     * The data needed to create a Task.
     */
    data: XOR<TaskCreateInput, TaskUncheckedCreateInput>;
  };

  /**
   * Task createMany
   */
  export type TaskCreateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to create many Tasks.
     */
    data: TaskCreateManyInput | TaskCreateManyInput[];
    skipDuplicates?: boolean;
  };

  /**
   * Task createManyAndReturn
   */
  export type TaskCreateManyAndReturnArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelectCreateManyAndReturn<ExtArgs> | null;
    /**
     * The data used to create many Tasks.
     */
    data: TaskCreateManyInput | TaskCreateManyInput[];
    skipDuplicates?: boolean;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskIncludeCreateManyAndReturn<ExtArgs> | null;
  };

  /**
   * Task update
   */
  export type TaskUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null;
    /**
     * The data needed to update a Task.
     */
    data: XOR<TaskUpdateInput, TaskUncheckedUpdateInput>;
    /**
     * Choose, which Task to update.
     */
    where: TaskWhereUniqueInput;
  };

  /**
   * Task updateMany
   */
  export type TaskUpdateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to update Tasks.
     */
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyInput>;
    /**
     * Filter which Tasks to update
     */
    where?: TaskWhereInput;
  };

  /**
   * Task upsert
   */
  export type TaskUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null;
    /**
     * The filter to search for the Task to update in case it exists.
     */
    where: TaskWhereUniqueInput;
    /**
     * In case the Task found by the `where` argument doesn't exist, create a new Task with this data.
     */
    create: XOR<TaskCreateInput, TaskUncheckedCreateInput>;
    /**
     * In case the Task was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TaskUpdateInput, TaskUncheckedUpdateInput>;
  };

  /**
   * Task delete
   */
  export type TaskDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Task
     */
    select?: TaskSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskInclude<ExtArgs> | null;
    /**
     * Filter which Task to delete.
     */
    where: TaskWhereUniqueInput;
  };

  /**
   * Task deleteMany
   */
  export type TaskDeleteManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which Tasks to delete
     */
    where?: TaskWhereInput;
  };

  /**
   * Task.reminders
   */
  export type Task$remindersArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the TaskReminder
     */
    select?: TaskReminderSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskReminderInclude<ExtArgs> | null;
    where?: TaskReminderWhereInput;
    orderBy?: TaskReminderOrderByWithRelationInput | TaskReminderOrderByWithRelationInput[];
    cursor?: TaskReminderWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: TaskReminderScalarFieldEnum | TaskReminderScalarFieldEnum[];
  };

  /**
   * Task.reflections
   */
  export type Task$reflectionsArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Reflection
     */
    select?: ReflectionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReflectionInclude<ExtArgs> | null;
    where?: ReflectionWhereInput;
    orderBy?: ReflectionOrderByWithRelationInput | ReflectionOrderByWithRelationInput[];
    cursor?: ReflectionWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: ReflectionScalarFieldEnum | ReflectionScalarFieldEnum[];
  };

  /**
   * Task without action
   */
  export type TaskDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    {
      /**
       * Select specific fields to fetch from the Task
       */
      select?: TaskSelect<ExtArgs> | null;
      /**
       * Choose, which related nodes to fetch as well
       */
      include?: TaskInclude<ExtArgs> | null;
    };

  /**
   * Model TaskReminder
   */

  export type AggregateTaskReminder = {
    _count: TaskReminderCountAggregateOutputType | null;
    _min: TaskReminderMinAggregateOutputType | null;
    _max: TaskReminderMaxAggregateOutputType | null;
  };

  export type TaskReminderMinAggregateOutputType = {
    id: string | null;
    taskId: string | null;
    reminderAt: Date | null;
    message: string | null;
    status: $Enums.ReminderStatus | null;
    sentAt: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type TaskReminderMaxAggregateOutputType = {
    id: string | null;
    taskId: string | null;
    reminderAt: Date | null;
    message: string | null;
    status: $Enums.ReminderStatus | null;
    sentAt: Date | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type TaskReminderCountAggregateOutputType = {
    id: number;
    taskId: number;
    reminderAt: number;
    message: number;
    status: number;
    sentAt: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
  };

  export type TaskReminderMinAggregateInputType = {
    id?: true;
    taskId?: true;
    reminderAt?: true;
    message?: true;
    status?: true;
    sentAt?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type TaskReminderMaxAggregateInputType = {
    id?: true;
    taskId?: true;
    reminderAt?: true;
    message?: true;
    status?: true;
    sentAt?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type TaskReminderCountAggregateInputType = {
    id?: true;
    taskId?: true;
    reminderAt?: true;
    message?: true;
    status?: true;
    sentAt?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
  };

  export type TaskReminderAggregateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which TaskReminder to aggregate.
     */
    where?: TaskReminderWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of TaskReminders to fetch.
     */
    orderBy?: TaskReminderOrderByWithRelationInput | TaskReminderOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the start position
     */
    cursor?: TaskReminderWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` TaskReminders from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` TaskReminders.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Count returned TaskReminders
     **/
    _count?: true | TaskReminderCountAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the minimum value
     **/
    _min?: TaskReminderMinAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the maximum value
     **/
    _max?: TaskReminderMaxAggregateInputType;
  };

  export type GetTaskReminderAggregateType<T extends TaskReminderAggregateArgs> = {
    [P in keyof T & keyof AggregateTaskReminder]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTaskReminder[P]>
      : GetScalarType<T[P], AggregateTaskReminder[P]>;
  };

  export type TaskReminderGroupByArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    where?: TaskReminderWhereInput;
    orderBy?: TaskReminderOrderByWithAggregationInput | TaskReminderOrderByWithAggregationInput[];
    by: TaskReminderScalarFieldEnum[] | TaskReminderScalarFieldEnum;
    having?: TaskReminderScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: TaskReminderCountAggregateInputType | true;
    _min?: TaskReminderMinAggregateInputType;
    _max?: TaskReminderMaxAggregateInputType;
  };

  export type TaskReminderGroupByOutputType = {
    id: string;
    taskId: string;
    reminderAt: Date;
    message: string | null;
    status: $Enums.ReminderStatus;
    sentAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    _count: TaskReminderCountAggregateOutputType | null;
    _min: TaskReminderMinAggregateOutputType | null;
    _max: TaskReminderMaxAggregateOutputType | null;
  };

  type GetTaskReminderGroupByPayload<T extends TaskReminderGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TaskReminderGroupByOutputType, T['by']> & {
        [P in keyof T & keyof TaskReminderGroupByOutputType]: P extends '_count'
          ? T[P] extends boolean
            ? number
            : GetScalarType<T[P], TaskReminderGroupByOutputType[P]>
          : GetScalarType<T[P], TaskReminderGroupByOutputType[P]>;
      }
    >
  >;

  export type TaskReminderSelect<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetSelect<
    {
      id?: boolean;
      taskId?: boolean;
      reminderAt?: boolean;
      message?: boolean;
      status?: boolean;
      sentAt?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
      task?: boolean | TaskDefaultArgs<ExtArgs>;
    },
    ExtArgs['result']['taskReminder']
  >;

  export type TaskReminderSelectCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetSelect<
    {
      id?: boolean;
      taskId?: boolean;
      reminderAt?: boolean;
      message?: boolean;
      status?: boolean;
      sentAt?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
      task?: boolean | TaskDefaultArgs<ExtArgs>;
    },
    ExtArgs['result']['taskReminder']
  >;

  export type TaskReminderSelectScalar = {
    id?: boolean;
    taskId?: boolean;
    reminderAt?: boolean;
    message?: boolean;
    status?: boolean;
    sentAt?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
  };

  export type TaskReminderInclude<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    task?: boolean | TaskDefaultArgs<ExtArgs>;
  };
  export type TaskReminderIncludeCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    task?: boolean | TaskDefaultArgs<ExtArgs>;
  };

  export type $TaskReminderPayload<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    name: 'TaskReminder';
    objects: {
      task: Prisma.$TaskPayload<ExtArgs>;
    };
    scalars: $Extensions.GetPayloadResult<
      {
        id: string;
        taskId: string;
        reminderAt: Date;
        message: string | null;
        status: $Enums.ReminderStatus;
        sentAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      },
      ExtArgs['result']['taskReminder']
    >;
    composites: {};
  };

  type TaskReminderGetPayload<S extends boolean | null | undefined | TaskReminderDefaultArgs> =
    $Result.GetResult<Prisma.$TaskReminderPayload, S>;

  type TaskReminderCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TaskReminderFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: TaskReminderCountAggregateInputType | true;
    };

  export interface TaskReminderDelegate<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > {
    [K: symbol]: {
      types: Prisma.TypeMap<ExtArgs>['model']['TaskReminder'];
      meta: { name: 'TaskReminder' };
    };
    /**
     * Find zero or one TaskReminder that matches the filter.
     * @param {TaskReminderFindUniqueArgs} args - Arguments to find a TaskReminder
     * @example
     * // Get one TaskReminder
     * const taskReminder = await prisma.taskReminder.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TaskReminderFindUniqueArgs>(
      args: SelectSubset<T, TaskReminderFindUniqueArgs<ExtArgs>>
    ): Prisma__TaskReminderClient<
      $Result.GetResult<Prisma.$TaskReminderPayload<ExtArgs>, T, 'findUnique'> | null,
      null,
      ExtArgs
    >;

    /**
     * Find one TaskReminder that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TaskReminderFindUniqueOrThrowArgs} args - Arguments to find a TaskReminder
     * @example
     * // Get one TaskReminder
     * const taskReminder = await prisma.taskReminder.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TaskReminderFindUniqueOrThrowArgs>(
      args: SelectSubset<T, TaskReminderFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__TaskReminderClient<
      $Result.GetResult<Prisma.$TaskReminderPayload<ExtArgs>, T, 'findUniqueOrThrow'>,
      never,
      ExtArgs
    >;

    /**
     * Find the first TaskReminder that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskReminderFindFirstArgs} args - Arguments to find a TaskReminder
     * @example
     * // Get one TaskReminder
     * const taskReminder = await prisma.taskReminder.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TaskReminderFindFirstArgs>(
      args?: SelectSubset<T, TaskReminderFindFirstArgs<ExtArgs>>
    ): Prisma__TaskReminderClient<
      $Result.GetResult<Prisma.$TaskReminderPayload<ExtArgs>, T, 'findFirst'> | null,
      null,
      ExtArgs
    >;

    /**
     * Find the first TaskReminder that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskReminderFindFirstOrThrowArgs} args - Arguments to find a TaskReminder
     * @example
     * // Get one TaskReminder
     * const taskReminder = await prisma.taskReminder.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TaskReminderFindFirstOrThrowArgs>(
      args?: SelectSubset<T, TaskReminderFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__TaskReminderClient<
      $Result.GetResult<Prisma.$TaskReminderPayload<ExtArgs>, T, 'findFirstOrThrow'>,
      never,
      ExtArgs
    >;

    /**
     * Find zero or more TaskReminders that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskReminderFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TaskReminders
     * const taskReminders = await prisma.taskReminder.findMany()
     *
     * // Get first 10 TaskReminders
     * const taskReminders = await prisma.taskReminder.findMany({ take: 10 })
     *
     * // Only select the `id`
     * const taskReminderWithIdOnly = await prisma.taskReminder.findMany({ select: { id: true } })
     *
     */
    findMany<T extends TaskReminderFindManyArgs>(
      args?: SelectSubset<T, TaskReminderFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TaskReminderPayload<ExtArgs>, T, 'findMany'>>;

    /**
     * Create a TaskReminder.
     * @param {TaskReminderCreateArgs} args - Arguments to create a TaskReminder.
     * @example
     * // Create one TaskReminder
     * const TaskReminder = await prisma.taskReminder.create({
     *   data: {
     *     // ... data to create a TaskReminder
     *   }
     * })
     *
     */
    create<T extends TaskReminderCreateArgs>(
      args: SelectSubset<T, TaskReminderCreateArgs<ExtArgs>>
    ): Prisma__TaskReminderClient<
      $Result.GetResult<Prisma.$TaskReminderPayload<ExtArgs>, T, 'create'>,
      never,
      ExtArgs
    >;

    /**
     * Create many TaskReminders.
     * @param {TaskReminderCreateManyArgs} args - Arguments to create many TaskReminders.
     * @example
     * // Create many TaskReminders
     * const taskReminder = await prisma.taskReminder.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     */
    createMany<T extends TaskReminderCreateManyArgs>(
      args?: SelectSubset<T, TaskReminderCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create many TaskReminders and returns the data saved in the database.
     * @param {TaskReminderCreateManyAndReturnArgs} args - Arguments to create many TaskReminders.
     * @example
     * // Create many TaskReminders
     * const taskReminder = await prisma.taskReminder.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Create many TaskReminders and only return the `id`
     * const taskReminderWithIdOnly = await prisma.taskReminder.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    createManyAndReturn<T extends TaskReminderCreateManyAndReturnArgs>(
      args?: SelectSubset<T, TaskReminderCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<
      $Result.GetResult<Prisma.$TaskReminderPayload<ExtArgs>, T, 'createManyAndReturn'>
    >;

    /**
     * Delete a TaskReminder.
     * @param {TaskReminderDeleteArgs} args - Arguments to delete one TaskReminder.
     * @example
     * // Delete one TaskReminder
     * const TaskReminder = await prisma.taskReminder.delete({
     *   where: {
     *     // ... filter to delete one TaskReminder
     *   }
     * })
     *
     */
    delete<T extends TaskReminderDeleteArgs>(
      args: SelectSubset<T, TaskReminderDeleteArgs<ExtArgs>>
    ): Prisma__TaskReminderClient<
      $Result.GetResult<Prisma.$TaskReminderPayload<ExtArgs>, T, 'delete'>,
      never,
      ExtArgs
    >;

    /**
     * Update one TaskReminder.
     * @param {TaskReminderUpdateArgs} args - Arguments to update one TaskReminder.
     * @example
     * // Update one TaskReminder
     * const taskReminder = await prisma.taskReminder.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    update<T extends TaskReminderUpdateArgs>(
      args: SelectSubset<T, TaskReminderUpdateArgs<ExtArgs>>
    ): Prisma__TaskReminderClient<
      $Result.GetResult<Prisma.$TaskReminderPayload<ExtArgs>, T, 'update'>,
      never,
      ExtArgs
    >;

    /**
     * Delete zero or more TaskReminders.
     * @param {TaskReminderDeleteManyArgs} args - Arguments to filter TaskReminders to delete.
     * @example
     * // Delete a few TaskReminders
     * const { count } = await prisma.taskReminder.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     *
     */
    deleteMany<T extends TaskReminderDeleteManyArgs>(
      args?: SelectSubset<T, TaskReminderDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Update zero or more TaskReminders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskReminderUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TaskReminders
     * const taskReminder = await prisma.taskReminder.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    updateMany<T extends TaskReminderUpdateManyArgs>(
      args: SelectSubset<T, TaskReminderUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create or update one TaskReminder.
     * @param {TaskReminderUpsertArgs} args - Arguments to update or create a TaskReminder.
     * @example
     * // Update or create a TaskReminder
     * const taskReminder = await prisma.taskReminder.upsert({
     *   create: {
     *     // ... data to create a TaskReminder
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TaskReminder we want to update
     *   }
     * })
     */
    upsert<T extends TaskReminderUpsertArgs>(
      args: SelectSubset<T, TaskReminderUpsertArgs<ExtArgs>>
    ): Prisma__TaskReminderClient<
      $Result.GetResult<Prisma.$TaskReminderPayload<ExtArgs>, T, 'upsert'>,
      never,
      ExtArgs
    >;

    /**
     * Count the number of TaskReminders.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskReminderCountArgs} args - Arguments to filter TaskReminders to count.
     * @example
     * // Count the number of TaskReminders
     * const count = await prisma.taskReminder.count({
     *   where: {
     *     // ... the filter for the TaskReminders we want to count
     *   }
     * })
     **/
    count<T extends TaskReminderCountArgs>(
      args?: Subset<T, TaskReminderCountArgs>
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TaskReminderCountAggregateOutputType>
        : number
    >;

    /**
     * Allows you to perform aggregations operations on a TaskReminder.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskReminderAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
     **/
    aggregate<T extends TaskReminderAggregateArgs>(
      args: Subset<T, TaskReminderAggregateArgs>
    ): Prisma.PrismaPromise<GetTaskReminderAggregateType<T>>;

    /**
     * Group by TaskReminder.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TaskReminderGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     *
     **/
    groupBy<
      T extends TaskReminderGroupByArgs,
      HasSelectOrTake extends Or<Extends<'skip', Keys<T>>, Extends<'take', Keys<T>>>,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TaskReminderGroupByArgs['orderBy'] }
        : { orderBy?: TaskReminderGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
        ? `Error: "by" must not be empty.`
        : HavingValid extends False
          ? {
              [P in HavingFields]: P extends ByFields
                ? never
                : P extends string
                  ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
                  : [Error, 'Field ', P, ` in "having" needs to be provided in "by"`];
            }[HavingFields]
          : 'take' extends Keys<T>
            ? 'orderBy' extends Keys<T>
              ? ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields]
              : 'Error: If you provide "take", you also need to provide "orderBy"'
            : 'skip' extends Keys<T>
              ? 'orderBy' extends Keys<T>
                ? ByValid extends True
                  ? {}
                  : {
                      [P in OrderFields]: P extends ByFields
                        ? never
                        : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                    }[OrderFields]
                : 'Error: If you provide "skip", you also need to provide "orderBy"'
              : ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields],
    >(
      args: SubsetIntersection<T, TaskReminderGroupByArgs, OrderByArg> & InputErrors
    ): {} extends InputErrors
      ? GetTaskReminderGroupByPayload<T>
      : Prisma.PrismaPromise<InputErrors>;
    /**
     * Fields of the TaskReminder model
     */
    readonly fields: TaskReminderFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TaskReminder.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TaskReminderClient<
    T,
    Null = never,
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';
    task<T extends TaskDefaultArgs<ExtArgs> = {}>(
      args?: Subset<T, TaskDefaultArgs<ExtArgs>>
    ): Prisma__TaskClient<
      $Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null,
      Null,
      ExtArgs
    >;
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(
      onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
    ): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }

  /**
   * Fields of the TaskReminder model
   */
  interface TaskReminderFieldRefs {
    readonly id: FieldRef<'TaskReminder', 'String'>;
    readonly taskId: FieldRef<'TaskReminder', 'String'>;
    readonly reminderAt: FieldRef<'TaskReminder', 'DateTime'>;
    readonly message: FieldRef<'TaskReminder', 'String'>;
    readonly status: FieldRef<'TaskReminder', 'ReminderStatus'>;
    readonly sentAt: FieldRef<'TaskReminder', 'DateTime'>;
    readonly createdAt: FieldRef<'TaskReminder', 'DateTime'>;
    readonly updatedAt: FieldRef<'TaskReminder', 'DateTime'>;
  }

  // Custom InputTypes
  /**
   * TaskReminder findUnique
   */
  export type TaskReminderFindUniqueArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the TaskReminder
     */
    select?: TaskReminderSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskReminderInclude<ExtArgs> | null;
    /**
     * Filter, which TaskReminder to fetch.
     */
    where: TaskReminderWhereUniqueInput;
  };

  /**
   * TaskReminder findUniqueOrThrow
   */
  export type TaskReminderFindUniqueOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the TaskReminder
     */
    select?: TaskReminderSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskReminderInclude<ExtArgs> | null;
    /**
     * Filter, which TaskReminder to fetch.
     */
    where: TaskReminderWhereUniqueInput;
  };

  /**
   * TaskReminder findFirst
   */
  export type TaskReminderFindFirstArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the TaskReminder
     */
    select?: TaskReminderSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskReminderInclude<ExtArgs> | null;
    /**
     * Filter, which TaskReminder to fetch.
     */
    where?: TaskReminderWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of TaskReminders to fetch.
     */
    orderBy?: TaskReminderOrderByWithRelationInput | TaskReminderOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for TaskReminders.
     */
    cursor?: TaskReminderWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` TaskReminders from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` TaskReminders.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of TaskReminders.
     */
    distinct?: TaskReminderScalarFieldEnum | TaskReminderScalarFieldEnum[];
  };

  /**
   * TaskReminder findFirstOrThrow
   */
  export type TaskReminderFindFirstOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the TaskReminder
     */
    select?: TaskReminderSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskReminderInclude<ExtArgs> | null;
    /**
     * Filter, which TaskReminder to fetch.
     */
    where?: TaskReminderWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of TaskReminders to fetch.
     */
    orderBy?: TaskReminderOrderByWithRelationInput | TaskReminderOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for TaskReminders.
     */
    cursor?: TaskReminderWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` TaskReminders from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` TaskReminders.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of TaskReminders.
     */
    distinct?: TaskReminderScalarFieldEnum | TaskReminderScalarFieldEnum[];
  };

  /**
   * TaskReminder findMany
   */
  export type TaskReminderFindManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the TaskReminder
     */
    select?: TaskReminderSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskReminderInclude<ExtArgs> | null;
    /**
     * Filter, which TaskReminders to fetch.
     */
    where?: TaskReminderWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of TaskReminders to fetch.
     */
    orderBy?: TaskReminderOrderByWithRelationInput | TaskReminderOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for listing TaskReminders.
     */
    cursor?: TaskReminderWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` TaskReminders from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` TaskReminders.
     */
    skip?: number;
    distinct?: TaskReminderScalarFieldEnum | TaskReminderScalarFieldEnum[];
  };

  /**
   * TaskReminder create
   */
  export type TaskReminderCreateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the TaskReminder
     */
    select?: TaskReminderSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskReminderInclude<ExtArgs> | null;
    /**
     * The data needed to create a TaskReminder.
     */
    data: XOR<TaskReminderCreateInput, TaskReminderUncheckedCreateInput>;
  };

  /**
   * TaskReminder createMany
   */
  export type TaskReminderCreateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to create many TaskReminders.
     */
    data: TaskReminderCreateManyInput | TaskReminderCreateManyInput[];
    skipDuplicates?: boolean;
  };

  /**
   * TaskReminder createManyAndReturn
   */
  export type TaskReminderCreateManyAndReturnArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the TaskReminder
     */
    select?: TaskReminderSelectCreateManyAndReturn<ExtArgs> | null;
    /**
     * The data used to create many TaskReminders.
     */
    data: TaskReminderCreateManyInput | TaskReminderCreateManyInput[];
    skipDuplicates?: boolean;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskReminderIncludeCreateManyAndReturn<ExtArgs> | null;
  };

  /**
   * TaskReminder update
   */
  export type TaskReminderUpdateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the TaskReminder
     */
    select?: TaskReminderSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskReminderInclude<ExtArgs> | null;
    /**
     * The data needed to update a TaskReminder.
     */
    data: XOR<TaskReminderUpdateInput, TaskReminderUncheckedUpdateInput>;
    /**
     * Choose, which TaskReminder to update.
     */
    where: TaskReminderWhereUniqueInput;
  };

  /**
   * TaskReminder updateMany
   */
  export type TaskReminderUpdateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to update TaskReminders.
     */
    data: XOR<TaskReminderUpdateManyMutationInput, TaskReminderUncheckedUpdateManyInput>;
    /**
     * Filter which TaskReminders to update
     */
    where?: TaskReminderWhereInput;
  };

  /**
   * TaskReminder upsert
   */
  export type TaskReminderUpsertArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the TaskReminder
     */
    select?: TaskReminderSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskReminderInclude<ExtArgs> | null;
    /**
     * The filter to search for the TaskReminder to update in case it exists.
     */
    where: TaskReminderWhereUniqueInput;
    /**
     * In case the TaskReminder found by the `where` argument doesn't exist, create a new TaskReminder with this data.
     */
    create: XOR<TaskReminderCreateInput, TaskReminderUncheckedCreateInput>;
    /**
     * In case the TaskReminder was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TaskReminderUpdateInput, TaskReminderUncheckedUpdateInput>;
  };

  /**
   * TaskReminder delete
   */
  export type TaskReminderDeleteArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the TaskReminder
     */
    select?: TaskReminderSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskReminderInclude<ExtArgs> | null;
    /**
     * Filter which TaskReminder to delete.
     */
    where: TaskReminderWhereUniqueInput;
  };

  /**
   * TaskReminder deleteMany
   */
  export type TaskReminderDeleteManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which TaskReminders to delete
     */
    where?: TaskReminderWhereInput;
  };

  /**
   * TaskReminder without action
   */
  export type TaskReminderDefaultArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the TaskReminder
     */
    select?: TaskReminderSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: TaskReminderInclude<ExtArgs> | null;
  };

  /**
   * Model Reflection
   */

  export type AggregateReflection = {
    _count: ReflectionCountAggregateOutputType | null;
    _avg: ReflectionAvgAggregateOutputType | null;
    _sum: ReflectionSumAggregateOutputType | null;
    _min: ReflectionMinAggregateOutputType | null;
    _max: ReflectionMaxAggregateOutputType | null;
  };

  export type ReflectionAvgAggregateOutputType = {
    rating: number | null;
  };

  export type ReflectionSumAggregateOutputType = {
    rating: number | null;
  };

  export type ReflectionMinAggregateOutputType = {
    id: string | null;
    taskId: string | null;
    content: string | null;
    rating: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type ReflectionMaxAggregateOutputType = {
    id: string | null;
    taskId: string | null;
    content: string | null;
    rating: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };

  export type ReflectionCountAggregateOutputType = {
    id: number;
    taskId: number;
    content: number;
    rating: number;
    createdAt: number;
    updatedAt: number;
    _all: number;
  };

  export type ReflectionAvgAggregateInputType = {
    rating?: true;
  };

  export type ReflectionSumAggregateInputType = {
    rating?: true;
  };

  export type ReflectionMinAggregateInputType = {
    id?: true;
    taskId?: true;
    content?: true;
    rating?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type ReflectionMaxAggregateInputType = {
    id?: true;
    taskId?: true;
    content?: true;
    rating?: true;
    createdAt?: true;
    updatedAt?: true;
  };

  export type ReflectionCountAggregateInputType = {
    id?: true;
    taskId?: true;
    content?: true;
    rating?: true;
    createdAt?: true;
    updatedAt?: true;
    _all?: true;
  };

  export type ReflectionAggregateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which Reflection to aggregate.
     */
    where?: ReflectionWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Reflections to fetch.
     */
    orderBy?: ReflectionOrderByWithRelationInput | ReflectionOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the start position
     */
    cursor?: ReflectionWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Reflections from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Reflections.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Count returned Reflections
     **/
    _count?: true | ReflectionCountAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to average
     **/
    _avg?: ReflectionAvgAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to sum
     **/
    _sum?: ReflectionSumAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the minimum value
     **/
    _min?: ReflectionMinAggregateInputType;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     *
     * Select which fields to find the maximum value
     **/
    _max?: ReflectionMaxAggregateInputType;
  };

  export type GetReflectionAggregateType<T extends ReflectionAggregateArgs> = {
    [P in keyof T & keyof AggregateReflection]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateReflection[P]>
      : GetScalarType<T[P], AggregateReflection[P]>;
  };

  export type ReflectionGroupByArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    where?: ReflectionWhereInput;
    orderBy?: ReflectionOrderByWithAggregationInput | ReflectionOrderByWithAggregationInput[];
    by: ReflectionScalarFieldEnum[] | ReflectionScalarFieldEnum;
    having?: ReflectionScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: ReflectionCountAggregateInputType | true;
    _avg?: ReflectionAvgAggregateInputType;
    _sum?: ReflectionSumAggregateInputType;
    _min?: ReflectionMinAggregateInputType;
    _max?: ReflectionMaxAggregateInputType;
  };

  export type ReflectionGroupByOutputType = {
    id: string;
    taskId: string;
    content: string;
    rating: number | null;
    createdAt: Date;
    updatedAt: Date;
    _count: ReflectionCountAggregateOutputType | null;
    _avg: ReflectionAvgAggregateOutputType | null;
    _sum: ReflectionSumAggregateOutputType | null;
    _min: ReflectionMinAggregateOutputType | null;
    _max: ReflectionMaxAggregateOutputType | null;
  };

  type GetReflectionGroupByPayload<T extends ReflectionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ReflectionGroupByOutputType, T['by']> & {
        [P in keyof T & keyof ReflectionGroupByOutputType]: P extends '_count'
          ? T[P] extends boolean
            ? number
            : GetScalarType<T[P], ReflectionGroupByOutputType[P]>
          : GetScalarType<T[P], ReflectionGroupByOutputType[P]>;
      }
    >
  >;

  export type ReflectionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    $Extensions.GetSelect<
      {
        id?: boolean;
        taskId?: boolean;
        content?: boolean;
        rating?: boolean;
        createdAt?: boolean;
        updatedAt?: boolean;
        task?: boolean | TaskDefaultArgs<ExtArgs>;
      },
      ExtArgs['result']['reflection']
    >;

  export type ReflectionSelectCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = $Extensions.GetSelect<
    {
      id?: boolean;
      taskId?: boolean;
      content?: boolean;
      rating?: boolean;
      createdAt?: boolean;
      updatedAt?: boolean;
      task?: boolean | TaskDefaultArgs<ExtArgs>;
    },
    ExtArgs['result']['reflection']
  >;

  export type ReflectionSelectScalar = {
    id?: boolean;
    taskId?: boolean;
    content?: boolean;
    rating?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
  };

  export type ReflectionInclude<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    task?: boolean | TaskDefaultArgs<ExtArgs>;
  };
  export type ReflectionIncludeCreateManyAndReturn<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    task?: boolean | TaskDefaultArgs<ExtArgs>;
  };

  export type $ReflectionPayload<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    name: 'Reflection';
    objects: {
      task: Prisma.$TaskPayload<ExtArgs>;
    };
    scalars: $Extensions.GetPayloadResult<
      {
        id: string;
        taskId: string;
        content: string;
        rating: number | null;
        createdAt: Date;
        updatedAt: Date;
      },
      ExtArgs['result']['reflection']
    >;
    composites: {};
  };

  type ReflectionGetPayload<S extends boolean | null | undefined | ReflectionDefaultArgs> =
    $Result.GetResult<Prisma.$ReflectionPayload, S>;

  type ReflectionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ReflectionFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ReflectionCountAggregateInputType | true;
    };

  export interface ReflectionDelegate<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > {
    [K: symbol]: {
      types: Prisma.TypeMap<ExtArgs>['model']['Reflection'];
      meta: { name: 'Reflection' };
    };
    /**
     * Find zero or one Reflection that matches the filter.
     * @param {ReflectionFindUniqueArgs} args - Arguments to find a Reflection
     * @example
     * // Get one Reflection
     * const reflection = await prisma.reflection.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ReflectionFindUniqueArgs>(
      args: SelectSubset<T, ReflectionFindUniqueArgs<ExtArgs>>
    ): Prisma__ReflectionClient<
      $Result.GetResult<Prisma.$ReflectionPayload<ExtArgs>, T, 'findUnique'> | null,
      null,
      ExtArgs
    >;

    /**
     * Find one Reflection that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ReflectionFindUniqueOrThrowArgs} args - Arguments to find a Reflection
     * @example
     * // Get one Reflection
     * const reflection = await prisma.reflection.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ReflectionFindUniqueOrThrowArgs>(
      args: SelectSubset<T, ReflectionFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__ReflectionClient<
      $Result.GetResult<Prisma.$ReflectionPayload<ExtArgs>, T, 'findUniqueOrThrow'>,
      never,
      ExtArgs
    >;

    /**
     * Find the first Reflection that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReflectionFindFirstArgs} args - Arguments to find a Reflection
     * @example
     * // Get one Reflection
     * const reflection = await prisma.reflection.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ReflectionFindFirstArgs>(
      args?: SelectSubset<T, ReflectionFindFirstArgs<ExtArgs>>
    ): Prisma__ReflectionClient<
      $Result.GetResult<Prisma.$ReflectionPayload<ExtArgs>, T, 'findFirst'> | null,
      null,
      ExtArgs
    >;

    /**
     * Find the first Reflection that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReflectionFindFirstOrThrowArgs} args - Arguments to find a Reflection
     * @example
     * // Get one Reflection
     * const reflection = await prisma.reflection.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ReflectionFindFirstOrThrowArgs>(
      args?: SelectSubset<T, ReflectionFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__ReflectionClient<
      $Result.GetResult<Prisma.$ReflectionPayload<ExtArgs>, T, 'findFirstOrThrow'>,
      never,
      ExtArgs
    >;

    /**
     * Find zero or more Reflections that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReflectionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Reflections
     * const reflections = await prisma.reflection.findMany()
     *
     * // Get first 10 Reflections
     * const reflections = await prisma.reflection.findMany({ take: 10 })
     *
     * // Only select the `id`
     * const reflectionWithIdOnly = await prisma.reflection.findMany({ select: { id: true } })
     *
     */
    findMany<T extends ReflectionFindManyArgs>(
      args?: SelectSubset<T, ReflectionFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ReflectionPayload<ExtArgs>, T, 'findMany'>>;

    /**
     * Create a Reflection.
     * @param {ReflectionCreateArgs} args - Arguments to create a Reflection.
     * @example
     * // Create one Reflection
     * const Reflection = await prisma.reflection.create({
     *   data: {
     *     // ... data to create a Reflection
     *   }
     * })
     *
     */
    create<T extends ReflectionCreateArgs>(
      args: SelectSubset<T, ReflectionCreateArgs<ExtArgs>>
    ): Prisma__ReflectionClient<
      $Result.GetResult<Prisma.$ReflectionPayload<ExtArgs>, T, 'create'>,
      never,
      ExtArgs
    >;

    /**
     * Create many Reflections.
     * @param {ReflectionCreateManyArgs} args - Arguments to create many Reflections.
     * @example
     * // Create many Reflections
     * const reflection = await prisma.reflection.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     */
    createMany<T extends ReflectionCreateManyArgs>(
      args?: SelectSubset<T, ReflectionCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create many Reflections and returns the data saved in the database.
     * @param {ReflectionCreateManyAndReturnArgs} args - Arguments to create many Reflections.
     * @example
     * // Create many Reflections
     * const reflection = await prisma.reflection.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *
     * // Create many Reflections and only return the `id`
     * const reflectionWithIdOnly = await prisma.reflection.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     *
     */
    createManyAndReturn<T extends ReflectionCreateManyAndReturnArgs>(
      args?: SelectSubset<T, ReflectionCreateManyAndReturnArgs<ExtArgs>>
    ): Prisma.PrismaPromise<
      $Result.GetResult<Prisma.$ReflectionPayload<ExtArgs>, T, 'createManyAndReturn'>
    >;

    /**
     * Delete a Reflection.
     * @param {ReflectionDeleteArgs} args - Arguments to delete one Reflection.
     * @example
     * // Delete one Reflection
     * const Reflection = await prisma.reflection.delete({
     *   where: {
     *     // ... filter to delete one Reflection
     *   }
     * })
     *
     */
    delete<T extends ReflectionDeleteArgs>(
      args: SelectSubset<T, ReflectionDeleteArgs<ExtArgs>>
    ): Prisma__ReflectionClient<
      $Result.GetResult<Prisma.$ReflectionPayload<ExtArgs>, T, 'delete'>,
      never,
      ExtArgs
    >;

    /**
     * Update one Reflection.
     * @param {ReflectionUpdateArgs} args - Arguments to update one Reflection.
     * @example
     * // Update one Reflection
     * const reflection = await prisma.reflection.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    update<T extends ReflectionUpdateArgs>(
      args: SelectSubset<T, ReflectionUpdateArgs<ExtArgs>>
    ): Prisma__ReflectionClient<
      $Result.GetResult<Prisma.$ReflectionPayload<ExtArgs>, T, 'update'>,
      never,
      ExtArgs
    >;

    /**
     * Delete zero or more Reflections.
     * @param {ReflectionDeleteManyArgs} args - Arguments to filter Reflections to delete.
     * @example
     * // Delete a few Reflections
     * const { count } = await prisma.reflection.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     *
     */
    deleteMany<T extends ReflectionDeleteManyArgs>(
      args?: SelectSubset<T, ReflectionDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Update zero or more Reflections.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReflectionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Reflections
     * const reflection = await prisma.reflection.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     *
     */
    updateMany<T extends ReflectionUpdateManyArgs>(
      args: SelectSubset<T, ReflectionUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>;

    /**
     * Create or update one Reflection.
     * @param {ReflectionUpsertArgs} args - Arguments to update or create a Reflection.
     * @example
     * // Update or create a Reflection
     * const reflection = await prisma.reflection.upsert({
     *   create: {
     *     // ... data to create a Reflection
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Reflection we want to update
     *   }
     * })
     */
    upsert<T extends ReflectionUpsertArgs>(
      args: SelectSubset<T, ReflectionUpsertArgs<ExtArgs>>
    ): Prisma__ReflectionClient<
      $Result.GetResult<Prisma.$ReflectionPayload<ExtArgs>, T, 'upsert'>,
      never,
      ExtArgs
    >;

    /**
     * Count the number of Reflections.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReflectionCountArgs} args - Arguments to filter Reflections to count.
     * @example
     * // Count the number of Reflections
     * const count = await prisma.reflection.count({
     *   where: {
     *     // ... the filter for the Reflections we want to count
     *   }
     * })
     **/
    count<T extends ReflectionCountArgs>(
      args?: Subset<T, ReflectionCountArgs>
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ReflectionCountAggregateOutputType>
        : number
    >;

    /**
     * Allows you to perform aggregations operations on a Reflection.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReflectionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
     **/
    aggregate<T extends ReflectionAggregateArgs>(
      args: Subset<T, ReflectionAggregateArgs>
    ): Prisma.PrismaPromise<GetReflectionAggregateType<T>>;

    /**
     * Group by Reflection.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ReflectionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     *
     **/
    groupBy<
      T extends ReflectionGroupByArgs,
      HasSelectOrTake extends Or<Extends<'skip', Keys<T>>, Extends<'take', Keys<T>>>,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ReflectionGroupByArgs['orderBy'] }
        : { orderBy?: ReflectionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
        ? `Error: "by" must not be empty.`
        : HavingValid extends False
          ? {
              [P in HavingFields]: P extends ByFields
                ? never
                : P extends string
                  ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
                  : [Error, 'Field ', P, ` in "having" needs to be provided in "by"`];
            }[HavingFields]
          : 'take' extends Keys<T>
            ? 'orderBy' extends Keys<T>
              ? ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields]
              : 'Error: If you provide "take", you also need to provide "orderBy"'
            : 'skip' extends Keys<T>
              ? 'orderBy' extends Keys<T>
                ? ByValid extends True
                  ? {}
                  : {
                      [P in OrderFields]: P extends ByFields
                        ? never
                        : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                    }[OrderFields]
                : 'Error: If you provide "skip", you also need to provide "orderBy"'
              : ByValid extends True
                ? {}
                : {
                    [P in OrderFields]: P extends ByFields
                      ? never
                      : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
                  }[OrderFields],
    >(
      args: SubsetIntersection<T, ReflectionGroupByArgs, OrderByArg> & InputErrors
    ): {} extends InputErrors ? GetReflectionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    /**
     * Fields of the Reflection model
     */
    readonly fields: ReflectionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Reflection.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ReflectionClient<
    T,
    Null = never,
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';
    task<T extends TaskDefaultArgs<ExtArgs> = {}>(
      args?: Subset<T, TaskDefaultArgs<ExtArgs>>
    ): Prisma__TaskClient<
      $Result.GetResult<Prisma.$TaskPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null,
      Null,
      ExtArgs
    >;
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(
      onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
    ): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }

  /**
   * Fields of the Reflection model
   */
  interface ReflectionFieldRefs {
    readonly id: FieldRef<'Reflection', 'String'>;
    readonly taskId: FieldRef<'Reflection', 'String'>;
    readonly content: FieldRef<'Reflection', 'String'>;
    readonly rating: FieldRef<'Reflection', 'Int'>;
    readonly createdAt: FieldRef<'Reflection', 'DateTime'>;
    readonly updatedAt: FieldRef<'Reflection', 'DateTime'>;
  }

  // Custom InputTypes
  /**
   * Reflection findUnique
   */
  export type ReflectionFindUniqueArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Reflection
     */
    select?: ReflectionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReflectionInclude<ExtArgs> | null;
    /**
     * Filter, which Reflection to fetch.
     */
    where: ReflectionWhereUniqueInput;
  };

  /**
   * Reflection findUniqueOrThrow
   */
  export type ReflectionFindUniqueOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Reflection
     */
    select?: ReflectionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReflectionInclude<ExtArgs> | null;
    /**
     * Filter, which Reflection to fetch.
     */
    where: ReflectionWhereUniqueInput;
  };

  /**
   * Reflection findFirst
   */
  export type ReflectionFindFirstArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Reflection
     */
    select?: ReflectionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReflectionInclude<ExtArgs> | null;
    /**
     * Filter, which Reflection to fetch.
     */
    where?: ReflectionWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Reflections to fetch.
     */
    orderBy?: ReflectionOrderByWithRelationInput | ReflectionOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Reflections.
     */
    cursor?: ReflectionWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Reflections from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Reflections.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Reflections.
     */
    distinct?: ReflectionScalarFieldEnum | ReflectionScalarFieldEnum[];
  };

  /**
   * Reflection findFirstOrThrow
   */
  export type ReflectionFindFirstOrThrowArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Reflection
     */
    select?: ReflectionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReflectionInclude<ExtArgs> | null;
    /**
     * Filter, which Reflection to fetch.
     */
    where?: ReflectionWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Reflections to fetch.
     */
    orderBy?: ReflectionOrderByWithRelationInput | ReflectionOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for searching for Reflections.
     */
    cursor?: ReflectionWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Reflections from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Reflections.
     */
    skip?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     *
     * Filter by unique combinations of Reflections.
     */
    distinct?: ReflectionScalarFieldEnum | ReflectionScalarFieldEnum[];
  };

  /**
   * Reflection findMany
   */
  export type ReflectionFindManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Reflection
     */
    select?: ReflectionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReflectionInclude<ExtArgs> | null;
    /**
     * Filter, which Reflections to fetch.
     */
    where?: ReflectionWhereInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     *
     * Determine the order of Reflections to fetch.
     */
    orderBy?: ReflectionOrderByWithRelationInput | ReflectionOrderByWithRelationInput[];
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     *
     * Sets the position for listing Reflections.
     */
    cursor?: ReflectionWhereUniqueInput;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Take `±n` Reflections from the position of the cursor.
     */
    take?: number;
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     *
     * Skip the first `n` Reflections.
     */
    skip?: number;
    distinct?: ReflectionScalarFieldEnum | ReflectionScalarFieldEnum[];
  };

  /**
   * Reflection create
   */
  export type ReflectionCreateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Reflection
     */
    select?: ReflectionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReflectionInclude<ExtArgs> | null;
    /**
     * The data needed to create a Reflection.
     */
    data: XOR<ReflectionCreateInput, ReflectionUncheckedCreateInput>;
  };

  /**
   * Reflection createMany
   */
  export type ReflectionCreateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to create many Reflections.
     */
    data: ReflectionCreateManyInput | ReflectionCreateManyInput[];
    skipDuplicates?: boolean;
  };

  /**
   * Reflection createManyAndReturn
   */
  export type ReflectionCreateManyAndReturnArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Reflection
     */
    select?: ReflectionSelectCreateManyAndReturn<ExtArgs> | null;
    /**
     * The data used to create many Reflections.
     */
    data: ReflectionCreateManyInput | ReflectionCreateManyInput[];
    skipDuplicates?: boolean;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReflectionIncludeCreateManyAndReturn<ExtArgs> | null;
  };

  /**
   * Reflection update
   */
  export type ReflectionUpdateArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Reflection
     */
    select?: ReflectionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReflectionInclude<ExtArgs> | null;
    /**
     * The data needed to update a Reflection.
     */
    data: XOR<ReflectionUpdateInput, ReflectionUncheckedUpdateInput>;
    /**
     * Choose, which Reflection to update.
     */
    where: ReflectionWhereUniqueInput;
  };

  /**
   * Reflection updateMany
   */
  export type ReflectionUpdateManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * The data used to update Reflections.
     */
    data: XOR<ReflectionUpdateManyMutationInput, ReflectionUncheckedUpdateManyInput>;
    /**
     * Filter which Reflections to update
     */
    where?: ReflectionWhereInput;
  };

  /**
   * Reflection upsert
   */
  export type ReflectionUpsertArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Reflection
     */
    select?: ReflectionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReflectionInclude<ExtArgs> | null;
    /**
     * The filter to search for the Reflection to update in case it exists.
     */
    where: ReflectionWhereUniqueInput;
    /**
     * In case the Reflection found by the `where` argument doesn't exist, create a new Reflection with this data.
     */
    create: XOR<ReflectionCreateInput, ReflectionUncheckedCreateInput>;
    /**
     * In case the Reflection was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ReflectionUpdateInput, ReflectionUncheckedUpdateInput>;
  };

  /**
   * Reflection delete
   */
  export type ReflectionDeleteArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Reflection
     */
    select?: ReflectionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReflectionInclude<ExtArgs> | null;
    /**
     * Filter which Reflection to delete.
     */
    where: ReflectionWhereUniqueInput;
  };

  /**
   * Reflection deleteMany
   */
  export type ReflectionDeleteManyArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Filter which Reflections to delete
     */
    where?: ReflectionWhereInput;
  };

  /**
   * Reflection without action
   */
  export type ReflectionDefaultArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = {
    /**
     * Select specific fields to fetch from the Reflection
     */
    select?: ReflectionSelect<ExtArgs> | null;
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ReflectionInclude<ExtArgs> | null;
  };

  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted';
    ReadCommitted: 'ReadCommitted';
    RepeatableRead: 'RepeatableRead';
    Serializable: 'Serializable';
  };

  export type TransactionIsolationLevel =
    (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel];

  export const UserScalarFieldEnum: {
    id: 'id';
    email: 'email';
    name: 'name';
    industry: 'industry';
    companySize: 'companySize';
    jobType: 'jobType';
    position: 'position';
    createdAt: 'createdAt';
    updatedAt: 'updatedAt';
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum];

  export const GoalScalarFieldEnum: {
    id: 'id';
    userId: 'userId';
    title: 'title';
    description: 'description';
    deadline: 'deadline';
    background: 'background';
    constraints: 'constraints';
    status: 'status';
    progress: 'progress';
    createdAt: 'createdAt';
    updatedAt: 'updatedAt';
  };

  export type GoalScalarFieldEnum = (typeof GoalScalarFieldEnum)[keyof typeof GoalScalarFieldEnum];

  export const SubGoalScalarFieldEnum: {
    id: 'id';
    goalId: 'goalId';
    title: 'title';
    description: 'description';
    background: 'background';
    constraints: 'constraints';
    position: 'position';
    progress: 'progress';
    createdAt: 'createdAt';
    updatedAt: 'updatedAt';
  };

  export type SubGoalScalarFieldEnum =
    (typeof SubGoalScalarFieldEnum)[keyof typeof SubGoalScalarFieldEnum];

  export const ActionScalarFieldEnum: {
    id: 'id';
    subGoalId: 'subGoalId';
    title: 'title';
    description: 'description';
    background: 'background';
    constraints: 'constraints';
    position: 'position';
    progress: 'progress';
    createdAt: 'createdAt';
    updatedAt: 'updatedAt';
  };

  export type ActionScalarFieldEnum =
    (typeof ActionScalarFieldEnum)[keyof typeof ActionScalarFieldEnum];

  export const TaskScalarFieldEnum: {
    id: 'id';
    actionId: 'actionId';
    title: 'title';
    description: 'description';
    type: 'type';
    status: 'status';
    estimatedTime: 'estimatedTime';
    completedAt: 'completedAt';
    createdAt: 'createdAt';
    updatedAt: 'updatedAt';
  };

  export type TaskScalarFieldEnum = (typeof TaskScalarFieldEnum)[keyof typeof TaskScalarFieldEnum];

  export const TaskReminderScalarFieldEnum: {
    id: 'id';
    taskId: 'taskId';
    reminderAt: 'reminderAt';
    message: 'message';
    status: 'status';
    sentAt: 'sentAt';
    createdAt: 'createdAt';
    updatedAt: 'updatedAt';
  };

  export type TaskReminderScalarFieldEnum =
    (typeof TaskReminderScalarFieldEnum)[keyof typeof TaskReminderScalarFieldEnum];

  export const ReflectionScalarFieldEnum: {
    id: 'id';
    taskId: 'taskId';
    content: 'content';
    rating: 'rating';
    createdAt: 'createdAt';
    updatedAt: 'updatedAt';
  };

  export type ReflectionScalarFieldEnum =
    (typeof ReflectionScalarFieldEnum)[keyof typeof ReflectionScalarFieldEnum];

  export const SortOrder: {
    asc: 'asc';
    desc: 'desc';
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

  export const QueryMode: {
    default: 'default';
    insensitive: 'insensitive';
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode];

  export const NullsOrder: {
    first: 'first';
    last: 'last';
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder];

  /**
   * Field references
   */

  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>;

  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>;

  /**
   * Reference to a field of type 'UserIndustry'
   */
  export type EnumUserIndustryFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'UserIndustry'
  >;

  /**
   * Reference to a field of type 'UserIndustry[]'
   */
  export type ListEnumUserIndustryFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'UserIndustry[]'
  >;

  /**
   * Reference to a field of type 'CompanySize'
   */
  export type EnumCompanySizeFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'CompanySize'
  >;

  /**
   * Reference to a field of type 'CompanySize[]'
   */
  export type ListEnumCompanySizeFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'CompanySize[]'
  >;

  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>;

  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'DateTime[]'
  >;

  /**
   * Reference to a field of type 'GoalStatus'
   */
  export type EnumGoalStatusFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'GoalStatus'
  >;

  /**
   * Reference to a field of type 'GoalStatus[]'
   */
  export type ListEnumGoalStatusFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'GoalStatus[]'
  >;

  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>;

  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>;

  /**
   * Reference to a field of type 'TaskType'
   */
  export type EnumTaskTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'TaskType'>;

  /**
   * Reference to a field of type 'TaskType[]'
   */
  export type ListEnumTaskTypeFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'TaskType[]'
  >;

  /**
   * Reference to a field of type 'TaskStatus'
   */
  export type EnumTaskStatusFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'TaskStatus'
  >;

  /**
   * Reference to a field of type 'TaskStatus[]'
   */
  export type ListEnumTaskStatusFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'TaskStatus[]'
  >;

  /**
   * Reference to a field of type 'ReminderStatus'
   */
  export type EnumReminderStatusFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'ReminderStatus'
  >;

  /**
   * Reference to a field of type 'ReminderStatus[]'
   */
  export type ListEnumReminderStatusFieldRefInput<$PrismaModel> = FieldRefInputType<
    $PrismaModel,
    'ReminderStatus[]'
  >;

  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>;

  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>;

  /**
   * Deep Input Types
   */

  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[];
    OR?: UserWhereInput[];
    NOT?: UserWhereInput | UserWhereInput[];
    id?: UuidFilter<'User'> | string;
    email?: StringFilter<'User'> | string;
    name?: StringFilter<'User'> | string;
    industry?: EnumUserIndustryNullableFilter<'User'> | $Enums.UserIndustry | null;
    companySize?: EnumCompanySizeNullableFilter<'User'> | $Enums.CompanySize | null;
    jobType?: StringNullableFilter<'User'> | string | null;
    position?: StringNullableFilter<'User'> | string | null;
    createdAt?: DateTimeFilter<'User'> | Date | string;
    updatedAt?: DateTimeFilter<'User'> | Date | string;
    goals?: GoalListRelationFilter;
  };

  export type UserOrderByWithRelationInput = {
    id?: SortOrder;
    email?: SortOrder;
    name?: SortOrder;
    industry?: SortOrderInput | SortOrder;
    companySize?: SortOrderInput | SortOrder;
    jobType?: SortOrderInput | SortOrder;
    position?: SortOrderInput | SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    goals?: GoalOrderByRelationAggregateInput;
  };

  export type UserWhereUniqueInput = Prisma.AtLeast<
    {
      id?: string;
      email?: string;
      AND?: UserWhereInput | UserWhereInput[];
      OR?: UserWhereInput[];
      NOT?: UserWhereInput | UserWhereInput[];
      name?: StringFilter<'User'> | string;
      industry?: EnumUserIndustryNullableFilter<'User'> | $Enums.UserIndustry | null;
      companySize?: EnumCompanySizeNullableFilter<'User'> | $Enums.CompanySize | null;
      jobType?: StringNullableFilter<'User'> | string | null;
      position?: StringNullableFilter<'User'> | string | null;
      createdAt?: DateTimeFilter<'User'> | Date | string;
      updatedAt?: DateTimeFilter<'User'> | Date | string;
      goals?: GoalListRelationFilter;
    },
    'id' | 'email'
  >;

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder;
    email?: SortOrder;
    name?: SortOrder;
    industry?: SortOrderInput | SortOrder;
    companySize?: SortOrderInput | SortOrder;
    jobType?: SortOrderInput | SortOrder;
    position?: SortOrderInput | SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    _count?: UserCountOrderByAggregateInput;
    _max?: UserMaxOrderByAggregateInput;
    _min?: UserMinOrderByAggregateInput;
  };

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[];
    OR?: UserScalarWhereWithAggregatesInput[];
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[];
    id?: UuidWithAggregatesFilter<'User'> | string;
    email?: StringWithAggregatesFilter<'User'> | string;
    name?: StringWithAggregatesFilter<'User'> | string;
    industry?: EnumUserIndustryNullableWithAggregatesFilter<'User'> | $Enums.UserIndustry | null;
    companySize?: EnumCompanySizeNullableWithAggregatesFilter<'User'> | $Enums.CompanySize | null;
    jobType?: StringNullableWithAggregatesFilter<'User'> | string | null;
    position?: StringNullableWithAggregatesFilter<'User'> | string | null;
    createdAt?: DateTimeWithAggregatesFilter<'User'> | Date | string;
    updatedAt?: DateTimeWithAggregatesFilter<'User'> | Date | string;
  };

  export type GoalWhereInput = {
    AND?: GoalWhereInput | GoalWhereInput[];
    OR?: GoalWhereInput[];
    NOT?: GoalWhereInput | GoalWhereInput[];
    id?: UuidFilter<'Goal'> | string;
    userId?: UuidFilter<'Goal'> | string;
    title?: StringFilter<'Goal'> | string;
    description?: StringNullableFilter<'Goal'> | string | null;
    deadline?: DateTimeNullableFilter<'Goal'> | Date | string | null;
    background?: StringNullableFilter<'Goal'> | string | null;
    constraints?: StringNullableFilter<'Goal'> | string | null;
    status?: EnumGoalStatusFilter<'Goal'> | $Enums.GoalStatus;
    progress?: IntFilter<'Goal'> | number;
    createdAt?: DateTimeFilter<'Goal'> | Date | string;
    updatedAt?: DateTimeFilter<'Goal'> | Date | string;
    user?: XOR<UserRelationFilter, UserWhereInput>;
    subGoals?: SubGoalListRelationFilter;
  };

  export type GoalOrderByWithRelationInput = {
    id?: SortOrder;
    userId?: SortOrder;
    title?: SortOrder;
    description?: SortOrderInput | SortOrder;
    deadline?: SortOrderInput | SortOrder;
    background?: SortOrderInput | SortOrder;
    constraints?: SortOrderInput | SortOrder;
    status?: SortOrder;
    progress?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    user?: UserOrderByWithRelationInput;
    subGoals?: SubGoalOrderByRelationAggregateInput;
  };

  export type GoalWhereUniqueInput = Prisma.AtLeast<
    {
      id?: string;
      AND?: GoalWhereInput | GoalWhereInput[];
      OR?: GoalWhereInput[];
      NOT?: GoalWhereInput | GoalWhereInput[];
      userId?: UuidFilter<'Goal'> | string;
      title?: StringFilter<'Goal'> | string;
      description?: StringNullableFilter<'Goal'> | string | null;
      deadline?: DateTimeNullableFilter<'Goal'> | Date | string | null;
      background?: StringNullableFilter<'Goal'> | string | null;
      constraints?: StringNullableFilter<'Goal'> | string | null;
      status?: EnumGoalStatusFilter<'Goal'> | $Enums.GoalStatus;
      progress?: IntFilter<'Goal'> | number;
      createdAt?: DateTimeFilter<'Goal'> | Date | string;
      updatedAt?: DateTimeFilter<'Goal'> | Date | string;
      user?: XOR<UserRelationFilter, UserWhereInput>;
      subGoals?: SubGoalListRelationFilter;
    },
    'id'
  >;

  export type GoalOrderByWithAggregationInput = {
    id?: SortOrder;
    userId?: SortOrder;
    title?: SortOrder;
    description?: SortOrderInput | SortOrder;
    deadline?: SortOrderInput | SortOrder;
    background?: SortOrderInput | SortOrder;
    constraints?: SortOrderInput | SortOrder;
    status?: SortOrder;
    progress?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    _count?: GoalCountOrderByAggregateInput;
    _avg?: GoalAvgOrderByAggregateInput;
    _max?: GoalMaxOrderByAggregateInput;
    _min?: GoalMinOrderByAggregateInput;
    _sum?: GoalSumOrderByAggregateInput;
  };

  export type GoalScalarWhereWithAggregatesInput = {
    AND?: GoalScalarWhereWithAggregatesInput | GoalScalarWhereWithAggregatesInput[];
    OR?: GoalScalarWhereWithAggregatesInput[];
    NOT?: GoalScalarWhereWithAggregatesInput | GoalScalarWhereWithAggregatesInput[];
    id?: UuidWithAggregatesFilter<'Goal'> | string;
    userId?: UuidWithAggregatesFilter<'Goal'> | string;
    title?: StringWithAggregatesFilter<'Goal'> | string;
    description?: StringNullableWithAggregatesFilter<'Goal'> | string | null;
    deadline?: DateTimeNullableWithAggregatesFilter<'Goal'> | Date | string | null;
    background?: StringNullableWithAggregatesFilter<'Goal'> | string | null;
    constraints?: StringNullableWithAggregatesFilter<'Goal'> | string | null;
    status?: EnumGoalStatusWithAggregatesFilter<'Goal'> | $Enums.GoalStatus;
    progress?: IntWithAggregatesFilter<'Goal'> | number;
    createdAt?: DateTimeWithAggregatesFilter<'Goal'> | Date | string;
    updatedAt?: DateTimeWithAggregatesFilter<'Goal'> | Date | string;
  };

  export type SubGoalWhereInput = {
    AND?: SubGoalWhereInput | SubGoalWhereInput[];
    OR?: SubGoalWhereInput[];
    NOT?: SubGoalWhereInput | SubGoalWhereInput[];
    id?: UuidFilter<'SubGoal'> | string;
    goalId?: UuidFilter<'SubGoal'> | string;
    title?: StringFilter<'SubGoal'> | string;
    description?: StringNullableFilter<'SubGoal'> | string | null;
    background?: StringNullableFilter<'SubGoal'> | string | null;
    constraints?: StringNullableFilter<'SubGoal'> | string | null;
    position?: IntFilter<'SubGoal'> | number;
    progress?: IntFilter<'SubGoal'> | number;
    createdAt?: DateTimeFilter<'SubGoal'> | Date | string;
    updatedAt?: DateTimeFilter<'SubGoal'> | Date | string;
    goal?: XOR<GoalRelationFilter, GoalWhereInput>;
    actions?: ActionListRelationFilter;
  };

  export type SubGoalOrderByWithRelationInput = {
    id?: SortOrder;
    goalId?: SortOrder;
    title?: SortOrder;
    description?: SortOrderInput | SortOrder;
    background?: SortOrderInput | SortOrder;
    constraints?: SortOrderInput | SortOrder;
    position?: SortOrder;
    progress?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    goal?: GoalOrderByWithRelationInput;
    actions?: ActionOrderByRelationAggregateInput;
  };

  export type SubGoalWhereUniqueInput = Prisma.AtLeast<
    {
      id?: string;
      goalId_position?: SubGoalGoalIdPositionCompoundUniqueInput;
      AND?: SubGoalWhereInput | SubGoalWhereInput[];
      OR?: SubGoalWhereInput[];
      NOT?: SubGoalWhereInput | SubGoalWhereInput[];
      goalId?: UuidFilter<'SubGoal'> | string;
      title?: StringFilter<'SubGoal'> | string;
      description?: StringNullableFilter<'SubGoal'> | string | null;
      background?: StringNullableFilter<'SubGoal'> | string | null;
      constraints?: StringNullableFilter<'SubGoal'> | string | null;
      position?: IntFilter<'SubGoal'> | number;
      progress?: IntFilter<'SubGoal'> | number;
      createdAt?: DateTimeFilter<'SubGoal'> | Date | string;
      updatedAt?: DateTimeFilter<'SubGoal'> | Date | string;
      goal?: XOR<GoalRelationFilter, GoalWhereInput>;
      actions?: ActionListRelationFilter;
    },
    'id' | 'goalId_position'
  >;

  export type SubGoalOrderByWithAggregationInput = {
    id?: SortOrder;
    goalId?: SortOrder;
    title?: SortOrder;
    description?: SortOrderInput | SortOrder;
    background?: SortOrderInput | SortOrder;
    constraints?: SortOrderInput | SortOrder;
    position?: SortOrder;
    progress?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    _count?: SubGoalCountOrderByAggregateInput;
    _avg?: SubGoalAvgOrderByAggregateInput;
    _max?: SubGoalMaxOrderByAggregateInput;
    _min?: SubGoalMinOrderByAggregateInput;
    _sum?: SubGoalSumOrderByAggregateInput;
  };

  export type SubGoalScalarWhereWithAggregatesInput = {
    AND?: SubGoalScalarWhereWithAggregatesInput | SubGoalScalarWhereWithAggregatesInput[];
    OR?: SubGoalScalarWhereWithAggregatesInput[];
    NOT?: SubGoalScalarWhereWithAggregatesInput | SubGoalScalarWhereWithAggregatesInput[];
    id?: UuidWithAggregatesFilter<'SubGoal'> | string;
    goalId?: UuidWithAggregatesFilter<'SubGoal'> | string;
    title?: StringWithAggregatesFilter<'SubGoal'> | string;
    description?: StringNullableWithAggregatesFilter<'SubGoal'> | string | null;
    background?: StringNullableWithAggregatesFilter<'SubGoal'> | string | null;
    constraints?: StringNullableWithAggregatesFilter<'SubGoal'> | string | null;
    position?: IntWithAggregatesFilter<'SubGoal'> | number;
    progress?: IntWithAggregatesFilter<'SubGoal'> | number;
    createdAt?: DateTimeWithAggregatesFilter<'SubGoal'> | Date | string;
    updatedAt?: DateTimeWithAggregatesFilter<'SubGoal'> | Date | string;
  };

  export type ActionWhereInput = {
    AND?: ActionWhereInput | ActionWhereInput[];
    OR?: ActionWhereInput[];
    NOT?: ActionWhereInput | ActionWhereInput[];
    id?: UuidFilter<'Action'> | string;
    subGoalId?: UuidFilter<'Action'> | string;
    title?: StringFilter<'Action'> | string;
    description?: StringNullableFilter<'Action'> | string | null;
    background?: StringNullableFilter<'Action'> | string | null;
    constraints?: StringNullableFilter<'Action'> | string | null;
    position?: IntFilter<'Action'> | number;
    progress?: IntFilter<'Action'> | number;
    createdAt?: DateTimeFilter<'Action'> | Date | string;
    updatedAt?: DateTimeFilter<'Action'> | Date | string;
    subGoal?: XOR<SubGoalRelationFilter, SubGoalWhereInput>;
    tasks?: TaskListRelationFilter;
  };

  export type ActionOrderByWithRelationInput = {
    id?: SortOrder;
    subGoalId?: SortOrder;
    title?: SortOrder;
    description?: SortOrderInput | SortOrder;
    background?: SortOrderInput | SortOrder;
    constraints?: SortOrderInput | SortOrder;
    position?: SortOrder;
    progress?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    subGoal?: SubGoalOrderByWithRelationInput;
    tasks?: TaskOrderByRelationAggregateInput;
  };

  export type ActionWhereUniqueInput = Prisma.AtLeast<
    {
      id?: string;
      subGoalId_position?: ActionSubGoalIdPositionCompoundUniqueInput;
      AND?: ActionWhereInput | ActionWhereInput[];
      OR?: ActionWhereInput[];
      NOT?: ActionWhereInput | ActionWhereInput[];
      subGoalId?: UuidFilter<'Action'> | string;
      title?: StringFilter<'Action'> | string;
      description?: StringNullableFilter<'Action'> | string | null;
      background?: StringNullableFilter<'Action'> | string | null;
      constraints?: StringNullableFilter<'Action'> | string | null;
      position?: IntFilter<'Action'> | number;
      progress?: IntFilter<'Action'> | number;
      createdAt?: DateTimeFilter<'Action'> | Date | string;
      updatedAt?: DateTimeFilter<'Action'> | Date | string;
      subGoal?: XOR<SubGoalRelationFilter, SubGoalWhereInput>;
      tasks?: TaskListRelationFilter;
    },
    'id' | 'subGoalId_position'
  >;

  export type ActionOrderByWithAggregationInput = {
    id?: SortOrder;
    subGoalId?: SortOrder;
    title?: SortOrder;
    description?: SortOrderInput | SortOrder;
    background?: SortOrderInput | SortOrder;
    constraints?: SortOrderInput | SortOrder;
    position?: SortOrder;
    progress?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    _count?: ActionCountOrderByAggregateInput;
    _avg?: ActionAvgOrderByAggregateInput;
    _max?: ActionMaxOrderByAggregateInput;
    _min?: ActionMinOrderByAggregateInput;
    _sum?: ActionSumOrderByAggregateInput;
  };

  export type ActionScalarWhereWithAggregatesInput = {
    AND?: ActionScalarWhereWithAggregatesInput | ActionScalarWhereWithAggregatesInput[];
    OR?: ActionScalarWhereWithAggregatesInput[];
    NOT?: ActionScalarWhereWithAggregatesInput | ActionScalarWhereWithAggregatesInput[];
    id?: UuidWithAggregatesFilter<'Action'> | string;
    subGoalId?: UuidWithAggregatesFilter<'Action'> | string;
    title?: StringWithAggregatesFilter<'Action'> | string;
    description?: StringNullableWithAggregatesFilter<'Action'> | string | null;
    background?: StringNullableWithAggregatesFilter<'Action'> | string | null;
    constraints?: StringNullableWithAggregatesFilter<'Action'> | string | null;
    position?: IntWithAggregatesFilter<'Action'> | number;
    progress?: IntWithAggregatesFilter<'Action'> | number;
    createdAt?: DateTimeWithAggregatesFilter<'Action'> | Date | string;
    updatedAt?: DateTimeWithAggregatesFilter<'Action'> | Date | string;
  };

  export type TaskWhereInput = {
    AND?: TaskWhereInput | TaskWhereInput[];
    OR?: TaskWhereInput[];
    NOT?: TaskWhereInput | TaskWhereInput[];
    id?: UuidFilter<'Task'> | string;
    actionId?: UuidFilter<'Task'> | string;
    title?: StringFilter<'Task'> | string;
    description?: StringNullableFilter<'Task'> | string | null;
    type?: EnumTaskTypeFilter<'Task'> | $Enums.TaskType;
    status?: EnumTaskStatusFilter<'Task'> | $Enums.TaskStatus;
    estimatedTime?: IntNullableFilter<'Task'> | number | null;
    completedAt?: DateTimeNullableFilter<'Task'> | Date | string | null;
    createdAt?: DateTimeFilter<'Task'> | Date | string;
    updatedAt?: DateTimeFilter<'Task'> | Date | string;
    action?: XOR<ActionRelationFilter, ActionWhereInput>;
    reminders?: TaskReminderListRelationFilter;
    reflections?: ReflectionListRelationFilter;
  };

  export type TaskOrderByWithRelationInput = {
    id?: SortOrder;
    actionId?: SortOrder;
    title?: SortOrder;
    description?: SortOrderInput | SortOrder;
    type?: SortOrder;
    status?: SortOrder;
    estimatedTime?: SortOrderInput | SortOrder;
    completedAt?: SortOrderInput | SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    action?: ActionOrderByWithRelationInput;
    reminders?: TaskReminderOrderByRelationAggregateInput;
    reflections?: ReflectionOrderByRelationAggregateInput;
  };

  export type TaskWhereUniqueInput = Prisma.AtLeast<
    {
      id?: string;
      AND?: TaskWhereInput | TaskWhereInput[];
      OR?: TaskWhereInput[];
      NOT?: TaskWhereInput | TaskWhereInput[];
      actionId?: UuidFilter<'Task'> | string;
      title?: StringFilter<'Task'> | string;
      description?: StringNullableFilter<'Task'> | string | null;
      type?: EnumTaskTypeFilter<'Task'> | $Enums.TaskType;
      status?: EnumTaskStatusFilter<'Task'> | $Enums.TaskStatus;
      estimatedTime?: IntNullableFilter<'Task'> | number | null;
      completedAt?: DateTimeNullableFilter<'Task'> | Date | string | null;
      createdAt?: DateTimeFilter<'Task'> | Date | string;
      updatedAt?: DateTimeFilter<'Task'> | Date | string;
      action?: XOR<ActionRelationFilter, ActionWhereInput>;
      reminders?: TaskReminderListRelationFilter;
      reflections?: ReflectionListRelationFilter;
    },
    'id'
  >;

  export type TaskOrderByWithAggregationInput = {
    id?: SortOrder;
    actionId?: SortOrder;
    title?: SortOrder;
    description?: SortOrderInput | SortOrder;
    type?: SortOrder;
    status?: SortOrder;
    estimatedTime?: SortOrderInput | SortOrder;
    completedAt?: SortOrderInput | SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    _count?: TaskCountOrderByAggregateInput;
    _avg?: TaskAvgOrderByAggregateInput;
    _max?: TaskMaxOrderByAggregateInput;
    _min?: TaskMinOrderByAggregateInput;
    _sum?: TaskSumOrderByAggregateInput;
  };

  export type TaskScalarWhereWithAggregatesInput = {
    AND?: TaskScalarWhereWithAggregatesInput | TaskScalarWhereWithAggregatesInput[];
    OR?: TaskScalarWhereWithAggregatesInput[];
    NOT?: TaskScalarWhereWithAggregatesInput | TaskScalarWhereWithAggregatesInput[];
    id?: UuidWithAggregatesFilter<'Task'> | string;
    actionId?: UuidWithAggregatesFilter<'Task'> | string;
    title?: StringWithAggregatesFilter<'Task'> | string;
    description?: StringNullableWithAggregatesFilter<'Task'> | string | null;
    type?: EnumTaskTypeWithAggregatesFilter<'Task'> | $Enums.TaskType;
    status?: EnumTaskStatusWithAggregatesFilter<'Task'> | $Enums.TaskStatus;
    estimatedTime?: IntNullableWithAggregatesFilter<'Task'> | number | null;
    completedAt?: DateTimeNullableWithAggregatesFilter<'Task'> | Date | string | null;
    createdAt?: DateTimeWithAggregatesFilter<'Task'> | Date | string;
    updatedAt?: DateTimeWithAggregatesFilter<'Task'> | Date | string;
  };

  export type TaskReminderWhereInput = {
    AND?: TaskReminderWhereInput | TaskReminderWhereInput[];
    OR?: TaskReminderWhereInput[];
    NOT?: TaskReminderWhereInput | TaskReminderWhereInput[];
    id?: UuidFilter<'TaskReminder'> | string;
    taskId?: UuidFilter<'TaskReminder'> | string;
    reminderAt?: DateTimeFilter<'TaskReminder'> | Date | string;
    message?: StringNullableFilter<'TaskReminder'> | string | null;
    status?: EnumReminderStatusFilter<'TaskReminder'> | $Enums.ReminderStatus;
    sentAt?: DateTimeNullableFilter<'TaskReminder'> | Date | string | null;
    createdAt?: DateTimeFilter<'TaskReminder'> | Date | string;
    updatedAt?: DateTimeFilter<'TaskReminder'> | Date | string;
    task?: XOR<TaskRelationFilter, TaskWhereInput>;
  };

  export type TaskReminderOrderByWithRelationInput = {
    id?: SortOrder;
    taskId?: SortOrder;
    reminderAt?: SortOrder;
    message?: SortOrderInput | SortOrder;
    status?: SortOrder;
    sentAt?: SortOrderInput | SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    task?: TaskOrderByWithRelationInput;
  };

  export type TaskReminderWhereUniqueInput = Prisma.AtLeast<
    {
      id?: string;
      AND?: TaskReminderWhereInput | TaskReminderWhereInput[];
      OR?: TaskReminderWhereInput[];
      NOT?: TaskReminderWhereInput | TaskReminderWhereInput[];
      taskId?: UuidFilter<'TaskReminder'> | string;
      reminderAt?: DateTimeFilter<'TaskReminder'> | Date | string;
      message?: StringNullableFilter<'TaskReminder'> | string | null;
      status?: EnumReminderStatusFilter<'TaskReminder'> | $Enums.ReminderStatus;
      sentAt?: DateTimeNullableFilter<'TaskReminder'> | Date | string | null;
      createdAt?: DateTimeFilter<'TaskReminder'> | Date | string;
      updatedAt?: DateTimeFilter<'TaskReminder'> | Date | string;
      task?: XOR<TaskRelationFilter, TaskWhereInput>;
    },
    'id'
  >;

  export type TaskReminderOrderByWithAggregationInput = {
    id?: SortOrder;
    taskId?: SortOrder;
    reminderAt?: SortOrder;
    message?: SortOrderInput | SortOrder;
    status?: SortOrder;
    sentAt?: SortOrderInput | SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    _count?: TaskReminderCountOrderByAggregateInput;
    _max?: TaskReminderMaxOrderByAggregateInput;
    _min?: TaskReminderMinOrderByAggregateInput;
  };

  export type TaskReminderScalarWhereWithAggregatesInput = {
    AND?: TaskReminderScalarWhereWithAggregatesInput | TaskReminderScalarWhereWithAggregatesInput[];
    OR?: TaskReminderScalarWhereWithAggregatesInput[];
    NOT?: TaskReminderScalarWhereWithAggregatesInput | TaskReminderScalarWhereWithAggregatesInput[];
    id?: UuidWithAggregatesFilter<'TaskReminder'> | string;
    taskId?: UuidWithAggregatesFilter<'TaskReminder'> | string;
    reminderAt?: DateTimeWithAggregatesFilter<'TaskReminder'> | Date | string;
    message?: StringNullableWithAggregatesFilter<'TaskReminder'> | string | null;
    status?: EnumReminderStatusWithAggregatesFilter<'TaskReminder'> | $Enums.ReminderStatus;
    sentAt?: DateTimeNullableWithAggregatesFilter<'TaskReminder'> | Date | string | null;
    createdAt?: DateTimeWithAggregatesFilter<'TaskReminder'> | Date | string;
    updatedAt?: DateTimeWithAggregatesFilter<'TaskReminder'> | Date | string;
  };

  export type ReflectionWhereInput = {
    AND?: ReflectionWhereInput | ReflectionWhereInput[];
    OR?: ReflectionWhereInput[];
    NOT?: ReflectionWhereInput | ReflectionWhereInput[];
    id?: UuidFilter<'Reflection'> | string;
    taskId?: UuidFilter<'Reflection'> | string;
    content?: StringFilter<'Reflection'> | string;
    rating?: IntNullableFilter<'Reflection'> | number | null;
    createdAt?: DateTimeFilter<'Reflection'> | Date | string;
    updatedAt?: DateTimeFilter<'Reflection'> | Date | string;
    task?: XOR<TaskRelationFilter, TaskWhereInput>;
  };

  export type ReflectionOrderByWithRelationInput = {
    id?: SortOrder;
    taskId?: SortOrder;
    content?: SortOrder;
    rating?: SortOrderInput | SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    task?: TaskOrderByWithRelationInput;
  };

  export type ReflectionWhereUniqueInput = Prisma.AtLeast<
    {
      id?: string;
      AND?: ReflectionWhereInput | ReflectionWhereInput[];
      OR?: ReflectionWhereInput[];
      NOT?: ReflectionWhereInput | ReflectionWhereInput[];
      taskId?: UuidFilter<'Reflection'> | string;
      content?: StringFilter<'Reflection'> | string;
      rating?: IntNullableFilter<'Reflection'> | number | null;
      createdAt?: DateTimeFilter<'Reflection'> | Date | string;
      updatedAt?: DateTimeFilter<'Reflection'> | Date | string;
      task?: XOR<TaskRelationFilter, TaskWhereInput>;
    },
    'id'
  >;

  export type ReflectionOrderByWithAggregationInput = {
    id?: SortOrder;
    taskId?: SortOrder;
    content?: SortOrder;
    rating?: SortOrderInput | SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    _count?: ReflectionCountOrderByAggregateInput;
    _avg?: ReflectionAvgOrderByAggregateInput;
    _max?: ReflectionMaxOrderByAggregateInput;
    _min?: ReflectionMinOrderByAggregateInput;
    _sum?: ReflectionSumOrderByAggregateInput;
  };

  export type ReflectionScalarWhereWithAggregatesInput = {
    AND?: ReflectionScalarWhereWithAggregatesInput | ReflectionScalarWhereWithAggregatesInput[];
    OR?: ReflectionScalarWhereWithAggregatesInput[];
    NOT?: ReflectionScalarWhereWithAggregatesInput | ReflectionScalarWhereWithAggregatesInput[];
    id?: UuidWithAggregatesFilter<'Reflection'> | string;
    taskId?: UuidWithAggregatesFilter<'Reflection'> | string;
    content?: StringWithAggregatesFilter<'Reflection'> | string;
    rating?: IntNullableWithAggregatesFilter<'Reflection'> | number | null;
    createdAt?: DateTimeWithAggregatesFilter<'Reflection'> | Date | string;
    updatedAt?: DateTimeWithAggregatesFilter<'Reflection'> | Date | string;
  };

  export type UserCreateInput = {
    id?: string;
    email: string;
    name: string;
    industry?: $Enums.UserIndustry | null;
    companySize?: $Enums.CompanySize | null;
    jobType?: string | null;
    position?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    goals?: GoalCreateNestedManyWithoutUserInput;
  };

  export type UserUncheckedCreateInput = {
    id?: string;
    email: string;
    name: string;
    industry?: $Enums.UserIndustry | null;
    companySize?: $Enums.CompanySize | null;
    jobType?: string | null;
    position?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    goals?: GoalUncheckedCreateNestedManyWithoutUserInput;
  };

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    email?: StringFieldUpdateOperationsInput | string;
    name?: StringFieldUpdateOperationsInput | string;
    industry?: NullableEnumUserIndustryFieldUpdateOperationsInput | $Enums.UserIndustry | null;
    companySize?: NullableEnumCompanySizeFieldUpdateOperationsInput | $Enums.CompanySize | null;
    jobType?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    goals?: GoalUpdateManyWithoutUserNestedInput;
  };

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    email?: StringFieldUpdateOperationsInput | string;
    name?: StringFieldUpdateOperationsInput | string;
    industry?: NullableEnumUserIndustryFieldUpdateOperationsInput | $Enums.UserIndustry | null;
    companySize?: NullableEnumCompanySizeFieldUpdateOperationsInput | $Enums.CompanySize | null;
    jobType?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    goals?: GoalUncheckedUpdateManyWithoutUserNestedInput;
  };

  export type UserCreateManyInput = {
    id?: string;
    email: string;
    name: string;
    industry?: $Enums.UserIndustry | null;
    companySize?: $Enums.CompanySize | null;
    jobType?: string | null;
    position?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string;
    email?: StringFieldUpdateOperationsInput | string;
    name?: StringFieldUpdateOperationsInput | string;
    industry?: NullableEnumUserIndustryFieldUpdateOperationsInput | $Enums.UserIndustry | null;
    companySize?: NullableEnumCompanySizeFieldUpdateOperationsInput | $Enums.CompanySize | null;
    jobType?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string;
    email?: StringFieldUpdateOperationsInput | string;
    name?: StringFieldUpdateOperationsInput | string;
    industry?: NullableEnumUserIndustryFieldUpdateOperationsInput | $Enums.UserIndustry | null;
    companySize?: NullableEnumCompanySizeFieldUpdateOperationsInput | $Enums.CompanySize | null;
    jobType?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type GoalCreateInput = {
    id?: string;
    title: string;
    description?: string | null;
    deadline?: Date | string | null;
    background?: string | null;
    constraints?: string | null;
    status?: $Enums.GoalStatus;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: UserCreateNestedOneWithoutGoalsInput;
    subGoals?: SubGoalCreateNestedManyWithoutGoalInput;
  };

  export type GoalUncheckedCreateInput = {
    id?: string;
    userId: string;
    title: string;
    description?: string | null;
    deadline?: Date | string | null;
    background?: string | null;
    constraints?: string | null;
    status?: $Enums.GoalStatus;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    subGoals?: SubGoalUncheckedCreateNestedManyWithoutGoalInput;
  };

  export type GoalUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumGoalStatusFieldUpdateOperationsInput | $Enums.GoalStatus;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    user?: UserUpdateOneRequiredWithoutGoalsNestedInput;
    subGoals?: SubGoalUpdateManyWithoutGoalNestedInput;
  };

  export type GoalUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    userId?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumGoalStatusFieldUpdateOperationsInput | $Enums.GoalStatus;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    subGoals?: SubGoalUncheckedUpdateManyWithoutGoalNestedInput;
  };

  export type GoalCreateManyInput = {
    id?: string;
    userId: string;
    title: string;
    description?: string | null;
    deadline?: Date | string | null;
    background?: string | null;
    constraints?: string | null;
    status?: $Enums.GoalStatus;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type GoalUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumGoalStatusFieldUpdateOperationsInput | $Enums.GoalStatus;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type GoalUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string;
    userId?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumGoalStatusFieldUpdateOperationsInput | $Enums.GoalStatus;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type SubGoalCreateInput = {
    id?: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    goal: GoalCreateNestedOneWithoutSubGoalsInput;
    actions?: ActionCreateNestedManyWithoutSubGoalInput;
  };

  export type SubGoalUncheckedCreateInput = {
    id?: string;
    goalId: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    actions?: ActionUncheckedCreateNestedManyWithoutSubGoalInput;
  };

  export type SubGoalUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    goal?: GoalUpdateOneRequiredWithoutSubGoalsNestedInput;
    actions?: ActionUpdateManyWithoutSubGoalNestedInput;
  };

  export type SubGoalUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    goalId?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    actions?: ActionUncheckedUpdateManyWithoutSubGoalNestedInput;
  };

  export type SubGoalCreateManyInput = {
    id?: string;
    goalId: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type SubGoalUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type SubGoalUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string;
    goalId?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type ActionCreateInput = {
    id?: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    subGoal: SubGoalCreateNestedOneWithoutActionsInput;
    tasks?: TaskCreateNestedManyWithoutActionInput;
  };

  export type ActionUncheckedCreateInput = {
    id?: string;
    subGoalId: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    tasks?: TaskUncheckedCreateNestedManyWithoutActionInput;
  };

  export type ActionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    subGoal?: SubGoalUpdateOneRequiredWithoutActionsNestedInput;
    tasks?: TaskUpdateManyWithoutActionNestedInput;
  };

  export type ActionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    subGoalId?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    tasks?: TaskUncheckedUpdateManyWithoutActionNestedInput;
  };

  export type ActionCreateManyInput = {
    id?: string;
    subGoalId: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type ActionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type ActionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string;
    subGoalId?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TaskCreateInput = {
    id?: string;
    title: string;
    description?: string | null;
    type?: $Enums.TaskType;
    status?: $Enums.TaskStatus;
    estimatedTime?: number | null;
    completedAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    action: ActionCreateNestedOneWithoutTasksInput;
    reminders?: TaskReminderCreateNestedManyWithoutTaskInput;
    reflections?: ReflectionCreateNestedManyWithoutTaskInput;
  };

  export type TaskUncheckedCreateInput = {
    id?: string;
    actionId: string;
    title: string;
    description?: string | null;
    type?: $Enums.TaskType;
    status?: $Enums.TaskStatus;
    estimatedTime?: number | null;
    completedAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    reminders?: TaskReminderUncheckedCreateNestedManyWithoutTaskInput;
    reflections?: ReflectionUncheckedCreateNestedManyWithoutTaskInput;
  };

  export type TaskUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    type?: EnumTaskTypeFieldUpdateOperationsInput | $Enums.TaskType;
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus;
    estimatedTime?: NullableIntFieldUpdateOperationsInput | number | null;
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    action?: ActionUpdateOneRequiredWithoutTasksNestedInput;
    reminders?: TaskReminderUpdateManyWithoutTaskNestedInput;
    reflections?: ReflectionUpdateManyWithoutTaskNestedInput;
  };

  export type TaskUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    actionId?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    type?: EnumTaskTypeFieldUpdateOperationsInput | $Enums.TaskType;
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus;
    estimatedTime?: NullableIntFieldUpdateOperationsInput | number | null;
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    reminders?: TaskReminderUncheckedUpdateManyWithoutTaskNestedInput;
    reflections?: ReflectionUncheckedUpdateManyWithoutTaskNestedInput;
  };

  export type TaskCreateManyInput = {
    id?: string;
    actionId: string;
    title: string;
    description?: string | null;
    type?: $Enums.TaskType;
    status?: $Enums.TaskStatus;
    estimatedTime?: number | null;
    completedAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type TaskUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    type?: EnumTaskTypeFieldUpdateOperationsInput | $Enums.TaskType;
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus;
    estimatedTime?: NullableIntFieldUpdateOperationsInput | number | null;
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TaskUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string;
    actionId?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    type?: EnumTaskTypeFieldUpdateOperationsInput | $Enums.TaskType;
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus;
    estimatedTime?: NullableIntFieldUpdateOperationsInput | number | null;
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TaskReminderCreateInput = {
    id?: string;
    reminderAt: Date | string;
    message?: string | null;
    status?: $Enums.ReminderStatus;
    sentAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    task: TaskCreateNestedOneWithoutRemindersInput;
  };

  export type TaskReminderUncheckedCreateInput = {
    id?: string;
    taskId: string;
    reminderAt: Date | string;
    message?: string | null;
    status?: $Enums.ReminderStatus;
    sentAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type TaskReminderUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    reminderAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    message?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumReminderStatusFieldUpdateOperationsInput | $Enums.ReminderStatus;
    sentAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    task?: TaskUpdateOneRequiredWithoutRemindersNestedInput;
  };

  export type TaskReminderUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    taskId?: StringFieldUpdateOperationsInput | string;
    reminderAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    message?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumReminderStatusFieldUpdateOperationsInput | $Enums.ReminderStatus;
    sentAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TaskReminderCreateManyInput = {
    id?: string;
    taskId: string;
    reminderAt: Date | string;
    message?: string | null;
    status?: $Enums.ReminderStatus;
    sentAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type TaskReminderUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string;
    reminderAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    message?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumReminderStatusFieldUpdateOperationsInput | $Enums.ReminderStatus;
    sentAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TaskReminderUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string;
    taskId?: StringFieldUpdateOperationsInput | string;
    reminderAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    message?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumReminderStatusFieldUpdateOperationsInput | $Enums.ReminderStatus;
    sentAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type ReflectionCreateInput = {
    id?: string;
    content: string;
    rating?: number | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    task: TaskCreateNestedOneWithoutReflectionsInput;
  };

  export type ReflectionUncheckedCreateInput = {
    id?: string;
    taskId: string;
    content: string;
    rating?: number | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type ReflectionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    content?: StringFieldUpdateOperationsInput | string;
    rating?: NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    task?: TaskUpdateOneRequiredWithoutReflectionsNestedInput;
  };

  export type ReflectionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string;
    taskId?: StringFieldUpdateOperationsInput | string;
    content?: StringFieldUpdateOperationsInput | string;
    rating?: NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type ReflectionCreateManyInput = {
    id?: string;
    taskId: string;
    content: string;
    rating?: number | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type ReflectionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string;
    content?: StringFieldUpdateOperationsInput | string;
    rating?: NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type ReflectionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string;
    taskId?: StringFieldUpdateOperationsInput | string;
    content?: StringFieldUpdateOperationsInput | string;
    rating?: NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>;
    in?: string[] | ListStringFieldRefInput<$PrismaModel>;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    mode?: QueryMode;
    not?: NestedUuidFilter<$PrismaModel> | string;
  };

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>;
    in?: string[] | ListStringFieldRefInput<$PrismaModel>;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    contains?: string | StringFieldRefInput<$PrismaModel>;
    startsWith?: string | StringFieldRefInput<$PrismaModel>;
    endsWith?: string | StringFieldRefInput<$PrismaModel>;
    mode?: QueryMode;
    not?: NestedStringFilter<$PrismaModel> | string;
  };

  export type EnumUserIndustryNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.UserIndustry | EnumUserIndustryFieldRefInput<$PrismaModel> | null;
    in?: $Enums.UserIndustry[] | ListEnumUserIndustryFieldRefInput<$PrismaModel> | null;
    notIn?: $Enums.UserIndustry[] | ListEnumUserIndustryFieldRefInput<$PrismaModel> | null;
    not?: NestedEnumUserIndustryNullableFilter<$PrismaModel> | $Enums.UserIndustry | null;
  };

  export type EnumCompanySizeNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.CompanySize | EnumCompanySizeFieldRefInput<$PrismaModel> | null;
    in?: $Enums.CompanySize[] | ListEnumCompanySizeFieldRefInput<$PrismaModel> | null;
    notIn?: $Enums.CompanySize[] | ListEnumCompanySizeFieldRefInput<$PrismaModel> | null;
    not?: NestedEnumCompanySizeNullableFilter<$PrismaModel> | $Enums.CompanySize | null;
  };

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null;
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    contains?: string | StringFieldRefInput<$PrismaModel>;
    startsWith?: string | StringFieldRefInput<$PrismaModel>;
    endsWith?: string | StringFieldRefInput<$PrismaModel>;
    mode?: QueryMode;
    not?: NestedStringNullableFilter<$PrismaModel> | string | null;
  };

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string;
  };

  export type GoalListRelationFilter = {
    every?: GoalWhereInput;
    some?: GoalWhereInput;
    none?: GoalWhereInput;
  };

  export type SortOrderInput = {
    sort: SortOrder;
    nulls?: NullsOrder;
  };

  export type GoalOrderByRelationAggregateInput = {
    _count?: SortOrder;
  };

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder;
    email?: SortOrder;
    name?: SortOrder;
    industry?: SortOrder;
    companySize?: SortOrder;
    jobType?: SortOrder;
    position?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder;
    email?: SortOrder;
    name?: SortOrder;
    industry?: SortOrder;
    companySize?: SortOrder;
    jobType?: SortOrder;
    position?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder;
    email?: SortOrder;
    name?: SortOrder;
    industry?: SortOrder;
    companySize?: SortOrder;
    jobType?: SortOrder;
    position?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>;
    in?: string[] | ListStringFieldRefInput<$PrismaModel>;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    mode?: QueryMode;
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedStringFilter<$PrismaModel>;
    _max?: NestedStringFilter<$PrismaModel>;
  };

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>;
    in?: string[] | ListStringFieldRefInput<$PrismaModel>;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    contains?: string | StringFieldRefInput<$PrismaModel>;
    startsWith?: string | StringFieldRefInput<$PrismaModel>;
    endsWith?: string | StringFieldRefInput<$PrismaModel>;
    mode?: QueryMode;
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedStringFilter<$PrismaModel>;
    _max?: NestedStringFilter<$PrismaModel>;
  };

  export type EnumUserIndustryNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserIndustry | EnumUserIndustryFieldRefInput<$PrismaModel> | null;
    in?: $Enums.UserIndustry[] | ListEnumUserIndustryFieldRefInput<$PrismaModel> | null;
    notIn?: $Enums.UserIndustry[] | ListEnumUserIndustryFieldRefInput<$PrismaModel> | null;
    not?:
      | NestedEnumUserIndustryNullableWithAggregatesFilter<$PrismaModel>
      | $Enums.UserIndustry
      | null;
    _count?: NestedIntNullableFilter<$PrismaModel>;
    _min?: NestedEnumUserIndustryNullableFilter<$PrismaModel>;
    _max?: NestedEnumUserIndustryNullableFilter<$PrismaModel>;
  };

  export type EnumCompanySizeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CompanySize | EnumCompanySizeFieldRefInput<$PrismaModel> | null;
    in?: $Enums.CompanySize[] | ListEnumCompanySizeFieldRefInput<$PrismaModel> | null;
    notIn?: $Enums.CompanySize[] | ListEnumCompanySizeFieldRefInput<$PrismaModel> | null;
    not?:
      | NestedEnumCompanySizeNullableWithAggregatesFilter<$PrismaModel>
      | $Enums.CompanySize
      | null;
    _count?: NestedIntNullableFilter<$PrismaModel>;
    _min?: NestedEnumCompanySizeNullableFilter<$PrismaModel>;
    _max?: NestedEnumCompanySizeNullableFilter<$PrismaModel>;
  };

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null;
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    contains?: string | StringFieldRefInput<$PrismaModel>;
    startsWith?: string | StringFieldRefInput<$PrismaModel>;
    endsWith?: string | StringFieldRefInput<$PrismaModel>;
    mode?: QueryMode;
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null;
    _count?: NestedIntNullableFilter<$PrismaModel>;
    _min?: NestedStringNullableFilter<$PrismaModel>;
    _max?: NestedStringNullableFilter<$PrismaModel>;
  };

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedDateTimeFilter<$PrismaModel>;
    _max?: NestedDateTimeFilter<$PrismaModel>;
  };

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null;
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null;
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null;
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null;
  };

  export type EnumGoalStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.GoalStatus | EnumGoalStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.GoalStatus[] | ListEnumGoalStatusFieldRefInput<$PrismaModel>;
    notIn?: $Enums.GoalStatus[] | ListEnumGoalStatusFieldRefInput<$PrismaModel>;
    not?: NestedEnumGoalStatusFilter<$PrismaModel> | $Enums.GoalStatus;
  };

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>;
    in?: number[] | ListIntFieldRefInput<$PrismaModel>;
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>;
    lt?: number | IntFieldRefInput<$PrismaModel>;
    lte?: number | IntFieldRefInput<$PrismaModel>;
    gt?: number | IntFieldRefInput<$PrismaModel>;
    gte?: number | IntFieldRefInput<$PrismaModel>;
    not?: NestedIntFilter<$PrismaModel> | number;
  };

  export type UserRelationFilter = {
    is?: UserWhereInput;
    isNot?: UserWhereInput;
  };

  export type SubGoalListRelationFilter = {
    every?: SubGoalWhereInput;
    some?: SubGoalWhereInput;
    none?: SubGoalWhereInput;
  };

  export type SubGoalOrderByRelationAggregateInput = {
    _count?: SortOrder;
  };

  export type GoalCountOrderByAggregateInput = {
    id?: SortOrder;
    userId?: SortOrder;
    title?: SortOrder;
    description?: SortOrder;
    deadline?: SortOrder;
    background?: SortOrder;
    constraints?: SortOrder;
    status?: SortOrder;
    progress?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type GoalAvgOrderByAggregateInput = {
    progress?: SortOrder;
  };

  export type GoalMaxOrderByAggregateInput = {
    id?: SortOrder;
    userId?: SortOrder;
    title?: SortOrder;
    description?: SortOrder;
    deadline?: SortOrder;
    background?: SortOrder;
    constraints?: SortOrder;
    status?: SortOrder;
    progress?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type GoalMinOrderByAggregateInput = {
    id?: SortOrder;
    userId?: SortOrder;
    title?: SortOrder;
    description?: SortOrder;
    deadline?: SortOrder;
    background?: SortOrder;
    constraints?: SortOrder;
    status?: SortOrder;
    progress?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type GoalSumOrderByAggregateInput = {
    progress?: SortOrder;
  };

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null;
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null;
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null;
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null;
    _count?: NestedIntNullableFilter<$PrismaModel>;
    _min?: NestedDateTimeNullableFilter<$PrismaModel>;
    _max?: NestedDateTimeNullableFilter<$PrismaModel>;
  };

  export type EnumGoalStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.GoalStatus | EnumGoalStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.GoalStatus[] | ListEnumGoalStatusFieldRefInput<$PrismaModel>;
    notIn?: $Enums.GoalStatus[] | ListEnumGoalStatusFieldRefInput<$PrismaModel>;
    not?: NestedEnumGoalStatusWithAggregatesFilter<$PrismaModel> | $Enums.GoalStatus;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedEnumGoalStatusFilter<$PrismaModel>;
    _max?: NestedEnumGoalStatusFilter<$PrismaModel>;
  };

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>;
    in?: number[] | ListIntFieldRefInput<$PrismaModel>;
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>;
    lt?: number | IntFieldRefInput<$PrismaModel>;
    lte?: number | IntFieldRefInput<$PrismaModel>;
    gt?: number | IntFieldRefInput<$PrismaModel>;
    gte?: number | IntFieldRefInput<$PrismaModel>;
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number;
    _count?: NestedIntFilter<$PrismaModel>;
    _avg?: NestedFloatFilter<$PrismaModel>;
    _sum?: NestedIntFilter<$PrismaModel>;
    _min?: NestedIntFilter<$PrismaModel>;
    _max?: NestedIntFilter<$PrismaModel>;
  };

  export type GoalRelationFilter = {
    is?: GoalWhereInput;
    isNot?: GoalWhereInput;
  };

  export type ActionListRelationFilter = {
    every?: ActionWhereInput;
    some?: ActionWhereInput;
    none?: ActionWhereInput;
  };

  export type ActionOrderByRelationAggregateInput = {
    _count?: SortOrder;
  };

  export type SubGoalGoalIdPositionCompoundUniqueInput = {
    goalId: string;
    position: number;
  };

  export type SubGoalCountOrderByAggregateInput = {
    id?: SortOrder;
    goalId?: SortOrder;
    title?: SortOrder;
    description?: SortOrder;
    background?: SortOrder;
    constraints?: SortOrder;
    position?: SortOrder;
    progress?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type SubGoalAvgOrderByAggregateInput = {
    position?: SortOrder;
    progress?: SortOrder;
  };

  export type SubGoalMaxOrderByAggregateInput = {
    id?: SortOrder;
    goalId?: SortOrder;
    title?: SortOrder;
    description?: SortOrder;
    background?: SortOrder;
    constraints?: SortOrder;
    position?: SortOrder;
    progress?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type SubGoalMinOrderByAggregateInput = {
    id?: SortOrder;
    goalId?: SortOrder;
    title?: SortOrder;
    description?: SortOrder;
    background?: SortOrder;
    constraints?: SortOrder;
    position?: SortOrder;
    progress?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type SubGoalSumOrderByAggregateInput = {
    position?: SortOrder;
    progress?: SortOrder;
  };

  export type SubGoalRelationFilter = {
    is?: SubGoalWhereInput;
    isNot?: SubGoalWhereInput;
  };

  export type TaskListRelationFilter = {
    every?: TaskWhereInput;
    some?: TaskWhereInput;
    none?: TaskWhereInput;
  };

  export type TaskOrderByRelationAggregateInput = {
    _count?: SortOrder;
  };

  export type ActionSubGoalIdPositionCompoundUniqueInput = {
    subGoalId: string;
    position: number;
  };

  export type ActionCountOrderByAggregateInput = {
    id?: SortOrder;
    subGoalId?: SortOrder;
    title?: SortOrder;
    description?: SortOrder;
    background?: SortOrder;
    constraints?: SortOrder;
    position?: SortOrder;
    progress?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type ActionAvgOrderByAggregateInput = {
    position?: SortOrder;
    progress?: SortOrder;
  };

  export type ActionMaxOrderByAggregateInput = {
    id?: SortOrder;
    subGoalId?: SortOrder;
    title?: SortOrder;
    description?: SortOrder;
    background?: SortOrder;
    constraints?: SortOrder;
    position?: SortOrder;
    progress?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type ActionMinOrderByAggregateInput = {
    id?: SortOrder;
    subGoalId?: SortOrder;
    title?: SortOrder;
    description?: SortOrder;
    background?: SortOrder;
    constraints?: SortOrder;
    position?: SortOrder;
    progress?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type ActionSumOrderByAggregateInput = {
    position?: SortOrder;
    progress?: SortOrder;
  };

  export type EnumTaskTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskType | EnumTaskTypeFieldRefInput<$PrismaModel>;
    in?: $Enums.TaskType[] | ListEnumTaskTypeFieldRefInput<$PrismaModel>;
    notIn?: $Enums.TaskType[] | ListEnumTaskTypeFieldRefInput<$PrismaModel>;
    not?: NestedEnumTaskTypeFilter<$PrismaModel> | $Enums.TaskType;
  };

  export type EnumTaskStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskStatus | EnumTaskStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>;
    notIn?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>;
    not?: NestedEnumTaskStatusFilter<$PrismaModel> | $Enums.TaskStatus;
  };

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null;
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null;
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null;
    lt?: number | IntFieldRefInput<$PrismaModel>;
    lte?: number | IntFieldRefInput<$PrismaModel>;
    gt?: number | IntFieldRefInput<$PrismaModel>;
    gte?: number | IntFieldRefInput<$PrismaModel>;
    not?: NestedIntNullableFilter<$PrismaModel> | number | null;
  };

  export type ActionRelationFilter = {
    is?: ActionWhereInput;
    isNot?: ActionWhereInput;
  };

  export type TaskReminderListRelationFilter = {
    every?: TaskReminderWhereInput;
    some?: TaskReminderWhereInput;
    none?: TaskReminderWhereInput;
  };

  export type ReflectionListRelationFilter = {
    every?: ReflectionWhereInput;
    some?: ReflectionWhereInput;
    none?: ReflectionWhereInput;
  };

  export type TaskReminderOrderByRelationAggregateInput = {
    _count?: SortOrder;
  };

  export type ReflectionOrderByRelationAggregateInput = {
    _count?: SortOrder;
  };

  export type TaskCountOrderByAggregateInput = {
    id?: SortOrder;
    actionId?: SortOrder;
    title?: SortOrder;
    description?: SortOrder;
    type?: SortOrder;
    status?: SortOrder;
    estimatedTime?: SortOrder;
    completedAt?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type TaskAvgOrderByAggregateInput = {
    estimatedTime?: SortOrder;
  };

  export type TaskMaxOrderByAggregateInput = {
    id?: SortOrder;
    actionId?: SortOrder;
    title?: SortOrder;
    description?: SortOrder;
    type?: SortOrder;
    status?: SortOrder;
    estimatedTime?: SortOrder;
    completedAt?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type TaskMinOrderByAggregateInput = {
    id?: SortOrder;
    actionId?: SortOrder;
    title?: SortOrder;
    description?: SortOrder;
    type?: SortOrder;
    status?: SortOrder;
    estimatedTime?: SortOrder;
    completedAt?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type TaskSumOrderByAggregateInput = {
    estimatedTime?: SortOrder;
  };

  export type EnumTaskTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskType | EnumTaskTypeFieldRefInput<$PrismaModel>;
    in?: $Enums.TaskType[] | ListEnumTaskTypeFieldRefInput<$PrismaModel>;
    notIn?: $Enums.TaskType[] | ListEnumTaskTypeFieldRefInput<$PrismaModel>;
    not?: NestedEnumTaskTypeWithAggregatesFilter<$PrismaModel> | $Enums.TaskType;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedEnumTaskTypeFilter<$PrismaModel>;
    _max?: NestedEnumTaskTypeFilter<$PrismaModel>;
  };

  export type EnumTaskStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskStatus | EnumTaskStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>;
    notIn?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>;
    not?: NestedEnumTaskStatusWithAggregatesFilter<$PrismaModel> | $Enums.TaskStatus;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedEnumTaskStatusFilter<$PrismaModel>;
    _max?: NestedEnumTaskStatusFilter<$PrismaModel>;
  };

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null;
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null;
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null;
    lt?: number | IntFieldRefInput<$PrismaModel>;
    lte?: number | IntFieldRefInput<$PrismaModel>;
    gt?: number | IntFieldRefInput<$PrismaModel>;
    gte?: number | IntFieldRefInput<$PrismaModel>;
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null;
    _count?: NestedIntNullableFilter<$PrismaModel>;
    _avg?: NestedFloatNullableFilter<$PrismaModel>;
    _sum?: NestedIntNullableFilter<$PrismaModel>;
    _min?: NestedIntNullableFilter<$PrismaModel>;
    _max?: NestedIntNullableFilter<$PrismaModel>;
  };

  export type EnumReminderStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ReminderStatus | EnumReminderStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.ReminderStatus[] | ListEnumReminderStatusFieldRefInput<$PrismaModel>;
    notIn?: $Enums.ReminderStatus[] | ListEnumReminderStatusFieldRefInput<$PrismaModel>;
    not?: NestedEnumReminderStatusFilter<$PrismaModel> | $Enums.ReminderStatus;
  };

  export type TaskRelationFilter = {
    is?: TaskWhereInput;
    isNot?: TaskWhereInput;
  };

  export type TaskReminderCountOrderByAggregateInput = {
    id?: SortOrder;
    taskId?: SortOrder;
    reminderAt?: SortOrder;
    message?: SortOrder;
    status?: SortOrder;
    sentAt?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type TaskReminderMaxOrderByAggregateInput = {
    id?: SortOrder;
    taskId?: SortOrder;
    reminderAt?: SortOrder;
    message?: SortOrder;
    status?: SortOrder;
    sentAt?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type TaskReminderMinOrderByAggregateInput = {
    id?: SortOrder;
    taskId?: SortOrder;
    reminderAt?: SortOrder;
    message?: SortOrder;
    status?: SortOrder;
    sentAt?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type EnumReminderStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ReminderStatus | EnumReminderStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.ReminderStatus[] | ListEnumReminderStatusFieldRefInput<$PrismaModel>;
    notIn?: $Enums.ReminderStatus[] | ListEnumReminderStatusFieldRefInput<$PrismaModel>;
    not?: NestedEnumReminderStatusWithAggregatesFilter<$PrismaModel> | $Enums.ReminderStatus;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedEnumReminderStatusFilter<$PrismaModel>;
    _max?: NestedEnumReminderStatusFilter<$PrismaModel>;
  };

  export type ReflectionCountOrderByAggregateInput = {
    id?: SortOrder;
    taskId?: SortOrder;
    content?: SortOrder;
    rating?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type ReflectionAvgOrderByAggregateInput = {
    rating?: SortOrder;
  };

  export type ReflectionMaxOrderByAggregateInput = {
    id?: SortOrder;
    taskId?: SortOrder;
    content?: SortOrder;
    rating?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type ReflectionMinOrderByAggregateInput = {
    id?: SortOrder;
    taskId?: SortOrder;
    content?: SortOrder;
    rating?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
  };

  export type ReflectionSumOrderByAggregateInput = {
    rating?: SortOrder;
  };

  export type GoalCreateNestedManyWithoutUserInput = {
    create?:
      | XOR<GoalCreateWithoutUserInput, GoalUncheckedCreateWithoutUserInput>
      | GoalCreateWithoutUserInput[]
      | GoalUncheckedCreateWithoutUserInput[];
    connectOrCreate?: GoalCreateOrConnectWithoutUserInput | GoalCreateOrConnectWithoutUserInput[];
    createMany?: GoalCreateManyUserInputEnvelope;
    connect?: GoalWhereUniqueInput | GoalWhereUniqueInput[];
  };

  export type GoalUncheckedCreateNestedManyWithoutUserInput = {
    create?:
      | XOR<GoalCreateWithoutUserInput, GoalUncheckedCreateWithoutUserInput>
      | GoalCreateWithoutUserInput[]
      | GoalUncheckedCreateWithoutUserInput[];
    connectOrCreate?: GoalCreateOrConnectWithoutUserInput | GoalCreateOrConnectWithoutUserInput[];
    createMany?: GoalCreateManyUserInputEnvelope;
    connect?: GoalWhereUniqueInput | GoalWhereUniqueInput[];
  };

  export type StringFieldUpdateOperationsInput = {
    set?: string;
  };

  export type NullableEnumUserIndustryFieldUpdateOperationsInput = {
    set?: $Enums.UserIndustry | null;
  };

  export type NullableEnumCompanySizeFieldUpdateOperationsInput = {
    set?: $Enums.CompanySize | null;
  };

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null;
  };

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string;
  };

  export type GoalUpdateManyWithoutUserNestedInput = {
    create?:
      | XOR<GoalCreateWithoutUserInput, GoalUncheckedCreateWithoutUserInput>
      | GoalCreateWithoutUserInput[]
      | GoalUncheckedCreateWithoutUserInput[];
    connectOrCreate?: GoalCreateOrConnectWithoutUserInput | GoalCreateOrConnectWithoutUserInput[];
    upsert?:
      | GoalUpsertWithWhereUniqueWithoutUserInput
      | GoalUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: GoalCreateManyUserInputEnvelope;
    set?: GoalWhereUniqueInput | GoalWhereUniqueInput[];
    disconnect?: GoalWhereUniqueInput | GoalWhereUniqueInput[];
    delete?: GoalWhereUniqueInput | GoalWhereUniqueInput[];
    connect?: GoalWhereUniqueInput | GoalWhereUniqueInput[];
    update?:
      | GoalUpdateWithWhereUniqueWithoutUserInput
      | GoalUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?:
      | GoalUpdateManyWithWhereWithoutUserInput
      | GoalUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: GoalScalarWhereInput | GoalScalarWhereInput[];
  };

  export type GoalUncheckedUpdateManyWithoutUserNestedInput = {
    create?:
      | XOR<GoalCreateWithoutUserInput, GoalUncheckedCreateWithoutUserInput>
      | GoalCreateWithoutUserInput[]
      | GoalUncheckedCreateWithoutUserInput[];
    connectOrCreate?: GoalCreateOrConnectWithoutUserInput | GoalCreateOrConnectWithoutUserInput[];
    upsert?:
      | GoalUpsertWithWhereUniqueWithoutUserInput
      | GoalUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: GoalCreateManyUserInputEnvelope;
    set?: GoalWhereUniqueInput | GoalWhereUniqueInput[];
    disconnect?: GoalWhereUniqueInput | GoalWhereUniqueInput[];
    delete?: GoalWhereUniqueInput | GoalWhereUniqueInput[];
    connect?: GoalWhereUniqueInput | GoalWhereUniqueInput[];
    update?:
      | GoalUpdateWithWhereUniqueWithoutUserInput
      | GoalUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?:
      | GoalUpdateManyWithWhereWithoutUserInput
      | GoalUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: GoalScalarWhereInput | GoalScalarWhereInput[];
  };

  export type UserCreateNestedOneWithoutGoalsInput = {
    create?: XOR<UserCreateWithoutGoalsInput, UserUncheckedCreateWithoutGoalsInput>;
    connectOrCreate?: UserCreateOrConnectWithoutGoalsInput;
    connect?: UserWhereUniqueInput;
  };

  export type SubGoalCreateNestedManyWithoutGoalInput = {
    create?:
      | XOR<SubGoalCreateWithoutGoalInput, SubGoalUncheckedCreateWithoutGoalInput>
      | SubGoalCreateWithoutGoalInput[]
      | SubGoalUncheckedCreateWithoutGoalInput[];
    connectOrCreate?:
      | SubGoalCreateOrConnectWithoutGoalInput
      | SubGoalCreateOrConnectWithoutGoalInput[];
    createMany?: SubGoalCreateManyGoalInputEnvelope;
    connect?: SubGoalWhereUniqueInput | SubGoalWhereUniqueInput[];
  };

  export type SubGoalUncheckedCreateNestedManyWithoutGoalInput = {
    create?:
      | XOR<SubGoalCreateWithoutGoalInput, SubGoalUncheckedCreateWithoutGoalInput>
      | SubGoalCreateWithoutGoalInput[]
      | SubGoalUncheckedCreateWithoutGoalInput[];
    connectOrCreate?:
      | SubGoalCreateOrConnectWithoutGoalInput
      | SubGoalCreateOrConnectWithoutGoalInput[];
    createMany?: SubGoalCreateManyGoalInputEnvelope;
    connect?: SubGoalWhereUniqueInput | SubGoalWhereUniqueInput[];
  };

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null;
  };

  export type EnumGoalStatusFieldUpdateOperationsInput = {
    set?: $Enums.GoalStatus;
  };

  export type IntFieldUpdateOperationsInput = {
    set?: number;
    increment?: number;
    decrement?: number;
    multiply?: number;
    divide?: number;
  };

  export type UserUpdateOneRequiredWithoutGoalsNestedInput = {
    create?: XOR<UserCreateWithoutGoalsInput, UserUncheckedCreateWithoutGoalsInput>;
    connectOrCreate?: UserCreateOrConnectWithoutGoalsInput;
    upsert?: UserUpsertWithoutGoalsInput;
    connect?: UserWhereUniqueInput;
    update?: XOR<
      XOR<UserUpdateToOneWithWhereWithoutGoalsInput, UserUpdateWithoutGoalsInput>,
      UserUncheckedUpdateWithoutGoalsInput
    >;
  };

  export type SubGoalUpdateManyWithoutGoalNestedInput = {
    create?:
      | XOR<SubGoalCreateWithoutGoalInput, SubGoalUncheckedCreateWithoutGoalInput>
      | SubGoalCreateWithoutGoalInput[]
      | SubGoalUncheckedCreateWithoutGoalInput[];
    connectOrCreate?:
      | SubGoalCreateOrConnectWithoutGoalInput
      | SubGoalCreateOrConnectWithoutGoalInput[];
    upsert?:
      | SubGoalUpsertWithWhereUniqueWithoutGoalInput
      | SubGoalUpsertWithWhereUniqueWithoutGoalInput[];
    createMany?: SubGoalCreateManyGoalInputEnvelope;
    set?: SubGoalWhereUniqueInput | SubGoalWhereUniqueInput[];
    disconnect?: SubGoalWhereUniqueInput | SubGoalWhereUniqueInput[];
    delete?: SubGoalWhereUniqueInput | SubGoalWhereUniqueInput[];
    connect?: SubGoalWhereUniqueInput | SubGoalWhereUniqueInput[];
    update?:
      | SubGoalUpdateWithWhereUniqueWithoutGoalInput
      | SubGoalUpdateWithWhereUniqueWithoutGoalInput[];
    updateMany?:
      | SubGoalUpdateManyWithWhereWithoutGoalInput
      | SubGoalUpdateManyWithWhereWithoutGoalInput[];
    deleteMany?: SubGoalScalarWhereInput | SubGoalScalarWhereInput[];
  };

  export type SubGoalUncheckedUpdateManyWithoutGoalNestedInput = {
    create?:
      | XOR<SubGoalCreateWithoutGoalInput, SubGoalUncheckedCreateWithoutGoalInput>
      | SubGoalCreateWithoutGoalInput[]
      | SubGoalUncheckedCreateWithoutGoalInput[];
    connectOrCreate?:
      | SubGoalCreateOrConnectWithoutGoalInput
      | SubGoalCreateOrConnectWithoutGoalInput[];
    upsert?:
      | SubGoalUpsertWithWhereUniqueWithoutGoalInput
      | SubGoalUpsertWithWhereUniqueWithoutGoalInput[];
    createMany?: SubGoalCreateManyGoalInputEnvelope;
    set?: SubGoalWhereUniqueInput | SubGoalWhereUniqueInput[];
    disconnect?: SubGoalWhereUniqueInput | SubGoalWhereUniqueInput[];
    delete?: SubGoalWhereUniqueInput | SubGoalWhereUniqueInput[];
    connect?: SubGoalWhereUniqueInput | SubGoalWhereUniqueInput[];
    update?:
      | SubGoalUpdateWithWhereUniqueWithoutGoalInput
      | SubGoalUpdateWithWhereUniqueWithoutGoalInput[];
    updateMany?:
      | SubGoalUpdateManyWithWhereWithoutGoalInput
      | SubGoalUpdateManyWithWhereWithoutGoalInput[];
    deleteMany?: SubGoalScalarWhereInput | SubGoalScalarWhereInput[];
  };

  export type GoalCreateNestedOneWithoutSubGoalsInput = {
    create?: XOR<GoalCreateWithoutSubGoalsInput, GoalUncheckedCreateWithoutSubGoalsInput>;
    connectOrCreate?: GoalCreateOrConnectWithoutSubGoalsInput;
    connect?: GoalWhereUniqueInput;
  };

  export type ActionCreateNestedManyWithoutSubGoalInput = {
    create?:
      | XOR<ActionCreateWithoutSubGoalInput, ActionUncheckedCreateWithoutSubGoalInput>
      | ActionCreateWithoutSubGoalInput[]
      | ActionUncheckedCreateWithoutSubGoalInput[];
    connectOrCreate?:
      | ActionCreateOrConnectWithoutSubGoalInput
      | ActionCreateOrConnectWithoutSubGoalInput[];
    createMany?: ActionCreateManySubGoalInputEnvelope;
    connect?: ActionWhereUniqueInput | ActionWhereUniqueInput[];
  };

  export type ActionUncheckedCreateNestedManyWithoutSubGoalInput = {
    create?:
      | XOR<ActionCreateWithoutSubGoalInput, ActionUncheckedCreateWithoutSubGoalInput>
      | ActionCreateWithoutSubGoalInput[]
      | ActionUncheckedCreateWithoutSubGoalInput[];
    connectOrCreate?:
      | ActionCreateOrConnectWithoutSubGoalInput
      | ActionCreateOrConnectWithoutSubGoalInput[];
    createMany?: ActionCreateManySubGoalInputEnvelope;
    connect?: ActionWhereUniqueInput | ActionWhereUniqueInput[];
  };

  export type GoalUpdateOneRequiredWithoutSubGoalsNestedInput = {
    create?: XOR<GoalCreateWithoutSubGoalsInput, GoalUncheckedCreateWithoutSubGoalsInput>;
    connectOrCreate?: GoalCreateOrConnectWithoutSubGoalsInput;
    upsert?: GoalUpsertWithoutSubGoalsInput;
    connect?: GoalWhereUniqueInput;
    update?: XOR<
      XOR<GoalUpdateToOneWithWhereWithoutSubGoalsInput, GoalUpdateWithoutSubGoalsInput>,
      GoalUncheckedUpdateWithoutSubGoalsInput
    >;
  };

  export type ActionUpdateManyWithoutSubGoalNestedInput = {
    create?:
      | XOR<ActionCreateWithoutSubGoalInput, ActionUncheckedCreateWithoutSubGoalInput>
      | ActionCreateWithoutSubGoalInput[]
      | ActionUncheckedCreateWithoutSubGoalInput[];
    connectOrCreate?:
      | ActionCreateOrConnectWithoutSubGoalInput
      | ActionCreateOrConnectWithoutSubGoalInput[];
    upsert?:
      | ActionUpsertWithWhereUniqueWithoutSubGoalInput
      | ActionUpsertWithWhereUniqueWithoutSubGoalInput[];
    createMany?: ActionCreateManySubGoalInputEnvelope;
    set?: ActionWhereUniqueInput | ActionWhereUniqueInput[];
    disconnect?: ActionWhereUniqueInput | ActionWhereUniqueInput[];
    delete?: ActionWhereUniqueInput | ActionWhereUniqueInput[];
    connect?: ActionWhereUniqueInput | ActionWhereUniqueInput[];
    update?:
      | ActionUpdateWithWhereUniqueWithoutSubGoalInput
      | ActionUpdateWithWhereUniqueWithoutSubGoalInput[];
    updateMany?:
      | ActionUpdateManyWithWhereWithoutSubGoalInput
      | ActionUpdateManyWithWhereWithoutSubGoalInput[];
    deleteMany?: ActionScalarWhereInput | ActionScalarWhereInput[];
  };

  export type ActionUncheckedUpdateManyWithoutSubGoalNestedInput = {
    create?:
      | XOR<ActionCreateWithoutSubGoalInput, ActionUncheckedCreateWithoutSubGoalInput>
      | ActionCreateWithoutSubGoalInput[]
      | ActionUncheckedCreateWithoutSubGoalInput[];
    connectOrCreate?:
      | ActionCreateOrConnectWithoutSubGoalInput
      | ActionCreateOrConnectWithoutSubGoalInput[];
    upsert?:
      | ActionUpsertWithWhereUniqueWithoutSubGoalInput
      | ActionUpsertWithWhereUniqueWithoutSubGoalInput[];
    createMany?: ActionCreateManySubGoalInputEnvelope;
    set?: ActionWhereUniqueInput | ActionWhereUniqueInput[];
    disconnect?: ActionWhereUniqueInput | ActionWhereUniqueInput[];
    delete?: ActionWhereUniqueInput | ActionWhereUniqueInput[];
    connect?: ActionWhereUniqueInput | ActionWhereUniqueInput[];
    update?:
      | ActionUpdateWithWhereUniqueWithoutSubGoalInput
      | ActionUpdateWithWhereUniqueWithoutSubGoalInput[];
    updateMany?:
      | ActionUpdateManyWithWhereWithoutSubGoalInput
      | ActionUpdateManyWithWhereWithoutSubGoalInput[];
    deleteMany?: ActionScalarWhereInput | ActionScalarWhereInput[];
  };

  export type SubGoalCreateNestedOneWithoutActionsInput = {
    create?: XOR<SubGoalCreateWithoutActionsInput, SubGoalUncheckedCreateWithoutActionsInput>;
    connectOrCreate?: SubGoalCreateOrConnectWithoutActionsInput;
    connect?: SubGoalWhereUniqueInput;
  };

  export type TaskCreateNestedManyWithoutActionInput = {
    create?:
      | XOR<TaskCreateWithoutActionInput, TaskUncheckedCreateWithoutActionInput>
      | TaskCreateWithoutActionInput[]
      | TaskUncheckedCreateWithoutActionInput[];
    connectOrCreate?:
      | TaskCreateOrConnectWithoutActionInput
      | TaskCreateOrConnectWithoutActionInput[];
    createMany?: TaskCreateManyActionInputEnvelope;
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[];
  };

  export type TaskUncheckedCreateNestedManyWithoutActionInput = {
    create?:
      | XOR<TaskCreateWithoutActionInput, TaskUncheckedCreateWithoutActionInput>
      | TaskCreateWithoutActionInput[]
      | TaskUncheckedCreateWithoutActionInput[];
    connectOrCreate?:
      | TaskCreateOrConnectWithoutActionInput
      | TaskCreateOrConnectWithoutActionInput[];
    createMany?: TaskCreateManyActionInputEnvelope;
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[];
  };

  export type SubGoalUpdateOneRequiredWithoutActionsNestedInput = {
    create?: XOR<SubGoalCreateWithoutActionsInput, SubGoalUncheckedCreateWithoutActionsInput>;
    connectOrCreate?: SubGoalCreateOrConnectWithoutActionsInput;
    upsert?: SubGoalUpsertWithoutActionsInput;
    connect?: SubGoalWhereUniqueInput;
    update?: XOR<
      XOR<SubGoalUpdateToOneWithWhereWithoutActionsInput, SubGoalUpdateWithoutActionsInput>,
      SubGoalUncheckedUpdateWithoutActionsInput
    >;
  };

  export type TaskUpdateManyWithoutActionNestedInput = {
    create?:
      | XOR<TaskCreateWithoutActionInput, TaskUncheckedCreateWithoutActionInput>
      | TaskCreateWithoutActionInput[]
      | TaskUncheckedCreateWithoutActionInput[];
    connectOrCreate?:
      | TaskCreateOrConnectWithoutActionInput
      | TaskCreateOrConnectWithoutActionInput[];
    upsert?:
      | TaskUpsertWithWhereUniqueWithoutActionInput
      | TaskUpsertWithWhereUniqueWithoutActionInput[];
    createMany?: TaskCreateManyActionInputEnvelope;
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[];
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[];
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[];
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[];
    update?:
      | TaskUpdateWithWhereUniqueWithoutActionInput
      | TaskUpdateWithWhereUniqueWithoutActionInput[];
    updateMany?:
      | TaskUpdateManyWithWhereWithoutActionInput
      | TaskUpdateManyWithWhereWithoutActionInput[];
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[];
  };

  export type TaskUncheckedUpdateManyWithoutActionNestedInput = {
    create?:
      | XOR<TaskCreateWithoutActionInput, TaskUncheckedCreateWithoutActionInput>
      | TaskCreateWithoutActionInput[]
      | TaskUncheckedCreateWithoutActionInput[];
    connectOrCreate?:
      | TaskCreateOrConnectWithoutActionInput
      | TaskCreateOrConnectWithoutActionInput[];
    upsert?:
      | TaskUpsertWithWhereUniqueWithoutActionInput
      | TaskUpsertWithWhereUniqueWithoutActionInput[];
    createMany?: TaskCreateManyActionInputEnvelope;
    set?: TaskWhereUniqueInput | TaskWhereUniqueInput[];
    disconnect?: TaskWhereUniqueInput | TaskWhereUniqueInput[];
    delete?: TaskWhereUniqueInput | TaskWhereUniqueInput[];
    connect?: TaskWhereUniqueInput | TaskWhereUniqueInput[];
    update?:
      | TaskUpdateWithWhereUniqueWithoutActionInput
      | TaskUpdateWithWhereUniqueWithoutActionInput[];
    updateMany?:
      | TaskUpdateManyWithWhereWithoutActionInput
      | TaskUpdateManyWithWhereWithoutActionInput[];
    deleteMany?: TaskScalarWhereInput | TaskScalarWhereInput[];
  };

  export type ActionCreateNestedOneWithoutTasksInput = {
    create?: XOR<ActionCreateWithoutTasksInput, ActionUncheckedCreateWithoutTasksInput>;
    connectOrCreate?: ActionCreateOrConnectWithoutTasksInput;
    connect?: ActionWhereUniqueInput;
  };

  export type TaskReminderCreateNestedManyWithoutTaskInput = {
    create?:
      | XOR<TaskReminderCreateWithoutTaskInput, TaskReminderUncheckedCreateWithoutTaskInput>
      | TaskReminderCreateWithoutTaskInput[]
      | TaskReminderUncheckedCreateWithoutTaskInput[];
    connectOrCreate?:
      | TaskReminderCreateOrConnectWithoutTaskInput
      | TaskReminderCreateOrConnectWithoutTaskInput[];
    createMany?: TaskReminderCreateManyTaskInputEnvelope;
    connect?: TaskReminderWhereUniqueInput | TaskReminderWhereUniqueInput[];
  };

  export type ReflectionCreateNestedManyWithoutTaskInput = {
    create?:
      | XOR<ReflectionCreateWithoutTaskInput, ReflectionUncheckedCreateWithoutTaskInput>
      | ReflectionCreateWithoutTaskInput[]
      | ReflectionUncheckedCreateWithoutTaskInput[];
    connectOrCreate?:
      | ReflectionCreateOrConnectWithoutTaskInput
      | ReflectionCreateOrConnectWithoutTaskInput[];
    createMany?: ReflectionCreateManyTaskInputEnvelope;
    connect?: ReflectionWhereUniqueInput | ReflectionWhereUniqueInput[];
  };

  export type TaskReminderUncheckedCreateNestedManyWithoutTaskInput = {
    create?:
      | XOR<TaskReminderCreateWithoutTaskInput, TaskReminderUncheckedCreateWithoutTaskInput>
      | TaskReminderCreateWithoutTaskInput[]
      | TaskReminderUncheckedCreateWithoutTaskInput[];
    connectOrCreate?:
      | TaskReminderCreateOrConnectWithoutTaskInput
      | TaskReminderCreateOrConnectWithoutTaskInput[];
    createMany?: TaskReminderCreateManyTaskInputEnvelope;
    connect?: TaskReminderWhereUniqueInput | TaskReminderWhereUniqueInput[];
  };

  export type ReflectionUncheckedCreateNestedManyWithoutTaskInput = {
    create?:
      | XOR<ReflectionCreateWithoutTaskInput, ReflectionUncheckedCreateWithoutTaskInput>
      | ReflectionCreateWithoutTaskInput[]
      | ReflectionUncheckedCreateWithoutTaskInput[];
    connectOrCreate?:
      | ReflectionCreateOrConnectWithoutTaskInput
      | ReflectionCreateOrConnectWithoutTaskInput[];
    createMany?: ReflectionCreateManyTaskInputEnvelope;
    connect?: ReflectionWhereUniqueInput | ReflectionWhereUniqueInput[];
  };

  export type EnumTaskTypeFieldUpdateOperationsInput = {
    set?: $Enums.TaskType;
  };

  export type EnumTaskStatusFieldUpdateOperationsInput = {
    set?: $Enums.TaskStatus;
  };

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null;
    increment?: number;
    decrement?: number;
    multiply?: number;
    divide?: number;
  };

  export type ActionUpdateOneRequiredWithoutTasksNestedInput = {
    create?: XOR<ActionCreateWithoutTasksInput, ActionUncheckedCreateWithoutTasksInput>;
    connectOrCreate?: ActionCreateOrConnectWithoutTasksInput;
    upsert?: ActionUpsertWithoutTasksInput;
    connect?: ActionWhereUniqueInput;
    update?: XOR<
      XOR<ActionUpdateToOneWithWhereWithoutTasksInput, ActionUpdateWithoutTasksInput>,
      ActionUncheckedUpdateWithoutTasksInput
    >;
  };

  export type TaskReminderUpdateManyWithoutTaskNestedInput = {
    create?:
      | XOR<TaskReminderCreateWithoutTaskInput, TaskReminderUncheckedCreateWithoutTaskInput>
      | TaskReminderCreateWithoutTaskInput[]
      | TaskReminderUncheckedCreateWithoutTaskInput[];
    connectOrCreate?:
      | TaskReminderCreateOrConnectWithoutTaskInput
      | TaskReminderCreateOrConnectWithoutTaskInput[];
    upsert?:
      | TaskReminderUpsertWithWhereUniqueWithoutTaskInput
      | TaskReminderUpsertWithWhereUniqueWithoutTaskInput[];
    createMany?: TaskReminderCreateManyTaskInputEnvelope;
    set?: TaskReminderWhereUniqueInput | TaskReminderWhereUniqueInput[];
    disconnect?: TaskReminderWhereUniqueInput | TaskReminderWhereUniqueInput[];
    delete?: TaskReminderWhereUniqueInput | TaskReminderWhereUniqueInput[];
    connect?: TaskReminderWhereUniqueInput | TaskReminderWhereUniqueInput[];
    update?:
      | TaskReminderUpdateWithWhereUniqueWithoutTaskInput
      | TaskReminderUpdateWithWhereUniqueWithoutTaskInput[];
    updateMany?:
      | TaskReminderUpdateManyWithWhereWithoutTaskInput
      | TaskReminderUpdateManyWithWhereWithoutTaskInput[];
    deleteMany?: TaskReminderScalarWhereInput | TaskReminderScalarWhereInput[];
  };

  export type ReflectionUpdateManyWithoutTaskNestedInput = {
    create?:
      | XOR<ReflectionCreateWithoutTaskInput, ReflectionUncheckedCreateWithoutTaskInput>
      | ReflectionCreateWithoutTaskInput[]
      | ReflectionUncheckedCreateWithoutTaskInput[];
    connectOrCreate?:
      | ReflectionCreateOrConnectWithoutTaskInput
      | ReflectionCreateOrConnectWithoutTaskInput[];
    upsert?:
      | ReflectionUpsertWithWhereUniqueWithoutTaskInput
      | ReflectionUpsertWithWhereUniqueWithoutTaskInput[];
    createMany?: ReflectionCreateManyTaskInputEnvelope;
    set?: ReflectionWhereUniqueInput | ReflectionWhereUniqueInput[];
    disconnect?: ReflectionWhereUniqueInput | ReflectionWhereUniqueInput[];
    delete?: ReflectionWhereUniqueInput | ReflectionWhereUniqueInput[];
    connect?: ReflectionWhereUniqueInput | ReflectionWhereUniqueInput[];
    update?:
      | ReflectionUpdateWithWhereUniqueWithoutTaskInput
      | ReflectionUpdateWithWhereUniqueWithoutTaskInput[];
    updateMany?:
      | ReflectionUpdateManyWithWhereWithoutTaskInput
      | ReflectionUpdateManyWithWhereWithoutTaskInput[];
    deleteMany?: ReflectionScalarWhereInput | ReflectionScalarWhereInput[];
  };

  export type TaskReminderUncheckedUpdateManyWithoutTaskNestedInput = {
    create?:
      | XOR<TaskReminderCreateWithoutTaskInput, TaskReminderUncheckedCreateWithoutTaskInput>
      | TaskReminderCreateWithoutTaskInput[]
      | TaskReminderUncheckedCreateWithoutTaskInput[];
    connectOrCreate?:
      | TaskReminderCreateOrConnectWithoutTaskInput
      | TaskReminderCreateOrConnectWithoutTaskInput[];
    upsert?:
      | TaskReminderUpsertWithWhereUniqueWithoutTaskInput
      | TaskReminderUpsertWithWhereUniqueWithoutTaskInput[];
    createMany?: TaskReminderCreateManyTaskInputEnvelope;
    set?: TaskReminderWhereUniqueInput | TaskReminderWhereUniqueInput[];
    disconnect?: TaskReminderWhereUniqueInput | TaskReminderWhereUniqueInput[];
    delete?: TaskReminderWhereUniqueInput | TaskReminderWhereUniqueInput[];
    connect?: TaskReminderWhereUniqueInput | TaskReminderWhereUniqueInput[];
    update?:
      | TaskReminderUpdateWithWhereUniqueWithoutTaskInput
      | TaskReminderUpdateWithWhereUniqueWithoutTaskInput[];
    updateMany?:
      | TaskReminderUpdateManyWithWhereWithoutTaskInput
      | TaskReminderUpdateManyWithWhereWithoutTaskInput[];
    deleteMany?: TaskReminderScalarWhereInput | TaskReminderScalarWhereInput[];
  };

  export type ReflectionUncheckedUpdateManyWithoutTaskNestedInput = {
    create?:
      | XOR<ReflectionCreateWithoutTaskInput, ReflectionUncheckedCreateWithoutTaskInput>
      | ReflectionCreateWithoutTaskInput[]
      | ReflectionUncheckedCreateWithoutTaskInput[];
    connectOrCreate?:
      | ReflectionCreateOrConnectWithoutTaskInput
      | ReflectionCreateOrConnectWithoutTaskInput[];
    upsert?:
      | ReflectionUpsertWithWhereUniqueWithoutTaskInput
      | ReflectionUpsertWithWhereUniqueWithoutTaskInput[];
    createMany?: ReflectionCreateManyTaskInputEnvelope;
    set?: ReflectionWhereUniqueInput | ReflectionWhereUniqueInput[];
    disconnect?: ReflectionWhereUniqueInput | ReflectionWhereUniqueInput[];
    delete?: ReflectionWhereUniqueInput | ReflectionWhereUniqueInput[];
    connect?: ReflectionWhereUniqueInput | ReflectionWhereUniqueInput[];
    update?:
      | ReflectionUpdateWithWhereUniqueWithoutTaskInput
      | ReflectionUpdateWithWhereUniqueWithoutTaskInput[];
    updateMany?:
      | ReflectionUpdateManyWithWhereWithoutTaskInput
      | ReflectionUpdateManyWithWhereWithoutTaskInput[];
    deleteMany?: ReflectionScalarWhereInput | ReflectionScalarWhereInput[];
  };

  export type TaskCreateNestedOneWithoutRemindersInput = {
    create?: XOR<TaskCreateWithoutRemindersInput, TaskUncheckedCreateWithoutRemindersInput>;
    connectOrCreate?: TaskCreateOrConnectWithoutRemindersInput;
    connect?: TaskWhereUniqueInput;
  };

  export type EnumReminderStatusFieldUpdateOperationsInput = {
    set?: $Enums.ReminderStatus;
  };

  export type TaskUpdateOneRequiredWithoutRemindersNestedInput = {
    create?: XOR<TaskCreateWithoutRemindersInput, TaskUncheckedCreateWithoutRemindersInput>;
    connectOrCreate?: TaskCreateOrConnectWithoutRemindersInput;
    upsert?: TaskUpsertWithoutRemindersInput;
    connect?: TaskWhereUniqueInput;
    update?: XOR<
      XOR<TaskUpdateToOneWithWhereWithoutRemindersInput, TaskUpdateWithoutRemindersInput>,
      TaskUncheckedUpdateWithoutRemindersInput
    >;
  };

  export type TaskCreateNestedOneWithoutReflectionsInput = {
    create?: XOR<TaskCreateWithoutReflectionsInput, TaskUncheckedCreateWithoutReflectionsInput>;
    connectOrCreate?: TaskCreateOrConnectWithoutReflectionsInput;
    connect?: TaskWhereUniqueInput;
  };

  export type TaskUpdateOneRequiredWithoutReflectionsNestedInput = {
    create?: XOR<TaskCreateWithoutReflectionsInput, TaskUncheckedCreateWithoutReflectionsInput>;
    connectOrCreate?: TaskCreateOrConnectWithoutReflectionsInput;
    upsert?: TaskUpsertWithoutReflectionsInput;
    connect?: TaskWhereUniqueInput;
    update?: XOR<
      XOR<TaskUpdateToOneWithWhereWithoutReflectionsInput, TaskUpdateWithoutReflectionsInput>,
      TaskUncheckedUpdateWithoutReflectionsInput
    >;
  };

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>;
    in?: string[] | ListStringFieldRefInput<$PrismaModel>;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    not?: NestedUuidFilter<$PrismaModel> | string;
  };

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>;
    in?: string[] | ListStringFieldRefInput<$PrismaModel>;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    contains?: string | StringFieldRefInput<$PrismaModel>;
    startsWith?: string | StringFieldRefInput<$PrismaModel>;
    endsWith?: string | StringFieldRefInput<$PrismaModel>;
    not?: NestedStringFilter<$PrismaModel> | string;
  };

  export type NestedEnumUserIndustryNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.UserIndustry | EnumUserIndustryFieldRefInput<$PrismaModel> | null;
    in?: $Enums.UserIndustry[] | ListEnumUserIndustryFieldRefInput<$PrismaModel> | null;
    notIn?: $Enums.UserIndustry[] | ListEnumUserIndustryFieldRefInput<$PrismaModel> | null;
    not?: NestedEnumUserIndustryNullableFilter<$PrismaModel> | $Enums.UserIndustry | null;
  };

  export type NestedEnumCompanySizeNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.CompanySize | EnumCompanySizeFieldRefInput<$PrismaModel> | null;
    in?: $Enums.CompanySize[] | ListEnumCompanySizeFieldRefInput<$PrismaModel> | null;
    notIn?: $Enums.CompanySize[] | ListEnumCompanySizeFieldRefInput<$PrismaModel> | null;
    not?: NestedEnumCompanySizeNullableFilter<$PrismaModel> | $Enums.CompanySize | null;
  };

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null;
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    contains?: string | StringFieldRefInput<$PrismaModel>;
    startsWith?: string | StringFieldRefInput<$PrismaModel>;
    endsWith?: string | StringFieldRefInput<$PrismaModel>;
    not?: NestedStringNullableFilter<$PrismaModel> | string | null;
  };

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string;
  };

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>;
    in?: string[] | ListStringFieldRefInput<$PrismaModel>;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedStringFilter<$PrismaModel>;
    _max?: NestedStringFilter<$PrismaModel>;
  };

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>;
    in?: number[] | ListIntFieldRefInput<$PrismaModel>;
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>;
    lt?: number | IntFieldRefInput<$PrismaModel>;
    lte?: number | IntFieldRefInput<$PrismaModel>;
    gt?: number | IntFieldRefInput<$PrismaModel>;
    gte?: number | IntFieldRefInput<$PrismaModel>;
    not?: NestedIntFilter<$PrismaModel> | number;
  };

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>;
    in?: string[] | ListStringFieldRefInput<$PrismaModel>;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    contains?: string | StringFieldRefInput<$PrismaModel>;
    startsWith?: string | StringFieldRefInput<$PrismaModel>;
    endsWith?: string | StringFieldRefInput<$PrismaModel>;
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedStringFilter<$PrismaModel>;
    _max?: NestedStringFilter<$PrismaModel>;
  };

  export type NestedEnumUserIndustryNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserIndustry | EnumUserIndustryFieldRefInput<$PrismaModel> | null;
    in?: $Enums.UserIndustry[] | ListEnumUserIndustryFieldRefInput<$PrismaModel> | null;
    notIn?: $Enums.UserIndustry[] | ListEnumUserIndustryFieldRefInput<$PrismaModel> | null;
    not?:
      | NestedEnumUserIndustryNullableWithAggregatesFilter<$PrismaModel>
      | $Enums.UserIndustry
      | null;
    _count?: NestedIntNullableFilter<$PrismaModel>;
    _min?: NestedEnumUserIndustryNullableFilter<$PrismaModel>;
    _max?: NestedEnumUserIndustryNullableFilter<$PrismaModel>;
  };

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null;
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null;
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null;
    lt?: number | IntFieldRefInput<$PrismaModel>;
    lte?: number | IntFieldRefInput<$PrismaModel>;
    gt?: number | IntFieldRefInput<$PrismaModel>;
    gte?: number | IntFieldRefInput<$PrismaModel>;
    not?: NestedIntNullableFilter<$PrismaModel> | number | null;
  };

  export type NestedEnumCompanySizeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CompanySize | EnumCompanySizeFieldRefInput<$PrismaModel> | null;
    in?: $Enums.CompanySize[] | ListEnumCompanySizeFieldRefInput<$PrismaModel> | null;
    notIn?: $Enums.CompanySize[] | ListEnumCompanySizeFieldRefInput<$PrismaModel> | null;
    not?:
      | NestedEnumCompanySizeNullableWithAggregatesFilter<$PrismaModel>
      | $Enums.CompanySize
      | null;
    _count?: NestedIntNullableFilter<$PrismaModel>;
    _min?: NestedEnumCompanySizeNullableFilter<$PrismaModel>;
    _max?: NestedEnumCompanySizeNullableFilter<$PrismaModel>;
  };

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null;
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null;
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null;
    lt?: string | StringFieldRefInput<$PrismaModel>;
    lte?: string | StringFieldRefInput<$PrismaModel>;
    gt?: string | StringFieldRefInput<$PrismaModel>;
    gte?: string | StringFieldRefInput<$PrismaModel>;
    contains?: string | StringFieldRefInput<$PrismaModel>;
    startsWith?: string | StringFieldRefInput<$PrismaModel>;
    endsWith?: string | StringFieldRefInput<$PrismaModel>;
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null;
    _count?: NestedIntNullableFilter<$PrismaModel>;
    _min?: NestedStringNullableFilter<$PrismaModel>;
    _max?: NestedStringNullableFilter<$PrismaModel>;
  };

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>;
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedDateTimeFilter<$PrismaModel>;
    _max?: NestedDateTimeFilter<$PrismaModel>;
  };

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null;
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null;
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null;
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null;
  };

  export type NestedEnumGoalStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.GoalStatus | EnumGoalStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.GoalStatus[] | ListEnumGoalStatusFieldRefInput<$PrismaModel>;
    notIn?: $Enums.GoalStatus[] | ListEnumGoalStatusFieldRefInput<$PrismaModel>;
    not?: NestedEnumGoalStatusFilter<$PrismaModel> | $Enums.GoalStatus;
  };

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null;
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null;
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null;
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>;
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null;
    _count?: NestedIntNullableFilter<$PrismaModel>;
    _min?: NestedDateTimeNullableFilter<$PrismaModel>;
    _max?: NestedDateTimeNullableFilter<$PrismaModel>;
  };

  export type NestedEnumGoalStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.GoalStatus | EnumGoalStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.GoalStatus[] | ListEnumGoalStatusFieldRefInput<$PrismaModel>;
    notIn?: $Enums.GoalStatus[] | ListEnumGoalStatusFieldRefInput<$PrismaModel>;
    not?: NestedEnumGoalStatusWithAggregatesFilter<$PrismaModel> | $Enums.GoalStatus;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedEnumGoalStatusFilter<$PrismaModel>;
    _max?: NestedEnumGoalStatusFilter<$PrismaModel>;
  };

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>;
    in?: number[] | ListIntFieldRefInput<$PrismaModel>;
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>;
    lt?: number | IntFieldRefInput<$PrismaModel>;
    lte?: number | IntFieldRefInput<$PrismaModel>;
    gt?: number | IntFieldRefInput<$PrismaModel>;
    gte?: number | IntFieldRefInput<$PrismaModel>;
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number;
    _count?: NestedIntFilter<$PrismaModel>;
    _avg?: NestedFloatFilter<$PrismaModel>;
    _sum?: NestedIntFilter<$PrismaModel>;
    _min?: NestedIntFilter<$PrismaModel>;
    _max?: NestedIntFilter<$PrismaModel>;
  };

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>;
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>;
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>;
    lt?: number | FloatFieldRefInput<$PrismaModel>;
    lte?: number | FloatFieldRefInput<$PrismaModel>;
    gt?: number | FloatFieldRefInput<$PrismaModel>;
    gte?: number | FloatFieldRefInput<$PrismaModel>;
    not?: NestedFloatFilter<$PrismaModel> | number;
  };

  export type NestedEnumTaskTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskType | EnumTaskTypeFieldRefInput<$PrismaModel>;
    in?: $Enums.TaskType[] | ListEnumTaskTypeFieldRefInput<$PrismaModel>;
    notIn?: $Enums.TaskType[] | ListEnumTaskTypeFieldRefInput<$PrismaModel>;
    not?: NestedEnumTaskTypeFilter<$PrismaModel> | $Enums.TaskType;
  };

  export type NestedEnumTaskStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskStatus | EnumTaskStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>;
    notIn?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>;
    not?: NestedEnumTaskStatusFilter<$PrismaModel> | $Enums.TaskStatus;
  };

  export type NestedEnumTaskTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskType | EnumTaskTypeFieldRefInput<$PrismaModel>;
    in?: $Enums.TaskType[] | ListEnumTaskTypeFieldRefInput<$PrismaModel>;
    notIn?: $Enums.TaskType[] | ListEnumTaskTypeFieldRefInput<$PrismaModel>;
    not?: NestedEnumTaskTypeWithAggregatesFilter<$PrismaModel> | $Enums.TaskType;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedEnumTaskTypeFilter<$PrismaModel>;
    _max?: NestedEnumTaskTypeFilter<$PrismaModel>;
  };

  export type NestedEnumTaskStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.TaskStatus | EnumTaskStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>;
    notIn?: $Enums.TaskStatus[] | ListEnumTaskStatusFieldRefInput<$PrismaModel>;
    not?: NestedEnumTaskStatusWithAggregatesFilter<$PrismaModel> | $Enums.TaskStatus;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedEnumTaskStatusFilter<$PrismaModel>;
    _max?: NestedEnumTaskStatusFilter<$PrismaModel>;
  };

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null;
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null;
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null;
    lt?: number | IntFieldRefInput<$PrismaModel>;
    lte?: number | IntFieldRefInput<$PrismaModel>;
    gt?: number | IntFieldRefInput<$PrismaModel>;
    gte?: number | IntFieldRefInput<$PrismaModel>;
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null;
    _count?: NestedIntNullableFilter<$PrismaModel>;
    _avg?: NestedFloatNullableFilter<$PrismaModel>;
    _sum?: NestedIntNullableFilter<$PrismaModel>;
    _min?: NestedIntNullableFilter<$PrismaModel>;
    _max?: NestedIntNullableFilter<$PrismaModel>;
  };

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null;
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null;
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null;
    lt?: number | FloatFieldRefInput<$PrismaModel>;
    lte?: number | FloatFieldRefInput<$PrismaModel>;
    gt?: number | FloatFieldRefInput<$PrismaModel>;
    gte?: number | FloatFieldRefInput<$PrismaModel>;
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null;
  };

  export type NestedEnumReminderStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ReminderStatus | EnumReminderStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.ReminderStatus[] | ListEnumReminderStatusFieldRefInput<$PrismaModel>;
    notIn?: $Enums.ReminderStatus[] | ListEnumReminderStatusFieldRefInput<$PrismaModel>;
    not?: NestedEnumReminderStatusFilter<$PrismaModel> | $Enums.ReminderStatus;
  };

  export type NestedEnumReminderStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ReminderStatus | EnumReminderStatusFieldRefInput<$PrismaModel>;
    in?: $Enums.ReminderStatus[] | ListEnumReminderStatusFieldRefInput<$PrismaModel>;
    notIn?: $Enums.ReminderStatus[] | ListEnumReminderStatusFieldRefInput<$PrismaModel>;
    not?: NestedEnumReminderStatusWithAggregatesFilter<$PrismaModel> | $Enums.ReminderStatus;
    _count?: NestedIntFilter<$PrismaModel>;
    _min?: NestedEnumReminderStatusFilter<$PrismaModel>;
    _max?: NestedEnumReminderStatusFilter<$PrismaModel>;
  };

  export type GoalCreateWithoutUserInput = {
    id?: string;
    title: string;
    description?: string | null;
    deadline?: Date | string | null;
    background?: string | null;
    constraints?: string | null;
    status?: $Enums.GoalStatus;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    subGoals?: SubGoalCreateNestedManyWithoutGoalInput;
  };

  export type GoalUncheckedCreateWithoutUserInput = {
    id?: string;
    title: string;
    description?: string | null;
    deadline?: Date | string | null;
    background?: string | null;
    constraints?: string | null;
    status?: $Enums.GoalStatus;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    subGoals?: SubGoalUncheckedCreateNestedManyWithoutGoalInput;
  };

  export type GoalCreateOrConnectWithoutUserInput = {
    where: GoalWhereUniqueInput;
    create: XOR<GoalCreateWithoutUserInput, GoalUncheckedCreateWithoutUserInput>;
  };

  export type GoalCreateManyUserInputEnvelope = {
    data: GoalCreateManyUserInput | GoalCreateManyUserInput[];
    skipDuplicates?: boolean;
  };

  export type GoalUpsertWithWhereUniqueWithoutUserInput = {
    where: GoalWhereUniqueInput;
    update: XOR<GoalUpdateWithoutUserInput, GoalUncheckedUpdateWithoutUserInput>;
    create: XOR<GoalCreateWithoutUserInput, GoalUncheckedCreateWithoutUserInput>;
  };

  export type GoalUpdateWithWhereUniqueWithoutUserInput = {
    where: GoalWhereUniqueInput;
    data: XOR<GoalUpdateWithoutUserInput, GoalUncheckedUpdateWithoutUserInput>;
  };

  export type GoalUpdateManyWithWhereWithoutUserInput = {
    where: GoalScalarWhereInput;
    data: XOR<GoalUpdateManyMutationInput, GoalUncheckedUpdateManyWithoutUserInput>;
  };

  export type GoalScalarWhereInput = {
    AND?: GoalScalarWhereInput | GoalScalarWhereInput[];
    OR?: GoalScalarWhereInput[];
    NOT?: GoalScalarWhereInput | GoalScalarWhereInput[];
    id?: UuidFilter<'Goal'> | string;
    userId?: UuidFilter<'Goal'> | string;
    title?: StringFilter<'Goal'> | string;
    description?: StringNullableFilter<'Goal'> | string | null;
    deadline?: DateTimeNullableFilter<'Goal'> | Date | string | null;
    background?: StringNullableFilter<'Goal'> | string | null;
    constraints?: StringNullableFilter<'Goal'> | string | null;
    status?: EnumGoalStatusFilter<'Goal'> | $Enums.GoalStatus;
    progress?: IntFilter<'Goal'> | number;
    createdAt?: DateTimeFilter<'Goal'> | Date | string;
    updatedAt?: DateTimeFilter<'Goal'> | Date | string;
  };

  export type UserCreateWithoutGoalsInput = {
    id?: string;
    email: string;
    name: string;
    industry?: $Enums.UserIndustry | null;
    companySize?: $Enums.CompanySize | null;
    jobType?: string | null;
    position?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type UserUncheckedCreateWithoutGoalsInput = {
    id?: string;
    email: string;
    name: string;
    industry?: $Enums.UserIndustry | null;
    companySize?: $Enums.CompanySize | null;
    jobType?: string | null;
    position?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type UserCreateOrConnectWithoutGoalsInput = {
    where: UserWhereUniqueInput;
    create: XOR<UserCreateWithoutGoalsInput, UserUncheckedCreateWithoutGoalsInput>;
  };

  export type SubGoalCreateWithoutGoalInput = {
    id?: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    actions?: ActionCreateNestedManyWithoutSubGoalInput;
  };

  export type SubGoalUncheckedCreateWithoutGoalInput = {
    id?: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    actions?: ActionUncheckedCreateNestedManyWithoutSubGoalInput;
  };

  export type SubGoalCreateOrConnectWithoutGoalInput = {
    where: SubGoalWhereUniqueInput;
    create: XOR<SubGoalCreateWithoutGoalInput, SubGoalUncheckedCreateWithoutGoalInput>;
  };

  export type SubGoalCreateManyGoalInputEnvelope = {
    data: SubGoalCreateManyGoalInput | SubGoalCreateManyGoalInput[];
    skipDuplicates?: boolean;
  };

  export type UserUpsertWithoutGoalsInput = {
    update: XOR<UserUpdateWithoutGoalsInput, UserUncheckedUpdateWithoutGoalsInput>;
    create: XOR<UserCreateWithoutGoalsInput, UserUncheckedCreateWithoutGoalsInput>;
    where?: UserWhereInput;
  };

  export type UserUpdateToOneWithWhereWithoutGoalsInput = {
    where?: UserWhereInput;
    data: XOR<UserUpdateWithoutGoalsInput, UserUncheckedUpdateWithoutGoalsInput>;
  };

  export type UserUpdateWithoutGoalsInput = {
    id?: StringFieldUpdateOperationsInput | string;
    email?: StringFieldUpdateOperationsInput | string;
    name?: StringFieldUpdateOperationsInput | string;
    industry?: NullableEnumUserIndustryFieldUpdateOperationsInput | $Enums.UserIndustry | null;
    companySize?: NullableEnumCompanySizeFieldUpdateOperationsInput | $Enums.CompanySize | null;
    jobType?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type UserUncheckedUpdateWithoutGoalsInput = {
    id?: StringFieldUpdateOperationsInput | string;
    email?: StringFieldUpdateOperationsInput | string;
    name?: StringFieldUpdateOperationsInput | string;
    industry?: NullableEnumUserIndustryFieldUpdateOperationsInput | $Enums.UserIndustry | null;
    companySize?: NullableEnumCompanySizeFieldUpdateOperationsInput | $Enums.CompanySize | null;
    jobType?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type SubGoalUpsertWithWhereUniqueWithoutGoalInput = {
    where: SubGoalWhereUniqueInput;
    update: XOR<SubGoalUpdateWithoutGoalInput, SubGoalUncheckedUpdateWithoutGoalInput>;
    create: XOR<SubGoalCreateWithoutGoalInput, SubGoalUncheckedCreateWithoutGoalInput>;
  };

  export type SubGoalUpdateWithWhereUniqueWithoutGoalInput = {
    where: SubGoalWhereUniqueInput;
    data: XOR<SubGoalUpdateWithoutGoalInput, SubGoalUncheckedUpdateWithoutGoalInput>;
  };

  export type SubGoalUpdateManyWithWhereWithoutGoalInput = {
    where: SubGoalScalarWhereInput;
    data: XOR<SubGoalUpdateManyMutationInput, SubGoalUncheckedUpdateManyWithoutGoalInput>;
  };

  export type SubGoalScalarWhereInput = {
    AND?: SubGoalScalarWhereInput | SubGoalScalarWhereInput[];
    OR?: SubGoalScalarWhereInput[];
    NOT?: SubGoalScalarWhereInput | SubGoalScalarWhereInput[];
    id?: UuidFilter<'SubGoal'> | string;
    goalId?: UuidFilter<'SubGoal'> | string;
    title?: StringFilter<'SubGoal'> | string;
    description?: StringNullableFilter<'SubGoal'> | string | null;
    background?: StringNullableFilter<'SubGoal'> | string | null;
    constraints?: StringNullableFilter<'SubGoal'> | string | null;
    position?: IntFilter<'SubGoal'> | number;
    progress?: IntFilter<'SubGoal'> | number;
    createdAt?: DateTimeFilter<'SubGoal'> | Date | string;
    updatedAt?: DateTimeFilter<'SubGoal'> | Date | string;
  };

  export type GoalCreateWithoutSubGoalsInput = {
    id?: string;
    title: string;
    description?: string | null;
    deadline?: Date | string | null;
    background?: string | null;
    constraints?: string | null;
    status?: $Enums.GoalStatus;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: UserCreateNestedOneWithoutGoalsInput;
  };

  export type GoalUncheckedCreateWithoutSubGoalsInput = {
    id?: string;
    userId: string;
    title: string;
    description?: string | null;
    deadline?: Date | string | null;
    background?: string | null;
    constraints?: string | null;
    status?: $Enums.GoalStatus;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type GoalCreateOrConnectWithoutSubGoalsInput = {
    where: GoalWhereUniqueInput;
    create: XOR<GoalCreateWithoutSubGoalsInput, GoalUncheckedCreateWithoutSubGoalsInput>;
  };

  export type ActionCreateWithoutSubGoalInput = {
    id?: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    tasks?: TaskCreateNestedManyWithoutActionInput;
  };

  export type ActionUncheckedCreateWithoutSubGoalInput = {
    id?: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    tasks?: TaskUncheckedCreateNestedManyWithoutActionInput;
  };

  export type ActionCreateOrConnectWithoutSubGoalInput = {
    where: ActionWhereUniqueInput;
    create: XOR<ActionCreateWithoutSubGoalInput, ActionUncheckedCreateWithoutSubGoalInput>;
  };

  export type ActionCreateManySubGoalInputEnvelope = {
    data: ActionCreateManySubGoalInput | ActionCreateManySubGoalInput[];
    skipDuplicates?: boolean;
  };

  export type GoalUpsertWithoutSubGoalsInput = {
    update: XOR<GoalUpdateWithoutSubGoalsInput, GoalUncheckedUpdateWithoutSubGoalsInput>;
    create: XOR<GoalCreateWithoutSubGoalsInput, GoalUncheckedCreateWithoutSubGoalsInput>;
    where?: GoalWhereInput;
  };

  export type GoalUpdateToOneWithWhereWithoutSubGoalsInput = {
    where?: GoalWhereInput;
    data: XOR<GoalUpdateWithoutSubGoalsInput, GoalUncheckedUpdateWithoutSubGoalsInput>;
  };

  export type GoalUpdateWithoutSubGoalsInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumGoalStatusFieldUpdateOperationsInput | $Enums.GoalStatus;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    user?: UserUpdateOneRequiredWithoutGoalsNestedInput;
  };

  export type GoalUncheckedUpdateWithoutSubGoalsInput = {
    id?: StringFieldUpdateOperationsInput | string;
    userId?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumGoalStatusFieldUpdateOperationsInput | $Enums.GoalStatus;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type ActionUpsertWithWhereUniqueWithoutSubGoalInput = {
    where: ActionWhereUniqueInput;
    update: XOR<ActionUpdateWithoutSubGoalInput, ActionUncheckedUpdateWithoutSubGoalInput>;
    create: XOR<ActionCreateWithoutSubGoalInput, ActionUncheckedCreateWithoutSubGoalInput>;
  };

  export type ActionUpdateWithWhereUniqueWithoutSubGoalInput = {
    where: ActionWhereUniqueInput;
    data: XOR<ActionUpdateWithoutSubGoalInput, ActionUncheckedUpdateWithoutSubGoalInput>;
  };

  export type ActionUpdateManyWithWhereWithoutSubGoalInput = {
    where: ActionScalarWhereInput;
    data: XOR<ActionUpdateManyMutationInput, ActionUncheckedUpdateManyWithoutSubGoalInput>;
  };

  export type ActionScalarWhereInput = {
    AND?: ActionScalarWhereInput | ActionScalarWhereInput[];
    OR?: ActionScalarWhereInput[];
    NOT?: ActionScalarWhereInput | ActionScalarWhereInput[];
    id?: UuidFilter<'Action'> | string;
    subGoalId?: UuidFilter<'Action'> | string;
    title?: StringFilter<'Action'> | string;
    description?: StringNullableFilter<'Action'> | string | null;
    background?: StringNullableFilter<'Action'> | string | null;
    constraints?: StringNullableFilter<'Action'> | string | null;
    position?: IntFilter<'Action'> | number;
    progress?: IntFilter<'Action'> | number;
    createdAt?: DateTimeFilter<'Action'> | Date | string;
    updatedAt?: DateTimeFilter<'Action'> | Date | string;
  };

  export type SubGoalCreateWithoutActionsInput = {
    id?: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    goal: GoalCreateNestedOneWithoutSubGoalsInput;
  };

  export type SubGoalUncheckedCreateWithoutActionsInput = {
    id?: string;
    goalId: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type SubGoalCreateOrConnectWithoutActionsInput = {
    where: SubGoalWhereUniqueInput;
    create: XOR<SubGoalCreateWithoutActionsInput, SubGoalUncheckedCreateWithoutActionsInput>;
  };

  export type TaskCreateWithoutActionInput = {
    id?: string;
    title: string;
    description?: string | null;
    type?: $Enums.TaskType;
    status?: $Enums.TaskStatus;
    estimatedTime?: number | null;
    completedAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    reminders?: TaskReminderCreateNestedManyWithoutTaskInput;
    reflections?: ReflectionCreateNestedManyWithoutTaskInput;
  };

  export type TaskUncheckedCreateWithoutActionInput = {
    id?: string;
    title: string;
    description?: string | null;
    type?: $Enums.TaskType;
    status?: $Enums.TaskStatus;
    estimatedTime?: number | null;
    completedAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    reminders?: TaskReminderUncheckedCreateNestedManyWithoutTaskInput;
    reflections?: ReflectionUncheckedCreateNestedManyWithoutTaskInput;
  };

  export type TaskCreateOrConnectWithoutActionInput = {
    where: TaskWhereUniqueInput;
    create: XOR<TaskCreateWithoutActionInput, TaskUncheckedCreateWithoutActionInput>;
  };

  export type TaskCreateManyActionInputEnvelope = {
    data: TaskCreateManyActionInput | TaskCreateManyActionInput[];
    skipDuplicates?: boolean;
  };

  export type SubGoalUpsertWithoutActionsInput = {
    update: XOR<SubGoalUpdateWithoutActionsInput, SubGoalUncheckedUpdateWithoutActionsInput>;
    create: XOR<SubGoalCreateWithoutActionsInput, SubGoalUncheckedCreateWithoutActionsInput>;
    where?: SubGoalWhereInput;
  };

  export type SubGoalUpdateToOneWithWhereWithoutActionsInput = {
    where?: SubGoalWhereInput;
    data: XOR<SubGoalUpdateWithoutActionsInput, SubGoalUncheckedUpdateWithoutActionsInput>;
  };

  export type SubGoalUpdateWithoutActionsInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    goal?: GoalUpdateOneRequiredWithoutSubGoalsNestedInput;
  };

  export type SubGoalUncheckedUpdateWithoutActionsInput = {
    id?: StringFieldUpdateOperationsInput | string;
    goalId?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TaskUpsertWithWhereUniqueWithoutActionInput = {
    where: TaskWhereUniqueInput;
    update: XOR<TaskUpdateWithoutActionInput, TaskUncheckedUpdateWithoutActionInput>;
    create: XOR<TaskCreateWithoutActionInput, TaskUncheckedCreateWithoutActionInput>;
  };

  export type TaskUpdateWithWhereUniqueWithoutActionInput = {
    where: TaskWhereUniqueInput;
    data: XOR<TaskUpdateWithoutActionInput, TaskUncheckedUpdateWithoutActionInput>;
  };

  export type TaskUpdateManyWithWhereWithoutActionInput = {
    where: TaskScalarWhereInput;
    data: XOR<TaskUpdateManyMutationInput, TaskUncheckedUpdateManyWithoutActionInput>;
  };

  export type TaskScalarWhereInput = {
    AND?: TaskScalarWhereInput | TaskScalarWhereInput[];
    OR?: TaskScalarWhereInput[];
    NOT?: TaskScalarWhereInput | TaskScalarWhereInput[];
    id?: UuidFilter<'Task'> | string;
    actionId?: UuidFilter<'Task'> | string;
    title?: StringFilter<'Task'> | string;
    description?: StringNullableFilter<'Task'> | string | null;
    type?: EnumTaskTypeFilter<'Task'> | $Enums.TaskType;
    status?: EnumTaskStatusFilter<'Task'> | $Enums.TaskStatus;
    estimatedTime?: IntNullableFilter<'Task'> | number | null;
    completedAt?: DateTimeNullableFilter<'Task'> | Date | string | null;
    createdAt?: DateTimeFilter<'Task'> | Date | string;
    updatedAt?: DateTimeFilter<'Task'> | Date | string;
  };

  export type ActionCreateWithoutTasksInput = {
    id?: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    subGoal: SubGoalCreateNestedOneWithoutActionsInput;
  };

  export type ActionUncheckedCreateWithoutTasksInput = {
    id?: string;
    subGoalId: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type ActionCreateOrConnectWithoutTasksInput = {
    where: ActionWhereUniqueInput;
    create: XOR<ActionCreateWithoutTasksInput, ActionUncheckedCreateWithoutTasksInput>;
  };

  export type TaskReminderCreateWithoutTaskInput = {
    id?: string;
    reminderAt: Date | string;
    message?: string | null;
    status?: $Enums.ReminderStatus;
    sentAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type TaskReminderUncheckedCreateWithoutTaskInput = {
    id?: string;
    reminderAt: Date | string;
    message?: string | null;
    status?: $Enums.ReminderStatus;
    sentAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type TaskReminderCreateOrConnectWithoutTaskInput = {
    where: TaskReminderWhereUniqueInput;
    create: XOR<TaskReminderCreateWithoutTaskInput, TaskReminderUncheckedCreateWithoutTaskInput>;
  };

  export type TaskReminderCreateManyTaskInputEnvelope = {
    data: TaskReminderCreateManyTaskInput | TaskReminderCreateManyTaskInput[];
    skipDuplicates?: boolean;
  };

  export type ReflectionCreateWithoutTaskInput = {
    id?: string;
    content: string;
    rating?: number | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type ReflectionUncheckedCreateWithoutTaskInput = {
    id?: string;
    content: string;
    rating?: number | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type ReflectionCreateOrConnectWithoutTaskInput = {
    where: ReflectionWhereUniqueInput;
    create: XOR<ReflectionCreateWithoutTaskInput, ReflectionUncheckedCreateWithoutTaskInput>;
  };

  export type ReflectionCreateManyTaskInputEnvelope = {
    data: ReflectionCreateManyTaskInput | ReflectionCreateManyTaskInput[];
    skipDuplicates?: boolean;
  };

  export type ActionUpsertWithoutTasksInput = {
    update: XOR<ActionUpdateWithoutTasksInput, ActionUncheckedUpdateWithoutTasksInput>;
    create: XOR<ActionCreateWithoutTasksInput, ActionUncheckedCreateWithoutTasksInput>;
    where?: ActionWhereInput;
  };

  export type ActionUpdateToOneWithWhereWithoutTasksInput = {
    where?: ActionWhereInput;
    data: XOR<ActionUpdateWithoutTasksInput, ActionUncheckedUpdateWithoutTasksInput>;
  };

  export type ActionUpdateWithoutTasksInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    subGoal?: SubGoalUpdateOneRequiredWithoutActionsNestedInput;
  };

  export type ActionUncheckedUpdateWithoutTasksInput = {
    id?: StringFieldUpdateOperationsInput | string;
    subGoalId?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TaskReminderUpsertWithWhereUniqueWithoutTaskInput = {
    where: TaskReminderWhereUniqueInput;
    update: XOR<TaskReminderUpdateWithoutTaskInput, TaskReminderUncheckedUpdateWithoutTaskInput>;
    create: XOR<TaskReminderCreateWithoutTaskInput, TaskReminderUncheckedCreateWithoutTaskInput>;
  };

  export type TaskReminderUpdateWithWhereUniqueWithoutTaskInput = {
    where: TaskReminderWhereUniqueInput;
    data: XOR<TaskReminderUpdateWithoutTaskInput, TaskReminderUncheckedUpdateWithoutTaskInput>;
  };

  export type TaskReminderUpdateManyWithWhereWithoutTaskInput = {
    where: TaskReminderScalarWhereInput;
    data: XOR<TaskReminderUpdateManyMutationInput, TaskReminderUncheckedUpdateManyWithoutTaskInput>;
  };

  export type TaskReminderScalarWhereInput = {
    AND?: TaskReminderScalarWhereInput | TaskReminderScalarWhereInput[];
    OR?: TaskReminderScalarWhereInput[];
    NOT?: TaskReminderScalarWhereInput | TaskReminderScalarWhereInput[];
    id?: UuidFilter<'TaskReminder'> | string;
    taskId?: UuidFilter<'TaskReminder'> | string;
    reminderAt?: DateTimeFilter<'TaskReminder'> | Date | string;
    message?: StringNullableFilter<'TaskReminder'> | string | null;
    status?: EnumReminderStatusFilter<'TaskReminder'> | $Enums.ReminderStatus;
    sentAt?: DateTimeNullableFilter<'TaskReminder'> | Date | string | null;
    createdAt?: DateTimeFilter<'TaskReminder'> | Date | string;
    updatedAt?: DateTimeFilter<'TaskReminder'> | Date | string;
  };

  export type ReflectionUpsertWithWhereUniqueWithoutTaskInput = {
    where: ReflectionWhereUniqueInput;
    update: XOR<ReflectionUpdateWithoutTaskInput, ReflectionUncheckedUpdateWithoutTaskInput>;
    create: XOR<ReflectionCreateWithoutTaskInput, ReflectionUncheckedCreateWithoutTaskInput>;
  };

  export type ReflectionUpdateWithWhereUniqueWithoutTaskInput = {
    where: ReflectionWhereUniqueInput;
    data: XOR<ReflectionUpdateWithoutTaskInput, ReflectionUncheckedUpdateWithoutTaskInput>;
  };

  export type ReflectionUpdateManyWithWhereWithoutTaskInput = {
    where: ReflectionScalarWhereInput;
    data: XOR<ReflectionUpdateManyMutationInput, ReflectionUncheckedUpdateManyWithoutTaskInput>;
  };

  export type ReflectionScalarWhereInput = {
    AND?: ReflectionScalarWhereInput | ReflectionScalarWhereInput[];
    OR?: ReflectionScalarWhereInput[];
    NOT?: ReflectionScalarWhereInput | ReflectionScalarWhereInput[];
    id?: UuidFilter<'Reflection'> | string;
    taskId?: UuidFilter<'Reflection'> | string;
    content?: StringFilter<'Reflection'> | string;
    rating?: IntNullableFilter<'Reflection'> | number | null;
    createdAt?: DateTimeFilter<'Reflection'> | Date | string;
    updatedAt?: DateTimeFilter<'Reflection'> | Date | string;
  };

  export type TaskCreateWithoutRemindersInput = {
    id?: string;
    title: string;
    description?: string | null;
    type?: $Enums.TaskType;
    status?: $Enums.TaskStatus;
    estimatedTime?: number | null;
    completedAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    action: ActionCreateNestedOneWithoutTasksInput;
    reflections?: ReflectionCreateNestedManyWithoutTaskInput;
  };

  export type TaskUncheckedCreateWithoutRemindersInput = {
    id?: string;
    actionId: string;
    title: string;
    description?: string | null;
    type?: $Enums.TaskType;
    status?: $Enums.TaskStatus;
    estimatedTime?: number | null;
    completedAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    reflections?: ReflectionUncheckedCreateNestedManyWithoutTaskInput;
  };

  export type TaskCreateOrConnectWithoutRemindersInput = {
    where: TaskWhereUniqueInput;
    create: XOR<TaskCreateWithoutRemindersInput, TaskUncheckedCreateWithoutRemindersInput>;
  };

  export type TaskUpsertWithoutRemindersInput = {
    update: XOR<TaskUpdateWithoutRemindersInput, TaskUncheckedUpdateWithoutRemindersInput>;
    create: XOR<TaskCreateWithoutRemindersInput, TaskUncheckedCreateWithoutRemindersInput>;
    where?: TaskWhereInput;
  };

  export type TaskUpdateToOneWithWhereWithoutRemindersInput = {
    where?: TaskWhereInput;
    data: XOR<TaskUpdateWithoutRemindersInput, TaskUncheckedUpdateWithoutRemindersInput>;
  };

  export type TaskUpdateWithoutRemindersInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    type?: EnumTaskTypeFieldUpdateOperationsInput | $Enums.TaskType;
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus;
    estimatedTime?: NullableIntFieldUpdateOperationsInput | number | null;
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    action?: ActionUpdateOneRequiredWithoutTasksNestedInput;
    reflections?: ReflectionUpdateManyWithoutTaskNestedInput;
  };

  export type TaskUncheckedUpdateWithoutRemindersInput = {
    id?: StringFieldUpdateOperationsInput | string;
    actionId?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    type?: EnumTaskTypeFieldUpdateOperationsInput | $Enums.TaskType;
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus;
    estimatedTime?: NullableIntFieldUpdateOperationsInput | number | null;
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    reflections?: ReflectionUncheckedUpdateManyWithoutTaskNestedInput;
  };

  export type TaskCreateWithoutReflectionsInput = {
    id?: string;
    title: string;
    description?: string | null;
    type?: $Enums.TaskType;
    status?: $Enums.TaskStatus;
    estimatedTime?: number | null;
    completedAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    action: ActionCreateNestedOneWithoutTasksInput;
    reminders?: TaskReminderCreateNestedManyWithoutTaskInput;
  };

  export type TaskUncheckedCreateWithoutReflectionsInput = {
    id?: string;
    actionId: string;
    title: string;
    description?: string | null;
    type?: $Enums.TaskType;
    status?: $Enums.TaskStatus;
    estimatedTime?: number | null;
    completedAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    reminders?: TaskReminderUncheckedCreateNestedManyWithoutTaskInput;
  };

  export type TaskCreateOrConnectWithoutReflectionsInput = {
    where: TaskWhereUniqueInput;
    create: XOR<TaskCreateWithoutReflectionsInput, TaskUncheckedCreateWithoutReflectionsInput>;
  };

  export type TaskUpsertWithoutReflectionsInput = {
    update: XOR<TaskUpdateWithoutReflectionsInput, TaskUncheckedUpdateWithoutReflectionsInput>;
    create: XOR<TaskCreateWithoutReflectionsInput, TaskUncheckedCreateWithoutReflectionsInput>;
    where?: TaskWhereInput;
  };

  export type TaskUpdateToOneWithWhereWithoutReflectionsInput = {
    where?: TaskWhereInput;
    data: XOR<TaskUpdateWithoutReflectionsInput, TaskUncheckedUpdateWithoutReflectionsInput>;
  };

  export type TaskUpdateWithoutReflectionsInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    type?: EnumTaskTypeFieldUpdateOperationsInput | $Enums.TaskType;
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus;
    estimatedTime?: NullableIntFieldUpdateOperationsInput | number | null;
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    action?: ActionUpdateOneRequiredWithoutTasksNestedInput;
    reminders?: TaskReminderUpdateManyWithoutTaskNestedInput;
  };

  export type TaskUncheckedUpdateWithoutReflectionsInput = {
    id?: StringFieldUpdateOperationsInput | string;
    actionId?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    type?: EnumTaskTypeFieldUpdateOperationsInput | $Enums.TaskType;
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus;
    estimatedTime?: NullableIntFieldUpdateOperationsInput | number | null;
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    reminders?: TaskReminderUncheckedUpdateManyWithoutTaskNestedInput;
  };

  export type GoalCreateManyUserInput = {
    id?: string;
    title: string;
    description?: string | null;
    deadline?: Date | string | null;
    background?: string | null;
    constraints?: string | null;
    status?: $Enums.GoalStatus;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type GoalUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumGoalStatusFieldUpdateOperationsInput | $Enums.GoalStatus;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    subGoals?: SubGoalUpdateManyWithoutGoalNestedInput;
  };

  export type GoalUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumGoalStatusFieldUpdateOperationsInput | $Enums.GoalStatus;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    subGoals?: SubGoalUncheckedUpdateManyWithoutGoalNestedInput;
  };

  export type GoalUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    deadline?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumGoalStatusFieldUpdateOperationsInput | $Enums.GoalStatus;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type SubGoalCreateManyGoalInput = {
    id?: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type SubGoalUpdateWithoutGoalInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    actions?: ActionUpdateManyWithoutSubGoalNestedInput;
  };

  export type SubGoalUncheckedUpdateWithoutGoalInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    actions?: ActionUncheckedUpdateManyWithoutSubGoalNestedInput;
  };

  export type SubGoalUncheckedUpdateManyWithoutGoalInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type ActionCreateManySubGoalInput = {
    id?: string;
    title: string;
    description?: string | null;
    background?: string | null;
    constraints?: string | null;
    position: number;
    progress?: number;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type ActionUpdateWithoutSubGoalInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    tasks?: TaskUpdateManyWithoutActionNestedInput;
  };

  export type ActionUncheckedUpdateWithoutSubGoalInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    tasks?: TaskUncheckedUpdateManyWithoutActionNestedInput;
  };

  export type ActionUncheckedUpdateManyWithoutSubGoalInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    background?: NullableStringFieldUpdateOperationsInput | string | null;
    constraints?: NullableStringFieldUpdateOperationsInput | string | null;
    position?: IntFieldUpdateOperationsInput | number;
    progress?: IntFieldUpdateOperationsInput | number;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TaskCreateManyActionInput = {
    id?: string;
    title: string;
    description?: string | null;
    type?: $Enums.TaskType;
    status?: $Enums.TaskStatus;
    estimatedTime?: number | null;
    completedAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type TaskUpdateWithoutActionInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    type?: EnumTaskTypeFieldUpdateOperationsInput | $Enums.TaskType;
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus;
    estimatedTime?: NullableIntFieldUpdateOperationsInput | number | null;
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    reminders?: TaskReminderUpdateManyWithoutTaskNestedInput;
    reflections?: ReflectionUpdateManyWithoutTaskNestedInput;
  };

  export type TaskUncheckedUpdateWithoutActionInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    type?: EnumTaskTypeFieldUpdateOperationsInput | $Enums.TaskType;
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus;
    estimatedTime?: NullableIntFieldUpdateOperationsInput | number | null;
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    reminders?: TaskReminderUncheckedUpdateManyWithoutTaskNestedInput;
    reflections?: ReflectionUncheckedUpdateManyWithoutTaskNestedInput;
  };

  export type TaskUncheckedUpdateManyWithoutActionInput = {
    id?: StringFieldUpdateOperationsInput | string;
    title?: StringFieldUpdateOperationsInput | string;
    description?: NullableStringFieldUpdateOperationsInput | string | null;
    type?: EnumTaskTypeFieldUpdateOperationsInput | $Enums.TaskType;
    status?: EnumTaskStatusFieldUpdateOperationsInput | $Enums.TaskStatus;
    estimatedTime?: NullableIntFieldUpdateOperationsInput | number | null;
    completedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TaskReminderCreateManyTaskInput = {
    id?: string;
    reminderAt: Date | string;
    message?: string | null;
    status?: $Enums.ReminderStatus;
    sentAt?: Date | string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type ReflectionCreateManyTaskInput = {
    id?: string;
    content: string;
    rating?: number | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };

  export type TaskReminderUpdateWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string;
    reminderAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    message?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumReminderStatusFieldUpdateOperationsInput | $Enums.ReminderStatus;
    sentAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TaskReminderUncheckedUpdateWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string;
    reminderAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    message?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumReminderStatusFieldUpdateOperationsInput | $Enums.ReminderStatus;
    sentAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type TaskReminderUncheckedUpdateManyWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string;
    reminderAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    message?: NullableStringFieldUpdateOperationsInput | string | null;
    status?: EnumReminderStatusFieldUpdateOperationsInput | $Enums.ReminderStatus;
    sentAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type ReflectionUpdateWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string;
    content?: StringFieldUpdateOperationsInput | string;
    rating?: NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type ReflectionUncheckedUpdateWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string;
    content?: StringFieldUpdateOperationsInput | string;
    rating?: NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  export type ReflectionUncheckedUpdateManyWithoutTaskInput = {
    id?: StringFieldUpdateOperationsInput | string;
    content?: StringFieldUpdateOperationsInput | string;
    rating?: NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string;
  };

  /**
   * Aliases for legacy arg types
   */
  /**
   * @deprecated Use UserCountOutputTypeDefaultArgs instead
   */
  export type UserCountOutputTypeArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = UserCountOutputTypeDefaultArgs<ExtArgs>;
  /**
   * @deprecated Use GoalCountOutputTypeDefaultArgs instead
   */
  export type GoalCountOutputTypeArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = GoalCountOutputTypeDefaultArgs<ExtArgs>;
  /**
   * @deprecated Use SubGoalCountOutputTypeDefaultArgs instead
   */
  export type SubGoalCountOutputTypeArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = SubGoalCountOutputTypeDefaultArgs<ExtArgs>;
  /**
   * @deprecated Use ActionCountOutputTypeDefaultArgs instead
   */
  export type ActionCountOutputTypeArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = ActionCountOutputTypeDefaultArgs<ExtArgs>;
  /**
   * @deprecated Use TaskCountOutputTypeDefaultArgs instead
   */
  export type TaskCountOutputTypeArgs<
    ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs,
  > = TaskCountOutputTypeDefaultArgs<ExtArgs>;
  /**
   * @deprecated Use UserDefaultArgs instead
   */
  export type UserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    UserDefaultArgs<ExtArgs>;
  /**
   * @deprecated Use GoalDefaultArgs instead
   */
  export type GoalArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    GoalDefaultArgs<ExtArgs>;
  /**
   * @deprecated Use SubGoalDefaultArgs instead
   */
  export type SubGoalArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    SubGoalDefaultArgs<ExtArgs>;
  /**
   * @deprecated Use ActionDefaultArgs instead
   */
  export type ActionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    ActionDefaultArgs<ExtArgs>;
  /**
   * @deprecated Use TaskDefaultArgs instead
   */
  export type TaskArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    TaskDefaultArgs<ExtArgs>;
  /**
   * @deprecated Use TaskReminderDefaultArgs instead
   */
  export type TaskReminderArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    TaskReminderDefaultArgs<ExtArgs>;
  /**
   * @deprecated Use ReflectionDefaultArgs instead
   */
  export type ReflectionArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    ReflectionDefaultArgs<ExtArgs>;

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number;
  };

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF;
}
