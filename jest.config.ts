import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleDirectories: ["node_modules", "src"],
  roots: ['<rootDir>/src'],
  transform: {
    ".+\\.ts$": "ts-jest",
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/tests/**/*.ts',
    '!src/interfaces/**/*.ts'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/src/interfaces/',
    '/src/config/',
    '/src/tests/',
    '.mock.ts'
  ],
  verbose: true,
  clearMocks: true,
  testTimeout: 20000,
  forceExit: true, // Force Jest to exit after all tests complete
  detectOpenHandles: true, // Help identify open handles preventing Jest from exiting
};

export default config;