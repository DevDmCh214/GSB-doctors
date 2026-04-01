# Project Spec — GSB-Doctors

## Overview
GSB-Doctors allows medical sales representatives (visiteurs) to manage their doctor visits.
After login, a rep can browse all doctors, filter by department, open a doctor's detail panel
to see past visit reports, create new reports with drugs offered (échantillons), and edit or
delete their own reports. The dashboard shows a summary: doctors they have visited and a
searchable/sortable list of all their reports.

---

## Stack
- **Frontend:** Angular 17 (standalone components, no NgModules)
- **Backend:** Express.js (Node 20)
- **Database:** MySQL 8 via Docker
- **ORM:** Prisma
- **Auth:** JWT stored in httpOnly cookie (no localStorage)
- **Styling:** Tailwind CSS
- **HTTP / State:** Angular HttpClient + injectable Services (no NgRx)

---

## Folder Structure

```
/frontend              Angular 17 app
  /src/app
    /core              AuthService, HttpInterceptor, Guards
    /features
      /auth            login, register pages
      /dashboard       dashboard page
      /medecins        list page + detail modal
      /rapports        detail page + create/edit page
      /medicaments     (detail modal only, no dedicated page)
    /shared            reusable components (navbar, modal shell, etc.)
/backend
  /src
    /routes            auth.js, medecins.js, rapports.js, medicaments.js, dashboard.js
    /middleware        authMiddleware.js
    /lib               prisma.js (singleton client)
  /prisma
    schema.prisma
    seed.js
/docs
  /screenshots           Frontend wireframe screenshots — reference for ALL UI implementation
                         details_medecin.png
                         edit_or_create_report.png
                         liste_de_medecins_view__default_after_login_.png
                         log_in_view.png
                         non_logged_in_view.png
                         registration_view.png
                         report_details.png
                         medicament_details.png
                         dashboard.png
docker-compose.yml
.env.example
```

---

## Data Models

### Prisma schema (mirrors existing MySQL tables exactly — no migrations needed, Prisma introspects)

```prisma
model visiteur {
  id           String    @id @db.Char(4)
  nom          String?   @db.Char(30)
  prenom       String?   @db.Char(30)
  login        String?   @db.Char(20)
  mdp          String?   @db.Char(60)   // bcrypt hash, was Char(20) — increase column
  adresse      String?   @db.Char(30)
  cp           String?   @db.Char(5)
  ville        String?   @db.Char(30)
  dateEmbauche DateTime? @db.Date
  timespan     BigInt    @default(0)
  ticket       String?   @db.VarChar(50)
  rapports     rapport[]
}

model medecin {
  id                       Int       @id @default(autoincrement())
  nom                      String    @db.VarChar(30)
  prenom                   String    @db.VarChar(30)
  adresse                  String    @db.VarChar(80)
  tel                      String?   @db.VarChar(15)
  specialitecomplementaire String?   @db.VarChar(50)
  departement              Int
  rapports                 rapport[]
}

model rapport {
  id         Int       @id @default(autoincrement())
  date       DateTime? @db.Date
  motif      String?   @db.VarChar(100)
  bilan      String?   @db.VarChar(100)
  idVisiteur String    @db.Char(4)
  idMedecin  Int
  visiteur   visiteur  @relation(fields: [idVisiteur], references: [id])
  medecin    medecin   @relation(fields: [idMedecin], references: [id])
  offrir     offrir[]
}

model medicament {
  id                String   @id @db.VarChar(30)
  nomCommercial     String   @db.VarChar(80)
  idFamille         String   @db.VarChar(10)
  composition       String   @db.VarChar(100)
  effets            String   @db.VarChar(100)
  contreIndications String   @db.VarChar(100)
  famille           famille  @relation(fields: [idFamille], references: [id])
  offrir            offrir[]
}

model famille {
  id          String       @id @db.VarChar(10)
  libelle     String       @db.VarChar(80)
  medicaments medicament[]
}

model offrir {
  idRapport    Int
  idMedicament String     @db.VarChar(30)
  quantite     Int?       @db.TinyInt
  rapport      rapport    @relation(fields: [idRapport], references: [id])
  medicament   medicament @relation(fields: [idMedicament], references: [id])
  @@id([idRapport, idMedicament])
}
```

