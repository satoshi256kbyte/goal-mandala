export const contextAccessor = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  get: (_key: string) => null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  set: (_key: string, _value: unknown) => {},
};

export class ContextAccessorImpl {
  private context: Record<string, unknown> = {};

  get(key: string) {
    return this.context[key];
  }

  set(key: string, value: unknown) {
    this.context[key] = value;
  }
}
