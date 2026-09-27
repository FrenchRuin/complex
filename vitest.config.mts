import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname) },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    // fixtures/sms/*.txt 는 테스트에서 직접 읽는다
    env: { TZ: "UTC" },
  },
});
