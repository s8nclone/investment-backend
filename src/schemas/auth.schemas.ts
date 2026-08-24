import * as z from "zod";

export const registerSchema = z
	.object({
		email: z.string().email("Invalid email format"),
		username: z
			.string()
			.min(3, "Username must be at least 3 characters")
			.optional(),
		firstName: z.string().min(1, "First name is required").optional(),
		lastName: z.string().min(1, "Last name is required").optional(),
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string(),
		phone: z.string().optional(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

export const loginSchema = z.object({
	email: z.string().email("Invalid email format"),
	password: z.string().min(1, "Password is required"),
	rememberMe: z.boolean().optional(),
});

export const refreshTokenSchema = z.object({
	refreshToken: z.string().min(1, "Refresh token is required"),
});
