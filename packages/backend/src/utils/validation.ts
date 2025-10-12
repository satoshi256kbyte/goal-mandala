export const validation = {
  isEmail: (email: string) => /\S+@\S+\.\S+/.test(email),
  isUUID: (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
  sanitize: (input: string) => input.trim(),
};
