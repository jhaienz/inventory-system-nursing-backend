# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm run start:dev       # Watch mode
pnpm run start:debug     # Debug mode with Node inspector

# Build
pnpm run build           # Compile TypeScript → dist/

# Testing
pnpm run test            # Unit tests
pnpm run test:watch      # Unit tests in watch mode
pnpm run test:cov        # Unit tests with coverage
pnpm run test:e2e        # End-to-end tests
pnpm run test -- --testPathPattern=loans  # Run a single test file

# Code quality
pnpm run lint            # ESLint with auto-fix
pnpm run format          # Prettier formatting

# Database
npx prisma migrate dev   # Apply migrations (uses prisma.config.ts for connection)
npx prisma generate      # Regenerate Prisma client into src/generated/prisma/
npx prisma studio        # Open Prisma Studio GUI

# Docker
docker compose up --build        # Build image and start api + postgres
docker compose up -d --build     # Same, detached
docker compose down              # Stop and remove containers
docker compose down -v           # Also remove the postgres volume (wipes DB)
docker compose logs -f api       # Tail API logs
```

**Always run `npx prisma generate` after schema changes.** The generated client lives at `src/generated/prisma/` and is gitignored.

## Architecture

**NestJS REST API** for a nursing equipment inventory management system. Uses PostgreSQL via Prisma ORM. Entry point is [src/main.ts](src/main.ts), listening on port 3000 (or `PORT` env var). Global `ValidationPipe` (whitelist + transform) is applied.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signs admin JWT tokens (8h expiry) |
| `PORT` | HTTP port (default 3000) |

### Domain model

Five entities in [prisma/schema.prisma](prisma/schema.prisma):

- **admins** — Staff who manage inventory and approve requests
- **borrowers** — Nurses/staff; `is_blocked` is set automatically when a penalty is issued
- **items** — Inventory; `is_returnable` distinguishes equipment (tracked individually) from consumables (stock decremented on approval)
- **borrowed_items** — Loan lifecycle: `PENDING → APPROVED/REJECTED`; equipment goes `APPROVED/OVERDUE → RETURNED`; consumables auto-jump to `COMPLETED` on approval; cron moves `APPROVED → OVERDUE`
- **penalties** — Auto-issued by cron when equipment is overdue; `UNPAID | CLEARED`; clearing unblocks the borrower if no other unpaid penalties remain

### Module map

| Module | Path | Auth | Notes |
|--------|------|------|-------|
| Auth | `src/auth/` | public | `POST /auth/admin/login` → JWT |
| Admins | `src/admins/` | JWT (except `POST /admins`) | Create first admin without token |
| Borrowers | `src/borrowers/` | JWT | Admin manages borrower accounts |
| Items | `src/items/` | JWT for writes, public for reads | `GET /items/:id` includes live availability for equipment |
| Loans | `src/loans/` | JWT for admin actions; `POST /loans` and `GET /loans/borrower/:username` are public | Borrower sends `username + pin + itemId + quantity + dueDate` |
| Penalties | `src/penalties/` | JWT | `PATCH /penalties/:id/clear` unblocks borrower |
| Scheduler | `src/scheduler/` | — | `@Cron` runs at midnight; marks overdue loans, issues penalties, blocks borrowers |

## API Endpoints

Base URL: `http://localhost:3000`

Admin routes require `Authorization: Bearer <token>` (obtain from `POST /auth/admin/login`).

### Auth

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/auth/admin/login` | — | `{ username, password }` | Returns `{ access_token }` |

### Admins

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/admins` | — | `{ username, password }` | Create first admin (seed) |
| GET | `/admins` | JWT | — | List all admins |

