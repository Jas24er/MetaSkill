import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["cli/tests/**/*.test.ts"],
    testTimeout: 45000,
    hookTimeout: 30000,
    maxWorkers: 2,
  },
});
