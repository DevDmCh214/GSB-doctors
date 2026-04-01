# Decisions & Build Log

## How to start every Claude Code session
Paste this at the top of every prompt:
```
Read SPEC.md and DECISIONS.md before doing anything.
Current status: [paste checked boxes from "What's Been Built" below]
Today's task: [one specific feature]
Do not modify any files outside what is needed for this task.
Do not change any styling or markup that already works.
```

---

## Screenshots Reference

All frontend wireframes are in `/docs/screenshots/`. Claude Code must read the relevant
screenshot before building any component or page. Mapping:

| Screenshot file                                        | Covers                              |
|--------------------------------------------------------|-------------------------------------|
| log_in_view.png                                        | /login page                         |
| non_logged_in_view.png                                 | unauthenticated home/redirect state |
| registration_view.png                                  | /register page                      |
| dashboard.png                                          | / dashboard (both panels)           |
| liste_de_medecins_view__default_after_login_.png       | /medecins list page                 |
| details_medecin.png                                    | Doctor detail modal                 |
| edit_or_create_report.png                              | /rapports/new and /rapports/:id/edit|
| report_details.png                                     | /rapports/:id read mode             |
| medicament_details.png                                 | Medicament info popup               |

When building any frontend feature, always pass the corresponding screenshot to Claude Code
in the same prompt using the instruction:
"Match the layout in /docs/screenshots/<filename> exactly.
Do not add anything not shown. Do not change styling once it matches."

---

## Architecture Decisions

- JWT stored in httpOnly cookie named `token`, NOT localStorage
- Cookie is set with `sameSite: lax`, `httpOnly: true`, `secure: false` in dev
- All API errors return `{ error: "message in French" }` with correct HTTP status
- Prisma is used in `db pull` mode (introspects existing schema, no `migrate dev`)
- `visiteur.mdp` column must be widened to CHAR(60) before seeding — do this in seed.js via raw SQL before any bcrypt writes
- Every user's demo password is `"password"` — seed generates one hash and bulk-updates all rows
- "Mon département" filter logic: `parseInt(visiteur.cp.substring(0, 2))` sent as `?dept=` query param
- `rapportCount` on `GET /medecins/:id` = total rapports across ALL visiteurs (shown as "Il y a N rapports")
- The rapport list inside the doctor modal = only rapports by the logged-in visiteur
- offrir (echantillons) writes always use a Prisma transaction: delete existing rows then insert new ones
- Angular 17 standalone components only — no NgModules anywhere
- Angular Router uses `canActivate` with an `AuthGuard` that checks `AuthService.isLoggedIn()`
- `AuthService` stores visiteur in a `BehaviorSubject`, rehydrates on app init via `GET /api/auth/me`
- Global `HttpInterceptor` attaches `withCredentials: true` to every request (needed for cookie)
- Global `HttpInterceptor` catches 401 responses and calls `router.navigate(['/login'])`
- Medicament detail = small popup modal, no dedicated route
- Doctor detail = overlay modal on `/medecins`, not a child route

---

## File Conventions

### Backend
- Route files: `/backend/src/routes/<name>.js` — each exports an Express Router
- Entry point: `/backend/src/index.js`
- Prisma singleton: `/backend/src/lib/prisma.js`
- Auth middleware: `/backend/src/middleware/auth.js` — reads cookie, verifies JWT, sets `req.visiteur`
- All async route handlers wrapped in try/catch — errors passed to `next(err)` or returned directly

### Frontend
- Feature folder structure: `/frontend/src/app/features/<feature>/<feature>.component.ts`
- Services: `/frontend/src/app/core/services/<name>.service.ts`
- Guards: `/frontend/src/app/core/guards/auth.guard.ts`
- Interceptor: `/frontend/src/app/core/interceptors/auth.interceptor.ts`
- API base URL from `environment.ts`, never hardcoded
- Component filenames: kebab-case, e.g. `doctor-detail-modal.component.ts`

---

## What's Been Built

### Infrastructure
- [x] Folder structure created
- [x] docker-compose.yml working (MySQL 8 starts cleanly)
- [x] Backend dependencies installed
- [x] Angular 17 project initialized with Tailwind
- [x] Prisma initialized, schema introspected (`prisma db pull` succeeded)
- [x] .env files created
- [x] Seed script runs — all users get password `"password"`

