# Updesh Residency — Backend

Express + TypeScript REST API for the Updesh Residency property marketplace.

> **GitHub repo:** `harshkumar1302/updesh-api`  
> **Local folder:** `backend/` (inside the parent `updesh` project)

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:4000
```

Seeds `data/db.json` on first run. Delete it to re-seed.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `JWT_SECRET` | dev default | Token signing secret |

## Local-only folders (never commit)

| Folder | Purpose |
|--------|---------|
| `data/` | JSON database (`db.json`) |
| `uploads/` | User-uploaded property photos |

Seed/demo property images are **not** stored here — they live in the frontend repo at `frontend/apps/web/public/images/properties/`.

## Demo accounts

- Admin: `admin@updesh.com` / `admin123456`
- Seller: `seller@updesh.com` / `seller123456`
- Buyer: `buyer@updesh.com` / `buyer123456`

## Shared types

`packages/shared-types` is the source of truth for API contracts. When you change types here, copy the same folder into `frontend/packages/shared-types`.
