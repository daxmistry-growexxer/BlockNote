# BlockNote

BlockNote is a Notion-style document editor with block-based writing, authentication, document ownership enforcement, sharing, reorder support, and autosave.

## Setup Instructions

This repository currently uses local Postgres setup (equivalent to docker-compose workflow).

1. Create env files from the template.
	- Copy `.env.example` to `backend/.env`
	- Copy `.env.example` to `frontend/.env`

2. Start PostgreSQL locally and create the database.
	- Ensure your `DATABASE_URL` in `backend/.env` points to your local Postgres instance.
	- Example from `.env.example`: `postgres://blocknote:blocknote@localhost:5432/blocknote`

3. Run database schema migration.
	- Preferred command:
	  - `cd backend`
	  - `psql "$DATABASE_URL" -f sql/schema.sql`

4. Run backend.
	- `cd backend`
	- `npm install`
	- `npm run dev`

5. Run frontend.
	- `cd frontend`
	- `npm install`
	- `npm run dev`

6. Open the app.
	- Frontend: `http://localhost:5173`
	- Backend API: `http://localhost:4000/api`

## Environment Variables

Reference: `.env.example`

- `PORT` (backend): Express server port.
- `DATABASE_URL` (backend): PostgreSQL connection string used by the API.
- `JWT_ACCESS_SECRET` (backend): Secret key for signing/verifying short-lived access tokens.
- `JWT_REFRESH_SECRET` (backend): Secret key for signing/verifying refresh tokens.
- `REFRESH_TOKEN_TTL_DAYS` (backend): Refresh token lifetime in days.
- `CLIENT_URL` (backend): Allowed CORS origin for frontend requests.
- `VITE_API_BASE_URL` (frontend): Base URL for frontend API calls.

Additional supported backend vars (not currently listed in `.env.example`):
- `SHARE_TOKEN_TTL_MINUTES`: Share-token TTL configuration.
- `COOKIE_SECURE`: Forces secure cookie mode when set to `true`.

## Architecture Decisions

- **React + Vite (frontend):** Fast development workflow and small project footprint.
- **Express + PostgreSQL (backend):** Simple, explicit API and relational data model for users/documents/blocks.
- **SQL-first data layer:** Direct SQL with parameterized placeholders for predictable behavior and security.
- **JWT + refresh-token session design:** Short-lived access tokens with revocable refresh tokens in DB.
- **Server-side authorization checks:** Document ownership and share access are enforced by backend routes, not only UI.
- **Per-block autosave queue:** Saves are serialized per block to avoid stale request overwrites.
- **Fractional ordering strategy:** `order_index` uses floating values and midpoint insertion, with renormalization when gaps become too small.

## Known Issues

- No automated test suite is included yet (API and UI are currently validated manually).
- `backend/package.json` has a `db:migrate` script with a hardcoded remote connection string; use `psql "$DATABASE_URL" -f sql/schema.sql` for local setup.
- No real-time multi-user collaboration (WebSocket/OT/CRDT) is implemented.
- Conflict control is client-queue based; there is no server-side optimistic locking/version conflict response yet.
- Root-level docker-compose file is not present in the current repo state, so setup is local Postgres equivalent.

## Edge Case Decisions

- **Share token read-only at API level:** Share-token endpoints are GET-only and write routes require access-token auth, so shared viewers cannot mutate data.
- **Document ownership enforcement:** `GET /documents/:id` checks owner identity on the server and returns `403` for cross-account access to prevent data leakage.
- **Autosave stale overwrite protection:** Saves are queued and executed sequentially per block so older in-flight requests cannot overwrite newer edits.
- **Order index precision:** `order_index` is stored as floating point (`DOUBLE PRECISION`) and midpoint insertion is used for reorder/insert flexibility.
- **Order gap collapse handling:** When adjacent-order gap drops below `0.001`, order indexes are renormalized to restore insertion headroom.
- **SQL injection prevention:** All DB operations use parameterized queries with placeholders instead of runtime string interpolation.

## Main API Surface

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
- `POST /api/documents/:id/share`
- `DELETE /api/documents/:id/share`
- `GET /api/documents/share/:token`
- `GET /api/documents/share/:token/blocks`

Blocks:
- `GET /api/documents/:id/blocks`
- `POST /api/documents/:id/blocks`
- `PATCH /api/documents/:id/blocks/:blockId`
- `PATCH /api/documents/:id/blocks/:blockId/reorder`
- `DELETE /api/documents/:id/blocks/:blockId`

## Deployment Link

https://blocknote-app-ro1j.onrender.com
