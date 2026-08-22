import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Investment Platform API",
      version: "1.0.0",
      description:
        "API documentation for the Investment Platform backend service.",
      contact: {
        name: "API Support",
        email: "support@investmentplatform.com",
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === "production"
        ? "https://investment-backend.vercel.app"
        : "http://localhost:3000",
      description: process.env.NODE_ENV === "production"
        ? "Production Server"
        : "Local Development Server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT access token.",
        },
      },
      schemas: {
        UserProfile: {
          type: "object",
          properties: {
            id: { type: "string", example: "cuid123456789" },
            email: { type: "string", example: "user@investment.com" },
            username: { type: "string", example: "trader_joe" },
            firstName: { type: "string", example: "Joe" },
            lastName: { type: "string", example: "Doe" },
            phone: { type: "string", example: "+1 555-1234" },
            role: { type: "string", enum: ["USER", "ADMIN", "SUPER_ADMIN"] },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED"] },
            kycStatus: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"] },
            totalInvestment: { type: "number", example: 10000.0 },
            currentBalance: { type: "number", example: 12500.5 },
            totalReturns: { type: "number", example: 2500.5 },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Error message description" },
            code: { type: "string", example: "ERROR_CODE" },
          },
        },
      },
    },
    tags: [
      { name: "Health", description: "System health and status" },
      { name: "Auth", description: "Authentication and session management" },
      { name: "Dashboard", description: "User dashboard, portfolios, investments, transactions, and withdrawals" },
      { name: "Admin", description: "Administrative operations (requires ADMIN or SUPER_ADMIN role)" },
    ],
    paths: {
      // ──────────────────────────────────────────
      // Health
      // ──────────────────────────────────────────
      "/api/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          description: "Returns system and database connection status.",
          responses: {
            200: { description: "System healthy" },
          },
        },
      },
      "/api/ping": {
        get: {
          tags: ["Health"],
          summary: "Ping",
          description: "Simple ping/pong endpoint.",
          responses: {
            200: { description: "Pong response" },
          },
        },
      },

      // ──────────────────────────────────────────
      // Auth (Public)
      // ──────────────────────────────────────────
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register new user",
          description: "Creates a new user account. Rate limited.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "confirmPassword"],
                  properties: {
                    email: { type: "string", example: "newuser@investment.com" },
                    username: { type: "string", example: "trader1" },
                    firstName: { type: "string", example: "John" },
                    lastName: { type: "string", example: "Doe" },
                    password: { type: "string", example: "SecurePass123!" },
                    confirmPassword: { type: "string", example: "SecurePass123!" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "User registered successfully" },
            400: { description: "Validation error or weak password" },
            409: { description: "Email or username already exists" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "User login",
          description: "Authenticates user and returns JWT access and refresh tokens. Rate limited.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", example: "user@investment.com" },
                    password: { type: "string", example: "SecurePass123!" },
                    rememberMe: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Login successful with JWT tokens" },
            401: { description: "Invalid credentials" },
          },
        },
      },
      "/api/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Refresh access token",
          description: "Exchanges a valid refresh token for a new access token. Rate limited.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string", example: "eyJhbGciOi..." },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "New access token issued" },
            401: { description: "Invalid or expired refresh token" },
          },
        },
      },

      // ──────────────────────────────────────────
      // Auth (Protected)
      // ──────────────────────────────────────────
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout current session",
          description: "Invalidates the current session token.",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "Logged out successfully" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/auth/logout-all": {
        post: {
          tags: ["Auth"],
          summary: "Logout all sessions",
          description: "Invalidates all active sessions for the authenticated user.",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "All sessions terminated" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get current user profile",
          description: "Returns the authenticated user's profile.",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "User profile data" },
            401: { description: "Unauthorized" },
          },
        },
      },

      // ──────────────────────────────────────────
      // Dashboard
      // ──────────────────────────────────────────
      "/api/dashboard/overview": {
        get: {
          tags: ["Dashboard"],
          summary: "Get dashboard overview",
          description: "Returns portfolio summary, active investments, and analytics for the authenticated user.",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "Dashboard overview data" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/dashboard/portfolios": {
        get: {
          tags: ["Dashboard"],
          summary: "Get user portfolios",
          description: "Returns all portfolios belonging to the authenticated user.",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "List of portfolios" },
            401: { description: "Unauthorized" },
          },
        },
        post: {
          tags: ["Dashboard"],
          summary: "Create portfolio",
          description: "Creates a new investment portfolio.",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", example: "Growth Portfolio" },
                    description: { type: "string", example: "Long-term growth investments" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Portfolio created" },
            400: { description: "Validation error" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/dashboard/investments": {
        get: {
          tags: ["Dashboard"],
          summary: "Get user investments",
          description: "Returns all investments for the authenticated user.",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "List of investments" },
            401: { description: "Unauthorized" },
          },
        },
        post: {
          tags: ["Dashboard"],
          summary: "Create investment",
          description: "Creates a new investment entry.",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["packageId", "amount"],
                  properties: {
                    packageId: { type: "string", example: "pkg_abc123" },
                    amount: { type: "number", example: 5000 },
                    name: { type: "string", example: "Silver Plan Investment" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Investment created" },
            400: { description: "Validation error" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/dashboard/transactions": {
        get: {
          tags: ["Dashboard"],
          summary: "Get user transactions",
          description: "Returns transaction history for the authenticated user.",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "List of transactions" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/dashboard/withdrawals": {
        post: {
          tags: ["Dashboard"],
          summary: "Create withdrawal request",
          description: "Submits a new withdrawal request for processing.",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["amount", "method"],
                  properties: {
                    amount: { type: "number", example: 1000 },
                    method: { type: "string", enum: ["BANK_TRANSFER", "CRYPTO", "PAYPAL"], example: "BANK_TRANSFER" },
                    bankAccount: { type: "string", example: "1234567890" },
                    cryptoAddress: { type: "string", example: "0xABC..." },
                    notes: { type: "string", example: "Monthly withdrawal" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Withdrawal request submitted" },
            400: { description: "Validation error or insufficient balance" },
            401: { description: "Unauthorized" },
          },
        },
      },

      // ──────────────────────────────────────────
      // Admin
      // ──────────────────────────────────────────
      "/api/admin/stats": {
        get: {
          tags: ["Admin"],
          summary: "Get platform statistics",
          description: "Returns aggregated platform metrics: user counts, total balances, deposits, recent users.",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "Platform statistics" },
            403: { description: "Forbidden: requires Admin role" },
          },
        },
      },
      "/api/admin/users": {
        get: {
          tags: ["Admin"],
          summary: "Get all users",
          description: "Returns a paginated, filterable list of all platform users.",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "search", in: "query", schema: { type: "string" }, description: "Search by name, email, or username" },
            { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED"] } },
            { name: "kycStatus", in: "query", schema: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"] } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
            { name: "sortBy", in: "query", schema: { type: "string", enum: ["createdAt", "firstName", "lastName", "email"], default: "createdAt" } },
            { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
          ],
          responses: {
            200: { description: "Paginated users list" },
            403: { description: "Forbidden: requires Admin role" },
          },
        },
        post: {
          tags: ["Admin"],
          summary: "Create user",
          description: "Admin creates a new user account directly.",
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", example: "newuser@investment.com" },
                    password: { type: "string", example: "TempPass123!" },
                    firstName: { type: "string", example: "Jane" },
                    lastName: { type: "string", example: "Smith" },
                    phone: { type: "string", example: "+1 555-9876" },
                    country: { type: "string", example: "US" },
                    role: { type: "string", enum: ["USER", "ADMIN"], default: "USER" },
                    status: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED"], default: "ACTIVE" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "User created" },
            400: { description: "Email already exists or validation error" },
            403: { description: "Forbidden: requires Admin role" },
          },
        },
      },
      "/api/admin/users/{userId}": {
        get: {
          tags: ["Admin"],
          summary: "Get user by ID",
          description: "Returns detailed user profile with investments, transactions, withdrawals, and summary metrics.",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "userId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "User details with related data" },
            404: { description: "User not found" },
            403: { description: "Forbidden: requires Admin role" },
          },
        },
        delete: {
          tags: ["Admin"],
          summary: "Delete user (soft delete)",
          description: "Soft deletes a user by setting deletedAt and status to INACTIVE.",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "userId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "User deleted" },
            404: { description: "User not found" },
            403: { description: "Forbidden: requires Admin role" },
          },
        },
      },
      "/api/admin/users/{userId}/profile": {
        put: {
          tags: ["Admin"],
          summary: "Update user profile",
          description: "Admin updates user profile fields (name, email, balance, status, role, KYC).",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "userId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    country: { type: "string" },
                    currentBalance: { type: "number" },
                    totalInvestment: { type: "number" },
                    totalReturns: { type: "number" },
                    kycStatus: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"] },
                    status: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED"] },
                    role: { type: "string", enum: ["USER", "ADMIN", "SUPER_ADMIN"] },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Profile updated" },
            400: { description: "No valid fields or empty update" },
            404: { description: "User not found" },
            409: { description: "Email conflict" },
            403: { description: "Forbidden: requires Admin role" },
          },
        },
      },
      "/api/admin/users/{userId}/investments": {
        put: {
          tags: ["Admin"],
          summary: "Update user investments",
          description: "Admin creates or updates investments for a user. Existing investments (with id) are updated, new ones are created.",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "userId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["investments"],
                  properties: {
                    investments: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", description: "Existing investment ID (omit to create new)" },
                          name: { type: "string" },
                          amount: { type: "number" },
                          currentValue: { type: "number" },
                          returns: { type: "number" },
                          returnPercent: { type: "number" },
                          status: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Investments updated" },
            400: { description: "Invalid investments array" },
            404: { description: "User not found" },
            403: { description: "Forbidden: requires Admin role" },
          },
        },
      },
      "/api/admin/users/{userId}/transactions": {
        put: {
          tags: ["Admin"],
          summary: "Update user transactions",
          description: "Admin creates or updates transactions for a user.",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "userId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["transactions"],
                  properties: {
                    transactions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          type: { type: "string", enum: ["DEPOSIT", "WITHDRAWAL", "INVESTMENT", "RETURN", "FEE", "BONUS"] },
                          amount: { type: "number" },
                          status: { type: "string" },
                          description: { type: "string" },
                          reference: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Transactions updated" },
            400: { description: "Invalid transactions array" },
            403: { description: "Forbidden: requires Admin role" },
          },
        },
      },
      "/api/admin/users/{userId}/packages": {
        put: {
          tags: ["Admin"],
          summary: "Update user packages",
          description: "Admin assigns or updates investment packages for a user.",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "userId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["packages"],
                  properties: {
                    packages: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          packageId: { type: "string" },
                          isActive: { type: "boolean", default: true },
                          expiresAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Packages updated" },
            400: { description: "Invalid packages array" },
            403: { description: "Forbidden: requires Admin role" },
          },
        },
      },
      "/api/admin/users/{userId}/withdrawals": {
        put: {
          tags: ["Admin"],
          summary: "Update user withdrawals",
          description: "Admin updates withdrawal statuses and notes.",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "userId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["withdrawals"],
                  properties: {
                    withdrawals: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          status: { type: "string", enum: ["PENDING", "APPROVED", "COMPLETED", "REJECTED"] },
                          notes: { type: "string" },
                          reason: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Withdrawals updated" },
            400: { description: "Invalid withdrawals array" },
            403: { description: "Forbidden: requires Admin role" },
          },
        },
      },
      "/api/admin/impersonate/{userId}": {
        post: {
          tags: ["Admin"],
          summary: "Impersonate user",
          description: "Admin views a user's dashboard as if logged in as that user. Requires SUPER_ADMIN role.",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "userId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "Impersonation session data with user's dashboard" },
            404: { description: "User not found" },
            403: { description: "Forbidden: requires SUPER_ADMIN role" },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
