# Smart Stationery Store ERP

A complete business operating system for stationery and bookstore owners.
Internal tool only — Shop Owner, Cashier, and Inventory Manager roles. No
customer-facing storefront.

This repo is built in phases. **Phase 1 (this delivery): Foundation & Auth.**

---

## Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Framer Motion
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (access + refresh), bcrypt, role-based access control

---

## Phase 1 — What's included

- Monorepo layout: `backend/` (API) and `frontend/` (Next.js app)
- Prisma schema: `User`, `RefreshToken`, `AuditLog` + `Role` enum
  (`ADMIN` / `CASHIER` / `INVENTORY_MANAGER`)
- Auth API: register (admin-only), login, refresh, logout, `/me`
- Security: bcrypt (12 rounds), JWT access + refresh tokens, rate limiting
  on `/auth/login` and `/auth/register`, helmet, CORS, Zod input validation,
  centralized error handling, login/logout audit logging
- Frontend: login page + protected dashboard shell, in the "Executive Desk"
  dark skeuomorphic design system (deep charcoal, walnut, brushed brass)
- Seed script that creates a default Shop Owner account

## Folder structure

```
smart-stationery-erp/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── config/        # env validation, prisma client
│       ├── controllers/   # request/response layer
│       ├── services/      # business logic (repository + service pattern)
│       ├── middleware/    # auth, validation, error handling
│       ├── routes/        # route definitions
│       ├── types/         # zod schemas / shared types
│       ├── utils/         # jwt, password hashing, ApiError, asyncHandler
│       └── index.ts       # app entrypoint
└── frontend/
    └── src/
        ├── app/
        │   ├── login/
        │   ├── dashboard/
        │   ├── layout.tsx
        │   └── globals.css
        ├── components/
        ├── hooks/         # useAuth
        └── lib/           # typed API client
```

---

## Running it locally

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ running locally (or a hosted instance)

### 1. Backend

```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL and DIRECT_URL (Supabase / PostgreSQL), e.g.:
#   DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:6543/postgres?pgbouncer=true"
#   DIRECT_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

npm install
npm run prisma:generate   # generates Prisma Client
npm run prisma:deploy     # pushes database schema and seeds initial admin account
npm run dev               # starts the API on http://localhost:4000
```

Default seeded login:
- Email: `admin@stationeryerp.com`
- Password: `Admin@12345`

### 🚀 Production Deployment (Render + Supabase)
1. **Database**: Create a PostgreSQL project on [Supabase](https://supabase.com). Copy both the **Transaction Pooler URL** (`DATABASE_URL`) and **Direct Connection URL** (`DIRECT_URL`).
2. **Render Backend Web Service**:
   - **Build Command**: `npm --prefix backend install && npm --prefix backend run build`
   - **Start Command**: `npx prisma db push --schema=backend/prisma/schema.prisma && npx tsx backend/prisma/seed.ts && node backend/dist/index.js` (or `cd backend && npm run prisma:deploy && npm start`)
   - **Environment Variables**: Add `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN=https://your-app.netlify.app`.

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                # starts the app on http://localhost:3000
```

Visit `http://localhost:3000` → redirects to `/login` → sign in → lands on
the protected `/dashboard` shell.

---

## API reference (Phase 1)

| Method | Route                | Access        | Description                          |
|--------|-----------------------|---------------|---------------------------------------|
| POST   | `/api/auth/login`     | Public        | Returns access + refresh token         |
| POST   | `/api/auth/refresh`   | Public        | Exchanges refresh token for new access token |
| POST   | `/api/auth/logout`    | Public        | Revokes a refresh token                |
| POST   | `/api/auth/register`  | Admin only    | Creates a Cashier / Inventory Manager / Admin account |
| GET    | `/api/auth/me`        | Authenticated | Returns the current user profile       |
| GET    | `/health`              | Public        | Health check                           |

---

## Roadmap — upcoming phases

- **Phase 2:** Category & Product Management (SKU, barcode, GST, images) + Employee Management/permissions UI
- **Phase 3:** Inventory Module (stock movements, damaged/reserved/returned stock) + live Dashboard (sales, revenue, stock graphs)
- **Phase 4:** POS Billing (barcode scan, cart, discounts, GST, invoice/receipt) + UPI payment simulation flow
- **Phase 5:** Supplier Management + Purchase Orders
- **Phase 6:** Accounting (income, expenses, supplier payments, tax, refunds)
- **Phase 7:** Reports & Analytics (PDF/Excel/CSV export, trends, peak hours, turnover)
- **Phase 8:** Notifications, Settings, and full Audit Log viewer

Each phase will explain its architecture, database changes, and API routes
before generating code, and will build directly on this Phase 1 foundation.
