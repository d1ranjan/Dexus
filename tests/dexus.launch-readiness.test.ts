import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) => readFileSync(`${process.cwd()}/${path}`, "utf8");

describe("Dexus launch-readiness route contract (simulated, not a physical-device test)", () => {
  it("publishes implementation-grounded legal routes and exposes them from the unauthenticated entry screen", () => {
    const welcome = projectFile("app/welcome.tsx");
    const privacy = projectFile("app/privacy.tsx");
    const terms = projectFile("app/terms.tsx");
    const legalDocument = projectFile("components/dexus/legal-document.tsx");
    expect(welcome).toContain('router.push("/privacy")');
    expect(welcome).toContain('router.push("/terms")');
    expect(welcome).toContain("Created by Dipanshu Ranjan");
    expect(privacy).toContain("Privacy Policy");
    expect(terms).toContain("Terms of Service");
    expect(legalDocument).toContain("Draft — legal review required");
  });

  it("keeps custom-domain deployment explicitly pending until owner-provided DNS values exist", () => {
    const domainGuide = projectFile("DOMAIN_SETUP.md");
    const config = projectFile("app.config.ts");
    expect(domainGuide).toContain("Pending an owner-provided domain");
    expect(domainGuide).toContain("Do not add DNS records");
    expect(config).not.toMatch(/customDomain|canonicalUrl|www\.dexus|dexus\.com/);
  });
});
