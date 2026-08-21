import bcrypt from "bcryptjs";

const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12");

export class PasswordService {
  static async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      const hashedPassword = await bcrypt.hash(password, salt);
      return hashedPassword;
    } catch (error) {
      throw new Error("Failed to hash password");
    }
  }

  static async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw new Error("Failed to compare password");
    }
  }

  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    score: number;
  } {
    const errors: string[] = [];
    let score = 0;

    // Minimum length check
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    } else {
      score += 1;
    }

    // Maximum length check
    if (password.length > 128) {
      errors.push("Password must be less than 128 characters long");
    }

    // Contains lowercase
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    } else {
      score += 1;
    }

    // Contains uppercase
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    } else {
      score += 1;
    }

    // Contains number
    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    } else {
      score += 1;
    }

    // Contains special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Password must contain at least one special character");
    } else {
      score += 1;
    }

    // No common patterns
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /letmein/i,
      /welcome/i,
      /monkey/i,
      /dragon/i,
    ];

    if (commonPatterns.some((pattern) => pattern.test(password))) {
      errors.push("Password contains common patterns and is not secure");
      score = Math.max(0, score - 2);
    }

    // No repeated characters
    if (/(.)\1{2,}/.test(password)) {
      errors.push("Password should not contain repeated characters");
      score = Math.max(0, score - 1);
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.min(5, score),
    };
  }

  static generateSecurePassword(length: number = 16): string {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    const allChars = lowercase + uppercase + numbers + symbols;
    let password = "";

    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }
}
