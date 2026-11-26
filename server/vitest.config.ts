import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      DITA_DATA_DIR: "./.test-data",
      DITA_ROOT: "./.test-projects",
      DITA_PASSWORD: "test-password",
      DITA_SESSION_SECRET: "test-secret",
      OPENCODE_PASSWORD: "test-opencode",
    },
  },
});
