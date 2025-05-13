import type { Config } from "@jest/types";
import baseConfig from "./jest.config";

const integrationConfig: Config.InitialOptions = {
  ...baseConfig,
  testMatch: ["**/?(*.)+(int.test).ts"],
  setupFilesAfterEnv: [], // Remove global mocks
  detectOpenHandles: false, // Disable for Docker cleanup
  testTimeout: 30000, // Longer timeout for real operations
  globalTeardown: "<rootDir>/src/tests/jest.integration.teardown.ts"
};

export default integrationConfig;