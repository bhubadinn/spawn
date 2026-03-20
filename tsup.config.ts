import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["bin/spawn.ts"],
  outDir: "dist/bin",
  format: "esm",
  target: "node20",
  platform: "node",
  splitting: false,
  bundle: true,
  external: ["commander", "yaml", "chalk", "@inquirer/prompts"],
  onSuccess: async () => {
    const fs = await import("fs");
    const file = "dist/bin/spawn.js";
    let content = fs.readFileSync(file, "utf-8");
    // Replace tsx shebang with node shebang
    content = content.replace(/^#!.*\n/, "#!/usr/bin/env node\n");
    fs.writeFileSync(file, content);
    fs.chmodSync(file, 0o755);
  },
});
