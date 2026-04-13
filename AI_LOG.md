## 2026-04-13

**Tool:** Copilot

**What I asked for:**
Build Day 1 only: auth, document list, database schema, and basic frontend pages.

**What it generated:**
- Backend auth APIs (register, login, refresh, me, logout)
- Document APIs (list, create, rename, delete, get by id)
- PostgreSQL schema with users, documents, blocks, refresh_tokens
- Frontend login/register/dashboard/home pages

**What was wrong or missing:**
- My folder had a trailing space in the name, so path commands failed at first.
- UI looked old, so I asked for style updates.

**What I changed and why:**
- Fixed paths using the exact folder name.
- Kept only Day 1 scope and did not implement Day 2-5 features yet.
- Added ownership check so cross-account document access returns 403.

## 2026-04-13 (Required Notes)

**Tool:** Copilot

**What I asked for:**
Enter mid-block split logic.

**What it generated:**
Not generated yet (Day 2-3 feature).

**What was wrong or missing:**
Feature is out of Day 1 scope.

**What I changed and why:**
I postponed this to Day 2-3 to match milestone plan.

---

**Tool:** Copilot

**What I asked for:**
order_index handling.

**What it generated:**
Schema uses float type for order_index.

**What was wrong or missing:**
No re-normalization logic yet (Day 4 work).

**What I changed and why:**
Kept `order_index` as `DOUBLE PRECISION` in schema for assignment compliance.

---

**Tool:** Copilot

**What I asked for:**
Protect cross-account document access.

**What it generated:**
Ownership check in document routes.

**What was wrong or missing:**
Nothing major for Day 1.

**What I changed and why:**
I kept explicit 403 response when user tries to access another user's document id.

---

**Tool:** Copilot + Manual Coding

**What I asked for:**
General Day 1 scaffold and UI help.

**What it generated:**
Base code for backend and frontend.

**What was wrong or missing:**
Some UI layout did not match what I wanted.

**What I changed and why:**
I manually adjusted page layout and styling (alignment, navbar placement, card placement) to match expected look.
