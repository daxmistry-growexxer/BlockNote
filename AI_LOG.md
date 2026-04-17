## Day 1

### 2026-04-13

**Tool:** Copilot

**What I asked for:**
Set up the Day 1 base: authentication, document list support, database schema, and starter frontend pages.

**What it generated:**
Backend routes for register, login, refresh, me, and logout, plus document CRUD, the Postgres schema, and basic React pages.

**What was wrong or missing:**
The first draft did not cover later edge cases or the full milestone scope.

**What I changed and why:**
I kept the foundation and organized the files and routes so later editor work could be added without rewrites.

---

**Tool:** Copilot

**What I asked for:**
Protect against cross-account document access.

**What it generated:**
An ownership helper that checks the document `user_id` against `req.user.id`, used by `GET /documents/:id` and write routes.

**What was wrong or missing:**
I still needed explicit API-level rejection behavior, not just UI-side checks.

**What I changed and why:**
I kept the server-side check and made non-owner access return `403` so authorization does not depend on the frontend.

## Day 2–3

### 2026-04-14 -- ### 2026-04-15

**Tool:** Copilot

**What I asked for:**
Implement Enter split and Backspace merge behavior in the editor.

**What it generated:**
An initial split and merge flow that created new blocks and moved trailing text, but it did not keep caret and focus stable in every input mode.

**What was wrong or missing:**
The caret could jump after React re-rendered, and some Enter and Backspace cases left focus in the wrong place near block boundaries.

**What I changed and why:**
I added explicit focus and caret request refs, then restored focus after render so keyboard editing stays stable and natural.

---

**Tool:** Copilot

**What I asked for:**
Render all 7 block types and add the slash command menu.

**What it generated:**
Renderers for paragraph, heading_1, heading_2, todo, code, divider, and image blocks, plus slash-command handling.

**What was wrong or missing:**
Some block states still needed better focus and content syncing.

**What I changed and why:**
I kept the block-specific renderers and wired the slash menu to the active block so the editor could handle all seven types.

## Day 4

### 2026-04-16

**Tool:** Copilot

**What I asked for:**
Add drag reorder with stable ordering.

**What it generated:**
A midpoint-based `order_index` strategy with drag/drop reorder handling.

**What was wrong or missing:**
Integer-style ordering would not hold up after repeated moves between blocks.

**What I changed and why:**
I kept floating-point ordering and renormalized when the gap became too small so reorder stays stable over time.

---

**Tool:** Copilot

**What I asked for:**
Prevent stale autosave requests from overwriting newer edits.

**What it generated:**
A debounced save flow plus per-block queue state (`inFlight`, queued payloads, pending payloads).

**What was wrong or missing:**
There was still no server-side optimistic locking or version conflict response.

**What I changed and why:**
I kept the client-side queue so saves happen in order for each block, and I documented the remaining backend conflict limitation honestly in the README.

---

**Tool:** Copilot

**What I asked for:**
Make share links read-only.

**What it generated:**
Share-token routes and read-only fetch endpoints for shared documents.

**What was wrong or missing:**
Shared viewers still needed server-side protection from write routes.

**What I changed and why:**
I kept the share endpoints GET-only and required access-token auth for write routes so shared viewers cannot mutate data.

## Day 5

### 2026-04-17

**Tool:** Manual coding (no AI code generation used)

**What I asked for:**
Finish the remaining edge cases and write up the final documentation.

**What it generated:**
N/A.

**What was wrong or missing:**
Auto-generated docs were too optimistic in places and did not always match the real repository state.

**What I changed and why:**
I handled the final edge-case wording, wrote the AI log and README entries manually, and kept the submission accurate and defensible.

---

## Required Entries Summary (Simple Version)

### 1) Enter mid-block split

I asked Copilot to make Enter split a block at the cursor.
It gave me a basic split flow that created a new block and moved text after the cursor.
The main issue was cursor and focus jumping after re-render, and a few edge cases around Enter/Backspace near block boundaries.
I fixed it by adding focus/caret restore logic with refs and applying focus after render, so typing now feels stable.

### 2) order_index handling

I asked Copilot for stable insert and drag reorder using order_index.
The early direction was close to integer-style ordering, but that is not stable for repeated inserts between two blocks.
I changed it to floating values (DOUBLE PRECISION), used midpoint insertion, and added renormalization when gaps become too small.
This keeps ordering stable over time.

### 3) Cross-account access protection

I asked Copilot to stop cross-account document access.
It generated ownership checks comparing document user_id with req.user.id.
I made sure these checks are enforced on backend routes (not just the frontend) and return 403 for non-owners.
That way users cannot access other users' documents even if UI checks are bypassed.

### 4) Manual coding instead of AI

For final documentation and edge-case wording, I chose to write manually instead of using AI.
The reason is simple: AI drafts were sometimes too optimistic or not fully aligned with actual repository behavior.
I manually updated README and AI_LOG wording so the final submission is accurate, honest, and easy to defend during evaluation.
