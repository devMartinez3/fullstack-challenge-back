export function createMockPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };
}

export function createMockHttpService() {
  return {
    post: jest.fn(),
    get: jest.fn(),
  };
}

export function createMockConfigService(
  overrides: Record<string, string | undefined> = {},
) {
  const defaults: Record<string, string> = {
    REQRES_URL: 'https://reqres.in/api',
    SECRET_KEY: 'key',
  };
  return {
    get: jest.fn((key: string) =>
      key in overrides ? overrides[key] : defaults[key],
    ),
  };
}
