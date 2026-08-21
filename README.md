# Investment Platform Backend

Backend service for the Investment Platform built with Node.js, Express, TypeScript, and Prisma ORM.

# Architecture & Implementation

The application follows a clean layered architecture with source code located under the `src` directory:

- Controllers (`src/controllers`): Class-based controllers (`AuthController`, `DashboardController`, `AdminController`) handling request processing, validation, and responses.
- Routes (`src/routes`): Express routers exposing endpoints for authentication, user dashboard, admin operations, and health checks.
- Middleware (`src/middleware`): Authentication token verification, granular role-based authorization (RBAC), and IP rate limiting.
- Libraries (`src/lib`): Database client singleton, JWT token service, password hashing utilities, and Swagger OpenAPI specification.
- Database (`prisma/schema.prisma`): PostgreSQL data models covering Users, Sessions, Portfolios, Holdings, Investments, Transactions, Packages, and Withdrawals.

# Environment Setup

Create a `.env` file in the root directory with the following variables:

DATABASE_URL="postgresql://user:password@localhost:5432/investment_db?schema=public"
PORT=3000
JWT_SECRET="your_access_token_secret"
JWT_REFRESH_SECRET="your_refresh_token_secret"
CORS_ORIGIN="http://localhost:5173"

# Installation

1. Install project dependencies:

npm install

2. Generate the Prisma client:

npm run db:generate

3. Synchronize database schema:

npm run db:push

# Running the Application

Development mode:

npm run dev

Type check:

npm run typecheck

Production build:

npm run build

Start production server:

npm start

# API Documentation & Endpoints

Interactive API documentation is served automatically on startup:

- Swagger UI: http://localhost:3000/api/docs
- OpenAPI JSON Spec: http://localhost:3000/api/docs.json
- Health Check: http://localhost:3000/api/health
