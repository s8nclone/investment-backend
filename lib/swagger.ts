import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Fusion Trading Platform API",
      version: "1.0.0",
      description:
        "Comprehensive API documentation and interactive testing sandbox for Fusion Trading Platform server-side application.",
      contact: {
        name: "API Support",
        email: "support@fusiontrading.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local Development Server",
      },
      {
        url: "/api",
        description: "Relative API Endpoint",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT access token to authenticate requests.",
        },
      },
      schemas: {
        UserProfile: {
          type: "object",
          properties: {
            id: { type: "string", example: "cuid123456789" },
            email: { type: "string", example: "user@tradepro.com" },
            username: { type: "string", example: "trader_joe" },
            firstName: { type: "string", example: "Joe" },
            lastName: { type: "string", example: "Doe" },
            phone: { type: "string", example: "+1 555-1234" },
            role: { type: "string", enum: ["USER", "ADMIN", "SUPER_ADMIN"], example: "USER" },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED"], example: "ACTIVE" },
            kycStatus: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"], example: "PENDING" },
            totalInvestment: { type: "number", example: 10000.0 },
            currentBalance: { type: "number", example: 12500.50 },
            totalReturns: { type: "number", example: 2500.50 },
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
    paths: {
      "/api/health": {
        get: {
          summary: "Health Check",
          description: "Returns backend system and PostgreSQL database connection status.",
          responses: {
            200: {
              description: "System healthy",
            },
          },
        },
      },
      "/api/auth/register": {
        post: {
          summary: "Register new user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "confirmPassword"],
                  properties: {
                    email: { type: "string", example: "newuser@tradepro.com" },
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
          summary: "User Login",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", example: "user@tradepro.com" },
                    password: { type: "string", example: "SecurePass123!" },
                    rememberMe: { type: "boolean", example: true },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Login successful (returns JWT access and refresh tokens)" },
            401: { description: "Invalid credentials" },
          },
        },
      },
      "/api/auth/me": {
        get: {
          summary: "Get current user profile",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "User profile payload" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/dashboard/overview": {
        get: {
          summary: "Get Dashboard Overview",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "Portfolio summary, active investments, and analytics" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/admin/users": {
        get: {
          summary: "Get all users (Admin)",
          security: [{ BearerAuth: [] }],
          parameters: [
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          ],
          responses: {
            200: { description: "Paginated users list" },
            403: { description: "Forbidden - Requires Admin role" },
          },
        },
      },
      "/api/admin/stats": {
        get: {
          summary: "Get Admin Platform Statistics",
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: "Aggregated platform balance, deposits, user counts, and metrics" },
            403: { description: "Forbidden - Requires Admin role" },
          },
        },
      },
    },
  },
  apis: ["./routes/*.ts", "./controllers/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
