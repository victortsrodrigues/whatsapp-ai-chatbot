import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/?(*.)+(integration.test).ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleDirectories: ["node_modules", "src"],
  roots: ["<rootDir>/src"],
  transform: {
    ".+\\.ts$": "ts-jest",
  },
  collectCoverage: true,
  coverageDirectory: "coverage-integration",
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/tests/**/*.ts",
    "!src/interfaces/**/*.ts",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/src/interfaces/",
    "/src/config/",
    "/src/tests/unit/",
    ".mock.ts",
  ],
  verbose: true,
  clearMocks: true,
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
  setupFilesAfterEnv: ["./src/tests/jest.integration.setup.ts"],
  resetMocks: false,
  resetModules: false,
  restoreMocks: true,
  bail: false,
  maxWorkers: 1,
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};

export default config;