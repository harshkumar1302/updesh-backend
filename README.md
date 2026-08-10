# Updesh Residency — API

Express + TypeScript REST API for the Updesh Residency property marketplace.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:4000
```

Seeds `data/db.json` on first run. Delete it to re-seed. Uploads go to `uploads/`.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `JWT_SECRET` | dev default | Token signing secret |

## Demo accounts

- Admin: `admin@updesh.com` / `admin123456`
- Seller: `seller@updesh.com` / `seller123456`
- Buyer: `buyer@updesh.com` / `buyer123456`

## Shared types

`packages/shared-types` is the source of truth for API contracts. When you change types here, copy the same folder into the frontend repo (`updesh-app/packages/shared-types`).