---

## API Routes

All protected routes require a valid JWT cookie. Auth errors return 401.
All errors return `{ error: "Human readable message" }` + appropriate status code.

### Auth
```
POST  /api/auth/login
  public
  body: { login: string, mdp: string }
  → sets httpOnly cookie "token"
  → { visiteur: { id, nom, prenom, cp } }

POST  /api/auth/register
  public
  body: { nom, prenom, login, mdp, adresse, cp, ville, dateEmbauche }
  → sets httpOnly cookie "token"
  → { visiteur: { id, nom, prenom, cp } }

POST  /api/auth/logout
  auth
  → clears cookie
  → { success: true }

GET   /api/auth/me
  auth
  → { visiteur: { id, nom, prenom, cp } }
```

### Médecins
```
GET   /api/medecins
  auth
  query: ?search=<string>&dept=<int>
  - search: filters nom + prenom (case-insensitive LIKE)
  - dept: filters medecin.departement (used for "Mon département" toggle:
    frontend sends first 2 chars of visiteur.cp as dept)
  - results ordered: best match first, then alphabetical nom
  → { medecins: [{ id, nom, prenom, adresse, tel, specialitecomplementaire, departement }], count: int }

GET   /api/medecins/:id
  auth
  → {
      medecin: { id, nom, prenom, adresse, tel, specialitecomplementaire },
      rapports: [{ id, date, motif }],   // only rapports by logged-in visiteur
      rapportCount: int                  // total across ALL visiteurs (shown as "Il y a N rapports")
    }
```

### Rapports
```
GET   /api/rapports
  auth
  query: ?search=<string>&sortDate=asc|desc&sortMotif=asc|desc&sortNom=asc|desc
  - returns only rapports belonging to logged-in visiteur
  - search: filters medecin nom/prenom + motif
  → { rapports: [{ id, date, motif, medecin: { id, nom, prenom } }], count: int }

GET   /api/rapports/:id
  auth — must own rapport (403 otherwise)
  → {
      rapport: { id, date, motif, bilan },
      medecin: { id, nom, prenom, specialitecomplementaire },
      echantillons: [{ idMedicament, nomCommercial, libelle, quantite }]
    }

POST  /api/rapports
  auth
  body: { idMedecin: int, date: string, motif: string, bilan: string,
          echantillons: [{ idMedicament: string, quantite: int }] }
  - wraps rapport insert + offrir inserts in a Prisma transaction
  → { rapport: { id, date, motif, bilan, idMedecin } }

PUT   /api/rapports/:id
  auth — must own rapport
  body: { date: string, motif: string, bilan: string,
          echantillons: [{ idMedicament: string, quantite: int }] }
  - transaction: delete existing offrir rows, re-insert new ones
  → { rapport: { id, date, motif, bilan } }

DELETE /api/rapports/:id
  auth — must own rapport
  - transaction: delete offrir rows first, then rapport
  → { success: true }
```

### Médicaments
```
GET   /api/medicaments
  auth
  query: ?search=<string>
  - search filters medicament.nomCommercial + famille.libelle (LIKE)
  → { medicaments: [{ id, nomCommercial, libelle, idFamille }] }
  // "libelle" comes from the joined famille table

GET   /api/medicaments/:id
  auth
  → { medicament: { id, nomCommercial, idFamille, libelle,
                    composition, effets, contreIndications } }
```

### Dashboard
```
GET   /api/dashboard
  auth
  → {
      medecinsSuivis: [{ id, nom, prenom, rapportCount: int }],
      // doctors where logged-in visiteur has >= 1 rapport, sorted by rapportCount desc

      mesRapports: [{ id, date, motif, medecin: { id, nom, prenom } }]
      // all rapports by logged-in visiteur, sorted by date desc
    }
```