### Backend
- [x] Express server starts (`node src/index.js`)
- [x] CORS + cookie-parser configured
- [x] Auth middleware (`/backend/src/middleware/auth.js`)
- [x] `POST /api/auth/login`
- [x] `POST /api/auth/register`
- [x] `POST /api/auth/logout`
- [x] `GET  /api/auth/me`
- [ ] `GET  /api/medecins`
- [ ] `GET  /api/medecins/:id`
- [ ] `GET  /api/rapports`
- [ ] `GET  /api/rapports/:id`
- [ ] `POST /api/rapports`
- [ ] `PUT  /api/rapports/:id`
- [ ] `DELETE /api/rapports/:id`
- [ ] `GET  /api/medicaments`
- [ ] `GET  /api/medicaments/:id`
- [ ] `GET  /api/dashboard`

### Frontend — Core
- [x] Angular app starts (`ng serve`)
- [x] `environment.ts` with API_URL
- [ ] `AuthInterceptor` (withCredentials + 401 redirect)
- [ ] `AuthService` (BehaviorSubject, me() on init)
- [ ] `AuthGuard`
- [ ] Router config with all routes and guards
- [ ] `NavbarComponent` (shows nom/prenom when logged in, connexion/inscription when not)

### Frontend — Pages
- [ ] `/login` page wired to `POST /api/auth/login`
- [ ] `/register` page wired to `POST /api/auth/register`
- [ ] `/` dashboard — left panel medecins suivis
- [ ] `/` dashboard — right panel mes rapports (search + sort)
- [ ] `/medecins` list — search bar + Mon département toggle + cards grid
- [ ] `/medecins` doctor detail modal — info + rapport list + nouveau rapport button
- [ ] `/rapports/new` — form + medicament search + echantillons panel
- [ ] `/rapports/:id` — read mode
- [ ] `/rapports/:id/edit` — edit mode
- [ ] Medicament detail popup (from "i" button)

### Polish
- [ ] All API calls handle loading states
- [ ] All API calls handle error states (show error message)
- [ ] Seed runs and app looks alive end-to-end
- [ ] No console errors in browser or terminal

---

## Known Issues / Deferred

<!-- Add entries here when you intentionally skip or hit a wall -->
<!-- Example: -->
<!-- - CORS is open (*) intentionally for local dev -->
<!-- - Department filter uses substring logic, not a DB join -->
- gitignore file created without dot prefix (named `gitignore` instead of `.gitignore`) — rename manually: `mv gitignore .gitignore`

---

## Session Log

<!-- Add a one-line note after each session -->
<!-- Example: -->
<!-- 2024-05-01 — Scaffolded structure, Docker running, Prisma introspected, seed works -->
2026-04-01 — Scaffold complete. Docker running, backend healthy, Prisma connected, seed done, Angular compiling. Ready to build auth routes.
2026-04-01 — Auth middleware + all 4 auth routes built and verified with curl (login, me, wrong-password 401, logout, me-after-logout 401).

---

## ⚡ CURRENT STATE — Update this block at the END of every session

Claude Code must overwrite this block before finishing each session.
This is the single source of truth for resuming after a token limit or new session.

```
LAST COMPLETED TASK : All 4 auth routes passing curl tests
NEXT TASK           : Build GET /api/medecins and GET /api/medecins/:id
BLOCKED ON          : nothing
FILES CHANGED       : backend/src/middleware/auth.js (new),
                      backend/src/routes/auth.js (new),
                      backend/src/index.js (auth router + error handler added)
KNOWN BROKEN        : gitignore missing dot prefix — fix with: mv gitignore .gitignore
DEVIATIONS FOUND    : Prisma 7 incompatible — downgraded to Prisma 5
                      SQL dump is at /sql/sql.sql (not project root gsbrapports.sql)
```

---

## How to resume after hitting the token limit

Open a new Claude Code session and paste the following, filling in the CURRENT STATE values:

─────────────────────────────────────────────────────────
Read SPEC.md and DECISIONS.md fully before doing anything.
Pay close attention to the ⚡ CURRENT STATE block at the bottom of DECISIONS.md.

Resuming after token limit. Here is where we left off:
- Last completed : [paste LAST COMPLETED TASK]
- Next task      : [paste NEXT TASK]
- Blocked on     : [paste BLOCKED ON]
- Known broken   : [paste KNOWN BROKEN]

Rules for this session:
- Do not re-implement anything already checked off in "What's Been Built"
- Do not touch any file not directly needed for today's task
- Do not change any styling or markup that already works
- Do not touch anything listed under KNOWN BROKEN unless today's task is specifically to fix it
- At the end of this session, overwrite the ⚡ CURRENT STATE block with updated values

Today's task: [paste NEXT TASK]
─────────────────────────────────────────────────────────
