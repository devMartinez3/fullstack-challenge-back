module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/test/**',
    '!src/main.ts',
    '!src/lambda.ts',
    '!src/**/*.module.ts',
    '!src/**/*.controller.ts',
    '!src/**/*.middleware.ts',
    '!src/**/*.dto.ts',
  ],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@pris/(.*)$': '<rootDir>/prisma/$1',
  },
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 80,
      functions: 100,
      lines: 90,
    },
  },
};
