import * as z from "zod";

export const createPortfolioSchema = z.object({
  name: z.string().min(1, "Portfolio name is required"),
  description: z.string().optional(),
});

export const createInvestmentSchema = z.object({
  packageId: z.string().optional(),
  name: z.string().min(1, "Investment name is required"),
  description: z.string().optional(),
  amount: z.number().positive("Investment amount must be positive"),
  duration: z.number().positive("Duration must be positive"),
  riskLevel: z.enum(["LOW", "MODERATE", "HIGH", "AGGRESSIVE"]).optional(),
});

export const createWithdrawalSchema = z.object({
  amount: z.number().positive("Withdrawal amount must be positive"),
  method: z.enum(["BANK_TRANSFER", "CRYPTO", "PAYPAL", "CHECK"]),
  bankAccount: z.string().optional(),
  cryptoAddress: z.string().optional(),
  notes: z.string().optional(),
});

export const createDepositSchema = z.object({
  amount: z.number().positive("Deposit amount must be positive"),
  paymentMethod: z.string().optional().default("BANK_TRANSFER"),
  reference: z.string().optional(),
  description: z.string().optional(),
});