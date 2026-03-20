import { describe, it, expect } from "vitest";

describe("wizard/init-wizard", () => {
  it("exports runInitWizard function", async () => {
    const mod = await import("../../src/wizard/init-wizard.ts");
    expect(typeof mod.runInitWizard).toBe("function");
  });
});

describe("wizard/up-wizard", () => {
  it("exports runUpWizard function", async () => {
    const mod = await import("../../src/wizard/up-wizard.ts");
    expect(typeof mod.runUpWizard).toBe("function");
  });
});

describe("wizard/index", () => {
  it("barrel exports all wizard functions", async () => {
    const mod = await import("../../src/wizard/index.ts");
    expect(typeof mod.runInitWizard).toBe("function");
    expect(typeof mod.runUpWizard).toBe("function");
  });
});