### Borrowers

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/borrowers` | JWT | `{ username, fullName, pin }` | Create borrower account |
| GET | `/borrowers` | JWT | — | List all borrowers |
| GET | `/borrowers/:id` | JWT | — | Get borrower + penalty history |
| PATCH | `/borrowers/:id` | JWT | `{ fullName?, isBlocked? }` | Update borrower |
| DELETE | `/borrowers/:id` | JWT | — | Delete borrower |

PIN must be 4–8 characters.

### Items (catalog)

| Method | Path | Auth | Query params | Body | Description |
|--------|------|------|--------------|------|-------------|
| GET | `/items` | — | `category`, `search`, `isReturnable` | — | List catalog |
| GET | `/items/:id` | — | — | — | Item detail; equipment response includes `availability: { totalUnits, availableUnits, activeLoans }` |
| POST | `/items` | JWT | — | `{ name, category, isReturnable, quantity }` | Create item |
| PATCH | `/items/:id` | JWT | — | `{ name?, category?, quantity? }` | Update item |
| DELETE | `/items/:id` | JWT | — | — | Delete item |

### Loans

| Method | Path | Auth | Body / Query | Description |
|--------|------|------|--------------|-------------|
| POST | `/loans` | — | `{ username, pin, itemId, quantity, dueDate? }` | Submit borrow request; `dueDate` (ISO 8601) required for equipment |
| GET | `/loans` | JWT | `?status=PENDING\|APPROVED\|...` | List all loans, filterable by status |
| GET | `/loans/:id` | JWT | — | Single loan detail |
| GET | `/loans/borrower/:username` | — | — | All loans for a specific borrower |
| PATCH | `/loans/:id/approve` | JWT | — | Approve loan (consumables auto-complete + decrement stock) |
| PATCH | `/loans/:id/reject` | JWT | — | Reject loan |
| PATCH | `/loans/:id/return` | JWT | — | Mark equipment as returned |

**Loan statuses:** `PENDING` → `APPROVED` / `REJECTED` / `COMPLETED` (consumable); `APPROVED` → `OVERDUE` (cron); `APPROVED` or `OVERDUE` → `RETURNED`

### Penalties

| Method | Path | Auth | Query | Description |
|--------|------|------|-------|-------------|
| GET | `/penalties` | JWT | `?status=UNPAID\|CLEARED` | List penalties |
| GET | `/penalties/:id` | JWT | — | Single penalty detail |
| PATCH | `/penalties/:id/clear` | JWT | — | Clear penalty; auto-unblocks borrower if no remaining unpaid penalties |

### Response shapes (key fields)

**Loan object**
```json
{
  "id": 1,
  "status": "PENDING",
  "quantity": 2,
  "dueDate": "2026-04-20T00:00:00.000Z",
  "returnedAt": null,
  "createdAt": "2026-04-13T...",
  "borrower": { "id": 1, "username": "nurse01", "fullName": "Maria Santos" },
  "item": { "id": 3, "name": "BP Monitor", "category": "Equipment", "isReturnable": true },
  "admin": { "id": 1, "username": "admin01" },
  "penalty": null
}
```

**Item availability (equipment only)**
```json
{
  "id": 3,
  "name": "BP Monitor",
  "isReturnable": true,
  "quantity": 5,
  "availability": {
    "totalUnits": 5,
    "availableUnits": 3,
    "activeLoans": [
      { "id": 10, "quantity": 2, "dueDate": "2026-04-20T...", "borrower": { "username": "nurse01", "fullName": "Maria Santos" } }
    ]
  }
}
```

**Clear penalty response**
```json
{ "message": "Penalty cleared", "borrowerUnblocked": true }
```

### Key design decisions

- **Borrower PIN auth** is inline: `POST /loans` verifies `username` + `pin` (bcrypt) directly in the service — no separate session or token for borrowers.
- **Equipment availability** is computed dynamically: `availableUnits = item.quantity - SUM(quantity of APPROVED loans)`.
- **Consumable approval** decrements `items.quantity` in the same transaction as status change.
- **`PrismaService`** uses composition (not `extends PrismaClient`) because Prisma v7 uses a class factory (`getPrismaClientClass()`). It exposes model getters (`prisma.admin`, `prisma.borrower`, etc.) and a `$transaction` getter.
- **Imports from generated Prisma** must use explicit `.js` extensions (`../generated/prisma/client.js`, `../generated/prisma/enums.js`) due to `module: "nodenext"` in tsconfig.
- **`$transaction`** uses the interactive form `(tx) => Promise<T>` everywhere — the array/batch form has type inference issues with mixed Prisma promise types.

### Database

- **Prisma v7** with `@prisma/adapter-pg`; connection URL comes from `DATABASE_URL` env
- Migration history in `prisma/migrations/`; CLI connection configured in `prisma.config.ts`
- Foreign key behavior: admin/borrower deletes are `RESTRICT`; approver (`approved_by`) is `SET NULL`
