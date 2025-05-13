import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/?(*.)+(spec|unit.test).ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleDirectories: ["node_modules", "src"],
  roots: ["<rootDir>/src"],
  transform: {
    ".+\\.ts$": "ts-jest",
  },
  collectCoverage: true,
  coverageDirectory: "coverage",
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
    "/src/tests/",
    ".mock.ts",
  ],
  verbose: true,
  clearMocks: true,
  testTimeout: 20000,
  forceExit: true,
  detectOpenHandles: true,
  setupFilesAfterEnv: ["./src/tests/jest.unit.setup.ts"],
  resetMocks: false,
  resetModules: true,
  restoreMocks: true,
};

export default config;
