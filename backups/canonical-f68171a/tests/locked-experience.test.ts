import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

describe("Locked STAARWAARDD experience invariants", () => {
  it("preserves the approved native package, version, versionCode, and platforms", () => {
    const config = read("app.config.ts");
    expect(config).toContain('const rawBundleId = "com.app.staarwarddhub"');
    expect(config).toContain('version: "1.2.0"');
    expect(config).toContain("versionCode: 3");
    expect(config).toContain('platforms: ["android", "ios"]');
  });

  it("preserves the existing Home portal route and the seven portal identifiers", () => {
    const portalRoute = read("app/portal/[id].tsx");
    const portalMetadata = read("lib/staarwardd/portal-meta.ts");
    expect(portalRoute).toContain("PortalScreen");
    for (const portalId of ["creativity", "work", "home", "wellbeing", "relationships", "events", "style"]) {
      expect(portalMetadata).toContain(`\"${portalId}\"`);
    }
  });

  it("preserves the approved launch, Guardian, audio-control, and media source files", () => {
    for (const path of [
      "components/staarwardd/launch-sequence.tsx",
      "components/staarwardd/guardian-character.tsx",
      "components/staarwardd/audio-controls.tsx",
      "lib/staarwardd/audio-provider.tsx",
      "assets/images/icon.png",
      "assets/images/android-icon-foreground.png",
    ]) {
      expect(existsSync(join(root, path))).toBe(true);
    }
    expect(read("components/staarwardd/audio-controls.tsx")).toContain("Master");
  });

  it("retains reduced-motion support in the cinematic launch sequence", () => {
    const launch = read("components/staarwardd/launch-sequence.tsx");
    expect(launch).toMatch(/reduced|reduceMotion|useReducedMotion/i);
  });
});
