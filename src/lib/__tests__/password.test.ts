import { describe, it, expect } from "vitest";
import { PasswordService } from "@/lib/password";

describe("PasswordService", () => {
  it("should hash a password and verify it correctly", async () => {
    const plainPassword = "Password123!";
    const hash = await PasswordService.hashPassword(plainPassword);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash).not.toBe(plainPassword);

    const isValid = await PasswordService.comparePassword(plainPassword, hash);
    expect(isValid).toBe(true);

    const isInvalid = await PasswordService.comparePassword("WrongPassword1!", hash);
    expect(isInvalid).toBe(false);
  });

  it("should validate password complexity correctly", () => {
    const valid = PasswordService.validatePasswordStrength("SecureP@ss1");
    expect(valid.isValid).toBe(true);
    expect(valid.errors).toHaveLength(0);

    const short = PasswordService.validatePasswordStrength("P@1a");
    expect(short.isValid).toBe(false);
    expect(short.errors).toContain("Password must be at least 8 characters long");

    const noUpper = PasswordService.validatePasswordStrength("password123!");
    expect(noUpper.isValid).toBe(false);
    expect(noUpper.errors).toContain("Password must contain at least one uppercase letter");

    const noNumber = PasswordService.validatePasswordStrength("Password!");
    expect(noNumber.isValid).toBe(false);
    expect(noNumber.errors).toContain("Password must contain at least one number");
  });
});
