# SmartCommute - UNILORIN Intelligent Transportation System

SmartCommute is a campus transport app for commuter queue visibility, geofenced queue joining, QR/manual driver fare payment, Paystack wallet funding, and pending driver withdrawal requests for admin payout review.

## Stack

- Backend: FastAPI, async SQLAlchemy, PostgreSQL, Redis, Alembic, JWT auth, Paystack verification
- Frontend: React, Vite, TypeScript, Tailwind CSS, Zustand, TanStack Query
- Deployment target: VPS with Nginx, systemd, PostgreSQL, Redis

## Project Layout

```text
backend/   FastAPI API, models, schemas, Alembic migrations
frontend/  React/Vite web client
deploy/    VPS nginx and systemd templates
```

## Local Backend

```bash
cd backend
python3.12 -m venv sc_venv
source sc_venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Local Frontend

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL=http://localhost:8000/api/v1
npm run dev
```

## API Surface

- `GET /health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/account/me`
- `PATCH /api/v1/account/me`
- `GET /api/v1/queue/status`
- `POST /api/v1/queue/heartbeat`
- `POST /api/v1/queue/join`
- `POST /api/v1/queue/leave`
- `POST /api/v1/wallet/verify/{reference}`
- `POST /api/v1/wallet/pay-driver`
- `GET /api/v1/wallet/transactions`
- `POST /api/v1/wallet/withdraw` - records a pending driver payout request with bank details

## Deployment Notes

- Run `alembic upgrade head` before starting the backend. Runtime table creation is disabled by default; set `AUTO_CREATE_TABLES=true` only for temporary local prototypes.
- Hosted PostgreSQL URLs using `postgres://` or `postgresql://` are normalized to `postgresql+asyncpg://` automatically.
- Driver withdrawals deduct available driver earnings immediately and create a pending transaction for admin payout review.

## VPS Deployment

See `deploy/VPS_DEPLOYMENT.md`.
