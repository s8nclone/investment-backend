import { describe, it, expect } from "vitest";
import { swaggerSpec } from "@/lib/swagger";

describe("Swagger Documentation Spec", () => {
  it("should generate a valid OpenAPI 3.0 specification object", () => {
    const spec = swaggerSpec as any;
    expect(spec).toBeDefined();
    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info.title).toContain("Investment Platform API");
    expect(spec.paths).toHaveProperty("/api/health");
    expect(spec.paths).toHaveProperty("/api/auth/login");
    expect(spec.paths).toHaveProperty("/api/admin/users");
  });
});
