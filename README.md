# BlockNote (Day 1)

This repo currently covers Day 1 only.

Implemented:
- User auth (register/login/refresh/me/logout)
- Document list dashboard (create, rename, delete, list)
- PostgreSQL schema setup

## Setup (Local)

1. Copy env file:
- Copy `.env.example` to `backend/.env`
- Copy `.env.example` to `frontend/.env`

3. Run backend:
- `cd backend`
- `npm install`
- `npm run db:migrate`
- `npm run dev`

4. Run frontend:
- `cd frontend`
- `npm install`
- `npm run dev`

App URLs:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Environment Variables

Check `.env.example` for full list.

- `PORT`: backend port
- `DATABASE_URL`: postgres connection string
- `JWT_ACCESS_SECRET`: access token secret
- `JWT_REFRESH_SECRET`: refresh token secret
- `REFRESH_TOKEN_TTL_DAYS`: refresh token expiry in days
- `CLIENT_URL`: allowed frontend origin
- `VITE_API_BASE_URL`: backend API base URL for frontend

## Architecture Decisions

- Express + PostgreSQL + React (simple and quick for assignment timeline)
- Parameterized SQL queries for safety
- JWT access + refresh token flow
- Server-side ownership checks for documents

## Known Issues / Incomplete

- Block editor behavior is not done yet (Day 2-3)
- Drag reorder, autosave race handling, share link are not done yet (Day 4)
- Final edge-case hardening and final docs are pending (Day 5)

## Edge Case Decisions

- order_index precision: schema uses float (`DOUBLE PRECISION`), normalization logic pending Day 4.
- Share token read-only at API level: share API not implemented yet.
- Auto-save race condition: auto-save not implemented yet.
- Document ownership: implemented. Returns `403` when user tries another user's document.

## Day 1 API

Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Documents:
- `GET /api/documents`
- `POST /api/documents`
- `GET /api/documents/:id`
- `PATCH /api/documents/:id`
- `DELETE /api/documents/:id`
