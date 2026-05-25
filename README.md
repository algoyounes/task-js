# Merjane Task

An HTTP service that processes orders and applies per-product business rules (stock reservation, expiration handling, seasonal availability, and out-of-stock notifications).

> [!NOTE]
> Requires Node.js 20+ and pnpm. If you hit a pnpm version mismatch, run `corepack enable pnpm` to pick up the version pinned in `package.json`.

## Installation

1. **Install dependencies**

    ```bash
    pnpm install
    ```

2. **Environment files**

    Two env files are used:
    - `.env.dev` — for the local dev server
    - `.env.test` — for integration tests

    The script `pnpm dev` reads `.env.dev` via `CONFIG_PATH`, and `pnpm test:integration` reads `.env.test`.

3. **Provision the SQLite schema**

    ```bash
    pnpm drizzle:push
    ```

## Usage

### Start the dev server

```bash
pnpm dev
```

The server listens on the port defined by `PORT` in `.env.dev` (defaults to `8888`).

### Process an order

```bash
curl -X POST http://localhost:8888/orders/1/processOrder
```

Example response:

```json
{ "orderId": 1 }
```

Error responses:
- `400` — `orderId` is not a positive integer
- `404` — order does not exist (`{ "code": "ORDER_NOT_FOUND", ... }`)

## Tests

```bash
pnpm test
pnpm test:unit
pnpm test:integration
```

## Domain Logic

Each product on an order is dispatched to a dedicated handler based on its `type`. Handlers live under `src/domain/product/services/handlers/` and implement a common `IProductHandler` port.

- **NORMAL** — if in stock, reserve one unit; otherwise send a delay notification when the product can be restocked (`leadTime > 0`).
- **SEASONAL** — if currently in season and in stock, reserve one unit. If the restock would arrive after the season ends, or the season has not started yet, mark the product out of stock and notify. Otherwise send a delay notification.
- **EXPIRABLE** — if in stock and not expired, reserve one unit. Otherwise mark out of stock and, when an expiration date exists, send an expiration notification.

Value objects encapsulate domain rules:
- `SeasonWindow` — `contains`, `endsBefore`, `startsAfter`
- `ExpirationDate` — `hasExpiredAt`

## Architecture

The codebase is organized in clear layers, wired together through a DI container.

- **Controllers** (`src/controllers/`) — HTTP boundary. Zod schemas (via `fastify-type-provider-zod`) validate request params; controllers resolve their dependencies from the DI container and delegate to services.
- **Services** (`src/orders/`) — application use cases (e.g. `OrderService.processOrder`).
- **Managers** (`src/managers/`) — orchestrate repositories and translate persistence rows into domain entities.
- **Repositories** (`src/repositories/`) — thin data-access layer on top of Drizzle ORM.
- **Domain** (`src/domain/`) — entities, value objects, and per-type product handlers selected at runtime by `ProductHandlerRegistry`.
- **DI** (`src/di/di.context.ts`) — single place where all classes are registered as singletons.
- **Errors** (`src/errors/`) — typed errors extending `BaseError`, carrying a `status` and `code` consumed by the Fastify error handler.
