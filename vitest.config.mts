import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // The gym engine tests simulate hundreds of drafts; 5 s is too tight on a busy machine.
  test: { environment: "node", include: ["src/**/*.test.ts"], testTimeout: 30_000 },
});