---

## Pages / Views

```
/login                  Connexion form (pseudo + mot de passe)
/register               Inscription form (nom, prenom, pseudo, mdp, adresse, cp, ville, dateEmbauche)

/ (dashboard)           Auth guard — redirects to /login if not authenticated
                        Left panel: "Médecins suivis" list (search + count)
                        Right panel: "Mes rapports" list (search + sort by date/nom/motif)
                        Clicking rapport row opens /rapports/:id

/medecins               Auth guard
                        Search bar + "Mon département" toggle
                        4-column grid of doctor cards
                        Clicking a card opens DoctorDetailModal (overlay, not a new page)

  DoctorDetailModal     Shows doctor info + scrollable rapport list (scoped to logged-in user)
                        "nouveau rapport" button → /rapports/new?medecinId=:id
                        "i" button on rapport row → /rapports/:id
                        Edit pencil icon → switches modal to edit/create report inline

/rapports/new           Auth guard, requires ?medecinId param
                        Create report form + medicament search + echantillons side panel

/rapports/:id           Auth guard — report detail (read mode)
                        Shows date, motif, bilan, echantillons list with "i" info button per drug
                        Edit button → /rapports/:id/edit

/rapports/:id/edit      Auth guard — edit report, same layout as /rapports/new pre-filled
```

---

## Error Handling Contract

All API errors:
```json
{ "error": "Human readable message in French" }
```
HTTP status codes: 400 (bad input), 401 (not authenticated), 403 (not owner), 404 (not found), 500 (server error).

Frontend: Angular HttpInterceptor catches 401 globally and redirects to /login.

---

## Environment Variables

```bash
# /backend/.env
DATABASE_URL="mysql://gsb:gsb@localhost:3306/gsbrapports"
JWT_SECRET=change_me_in_production
PORT=3001

# /frontend/src/environments/environment.ts
API_URL=http://localhost:3001
```

---

## Decisions Made

- JWT in httpOnly cookie, not localStorage (XSS protection)
- Prisma introspects existing schema — no destructive migrations, just `prisma db pull`
- visiteur.mdp column must be widened to Char(60) before seeding to fit bcrypt hash
- "Mon département" filter: `parseInt(visiteur.cp.substring(0, 2))` compared to `medecin.departement` (stored as int)
- rapportCount on GET /medecins/:id is total across ALL visiteurs; the rapport list is scoped to the logged-in visiteur only
- offrir writes always use a Prisma transaction (delete-then-insert on update)
- Angular standalone components only (no NgModules), Router with canActivate auth guard
- Error messages returned in French to match the UI language
- Medicament detail appears as a small popup/tooltip modal (no dedicated page)

---

## Out of Scope

- No email verification or password reset
- No file uploads or image handling
- No real-time / WebSocket features
- No unit or e2e tests
- No role-based access control (all visiteurs have identical permissions)
- No mobile responsive design (desktop only)
- No admin panel

---

## Demo Data / Seed

Seed script at `/backend/prisma/seed.js`:

1. Run the full `gsbrapports.sql` dump to populate all tables
2. Widen `visiteur.mdp` column to `CHAR(60)` via raw SQL before hashing
3. Generate a single bcrypt hash of the string `"password"` (cost 10)
4. Update every row in `visiteur` to use that same hash
5. Print a credential table on completion

**Every user's password after seeding: `password`**

**Key demo credentials (from existing data):**

| login        | password | Department | Notes                         |
|--------------|----------|------------|-------------------------------|
| aribiA       | password | 46         | Most rapports, best demo user |
| ltusseau     | password | 46         | Active user, same dept        |
| fdaburon     | password | 94         | Different department          |
| fdudouit     | password | 23         | Another region                |

Full login list is in the `visiteur` INSERT block of `gsbrapports.sql`. All use `password`.
